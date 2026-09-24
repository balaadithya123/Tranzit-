import React, { useState, useEffect } from 'react';
import {
  Bus,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Zap,
  TrendingUp,
  Calculator,
  Users,
  Fuel,
  Wrench,
  CreditCard,
  Route as RouteIcon,
  ChevronRight,
  Layers,
  Check,
  DollarSign,
  Activity,
  Clock,
  Award,
  Lock,
  PhoneCall,
  Globe,
  Star,
  Play,
  Monitor
} from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { PLAN_TIERS, DEFAULT_TIER_PRICING, getMatchingTier, getRateForTier } from '../lib/pricingService';
import { formatINR } from '../lib/utils';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToDemo?: (demoType: 'SaaS' | 'Lease') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onNavigateToAuth,
  onNavigateToDemo
}) => {
  // Calculator state
  const [calcBuses, setCalcBuses] = useState<number>(5);
  const matchingTier = getMatchingTier(calcBuses);
  const matchingRate = getRateForTier(matchingTier.id, DEFAULT_TIER_PRICING);

  // Active showcase tab
  const [activeShot, setActiveShot] = useState<'overview' | 'fleet' | 'earnings'>('overview');

  // Interactive feature tab
  const [activeFeature, setActiveFeature] = useState<number>(0);

  const features = [
    {
      id: 'tickets',
      title: 'Smart Ticket & Dynamic Fare Engine',
      icon: RouteIcon,
      badge: 'Revenue Optimizer',
      tagline: 'Automated fare computation with zero manual calculations',
      bullets: [
        'Kilometric fare formula: (Distance in Km × Rate/Km) + Fixed Base Charge',
        'Dynamic demand charges during peak weekend and holiday rushes',
        'Automated permit compliance check (Stage Carriage & Contract Carriage)'
      ],
      highlight: 'Fare determined precisely per route kilometer and demand levels.'
    },
    {
      id: 'earnings',
      title: 'Instant Daily Payouts & Settlement',
      icon: CreditCard,
      badge: 'Daily Cashflow',
      tagline: 'Ticket revenue settled directly into owner accounts every single day',
      bullets: [
        'Conductor cash collections directly reach owners at shift close',
        'App, UPI, and Credit Card payments settled directly into owner accounts daily',
        'Real-time digital ticket reconciliation with zero revenue leakage'
      ],
      highlight: '100% daily payout reliability across all digital and cash channels.'
    },
    {
      id: 'payroll',
      title: 'Trip & Driver Payroll Management',
      icon: Users,
      badge: 'Staff Operations',
      tagline: 'Complete driver roster, trip schedules, and salary disbursements',
      bullets: [
        'Trips and rotational shifts managed seamlessly inside subscription',
        'Driver and conductor monthly salaries paid regularly on schedule',
        'Owner retains full financial control over monthly staff payroll budgets'
      ],
      highlight: 'Streamlined staff management and automated monthly payroll.'
    },
    {
      id: 'maintenance',
      title: 'Partnered Maintenance & Weekly Audits',
      icon: Wrench,
      badge: 'Fleet Health',
      tagline: 'Preventive service requests and top-class partnered local service centers',
      bullets: [
        'Weekly and monthly vehicle health checkups by certified inspectors',
        'One-click service requests for engine, brakes, and AC compressors',
        'Serviced by top-class partnered local workshops at discounted rates'
      ],
      highlight: 'Proactive maintenance to eliminate unexpected highway breakdowns.'
    },
    {
      id: 'fuel',
      title: 'Fuel Discount Tie-ups & Fleet Fastag',
      icon: Fuel,
      badge: 'Expense Reduction',
      tagline: 'Up to 2-4% savings on fuel expenses and automated Fastag management',
      bullets: [
        'Tie-ups with local fuel pumps and depots for 2% to 4% discount on diesel',
        'Driver fuel incentives awarded based on eco-driving efficiency scores',
        'Unified Fleet Fastag with integrated auto-toll charges or direct payments'
      ],
      highlight: 'Save up to ₹15,000/bus monthly on fuel and toll overheads.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-violet-500 selection:text-white transition-colors">

      {/* BACKGROUND DECORATIVE GLOWS */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-[30rem] h-[30rem] bg-violet-900/10 rounded-full blur-3xl" />
      </div>

      {/* TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">

          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center font-black text-lg rounded-xl shadow-lg shadow-violet-500/25 border border-violet-400/30">
              TZ
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-white font-sans">
                  Tranzit
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 rounded-full uppercase">
                  Fleet OS
                </span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                SaaS Operating System for Bus Operators
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-mono uppercase font-semibold text-slate-300">
            <a href="#features" className="hover:text-violet-400 transition-colors">Key Features</a>
            <a href="#preview" className="hover:text-violet-400 transition-colors">UI Preview</a>
            <a href="#pricing" className="hover:text-violet-400 transition-colors">Pricing & Plans</a>
            <a href="#calculator" className="hover:text-violet-400 transition-colors">Fleet Calculator</a>
          </nav>

          {/* CTA Actions */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onNavigateToAuth}
              className="px-4 sm:px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-slate-300 hover:text-white bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl transition-all cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onNavigateToAuth}
              className="px-4 sm:px-5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-violet-600/30 hover:shadow-violet-600/50 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <span>Visit Site</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Top Tagline Badge */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-violet-950/60 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold mb-6 animate-pulse shadow-inner">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Next-Gen Bus Operator SaaS & Fleet Management</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight max-w-4xl mx-auto">
          Ride Smart. Ryde Alryde. <br />
          <span className="bg-gradient-to-r from-violet-400 via-indigo-300 to-violet-200 bg-clip-text text-transparent">
            Empowering Private Bus Owners.
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="mt-6 text-sm sm:text-base lg:text-lg text-slate-400 max-w-2xl mx-auto font-sans leading-relaxed">
          Predictable monthly SaaS subscription for software. Automate ticket fares, get direct daily earnings via UPI/Card, manage driver payroll, access partnered local service maintenance, and unlock up to 4% fuel discounts.
        </p>

        {/* Hero CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onNavigateToAuth}
            className="px-7 py-3.5 text-xs sm:text-sm font-mono uppercase font-extrabold tracking-wider text-white bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-600 hover:from-violet-500 hover:to-indigo-500 rounded-2xl shadow-xl shadow-violet-600/35 hover:shadow-violet-600/50 transition-all flex items-center space-x-2 cursor-pointer group"
          >
            <span>Get Started / Visit Site</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          {onNavigateToDemo && (
            <button
              onClick={() => onNavigateToDemo('SaaS')}
              className="px-6 py-3.5 text-xs sm:text-sm font-mono uppercase font-bold tracking-wider text-slate-300 hover:text-white bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 rounded-2xl transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-violet-400 fill-violet-400" />
              <span>Explore Live Demo</span>
            </button>
          )}
        </div>

        {/* Key Highlight Pills */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xs text-left">
            <div className="text-xl font-black font-mono text-violet-400">₹649</div>
            <div className="text-xs text-slate-400 font-sans mt-0.5">Starting SaaS Fee/Bus/Mo</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xs text-left">
            <div className="text-xl font-black font-mono text-emerald-400">Daily</div>
            <div className="text-xs text-slate-400 font-sans mt-0.5">UPI & Cash Payouts</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xs text-left">
            <div className="text-xl font-black font-mono text-amber-400">2% – 4%</div>
            <div className="text-xs text-slate-400 font-sans mt-0.5">Fuel Cost Savings</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-xs text-left">
            <div className="text-xl font-black font-mono text-indigo-400">100%</div>
            <div className="text-xs text-slate-400 font-sans mt-0.5">Automated Driver Payroll</div>
          </div>
        </div>
      </section>

      {/* INTERACTIVE UI PREVIEW SHOWCASE */}
      <section id="preview" className="relative z-10 py-16 bg-slate-900/40 border-y border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-10">
            <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-violet-400 mb-2">
              <Monitor className="w-3.5 h-3.5" />
              <span>Real Platform Interface</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Designed for High-Speed Bus Fleet Control
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              Explore actual screenshots of the Tranzit operator console built for daily operations, ticket earnings, and route telematics.
            </p>
          </div>

          {/* Screenshot Switcher Tabs */}
          <div className="flex justify-center mb-8">
            <div className="p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl inline-flex space-x-2">
              <button
                onClick={() => setActiveShot('overview')}
                className={`px-4 sm:px-6 py-2.5 text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer ${
                  activeShot === 'overview'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Executive Overview
              </button>
              <button
                onClick={() => setActiveShot('fleet')}
                className={`px-4 sm:px-6 py-2.5 text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer ${
                  activeShot === 'fleet'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Fleet Telematics
              </button>
              <button
                onClick={() => setActiveShot('earnings')}
                className={`px-4 sm:px-6 py-2.5 text-xs font-mono font-bold uppercase rounded-xl transition-all cursor-pointer ${
                  activeShot === 'earnings'
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                3. Daily Earnings
              </button>
            </div>
          </div>

          {/* Browser Mockup Frame */}
          <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-900 shadow-2xl shadow-violet-950/50">
            {/* Mockup Top Header */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <div className="px-4 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                https://tranzit.in/operator/dashboard
              </div>
              <div className="w-12" />
            </div>

            {/* Screenshot Display */}
            <div className="relative aspect-video bg-slate-950 overflow-hidden">
              <img
                src={
                  activeShot === 'overview'
                    ? '/screenshots/overview.png'
                    : activeShot === 'fleet'
                    ? '/screenshots/fleet.png'
                    : '/screenshots/earnings.png'
                }
                alt={`Tranzit ${activeShot} screenshot`}
                className="w-full h-full object-cover object-top transition-all duration-300"
              />
            </div>
          </div>

        </div>
      </section>

      {/* CORE IDEAS & VALUE FEATURES SECTION */}
      <section id="features" className="relative z-10 py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-violet-400 mb-2">
            <Zap className="w-3.5 h-3.5" />
            <span>Built From Ground-Up For Bus Operators</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Everything Your Fleet Needs To Run Profitably
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            A comprehensive operating system covering ticketing, daily payouts, driver payroll, partnered maintenance, and fuel savings.
          </p>
        </div>

        {/* Feature Tabs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Navigation Column */}
          <div className="lg:col-span-5 space-y-3">
            {features.map((feat, idx) => {
              const IconComponent = feat.icon;
              const isActive = activeFeature === idx;
              return (
                <button
                  key={feat.id}
                  onClick={() => setActiveFeature(idx)}
                  className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-start space-x-4 ${
                    isActive
                      ? 'bg-violet-950/60 border-violet-500/80 text-white shadow-lg shadow-violet-900/20 ring-1 ring-violet-500/40'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-900/80 hover:text-slate-200'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isActive ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase tracking-wider text-violet-400">
                        {feat.badge}
                      </span>
                      {isActive && <ChevronRight className="w-4 h-4 text-violet-400" />}
                    </div>
                    <h3 className="text-sm font-bold text-white mt-1 font-sans">
                      {feat.title}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Active Feature Detail Card */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <span className="px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 font-mono text-xs font-bold rounded-full uppercase">
                {features[activeFeature].badge}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Core Module {activeFeature + 1} of 5
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white mt-4 tracking-tight">
              {features[activeFeature].title}
            </h3>

            <p className="text-xs sm:text-sm text-slate-300 mt-2 font-sans leading-relaxed">
              {features[activeFeature].tagline}
            </p>

            <div className="mt-6 space-y-3">
              {features[activeFeature].bullets.map((bullet, bIdx) => (
                <div key={bIdx} className="flex items-start space-x-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800/60">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-slate-300 font-sans leading-relaxed">
                    {bullet}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-gradient-to-r from-violet-950/80 to-indigo-950/80 border border-violet-500/30 rounded-2xl flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-violet-400 shrink-0" />
              <p className="text-xs font-mono font-bold text-violet-200">
                {features[activeFeature].highlight}
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* SUBSCRIPTION PLANS SECTION */}
      <section id="pricing" className="relative z-10 py-16 sm:py-24 bg-slate-900/30 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-violet-400 mb-2">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Transparent SaaS Pricing</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Simple Monthly Subscription Paid By Bus Owners
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-2">
              No hidden surprise commissions. Pay a predictable per-bus monthly rate for software with unlimited route usage.
            </p>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {PLAN_TIERS.map((tier) => {
              const ratePerBus = getRateForTier(tier.id, DEFAULT_TIER_PRICING);

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col justify-between rounded-3xl border p-6 sm:p-8 transition-all bg-slate-900/90 shadow-xl ${
                    tier.isPopular
                      ? 'border-violet-500 ring-2 ring-violet-500/30 shadow-violet-950/50'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-white tracking-tight">
                        {tier.name}
                      </h3>
                      {tier.isPopular && (
                        <span className="px-3 py-1 bg-violet-600 text-white font-mono text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-400 font-sans min-h-[36px] leading-relaxed">
                      {tier.tagline}
                    </p>

                    {/* Price Display */}
                    <div className="mt-6 p-4 bg-slate-950 rounded-2xl border border-slate-800">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        {tier.busRangeLabel}
                      </div>
                      <div className="flex items-baseline space-x-2 mt-1">
                        <span className="text-3xl font-black font-mono text-white">
                          ₹{ratePerBus.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-mono text-slate-400">
                          / bus / month
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="mt-6 space-y-2.5">
                      {tier.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start space-x-2.5 text-xs text-slate-300 font-sans">
                          <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-8 pt-4 border-t border-slate-800">
                    <button
                      onClick={onNavigateToAuth}
                      className={`w-full py-3 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                        tier.isPopular
                          ? 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-lg shadow-violet-600/30'
                          : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                      }`}
                    >
                      <span>Choose {tier.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* INTERACTIVE FLEET CALCULATOR SECTION */}
      <section id="calculator" className="relative z-10 py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 via-violet-950/40 to-slate-900 border border-violet-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl">

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-violet-400 mb-2">
                  <Calculator className="w-4 h-4" />
                  <span>Interactive Subscription Estimator</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Calculate Cost For Your Bus Fleet
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Adjust the slider to match your exact fleet size and view transparent monthly software pricing.
                </p>
              </div>

              {/* Slider */}
              <div className="space-y-3 bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-400 font-bold uppercase">Enrolled Buses:</span>
                  <span className="text-xl font-black text-violet-400">{calcBuses} Buses</span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={50}
                  value={calcBuses}
                  onChange={(e) => setCalcBuses(Number(e.target.value))}
                  className="w-full accent-violet-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>1 Bus</span>
                  <span>10 Buses</span>
                  <span>25 Buses</span>
                  <span>50+ Buses</span>
                </div>
              </div>

              {/* Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                {[3, 5, 10, 15, 25, 40].map((num) => (
                  <button
                    key={num}
                    onClick={() => setCalcBuses(num)}
                    className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                      calcBuses === num
                        ? 'bg-violet-600 text-white border-violet-500 shadow-md'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {num} Buses
                  </button>
                ))}
              </div>
            </div>

            {/* Right Summary Card */}
            <div className="lg:col-span-6 bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">

              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-mono text-slate-500 uppercase">Matched Tier</div>
                  <div className="text-xl font-black text-white font-sans">{matchingTier.name} Plan</div>
                </div>
                <span className="px-3 py-1 bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-mono font-bold rounded-full">
                  {matchingTier.busRangeLabel}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Software Rate per Bus:</span>
                  <span className="text-white font-bold">₹{matchingRate.toLocaleString('en-IN')}/mo</span>
                </div>

                <div className="flex justify-between text-xs font-mono">
                  <span className="text-slate-400">Total Enrolled Fleet:</span>
                  <span className="text-white font-bold">{calcBuses} {calcBuses === 1 ? 'Bus' : 'Buses'}</span>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-baseline">
                  <span className="text-xs font-mono uppercase text-slate-400 font-bold">Estimated Monthly Total:</span>
                  <span className="text-3xl font-black font-mono text-violet-400">
                    ₹{(calcBuses * matchingRate).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <button
                onClick={onNavigateToAuth}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-2xl shadow-xl shadow-violet-600/30 transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Enroll {calcBuses} Buses Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </div>

          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-12 bg-slate-950 border-t border-slate-800 text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">

          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-tr from-violet-600 to-indigo-500 text-white flex items-center justify-center font-black text-sm rounded-lg">
              TZ
            </div>
            <span className="font-bold text-white text-sm">Tranzit Operating System</span>
          </div>

          <p className="text-xs text-slate-500 font-mono text-center">
            © {new Date().getFullYear()} Tranzit Fleet Platform. Built for private bus operators across India.
          </p>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <button onClick={onNavigateToAuth} className="hover:text-violet-400 transition-colors cursor-pointer">
              Sign In
            </button>
            <span>•</span>
            <button onClick={onNavigateToAuth} className="hover:text-violet-400 transition-colors cursor-pointer">
              Register Fleet
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
};
