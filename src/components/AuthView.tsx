import React, { useState } from 'react';
import { PlanType, OwnerProfile } from '../types';
import { loginOrRegisterWithFallback, loginWithGoogleFallback, saveLocalOwner } from '../lib/firebaseAuthHelper';
import { ArrowRight, CheckCircle2, Database, AlertTriangle, Flame, ShieldAlert, Wrench, RefreshCw, X, Trash2, Check } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { wipeAllDatabaseData } from '../lib/seedData';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

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
  const [busesCount, setBusesCount] = useState<number>(0);
  const [planType, setPlanType] = useState<PlanType>('SaaS');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Dev Reset state
  const [showDevResetModal, setShowDevResetModal] = useState(false);
  const [devResetConfirmInput, setDevResetConfirmInput] = useState('');
  const [isDevResetting, setIsDevResetting] = useState(false);
  const [devResetSuccess, setDevResetSuccess] = useState<string | null>(null);
  const [devResetError, setDevResetError] = useState<string | null>(null);

  // Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await loginWithGoogleFallback({
        planType: planType,
        customProfile: mode === 'signup' ? {
          name: name.trim(),
          companyName: companyName.trim(),
          city: city.trim(),
          activeBusesCount: Number(busesCount) > 0 ? Number(busesCount) : 0
        } : undefined
      });
      onLoginSuccess(profile);
    } catch (gErr: any) {
      console.warn("Google Sign-in error:", gErr);
      setError(gErr?.message || "Google sign-in could not be completed. Please try again or use email sign-in.");
    } finally {
      setLoading(false);
    }
  };

  // Dev-only: Wipe All Test Data across whole database
  const handleDevResetAllData = async () => {
    if (devResetConfirmInput.trim() !== 'RESET ALL') return;
    setIsDevResetting(true);
    setDevResetError(null);
    setDevResetSuccess(null);
    try {
      const deletedCount = await wipeAllDatabaseData();
      saveLocalOwner(null);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      try {
        if (auth.currentUser) {
          await signOut(auth);
        }
      } catch (e) {}
      setDevResetSuccess(`Successfully purged ${deletedCount} documents across all collections in Firestore. Database is now reset.`);
    } catch (err: any) {
      console.error("Dev reset failed:", err);
      setDevResetError(err?.message || "Failed to wipe database collections.");
    } finally {
      setIsDevResetting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      const profile = await loginOrRegisterWithFallback({
        email: cleanEmail,
        password: password,
        isSignUp: mode === 'signup',
        planType: planType,
        customProfile: mode === 'signup' ? {
          name: name.trim() || cleanEmail.split('@')[0],
          companyName: companyName.trim() || "Tranzit Partner Fleet",
          city: city.trim() || "Bengaluru",
          activeBusesCount: Number(busesCount) > 0 ? Number(busesCount) : 0
        } : undefined
      });
      onLoginSuccess(profile);
    } catch (err: any) {
      console.warn("Auth submit notice:", err?.message || err);
      setError(err?.message || "Failed to authenticate. Please check your credentials.");
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
        
        {/* Google Sign-in primary action */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-white dark:bg-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-100 text-sm font-medium border border-slate-300 dark:border-neutral-700 rounded-lg shadow-2xs transition-colors flex items-center justify-center space-x-3 cursor-pointer mb-5"
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
          <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
        </button>

        <div className="relative flex py-1 items-center mb-5">
          <div className="flex-grow border-t border-slate-200 dark:border-neutral-800"></div>
          <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-500">
            {mode === 'login' ? 'or sign in with email' : 'or register with email'}
          </span>
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
                  placeholder="e.g. Bala Adithya"
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
                  placeholder="e.g. Adithya Bus Lines"
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
                    placeholder="e.g. Bengaluru"
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
              placeholder="e.g. operator@company.com"
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

        {/* Instant Demo Sandbox Access */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-neutral-800 text-center">
          <p className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 uppercase tracking-wider mb-2.5">
            Or test with sample fleet data:
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const profile = await loginOrRegisterWithFallback({ email: "demo.saas@tranzit.in", planType: "SaaS" });
                  onLoginSuccess(profile);
                } catch(e: any) {
                  setError(e?.message || "Failed to load demo");
                } finally {
                  setLoading(false);
                }
              }}
              className="px-2.5 py-2 bg-slate-50 hover:bg-amber-500/10 hover:border-amber-500/40 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-slate-700 dark:text-neutral-300 transition-colors text-center cursor-pointer"
            >
              Demo SaaS Fleet
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try {
                  const profile = await loginOrRegisterWithFallback({ email: "demo.lease@tranzit.in", planType: "Lease" });
                  onLoginSuccess(profile);
                } catch(e: any) {
                  setError(e?.message || "Failed to load demo");
                } finally {
                  setLoading(false);
                }
              }}
              className="px-2.5 py-2 bg-slate-50 hover:bg-teal-500/10 hover:border-teal-500/40 dark:bg-neutral-900/80 border border-slate-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-slate-700 dark:text-neutral-300 transition-colors text-center cursor-pointer"
            >
              Demo Lease Fleet
            </button>
          </div>
        </div>

        {/*
          DEV RESET — CLEAR ALL DATA (testing only, not for real users)
          NOTE: This dev tool wipes ALL accounts and data from Firestore for testing.
          It must be removed or locked behind auth before any real user has an account.
        */}
        <div className="mt-6 pt-4 border-t-2 border-dashed border-rose-300 dark:border-rose-900/60 text-center">
          <div className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-800 text-[10px] font-mono font-bold text-rose-700 dark:text-rose-400 mb-2">
            <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>DEV ENVIRONMENT ONLY</span>
          </div>

          <p className="text-[11px] text-rose-800/80 dark:text-rose-300/80 font-mono mb-2">
            Dev tool — wipes ALL accounts and data
          </p>

          <button
            type="button"
            onClick={() => {
              setShowDevResetModal(true);
              setDevResetConfirmInput('');
              setDevResetSuccess(null);
              setDevResetError(null);
            }}
            className="w-full py-2 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/40 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>Clear All Test Data (Database Wipe)</span>
          </button>
        </div>
      </div>

      {/* Dev Reset Confirmation Modal */}
      {showDevResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border-2 border-rose-500 rounded-xl shadow-2xl overflow-hidden">
            {/* Loud Header */}
            <div className="p-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-white" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">
                  Dev tool — wipes ALL accounts and data
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowDevResetModal(false)}
                disabled={isDevResetting}
                className="text-white/80 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-lg space-y-1.5">
                <div className="text-xs font-bold text-rose-800 dark:text-rose-300 uppercase font-mono flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-rose-600" />
                  <span>Permanent Database Wipe Warning</span>
                </div>
                <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                  This developer tool will delete <strong>EVERY document in EVERY collection</strong> across the entire database:
                </p>
                <div className="font-mono text-[11px] text-rose-700 dark:text-rose-400 bg-white/70 dark:bg-neutral-900/70 p-2 rounded border border-rose-200 dark:border-rose-800">
                  collections: [owners, buses, routes, earnings, payouts, maintenance, drivers]
                </div>
              </div>

              {/*
                NOTE: This dev tool wipes ALL accounts and data from Firestore for testing.
                It must be removed or locked behind auth before any real user has an account.
              */}

              {devResetError && (
                <div className="p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-mono rounded-lg flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{devResetError}</span>
                </div>
              )}

              {devResetSuccess ? (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-mono rounded-lg space-y-3">
                  <div className="flex items-center space-x-2 font-bold">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Database Wiped Successfully!</span>
                  </div>
                  <p>{devResetSuccess}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDevResetModal(false);
                      window.location.reload();
                    }}
                    className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono uppercase font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Reload App
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300">
                      To confirm, type <strong className="text-rose-600 dark:text-rose-400 font-mono">RESET ALL</strong> below:
                    </label>
                    <input
                      type="text"
                      value={devResetConfirmInput}
                      onChange={(e) => setDevResetConfirmInput(e.target.value)}
                      placeholder="Type RESET ALL"
                      disabled={isDevResetting}
                      className="w-full px-3 py-2 text-xs font-mono bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-rose-500 font-bold"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowDevResetModal(false)}
                      disabled={isDevResetting}
                      className="px-3.5 py-2 text-xs font-mono text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleDevResetAllData}
                      disabled={devResetConfirmInput.trim() !== 'RESET ALL' || isDevResetting}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 dark:disabled:bg-rose-900/50 disabled:cursor-not-allowed text-white text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
                    >
                      {isDevResetting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Purging Entire Database...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Wipe Entire Database</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 text-center text-xs text-slate-400 dark:text-neutral-500 font-mono">
        Tranzit Mobility Platform India • Active Firestore Persistence
      </div>
    </div>
  );
};
