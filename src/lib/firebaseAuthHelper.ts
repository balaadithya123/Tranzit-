import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { OwnerProfile, PlanType } from '../types';
import { DEMO_SaaS_EMAIL, DEMO_LEASE_EMAIL, DEMO_SaaS_UID, DEMO_LEASE_UID, seedUserData, createEmptyOwnerProfile, formatEmailToName } from './seedData';

const LOCAL_SESSION_KEY = 'tranzit_active_owner_session';

export function getSavedLocalOwner(): OwnerProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as OwnerProfile;
      // If cached profile has a demo name for a non-demo email, clean it
      const isDemo = parsed.email === DEMO_SaaS_EMAIL || parsed.email === DEMO_LEASE_EMAIL;
      if (!isDemo && (parsed.name === "Rajesh Sharma" || parsed.name === "Vikramaditya Verma" || parsed.name === "Fleet Owner")) {
        parsed.name = formatEmailToName(parsed.email);
        parsed.companyName = `${parsed.name} Logistics`;
      }
      return parsed;
    }
  } catch (err) {
    console.warn("Failed to read local session:", err);
  }
  return null;
}

export function saveLocalOwner(owner: OwnerProfile | null): void {
  try {
    if (owner) {
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(owner));
    } else {
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch (err) {
    console.warn("Failed to save local session:", err);
  }
}

export async function loginOrRegisterWithFallback(options: {
  email: string;
  password?: string;
  isSignUp?: boolean;
  planType?: PlanType;
  customProfile?: Partial<OwnerProfile>;
}): Promise<OwnerProfile> {
  const cleanEmail = options.email.trim().toLowerCase();
  const isDemoSaaS = cleanEmail === DEMO_SaaS_EMAIL.toLowerCase();
  const isDemoLease = cleanEmail === DEMO_LEASE_EMAIL.toLowerCase();
  const isDemo = isDemoSaaS || isDemoLease;

  const isSaaS = options.planType ? options.planType === 'SaaS' : cleanEmail !== DEMO_LEASE_EMAIL.toLowerCase();
  const plan: PlanType = options.planType || (isSaaS ? 'SaaS' : 'Lease');

  let uid = '';

  // 1. If explicit demo account, use canonical demo UID
  if (isDemoSaaS) {
    uid = DEMO_SaaS_UID;
  } else if (isDemoLease) {
    uid = DEMO_LEASE_UID;
  }

  // 2. Real accounts MUST authenticate with verified credentials via Firebase Auth
  if (!isDemo) {
    if (!options.password || !options.password.trim()) {
      throw new Error("Password is required to sign in.");
    }

    try {
      if (options.isSignUp) {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, options.password);
        uid = userCred.user.uid;
      } else {
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, options.password);
        uid = userCred.user.uid;
      }
    } catch (err: any) {
      console.warn("Authentication error:", err?.code, err?.message);
      // Format clear, user-facing error messages and always throw — never bypass
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        throw new Error("Invalid email or password. Please check your credentials and try again.");
      }
      if (err.code === 'auth/email-already-in-use') {
        throw new Error("This email is already registered. Please sign in with your password instead.");
      }
      if (err.code === 'auth/weak-password') {
        throw new Error("Password should be at least 6 characters.");
      }
      if (err.code === 'auth/operation-not-allowed') {
        throw new Error("Email/Password sign-in is not enabled in Firebase Authentication.");
      }
      if (err.code === 'auth/too-many-requests') {
        throw new Error("Too many failed attempts. Please wait a moment and try again.");
      }
      if (err.code === 'auth/invalid-email') {
        throw new Error("Please enter a valid email address.");
      }
      throw new Error(err.message || "Failed to authenticate. Please check your credentials.");
    }
  }

  // Real accounts must have a valid authenticated UID — never fall back to email lookup
  if (!uid) {
    throw new Error("Authentication failed. Verified account required.");
  }

  // 4. Fetch or create owner profile from Firestore
  const ownerDoc = await getDoc(doc(db, 'owners', uid));
  if (ownerDoc.exists()) {
    const rawData = ownerDoc.data() as OwnerProfile;
    const hasDemoName = rawData.name === "Rajesh Sharma" || rawData.name === "Vikramaditya Verma" || rawData.name === "Fleet Owner";
    
    let profile: OwnerProfile = {
      ...rawData,
      id: uid,
      uid: uid,
      email: cleanEmail
    };

    // If this non-demo account has leftover legacy demo name OR custom fields were supplied:
    if (!isDemo && (hasDemoName || options.customProfile?.name || rawData.companyName === "Shree Royal Travels" || rawData.companyName === "Verma Fleet Operations")) {
      const correctName = options.customProfile?.name?.trim() || (hasDemoName ? formatEmailToName(cleanEmail) : rawData.name);
      const correctCompany = options.customProfile?.companyName?.trim() || 
        (rawData.companyName === "Shree Royal Travels" || rawData.companyName === "Verma Fleet Operations" 
          ? `${correctName} Logistics` 
          : rawData.companyName);

      profile = {
        ...profile,
        name: correctName,
        companyName: correctCompany,
        ...(options.customProfile?.city ? { city: options.customProfile.city.trim() } : {}),
        ...(options.customProfile?.activeBusesCount !== undefined ? { activeBusesCount: options.customProfile.activeBusesCount } : {})
      };

      try {
        await setDoc(doc(db, 'owners', uid), profile, { merge: true });
      } catch (saveErr) {
        console.warn("Notice updating owner document:", saveErr);
      }
    }

    saveLocalOwner(profile);
    return profile;
  }

  // If newly registering or first visit for this email:
  // If it's a demo account, seed sample data. Otherwise, create a clean, empty account!
  const newProfile = isDemo
    ? await seedUserData(uid, cleanEmail, plan, options.customProfile)
    : await createEmptyOwnerProfile(uid, cleanEmail, plan, options.customProfile);

  saveLocalOwner(newProfile);
  return newProfile;
}

