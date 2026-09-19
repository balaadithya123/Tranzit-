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
  HelpCircle,
  Bus,
  Users
} from 'lucide-react';
import { OwnerProfile, PlanType } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isDemoAccount, cascadeDeleteOwnerAccount } from '../lib/accountService';

interface SettingsViewProps {
  owner: OwnerProfile;
  onAccountDeleted: () => void;
  onOpenReportsModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  owner,
  onAccountDeleted,
  onOpenReportsModal
}) => {
  // Form state
  const [name, setName] = useState(owner.name || '');
  const [companyName, setCompanyName] = useState(owner.companyName || '');
  const [phone, setPhone] = useState(owner.phone || '+91 98000 00000');
  const [city, setCity] = useState(owner.city || 'Bengaluru');
  const [planType, setPlanType] = useState<PlanType>(owner.planType || 'SaaS');
  const [saasFeePerBus, setSaasFeePerBus] = useState(owner.saasFeePerBus || 4500);
  const [activeBusesCount, setActiveBusesCount] = useState(owner.activeBusesCount || 0);
  const [avgDailyRiders, setAvgDailyRiders] = useState(owner.avgDailyRiders || 0);

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
        saasFeePerBus: Number(saasFeePerBus),
        activeBusesCount: Number(activeBusesCount),
        avgDailyRiders: Number(avgDailyRiders)
      };

      await setDoc(doc(db, 'owners', owner.id), updatedData, { merge: true });
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
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg">
              <Settings className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-neutral-100">
              Account & Fleet Settings
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Configure operator identity, commercial plan settings, backup exports, and manage your account lifecycle.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            type="button"
            onClick={onOpenReportsModal}
            className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-mono font-bold rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Export Data Report</span>
          </button>
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Operator & Company Identity */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-neutral-800/80 pb-3">
            <User className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-800 dark:text-neutral-200">
              Operator & Business Profile
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Fleet / Company Name
              </label>
              <div className="relative">
                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  placeholder="e.g. SRS Royal Travels"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Registered Email (Account ID)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={owner.email}
                  disabled
                  className="w-full pl-9 pr-3 py-2 bg-slate-100 dark:bg-neutral-800/60 border border-slate-200 dark:border-neutral-800 rounded-lg text-xs font-mono text-slate-500 dark:text-neutral-400 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                Primary identifier used for database authentication & access rules.
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Dispatch Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98000 00000"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Primary Operating Hub / City
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Bengaluru"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Commercial Model & Fleet Configuration */}
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-2xs space-y-5">
          <div className="flex items-center space-x-2.5 border-b border-slate-100 dark:border-neutral-800/80 pb-3">
            <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider text-slate-800 dark:text-neutral-200">
              Commercial Model & Fleet Parameters
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Operational Business Model
              </label>
              <select
                value={planType}
                onChange={(e) => setPlanType(e.target.value as PlanType)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500 cursor-pointer"
              >
                <option value="SaaS">SaaS (Direct Fares + ₹4,500/bus)</option>
                <option value="Lease">Lease (Fixed Monthly Yield)</option>
              </select>
            </div>

            {planType === 'SaaS' && (
              <div>
                <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                  SaaS Fee per Bus (₹/Month)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    value={saasFeePerBus}
                    onChange={(e) => setSaasFeePerBus(Number(e.target.value))}
                    min={0}
                    step={100}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Active Buses Count
              </label>
              <div className="relative">
                <Bus className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  value={activeBusesCount}
                  onChange={(e) => setActiveBusesCount(Number(e.target.value))}
                  min={0}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-neutral-300 mb-1.5">
                Average Daily Passengers
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="number"
                  value={avgDailyRiders}
                  onChange={(e) => setAvgDailyRiders(Number(e.target.value))}
                  min={0}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Feedback message */}
          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-xs font-mono flex items-center space-x-2">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Operator settings updated successfully in Firestore.</span>
            </div>
          )}

          {saveError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-mono flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{saveError}</span>
            </div>
          )}

          {/* Submit button */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold tracking-wider rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs disabled:opacity-50"
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

      {/* Section 3: DANGER ZONE - Account Deletion (Real Accounts Only) */}
      {!isDemo && (
        <div className="bg-rose-50/70 dark:bg-rose-950/20 border-2 border-rose-200 dark:border-rose-900/60 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center space-x-2.5 text-rose-700 dark:text-rose-400 border-b border-rose-200 dark:border-rose-900/40 pb-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wider">
              Danger Zone • Account & Data Deletion
            </h2>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-rose-950 dark:text-rose-200 font-medium">
              Permanently erase this operator account and cascade-delete all data from the database.
            </p>
            <p className="text-xs text-rose-800/80 dark:text-rose-300/80">
              This will irreversibly delete your owner profile, registered buses, assigned drivers, routes, scheduled maintenance records, and financial transaction history, and release your email from Firebase Auth.
            </p>
          </div>

          {deleteError && (
            <div className="p-3 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg text-xs font-mono flex items-center space-x-2">
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
                className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account & Wipe All Data</span>
              </button>
            </div>
          ) : (
            <div className="p-4 sm:p-5 bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-800 rounded-xl space-y-4 animate-in fade-in duration-150">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-bold text-rose-900 dark:text-rose-200">
                    Are you absolutely certain you want to delete your account?
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-neutral-400">
                    To confirm permanent deletion of <strong className="text-rose-600 dark:text-rose-400 font-mono">{owner.email}</strong> and all fleet records, please type <code className="px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 font-mono font-bold text-rose-800 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800">DELETE</code> below:
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
                  className="w-full max-w-sm px-3 py-2 bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-rose-500"
                />

                {needsPasswordReauth && (
                  <div className="max-w-sm space-y-1.5 pt-1">
                    <label className="block text-[11px] font-mono text-rose-900 dark:text-rose-300 font-semibold">
                      Enter your password to verify:
                    </label>
                    <input
                      type="password"
                      value={reauthPassword}
                      onChange={(e) => setReauthPassword(e.target.value)}
                      placeholder="Current account password"
                      disabled={isDeleting}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-800 border border-slate-300 dark:border-neutral-700 rounded-lg text-xs font-mono text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-rose-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleExecuteDeleteAccount}
                  disabled={confirmInput.trim() !== 'DELETE' || isDeleting || (needsPasswordReauth && !reauthPassword.trim())}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 dark:disabled:bg-rose-900/60 disabled:cursor-not-allowed text-white text-xs font-mono font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Cascade Deleting All Account Data...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>{needsPasswordReauth ? 'Verify & Delete Account' : 'Permanently Delete My Account & Fleet'}</span>
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
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono rounded-lg transition-colors cursor-pointer"
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
