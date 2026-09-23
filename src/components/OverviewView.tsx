import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, RouteItem, Driver, MaintenanceRecord, EarningsEntry } from '../types';
import { StatCard } from './StatCard';
import { FleetUtilizationChart } from './FleetUtilizationChart';
import { OwnerInsightsChat } from './OwnerInsightsChat';
import { TelemetryInspectorModal } from './TelemetryInspectorModal';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR, getServiceStatus, getLicenseValidityInfo, computeWeekdayAnomaly } from '../lib/utils';
import { 
  Bus as BusIcon, 
  Wallet, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  MapPin, 
  ChevronRight, 
  ArrowUpRight,
  CheckCircle2, 
  Calendar, 
  Search, 
  Route, 
  Radio, 
  Fuel, 
  Sparkles,
  QrCode,
  CreditCard,
  Banknote,
  Wrench,
  Clock,
  ShieldCheck,
  Zap
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
  
  const [selectedBusForInspection, setSelectedBusForInspection] = useState<Bus | null>(null);
  const [fleetFilter, setFleetFilter] = useState<'ALL' | 'ACTIVE' | 'MAINTENANCE' | 'IDLE'>('ALL');
  const [fleetSearch, setFleetSearch] = useState('');

  const isSaaS = owner.planType === 'SaaS';

  // Real-time Firestore Subscriptions
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
      list.sort((a, b) => a.date.localeCompare(b.date));
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

  // Real Operational Metric Calculations
  const totalBuses = buses.length || owner.fleetSize || 0;
  const activeBuses = buses.filter(b => b.status === 'Active').length;
  const maintenanceBuses = buses.filter(b => b.status === 'Maintenance').length;
  const idleBuses = Math.max(0, totalBuses - activeBuses - maintenanceBuses);
  
  const fleetUtilizationRate = totalBuses > 0 ? Math.round((activeBuses / totalBuses) * 100) : 0;

  // Alerts
  const overdueServiceBuses = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Overdue' || getServiceStatus(b.nextServiceDue) === 'Due');
  const expiringLicenseDrivers = drivers.filter(d => {
    const info = getLicenseValidityInfo(d.licenseExpiry);
    return info.status === 'Expired' || info.status === 'Expiring Soon';
  });

  const totalAlertsCount = overdueServiceBuses.length + expiringLicenseDrivers.length;

  // Real Revenue & Earnings Totals
  const latestEarningsEntry = earnings.length > 0 ? earnings[earnings.length - 1] : null;
  const todayRevenueDisplay = owner.todayRevenue || (latestEarningsEntry ? latestEarningsEntry.total : 0);
  const totalMonthlyGross = owner.monthlyGross || earnings.reduce((acc, curr) => acc + curr.total, 0);

  // Payment method breakdown from real earnings
  const totalUPI = earnings.reduce((sum, e) => sum + (e.breakdown?.upi || 0), 0);
  const totalCash = earnings.reduce((sum, e) => sum + (e.breakdown?.cash || 0), 0);
  const totalCard = earnings.reduce((sum, e) => sum + (e.breakdown?.card || 0), 0);
  const totalEarningsAll = totalUPI + totalCash + totalCard || 1;

  // Filtered buses list
  const filteredBuses = buses.filter(bus => {
    const q = fleetSearch.toLowerCase();
    const matches = 
      bus.regNumber.toLowerCase().includes(q) ||
      bus.model.toLowerCase().includes(q) ||
      (bus.routeAssigned && bus.routeAssigned.toLowerCase().includes(q)) ||
      ((bus as any).route && (bus as any).route.toLowerCase().includes(q)) ||
      ((bus as any).driverName && (bus as any).driverName.toLowerCase().includes(q));

    if (!matches) return false;

    if (fleetFilter === 'ACTIVE') return bus.status === 'Active';
    if (fleetFilter === 'MAINTENANCE') return bus.status === 'Maintenance' || getServiceStatus(bus.nextServiceDue) === 'Due' || getServiceStatus(bus.nextServiceDue) === 'Overdue';
    if (fleetFilter === 'IDLE') return bus.status !== 'Active' && bus.status !== 'Maintenance';
    return true;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: TRANZIT BRANDING & COMMAND HEADER */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 bg-slate-900 dark:bg-amber-500/20 text-white dark:text-amber-400 flex items-center justify-center font-black text-lg tracking-tighter rounded-2xl border border-slate-800 dark:border-amber-500/30 shadow-xs shrink-0">
              TZ
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                  Tranzit
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 rounded-md font-bold border border-slate-200 dark:border-neutral-700 whitespace-nowrap shrink-0">
                  Fleet OS
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                <span className="font-semibold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                  {owner.companyName || owner.name || 'Carrier Partner'}
                </span>
                <span>•</span>
                <span className="whitespace-nowrap">{owner.city || 'Hub'}</span>
                <span>•</span>
                <span className="whitespace-nowrap">{totalBuses} Vehicles in Pool</span>
              </div>
            </div>
          </div>

          {/* Quick Hub Navigation Actions */}
          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-2">
            <button
              onClick={() => onNavigateTab('fleet')}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            >
              <BusIcon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Fleet ({totalBuses})</span>
            </button>

            <button
              onClick={() => onNavigateTab('maintenance')}
              className="px-3 sm:px-3.5 py-1.5 sm:py-2 bg-slate-50 dark:bg-neutral-900 hover:bg-slate-100 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            >
              <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Service</span>
              {overdueServiceBuses.length > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              )}
            </button>

            <button
              onClick={() => onNavigateTab('earnings')}
              className="px-3.5 sm:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20 whitespace-nowrap shrink-0"
            >
              <Wallet className="w-3.5 h-3.5 shrink-0" />
              <span>Earnings</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: OPERATIONAL KPI CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          label="Active Fleet / Total"
          value={`${activeBuses} / ${totalBuses}`}
          subtext={`${fleetUtilizationRate}% operational utilization`}
          icon={BusIcon}
          badgeText={activeBuses > 0 ? `${activeBuses} On Road` : 'All Idle'}
          accentColor="teal"
        />

        <StatCard
          label={isSaaS ? "Today's Gross Revenue" : "Today's Net Operator Cut"}
          value={formatINR(todayRevenueDisplay)}
          subtext={isSaaS ? "100% fare directly to owner" : `15% commission model`}
          icon={Wallet}
          badgeText={isSaaS ? 'Direct SaaS' : 'Leased Payout'}
          accentColor="amber"
        />

        <StatCard
          label="Active Routes & Drivers"
          value={`${routes.length} Routes • ${drivers.length} Drivers`}
          subtext={`${drivers.filter(d => d.status === 'Active').length} drivers on duty today`}
          icon={Route}
          badgeText="Verified"
          accentColor="navy"
        />

        <StatCard
          label="Fleet Attention & Alerts"
          value={totalAlertsCount}
          subtext={totalAlertsCount === 0 ? 'All vehicles and licenses nominal' : `${overdueServiceBuses.length} service due • ${expiringLicenseDrivers.length} license alerts`}
          icon={AlertTriangle}
          badgeText={totalAlertsCount === 0 ? 'All Good' : 'Action Needed'}
          accentColor={totalAlertsCount === 0 ? 'teal' : 'amber'}
        />
      </section>

      {/* SECTION 3: ATTENTION / ACTION REQUIRED BANNER (If any alerts exist) */}
      {totalAlertsCount > 0 && (
        <section className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/90 dark:border-amber-800/50 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 dark:text-amber-200">
                  Fleet Operational Attention Required ({totalAlertsCount} items)
                </h3>
                <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                  Immediate action prevents vehicle breakdown and statutory regulatory compliance flags.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigateTab(overdueServiceBuses.length > 0 ? 'fleet' : 'drivers')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Resolve Alerts →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 font-mono text-xs">
            {overdueServiceBuses.slice(0, 2).map((bus) => (
              <div key={bus.id || bus.regNumber} className="bg-white dark:bg-neutral-900 border border-amber-200/80 dark:border-amber-800/40 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Wrench className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{bus.regNumber}</span>
                    <span className="text-slate-500 text-[11px] block">{bus.model} • Service {getServiceStatus(bus.nextServiceDue)}</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold border border-rose-200 dark:border-rose-800">
                  {bus.nextServiceDue ? new Date(bus.nextServiceDue).toLocaleDateString() : 'Due'}
                </span>
              </div>
            ))}

            {expiringLicenseDrivers.slice(0, 2).map((driver) => (
              <div key={driver.id || driver.name} className="bg-white dark:bg-neutral-900 border border-amber-200/80 dark:border-amber-800/40 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="font-bold text-slate-900 dark:text-white">{driver.name}</span>
                    <span className="text-slate-500 text-[11px] block">License: {driver.licenseNumber}</span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800">
                  Expires {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : 'Soon'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECTION 4: REAL FLEET UTILIZATION CHART */}
      <section>
        <FleetUtilizationChart
          buses={buses}
          totalBusesCount={totalBuses}
          activeBusesCount={activeBuses}
          planType={owner.planType}
          onNavigateTab={onNavigateTab}
        />
      </section>

      {/* SECTION 5: LIVE FLEET INVENTORY & REAL STATUS */}
      <section className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-sans">
              Live Fleet Deployment ({buses.length} Vehicles)
            </h3>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fleetSearch}
                onChange={(e) => setFleetSearch(e.target.value)}
                placeholder="Search reg / model / route..."
                className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-full font-mono text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {(['ALL', 'ACTIVE', 'MAINTENANCE', 'IDLE'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setFleetFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  fleetFilter === filter
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Bus Fleet Grid / Cards */}
        {filteredBuses.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-neutral-900/50 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-500 font-mono text-xs">
            No fleet vehicles match the selected filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBuses.map((bus) => {
              const assignedRoute = bus.routeAssigned || (bus as any).route || 'Unassigned';
              const assignedDriver = (bus as any).driverName || drivers.find(d => (d as any).assignedBus === bus.regNumber)?.name || 'Unassigned';
              const serviceStatus = getServiceStatus(bus.nextServiceDue);

              return (
                <div
                  key={bus.id || bus.regNumber}
                  className="bg-slate-50/70 dark:bg-neutral-900/40 border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl p-4 space-y-3 hover:border-slate-300 dark:hover:border-neutral-700 transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Top Bus Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 flex items-center justify-center text-slate-700 dark:text-neutral-300 shrink-0">
                          <BusIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-sm text-slate-900 dark:text-white block truncate">
                            {bus.regNumber}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block truncate">
                            {bus.model}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 border ${
                          bus.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : bus.status === 'Maintenance'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-slate-100 text-slate-700 dark:bg-neutral-800 dark:text-neutral-400 border-slate-200 dark:border-neutral-700'
                        }`}
                      >
                        {bus.status || 'Idle'}
                      </span>
                    </div>

                    {/* Route & Driver Info */}
                    <div className="space-y-1 text-xs font-mono bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800">
                      <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                        <span className="text-[10px] uppercase text-slate-400">Route</span>
                        <span className="font-bold truncate max-w-[150px]">{assignedRoute}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                        <span className="text-[10px] uppercase text-slate-400">Driver</span>
                        <span className="font-medium truncate max-w-[150px]">{assignedDriver}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-neutral-300">
                        <span className="text-[10px] uppercase text-slate-400">Service Due</span>
                        <span className={`font-medium ${serviceStatus === 'Overdue' ? 'text-rose-600 font-bold' : serviceStatus === 'Due' ? 'text-amber-600 font-bold' : 'text-slate-500'}`}>
                          {bus.nextServiceDue ? new Date(bus.nextServiceDue).toLocaleDateString() : 'Not Set'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-neutral-800 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setSelectedBusForInspection(bus)}
                      className="text-xs font-mono text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Telemetry Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => onNavigateTab('fleet')}
                      className="text-[11px] font-mono text-slate-400 hover:text-slate-700 dark:hover:text-neutral-200 cursor-pointer"
                    >
                      Edit Bus
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 6: REVENUE CHANNELS & ACTIVITY SUMMARY */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payment Channels Breakdown */}
        <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
              Fare Collection Channels
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Firestore Sync</span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-700 dark:text-neutral-300">
                <span className="flex items-center space-x-1.5">
                  <QrCode className="w-3.5 h-3.5 text-blue-600" />
                  <span>UPI / QR Scan</span>
                </span>
                <span className="font-bold">{formatINR(totalUPI)} ({Math.round((totalUPI / totalEarningsAll) * 100)}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${(totalUPI / totalEarningsAll) * 100}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-700 dark:text-neutral-300">
                <span className="flex items-center space-x-1.5">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Cash Ticketing</span>
                </span>
                <span className="font-bold">{formatINR(totalCash)} ({Math.round((totalCash / totalEarningsAll) * 100)}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${(totalCash / totalEarningsAll) * 100}%` }}></div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-slate-700 dark:text-neutral-300">
                <span className="flex items-center space-x-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600" />
                  <span>NCMC Transit Cards</span>
                </span>
                <span className="font-bold">{formatINR(totalCard)} ({Math.round((totalCard / totalEarningsAll) * 100)}%)</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                <div className="h-full bg-purple-600 rounded-full" style={{ width: `${(totalCard / totalEarningsAll) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Route Summary */}
        <div className="lg:col-span-2 bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
              Active Transit Corridors ({routes.length} Routes)
            </h3>
            <button
              onClick={() => onNavigateTab('routes')}
              className="text-xs font-mono text-blue-600 hover:underline font-bold"
            >
              View Route Matrix →
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-neutral-800 pb-2">
                  <th className="pb-2">CORRIDOR / ROUTE</th>
                  <th className="pb-2">DISTANCE</th>
                  <th className="pb-2">STOPS</th>
                  <th className="pb-2">BASE FARE</th>
                  <th className="pb-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-neutral-800/50">
                {routes.slice(0, 4).map((route) => (
                  <tr key={route.id || route.routeName} className="hover:bg-slate-50/50 dark:hover:bg-neutral-800/30">
                    <td className="py-2.5 font-bold text-slate-800 dark:text-neutral-200">
                      {route.routeName}
                    </td>
                    <td className="py-2.5 text-slate-500">{route.distanceKm || 0} km</td>
                    <td className="py-2.5 text-slate-500">{route.stopsCount || (route.stops?.length || 0)} stops</td>
                    <td className="py-2.5 font-bold text-slate-900 dark:text-white">{formatINR(route.baseFare || 0)}</td>
                    <td className="py-2.5 text-right">
                      <button
                        onClick={() => onNavigateTab('routes')}
                        className="text-blue-600 hover:text-blue-700 font-bold"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* SECTION 7: AI FLEET COPILOT */}
      <section>
        <OwnerInsightsChat owner={owner} />
      </section>

      {/* TELEMETRY MODAL */}
      {selectedBusForInspection && (
        <TelemetryInspectorModal
          bus={selectedBusForInspection}
          isOpen={Boolean(selectedBusForInspection)}
          onClose={() => setSelectedBusForInspection(null)}
          routes={routes}
          drivers={drivers}
          maintenance={maintenance}
          onNavigateTab={onNavigateTab}
        />
      )}
    </div>
  );
};