export async function loginWithGoogleFallback(options?: {
  planType?: PlanType;
  customProfile?: Partial<OwnerProfile>;
}): Promise<OwnerProfile> {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account'
    });

    const result = await signInWithPopup(auth, provider);
    const user = result.user;
    const uid = user.uid;
    const userEmail = (user.email || "owner@tranzit.in").toLowerCase();

    const plan: PlanType = options?.planType || 'SaaS';
    
    // Fast check with 2.5s timeout so user never hangs after choosing Google account
    let ownerDoc: any = null;
    try {
      ownerDoc = await Promise.race([
        getDoc(doc(db, 'owners', uid)),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500))
      ]);
    } catch (docErr) {
      console.warn("Fast getDoc note during Google sign-in:", docErr);
    }

    if (ownerDoc && ownerDoc.exists()) {
      const rawData = ownerDoc.data() as OwnerProfile;
      
      const correctName = rawData.name?.trim() || options?.customProfile?.name?.trim() || user.displayName || formatEmailToName(userEmail);
      const correctCompany = rawData.companyName?.trim() || options?.customProfile?.companyName?.trim() || (user.displayName ? `${user.displayName} Travels` : `${correctName} Logistics`);

      let profile: OwnerProfile = {
        ...rawData,
        id: uid,
        uid: uid,
        email: userEmail,
        name: correctName,
        companyName: correctCompany,
        ...(options?.customProfile?.city ? { city: options.customProfile.city.trim() } : {}),
        ...(options?.customProfile?.activeBusesCount !== undefined ? { activeBusesCount: options.customProfile.activeBusesCount } : {})
      };

      saveLocalOwner(profile);

      // Only update Firestore if fields were missing
      if (!rawData.companyName?.trim() || !rawData.name?.trim()) {
        setDoc(doc(db, 'owners', uid), {
          name: correctName,
          companyName: correctCompany
        }, { merge: true }).catch(saveErr => {
          console.warn("Notice syncing owner profile in background:", saveErr);
        });
      }

      return profile;
    }

    // New profile registration with Google
    const displayName = options?.customProfile?.name?.trim() || user.displayName || formatEmailToName(userEmail);
    const company = options?.customProfile?.companyName?.trim() || (user.displayName ? `${user.displayName} Travels` : `${displayName} Logistics`);
    const city = options?.customProfile?.city?.trim() || "Bengaluru";
    // Clean account starts with 0 buses unless explicitly provided
    const busCount = options?.customProfile?.activeBusesCount !== undefined ? options.customProfile.activeBusesCount : 0;

    const newProfile = await createEmptyOwnerProfile(uid, userEmail, plan, {
      name: displayName,
      companyName: company,
      city: city,
      activeBusesCount: busCount
    });

    saveLocalOwner(newProfile);
    return newProfile;
  } catch (gErr: any) {
    console.warn("Google Auth error caught:", gErr);

    if (gErr.code === 'auth/popup-blocked') {
      throw new Error("The Google Sign-In pop-up was blocked by your browser or iframe security. Please allow pop-ups for this site, or register using Email & Password below.");
    }
    if (gErr.code === 'auth/popup-closed-by-user') {
      throw new Error("Google Sign-In was cancelled because the pop-up was closed before completion. Please try again or use Email & Password.");
    }
    if (gErr.code === 'auth/cancelled-popup-request') {
      throw new Error("A previous sign-in request was active. Please click Google Sign-In again.");
    }
    if (gErr.code === 'auth/operation-not-allowed') {
      throw new Error("Google Sign-In is not enabled on this Firebase project yet. Please enter your email and password below to sign in.");
    }
    if (gErr.code === 'auth/unauthorized-domain') {
      throw new Error("This app domain is not in Firebase authorized domains. Please use Email & Password sign-in.");
    }
    throw new Error(gErr.message || "Failed to sign in with Google. Please try again or use email sign-in.");
  }
}
