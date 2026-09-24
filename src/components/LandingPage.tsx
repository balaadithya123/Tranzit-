import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bus,
  ArrowRight,
  CheckCircle2,
  XCircle,
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
  ChevronDown,
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
  Monitor,
  Building2,
  Ticket,
  BarChart3,
  HelpCircle
} from 'lucide-react';
import { PLAN_TIERS, DEFAULT_TIER_PRICING, getMatchingTier, getRateForTier } from '../lib/pricingService';
import { formatINR } from '../lib/utils';

interface LandingPageProps {
  onNavigateToAuth: () => void;
  onNavigateToDemo?: (demoType: 'SaaS' | 'Lease') => void;
}

const fadeInVariants = {
  hidden: { opacity: 0, y: 25 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      delay: custom * 0.1,
      ease: [0.21, 0.47, 0.32, 0.98]
    }
  })
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12
    }
  }
};

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

  // FAQ Accordion state
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

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

  const faqList = [
    {
      question: 'What is Tranzit Fleet OS?',
      answer: 'Tranzit is an end-to-end cloud Operating System designed specifically for private bus operators in India. It manages digital ticketing, dynamic fare rules, daily conductor cash reconciliations, driver payroll, partnered vehicle servicing, and fleet fuel discount management.'
    },
    {
      question: 'How do daily payouts work for ticket revenue?',
      answer: 'All passenger payments collected via UPI, debit/credit cards, and digital ticketing pass through automated daily settlement routines. Earnings are directly credited to the fleet owner’s bank account every 24 hours without hidden transaction holds.'
    },
    {
      question: 'Is there any commission taken per ticket?',
      answer: 'No! Unlike traditional booking aggregators that take 10-20% per ticket, Tranzit operates on a pure SaaS subscription. You pay a simple, predictable monthly fee per bus (starting at ₹649/bus/mo) and keep 100% of your route ticket revenues.'
    },
    {
      question: 'Can I track conductor cash collections and avoid revenue leakage?',
      answer: 'Yes. Conductors enter daily route ticket batches on handheld ETMs or mobile phones. Tranzit automatically reconciles distance, seat count, and passenger fare totals to ensure zero cash leakage at end-of-shift handovers.'
    },
    {
      question: 'How do the fuel discounts work?',
      answer: 'Tranzit has partner tie-ups with leading fuel pump networks and local depots across major highway corridors. Enrolled buses receive integrated fuel RFID / QR passes that unlock 2% to 4% direct discounts on diesel reloads.'
    },
    {
      question: 'Can I request a demo or try Tranzit before subscribing?',
      answer: 'Absolutely. You can click "Explore Live Demo" above to immediately access a fully interactive demo environment with real route telematics and revenue analytics, no credit card required.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-slate-900 selection:text-white transition-colors antialiased overflow-x-hidden">

      {/* TOP NAVIGATION HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/90 border-b border-slate-200/80 transition-all shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">

          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-slate-900 text-white flex items-center justify-center font-black text-lg rounded-xl shadow-sm border border-slate-800">
              TZ
            </div>
            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-xl tracking-tight text-slate-900 font-sans">
                  Tranzit
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200 rounded-full uppercase">
                  Fleet OS
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium hidden sm:inline">
                Operating System for Bus Operators
              </span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-slate-600 tracking-wide uppercase">
            <a href="#features" className="hover:text-slate-900 transition-colors">Key Features</a>
            <a href="#preview" className="hover:text-slate-900 transition-colors">UI Preview</a>
            <a href="#why-tranzit" className="hover:text-slate-900 transition-colors">Why Tranzit</a>
            <a href="#calculator" className="hover:text-slate-900 transition-colors">Fleet Calculator</a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>

          {/* CTA Actions */}
          <div className="flex items-center space-x-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={onNavigateToAuth}
              className="px-4 sm:px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 border border-slate-200 rounded-xl transition-all cursor-pointer"
            >
              Sign In
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onNavigateToAuth}
              className="px-4 sm:px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center space-x-2 cursor-pointer"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">

        {/* Ambient background glow */}
        <div className="absolute inset-0 top-0 -z-10 flex justify-center pointer-events-none">
          <div className="w-[600px] h-[350px] bg-gradient-to-tr from-sky-200/40 via-amber-100/30 to-indigo-200/40 blur-3xl rounded-full opacity-70" />
        </div>

        {/* Top Tagline Badge */}
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-sm text-slate-700 text-xs font-medium mb-6"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Next-Gen Bus Operator SaaS & Fleet Management</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto font-sans"
        >
          Ride Smart. Ryde Alryde. <br />
          <span className="text-slate-800 underline decoration-slate-300 decoration-wavy underline-offset-8">
            Empowering Private Bus Owners.
          </span>
        </motion.h1>

        {/* Hero Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto font-sans leading-relaxed"
        >
          Predictable monthly SaaS subscription for software. Automate ticket fares, get direct daily earnings via UPI/Card, manage driver payroll, access partnered local service maintenance, and unlock up to 4% fuel discounts.
        </motion.p>

        {/* Hero CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={onNavigateToAuth}
            className="px-8 py-4 text-xs sm:text-sm font-semibold uppercase tracking-wider text-white bg-slate-900 hover:bg-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center space-x-2 cursor-pointer group"
          >
            <span>Start Free Fleet Setup</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </motion.button>

          {onNavigateToDemo && (
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigateToDemo('SaaS')}
              className="px-7 py-4 text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-2xl shadow-sm hover:shadow transition-all flex items-center space-x-2 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-slate-900 fill-slate-900" />
              <span>Explore Live Demo</span>
            </motion.button>
          )}
        </motion.div>

        {/* Verified Stripe-style pill badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-6 inline-flex items-center space-x-2 text-xs text-slate-500 font-medium"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Verified Fleet OS Platform • Free setup for up to 30 days. No credit card needed.</span>
        </motion.div>

        {/* Key Highlight Pills / Stats */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={staggerContainer}
          className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-8 border-t border-slate-200/80"
        >
          <motion.div variants={fadeInVariants} whileHover={{ y: -3 }} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
            <div className="text-2xl font-black font-mono text-slate-900">₹649</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Starting SaaS Fee/Bus/Mo</div>
          </motion.div>
          <motion.div variants={fadeInVariants} whileHover={{ y: -3 }} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
            <div className="text-2xl font-black font-mono text-emerald-600">Daily</div>
            <div className="text-xs text-slate-500 font-medium mt-1">UPI & Cash Payouts</div>
          </motion.div>
          <motion.div variants={fadeInVariants} whileHover={{ y: -3 }} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
            <div className="text-2xl font-black font-mono text-slate-900">2% – 4%</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Fuel Cost Savings</div>
          </motion.div>
          <motion.div variants={fadeInVariants} whileHover={{ y: -3 }} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm text-left">
            <div className="text-2xl font-black font-mono text-slate-900">100%</div>
            <div className="text-xs text-slate-500 font-medium mt-1">Automated Driver Payroll</div>
          </motion.div>
        </motion.div>

        {/* Trust Logo Strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-14 max-w-5xl mx-auto"
        >
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest mb-6">
            TRUSTED BY OPERATORS & INTEGRATED WITH LEADING PLATFORMS
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-80 hover:opacity-100 transition-all">
            <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm hover:scale-105 transition-transform">
              <Fuel className="w-4 h-4 text-amber-600" />
              <span>FuelDepot Pass</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm hover:scale-105 transition-transform">
              <CreditCard className="w-4 h-4 text-indigo-600" />
              <span>Fleet Fastag</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm hover:scale-105 transition-transform">
              <Zap className="w-4 h-4 text-emerald-600" />
              <span>UPI Instant Pay</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm hover:scale-105 transition-transform">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>Permit Check</span>
            </div>
            <div className="flex items-center space-x-2 text-slate-700 font-bold text-sm hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4 text-slate-800" />
              <span>Partner Workshops</span>
            </div>
          </div>
        </motion.div>

      </section>

      {/* INTERACTIVE UI PREVIEW SHOWCASE */}
      <section id="preview" className="relative z-10 py-16 bg-slate-100/70 border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-10"
          >
            <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-slate-600 mb-2">
              <Monitor className="w-3.5 h-3.5" />
              <span>Real Platform Interface</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-sans">
              Designed for High-Speed Bus Fleet Control
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Explore actual screenshots of the Tranzit operator console built for daily operations, ticket earnings, and route telematics.
            </p>
          </motion.div>

          {/* Screenshot Switcher Tabs */}
          <div className="flex justify-center mb-8">
            <div className="p-1.5 bg-white border border-slate-200 rounded-2xl inline-flex space-x-2 shadow-sm">
              {(['overview', 'fleet', 'earnings'] as const).map((shotKey, idx) => {
                const labels = ['1. Executive Overview', '2. Fleet Telematics', '3. Daily Earnings'];
                return (
                  <button
                    key={shotKey}
                    onClick={() => setActiveShot(shotKey)}
                    className={`px-4 sm:px-6 py-2.5 text-xs font-bold uppercase rounded-xl transition-all cursor-pointer relative ${
                      activeShot === shotKey
                        ? 'bg-slate-900 text-white shadow'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {labels[idx]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Browser Mockup Frame */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.6 }}
            className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden border border-slate-300 bg-white shadow-2xl shadow-slate-300/60"
          >
            {/* Mockup Top Header */}
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
              </div>
              <div className="px-4 py-1 rounded-lg bg-white border border-slate-200 text-[11px] font-mono text-slate-600 shadow-xs">
                https://tranzit.in/operator/dashboard
              </div>
              <div className="w-12" />
            </div>

            {/* Screenshot Display with AnimatePresence */}
            <div className="relative aspect-video bg-slate-900 overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeShot}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={
                    activeShot === 'overview'
                      ? '/screenshots/overview.png'
                      : activeShot === 'fleet'
                      ? '/screenshots/fleet.png'
                      : '/screenshots/earnings.png'
                  }
                  alt={`Tranzit ${activeShot} screenshot`}
                  className="w-full h-full object-cover object-top"
                />
              </AnimatePresence>
            </div>
          </motion.div>

        </div>
      </section>

      {/* CORE FEATURES SECTION ("One platform for everything you sell") */}
      <section id="features" className="relative z-10 py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-3xl mx-auto mb-12 sm:mb-16"
        >
          <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-slate-600 mb-2">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Built From Ground-Up For Bus Operators</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-sans">
            One platform for everything you manage
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-3 max-w-xl mx-auto">
            Stop juggling ticketing machines, fuel receipts, conductor registers, and service logs. Run your entire bus fleet from one place.
          </p>
        </motion.div>

        {/* Feature Tabs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Navigation Column */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="lg:col-span-5 space-y-3"
          >
            {features.map((feat, idx) => {
              const IconComponent = feat.icon;
              const isActive = activeFeature === idx;
              return (
                <motion.button
                  key={feat.id}
                  variants={fadeInVariants}
                  whileHover={{ x: 4 }}
                  onClick={() => setActiveFeature(idx)}
                  className={`w-full p-4 rounded-2xl text-left border transition-all cursor-pointer flex items-start space-x-4 ${
                    isActive
                      ? 'bg-white border-slate-900 text-slate-900 shadow-md ring-1 ring-slate-900/10'
                      : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <div className={`p-2.5 rounded-xl ${isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-500">
                        {feat.badge}
                      </span>
                      {isActive && <ChevronRight className="w-4 h-4 text-slate-900" />}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1 font-sans">
                      {feat.title}
                    </h3>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>

          {/* Active Feature Detail Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl relative"
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
              >
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <span className="px-3 py-1 bg-slate-100 text-slate-800 border border-slate-200 font-mono text-xs font-bold rounded-full uppercase">
                    {features[activeFeature].badge}
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Core Module {activeFeature + 1} of 5
                  </span>
                </div>

                <h3 className="text-2xl font-black text-slate-900 mt-5 tracking-tight font-sans">
                  {features[activeFeature].title}
                </h3>

                <p className="text-sm text-slate-600 mt-2 font-sans leading-relaxed">
                  {features[activeFeature].tagline}
                </p>

                <div className="mt-6 space-y-3">
                  {features[activeFeature].bullets.map((bullet, bIdx) => (
                    <motion.div
                      key={bIdx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: bIdx * 0.08 }}
                      className="flex items-start space-x-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-700 font-sans leading-relaxed">
                        {bullet}
                      </span>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-slate-900 text-white rounded-2xl flex items-center space-x-3 shadow-sm">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <p className="text-xs font-medium text-slate-200">
                    {features[activeFeature].highlight}
                  </p>
                </div>
              </motion.div>
            </AnimatePresence>
          </motion.div>

        </div>
      </section>

      {/* WHY TRANZIT IS DIFFERENT (Comparison Block) */}
      <section id="why-tranzit" className="relative z-10 py-16 sm:py-24 bg-slate-100/70 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-sans">
              Why Tranzit is different
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-3">
              Other tools stop at basic GPS. Tranzit Fleet OS adapts to what you actually run, with automated dynamic fares, conductor cash checks, fuel tie-ups, and daily settlements built in.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch max-w-5xl mx-auto">

            {/* Traditional Manual Approach */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
            >
              <div>
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-2">
                  WHAT YOU'VE BEEN USING
                </div>
                <h3 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
                  <span>Paper Registers & Basic GPS</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Manual calculations, delayed cash accounting, and fragmented receipts.
                </p>

                <div className="mt-6 space-y-3.5">
                  {[
                    'Manual paper registers prone to conductor revenue leakage',
                    'Delayed ticket payouts held by third-party booking agents',
                    'Zero dynamic demand fare optimization for weekend surges',
                    'Manual fuel bill filing and zero pump discount agreements',
                    'Unexpected roadside breakdowns due to missed service schedules'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Tranzit Fleet OS */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5 }}
              whileHover={{ y: -4 }}
              className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 flex flex-col justify-between shadow-xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Bus className="w-48 h-48" />
              </div>
              <div className="relative z-10">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400 mb-2">
                  WHAT YOU'VE BEEN MISSING
                </div>
                <h3 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span>Tranzit Fleet OS</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Custom bus operating system that automates ticket sales and profits.
                </p>

                <div className="mt-6 space-y-3.5">
                  {[
                    'Direct daily UPI & Cash payout settlements to owner accounts',
                    'Dynamic kilometric fare calculation Engine with peak weekend rates',
                    'Driver & conductor monthly payroll, rosters, and shift schedules',
                    'Integrated FuelDepot pass offering 2% - 4% instant fuel discounts',
                    'Partnered local certified service center audits and one-click maintenance'
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start space-x-3">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-xs text-slate-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

          </div>

        </div>
      </section>

      {/* INTERACTIVE FLEET CALCULATOR SECTION */}
      <section id="calculator" className="relative z-10 py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.6 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-10 shadow-xl"
        >

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">

            {/* Left Controls */}
            <div className="lg:col-span-6 space-y-6">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-slate-600 mb-2">
                  <Calculator className="w-4 h-4 text-slate-900" />
                  <span>Interactive Subscription Estimator</span>
                </div>
                <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight font-sans">
                  Calculate Cost For Your Bus Fleet
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Adjust the slider to match your exact fleet size and view transparent monthly software pricing.
                </p>
              </div>

              {/* Slider */}
              <div className="space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-slate-600 font-bold uppercase">Enrolled Buses:</span>
                  <span className="text-xl font-black text-slate-900">{calcBuses} Buses</span>
                </div>

                <input
                  type="range"
                  min={1}
                  max={50}
                  value={calcBuses}
                  onChange={(e) => setCalcBuses(Number(e.target.value))}
                  className="w-full accent-slate-900 h-2 bg-slate-200 rounded-lg cursor-pointer"
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
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    key={num}
                    onClick={() => setCalcBuses(num)}
                    className={`px-3.5 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer ${
                      calcBuses === num
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {num} Buses
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Right Summary Card */}
            <div className="lg:col-span-6 bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">

              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="text-[10px] font-mono text-slate-400 uppercase">Matched Tier</div>
                  <div className="text-xl font-black text-white font-sans">{matchingTier.name} Plan</div>
                </div>
                <span className="px-3 py-1 bg-white/10 text-white border border-white/20 text-xs font-mono font-bold rounded-full">
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
                  <span className="text-3xl font-black font-mono text-white">
                    ₹{(calcBuses * matchingRate).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNavigateToAuth}
                className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 text-xs font-bold uppercase tracking-wider rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
              >
                <span>Enroll {calcBuses} Buses Now</span>
                <ArrowRight className="w-4 h-4 text-slate-900" />
              </motion.button>

            </div>

          </div>

        </motion.div>
      </section>

      {/* SUBSCRIPTION PLANS SECTION */}
      <section id="pricing" className="relative z-10 py-16 sm:py-24 bg-slate-100/70 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.5 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-slate-600 mb-2">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Transparent SaaS Pricing</span>
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-sans">
              Transparent pricing with no hidden fees
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-2">
              Start selling on the free plan today, and move to a fixed monthly price when your sales grow.
            </p>
          </motion.div>

          {/* Pricing Cards Grid */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch"
          >
            {PLAN_TIERS.map((tier) => {
              const ratePerBus = getRateForTier(tier.id, DEFAULT_TIER_PRICING);

              return (
                <motion.div
                  key={tier.id}
                  variants={fadeInVariants}
                  whileHover={{ y: -6 }}
                  className={`relative flex flex-col justify-between rounded-3xl border p-6 sm:p-8 transition-all bg-white shadow-sm hover:shadow-xl ${
                    tier.isPopular
                      ? 'border-slate-900 ring-2 ring-slate-900 shadow-md'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                        {tier.name}
                      </h3>
                      {tier.isPopular && (
                        <span className="px-3 py-1 bg-slate-900 text-white font-mono text-[10px] font-bold rounded-full uppercase tracking-wider">
                          Most Popular
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 font-sans min-h-[36px] leading-relaxed">
                      {tier.tagline}
                    </p>

                    {/* Price Display */}
                    <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                        {tier.busRangeLabel}
                      </div>
                      <div className="flex items-baseline space-x-2 mt-1">
                        <span className="text-3xl font-black font-mono text-slate-900">
                          ₹{ratePerBus.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                          / bus / month
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    <ul className="mt-6 space-y-2.5">
                      {tier.features.map((feat, fIdx) => (
                        <li key={fIdx} className="flex items-start space-x-2.5 text-xs text-slate-700 font-sans">
                          <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-8 pt-4 border-t border-slate-100">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={onNavigateToAuth}
                      className={`w-full py-3 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                        tier.isPopular
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-200'
                      }`}
                    >
                      <span>Choose {tier.name}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS (FAQ) */}
      <section id="faq" className="relative z-10 py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center space-x-2 text-xs font-mono uppercase font-bold text-slate-600 mb-2">
            <HelpCircle className="w-4 h-4" />
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-sans">
            Frequently asked questions
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-2">
            Everything you need to know about setting up and running your fleet with Tranzit Operating System.
          </p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          variants={staggerContainer}
          className="space-y-4"
        >
          {faqList.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <motion.div
                key={idx}
                variants={fadeInVariants}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden transition-all shadow-xs hover:border-slate-300"
              >
                <button
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-slate-900 text-sm sm:text-base cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-100 font-sans leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </motion.div>
      </section>

      {/* BOTTOM BANNER CTA */}
      <section className="relative z-10 py-16 sm:py-20 bg-slate-900 text-white border-t border-slate-800 overflow-hidden">
        {/* Subtle decorative background shape */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-slate-800/40 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 relative z-10"
        >
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight font-sans">
            Start scaling your bus fleet in minutes
          </h2>
          <p className="text-xs sm:text-base text-slate-300 max-w-2xl mx-auto font-sans leading-relaxed">
            Create your fleet account, input your route distance rates, and start collecting daily UPI ticket payouts with zero commission loss.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onNavigateToAuth}
              className="px-8 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider bg-white hover:bg-slate-100 text-slate-900 rounded-2xl shadow-xl transition-all cursor-pointer flex items-center space-x-2"
            >
              <span>Start Free Setup Now</span>
              <ArrowRight className="w-4 h-4 text-slate-900" />
            </motion.button>

            {onNavigateToDemo && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onNavigateToDemo('SaaS')}
                className="px-7 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-2xl transition-all cursor-pointer flex items-center space-x-2"
              >
                <Play className="w-3.5 h-3.5 text-white fill-white" />
                <span>Book a Live Demo</span>
              </motion.button>
            )}
          </div>

          <p className="text-[11px] font-mono text-slate-400 pt-2">
            Free plan available • No hidden fees • Cancel anytime
          </p>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 py-16 bg-white border-t border-slate-200 text-slate-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 pb-12 border-b border-slate-200">

            {/* Col 1: Brand */}
            <div className="col-span-2 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-slate-900 text-white flex items-center justify-center font-black text-sm rounded-xl">
                  TZ
                </div>
                <span className="font-extrabold text-slate-900 text-lg tracking-tight">Tranzit Fleet OS</span>
              </div>
              <p className="text-xs text-slate-500 max-w-xs font-sans leading-relaxed">
                Modern cloud operating system for private bus operators. Automated dynamic fare engines, daily payouts, conductor cash tracking, driver payroll, and fuel discount passes.
              </p>
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>ISO 27001 Security Compliant</span>
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                Product
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 font-sans">
                <li><a href="#features" className="hover:text-slate-900">Dynamic Fares</a></li>
                <li><a href="#features" className="hover:text-slate-900">Daily Payouts</a></li>
                <li><a href="#features" className="hover:text-slate-900">Driver Roster</a></li>
                <li><a href="#features" className="hover:text-slate-900">Fleet Maintenance</a></li>
                <li><a href="#features" className="hover:text-slate-900">FuelDepot Pass</a></li>
              </ul>
            </div>

            {/* Col 3: Resources & Tools */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                Tools & Resources
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 font-sans">
                <li><a href="#calculator" className="hover:text-slate-900">Fleet Cost Estimator</a></li>
                <li><a href="#pricing" className="hover:text-slate-900">SaaS Tier Pricing</a></li>
                <li><a href="#preview" className="hover:text-slate-900">UI Showcase</a></li>
                <li><a href="#faq" className="hover:text-slate-900">Frequently Asked</a></li>
              </ul>
            </div>

            {/* Col 4: Company */}
            <div className="space-y-3">
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                Account
              </h4>
              <ul className="space-y-2 text-xs text-slate-600 font-sans">
                <li><button onClick={onNavigateToAuth} className="hover:text-slate-900 cursor-pointer">Sign In</button></li>
                <li><button onClick={onNavigateToAuth} className="hover:text-slate-900 cursor-pointer">Register Fleet</button></li>
                <li><button onClick={() => onNavigateToDemo?.('SaaS')} className="hover:text-slate-900 cursor-pointer">Live Demo</button></li>
              </ul>
            </div>

          </div>

          <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
            <p>© {new Date().getFullYear()} Tranzit Technologies. All rights reserved.</p>
            <p>Built for private bus operators across India.</p>
          </div>

        </div>
      </footer>

    </div>
  );
};
