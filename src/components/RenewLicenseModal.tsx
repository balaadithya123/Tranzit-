import React, { useState } from 'react';
import { Driver } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getLicenseValidityInfo } from '../lib/utils';

interface RenewLicenseModalProps {
  driver: Driver | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RenewLicenseModal: React.FC<RenewLicenseModalProps> = ({
  driver,
  isOpen,
  onClose
}) => {
  // Default new expiry date to 3 years from today (standard commercial license renewal in India)
  const defaultRenewalDate = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().split('T')[0];
  };

  const [newExpiryDate, setNewExpiryDate] = useState(defaultRenewalDate());
  const [updatedBadgeNumber, setUpdatedBadgeNumber] = useState(driver?.badgeNumber || '');
  const [renewalNotes, setRenewalNotes] = useState(`Commercial DL renewed on ${new Date().toLocaleDateString('en-IN')}`);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever driver or isOpen changes
  React.useEffect(() => {
    if (driver && isOpen) {
      setNewExpiryDate(defaultRenewalDate());
      setUpdatedBadgeNumber(driver.badgeNumber || '');
      setRenewalNotes(`Commercial DL renewed on ${new Date().toLocaleDateString('en-IN')}`);
      setError(null);
      setSubmitting(false);
    }
  }, [driver, isOpen]);

  if (!isOpen || !driver) return null;

  const currentValidity = getLicenseValidityInfo(driver.licenseExpiryDate);

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpiryDate) {
      setError('Please select the new license expiry date.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await updateDoc(doc(db, 'drivers', driver.id), {
        licenseExpiryDate: newExpiryDate,
        badgeNumber: updatedBadgeNumber.trim().toUpperCase(),
        notes: renewalNotes ? `${driver.notes ? `${driver.notes}\n` : ''}${renewalNotes}` : driver.notes
      });
      onClose();
    } catch (err: any) {
      console.error("Error renewing license:", err);
      setError(err?.message || 'Failed to update license renewal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-neutral-900 text-white flex items-center justify-between border-b border-slate-800 dark:border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase font-mono tracking-wide">
                Renew Commercial License
              </h2>
              <p className="text-[11px] text-slate-300 dark:text-neutral-400 font-sans">
                {driver.name} ({driver.employeeId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Validity Notice */}
        <div className="p-4 bg-slate-50 dark:bg-neutral-900/60 border-b border-slate-200 dark:border-neutral-800 text-xs font-mono space-y-1">
          <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400">
            <span>DL Number:</span>
            <span className="font-bold text-slate-800 dark:text-neutral-200">{driver.licenseNumber}</span>
          </div>
          <div className="flex items-center justify-between text-slate-600 dark:text-neutral-400">
            <span>Current Expiry:</span>
            <span className="font-bold text-slate-800 dark:text-neutral-200">{driver.licenseExpiryDate}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-600 dark:text-neutral-400">Current Status:</span>
            <span className={`px-2 py-0.5 rounded font-bold ${
              currentValidity.status === 'Expired'
                ? 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                : currentValidity.status === 'Expiring Soon'
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
            }`}>
              {currentValidity.status} ({currentValidity.label})
            </span>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-2.5 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRenew} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 uppercase font-bold mb-1">
              New License Expiry Date *
            </label>
            <input
              type="date"
              required
              value={newExpiryDate}
              onChange={(e) => setNewExpiryDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
            />
            <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-sans mt-0.5 block">
              Usually valid for 3 or 5 years under Indian Motor Vehicles Act.
            </span>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 uppercase font-bold mb-1">
              PSV Badge Number (if renewed)
            </label>
            <input
              type="text"
              value={updatedBadgeNumber}
              onChange={(e) => setUpdatedBadgeNumber(e.target.value)}
              placeholder="e.g. KA-PSV-8492"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono uppercase text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 uppercase font-bold mb-1">
              RTO Renewal Audit Note
            </label>
            <textarea
              rows={2}
              value={renewalNotes}
              onChange={(e) => setRenewalNotes(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none resize-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono uppercase font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white text-xs font-mono uppercase font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Updating...' : 'Confirm Renewal & Verify'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
