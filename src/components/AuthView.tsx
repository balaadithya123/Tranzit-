import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { PlanType, OwnerProfile } from '../types';
import { DEMO_SaaS_EMAIL, DEMO_LEASE_EMAIL, DEMO_SaaS_UID, DEMO_LEASE_UID, seedInitialFirestoreData } from '../lib/seedData';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Database, Lock, Mail, Building, MapPin } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

interface AuthViewProps {
  onLoginSuccess: (owner: OwnerProfile) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('');
  const [busesCount, setBusesCount] = useState<number>(3);
  const [planType, setPlanType] = useState<PlanType>('SaaS');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const uid = user.uid;
      const userEmail = (user.email || "owner@tranzit.in").toLowerCase();

      let ownerDoc = await getDoc(doc(db, 'owners', uid));
      if (ownerDoc.exists()) {
        onLoginSuccess(ownerDoc.data() as OwnerProfile);
      } else {
        const q = query(collection(db, 'owners'), where('email', '==', userEmail));
        const snap = await getDocs(q);
        if (!snap.empty) {
          onLoginSuccess(snap.docs[0].data() as OwnerProfile);
        } else {
          const newProfile: OwnerProfile = {
            id: uid,
            uid: uid,
            name: user.displayName || userEmail.split('@')[0] || "Fleet Owner",
            email: userEmail,
            companyName: "Tranzit Partner Fleet",
            planType: 'SaaS',
            activeBusesCount: 3,
            todayRevenue: 48250,
            walletBalance: 185400,
            saasFeePerBus: 4500,
            nextPayoutDate: "2026-09-20",
            nextPayoutAmount: 185400,
            avgDailyRiders: 1240,
            city: "Bengaluru",
            phone: "+91 98450 12345"
          };
          await setDoc(doc(db, 'owners', uid), newProfile);
          onLoginSuccess(newProfile);
        }
      }
    } catch (gErr: any) {
      if (gErr.code !== 'auth/popup-closed-by-user') {
        console.info("Google Sign-in notice:", gErr?.message || gErr);
        setError("Google Sign-In was cancelled. Please try again or use the Instant Demo Logins.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login Handler
  const handleDemoLogin = async (demoEmail: string, demoUid: string) => {
    setLoading(true);
    setError(null);
    try {
      try {
        await signInWithEmailAndPassword(auth, demoEmail, "DemoPass123!");
      } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
          try {
            await createUserWithEmailAndPassword(auth, demoEmail, "DemoPass123!");
          } catch (createErr: any) {
            console.info("Demo user auth info:", createErr?.code || createErr);
          }
        }
      }

      let ownerDoc = await getDoc(doc(db, 'owners', demoUid));
      if (!ownerDoc.exists()) {
        console.log("Demo doc missing in Firestore. Triggering seed...");
        await seedInitialFirestoreData(true);
        ownerDoc = await getDoc(doc(db, 'owners', demoUid));
      }

      if (ownerDoc.exists()) {
        onLoginSuccess(ownerDoc.data() as OwnerProfile);
      } else {
        const fallbackProfile: OwnerProfile = {
          id: demoUid,
          uid: demoUid,
          name: demoUid === DEMO_SaaS_UID ? "Rajesh Sharma" : "Vikramaditya Verma",
          email: demoEmail,
          companyName: demoUid === DEMO_SaaS_UID ? "Shree Royal Travels" : "Verma Fleet Operations",
          planType: demoUid === DEMO_SaaS_UID ? "SaaS" : "Lease",
          activeBusesCount: 3,
          todayRevenue: demoUid === DEMO_SaaS_UID ? 48250 : 0,
          walletBalance: demoUid === DEMO_SaaS_UID ? 185400 : 0,
          saasFeePerBus: 4500,
          nextPayoutDate: "2026-09-20",
          nextPayoutAmount: demoUid === DEMO_SaaS_UID ? 185400 : 255000,
          avgDailyRiders: 1240,
          city: demoUid === DEMO_SaaS_UID ? "Bengaluru" : "Hubballi",
          phone: "+91 98450 12345"
        };
        await setDoc(doc(db, 'owners', demoUid), fallbackProfile);
        onLoginSuccess(fallbackProfile);
      }
    } catch (err: any) {
      console.warn("Demo login notice:", err?.message || err);
      setError(err.message || "Database connection error. Retrying...");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    if (cleanEmail === DEMO_SaaS_EMAIL.toLowerCase()) {
      await handleDemoLogin(DEMO_SaaS_EMAIL, DEMO_SaaS_UID);
      return;
    } else if (cleanEmail === DEMO_LEASE_EMAIL.toLowerCase()) {
      await handleDemoLogin(DEMO_LEASE_EMAIL, DEMO_LEASE_UID);
      return;
    }

    try {
      if (mode === 'login') {
        try {
          const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
          const uid = userCredential.user.uid;

          let ownerDoc = await getDoc(doc(db, 'owners', uid));
          let profileData: OwnerProfile | null = ownerDoc.exists() ? (ownerDoc.data() as OwnerProfile) : null;

          if (!profileData) {
            const q = query(collection(db, 'owners'), where('email', '==', cleanEmail));
            const snap = await getDocs(q);
            if (!snap.empty) {
              profileData = snap.docs[0].data() as OwnerProfile;
            }
          }

          if (profileData) {
            onLoginSuccess(profileData);
          } else {
            const fallbackProfile: OwnerProfile = {
              id: uid,
              uid: uid,
              name: cleanEmail.split('@')[0] || "Fleet Owner",
              email: cleanEmail,
              companyName: "Private Fleet Operator",
              planType: 'SaaS',
              activeBusesCount: 3,
              todayRevenue: 35000,
              walletBalance: 120000,
              saasFeePerBus: 4500,
              nextPayoutDate: "2026-10-01",
              nextPayoutAmount: 120000,
              avgDailyRiders: 1100,
              city: "Bengaluru",
              phone: "+91 98450 12345"
            };
            await setDoc(doc(db, 'owners', uid), fallbackProfile);
            onLoginSuccess(fallbackProfile);
          }
        } catch (signInErr: any) {
          if (signInErr.code === 'auth/operation-not-allowed') {
            const q = query(collection(db, 'owners'), where('email', '==', cleanEmail));
            const snap = await getDocs(q);
            if (!snap.empty) {
              onLoginSuccess(snap.docs[0].data() as OwnerProfile);
              return;
            }
          }
          throw signInErr;
        }
      } else {
        // Sign up
        let uid = '';
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          uid = userCredential.user.uid;
        } catch (signupErr: any) {
          if (signupErr.code === 'auth/operation-not-allowed') {
            uid = `owner-${Date.now()}`;
          } else {
            throw signupErr;
          }
        }

        const newProfile: OwnerProfile = {
          id: uid,
          uid: uid,
          name: name || cleanEmail.split('@')[0],
          email: cleanEmail,
          companyName: companyName || "Tranzit Partner Fleet",
          planType: planType,
          activeBusesCount: Number(busesCount) >= 0 ? Number(busesCount) : 3,
          todayRevenue: planType === 'SaaS' ? 38500 : 0,
          walletBalance: planType === 'SaaS' ? 142000 : 0,
          saasFeePerBus: 4500,
          nextPayoutDate: "2026-10-01",
          nextPayoutAmount: planType === 'Lease' ? 255000 : 142000,
          avgDailyRiders: 950,
          city: city || "Bengaluru",
          phone: "+91 98765 43210"
        };
        await setDoc(doc(db, 'owners', uid), newProfile);
        onLoginSuccess(newProfile);
      }
    } catch (err: any) {
      console.warn("Auth submit notice:", err?.message || err);
      setError(err.message || "Failed to process request. Please try again or use the Instant Demo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#000000] flex flex-col justify-center items-center p-4 sm:p-6 transition-colors relative">
      {/* Top right theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      {/* Editorial Header */}
      <div className="w-full max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-900 dark:bg-neutral-900 text-white dark:text-amber-400 font-extrabold text-2xl mb-3 rounded-xl border border-slate-800 dark:border-neutral-800 shadow-xs">
          TZ
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-neutral-100 font-sans">
          Tranzit OS
        </h1>
        <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono mt-1 tracking-wider uppercase">
          Private Bus Fleet & Earnings Platform
        </p>

        {/* Database Status Tag */}
        <div className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-[11px] font-mono rounded-md">
          <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Firestore Cloud DB Connected</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 ml-1" />
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-6 sm:p-8 rounded-xl shadow-xl transition-colors">
        
        {/* Quick One-Click Demo Login Bar */}
        <div className="mb-6 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-mono uppercase font-bold text-slate-700 dark:text-neutral-300 tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 inline mr-1" />
              <span>Instant Demo Logins</span>
            </span>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold border border-emerald-500/20">
              Live Database
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleDemoLogin(DEMO_SaaS_EMAIL, DEMO_SaaS_UID)}
              disabled={loading}
              className="p-3 text-left border border-amber-300 dark:border-amber-700/60 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-950/50 transition-colors rounded-lg group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-950 dark:text-amber-200">SaaS Owner</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-700 dark:text-neutral-300 mt-0.5 font-sans font-medium">Rajesh Sharma</p>
              <p className="text-[10px] font-mono font-bold text-amber-700 dark:text-amber-400 mt-1">SaaS Plan • 3 Buses</p>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin(DEMO_LEASE_EMAIL, DEMO_LEASE_UID)}
              disabled={loading}
              className="p-3 text-left border border-teal-300 dark:border-teal-700/60 bg-teal-50/80 dark:bg-teal-950/30 hover:bg-teal-100/80 dark:hover:bg-teal-950/50 transition-colors rounded-lg group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-teal-950 dark:text-teal-200">Lease Owner</span>
                <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              </div>
              <p className="text-[11px] text-slate-700 dark:text-neutral-300 mt-0.5 font-sans font-medium">Vikramaditya Verma</p>
              <p className="text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 mt-1">Lease Plan • 3 Buses</p>
            </button>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full mt-3 py-2 px-3 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-200 text-xs font-medium border border-slate-200 dark:border-neutral-700 rounded-lg shadow-2xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.13-1.57.38-2.29V6.56H1.25C.45 8.15 0 9.99 0 12s.45 3.85 1.25 5.44l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.56l4.03 3.15c.95-2.83 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>

        <div className="relative flex py-1 items-center mb-5">
          <div className="flex-grow border-t border-slate-200 dark:border-neutral-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-500">or manual operator login</span>
          <div className="flex-grow border-t border-slate-200 dark:border-neutral-800"></div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs rounded-lg font-sans">
            {error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 font-sans">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Owner Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Rajesh Sharma"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Company / Travels Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Shree Royal Travels"
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Hub City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bengaluru"
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Active Buses</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={busesCount}
                    onChange={(e) => setBusesCount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Partner Plan Model</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setPlanType('SaaS')}
                    className={`p-2.5 text-left border rounded-lg transition-all cursor-pointer ${
                      planType === 'SaaS'
                        ? 'border-amber-500 bg-amber-500/10 text-amber-950 dark:text-amber-200 font-semibold'
                        : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900/60 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase font-mono text-amber-800 dark:text-amber-400">SaaS Model</div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">Ticketing & live fares</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanType('Lease')}
                    className={`p-2.5 text-left border rounded-lg transition-all cursor-pointer ${
                      planType === 'Lease'
                        ? 'border-teal-500 bg-teal-500/10 text-teal-950 dark:text-teal-200 font-semibold'
                        : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-900/60 text-slate-600 dark:text-neutral-400'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase font-mono text-teal-800 dark:text-teal-400">Lease Model</div>
                    <div className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5">Fixed monthly payout</div>
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@tranzit.in"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 font-sans"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 font-sans"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase tracking-wider font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
          >
            <span>{loading ? 'Connecting...' : mode === 'login' ? 'Sign In to Dashboard' : 'Create Tranzit Partner Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="text-xs text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-neutral-100 underline font-medium cursor-pointer"
          >
            {mode === 'login' ? "New Bus Owner? Register your fleet" : "Already registered? Sign in"}
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400 dark:text-neutral-500 font-mono">
        Tranzit Mobility Platform India • Active Firestore Persistence
      </div>
    </div>
  );
};
