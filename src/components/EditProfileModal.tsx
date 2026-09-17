import React, { useState, useEffect } from 'react';
import { OwnerProfile } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MapPin, Building2, Phone, Users, X, Check, Calculator, Bus } from 'lucide-react';

interface EditProfileModalProps {
  owner: OwnerProfile;
  isOpen: boolean;
  onClose: () => void;
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

export const EditProfileModal: React.FC<EditProfileModalProps> = ({ owner, isOpen, onClose }) => {
  const [companyName, setCompanyName] = useState(owner.companyName || '');
  const [city, setCity] = useState(owner.city || 'Bengaluru');
  const [phone, setPhone] = useState(owner.phone || '+91 98450 12345');
  const [activeBusesCount, setActiveBusesCount] = useState<number>(owner.activeBusesCount ?? 3);
  const [avgDailyRiders, setAvgDailyRiders] = useState(owner.avgDailyRiders || 1240);
  const [saasFeePerBus, setSaasFeePerBus] = useState(owner.saasFeePerBus || 4500);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sync state when owner prop updates
  useEffect(() => {
    setCompanyName(owner.companyName || '');
    setCity(owner.city || 'Bengaluru');
    setPhone(owner.phone || '+91 98450 12345');
    setActiveBusesCount(owner.activeBusesCount ?? 3);
    setAvgDailyRiders(owner.avgDailyRiders || 1240);
    setSaasFeePerBus(owner.saasFeePerBus || 4500);
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
        companyName,
        city,
        phone,
        activeBusesCount: Number(activeBusesCount),
        avgDailyRiders: Number(avgDailyRiders),
        saasFeePerBus: Number(saasFeePerBus)
      };

      await setDoc(doc(db, 'owners', owner.id), updatedProfile, { merge: true });
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

            {/* SaaS Fee / Bus if SaaS */}
            {isSaaS && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <label className="block text-xs font-mono uppercase font-bold text-amber-800 dark:text-amber-300 mb-1 flex items-center space-x-1">
                  <Calculator className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>SaaS Flat Subscription Fee (₹ / Bus / Month)</span>
                </label>
                <input
                  type="number"
                  value={saasFeePerBus}
                  onChange={(e) => setSaasFeePerBus(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-amber-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 mt-1 font-mono">
                  Current total fee: ₹{saasFeePerBus.toLocaleString('en-IN')} × {activeBusesCount} buses = ₹{(saasFeePerBus * activeBusesCount).toLocaleString('en-IN')}/mo
                </p>
              </div>
            )}
          </div>

          {/* Sticky Action Buttons Footer */}
          <div className="p-4 sm:px-6 bg-slate-50 dark:bg-neutral-900/80 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end space-x-3 flex-shrink-0">
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
        </form>
      </div>
    </div>
  );
};
