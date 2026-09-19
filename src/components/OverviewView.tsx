import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, RouteItem, Driver, MaintenanceRecord, EarningsEntry } from '../types';
import { StatCard } from './StatCard';
import { FleetUtilizationChart } from './FleetUtilizationChart';
import { OwnerInsightsChat } from './OwnerInsightsChat';
import { EditProfileModal } from './EditProfileModal';
import { ReportsModal } from './ReportsModal';
import { CopyButton } from './CopyButton';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR, getServiceStatus, getLicenseValidityInfo } from '../lib/utils';
import { 
  Bus as BusIcon, 
  Wallet, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  MapPin, 
  Edit2, 
  ChevronRight, 
  ArrowRight, 
  BellRing, 
  Compass, 
  CheckCircle2, 
  UserCheck, 
  Download,
  Calendar,
  Search
} from 'lucide-react';

interface OverviewViewProps {
  owner: OwnerProfile;
  onNavigateTab: (tab: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ owner, onNavigateTab }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);
  const [routeSearch, setRouteSearch] = useState('');

  const isSaaS = owner.planType === 'SaaS';
  const currentHub = owner.city || "Bengaluru";

  // Real-time Firestore Listeners
  useEffect(() => {
    if (!owner.id) return;

    const busesQuery = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsubBuses = onSnapshot(busesQuery, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Bus));
      setBuses(list);
    });

    const routesQuery = query(collection(db, 'routes'), where('ownerId', '==', owner.id));
    const unsubRoutes = onSnapshot(routesQuery, (snapshot) => {
      const list: RouteItem[] = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as RouteItem));
      setRoutes(list);
    });

    const driversQuery = query(collection(db, 'drivers'), where('ownerId', '==', owner.id));
    const unsubDrivers = onSnapshot(driversQuery, (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as Driver));
      setDrivers(list);
    });

    const maintQuery = query(collection(db, 'maintenance'), where('ownerId', '==', owner.id));
    const unsubMaint = onSnapshot(maintQuery, (snapshot) => {
      const list: MaintenanceRecord[] = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as MaintenanceRecord));
      setMaintenance(list);
    });

    const earningsQuery = query(collection(db, 'earnings'), where('ownerId', '==', owner.id));
    const unsubEarnings = onSnapshot(earningsQuery, (snapshot) => {
      const list: EarningsEntry[] = [];
      snapshot.forEach((doc) => list.push({ id: doc.id, ...doc.data() } as EarningsEntry));
      setEarnings(list);
    });

    return () => {
      unsubBuses();
      unsubRoutes();
      unsubDrivers();
      unsubMaint();
      unsubEarnings();
    };
  }, [owner.id]);

  // Derived Fleet Metrics
  const totalBusesCount = buses.length > 0 ? buses.length : (owner.activeBusesCount ?? 0);
  const activeBusesCount = buses.length > 0 
    ? buses.filter(b => b.status === 'Active').length 
    : (owner.activeBusesCount ?? 0);

  // Maintenance Alerts
  const overdueBuses = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Overdue');
  const dueSoonBuses = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Due');
  const totalMaintenanceAlerts = overdueBuses.length + dueSoonBuses.length;

  // Driver License Expiry Alerts
  const urgentDrivers = drivers.filter(d => getLicenseValidityInfo(d.licenseExpiryDate).isUrgent);

  // Financial Calculations
  const saasFeePerBus = owner.saasFeePerBus || 4500;
  const totalMonthlySaasFee = saasFeePerBus * totalBusesCount;

  // Payout / Renewal Date Logic
  const getDaysUntilPayout = () => {
    if (!owner.nextPayoutDate) return null;
    const target = new Date(owner.nextPayoutDate);
    const today = new Date('2026-09-17');
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilPayout = getDaysUntilPayout();
  const isUpcomingPayoutOrRenewal = daysUntilPayout !== null && daysUntilPayout <= 7 && daysUntilPayout >= 0;

  // Filter routes based on search
  const filteredRoutes = routes.filter(r => 
    r.routeName.toLowerCase().includes(routeSearch.toLowerCase()) ||
    String(r.distanceKm).includes(routeSearch)
  );

  const displayRoutes = filteredRoutes;

  const todayDateStr = new Date('2026-09-17').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <div className="space-y-6">
      {/* 1. Executive Operations Briefing Bar */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5">
            <span className="font-bold text-slate-900 dark:text-neutral-100">Overview</span>
            <span>•</span>
            <span>{todayDateStr}</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight font-sans">
            {owner.companyName || owner.name}
          </h2>

          <div className="flex flex-wrap items-center gap-2 mt-2.5 text-xs text-slate-600 dark:text-neutral-400">
            <div className="inline-flex items-center space-x-1.5 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 px-2.5 py-1 rounded-lg font-mono">
              <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Hub: <strong className="text-slate-900 dark:text-neutral-100">{currentHub}</strong></span>
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-slate-400 hover:text-slate-900 dark:hover:text-neutral-100 ml-1 cursor-pointer"
                title="Change Hub City"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>

            <div className="inline-flex items-center space-x-1.5 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-mono text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{activeBusesCount}/{totalBusesCount} active buses</span>
            </div>

            <div className="inline-flex items-center space-x-1.5 bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-800 px-2.5 py-1 rounded-lg font-mono text-[11px]">
              <UserCheck className="w-3 h-3 text-slate-500 dark:text-neutral-400" />
              <span>{drivers.length} Drivers</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto">
          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs whitespace-nowrap border border-slate-700 dark:border-neutral-700"
            title="Download Monthly Operations PDF Report"
          >
            <Download className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Payout & Renewal Reminder Banner (Within 7 Days) */}
      {isUpcomingPayoutOrRenewal && (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
          isSaaS 
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-100' 
            : 'bg-teal-50 dark:bg-teal-950/30 border-teal-300 dark:border-teal-800/60 text-teal-950 dark:text-teal-100'
        }`}>
          <div className="flex items-start sm:items-center space-x-3">
            <div className={`p-2 rounded-lg flex-shrink-0 ${isSaaS ? 'bg-amber-600 text-white' : 'bg-teal-600 text-white'}`}>
              <BellRing className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 font-mono text-[10px] font-bold rounded uppercase border ${
                  isSaaS ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700' : 'bg-teal-100 dark:bg-teal-900/60 text-teal-900 dark:text-teal-200 border-teal-300 dark:border-teal-700'
                }`}>
                  {isSaaS ? 'Renewal' : 'Payout Scheduled'}
                </span>
                <span className="font-mono text-xs font-bold">
                  {daysUntilPayout === 0 ? 'Due Today' : `In ${daysUntilPayout}d`} ({owner.nextPayoutDate})
                </span>
              </div>
              <p className="text-xs mt-1 leading-relaxed">
                {isSaaS 
                  ? `Monthly subscription fee: ${formatINR(totalMonthlySaasFee)} (${totalBusesCount} buses × ₹${saasFeePerBus.toLocaleString('en-IN')}) due on ${owner.nextPayoutDate || 'Not scheduled yet'}.`
                  : `Guaranteed lease payout: ${formatINR(owner.nextPayoutAmount || 0)} on ${owner.nextPayoutDate || 'Not scheduled yet'}.`
                }
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab(isSaaS ? 'earnings' : 'lease')}
            className={`px-3.5 py-2 font-mono text-xs font-bold uppercase rounded-lg transition-colors whitespace-nowrap self-start sm:self-auto cursor-pointer flex items-center space-x-1.5 shadow-2xs ${
              isSaaS 
                ? 'bg-amber-900 dark:bg-amber-600 hover:bg-slate-900 text-white' 
                : 'bg-teal-900 dark:bg-teal-600 hover:bg-slate-900 text-white'
            }`}
          >
            <span>{isSaaS ? 'View Earnings' : 'View Lease'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Primary KPI Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Fleet Scale */}
        <StatCard
          label="Active Buses"
          value={`${activeBusesCount} / ${totalBusesCount}`}
          subtext={totalBusesCount === 0 ? "No buses enrolled" : `${Math.round((activeBusesCount / totalBusesCount) * 100)}% in service`}
          icon={BusIcon}
          badgeText={totalMaintenanceAlerts > 0 ? `${totalMaintenanceAlerts} alert` : totalBusesCount === 0 ? "No Fleet" : "Ready"}
          accentColor="amber"
        />

        {/* Metric 2: Commercial Collections */}
        {isSaaS ? (
          <StatCard
            label="Today's Collections"
            value={formatINR(owner.todayRevenue || 0)}
            subtext={owner.todayRevenue ? "Active routes" : "No collections yet"}
            icon={TrendingUp}
            badgeText={owner.todayRevenue ? "+12.4%" : "₹0"}
            accentColor="amber"
          />
        ) : (
          <StatCard
            label="Monthly Lease"
            value={formatINR(owner.nextPayoutAmount || 0)}
            subtext={`Fixed (${totalBusesCount} buses)`}
            icon={Wallet}
            badgeText={owner.nextPayoutAmount ? "Guaranteed" : "Fixed"}
            accentColor="teal"
          />
        )}

        {/* Metric 3: Commercial Balance / Payout */}
        {isSaaS ? (
          <StatCard
            label="Wallet Balance"
            value={formatINR(owner.walletBalance || 0)}
            subtext={owner.nextPayoutDate ? `Payout: ${owner.nextPayoutDate}` : 'Not scheduled yet'}
            icon={Wallet}
            badgeText={owner.walletBalance ? "Available" : "₹0"}
            accentColor="amber"
          />
        ) : (
          <StatCard
            label="Payout Date"
            value={owner.nextPayoutDate || 'Not scheduled yet'}
            subtext={daysUntilPayout !== null ? `In ${daysUntilPayout} days` : 'Not scheduled yet'}
            icon={Calendar}
            badgeText={owner.nextPayoutDate ? "Fixed" : "Pending"}
            accentColor="teal"
          />
        )}

        {/* Metric 4: Passenger Footfall */}
        <StatCard
          label="Daily Riders"
          value={(owner.avgDailyRiders || 0).toLocaleString('en-IN')}
          subtext={owner.avgDailyRiders ? "Passenger volume" : "No riders logged"}
          icon={Users}
          badgeText={owner.avgDailyRiders ? "+8.2%" : "0"}
          accentColor="amber"
        />
      </div>

      {/* 3. Operational Critical Attention Radar */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 rounded-xl shadow-xs transition-colors">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <AlertTriangle className={`w-4 h-4 ${
              totalMaintenanceAlerts > 0 || urgentDrivers.length > 0 
                ? 'text-amber-600 dark:text-amber-400' 
                : 'text-emerald-600 dark:text-emerald-400'
            }`} />
            <h3 className="text-xs font-mono font-extrabold uppercase text-slate-900 dark:text-neutral-100 tracking-wider">
              Fleet Alerts
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
            {totalMaintenanceAlerts + urgentDrivers.length + (isUpcomingPayoutOrRenewal ? 1 : 0)} Active
          </span>
        </div>

        {totalMaintenanceAlerts === 0 && urgentDrivers.length === 0 && !isUpcomingPayoutOrRenewal ? (
          <div className="py-6 flex items-center justify-center space-x-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-mono font-bold">
              All clear — nothing needs attention
            </span>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800 mt-1">
            {/* Maintenance Overdue */}
            {overdueBuses.map((bus) => (
              <div key={bus.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="px-1.5 py-0.5 bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20 font-mono text-[10px] font-bold rounded uppercase">
                    Overdue
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-neutral-100">{bus.regNumber}</span>
                  <CopyButton textToCopy={bus.regNumber} label={bus.regNumber} />
                  <span className="text-slate-500 dark:text-neutral-400">({bus.model})</span>
                  <span className="text-slate-400 dark:text-neutral-500">• Due: {bus.nextServiceDue}</span>
                </div>
                <button
                  onClick={() => onNavigateTab('fleet')}
                  className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <span>Log Service</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Maintenance Due Soon */}
            {dueSoonBuses.map((bus) => (
              <div key={bus.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 font-mono text-[10px] font-bold rounded uppercase">
                    Due Soon
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-neutral-100">{bus.regNumber}</span>
                  <CopyButton textToCopy={bus.regNumber} label={bus.regNumber} />
                  <span className="text-slate-500 dark:text-neutral-400">({bus.model})</span>
                  <span className="text-slate-400 dark:text-neutral-500">• Due: {bus.nextServiceDue}</span>
                </div>
                <button
                  onClick={() => onNavigateTab('fleet')}
                  className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white hover:underline cursor-pointer"
                >
                  <span>Log Service</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* Driver License Alerts */}
            {urgentDrivers.map((driver) => {
              const validity = getLicenseValidityInfo(driver.licenseExpiryDate);
              return (
                <div key={driver.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-1.5 py-0.5 font-mono text-[10px] font-bold rounded uppercase border ${
                      validity.status === 'Expired'
                        ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
                        : 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20'
                    }`}>
                      {validity.status === 'Expired' ? 'Expired' : 'Renewal Due'}
                    </span>
                    <span className="font-bold text-slate-900 dark:text-neutral-100">{driver.name}</span>
                    <span className="font-mono text-slate-500 dark:text-neutral-400">DL: {driver.licenseNumber}</span>
                    <CopyButton textToCopy={driver.licenseNumber} label={driver.licenseNumber} />
                    <span className="text-slate-400 dark:text-neutral-500">• {validity.label}</span>
                  </div>
                  <button
                    onClick={() => onNavigateTab('drivers')}
                    className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                  >
                    <span>Update License</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              );
            })}

            {/* Payout & Renewal Action Item */}
            {isUpcomingPayoutOrRenewal && (
              <div className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-2.5">
                  <span className={`px-1.5 py-0.5 font-mono text-[10px] font-bold rounded uppercase border ${
                    isSaaS ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20' : 'bg-teal-500/10 text-teal-800 dark:text-teal-300 border-teal-500/20'
                  }`}>
                    {isSaaS ? 'Renewal' : 'Payout'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-neutral-100">
                    {isSaaS ? `Monthly Subscription (${formatINR(totalMonthlySaasFee)})` : `Monthly Payout (${formatINR(owner.nextPayoutAmount || 0)})`}
                  </span>
                  <span className="text-slate-400 dark:text-neutral-500">
                    • {daysUntilPayout === 0 ? 'Due Today' : `Due in ${daysUntilPayout}d`} ({owner.nextPayoutDate})
                  </span>
                </div>
                <button
                  onClick={() => onNavigateTab(isSaaS ? 'earnings' : 'lease')}
                  className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer"
                >
                  <span>{isSaaS ? 'View Earnings' : 'View Lease'}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Owner Insights Assistant (AI-powered plain-language fleet Q&A) */}
      <OwnerInsightsChat
        owner={owner}
        buses={buses}
        routes={routes}
        drivers={drivers}
        earnings={earnings}
        maintenance={maintenance}
      />

      {/* 5. Fleet Utilization Chart (7-Day Rolling Bar Chart) */}
      <FleetUtilizationChart
        buses={buses}
        totalBusesCount={totalBusesCount}
        activeBusesCount={activeBusesCount}
        planType={owner.planType}
        onNavigateTab={onNavigateTab}
      />

      {/* 6. Split Operational Intelligence: Hub Schedules & Plan Economics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Hub Depot Active Route Manifest (7 Cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 rounded-xl flex flex-col justify-between shadow-xs transition-colors">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 gap-2 mb-4">
              <div className="flex items-center space-x-2">
                <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h3 className="text-xs font-mono font-extrabold uppercase text-slate-900 dark:text-neutral-100 tracking-wider">
                  Routes ({currentHub})
                </h3>
              </div>

              {/* Route Search Filter to reduce friction */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400 dark:text-neutral-500" />
                <input
                  type="text"
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  placeholder="Filter routes..."
                  className="pl-8 pr-2.5 py-1 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-md text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {routes.length === 0 ? (
              <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-neutral-800 rounded-lg">
                <Compass className="w-8 h-8 text-slate-300 dark:text-neutral-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                  No routes found. Click &apos;Add New Route&apos; to configure your first route.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigateTab(isSaaS ? 'fares' : 'drivers')}
                  className="mt-3 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Add New Route
                </button>
              </div>
            ) : displayRoutes.length === 0 ? (
              <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-neutral-800 rounded-lg">
                <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                  No routes matching &quot;{routeSearch}&quot;
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {displayRoutes.slice(0, 4).map((route) => (
                  <div
                    key={route.id}
                    className="p-3 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900 dark:text-neutral-100 font-sans flex items-center space-x-2">
                        <span>{route.routeName}</span>
                        <CopyButton textToCopy={route.routeName} label={route.routeName} />
                        <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 bg-slate-200/60 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded border border-slate-300/40 dark:border-neutral-700">
                          {route.distanceKm} km
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                        {route.tripsPerDay} trips/day • ₹{route.fixedCharge} + ₹{route.ratePerKm}/km
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end">
                      <span className="font-mono font-bold text-sm text-slate-900 dark:text-neutral-100">
                        {formatINR(route.computedFare)}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">fare</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end">
            <button
              onClick={() => onNavigateTab(isSaaS ? 'fares' : 'drivers')}
              className="inline-flex items-center space-x-1 text-xs font-mono font-bold text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 uppercase cursor-pointer"
            >
              <span>{isSaaS ? 'Manage Routes' : 'View Drivers'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Column: Commercial Contract & Financial Overview (5 Cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 rounded-xl flex flex-col justify-between shadow-xs transition-colors">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center space-x-2">
                <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-mono font-extrabold uppercase text-slate-900 dark:text-neutral-100 tracking-wider">
                  Commercials
                </h3>
              </div>
            </div>

            {isSaaS ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <div className="text-[10px] font-mono uppercase font-bold text-amber-800 dark:text-amber-300">
                    Monthly Fee
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-900 dark:text-neutral-100 mt-0.5">
                    {formatINR(totalMonthlySaasFee)} / month
                  </div>
                  <p className="text-[11px] text-amber-900/80 dark:text-amber-300/80 font-mono mt-1 leading-tight">
                    ₹{saasFeePerBus.toLocaleString('en-IN')} × {totalBusesCount} buses
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-lg space-y-1.5">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500 dark:text-neutral-400">Collected Today:</span>
                    <span className="font-bold text-slate-900 dark:text-neutral-100">{formatINR(owner.todayRevenue || 0)}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500 dark:text-neutral-400">Wallet Balance:</span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">{formatINR(owner.walletBalance || 0)}</span>
                  </div>
                  <div className="flex justify-between font-mono pt-1 border-t border-slate-200 dark:border-neutral-800">
                    <span className="text-slate-500 dark:text-neutral-400">Next Payout:</span>
                    <span className="font-semibold text-slate-800 dark:text-neutral-200">{owner.nextPayoutDate || 'Not scheduled yet'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-teal-500/10 border border-teal-500/20 rounded-lg">
                  <div className="text-[10px] font-mono uppercase font-bold text-teal-800 dark:text-teal-300">
                    Monthly Lease Payout
                  </div>
                  <div className="text-lg font-mono font-bold text-slate-900 dark:text-neutral-100 mt-0.5">
                    {formatINR(owner.nextPayoutAmount || 0)} / month
                  </div>
                  <p className="text-[11px] text-teal-900/80 dark:text-teal-300/80 font-mono mt-1 leading-tight">
                    Fixed ({totalBusesCount} buses)
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 rounded-lg space-y-1.5">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500 dark:text-neutral-400">Next Payout:</span>
                    <span className="font-bold text-slate-900 dark:text-neutral-100">{owner.nextPayoutDate || 'Not scheduled yet'}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500 dark:text-neutral-400">Operations:</span>
                    <span className="font-semibold text-slate-700 dark:text-neutral-300">Managed by Tranzit</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-neutral-800">
            <button
              onClick={() => onNavigateTab(isSaaS ? 'earnings' : 'lease')}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-white font-mono font-bold text-xs uppercase rounded-lg transition-colors text-center cursor-pointer border border-slate-700 dark:border-neutral-700"
            >
              {isSaaS ? 'View Earnings' : 'View Lease'}
            </button>
          </div>
        </div>
      </div>

      {/* Edit Hub Modal */}
      <EditProfileModal
        owner={owner}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      {/* Monthly Reports Export Modal */}
      <ReportsModal
        owner={owner}
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
      />
    </div>
  );
};
