import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  CreditCard, 
  Download, 
  Trash2, 
  AlertTriangle, 
  Check, 
  RefreshCw, 
  ShieldAlert, 
  Sliders, 
  Bus, 
  Users, 
  LogOut,
  ArrowRight,
  Sun,
  Moon,
  Monitor,
  Layers,
  Clock,
  Activity,
  Zap,
  Palette
} from 'lucide-react';
import { OwnerProfile, PlanType } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isDemoAccount, cascadeDeleteOwnerAccount } from '../lib/accountService';
import { saveLocalOwner } from '../lib/firebaseAuthHelper';
import { useTheme } from '../context/ThemeContext';

interface SettingsViewProps {
  owner: OwnerProfile;
  onAccountDeleted: () => void;
  onOpenReportsModal: () => void;
  onNavigateTab?: (tab: string) => void;
  onLogout?: () => void;
  layoutMode?: 'island' | 'classic';
  onToggleLayoutMode?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  owner,
  onAccountDeleted,
  onOpenReportsModal,
  onNavigateTab,
  onLogout,
  layoutMode = 'island',
  onToggleLayoutMode
}) => {
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Form state
  const [name, setName] = useState(owner.name || '');
  const [companyName, setCompanyName] = useState(owner.companyName || '');
  const [phone, setPhone] = useState(owner.phone || '+91 98000 00000');
  const [city, setCity] = useState(owner.city || 'Bengaluru');
  const [planType, setPlanType] = useState<PlanType>(owner.planType || 'SaaS');
  const [activeBusesCount, setActiveBusesCount] = useState(owner.activeBusesCount || 0);
  const [avgDailyRiders, setAvgDailyRiders] = useState(owner.avgDailyRiders || 0);

  // Telematics window & refresh rate state (persisted)
  const [telematicsWindow, setTelematicsWindow] = useState<string>(() => {
    try {
      return localStorage.getItem('tranzit_telematics_window') || '30 min';
    } catch (e) {
      return '30 min';
    }
  });

  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('tranzit_auto_refresh') !== 'false';
    } catch (e) {
      return true;
    }
  });

  const handleUpdateTelematicsWindow = (val: string) => {
    setTelematicsWindow(val);
    try {
      localStorage.setItem('tranzit_telematics_window', val);
    } catch (e) {}
  };

  const handleToggleAutoRefresh = (enabled: boolean) => {
    setAutoRefreshEnabled(enabled);
    try {
      localStorage.setItem('tranzit_auto_refresh', enabled ? 'true' : 'false');
    } catch (e) {}
  };

  // Status state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Danger Zone Deletion state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [confirmInput, setConfirmInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [needsPasswordReauth, setNeedsPasswordReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');

  const isDemo = isDemoAccount(owner);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const updatedData = {
        name: name.trim(),
        companyName: companyName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        planType,
        activeBusesCount: Number(activeBusesCount),
        avgDailyRiders: Number(avgDailyRiders)
      };

      await setDoc(doc(db, 'owners', owner.id), updatedData, { merge: true });
      saveLocalOwner({ ...owner, ...updatedData });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Error updating settings:", err);
      setSaveError(err?.message || "Failed to update profile settings.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExecuteDeleteAccount = async () => {
    if (confirmInput.trim() !== 'DELETE') return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await cascadeDeleteOwnerAccount(owner, reauthPassword ? reauthPassword.trim() : undefined);
      onAccountDeleted();
    } catch (err: any) {
      console.error("Failed to delete account:", err);
      if (err?.code === 'auth/requires-recent-login' || err?.message?.includes('Recent authentication required')) {
        setNeedsPasswordReauth(true);
        setDeleteError("Firebase requires recent authentication to delete an account. Please enter your password below to confirm.");
      } else {
        setDeleteError(err?.message || "Failed to delete account. Please try again.");
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
              Platform & System Settings
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Verified Operator
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Configure system appearance, telematics update frequency, carrier profile, and business parameters.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start md:self-auto">
          <button
            type="button"
            onClick={onOpenReportsModal}
            className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>Generate Statement</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: APPEARANCE & DISPLAY THEME SETTINGS */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <Palette className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
              Appearance & Interface Theme
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
            Active: <strong className="text-blue-600 dark:text-blue-400 capitalize">{theme}</strong>
          </span>
        </div>

        <div>
          <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-2 font-bold">
            Display Mode
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Dark Theme Option */}
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                theme === 'dark'
                  ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 shadow-sm ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-sky-400 flex items-center justify-center border border-slate-800">
                  <Moon className="w-4 h-4" />
                </div>
                {theme === 'dark' && <Check className="w-4 h-4 text-blue-500 font-bold" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase">Dark Mode</h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">High-contrast nighttime operations.</p>
              </div>
            </button>

            {/* Light Theme Option */}
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                theme === 'light'
                  ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 shadow-sm ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center border border-amber-200">
                  <Sun className="w-4 h-4" />
                </div>
                {theme === 'light' && <Check className="w-4 h-4 text-blue-500 font-bold" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase">Light Mode</h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">Crisp daytime visibility.</p>
              </div>
            </button>

            {/* System Theme Option */}
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                theme === 'system'
                  ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-500/15 shadow-sm ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 flex items-center justify-center">
                  <Monitor className="w-4 h-4" />
                </div>
                {theme === 'system' && <Check className="w-4 h-4 text-blue-500 font-bold" />}
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white font-mono uppercase">System Auto</h4>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">Sync with device OS preferences.</p>
              </div>
            </button>
          </div>
        </div>

        {/* Layout Mode Setting */}
        {onToggleLayoutMode && (
          <div className="pt-3 border-t border-slate-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-1.5 text-xs font-bold font-mono text-slate-900 dark:text-white">
                <Layers className="w-4 h-4 text-blue-500" />
                <span>Console Layout Architecture</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-0.5">
                Current style: <strong className="font-mono text-blue-600 dark:text-blue-400 uppercase">{layoutMode}</strong> layout.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleLayoutMode}
              className="px-3.5 py-2 bg-slate-100 dark:bg-neutral-900 hover:bg-slate-200 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-xs font-mono font-bold rounded-xl transition-colors cursor-pointer self-start sm:self-auto"
            >
              Switch to {layoutMode === 'island' ? 'Classic Enterprise View' : 'Island View'}
            </button>
          </div>
        )}
      </div>

      {/* SECTION 3: TELEMATICS & DATA REFRESH INTERVAL ("UPDATES / TIME") */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
              Telematics & Data Refresh Window
            </h2>
          </div>
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AIS-140 Stream</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1.5 font-bold">
              Telematics Window & Analytics Interval
            </label>
            <select
              value={telematicsWindow}
              onChange={(e) => handleUpdateTelematicsWindow(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Live (Real-time)">Live (Real-time AIS-140)</option>
              <option value="30 min">30 Minutes Rolling Window</option>
              <option value="Today">Today (Current Operational Shift)</option>
              <option value="Last 7 days">Last 7 Days Corridor Aggregation</option>
              <option value="Last 30 days">Last 30 Days Monthly Settlement</option>
            </select>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1">
              Controls the default time range applied across dispatch metrics, passenger counts, and route yield.
            </p>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1.5 font-bold">
              Background Auto-Refresh
            </label>
            <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl">
              <div>
                <span className="text-xs font-bold font-mono text-slate-800 dark:text-neutral-200">
                  Real-Time Firestore Sync
                </span>
                <p className="text-[10px] text-slate-500 dark:text-neutral-400">
                  Auto-update driver badges, route stages, and bus telemetry in background.
                </p>
              </div>
              <input
                type="checkbox"
                checked={autoRefreshEnabled}
                onChange={(e) => handleToggleAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 4: MAIN SETTINGS FORM */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* OPERATOR PROFILE */}
        <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-neutral-800">
            <User className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
              Operator & Business Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                Operator Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                Fleet Agency Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="e.g. SRS Royal Travels"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={owner.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-500 dark:text-neutral-400 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                Dispatch Phone
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                Primary Operating City
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* COMMERCIAL MODEL & FLEET PARAMS */}
        <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100 dark:border-neutral-800">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
              Commercial Model & Fleet Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                Operational Business Model
              </label>
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value as PlanType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="SaaS">SaaS (Direct Fares + Platform Tier)</option>
                <option value="Lease">Lease (Fixed Monthly Yield)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                Active Buses Count
              </label>
              <div className="relative">
                <Bus className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  value={activeBusesCount}
                  onChange={(e) => setActiveBusesCount(Number(e.target.value))}
                  min={0}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                Daily Average Passengers
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  value={avgDailyRiders}
                  onChange={(e) => setAvgDailyRiders(Number(e.target.value))}
                  min={0}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SaaS Plan summary pill */}
          {planType === 'SaaS' && (
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/60 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono font-bold text-blue-900 dark:text-blue-200 uppercase">
                  Active Subscription: {owner.subscriptionPlanName || (activeBusesCount <= 5 ? 'Starter' : activeBusesCount <= 20 ? 'Growth' : 'Enterprise')} Tier
                </span>
                <p className="text-[11px] text-slate-600 dark:text-neutral-400 font-sans mt-0.5">
                  Standard platform rate: ₹{(owner.saasFeePerBus || (activeBusesCount <= 5 ? 649 : activeBusesCount <= 20 ? 899 : 1599)).toLocaleString('en-IN')}/bus/month.
                </p>
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab('subscription')}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-xl cursor-pointer transition-colors shrink-0 flex items-center space-x-1 shadow-xs"
                >
                  <span>Manage Plans</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Feedback messages */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-mono flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Operator profile settings saved successfully in Firestore.</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono uppercase font-bold tracking-wider rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Settings...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Operator Profile</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* SECTION 5: SESSION & LOGOUT */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center space-x-2">
            <LogOut className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-900 dark:text-white">
              Account Session & Sign Out
            </h2>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Active Session
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs text-slate-700 dark:text-neutral-300 font-medium font-sans">
              Signed in as <span className="font-mono font-bold text-slate-900 dark:text-white">{owner.email}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans">
              Ending your session will securely sign you out of this browser.
            </p>
          </div>

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-slate-800 dark:text-neutral-200 border border-slate-200 dark:border-neutral-800 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      </div>

      {/* SECTION 6: DANGER ZONE */}
      {!isDemo && (
        <div className="bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center space-x-2 text-rose-700 dark:text-rose-400 border-b border-rose-200 dark:border-rose-900/40 pb-3">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider">
              Danger Zone • Account & Data Deletion
            </h2>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-rose-950 dark:text-rose-200 font-medium">
              Permanently erase this carrier account and cascade-delete all data from the database.
            </p>
            <p className="text-xs text-rose-800/80 dark:text-rose-300/80 font-sans">
              This will irreversibly delete your owner profile, registered buses, drivers, routes, scheduled maintenance records, and financial transaction history.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-xl text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}

          {!showConfirmDelete ? (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDelete(true);
                  setConfirmInput('');
                  setDeleteError(null);
                  setNeedsPasswordReauth(false);
                  setReauthPassword('');
                }}
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account & Wipe Fleet Data</span>
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-800 rounded-xl space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200 font-sans">
                    Are you absolutely certain you want to delete your account?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-neutral-400 font-sans">
                    To confirm permanent deletion of <strong className="text-rose-600 dark:text-rose-400 font-mono">{owner.email}</strong> and all records, type <code className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 font-mono font-bold text-rose-800 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">DELETE</code> below:
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  disabled={isDeleting}
                  className="w-full max-w-sm px-3 py-2 bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-rose-500"
                />

                {needsPasswordReauth && (
                  <div className="max-w-sm space-y-1.5 pt-1">
                    <label className="block text-[11px] font-mono text-rose-900 dark:text-rose-300 font-semibold">
                      Enter password to verify:
                    </label>
                    <input
                      type="password"
                      value={reauthPassword}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      placeholder="Current account password"
                      disabled={isDeleting}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-xl text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExecuteDeleteAccount}
                  disabled={confirmInput.trim() !== 'DELETE' || isDeleting || (needsPasswordReauth && !reauthPassword.trim())}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 dark:disabled:bg-rose-900/60 disabled:cursor-not-allowed text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting Fleet Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>{needsPasswordReauth ? 'Verify & Delete Account' : 'Permanently Delete Account'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowConfirmDelete(false);
                    setConfirmInput('');
                    setDeleteError(null);
                    setNeedsPasswordReauth(false);
                    setReauthPassword('');
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
