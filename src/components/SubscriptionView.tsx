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
  Sliders, 
  HelpCircle,
  Clock,
  ChevronRight,
  Zap
} from 'lucide-react';

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
  
  // Interactive bus count calculator (defaults to owner's current fleet size or 1)
  const [calculatorBusCount, setCalculatorBusCount] = useState<number>(
    actualFleetCount > 0 ? actualFleetCount : 3
  );

  const [selectingTierId, setSelectingTierId] = useState<SubscriptionTierId | null>(null);
  const [selectionSuccess, setSelectionSuccess] = useState<string | null>(null);
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
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl shadow-xs transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1.5 font-bold">
            <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>SaaS Subscription Plans</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight font-sans">
            Fleet Subscription & Tier Pricing
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-1 max-w-2xl">
            Predictable per-bus monthly plans established by platform administration. Select your tier based on fleet scale — no surprise licensing charges.
          </p>
        </div>

        {/* Current status pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-right">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-semibold">
              Current Active Fleet
            </div>
            <div className="text-sm font-bold font-mono text-slate-900 dark:text-neutral-100 flex items-center justify-end space-x-1.5">
              <Bus className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>{actualFleetCount} {actualFleetCount === 1 ? 'Bus' : 'Buses'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {selectionSuccess && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
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
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Interactive Fleet Size & Cost Calculator */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-5 border-b border-slate-100 dark:border-neutral-800/80">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Calculator className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="text-sm font-bold uppercase font-mono tracking-wide text-slate-900 dark:text-neutral-100">
                Fleet Size Cost Estimator
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans">
              Enter or slide to simulate your expected fleet size. The estimated monthly total adjusts live using each tier's fixed per-bus rate.
            </p>
          </div>

          {/* Stepper + Input */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center border border-slate-200 dark:border-neutral-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-neutral-900">
              <button
                type="button"
                onClick={() => handleBusCountChange(calculatorBusCount - 1)}
                className="px-3 py-2 text-sm font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Decrease bus count"
              >
                -
              </button>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={calculatorBusCount}
                  onChange={(e) => handleBusCountChange(Number(e.target.value))}
                  className="w-20 py-1.5 text-center font-mono font-extrabold text-slate-900 dark:text-neutral-100 text-sm bg-transparent focus:outline-hidden"
                />
                <span className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 pr-2">
                  buses
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleBusCountChange(calculatorBusCount + 1)}
                className="px-3 py-2 text-sm font-bold text-slate-600 dark:text-neutral-300 hover:bg-slate-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                aria-label="Increase bus count"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Range Slider & Quick Presets */}
        <div className="mt-5 space-y-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
              <span>1 Bus (Starter)</span>
              <span>20 Buses (Growth)</span>
              <span>50+ Buses (Enterprise)</span>
            </div>
            <input
              type="range"
              min={1}
              max={60}
              value={Math.min(60, calculatorBusCount)}
              onChange={(e) => handleBusCountChange(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-mono text-slate-400 dark:text-neutral-500 mr-1">
              Presets:
            </span>
            {presetValues.map((preset, idx) => {
              const isSelected = calculatorBusCount === preset.value;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleBusCountChange(preset.value)}
                  className={`px-2.5 py-1 text-xs font-mono rounded-md border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-amber-500 dark:text-slate-950 border-transparent font-bold shadow-2xs'
                      : 'bg-slate-50 dark:bg-neutral-900/60 text-slate-600 dark:text-neutral-400 border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Plan Tiers Grid (Requirement 1, 2, 3, 4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
        {PLAN_TIERS.map((tier) => {
          const isActualFleetMatch = actualFleetTier.id === tier.id;
          const isCurrentPlan = currentSelectedTierId === tier.id;
          const isSimulatedMatch = calculatedTier.id === tier.id;

          const ratePerBus = getRateForTier(tier.id, pricing);
          const estimatedMonthlyCost = calculatorBusCount * ratePerBus;

          return (
            <div
              key={tier.id}
              className={`relative flex flex-col justify-between rounded-xl border transition-all duration-200 bg-white dark:bg-[#121214] p-6 shadow-xs ${
                isActualFleetMatch
                  ? 'border-amber-500 dark:border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                  : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700'
              }`}
            >
              {/* Top Badges */}
              <div className="flex flex-wrap items-center justify-between gap-1.5 mb-4">
                <div className="flex items-center space-x-1.5">
                  {tier.isPopular && (
                    <span className="px-2.5 py-0.5 bg-amber-500 text-slate-950 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider shadow-2xs">
                      Most Popular
                    </span>
                  )}
                  {isCurrentPlan && (
                    <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 font-mono text-[10px] font-bold rounded-full uppercase">
                      Current Plan
                    </span>
                  )}
                </div>

                {/* Fleet Match Indicator */}
                {isActualFleetMatch && (
                  <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 font-mono text-[10px] font-bold rounded-md flex items-center space-x-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-600 dark:text-amber-400" />
                    <span>Your Fleet Match</span>
                  </span>
                )}
              </div>

              {/* Tier Title & Description */}
              <div>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-neutral-100 font-sans tracking-tight">
                    {tier.name}
                  </h3>
                  <span className="text-xs font-mono font-semibold text-slate-500 dark:text-neutral-400">
                    {tier.busRangeLabel}
                  </span>
                </div>

                <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1.5 font-sans min-h-[36px] leading-relaxed">
                  {tier.tagline}
                </p>

                {/* Fixed Per-Bus Rate (Read-Only) */}
                <div className="mt-5 p-3.5 bg-slate-50 dark:bg-neutral-900/80 border border-slate-100 dark:border-neutral-800 rounded-lg space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                    <span className="flex items-center space-x-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Fixed Platform Rate</span>
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-slate-400">
                      Set by Admin
                    </span>
                  </div>

                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black font-mono text-slate-900 dark:text-neutral-100">
                      ₹{ratePerBus.toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-neutral-400">
                      / bus / month
                    </span>
                  </div>
                </div>

                {/* Estimated Total Monthly Cost Calculation (Requirement 2) */}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-neutral-800/80">
                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-semibold mb-1">
                    Estimated Cost for {calculatorBusCount} {calculatorBusCount === 1 ? 'Bus' : 'Buses'}
                  </div>

                  {tier.isContactSales ? (
                    <div>
                      <div className="text-xl font-extrabold font-sans text-slate-900 dark:text-neutral-100 tracking-tight">
                        Contact Sales
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 mt-0.5">
                        Volume terms starting from ₹{(calculatorBusCount * ratePerBus).toLocaleString('en-IN')}/mo
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">
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
                <div className="mt-6 space-y-2.5">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 dark:text-neutral-500 font-bold">
                    What's Included:
                  </div>
                  <ul className="space-y-2 text-xs font-sans text-slate-600 dark:text-neutral-300">
                    {tier.features.map((feature, fIdx) => (
                      <li key={fIdx} className="flex items-start space-x-2">
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action Button (Requirement 4) */}
              <div className="mt-8 pt-4 border-t border-slate-100 dark:border-neutral-800/80">
                {tier.isContactSales ? (
                  <button
                    type="button"
                    onClick={() => setContactSalesModalOpen(true)}
                    className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>Contact Sales</span>
                  </button>
                ) : isCurrentPlan ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 px-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-mono font-bold rounded-lg flex items-center justify-center space-x-2 cursor-default"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Current Active Plan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSelectPlan(tier)}
                    disabled={selectingTierId === tier.id}
                    className={`w-full py-2.5 px-4 text-xs font-mono font-bold rounded-lg transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
                      isActualFleetMatch
                        ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                        : 'bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-900 dark:text-neutral-100 border border-slate-200 dark:border-neutral-700'
                    }`}
                  >
                    {selectingTierId === tier.id ? (
                      <span>Updating Plan...</span>
                    ) : (
                      <>
                        <span>Select {tier.name} Plan</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}

                {isActualFleetMatch && !isCurrentPlan && (
                  <p className="text-[10px] font-mono text-center text-amber-700 dark:text-amber-400 mt-2 font-medium">
                    Recommended for your current fleet of {actualFleetCount} buses
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Transparency Note */}
      <div className="p-4 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-xl flex items-start space-x-3">
        <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs font-sans text-slate-600 dark:text-neutral-400 space-y-1">
          <p className="font-bold text-slate-900 dark:text-neutral-200 font-mono">
            Platform Rate Policy & Billing Cycle
          </p>
          <p>
            Per-bus subscription rates are centrally maintained by Tranzit platform administrators. When your fleet expands or contracts, your tier qualification adjusts automatically to guarantee the best available volume rate.
          </p>
        </div>
      </div>

      {/* Enterprise Contact Sales Modal */}
      {contactSalesModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-neutral-800 pb-3">
              <div className="flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-base font-bold font-sans text-slate-900 dark:text-neutral-100">
                  Enterprise Fleet Inquiry
                </h3>
              </div>
              <button
                onClick={() => setContactSalesModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {salesMessageSent ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="text-sm font-bold font-mono text-slate-900 dark:text-neutral-100">
                  Inquiry Received!
                </h4>
                <p className="text-xs text-slate-500 dark:text-neutral-400">
                  Our regional enterprise director will reach out to <span className="font-mono font-bold text-slate-900 dark:text-neutral-200">{owner.email}</span> within 24 business hours.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 dark:text-neutral-400">
                  For fleets with 21+ buses, we offer tailored SLAs, dedicated GPS telematics integrations, and volume pricing starting at ₹{pricing.enterpriseRate}/bus/month.
                </p>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1.5 px-3 bg-slate-50 dark:bg-neutral-900 rounded border border-slate-200 dark:border-neutral-800">
                    <span className="text-slate-400">Operator:</span>
                    <span className="font-bold text-slate-900 dark:text-neutral-100">{owner.companyName || owner.name}</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-3 bg-slate-50 dark:bg-neutral-900 rounded border border-slate-200 dark:border-neutral-800">
                    <span className="text-slate-400">Active Fleet:</span>
                    <span className="font-bold text-slate-900 dark:text-neutral-100">{actualFleetCount} Buses</span>
                  </div>
                  <div className="flex justify-between py-1.5 px-3 bg-slate-50 dark:bg-neutral-900 rounded border border-slate-200 dark:border-neutral-800">
                    <span className="text-slate-400">Email:</span>
                    <span className="font-bold text-slate-900 dark:text-neutral-100">{owner.email}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 font-semibold mb-1">
                    Depot Requirements or Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={salesNote}
                    onChange={(e) => setSalesNote(e.target.value)}
                    placeholder="E.g. We have 32 intercity sleeper coaches across Karnataka and Maharashtra routes."
                    className="w-full px-3 py-2 text-xs font-sans border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-hidden focus:border-amber-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setContactSalesModalOpen(false)}
                    className="px-3 py-1.5 text-xs font-mono text-slate-600 dark:text-neutral-400 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSendContactSales}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Submit Enterprise Request
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
