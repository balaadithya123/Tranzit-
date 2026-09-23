import React, { useState, useEffect } from 'react';
import { OwnerProfile, TierPricingConfig, SubscriptionTierId } from '../types';
import { 
  DEFAULT_TIER_PRICING, 
  PLAN_TIERS, 
  PlanTierDefinition, 
  subscribeToTierPricing, 
  getMatchingTier, 
  getRateForTier, 
  recordPlanSelection 
} from '../lib/pricingService';
import { formatINR } from '../lib/utils';
import { 
  Check, 
  CheckCircle2, 
  Sparkles, 
  Bus, 
  Calculator, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  PhoneCall, 
  X, 
  Zap,
  AlertCircle
} from 'lucide-react';
import { StatCard } from './StatCard';

interface SubscriptionViewProps {
  owner: OwnerProfile;
  onNavigateTab?: (tab: string) => void;
  onPlanUpdated?: (updatedOwner: Partial<OwnerProfile>) => void;
}

export const SubscriptionView: React.FC<SubscriptionViewProps> = ({
  owner,
  onNavigateTab,
  onPlanUpdated
}) => {
  const [pricing, setPricing] = useState<TierPricingConfig>(DEFAULT_TIER_PRICING);
  const actualFleetCount = owner.activeBusesCount ?? 0;
  
  // Interactive bus count calculator (defaults to owner's current fleet size or 3)
  const [calculatorBusCount, setCalculatorBusCount] = useState<number>(
    actualFleetCount > 0 ? actualFleetCount : 3
  );

  const [selectingTierId, setSelectingTierId] = useState<SubscriptionTierId | null>(null);
  const [selectionSuccess, setSelectionSuccess] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [contactSalesModalOpen, setContactSalesModalOpen] = useState(false);
  const [salesMessageSent, setSalesMessageSent] = useState(false);
  const [salesNote, setSalesNote] = useState('');

  // Subscribe to real-time platform rates set by the admin
  useEffect(() => {
    const unsubscribe = subscribeToTierPricing((newPricing) => {
      setPricing(newPricing);
    });
    return () => unsubscribe();
  }, []);

  // Which tier matches the owner's ACTUAL fleet size
  const actualFleetTier = getMatchingTier(actualFleetCount);

  // Which tier matches the CALCULATOR selection
  const calculatedTier = getMatchingTier(calculatorBusCount);

  // Active plan of the owner
  const currentSelectedTierId: SubscriptionTierId = owner.subscriptionTier 
    ? owner.subscriptionTier 
    : (actualFleetCount <= 5 ? 'starter' : actualFleetCount <= 20 ? 'growth' : 'enterprise');

  const handleSelectPlan = async (tier: PlanTierDefinition) => {
    if (tier.isContactSales) {
      setContactSalesModalOpen(true);
      return;
    }

    setSelectingTierId(tier.id);
    setSelectionSuccess(null);
    setSelectionError(null);

    const rate = getRateForTier(tier.id, pricing);

    try {
      await recordPlanSelection(owner.id, tier, rate);
      const successMsg = `You are now on the ${tier.name} Plan at ${formatINR(rate)}/bus/month.`;
      setSelectionSuccess(successMsg);

      if (onPlanUpdated) {
        onPlanUpdated({
          subscriptionTier: tier.id,
          subscriptionPlanName: tier.name,
          saasFeePerBus: rate,
          subscriptionSelectedAt: new Date().toISOString()
        });
      }

      setTimeout(() => {
        setSelectionSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('Failed to update plan selection:', err);
      setSelectionError('Could not update your plan right now. Please try again in a moment.');
      setTimeout(() => setSelectionError(null), 6000);
    } finally {
      setSelectingTierId(null);
    }
  };

  const handleSendContactSales = () => {
    setSalesMessageSent(true);
    setTimeout(() => {
      setSalesMessageSent(false);
      setContactSalesModalOpen(false);
      setSalesNote('');
    }, 2500);
  };

  const handleBusCountChange = (val: number) => {
    const clamped = Math.max(1, Math.min(500, Math.floor(val || 1)));
    setCalculatorBusCount(clamped);
  };

  const presetValues = [
    { label: `My Fleet (${actualFleetCount})`, value: Math.max(1, actualFleetCount) },
    { label: '3 Buses', value: 3 },
    { label: '8 Buses', value: 8 },
    { label: '15 Buses', value: 15 },
    { label: '25 Buses', value: 25 },
    { label: '50 Buses', value: 50 },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
              Carrier Subscription & Plans
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Predictable SaaS Pricing
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Simple per-bus monthly plans. Select your tier based on fleet scale with no hidden licensing fees.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl flex items-center space-x-2">
            <Bus className="w-4 h-4 text-blue-600" />
            <div className="text-xs font-mono">
              <span className="text-slate-400">Active Fleet: </span>
              <span className="font-bold text-slate-900 dark:text-white">{actualFleetCount} Buses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {selectionSuccess && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-xs font-mono font-bold">{selectionSuccess}</p>
              <p className="text-[11px] font-sans text-emerald-800/80 dark:text-emerald-300/80 mt-0.5">
                Your dashboard metrics and billing statements now reflect this tier's per-bus rate.
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectionSuccess(null)}
            className="p-1 text-emerald-700 dark:text-emerald-300 hover:opacity-75 cursor-pointer"
            aria-label="Dismiss success message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {selectionError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 rounded-2xl flex items-center justify-between shadow-2xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
            <p className="text-xs font-mono font-bold">{selectionError}</p>
          </div>
          <button
            onClick={() => setSelectionError(null)}
            className="p-1 text-rose-700 dark:text-rose-300 hover:opacity-75 cursor-pointer"
            aria-label="Dismiss error message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 2: ESTIMATOR CALCULATOR */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div>
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <h2 className="text-sm font-bold uppercase font-mono tracking-wide text-slate-900 dark:text-white">
                Fleet Size Cost Estimator
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-0.5">
              Simulate your expected fleet size to see the per-bus monthly cost in each tier.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex items-center border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => handleBusCountChange(calculatorBusCount - 1)}
                className="px-3.5 py-2 text-sm font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Decrease bus count"
              >
                -
              </button>
              <div className="relative flex items-center px-2">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={calculatorBusCount}
                  onChange={(e) => handleBusCountChange(Number(e.target.value))}
                  className="w-16 py-1 text-center font-mono font-black text-slate-900 dark:text-white text-sm bg-transparent focus:outline-none"
                />
                <span className="text-[10px] font-mono text-slate-400">buses</span>
              </div>
              <button
                type="button"
                onClick={() => handleBusCountChange(calculatorBusCount + 1)}
                className="px-3.5 py-2 text-sm font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Increase bus count"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Range Slider & Presets */}
        <div className="space-y-3 pt-1">
          <input
            type="range"
            min={1}
            max={60}
            value={Math.min(60, calculatorBusCount)}
            onChange={(e) => handleBusCountChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-mono text-slate-400 mr-1">Quick Presets:</span>
            {presetValues.map((preset, idx) => {
              const isSelected = calculatorBusCount === preset.value;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleBusCountChange(preset.value)}
                  className={`px-3 py-1 text-xs font-mono rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 font-bold shadow-xs'
                      : 'bg-slate-50 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-800 hover:border-slate-300'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SECTION 3: PLAN TIERS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {PLAN_TIERS.map((tier) => {
          const isActualFleetMatch = actualFleetTier.id === tier.id;
          const isCurrentPlan = currentSelectedTierId === tier.id;
          const isSimulatedMatch = calculatedTier.id === tier.id;

          const ratePerBus = getRateForTier(tier.id, pricing);
          const estimatedMonthlyCost = calculatorBusCount * ratePerBus;

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col justify-between rounded-2xl border transition-all duration-200 bg-white dark:bg-[#10131a] p-6 shadow-2xs ${
                isActualFleetMatch
                  ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                  : 'border-slate-200/90 dark:border-neutral-800/80 hover:border-slate-300'
              }`}
            >
              {/* Top Badges */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1.5 mb-3">
                  <div className="flex items-center space-x-1.5">
                    {tier.isPopular && (
                      <span className="px-2.5 py-0.5 bg-blue-600 text-white font-mono text-[10px] font-bold rounded-full uppercase tracking-wider">
                        Most Popular
                      </span>
                    )}
                    {isCurrentPlan && (
                      <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-mono text-[10px] font-bold rounded-full uppercase">
                        Current Plan
                      </span>
                    )}
                  </div>

                  {isActualFleetMatch && (
                    <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 font-mono text-[10px] font-bold rounded-full flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Fleet Match</span>
                    </span>
                  )}
                </div>

                {/* Tier Title */}
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white font-sans tracking-tight">
                    {tier.name}
                  </h3>
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-neutral-400">
                    {tier.busRangeLabel}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 font-sans min-h-[36px] leading-relaxed">
                  {tier.tagline}
                </p>

                {/* Fixed Rate */}
                <div className="mt-4 p-3.5 bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                    <span className="flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Platform Rate</span>
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      Standard
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-white">
                      ₹{ratePerBus.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                      / bus / month
                    </span>
                  </div>
                </div>

                {/* Estimated Total for selected bus count */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-neutral-800">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold mb-1">
                    Cost for {calculatorBusCount} {calculatorBusCount === 1 ? 'Bus' : 'Buses'}
                  </div>

                  {tier.isContactSales ? (
                    <div>
                      <div className="text-lg font-bold font-sans text-slate-900 dark:text-white">
                        Custom Enterprise Terms
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 mt-0.5">
                        Volume starting from ₹{(calculatorBusCount * ratePerBus).toLocaleString('en-IN')}/mo
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
                          ₹{estimatedMonthlyCost.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                          / month
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 mt-0.5">
                        {calculatorBusCount} buses × ₹{ratePerBus.toLocaleString('en-IN')}/bus
                      </div>
                    </div>
                  )}
                </div>

                {/* Features List */}
                <div className="mt-5 space-y-2">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                    Included Capabilities:
                  </div>
                  <ul className="space-y-1.5 text-xs font-sans text-slate-600 dark:text-neutral-300">
                    {tier.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-neutral-800">
                {tier.isContactSales ? (
                  <button
                    type="button"
                    onClick={() => setContactSalesModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-mono font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Contact Sales</span>
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold rounded-xl flex items-center justify-center space-x-2 cursor-default"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(tier)}
                    disabled={selectingTierId === tier.id}
                    className={`w-full py-2.5 px-4 text-xs font-mono font-bold rounded-xl transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
                      isActualFleetMatch
                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20 shadow-md'
                        : 'bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 text-slate-900 dark:text-white border border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    {selectingTierId === tier.id ? (
                      <span>Updating Plan...</span>
                    ) : (
                      <>
                        <span>Select {tier.name}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* SECTION 4: ENTERPRISE CONTACT SALES MODAL */}
      {contactSalesModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold font-sans">
                  Enterprise Fleet Inquiry
                </h3>
              </div>
              <button
                onClick={() => setContactSalesModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {salesMessageSent ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  Inquiry Received!
                </h4>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Our regional enterprise director will reach out to <span className="font-mono font-bold text-slate-900 dark:text-white">{owner.email}</span> within 24 business hours.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-neutral-400 leading-relaxed font-sans">
                  For fleets with 21+ buses, we offer dedicated SLAs, GPS telematics integrations, and volume pricing starting at ₹{pricing.enterpriseRate}/bus/month.
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-2 px-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800">
                    <span className="text-slate-400">Operator:</span>
                    <span className="font-bold">{owner.companyName || owner.name}</span>
                  </div>
                  <div className="flex justify-between py-2 px-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800">
                    <span className="text-slate-400">Active Fleet:</span>
                    <span className="font-bold">{actualFleetCount} Buses</span>
                  </div>
                  <div className="flex justify-between py-2 px-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-200 dark:border-neutral-800">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-bold">{owner.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 font-bold mb-1">
                    Fleet Requirements or Notes
                  </label>
                  <textarea
                    rows={3}
                    value={salesNote}
                    onChange={(e) => setSalesNote(e.target.value)}
                    placeholder="E.g. We operate 35 intercity sleeper coaches across Karnataka."
                    className="w-full px-3 py-2 text-xs font-sans border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setContactSalesModalOpen(false)}
                    className="px-3.5 py-2 text-xs font-mono font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendContactSales}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-md shadow-blue-500/20"
                  >
                    Submit Inquiry
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
