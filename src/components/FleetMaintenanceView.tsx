import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, MaintenanceRecord } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getServiceStatus, formatINR, downloadCSV } from '../lib/utils';
import { CopyButton } from './CopyButton';
import { Wrench, Calendar, AlertTriangle, CheckCircle2, Clock, Plus, Bus as BusIcon, X, Check, Filter, Trash2, Download, FileSpreadsheet, Search } from 'lucide-react';
import { ReportsModal } from './ReportsModal';

interface FleetMaintenanceViewProps {
  owner: OwnerProfile;
}

export const FleetMaintenanceView: React.FC<FleetMaintenanceViewProps> = ({ owner }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Good' | 'Due' | 'Overdue'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  // Modal State for Logging Maintenance / Updating Service Date
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const [serviceType, setServiceType] = useState('Scheduled Preventive Service');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [mechanicShop, setMechanicShop] = useState('');
  const [notes, setNotes] = useState('');

  // Modal State for Adding New Bus to Fleet
  const [isAddBusModalOpen, setIsAddBusModalOpen] = useState(false);
  const [newRegNumber, setNewRegNumber] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newCapacity, setNewCapacity] = useState<number>(50);
  const [newRoute, setNewRoute] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newOnTime, setNewOnTime] = useState<number>(95);
  const [newFuelScore, setNewFuelScore] = useState<number>(90);
  const [newIncentiveCredit, setNewIncentiveCredit] = useState<number>(0);
  const [newNextServiceDue, setNewNextServiceDue] = useState('');

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (isLogModalOpen || isAddBusModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLogModalOpen, isAddBusModalOpen]);

  // Subscribe to buses and maintenance records in Firestore
  useEffect(() => {
    if (!owner.id) return;

    // Buses
    const busesQ = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsubBuses = onSnapshot(busesQ, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Bus);
      });
      setBuses(list);
    });

    // Maintenance
    const maintQ = query(collection(db, 'maintenance'), where('ownerId', '==', owner.id));
    const unsubMaint = onSnapshot(maintQ, (snapshot) => {
      const list: MaintenanceRecord[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as MaintenanceRecord);
      });
      list.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
      setMaintenanceRecords(list);
      setLoading(false);
    });

    return () => {
      unsubBuses();
      unsubMaint();
    };
  }, [owner.id]);

  const isSaaS = owner.planType === 'SaaS';

  const handleExportCSV = () => {
    const headers = [
      'Bus Registration',
      'Model',
      'Capacity',
      'Assigned Route',
      'Last Service Date',
      'Next Service Due',
      'Status'
    ];

    const rows = buses.map((b) => [
      b.regNumber,
      b.model,
      b.capacity,
      b.routeAssigned || 'Unassigned',
      b.lastServiceDate || 'N/A',
      b.nextServiceDue,
      getServiceStatus(b.nextServiceDue)
    ]);

    downloadCSV(`tranzit_fleet_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleOpenLogModal = (bus: Bus) => {
    setSelectedBus(bus);
    const today = new Date().toISOString().split('T')[0];
    setServiceDate(today);

    // Calculate default next due (3 months from today)
    const next = new Date();
    next.setMonth(next.getMonth() + 3);
    setNextDueDate(next.toISOString().split('T')[0]);

    setIsLogModalOpen(true);
  };

  // Submit maintenance log and update bus nextServiceDue in Firestore
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus) return;

    const mid = `m-${Date.now()}`;
    const newRecord: MaintenanceRecord = {
      id: mid,
      ownerId: owner.id,
      busId: selectedBus.id,
      busReg: selectedBus.regNumber,
      serviceType,
      serviceDate,
      nextDueDate,
      cost: Number(cost),
      mechanicShop,
      notes
    };

    await setDoc(doc(db, 'maintenance', mid), newRecord);

    await updateDoc(doc(db, 'buses', selectedBus.id), {
      lastServiceDate: serviceDate,
      nextServiceDue: nextDueDate,
      status: 'Active'
    });

    setIsLogModalOpen(false);
  };

  // Add New Bus Handler
  const handleAddNewBus = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBusId = `bus-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const busData: Bus = {
      id: newBusId,
      ownerId: owner.id,
      regNumber: newRegNumber,
      model: newModel,
      capacity: Number(newCapacity),
      routeAssigned: newRoute,
      lastServiceDate: todayStr,
      nextServiceDue: newNextServiceDue,
      status: 'Active',
      driverName: newDriverName,
      onTimePercent: Number(newOnTime),
      fuelEfficiencyScore: Number(newFuelScore),
      fuelIncentiveCredit: Number(newIncentiveCredit)
    };

    await setDoc(doc(db, 'buses', newBusId), busData);

    await updateDoc(doc(db, 'owners', owner.id), {
      activeBusesCount: buses.length + 1
    });

    setIsAddBusModalOpen(false);
    setNewRegNumber('KA 01 FA ' + Math.floor(1000 + Math.random() * 9000));
  };

  // Delete Bus Handler
  const handleDeleteBus = async (busId: string, regNum: string) => {
    if (!window.confirm(`Are you sure you want to remove bus ${regNum} from your fleet?`)) return;

    await deleteDoc(doc(db, 'buses', busId));

    await updateDoc(doc(db, 'owners', owner.id), {
      activeBusesCount: Math.max(0, buses.length - 1)
    });
  };

  // Filtered Buses
  const filteredBuses = buses.filter((bus) => {
    const status = getServiceStatus(bus.nextServiceDue);
    const matchesFilter = statusFilter === 'All' || status === statusFilter;
    const matchesSearch = !searchQuery || 
      bus.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bus.routeAssigned && bus.routeAssigned.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800/90 p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest mb-1 text-slate-500 dark:text-slate-400">
            <Wrench className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Fleet</span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            Fleet & Maintenance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-0.5">
            Vehicle maintenance logs and service schedules.
          </p>
        </div>

        {/* Right Actions: Search, Filter, Export & Add Bus */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bus..."
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Status Filter Toggle Pills */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-900/80 p-1 border border-slate-200 dark:border-slate-700 rounded-lg">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5" />
            {(['All', 'Good', 'Due', 'Overdue'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase transition-colors rounded-md cursor-pointer ${
                  statusFilter === st
                    ? 'bg-slate-900 dark:bg-amber-500 text-white dark:text-slate-950 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Export records as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
            title="Export PDF Report"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>PDF</span>
          </button>

          <button
            onClick={() => setIsAddBusModalOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400 dark:text-slate-950" />
            <span>Add Bus</span>
          </button>
        </div>
      </div>

      {/* Fleet Vehicles Table Card */}
      <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-900 dark:text-slate-100">
            Registered Vehicles ({filteredBuses.length})
          </span>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            Updated live
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Registration #</th>
                <th className="py-3 px-4">Bus Model & Capacity</th>
                <th className="py-3 px-4">Assigned Route</th>
                <th className="py-3 px-4">Last Service Date</th>
                <th className="py-3 px-4">Next Service Due</th>
                <th className="py-3 px-4">Service Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {filteredBuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-slate-500 font-mono">
                    No vehicles match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredBuses.map((bus) => {
                  const status = getServiceStatus(bus.nextServiceDue);

                  return (
                    <tr key={bus.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      {/* Registration */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900 dark:text-slate-100">
                        <div className="flex items-center space-x-1.5">
                          <span>{bus.regNumber}</span>
                          <CopyButton textToCopy={bus.regNumber} label={bus.regNumber} />
                        </div>
                      </td>

                      {/* Model & Seats */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">{bus.model}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{bus.capacity} Passengers</div>
                      </td>

                      {/* Route */}
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-sans">
                        {bus.routeAssigned || 'Unassigned'}
                      </td>

                      {/* Last Service */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {bus.lastServiceDate || 'N/A'}
                      </td>

                      {/* Next Service Due */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                        {bus.nextServiceDue}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md border inline-flex items-center space-x-1 ${
                          status === 'Good' ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/20' :
                          status === 'Due' ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/20' :
                          'bg-red-500/10 text-red-800 dark:text-red-300 border-red-500/20'
                        }`}>
                          {status === 'Good' && <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                          {status === 'Due' && <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />}
                          {status === 'Overdue' && <AlertTriangle className="w-3 h-3 text-red-600 dark:text-red-400" />}
                          <span>{status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenLogModal(bus)}
                            className="px-2.5 py-1 font-mono text-[11px] font-bold uppercase rounded-md transition-colors border flex items-center space-x-1 cursor-pointer bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700"
                          >
                            <Wrench className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                            <span>Log Service</span>
                          </button>

                          <button
                            onClick={() => handleDeleteBus(bus.id, bus.regNumber)}
                            className="p-1 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md transition-colors cursor-pointer"
                            title="Remove Bus from Fleet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance History Log */}
      <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800/90 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-mono uppercase font-bold text-slate-900 dark:text-slate-100 block">
              Service & Maintenance Audit Logs ({maintenanceRecords.length})
            </span>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">Firestore `maintenance` collection</span>
          </div>

          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold uppercase rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Export Report (PDF)</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-[11px] font-mono uppercase text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4">Service Date</th>
                <th className="py-3 px-4">Bus Registration</th>
                <th className="py-3 px-4">Service Performed</th>
                <th className="py-3 px-4">Garage / Workshop</th>
                <th className="py-3 px-4">Cost (₹)</th>
                <th className="py-3 px-4">Mechanic Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
              {maintenanceRecords.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {m.serviceDate}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-700 dark:text-amber-400">
                    {m.busReg}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                    {m.serviceType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-sans">
                    {m.mechanicShop || 'Tranzit Workshop'}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                    {formatINR(m.cost)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400 font-sans max-w-xs truncate">
                    {m.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Service Modal */}
      {isLogModalOpen && selectedBus && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 rounded-xl shadow-2xl animate-in fade-in transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-4">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Log Maintenance & Update Service Due
                </h3>
                <p className="text-xs font-mono text-amber-700 dark:text-amber-400 font-bold">
                  Bus: {selectedBus.regNumber} ({selectedBus.model})
                </p>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">
                  Service / Repair Title
                </label>
                <input
                  type="text"
                  required
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="e.g. Oil Change & Brake Pad Replacement"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Service Date (Performed)
                  </label>
                  <input
                    type="date"
                    required
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">
                    Next Service Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-950/30 font-bold text-amber-900 dark:text-amber-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Service Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Workshop / Mechanic</label>
                  <input
                    type="text"
                    required
                    value={mechanicShop}
                    onChange={(e) => setMechanicShop(e.target.value)}
                    placeholder="Workshop name"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-slate-400 mb-1">Mechanic Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                Next service due will update to <strong>{nextDueDate}</strong> for {selectedBus.regNumber}.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono uppercase font-bold rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold rounded-lg flex items-center space-x-1 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bus to Fleet Modal */}
      {isAddBusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121826] border border-slate-200 dark:border-slate-800 max-w-lg w-full max-h-[90vh] flex flex-col rounded-xl shadow-2xl animate-in fade-in overflow-hidden my-auto transition-colors">
            {/* Header */}
            <div className="bg-slate-900 dark:bg-[#0B0F17] text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0 border-b border-slate-800">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
                  <BusIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fleet</span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5">
                  Add Bus to Fleet
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBusModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewBus} className="flex flex-col flex-1 overflow-hidden text-slate-900 dark:text-slate-100">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
                {/* Registration & Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      required
                      value={newRegNumber}
                      onChange={(e) => setNewRegNumber(e.target.value)}
                      placeholder="e.g. KA 01 F 9090"
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Bus Model Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="e.g. Ashok Leyland Viking 52s"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Capacity & Assigned Route */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Seating Capacity
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={80}
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Assigned Route
                    </label>
                    <input
                      type="text"
                      required
                      value={newRoute}
                      onChange={(e) => setNewRoute(e.target.value)}
                      placeholder="e.g. Bengaluru → Mysuru Express"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Driver Name & Next Service Due */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Assigned Driver Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      placeholder="e.g. Prakash Rao"
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 dark:text-slate-300 font-bold mb-1">
                      Next Service Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newNextServiceDue}
                      onChange={(e) => setNewNextServiceDue(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-950/30 font-bold text-amber-900 dark:text-amber-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Driver Incentives & Performance */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg space-y-3">
                  <div className="text-xs font-mono font-bold uppercase text-amber-800 dark:text-amber-300 flex items-center space-x-1">
                    <span>Initial Driver Incentive Telemetry</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-800 dark:text-amber-300 font-bold mb-1">
                        On-Time %
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newOnTime}
                        onChange={(e) => setNewOnTime(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-800 dark:text-amber-300 font-bold mb-1">
                        Fuel Score
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newFuelScore}
                        onChange={(e) => setNewFuelScore(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-800 dark:text-amber-300 font-bold mb-1">
                        Perk Credit (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newIncentiveCredit}
                        onChange={(e) => setNewIncentiveCredit(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-amber-300 dark:border-amber-700 rounded-md bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-300"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 sm:px-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddBusModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold tracking-wider rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                  <span>Add Bus</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Maintenance Report Export Modal */}
      <ReportsModal
        owner={owner}
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        defaultReportType="maintenance"
      />
    </div>
  );
};
