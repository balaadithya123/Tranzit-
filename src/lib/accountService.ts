import {
  collection,
  query,
  where,
  getDocs,
  doc,
  writeBatch,
  DocumentReference
} from 'firebase/firestore';
import {
  deleteUser,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  GoogleAuthProvider,
  reauthenticateWithPopup
} from 'firebase/auth';
import { auth, db } from './firebase';
import { OwnerProfile } from '../types';
import { DEMO_SaaS_EMAIL, DEMO_LEASE_EMAIL, DEMO_SaaS_UID, DEMO_LEASE_UID } from './seedData';
import { saveLocalOwner } from './firebaseAuthHelper';

export function isDemoAccount(owner: OwnerProfile | null | undefined): boolean {
  if (!owner) return false;
  const email = (owner.email || '').toLowerCase().trim();
  const id = (owner.id || '').trim();
  const uid = (owner.uid || '').trim();

  return (
    id === DEMO_SaaS_UID ||
    id === DEMO_LEASE_UID ||
    uid === DEMO_SaaS_UID ||
    uid === DEMO_LEASE_UID ||
    email === DEMO_SaaS_EMAIL.toLowerCase() ||
    email === DEMO_LEASE_EMAIL.toLowerCase()
  );
}

export interface CascadeDeleteResult {
  deletedDocsCount: number;
  authDeleted: boolean;
}

/**
 * Cascade-deletes everything tied to this owner:
 * 1. Queries and deletes every document where ownerId === owner.id across
 *    buses, routes, drivers, earnings, maintenance, payouts.
 * 2. Deletes the owner document itself in the owners collection.
 * 3. Uses Firestore batches (<= 450 writes per batch) for atomic execution.
 * 4. Calls deleteUser on current Firebase Auth user so email is released.
 *    If auth/requires-recent-login is encountered, prompts for password re-auth.
 * 5. Cleans up local session and signs out.
 */
export async function cascadeDeleteOwnerAccount(
  owner: OwnerProfile,
  reauthPassword?: string
): Promise<CascadeDeleteResult> {
  if (isDemoAccount(owner)) {
    throw new Error("Demo accounts (SaaS Demo & Lease Demo) cannot be deleted. Only real accounts can be deleted.");
  }

  const collections = ['buses', 'routes', 'drivers', 'earnings', 'maintenance', 'payouts'];
  const refsToDelete: DocumentReference[] = [];

  const targetOwnerIds = new Set<string>();
  if (owner.id) targetOwnerIds.add(owner.id);
  if (owner.uid) targetOwnerIds.add(owner.uid);
  if (auth.currentUser?.uid) targetOwnerIds.add(auth.currentUser.uid);

  // 1. Gather all documents across owner-scoped collections
  for (const colName of collections) {
    for (const targetId of Array.from(targetOwnerIds)) {
      try {
        const snap = await getDocs(query(collection(db, colName), where('ownerId', '==', targetId)));
        snap.docs.forEach(d => refsToDelete.push(d.ref));
      } catch (colErr) {
        console.warn(`Querying collection ${colName} notice:`, colErr);
      }
    }
  }

  // 2. Gather owner profile documents
  for (const targetId of Array.from(targetOwnerIds)) {
    refsToDelete.push(doc(db, 'owners', targetId));
  }

  if (owner.email) {
    const sanitizedEmailId = `owner-${owner.email.toLowerCase().trim().replace(/[^a-zA-Z0-9]/g, '_')}`;
    refsToDelete.push(doc(db, 'owners', sanitizedEmailId));
  }

  // Deduplicate references by path
  const uniqueRefsMap = new Map<string, DocumentReference>();
  for (const ref of refsToDelete) {
    uniqueRefsMap.set(ref.path, ref);
  }
  const uniqueRefs = Array.from(uniqueRefsMap.values());

  // 3. Batch commit deletions in chunks of <= 450 (Firestore limit is 500)
  const BATCH_SIZE = 450;
  for (let i = 0; i < uniqueRefs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = uniqueRefs.slice(i, i + BATCH_SIZE);
    chunk.forEach(r => batch.delete(r));
    await batch.commit();
  }

  let authDeleted = false;

  // 4. Delete Firebase Auth user if active
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      await deleteUser(currentUser);
      authDeleted = true;
    } catch (authErr: any) {
      if (authErr.code === 'auth/requires-recent-login') {
        if (reauthPassword && currentUser.email) {
          const cred = EmailAuthProvider.credential(currentUser.email, reauthPassword);
          await reauthenticateWithCredential(currentUser, cred);
          await deleteUser(currentUser);
          authDeleted = true;
        } else {
          // Check if user has Google provider
          const isGoogleProvider = currentUser.providerData.some(p => p.providerId === 'google.com');
          if (isGoogleProvider) {
            try {
              const provider = new GoogleAuthProvider();
              await reauthenticateWithPopup(currentUser, provider);
              await deleteUser(currentUser);
              authDeleted = true;
            } catch (googleReauthErr: any) {
              throw new Error("Recent login required. Please re-authenticate with Google to complete account deletion.");
            }
          } else {
            // Signal to caller that password re-authentication is required
            const reauthError = new Error("Recent authentication required. Please enter your password to confirm deletion.");
            (reauthError as any).code = 'auth/requires-recent-login';
            throw reauthError;
          }
        }
      } else {
        console.warn("Auth user deletion notice:", authErr);
        throw authErr;
      }
    }
  }

  // 5. Final session cleanup
  try {
    saveLocalOwner(null);
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {}

  try {
    await signOut(auth);
  } catch (e) {}

  return {
    deletedDocsCount: uniqueRefs.length,
    authDeleted
  };
}
