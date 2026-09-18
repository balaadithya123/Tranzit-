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
    <div className="space-y-6">
      {/* View Header */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 dark:text-neutral-400 uppercase tracking-widest mb-1.5 font-bold">
            <Users className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Personnel & Compliance Management</span>
            <span>•</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">RTO Regulatory Standard</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight font-sans">
            Driver Roster & Route Dispatch
          </h1>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-0.5">
            Monitor driver profiles, commercial Heavy Vehicle (HMV) licenses, PSV badges, and daily bus route schedules.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2.5 self-start sm:self-auto">
          <button
            onClick={handlePrintRoster}
            className="px-3 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-300 font-mono font-bold text-xs uppercase rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Print or export driver manifest"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
            <span>Print Roster</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white dark:text-slate-950 font-mono font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400 dark:text-slate-950" />
            <span>Enroll Driver</span>
          </button>
        </div>
      </div>

      {/* License Expiry Alert Banner (if urgent) */}
      {urgentDrivers.length > 0 && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-600 border border-amber-200 dark:border-amber-800/60 rounded-xl shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="p-1.5 bg-amber-500/20 text-amber-800 dark:text-amber-300 rounded-lg mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-extrabold text-amber-950 dark:text-amber-200 font-mono uppercase tracking-wide">
                  Commercial License Renewal Required ({urgentDrivers.length} {urgentDrivers.length === 1 ? 'Driver' : 'Drivers'})
                </h2>
                <p className="text-xs text-amber-900 dark:text-amber-300 font-sans mt-0.5">
                  Under the Motor Vehicles Act, operating public transport without an active HMV/PSV badge invalidates insurance coverage.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
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
              className="self-start sm:self-center px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-mono text-xs font-bold uppercase rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Filter Expiring
            </button>
          </div>
        </div>
      )}

      {/* 4 Core Stat Cards */}
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

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-4 rounded-xl shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by driver name, ID, DL number, route, or bus..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 focus:border-amber-500 text-xs font-mono text-slate-900 dark:text-neutral-100 rounded-lg outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400 hover:text-slate-600 dark:hover:text-neutral-200 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Controls: Roster Status, License Filter, View Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 dark:bg-neutral-900 px-2 py-1 border border-slate-200 dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 font-bold">Duty:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-xs font-mono text-slate-900 dark:text-neutral-100 font-semibold outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-neutral-900">All ({totalDrivers})</option>
                <option value="active" className="dark:bg-neutral-900">Active ({activeDrivers})</option>
                <option value="relief" className="dark:bg-neutral-900">Relief / Standby ({standbyDrivers})</option>
                <option value="on leave" className="dark:bg-neutral-900">On Leave ({onLeaveDrivers})</option>
              </select>
            </div>

            {/* License Validity Filter */}
            <div className="flex items-center space-x-1 bg-slate-50 dark:bg-neutral-900 px-2 py-1 border border-slate-200 dark:border-neutral-800 rounded-lg">
              <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-neutral-400 font-bold">License:</span>
              <select
                value={licenseFilter}
                onChange={(e) => setLicenseFilter(e.target.value)}
                className="bg-transparent text-xs font-mono text-slate-900 dark:text-neutral-100 font-semibold outline-none cursor-pointer"
              >
                <option value="all" className="dark:bg-neutral-900">All DLs</option>
                <option value="valid" className="dark:bg-neutral-900">Valid ({totalDrivers - expiringSoonCount - expiredCount})</option>
                <option value="expiring" className="dark:bg-neutral-900">Expiring Soon ({expiringSoonCount})</option>
                <option value="expired" className="dark:bg-neutral-900">Expired ({expiredCount})</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center space-x-0.5 bg-slate-50 dark:bg-neutral-900 p-1 border border-slate-200 dark:border-neutral-800 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-slate-900 dark:bg-neutral-800 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200'
                }`}
                title="Card Grid View"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'table' ? 'bg-slate-900 dark:bg-neutral-800 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-neutral-200'
                }`}
                title="Compliance Table View"
              >
                <TableIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter tags bar */}
        {(statusFilter !== 'all' || licenseFilter !== 'all' || searchQuery) && (
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-200 dark:border-neutral-800 text-xs font-mono">
            <span className="text-slate-500 dark:text-neutral-400 text-[11px]">Filtered: {filteredDrivers.length} of {totalDrivers} pilots</span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setLicenseFilter('all');
              }}
              className="text-amber-700 dark:text-amber-400 hover:underline text-[11px] font-bold cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Roster Listing */}
      {loading ? (
        <div className="p-12 text-center bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl">
          <RefreshCw className="w-6 h-6 animate-spin text-amber-600 dark:text-amber-400 mx-auto mb-2" />
          <p className="text-xs font-mono text-slate-500 dark:text-neutral-400 uppercase">Loading driver profiles from Firestore...</p>
        </div>
      ) : filteredDrivers.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl space-y-3">
          <Users className="w-10 h-10 text-slate-300 dark:text-neutral-600 mx-auto" />
          <h2 className="text-base font-bold text-slate-800 dark:text-neutral-200 font-sans">No driver profiles match your criteria</h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 max-w-md mx-auto font-sans">
            Try adjusting your search terms or filters, or enroll a new driver into the fleet roster.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-600 dark:hover:bg-amber-700 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold rounded-lg cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400 dark:text-slate-950" />
            <span>Enroll Driver</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredDrivers.map((driver) => {
            const validity = getLicenseValidityInfo(driver.licenseExpiryDate);

            return (
              <div
                key={driver.id}
                className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl shadow-2xs hover:border-slate-400 dark:hover:border-neutral-700 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Card Top Section */}
                <div className="p-5 space-y-4">
                  {/* Driver Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 bg-slate-900 dark:bg-neutral-900 text-white dark:text-neutral-100 font-mono font-extrabold text-sm flex items-center justify-center rounded-lg shrink-0 border border-slate-700 dark:border-neutral-700">
                        {driver.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-bold text-base text-slate-900 dark:text-neutral-100 leading-snug">
                            {driver.name}
                          </h3>
                          <span className="px-1.5 py-0.5 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 text-[10px] font-mono font-bold text-slate-600 dark:text-neutral-400 rounded-md">
                            {driver.employeeId}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-neutral-400 font-mono mt-0.5">
                          <span className="flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-slate-400 dark:text-neutral-500" />
                            <span>{driver.phone}</span>
                          </span>
                          {driver.bloodGroup && (
                            <>
                              <span>•</span>
                              <span className="text-red-700 dark:text-red-400 font-semibold">{driver.bloodGroup}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Operational Status Pill */}
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 text-[11px] font-mono font-bold uppercase rounded-md border ${
                        driver.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : driver.status === 'Relief'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                          : driver.status === 'On Leave'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                          : 'bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-300 dark:border-neutral-800'
                      }`}>
                        {driver.status}
                      </span>
                      {driver.safetyScore && (
                        <span className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 flex items-center space-x-1">
                          <Award className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                          <span>{driver.safetyScore}% Safety</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Commercial License Validity Box */}
                  <div className={`p-3 rounded-lg border space-y-2 ${
                    validity.status === 'Expired'
                      ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60'
                      : validity.status === 'Expiring Soon'
                      ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60'
                      : 'bg-slate-50 dark:bg-neutral-900 border-slate-200 dark:border-neutral-800'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-xs font-mono font-bold">
                        <ShieldCheck className={`w-4 h-4 ${
                          validity.status === 'Expired'
                            ? 'text-red-600 dark:text-red-400'
                            : validity.status === 'Expiring Soon'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`} />
                        <span className="text-slate-800 dark:text-neutral-200">DL: {driver.licenseNumber}</span>
                      </div>

                      {/* License Status Badge */}
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md border ${
                        validity.status === 'Expired'
                          ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse'
                          : validity.status === 'Expiring Soon'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-extrabold'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                      }`}>
                        {validity.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono text-slate-600 dark:text-neutral-400">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 block uppercase">Authorization</span>
                        <span className="font-semibold text-slate-800 dark:text-neutral-200 truncate block" title={driver.licenseType}>
                          {driver.licenseType}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-neutral-500 block uppercase">PSV Badge No.</span>
                        <span className="font-semibold text-slate-800 dark:text-neutral-200">
                          {driver.badgeNumber || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-neutral-800 text-[11px] font-mono">
                      <span className="text-slate-500 dark:text-neutral-400">
                        Expires: <strong className="text-slate-800 dark:text-neutral-200">{driver.licenseExpiryDate}</strong>
                      </span>
                      <button
                        onClick={() => setSelectedDriverForRenew(driver)}
                        className="text-amber-700 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                      >
                        {validity.status !== 'Valid' ? '⚡ Renew License' : 'Update Renewal'}
                      </button>
                    </div>
                  </div>

                  {/* Route & Bus Assignment Info */}
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 dark:text-neutral-500 block">Assigned Route</span>
                        <span className="font-bold text-slate-800 dark:text-neutral-200">
                          {driver.assignedRouteName || 'All Routes (Relief / Standby)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-neutral-800">
                      <div className="flex items-center space-x-1.5">
                        <BusIcon className="w-3.5 h-3.5 text-slate-500 dark:text-neutral-400" />
                        <span className="font-mono text-slate-700 dark:text-neutral-300 font-semibold">
                          {driver.assignedBusReg || 'Standby Pool'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 font-mono text-slate-500 dark:text-neutral-400 text-[11px]">
                        <Clock className="w-3 h-3" />
                        <span>{driver.shiftTiming || 'Regular Shift'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-neutral-900 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedDriverForAssign(driver)}
                    className="text-xs font-mono font-bold text-slate-700 dark:text-neutral-300 hover:text-slate-900 dark:hover:text-white flex items-center space-x-1 cursor-pointer"
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Assign Route / Bus</span>
                  </button>

                  <button
                    onClick={() => setSelectedDriverForEdit(driver)}
                    className="px-2.5 py-1 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 border border-slate-200 dark:border-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-mono font-semibold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-slate-500 dark:text-neutral-400" />
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compliance Table View */
        <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl shadow-2xs overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 dark:bg-neutral-900 text-white font-mono uppercase tracking-wider text-[11px] border-b border-slate-800 dark:border-neutral-800">
                <th className="py-3 px-4">Pilot / Employee</th>
                <th className="py-3 px-3">Contact & Blood</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4">Commercial DL & Badge</th>
                <th className="py-3 px-3">License Validity</th>
                <th className="py-3 px-4">Assigned Route</th>
                <th className="py-3 px-3">Bus Vehicle</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {filteredDrivers.map((driver) => {
                const validity = getLicenseValidityInfo(driver.licenseExpiryDate);

                return (
                  <tr key={driver.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50 transition-colors font-sans">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-neutral-100 text-sm">{driver.name}</div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-neutral-400">{driver.employeeId}</div>
                    </td>

                    <td className="py-3.5 px-3 font-mono text-slate-700 dark:text-neutral-300">
                      <div>{driver.phone}</div>
                      <div className="text-[11px] text-red-700 dark:text-red-400 font-semibold">{driver.bloodGroup || 'Blood: N/A'}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <span className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md border whitespace-nowrap ${
                        driver.status === 'Active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                          : driver.status === 'Relief'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                          : driver.status === 'On Leave'
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/60'
                          : 'bg-slate-100 dark:bg-neutral-900 text-slate-700 dark:text-neutral-300 border-slate-300 dark:border-neutral-800'
                      }`}>
                        {driver.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono">
                      <div className="font-bold text-slate-900 dark:text-neutral-100">{driver.licenseNumber}</div>
                      <div className="text-[11px] text-slate-500 dark:text-neutral-400">Badge: {driver.badgeNumber || 'N/A'}</div>
                    </td>

                    <td className="py-3.5 px-3">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md border whitespace-nowrap ${
                          validity.status === 'Expired'
                            ? 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800 animate-pulse'
                            : validity.status === 'Expiring Soon'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-extrabold'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                        }`}>
                          {validity.label}
                        </span>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400">
                          Due: {driver.licenseExpiryDate}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800 dark:text-neutral-200 text-xs">
                        {driver.assignedRouteName || 'Standby / Relief'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                        {driver.shiftTiming || 'Standard Shift'}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 font-mono font-semibold text-slate-800 dark:text-neutral-200 whitespace-nowrap">
                      {driver.assignedBusReg || 'Standby Pool'}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => setSelectedDriverForRenew(driver)}
                          className="px-2 py-1 bg-slate-50 dark:bg-neutral-800 hover:bg-amber-100 dark:hover:bg-neutral-700 text-amber-900 dark:text-amber-300 border border-slate-200 dark:border-neutral-700 text-[11px] font-mono font-bold rounded-md cursor-pointer"
                          title="Update license renewal"
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => setSelectedDriverForAssign(driver)}
                          className="px-2 py-1 bg-slate-50 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 border border-slate-200 dark:border-neutral-700 text-[11px] font-mono font-bold rounded-md cursor-pointer"
                          title="Assign Route & Bus"
                        >
                          Assign
                        </button>
                        <button
                          onClick={() => setSelectedDriverForEdit(driver)}
                          className="px-2 py-1 bg-white dark:bg-neutral-800 hover:bg-slate-100 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 border border-slate-200 dark:border-neutral-700 text-[11px] font-mono font-semibold rounded-md cursor-pointer"
                          title="Edit driver"
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

      {/* RTO Reference Footer */}
      <div className="p-4 bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl text-xs text-slate-500 dark:text-neutral-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-2 font-mono">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>Section 3 & 14, Motor Vehicles Act 1988 Compliance Active</span>
        </div>
        <div className="text-[11px] font-sans text-slate-400 dark:text-neutral-500">
          Heavy Passenger Vehicles (PSV) require 3-year recurring medical fitness and endorsement renewal.
        </div>
      </div>

      {/* Modals */}
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
