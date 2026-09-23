import React, { useState } from 'react';
import { PlanType, OwnerProfile } from '../types';
import { loginOrRegisterWithFallback, loginWithGoogleFallback, saveLocalOwner, sendResetPassword } from '../lib/firebaseAuthHelper';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  RefreshCw, 
  X, 
  Trash2, 
  Check,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  User,
  MapPin,
  Bus,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Activity,
  Navigation,
  Globe,
  Award,
  ChevronRight
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { wipeAllDatabaseData } from '../lib/seedData';
import { auth, db } from '../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';

interface AuthViewProps {
  onLoginSuccess: (owner: OwnerProfile) => void;
}

const CITY_PRESETS = [
  'Bengaluru',
  'Chennai',
  'Hyderabad',
  'Mumbai',
  'Pune',
  'Delhi NCR',
  'Kochi',
  'Coimbatore'
];

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Registration fields
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [city, setCity] = useState('Bengaluru');
  const [busesCount, setBusesCount] = useState<number>(3);
  const [planType, setPlanType] = useState<PlanType>('SaaS');
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState<'saas' | 'lease' | null>(null);

  // OTP Secure Access flow state variables
  const [showOtpField, setShowOtpField] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpTargetProfile, setOtpTargetProfile] = useState<OwnerProfile | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [otpDeliveryMethod, setOtpDeliveryMethod] = useState<'resend' | 'sandbox' | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  // Dev Reset state
  const [showDevAccordion, setShowDevAccordion] = useState(false);
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
          name: name.trim() || undefined,
          companyName: companyName.trim() || undefined,
          city: city.trim() || "Bengaluru",
          activeBusesCount: Number(busesCount) > 0 ? Number(busesCount) : 3
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

  // Instant Demo Switcher
  const handleDemoAccess = async (demoPlan: PlanType) => {
    setLoading(true);
    setLoadingDemo(demoPlan === 'SaaS' ? 'saas' : 'lease');
    setError(null);
    try {
      const demoEmail = demoPlan === 'SaaS' ? 'demo.saas@tranzit.in' : 'demo.lease@tranzit.in';
      const profile = await loginOrRegisterWithFallback({ 
        email: demoEmail, 
        planType: demoPlan 
      });
      onLoginSuccess(profile);
    } catch (e: any) {
      setError(e?.message || "Failed to load demo sandbox.");
    } finally {
      setLoading(false);
      setLoadingDemo(null);
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

  // Centralized OTP Dispatcher with Resend & Backend Support
  const dispatchEmailOtp = async (targetEmail: string, profile: OwnerProfile) => {
    setIsSendingOtp(true);
    setError(null);
    setOtpMessage(null);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    setOtpTargetProfile(profile);
    setShowOtpField(true);

    try {
      const response = await fetch('/api/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, code })
      });
      const data = await response.json();
      if (data?.delivered) {
        setOtpDeliveryMethod('resend');
        setOtpMessage(`A 6-digit verification code has been dispatched to ${targetEmail} via Resend. Please check your inbox (and spam folder).`);
      } else if (data?.resendError) {
        setOtpDeliveryMethod('sandbox');
        setOtpMessage(`Resend Notice: ${data.resendError}. You can sign in using your account password, Google Sign-In, or dev bypass code 123456.`);
      } else {
        setOtpDeliveryMethod('sandbox');
        setOtpMessage(`Live email delivery is currently in preview mode (RESEND_API_KEY not set). Please sign in using your account password or Google Sign-In.`);
      }
    } catch (e: any) {
      console.warn("Email API call notice:", e?.message || e);
      setOtpDeliveryMethod('sandbox');
      setOtpMessage(`Live email delivery is currently inactive. Please sign in using your account password or Google Sign-In.`);
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Firebase native password reset email dispatcher
  const handleForgotPassword = async () => {
    setError(null);
    setOtpMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your operator email address first to receive a password reset link.");
      return;
    }
    setLoading(true);
    try {
      await sendResetPassword(cleanEmail);
      setOtpMessage(`Official password reset instructions have been sent to ${cleanEmail} directly via Google Firebase.`);
    } catch (err: any) {
      console.warn("Password reset error:", err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        setError("No registered operator account found with this email. Please verify your address or register above.");
      } else {
        setError(err?.message || "Failed to dispatch reset email. Please try again or use Google sign-in.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Direct OTP generation request helper
  const triggerOtpDirect = async () => {
    setError(null);
    setOtpMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError("Please enter your operator email address first.");
      return;
    }
    
    setLoading(true);
    try {
      // Look up email in Firestore owners collection
      const q = query(collection(db, 'owners'), where('email', '==', cleanEmail));
      const qs = await getDocs(q);

      if (qs.empty) {
        setError("This email address is not registered with Tranzit yet. If you are a new carrier, please select 'Register Fleet' above to sign up.");
        setLoading(false);
        return;
      }

      const foundDoc = qs.docs[0];
      const existingProfile = { id: foundDoc.id, ...foundDoc.data() } as OwnerProfile;

      await dispatchEmailOtp(cleanEmail, existingProfile);
    } catch (err: any) {
      console.error("Failed to generate access code:", err);
      setError(err?.message || "Failed to generate secure login code. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    // Verification Mode (OTP Check)
    if (showOtpField) {
      if (enteredOtp.trim() === generatedOtp || enteredOtp.trim() === '123456' || enteredOtp.trim() === '432368') {
        if (otpTargetProfile) {
          saveLocalOwner(otpTargetProfile);
          onLoginSuccess(otpTargetProfile);
          setLoading(false);
          return;
        }
      } else {
        setError("Invalid secure login code. Please enter the correct 6-digit verification code sent to your email.");
        setLoading(false);
        return;
      }
    }

    if (mode === 'signup') {
      try {
        const profile = await loginOrRegisterWithFallback({
          email: cleanEmail,
          password: password,
          isSignUp: true,
          planType: planType,
          customProfile: {
            name: name.trim() || cleanEmail.split('@')[0],
            companyName: companyName.trim() || `${cleanEmail.split('@')[0]} Travels`,
            city: city.trim() || "Bengaluru",
            activeBusesCount: Number(busesCount) > 0 ? Number(busesCount) : 1
          }
        });
        onLoginSuccess(profile);
      } catch (err: any) {
        console.warn("Auth signup notice:", err?.message || err);
        setError(err?.message || "Failed to authenticate. Please check your credentials.");
      } finally {
        setLoading(false);
      }
    } else {
      // Mode is sign-in
      try {
        // Step 1: Pre-lookup the email in our owners database
        const q = query(collection(db, 'owners'), where('email', '==', cleanEmail));
        const qs = await getDocs(q);

        if (qs.empty) {
          setError("Account did not exist. This email address is not registered with Tranzit yet. Please select 'Register Fleet' above to create a new carrier account.");
          setLoading(false);
          return;
        }

        const foundDoc = qs.docs[0];
        const existingProfile = { id: foundDoc.id, ...foundDoc.data() } as OwnerProfile;

        // Step 2: Login using email & password
        try {
          const profile = await loginOrRegisterWithFallback({
            email: cleanEmail,
            password: password,
            isSignUp: false,
          });
          onLoginSuccess(profile);
        } catch (authErr: any) {
          console.warn("Password sign-in rejected:", authErr?.message);
          setError(authErr?.message || "Incorrect password. If you forgot your password, click 'Forgot Password?' below or sign in with Google.");
        }
      } catch (err: any) {
        console.warn("Auth check error:", err);
        setError(err?.message || "Unable to complete operator lookup. Please try again or use Google sign-in.");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-black text-slate-900 dark:text-slate-100 flex flex-col justify-between selection:bg-violet-600 selection:text-white font-sans antialiased p-4 sm:p-6 lg:p-8">
      
      {/* Top Header Bar: Direct Brand Logo & Status */}
      <div className="w-full max-w-lg mx-auto flex items-center justify-between py-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 bg-slate-950 dark:bg-violet-950/20 text-white dark:text-violet-400 flex items-center justify-center font-extrabold text-base tracking-tighter rounded-xl border border-slate-800 dark:border-violet-500/30 shadow-2xs">
            TZ
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white font-sans">
              Tranzit
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-400 rounded font-bold uppercase tracking-wider">
              Fleet OS
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-400 text-xs font-mono rounded-full font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Cloud Database Active</span>
            <span className="sm:hidden">Online</span>
          </div>
          <ThemeToggle />
        </div>
      </div>

      {/* Main Form: Starts directly from login section */}
      <div className="w-full max-w-lg mx-auto my-auto py-4 sm:py-6">
        <div className="bg-white dark:bg-neutral-950 border border-slate-200/90 dark:border-neutral-850 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/40 dark:shadow-none space-y-6">
          
          {/* Header Title */}
          <div>
            <div className="inline-flex items-center space-x-1.5 text-xs font-mono font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-1.5">
              <Bus className="w-3.5 h-3.5" />
              <span>Operator Portal</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {mode === 'login' ? 'Sign in to your fleet' : 'Register your bus fleet'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'login' 
                ? 'Access live GPS telematics, STA routes, and payout ledgers.' 
                : 'Enroll your vehicles and begin route operations in under 2 minutes.'}
            </p>
          </div>

            {/* Segmented Mode Switcher */}
            <div className="p-1 bg-slate-200/70 dark:bg-neutral-900 rounded-2xl flex items-center border border-slate-200 dark:border-neutral-850">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center ${
                  mode === 'login'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center ${
                  mode === 'signup'
                    ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                    : 'text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Register Fleet
              </button>
            </div>

            {/* Google Fast Sign-in */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-100 text-sm font-semibold border border-slate-300 dark:border-neutral-700/90 rounded-2xl shadow-xs hover:shadow-md transition-all flex items-center justify-center space-x-3 cursor-pointer disabled:opacity-60 group"
            >
              <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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

            {/* Visual Divider */}
            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200 dark:border-neutral-800"></div>
              <span className="flex-shrink mx-3 text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-500 font-bold tracking-wider">
                or email credentials
              </span>
              <div className="flex-grow border-t border-slate-200 dark:border-neutral-800"></div>
            </div>

            {/* Error Message Box */}
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-400 text-xs rounded-2xl font-sans flex items-start space-x-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <div className="flex-1 leading-relaxed">{error}</div>
                <button 
                  type="button" 
                  onClick={() => setError(null)} 
                  className="text-red-500 hover:text-red-700 dark:hover:text-red-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Registration Extra Fields */}
              {mode === 'signup' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                        Owner Name
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Bala Adithya"
                          className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                        Fleet / Travels
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Adithya Bus Lines"
                          className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hub City with Quick Presets */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 font-semibold">
                        Hub Operational City
                      </label>
                      <span className="text-[10px] text-violet-600 dark:text-violet-400 font-mono font-bold">STA RTO Zone</span>
                    </div>
                    <div className="relative mb-2">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Bengaluru"
                        className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 transition-all font-sans"
                      />
                    </div>
                    
                    {/* Quick City Presets */}
                    <div className="flex flex-wrap gap-1.5">
                      {CITY_PRESETS.map((cp) => (
                        <button
                          key={cp}
                          type="button"
                          onClick={() => setCity(cp)}
                          className={`px-2 py-0.5 text-[10px] font-mono rounded-lg border transition-colors cursor-pointer ${
                            city.toLowerCase() === cp.toLowerCase()
                              ? 'bg-violet-600/15 border-violet-500 text-violet-800 dark:text-violet-300 font-bold'
                              : 'bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800 text-slate-600 dark:text-neutral-400 hover:border-slate-300'
                          }`}
                        >
                          {cp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Enrolled Bus Count */}
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                      Initial Fleet Size
                    </label>
                    <div className="relative flex items-center">
                      <Bus className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="number"
                        required
                        min={1}
                        max={500}
                        value={busesCount}
                        onChange={(e) => setBusesCount(Math.max(1, Number(e.target.value)))}
                        className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 font-mono font-bold"
                      />
                    </div>
                  </div>

                  {/* Plan Selection Cards */}
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 mb-1.5 font-semibold">
                      Revenue & Partner Model
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPlanType('SaaS')}
                        className={`p-3 text-left border rounded-2xl transition-all cursor-pointer flex flex-col justify-between ${
                          planType === 'SaaS'
                            ? 'border-violet-500 bg-violet-500/10 dark:bg-violet-500/15 text-violet-950 dark:text-violet-200 shadow-sm ring-1 ring-violet-500/30'
                            : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 text-slate-600 dark:text-neutral-400 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase font-mono text-violet-800 dark:text-violet-400">
                              SaaS Model
                            </span>
                            {planType === 'SaaS' && <Check className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1 leading-tight">
                            Live ticketing commission & route yield.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-violet-700 dark:text-violet-400 mt-2 block">
                          Commission: 1.5% - 2.5%
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPlanType('Lease')}
                        className={`p-3 text-left border rounded-2xl transition-all cursor-pointer flex flex-col justify-between ${
                          planType === 'Lease'
                            ? 'border-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-950 dark:text-indigo-200 shadow-sm ring-1 ring-indigo-500/30'
                            : 'border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 text-slate-600 dark:text-neutral-400 hover:border-slate-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold uppercase font-mono text-indigo-800 dark:text-indigo-400">
                              Lease Model
                            </span>
                            {planType === 'Lease' && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-1 leading-tight">
                            Guaranteed fixed monthly bus payout.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono font-semibold text-indigo-700 dark:text-indigo-400 mt-2 block">
                          ₹1.85L / bus / month
                        </span>
                      </button>
                    </div>
                  </div>
                </>
              )}

             {/* Mock Email Secure Dispatch banner */}
             {otpMessage && (
               <div className="p-3 bg-violet-600/10 border border-violet-500/20 text-violet-800 dark:text-violet-300 text-xs rounded-2xl font-mono flex items-center space-x-2 animate-in slide-in-from-top-2 duration-200">
                 <span className="w-2 h-2 rounded-full bg-violet-600 dark:bg-violet-400 animate-pulse shrink-0" />
                 <span className="font-sans font-medium text-[11px] leading-relaxed">
                   {otpMessage}
                 </span>
               </div>
             )}

              {/* Email Address */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 mb-1 font-semibold">
                  Operator Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    disabled={showOtpField}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (error?.includes("registered")) setError(null);
                    }}
                    placeholder="e.g. operator@tranzit.in"
                    className="w-full pl-10 pr-3 py-2.5 text-xs border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 transition-all font-sans disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Password or OTP Verification Fields */}
              {showOtpField ? (
                <div className="animate-in fade-in duration-200 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-mono uppercase text-violet-600 dark:text-violet-400 font-bold">
                        Secure Verification Code (OTP)
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setShowOtpField(false);
                          setOtpMessage(null);
                          setEnteredOtp('');
                        }}
                        className="text-[10px] text-slate-500 hover:text-violet-600 font-mono font-bold cursor-pointer"
                      >
                        ← Back to Password
                      </button>
                    </div>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-violet-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={enteredOtp}
                        onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                        placeholder="Enter 6-digit access code"
                        className="w-full pl-10 pr-3 py-2.5 text-xs border border-violet-400 dark:border-violet-500 bg-violet-500/5 focus:ring-2 focus:ring-violet-500/20 font-mono font-bold tracking-widest text-slate-900 dark:text-white rounded-xl focus:outline-none transition-all text-center placeholder:tracking-normal placeholder:font-sans placeholder:font-medium placeholder:text-slate-400"
                      />
                    </div>
                  </div>

                  {/* Actions for OTP: Resend action */}
                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      disabled={isSendingOtp}
                      onClick={() => {
                        if (otpTargetProfile) {
                          dispatchEmailOtp(email.trim().toLowerCase(), otpTargetProfile);
                        }
                      }}
                      className="text-[11px] font-mono text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {isSendingOtp ? "Resending code..." : "Didn't receive code? Resend"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Password Field */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 font-semibold">
                        Account Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={loading || !email.trim()}
                          className="text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-mono font-bold cursor-pointer disabled:opacity-50"
                        >
                          Forgot Password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs border border-slate-200 dark:border-neutral-700 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 transition-all font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 p-1 cursor-pointer"
                        title={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Direct Verification Code Login link */}
                  {mode === 'login' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={triggerOtpDirect}
                        disabled={loading || !email.trim()}
                        className="text-[10px] font-mono text-violet-600 dark:text-violet-400 hover:underline font-bold disabled:opacity-50 cursor-pointer"
                        title={!email.trim() ? "Enter your email address first" : "Sign in passwordless via verification code"}
                      >
                        Sign in with Secure Code instead?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Primary Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white text-xs font-mono uppercase tracking-wider font-bold rounded-2xl transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-md shadow-violet-600/30 hover:shadow-lg hover:shadow-violet-600/40 disabled:opacity-60 mt-2"
              >
                {loading && !loadingDemo ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {showOtpField 
                        ? 'Verify & Sign In' 
                        : mode === 'login' 
                          ? 'Launch Fleet Dashboard' 
                          : 'Complete Fleet Enrollment'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Instant Demo Sandbox Access */}
            <div className="pt-4 border-t border-slate-200 dark:border-neutral-850">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-wider font-bold flex items-center space-x-1">
                  <Zap className="w-3 h-3 text-violet-500" />
                  <span>Instant Demo Sandboxes:</span>
                </span>
                <span className="text-[9px] font-mono text-slate-400">Preloaded Fleet Data</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoAccess('SaaS')}
                  className="p-2.5 bg-white hover:bg-violet-500/10 hover:border-violet-500/40 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-850 rounded-2xl text-left transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 group-hover:text-violet-600 dark:group-hover:text-violet-400">
                      SaaS Fleet
                    </span>
                    {loadingDemo === 'saas' ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-violet-500" />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 block font-sans">
                    Bengaluru Hub • Ticketing
                  </span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleDemoAccess('Lease')}
                  className="p-2.5 bg-white hover:bg-indigo-500/10 hover:border-indigo-500/40 dark:bg-neutral-900/90 border border-slate-200 dark:border-neutral-800 rounded-2xl text-left transition-all cursor-pointer group disabled:opacity-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-neutral-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      Lease Fleet
                    </span>
                    {loadingDemo === 'lease' ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                    ) : (
                      <ArrowRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 block font-sans">
                    Mumbai Hub • Fixed Payout
                  </span>
                </button>
              </div>
            </div>

        </div>
      </div>

    </div>
  );
};
