import React, { useState, useEffect } from 'react';
import { OwnerProfile } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MapPin, Building2, Phone, Users, X, Check, Calculator, Sparkles } from 'lucide-react';

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
  const [avgDailyRiders, setAvgDailyRiders] = useState(owner.avgDailyRiders || 1240);
  const [saasFeePerBus, setSaasFeePerBus] = useState(owner.saasFeePerBus || 4500);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center">
      
      {/* Modal Container with Max Height & Flex Column */}
      <div 
        className="bg-white border border-[#E8E4DC] max-w-lg w-full max-h-[90vh] flex flex-col rounded-xs shadow-2xl animate-in fade-in duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Sticky Header */}
        <div className="bg-[#1A1F2C] text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0 border-b border-[#1A1F2C]">
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
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xs transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Content Body */}
        <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
          
          <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
            
            {/* Operating Hub City Select */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1 flex items-center justify-between">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  <span>Primary Operating Hub City</span>
                </span>
                <span className="text-[10px] text-slate-400 font-normal">Base Station Depot</span>
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 sm:gap-2 mt-1">
                {INDIAN_HUBS.map((hub) => (
                  <button
                    key={hub}
                    type="button"
                    onClick={() => setCity(hub)}
                    className={`px-2.5 py-1.5 text-xs font-mono font-medium rounded-xs border text-left transition-colors cursor-pointer ${
                      city === hub
                        ? 'bg-[#1A1F2C] text-white border-[#1A1F2C] font-bold shadow-xs'
                        : 'bg-[#FBF9F5] text-slate-700 border-[#E8E4DC] hover:border-slate-400'
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
                className="w-full mt-2.5 px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
              />
            </div>

            {/* Company / Fleet Name */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1 flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Fleet / Company Name</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Shree Royal Travels"
                className="w-full px-3 py-2 text-sm border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
              />
            </div>

            {/* Phone & Avg Riders in 2 cols */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1 flex items-center space-x-1">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>Contact Phone</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1 flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-slate-500" />
                  <span>Avg Daily Riders</span>
                </label>
                <input
                  type="number"
                  value={avgDailyRiders}
                  onChange={(e) => setAvgDailyRiders(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                />
              </div>
            </div>

            {/* SaaS Fee / Bus if SaaS */}
            {isSaaS && (
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xs">
                <label className="block text-xs font-mono uppercase font-bold text-amber-950 mb-1 flex items-center space-x-1">
                  <Calculator className="w-3.5 h-3.5 text-amber-700" />
                  <span>SaaS Flat Subscription Fee (₹ / Bus / Month)</span>
                </label>
                <input
                  type="number"
                  value={saasFeePerBus}
                  onChange={(e) => setSaasFeePerBus(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-amber-300 rounded-xs bg-white focus:outline-none focus:border-amber-600"
                />
                <p className="text-[11px] text-amber-900 mt-1 font-mono">
                  Current total fee: ₹{saasFeePerBus.toLocaleString('en-IN')} × {owner.activeBusesCount || 3} buses = ₹{(saasFeePerBus * (owner.activeBusesCount || 3)).toLocaleString('en-IN')}/mo
                </p>
              </div>
            )}

          </div>

          {/* Sticky Pinned Action Buttons Footer */}
          <div className="p-4 sm:px-6 bg-[#FBF9F5] border-t border-[#E8E4DC] flex items-center justify-end space-x-3 flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono uppercase text-slate-600 hover:text-slate-900 border border-transparent hover:border-[#E8E4DC] rounded-xs cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#1A1F2C] hover:bg-[#0F131D] text-white text-xs font-mono uppercase font-bold tracking-wider rounded-xs transition-colors flex items-center space-x-2 cursor-pointer shadow-sm"
            >
              {success ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
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
