import React, { useState, useEffect, useMemo } from 'react';
import { OwnerProfile, Driver, Bus, RouteItem } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StatCard } from './StatCard';
import { getLicenseValidityInfo } from '../lib/utils';
import {
  Users,
  UserCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Bus as BusIcon,
  MapPin,
  Clock,
  Phone,
  Search,
  Plus,
  Edit2,
  Award,
  Layers,
  Table as TableIcon,
  Grid,
  ChevronRight,
  RefreshCw,
  Printer
} from 'lucide-react';
import { AddDriverModal } from './AddDriverModal';
import { EditDriverModal } from './EditDriverModal';
import { RenewLicenseModal } from './RenewLicenseModal';
import { AssignRouteModal } from './AssignRouteModal';

interface DriversViewProps {
  owner: OwnerProfile;
}

export const DriversView: React.FC<DriversViewProps> = ({ owner }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [licenseFilter, setLicenseFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedDriverForEdit, setSelectedDriverForEdit] = useState<Driver | null>(null);
  const [selectedDriverForRenew, setSelectedDriverForRenew] = useState<Driver | null>(null);
  const [selectedDriverForAssign, setSelectedDriverForAssign] = useState<Driver | null>(null);

  // 1. Subscribe to Drivers
  useEffect(() => {
    const q = query(collection(db, 'drivers'), where('ownerId', '==', owner.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Driver);
      });
      list.sort((a, b) => a.name.localeCompare(b.name));
      setDrivers(list);
      setLoading(false);
    }, (err) => {
      console.error("Drivers snapshot error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [owner.id]);

  // 2. Subscribe to Buses
  useEffect(() => {
    const q = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as Bus);
      });
      setBuses(list);
    });
    return () => unsub();
  }, [owner.id]);

  // 3. Subscribe to Routes
  useEffect(() => {
    const q = query(collection(db, 'routes'), where('ownerId', '==', owner.id));
    const unsub = onSnapshot(q, (snapshot) => {
      const list: RouteItem[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() } as RouteItem);
      });
      setRoutes(list);
    });
    return () => unsub();
  }, [owner.id]);

  // Computed compliance metrics
  const {
    totalDrivers,
    activeDrivers,
    standbyDrivers,
    onLeaveDrivers,
    expiringSoonCount,
    expiredCount,
    urgentDrivers
  } = useMemo(() => {
    let active = 0;
    let standby = 0;
    let onLeave = 0;
    let expiringSoon = 0;
    let expired = 0;
    const urgent: { driver: Driver; validity: ReturnType<typeof getLicenseValidityInfo> }[] = [];

    drivers.forEach(d => {
      if (d.status === 'Active') active++;
      if (d.status === 'Relief') standby++;
      if (d.status === 'On Leave' || d.status === 'Off Duty') onLeave++;

      const val = getLicenseValidityInfo(d.licenseExpiryDate);
      if (val.status === 'Expired') {
        expired++;
        urgent.push({ driver: d, validity: val });
      } else if (val.status === 'Expiring Soon') {
        expiringSoon++;
        urgent.push({ driver: d, validity: val });
      }
    });

    return {
      totalDrivers: drivers.length,
      activeDrivers: active,
      standbyDrivers: standby,
      onLeaveDrivers: onLeave,
      expiringSoonCount: expiringSoon,
      expiredCount: expired,
      urgentDrivers: urgent
    };
  }, [drivers]);

  // Filtered drivers list
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => {
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        d.name.toLowerCase().includes(query) ||
        d.employeeId.toLowerCase().includes(query) ||
        d.licenseNumber.toLowerCase().includes(query) ||
        (d.badgeNumber && d.badgeNumber.toLowerCase().includes(query)) ||
        (d.assignedRouteName && d.assignedRouteName.toLowerCase().includes(query)) ||
        (d.assignedBusReg && d.assignedBusReg.toLowerCase().includes(query)) ||
        d.phone.includes(query);

      const matchesStatus =
        statusFilter === 'all' ||
        d.status.toLowerCase() === statusFilter.toLowerCase();

      const validity = getLicenseValidityInfo(d.licenseExpiryDate);
      const matchesLicense =
        licenseFilter === 'all' ||
        (licenseFilter === 'valid' && validity.status === 'Valid') ||
        (licenseFilter === 'expiring' && validity.status === 'Expiring Soon') ||
        (licenseFilter === 'expired' && validity.status === 'Expired');

      return matchesSearch && matchesStatus && matchesLicense;
    });
  }, [drivers, searchQuery, statusFilter, licenseFilter]);

  const handlePrintRoster = () => {
    window.print();
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
              Fleet Pilots & Roster Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {totalDrivers} Pilots
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto flex-wrap gap-y-2">
          <button
            onClick={handlePrintRoster}
            className="px-3.5 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            title="Print or export driver manifest"
          >
            <Printer className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Print Manifest</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20 whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Enroll Pilot</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: LICENSE EXPIRY ALERT BANNER (If urgent) */}
      {urgentDrivers.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-xl mt-0.5 shrink-0">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                  Commercial DL Renewal Action Required ({urgentDrivers.length} {urgentDrivers.length === 1 ? 'Pilot' : 'Pilots'})
                </h3>
                <p className="text-xs text-slate-600 dark:text-neutral-300 mt-0.5 leading-relaxed font-sans">
                  Under Section 3 & 14 of the Motor Vehicles Act, operating public transport without an active HMV/PSV badge invalidates insurance coverage.
                </p>
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {urgentDrivers.map(({ driver, validity }) => (
                    <button
                      key={driver.id}
                      onClick={() => setSelectedDriverForRenew(driver)}
                      className="px-2.5 py-1 bg-white dark:bg-neutral-900 hover:bg-amber-100 dark:hover:bg-neutral-800 border border-amber-300 dark:border-amber-800/60 text-amber-950 dark:text-amber-200 text-xs font-mono font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                    >
                      <span>{driver.name}</span>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400">({validity.label})</span>
                      <ChevronRight className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={() => setLicenseFilter('expiring')}
              className="self-start sm:self-center px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-bold rounded-xl transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Filter Expiring
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Enrolled Pilots"
          value={`${totalDrivers}`}
          subtext={`${activeDrivers} Active • ${standbyDrivers} Standby Pool`}
          icon={Users}
        />
        <StatCard
          label="Active Route Pilots"
          value={`${activeDrivers}`}
          subtext={`${Math.round((activeDrivers / (totalDrivers || 1)) * 100)}% roster dispatch rate`}
          icon={UserCheck}
        />
        <StatCard
          label="License Compliance"
          value={`${totalDrivers - expiringSoonCount - expiredCount} / ${totalDrivers}`}
          subtext={
            expiredCount > 0
              ? `${expiredCount} Expired • ${expiringSoonCount} Expiring Soon`
              : expiringSoonCount > 0
              ? `${expiringSoonCount} Expiring Soon (<45d)`
              : '100% Commercial DL Valid'
          }
          icon={expiredCount > 0 ? ShieldAlert : ShieldCheck}
        />
        <StatCard
          label="Standby & Relief Pool"
          value={`${standbyDrivers}`}
          subtext="Ready for immediate route dispatch"
          icon={Layers}
        />
      </div>

      {/* SECTION 4: FILTER CONTROLS & SEARCH */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 p-4 sm:p-5 rounded-2xl shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by pilot name, employee ID, DL number, route, bus..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-full font-mono text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Filter Pills & View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Duty Select */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-neutral-900 px-3 py-1 border border-slate-200 dark:border-neutral-800 rounded-full text-xs font-mono shrink-0 whitespace-nowrap">
              <span className="text-slate-400 uppercase text-[10px] font-bold">Duty:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-white font-bold outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-neutral-900">All ({totalDrivers})</option>
                <option value="active" className="dark:bg-neutral-900">Active ({activeDrivers})</option>
                <option value="relief" className="dark:bg-neutral-900">Relief / Standby ({standbyDrivers})</option>
                <option value="on leave" className="dark:bg-neutral-900">On Leave ({onLeaveDrivers})</option>
              </select>
            </div>

            {/* License Select */}
            <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-neutral-900 px-3 py-1 border border-slate-200 dark:border-neutral-800 rounded-full text-xs font-mono shrink-0 whitespace-nowrap">
              <span className="text-slate-400 uppercase text-[10px] font-bold">DL:</span>
              <select
                value={licenseFilter}
                onChange={(e) => setLicenseFilter(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-white font-bold outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-neutral-900">All DLs</option>
                <option value="valid" className="dark:bg-neutral-900">Valid ({totalDrivers - expiringSoonCount - expiredCount})</option>
                <option value="expiring" className="dark:bg-neutral-900">Expiring Soon ({expiringSoonCount})</option>
                <option value="expired" className="dark:bg-neutral-900">Expired ({expiredCount})</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-1 bg-slate-50 dark:bg-neutral-900 p-1 border border-slate-200 dark:border-neutral-800 rounded-full shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-full text-xs font-mono transition-colors cursor-pointer flex items-center space-x-1 whitespace-nowrap ${
                  viewMode === 'table' ? 'bg-blue-600 text-white font-bold' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter tags reset */}
        {(statusFilter !== 'all' || licenseFilter !== 'all' || searchQuery) && (
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 dark:border-neutral-800 text-xs font-mono">
            <span className="text-slate-500 dark:text-neutral-400 text-[11px]">Filtered: {filteredDrivers.length} of {totalDrivers} pilots</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setLicenseFilter('all');
              }}
              className="text-blue-600 hover:underline text-[11px] font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* SECTION 5: ROSTER LISTING */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-xs font-mono text-slate-500 dark:text-neutral-400 uppercase">Loading pilot profiles from Firestore...</p>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl space-y-3">
          <Users className="w-10 h-10 text-slate-300 dark:text-neutral-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800 dark:text-neutral-200 font-sans">No pilot profiles match your criteria</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto font-sans">
            Try adjusting your search terms or filters, or enroll a new pilot into the fleet roster.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Enroll Pilot</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID CARDS */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDrivers.map((driver) => {
            const validity = getLicenseValidityInfo(driver.licenseExpiryDate);

            return (
              <div
                key={driver.id}
                className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-5 shadow-2xs hover:border-slate-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  {/* Driver Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 bg-slate-900 dark:bg-neutral-800 text-white font-mono font-black text-sm flex items-center justify-center rounded-xl shrink-0 border border-slate-800 dark:border-neutral-700">
                        {driver.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate font-sans">
                            {driver.name}
                          </h3>
                          <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-neutral-800 text-[10px] font-mono font-bold text-slate-600 dark:text-neutral-400 rounded">
                            {driver.employeeId}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{driver.phone}</span>
                          </span>
                          {driver.bloodGroup && (
                            <>
                              <span>•</span>
                              <span className="text-rose-600 font-bold">{driver.bloodGroup}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Pill */}
                    <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border shrink-0 ${
                      driver.status === 'Active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : driver.status === 'Relief'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                        : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    }`}>
                      {driver.status}
                    </span>
                  </div>

                  {/* Commercial DL Box */}
                  <div className="bg-slate-50 dark:bg-neutral-900/60 p-3 rounded-xl border border-slate-100 dark:border-neutral-800 space-y-2 text-xs font-mono">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1 text-slate-800 dark:text-white font-bold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>DL: {driver.licenseNumber}</span>
                      </div>
                      <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded ${
                        validity.status === 'Expired'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : validity.status === 'Expiring Soon'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {validity.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-neutral-400 pt-1 border-t border-slate-200/60 dark:border-neutral-800">
                      <span>Expires: <strong className="text-slate-800 dark:text-white">{driver.licenseExpiryDate}</strong></span>
                      <button
                        onClick={() => setSelectedDriverForRenew(driver)}
                        className="text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        Renew
                      </button>
                    </div>
                  </div>

                  {/* Route & Bus Assignment */}
                  <div className="bg-blue-50/40 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/40 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center space-x-2 truncate">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-neutral-200 truncate">
                        {driver.assignedRouteName || 'Standby Pool'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-neutral-400 shrink-0">
                      {driver.assignedBusReg || 'No Bus'}
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
                  <button
                    onClick={() => setSelectedDriverForAssign(driver)}
                    className="text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Assign Duty</span>
                  </button>

                  <button
                    onClick={() => setSelectedDriverForEdit(driver)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 rounded-lg text-slate-700 dark:text-neutral-300 font-bold flex items-center space-x-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl overflow-x-auto shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-neutral-900/80 text-slate-500 dark:text-neutral-400 font-mono uppercase tracking-wider text-[11px] border-b border-slate-200 dark:border-neutral-800">
                <th className="py-3 px-4">Pilot / Employee</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Commercial DL</th>
                <th className="py-3 px-3">Validity</th>
                <th className="py-3 px-4">Assigned Corridor</th>
                <th className="py-3 px-3">Bus Vehicle</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 font-sans">
              {filteredDrivers.map((driver) => {
                const validity = getLicenseValidityInfo(driver.licenseExpiryDate);

                return (
                  <tr key={driver.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white text-sm">{driver.name}</div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">{driver.employeeId}</div>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-neutral-300">
                      <div>{driver.phone}</div>
                      <div className="text-[11px] text-rose-600 font-semibold">{driver.bloodGroup || 'Blood: N/A'}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border whitespace-nowrap ${
                        driver.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : driver.status === 'Relief'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                      }`}>
                        {driver.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-white">{driver.licenseNumber}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">Badge: {driver.badgeNumber || 'N/A'}</div>
                    </td>

                    <td className="py-3.5 px-3 font-mono">
                      <span className={`inline-block px-2 py-0.5 text-[10px] font-bold rounded ${
                        validity.status === 'Expired'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : validity.status === 'Expiring Soon'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {validity.label}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">{driver.licenseExpiryDate}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-neutral-200 text-xs">
                        {driver.assignedRouteName || 'Standby / Relief'}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                      {driver.assignedBusReg || 'Standby Pool'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5 font-mono">
                        <button
                          onClick={() => setSelectedDriverForRenew(driver)}
                          className="px-2 py-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-blue-600 dark:text-blue-400 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => setSelectedDriverForAssign(driver)}
                          className="px-2 py-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => setSelectedDriverForEdit(driver)}
                          className="px-2 py-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* MODALS */}
      {isAddModalOpen && (
        <AddDriverModal
          owner={owner}
          buses={buses}
          routes={routes}
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}

      {selectedDriverForEdit && (
        <EditDriverModal
          owner={owner}
          driver={selectedDriverForEdit}
          buses={buses}
          routes={routes}
          isOpen={!!selectedDriverForEdit}
          onClose={() => setSelectedDriverForEdit(null)}
        />
      )}

      {selectedDriverForRenew && (
        <RenewLicenseModal
          driver={selectedDriverForRenew}
          isOpen={!!selectedDriverForRenew}
          onClose={() => setSelectedDriverForRenew(null)}
        />
      )}

      {selectedDriverForAssign && (
        <AssignRouteModal
          driver={selectedDriverForAssign}
          buses={buses}
          routes={routes}
          isOpen={!!selectedDriverForAssign}
          onClose={() => setSelectedDriverForAssign(null)}
        />
      )}
    </div>
  );
};
