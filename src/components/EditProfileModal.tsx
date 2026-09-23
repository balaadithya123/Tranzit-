import React, { useState, useEffect } from 'react';
import { OwnerProfile } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isDemoAccount, cascadeDeleteOwnerAccount } from '../lib/accountService';
import { saveLocalOwner } from '../lib/firebaseAuthHelper';
import { MapPin, Building2, Phone, Users, X, Check, Calculator, Bus, Trash2, AlertTriangle, KeyRound, Loader2, CreditCard, LogOut } from 'lucide-react';

interface EditProfileModalProps {
  owner: OwnerProfile;
  isOpen: boolean;
  onClose: () => void;
  onAccountDeleted?: () => void;
  onLogout?: () => void;
}

const INDIAN_HUBS = [
  "Bengaluru",
  "Hubballi",
  "Mysuru",
  "Mangaluru",
  "Belagavi",
  "Kalaburagi",
  "Hyderabad",
  "Chennai",
  "Coimbatore",
  "Mumbai",
  "Pune",
  "Delhi NCR"
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ owner, isOpen, onClose, onAccountDeleted, onLogout }) => {
  const [name, setName] = useState(owner.name || '');
  const [companyName, setCompanyName] = useState(owner.companyName || '');
  const [city, setCity] = useState(owner.city || 'Bengaluru');
  const [phone, setPhone] = useState(owner.phone || '+91 98450 12345');
  const [activeBusesCount, setActiveBusesCount] = useState<number>(owner.activeBusesCount ?? 0);
  const [avgDailyRiders, setAvgDailyRiders] = useState(owner.avgDailyRiders || 0);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [confirmDeleteInput, setConfirmDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [needsPasswordReauth, setNeedsPasswordReauth] = useState(false);
  const [reauthPassword, setReauthPassword] = useState('');

  const isDemo = isDemoAccount(owner);

  // Sync state when owner prop updates
  useEffect(() => {
    setName(owner.name || '');
    setCompanyName(owner.companyName || '');
    setCity(owner.city || 'Bengaluru');
    setPhone(owner.phone || '+91 98450 12345');
    setActiveBusesCount(owner.activeBusesCount ?? 0);
    setAvgDailyRiders(owner.avgDailyRiders || 0);
    setShowConfirmDelete(false);
    setConfirmDeleteInput('');
    setDeleteError(null);
    setNeedsPasswordReauth(false);
    setReauthPassword('');
  }, [owner]);

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedProfile: Partial<OwnerProfile> = {
        name,
        companyName,
        city,
        phone,
        activeBusesCount: Number(activeBusesCount),
        avgDailyRiders: Number(avgDailyRiders)
      };

      await setDoc(doc(db, 'owners', owner.id), updatedProfile, { merge: true });
      saveLocalOwner({ ...owner, ...updatedProfile });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 600);
    } catch (err) {
      console.error("Failed to update owner profile:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (confirmDeleteInput.trim() !== 'DELETE') return;
    setDeleting(true);
    setDeleteError(null);

    try {
      await cascadeDeleteOwnerAccount(owner, reauthPassword ? reauthPassword.trim() : undefined);
      onClose();
      if (onAccountDeleted) {
        onAccountDeleted();
      }
    } catch (err: any) {
      console.error("Account deletion failed:", err);
      if (err?.code === 'auth/requires-recent-login' || err?.message?.includes('Recent authentication required')) {
        setNeedsPasswordReauth(true);
        setDeleteError("Recent authentication required by Firebase. Please enter your password below to finalize deletion.");
      } else {
        setDeleteError(err?.message || "Failed to delete account. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  };

  const isSaaS = owner.planType === 'SaaS';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center transition-opacity">
      {/* Modal Container */}
      <div 
        className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 max-w-lg w-full max-h-[90vh] flex flex-col rounded-xl shadow-2xl animate-in fade-in duration-200 overflow-hidden my-auto transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header */}
        <div className="bg-slate-900 dark:bg-neutral-900 text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0 border-b border-slate-800 dark:border-neutral-800">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>Operating Hub & Profile</span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5">
              Refine Operating Hub & Settings
            </h3>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Content Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin text-slate-900 dark:text-neutral-100">
            {/* Operating Hub City Select */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Primary Operating Hub City</span>
                </span>
                <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-normal">Base Station Depot</span>
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mt-1.5">
                {INDIAN_HUBS.map((hub) => (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => setCity(hub)}
                    className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      city === hub
                        ? 'bg-slate-900 text-white dark:bg-amber-500/20 dark:text-amber-300 border-slate-900 dark:border-amber-500/40 font-bold shadow-xs'
                        : 'bg-slate-50 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300 border-slate-200 dark:border-neutral-800 hover:border-slate-400 dark:hover:border-neutral-700'
                    }`}
                  >
                    {hub}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Or enter custom hub city"
                className="w-full mt-2.5 px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Operator Full Name */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1 flex items-center space-x-1">
                <Users className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                <span>Operator Full Name</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bala Adithya"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Company / Fleet Name */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                <span>Fleet / Company Name</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Shree Royal Travels"
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Phone & Avg Riders in 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                  <span>Contact Phone</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1 flex items-center space-x-1">
                  <Bus className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                  <span>Enrolled Fleet Buses</span>
                </label>
                <input
                  type="number"
                  min={0}
                  value={activeBusesCount}
                  onChange={(e) => setActiveBusesCount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-slate-400 dark:text-neutral-500" />
                  <span>Avg Daily Riders</span>
                </label>
                <input
                  type="number"
                  value={avgDailyRiders}
                  onChange={(e) => setAvgDailyRiders(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* SaaS Plan Tier Info (Read-Only) */}
            {isSaaS && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-mono uppercase font-bold text-amber-900 dark:text-amber-200">
                      SaaS Subscription Plan
                    </span>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-200/70 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/60">
                    {owner.subscriptionPlanName || (activeBusesCount <= 5 ? 'Starter' : activeBusesCount <= 20 ? 'Growth' : 'Enterprise')} Tier
                  </span>
                </div>
                <div className="mt-2 text-xs font-mono text-slate-700 dark:text-neutral-300 flex items-center justify-between">
                  <span>Per-Bus Platform Rate:</span>
                  <span className="font-bold text-slate-900 dark:text-neutral-100">
                    ₹{(owner.saasFeePerBus || (activeBusesCount <= 5 ? 649 : activeBusesCount <= 20 ? 899 : 1599)).toLocaleString('en-IN')} / bus / mo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-2 font-sans">
                  Rates are fixed by platform administration and cannot be edited manually. Visit the Subscription page to view or select plan tiers.
                </p>
              </div>
            )}

            {/* Danger Zone: Account & Data Deletion (Real Accounts Only) */}
            {!isDemo && (
              <div className="pt-4 mt-4 border-t border-rose-200 dark:border-rose-950/60">
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-rose-700 dark:text-rose-400 uppercase">
                    <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    <span>Danger Zone • Delete Account</span>
                  </div>
                  <p className="text-[11px] text-rose-900/80 dark:text-rose-300/80 mt-1 font-sans">
                    Permanently cascade-delete this owner account and all associated buses, routes, drivers, maintenance logs, and financial records from Firestore.
                  </p>

                  {deleteError && (
                    <div className="mt-2.5 p-2.5 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-mono rounded-lg">
                      {deleteError}
                    </div>
                  )}

                  {showConfirmDelete ? (
                    <div className="mt-3 p-3 bg-rose-100/90 dark:bg-rose-950/90 border border-rose-300 dark:border-rose-800 rounded-lg space-y-3">
                      <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                        Irreversible Action: Type <span className="font-mono bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-700 font-bold">DELETE</span> to confirm:
                      </p>

                      <input
                        type="text"
                        value={confirmDeleteInput}
                        onChange={(e) => setConfirmDeleteInput(e.target.value)}
                        placeholder="Type DELETE"
                        disabled={deleting}
                        className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-700 rounded-md text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-rose-500"
                      />

                      {needsPasswordReauth && (
                        <div className="space-y-1.5 pt-1">
                          <label className="block text-[11px] font-mono text-rose-900 dark:text-rose-300 font-semibold flex items-center space-x-1">
                            <KeyRound className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            <span>Enter your password to verify:</span>
                          </label>
                          <input
                            type="password"
                            value={reauthPassword}
                            onChange={(e) => setReauthPassword(e.target.value)}
                            placeholder="Current account password"
                            disabled={deleting}
                            className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-neutral-900 border border-rose-300 dark:border-rose-700 rounded-md text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-rose-500"
                          />
                        </div>
                      )}

                      <div className="flex items-center space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={handleDeleteAccount}
                          disabled={confirmDeleteInput.trim() !== 'DELETE' || deleting || (needsPasswordReauth && !reauthPassword.trim())}
                          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-400 dark:disabled:bg-rose-900/60 disabled:cursor-not-allowed text-white text-xs font-mono font-bold uppercase rounded-md cursor-pointer flex items-center space-x-1.5"
                        >
                          {deleting ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Deleting Account...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>{needsPasswordReauth ? 'Verify & Delete Account' : 'Delete Account'}</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowConfirmDelete(false);
                            setConfirmDeleteInput('');
                            setDeleteError(null);
                            setNeedsPasswordReauth(false);
                            setReauthPassword('');
                          }}
                          disabled={deleting}
                          className="px-3 py-1.5 bg-white dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-xs font-mono rounded-md border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmDelete(true);
                        setConfirmDeleteInput('');
                        setDeleteError(null);
                      }}
                      className="mt-2.5 px-3 py-1.5 bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800/60 rounded-md text-xs font-mono font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                      <span>Delete Account</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sticky Action Buttons Footer */}
          <div className="p-4 sm:px-6 bg-slate-50 dark:bg-neutral-900/80 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between space-x-3 flex-shrink-0">
            {onLogout ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="px-3 py-2 text-xs font-mono font-bold text-rose-700 dark:text-rose-400 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 rounded-lg flex items-center space-x-1.5 transition-colors cursor-pointer border border-rose-200 dark:border-rose-900/60 shadow-2xs"
                title="Sign Out / Log Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold tracking-wider rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
              >
                {success ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 dark:text-slate-950" />
                    <span>Hub Updated!</span>
                  </>
                ) : (
                  <span>{saving ? 'Saving...' : 'Update Hub & Profile'}</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
