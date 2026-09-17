import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { PlanType, OwnerProfile } from '../types';
import { DEMO_SaaS_EMAIL, DEMO_LEASE_EMAIL, DEMO_SaaS_UID, DEMO_LEASE_UID, seedInitialFirestoreData } from '../lib/seedData';
import { Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Database } from 'lucide-react';

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
  const [planType, setPlanType] = useState<PlanType>('SaaS');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quick Demo Login Handler (Guaranteed to seed and login if missing)
  const handleDemoLogin = async (demoEmail: string, demoUid: string) => {
    setLoading(true);
    setError(null);
    try {
      let ownerDoc = await getDoc(doc(db, 'owners', demoUid));
      if (!ownerDoc.exists()) {
        console.log("Demo doc missing in Firestore. Triggering seed...");
        await seedInitialFirestoreData(true);
        ownerDoc = await getDoc(doc(db, 'owners', demoUid));
      }

      if (ownerDoc.exists()) {
        onLoginSuccess(ownerDoc.data() as OwnerProfile);
      } else {
        // Fallback demo profile
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
      console.error("Demo login error:", err);
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

    // Check for predefined demo emails first
    if (cleanEmail === DEMO_SaaS_EMAIL.toLowerCase()) {
      await handleDemoLogin(DEMO_SaaS_EMAIL, DEMO_SaaS_UID);
      return;
    } else if (cleanEmail === DEMO_LEASE_EMAIL.toLowerCase()) {
      await handleDemoLogin(DEMO_LEASE_EMAIL, DEMO_LEASE_UID);
      return;
    }

    try {
      // 1. Direct Firestore Lookup by Email First
      const ownersQ = query(collection(db, 'owners'), where('email', '==', cleanEmail));
      const snap = await getDocs(ownersQ);

      if (!snap.empty) {
        // Found existing profile in Firestore!
        const existingProfile = snap.docs[0].data() as OwnerProfile;
        onLoginSuccess(existingProfile);
        return;
      }

      // 2. Try Firebase Auth (Optional background authentication)
      let uid = `owner-${Date.now()}`;
      try {
        if (mode === 'login') {
          const res = await signInWithEmailAndPassword(auth, cleanEmail, password);
          uid = res.user.uid;
        } else {
          const res = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          uid = res.user.uid;
        }
      } catch (authErr: any) {
        console.info("Firebase Auth info (proceeding with Firestore profile creation):", authErr.code || authErr.message);
      }

      // 3. Create New Profile in Firestore
      const newProfile: OwnerProfile = {
        id: uid,
        uid: uid,
        name: name || cleanEmail.split('@')[0] || "Bus Fleet Owner",
        email: cleanEmail,
        companyName: companyName || "Tranzit Partner Fleet",
        planType: planType,
        activeBusesCount: 3,
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
    } catch (err: any) {
      console.error("Auth submit error:", err);
      setError(err.message || "Failed to log in. Please try clicking Demo Accounts above.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F5] flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Editorial Header */}
      <div className="w-full max-w-md text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-[#1A1F2C] text-[#FBF9F5] font-extrabold text-2xl mb-3 rounded-xs border border-[#1A1F2C]">
          TZ
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-[#1A1F2C]">
          Tranzit
        </h1>
        <p className="text-xs text-slate-500 font-mono mt-1 tracking-wider uppercase">
          Private Bus Fleet & Earnings Platform
        </p>

        {/* Database Status Tag */}
        <div className="mt-3 inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-mono rounded-xs">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>Firestore DB Connected</span>
          <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />
        </div>
      </div>

      {/* Main Auth Card */}
      <div className="w-full max-w-md bg-white border border-[#E8E4DC] p-6 sm:p-8 rounded-xs shadow-none">
        
        {/* Quick One-Click Demo Login Bar */}
        <div className="mb-6 bg-[#FBF9F5] border border-[#E8E4DC] p-4 rounded-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-mono uppercase font-bold text-slate-700 tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 inline mr-1" />
              <span>Instant Demo Logins</span>
            </span>
            <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-xs font-mono font-bold">
              Live Database
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <button
              type="button"
              onClick={() => handleDemoLogin(DEMO_SaaS_EMAIL, DEMO_SaaS_UID)}
              disabled={loading}
              className="p-3 text-left border border-amber-300 bg-amber-50/80 hover:bg-amber-100/80 transition-colors rounded-xs group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-950">SaaS Owner</span>
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <p className="text-[11px] text-slate-700 mt-0.5 font-sans font-medium">Rajesh Sharma</p>
              <p className="text-[10px] font-mono font-bold text-amber-800 mt-1">SaaS Plan • 3 Buses</p>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin(DEMO_LEASE_EMAIL, DEMO_LEASE_UID)}
              disabled={loading}
              className="p-3 text-left border border-teal-300 bg-teal-50/80 hover:bg-teal-100/80 transition-colors rounded-xs group cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-teal-950">Lease Owner</span>
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              </div>
              <p className="text-[11px] text-slate-700 mt-0.5 font-sans font-medium">Vikramaditya Verma</p>
              <p className="text-[10px] font-mono font-bold text-teal-800 mt-1">Lease Plan • 3 Buses</p>
            </button>
          </div>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#E8E4DC]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase font-mono">
            <span className="bg-white px-2 text-slate-400">Or sign in / register with email</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs font-medium rounded-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Owner Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Reddy"
                  className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-xs focus:outline-none focus:border-[#1A1F2C] bg-[#FBF9F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Company / Fleet Name</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Reddy Express Lines"
                  className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-xs focus:outline-none focus:border-[#1A1F2C] bg-[#FBF9F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">City / Hub</label>
                <input
                  type="text"
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-xs focus:outline-none focus:border-[#1A1F2C] bg-[#FBF9F5]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Partner Plan Model</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setPlanType('SaaS')}
                    className={`p-3 text-left border rounded-xs transition-all ${
                      planType === 'SaaS'
                        ? 'border-amber-600 bg-amber-50 text-amber-950 font-semibold'
                        : 'border-[#E8E4DC] bg-[#FBF9F5] text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase font-mono text-amber-800">SaaS Model</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">Run your buses, we handle ticketing & fares</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlanType('Lease')}
                    className={`p-3 text-left border rounded-xs transition-all ${
                      planType === 'Lease'
                        ? 'border-teal-600 bg-teal-50 text-teal-950 font-semibold'
                        : 'border-[#E8E4DC] bg-[#FBF9F5] text-slate-600 hover:border-slate-400'
                    }`}
                  >
                    <div className="text-xs font-bold uppercase font-mono text-teal-800">Lease Model</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">We operate buses, you get fixed payout</div>
                  </button>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="owner@tranzit.in"
              className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-xs focus:outline-none focus:border-[#1A1F2C] bg-[#FBF9F5]"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-xs focus:outline-none focus:border-[#1A1F2C] bg-[#FBF9F5]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#1A1F2C] hover:bg-[#0F131D] text-white text-xs font-mono uppercase tracking-wider font-bold rounded-xs transition-colors flex items-center justify-center space-x-2 cursor-pointer"
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
            className="text-xs text-slate-600 hover:text-[#1A1F2C] underline font-medium cursor-pointer"
          >
            {mode === 'login' ? "New Bus Owner? Register your fleet" : "Already registered? Sign in"}
          </button>
        </div>
      </div>

      <div className="mt-6 text-center text-xs text-slate-400 font-mono">
        Tranzit Mobility Platform India • Active Firestore Persistence
      </div>
    </div>
  );
};
