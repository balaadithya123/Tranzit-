import React, { useState, useEffect } from 'react';
import { OwnerProfile, TierPricingConfig } from '../types';
import { 
  DEFAULT_TIER_PRICING, 
  isPlatformAdmin, 
  subscribeToTierPricing, 
  updateTierPricingByAdmin 
} from '../lib/pricingService';
import { formatINR } from '../lib/utils';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  Sliders, 
  Bus, 
  ArrowLeft, 
  Info, 
  Layers, 
  AlertCircle 
} from 'lucide-react';

interface AdminPricingSettingsViewProps {
  owner: OwnerProfile;
  onNavigateTab?: (tab: string) => void;
}

export const AdminPricingSettingsView: React.FC<AdminPricingSettingsViewProps> = ({
  owner,
  onNavigateTab
}) => {
  const isAdmin = isPlatformAdmin(owner);

  const [currentPricing, setCurrentPricing] = useState<TierPricingConfig>(DEFAULT_TIER_PRICING);
  const [starterRate, setStarterRate] = useState<number>(DEFAULT_TIER_PRICING.starterRate);
  const [growthRate, setGrowthRate] = useState<number>(DEFAULT_TIER_PRICING.growthRate);
  const [enterpriseRate, setEnterpriseRate] = useState<number>(DEFAULT_TIER_PRICING.enterpriseRate);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Subscribe to live rates
  useEffect(() => {
    const unsubscribe = subscribeToTierPricing((pricing) => {
      setCurrentPricing(pricing);
      setStarterRate(pricing.starterRate);
      setGrowthRate(pricing.growthRate);
      setEnterpriseRate(pricing.enterpriseRate);
    });
    return () => unsubscribe();
  }, []);

  // Access check guard
  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-14 h-14 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto border border-rose-500/20 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-neutral-100 font-sans tracking-tight">
          Admin Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto leading-relaxed">
          The subscription tier pricing configuration is restricted to authorized platform administrators.
        </p>
        {onNavigateTab && (
          <button
            onClick={() => onNavigateTab('overview')}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-xs font-mono font-bold rounded-lg cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Dashboard</span>
          </button>
        )}
      </div>
    );
  }

  const handleSaveRates = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(false);

    if (starterRate <= 0 || growthRate <= 0 || enterpriseRate <= 0) {
      setErrorMessage('All tier rates must be positive amounts.');
      return;
    }

    setIsSaving(true);
    try {
      await updateTierPricingByAdmin(
        {
          starterRate: Number(starterRate),
          growthRate: Number(growthRate),
          enterpriseRate: Number(enterpriseRate)
        },
        owner.email || 'platform-admin'
      );

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error('Error saving tier rates:', err);
      setErrorMessage(err?.message || 'Failed to update tier rates in Firestore.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setStarterRate(DEFAULT_TIER_PRICING.starterRate);
    setGrowthRate(DEFAULT_TIER_PRICING.growthRate);
    setEnterpriseRate(DEFAULT_TIER_PRICING.enterpriseRate);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl shadow-xs transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Platform Administration Console</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight font-sans">
            SaaS Subscription Tier Rates
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-1">
            This is the master settings page for updating the per-bus monthly fees for Starter, Growth, and Enterprise tiers across the entire platform.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800/60 font-mono text-xs font-bold rounded-lg flex items-center space-x-1.5 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Admin Verified: {owner.email}</span>
          </span>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 rounded-xl flex items-center space-x-3 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <div className="text-xs font-mono">
            <span className="font-bold">Subscription tier rates successfully updated!</span>
            <p className="text-[11px] font-sans text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
              All bus owners now view these updated fixed rates on their subscription page.
            </p>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 text-rose-900 dark:text-rose-200 rounded-xl flex items-center space-x-3 shadow-xs">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          <span className="text-xs font-mono font-bold">{errorMessage}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSaveRates} className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-bold uppercase font-mono tracking-wide text-slate-900 dark:text-neutral-100">
              Per-Bus Monthly Pricing Controls
            </h2>
          </div>

          <div className="text-xs font-mono text-slate-400">
            Currency: INR (₹)
          </div>
        </div>

        {/* Tier Rate Inputs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Starter Tier Input */}
          <div className="p-4 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-neutral-100">
                1. Starter Tier
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold">
                1–5 Buses
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-sans min-h-[32px]">
              Entry-level fleet owners with basic ticketing and maintenance needs.
            </p>

            <div>
              <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                Rate (₹ / Bus / Month)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-mono text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min={100}
                  step={10}
                  value={starterRate}
                  onChange={(e) => setStarterRate(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 text-sm font-mono font-bold border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">
              Default: ₹649/bus/mo
            </div>
          </div>

          {/* Growth Tier Input */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/30 rounded-xl space-y-3 ring-1 ring-amber-500/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-neutral-100 flex items-center space-x-1.5">
                <span>2. Growth Tier</span>
                <span className="text-[9px] bg-amber-500 text-slate-950 font-mono font-bold px-1.5 py-0.2 rounded">
                  Popular
                </span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-800 dark:text-amber-300 font-semibold border border-amber-500/20">
                6–20 Buses
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-sans min-h-[32px]">
              Mid-sized operators with AI incentives and automated route scheduling.
            </p>

            <div>
              <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                Rate (₹ / Bus / Month)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-mono text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min={100}
                  step={10}
                  value={growthRate}
                  onChange={(e) => setGrowthRate(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 text-sm font-mono font-bold border border-amber-300 dark:border-amber-700/60 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">
              Default: ₹899/bus/mo
            </div>
          </div>

          {/* Enterprise Tier Input */}
          <div className="p-4 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase text-slate-900 dark:text-neutral-100">
                3. Enterprise Tier
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-semibold">
                21+ Buses
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-sans min-h-[32px]">
              Large multi-depot carriers with custom SLAs and Contact Sales requests.
            </p>

            <div>
              <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                Starting Rate (₹ / Bus / Month)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 font-mono text-slate-400 text-xs font-bold">
                  ₹
                </span>
                <input
                  type="number"
                  min={100}
                  step={10}
                  value={enterpriseRate}
                  onChange={(e) => setEnterpriseRate(Number(e.target.value))}
                  className="w-full pl-7 pr-3 py-1.5 text-sm font-mono font-bold border border-slate-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                  required
                />
              </div>
            </div>

            <div className="text-[10px] font-mono text-slate-400 dark:text-neutral-500">
              Default: ₹1,599/bus/mo starting
            </div>
          </div>
        </div>

        {/* Live Simulation Matrix */}
        <div className="p-4 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-900 dark:text-neutral-100 uppercase">
              Fleet Size Revenue Projection Matrix
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Live preview of owner billings
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg">
              <div className="text-slate-400 text-[10px]">Starter • 4 Buses</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-neutral-100 mt-0.5">
                {formatINR(4 * starterRate)} / mo
              </div>
              <div className="text-[10px] text-slate-500">4 × ₹{starterRate}</div>
            </div>

            <div className="p-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg">
              <div className="text-slate-400 text-[10px]">Growth • 12 Buses</div>
              <div className="text-base font-extrabold text-amber-600 dark:text-amber-400 mt-0.5">
                {formatINR(12 * growthRate)} / mo
              </div>
              <div className="text-[10px] text-slate-500">12 × ₹{growthRate}</div>
            </div>

            <div className="p-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg">
              <div className="text-slate-400 text-[10px]">Enterprise • 30 Buses</div>
              <div className="text-base font-extrabold text-slate-900 dark:text-neutral-100 mt-0.5">
                {formatINR(30 * enterpriseRate)} / mo
              </div>
              <div className="text-[10px] text-slate-500">30 × ₹{enterpriseRate} (Custom volume)</div>
            </div>
          </div>
        </div>

        {/* Audit Trail Note */}
        {currentPricing.updatedAt && (
          <div className="text-[11px] font-mono text-slate-400 dark:text-neutral-500 flex items-center justify-between pt-1">
            <span>Last updated: {new Date(currentPricing.updatedAt).toLocaleString()}</span>
            <span>By: {currentPricing.updatedBy || 'Platform Admin'}</span>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100 dark:border-neutral-800">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-mono font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Platform Defaults</span>
          </button>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {onNavigateTab && (
              <button
                type="button"
                onClick={() => onNavigateTab('subscription')}
                className="w-full sm:w-auto px-4 py-2 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-mono font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Preview Subscription Page
              </button>
            )}

            <button
              type="submit"
              disabled={isSaving}
              className="w-full sm:w-auto px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving Changes...' : 'Save Tier Rates'}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
