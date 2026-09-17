import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, MaintenanceRecord } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getServiceStatus, formatINR } from '../lib/utils';
import { Wrench, Calendar, AlertTriangle, CheckCircle2, Clock, Plus, Edit2, Bus as BusIcon, X, Check, Filter, Trash2, ShieldCheck } from 'lucide-react';

interface FleetMaintenanceViewProps {
  owner: OwnerProfile;
}

export const FleetMaintenanceView: React.FC<FleetMaintenanceViewProps> = ({ owner }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Good' | 'Due' | 'Overdue'>('All');
  const [loading, setLoading] = useState(true);

  // Modal State for Logging Maintenance / Updating Service Date
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const [serviceType, setServiceType] = useState('Scheduled Preventive Service');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState('');
  const [cost, setCost] = useState<number>(12000);
  const [mechanicShop, setMechanicShop] = useState('Tranzit Central Fleet Workshop');
  const [notes, setNotes] = useState('Engine oil replaced, brake pad check & air filter cleaning.');

  // Modal State for Adding New Bus to Fleet
  const [isAddBusModalOpen, setIsAddBusModalOpen] = useState(false);
  const [newRegNumber, setNewRegNumber] = useState('KA 01 FA ' + Math.floor(1000 + Math.random() * 9000));
  const [newModel, setNewModel] = useState('Ashok Leyland Viking 52s');
  const [newCapacity, setNewCapacity] = useState<number>(52);
  const [newRoute, setNewRoute] = useState('Bengaluru → Mysuru Express');
  const [newDriverName, setNewDriverName] = useState('Prakash Rao');
  const [newOnTime, setNewOnTime] = useState<number>(95);
  const [newFuelScore, setNewFuelScore] = useState<number>(90);
  const [newIncentiveCredit, setNewIncentiveCredit] = useState<number>(2000);
  const [newNextServiceDue, setNewNextServiceDue] = useState('2026-11-15');

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

  // Open Service Log Modal for a bus
  const handleOpenLogModal = (bus: Bus) => {
    setSelectedBus(bus);
    setServiceDate(new Date().toISOString().split('T')[0]);
    
    // Auto calculate default next due date (+60 days)
    const next = new Date();
    next.setDate(next.getDate() + 60);
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

    // 1. Write maintenance entry
    await setDoc(doc(db, 'maintenance', mid), newRecord);

    // 2. Update bus document in Firestore (lastServiceDate, nextServiceDue, status)
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

    // 1. Create Bus document in Firestore
    await setDoc(doc(db, 'buses', newBusId), busData);

    // 2. Sync owner's activeBusesCount in Firestore
    await updateDoc(doc(db, 'owners', owner.id), {
      activeBusesCount: buses.length + 1
    });

    setIsAddBusModalOpen(false);
    // Reset random reg number generator for next time
    setNewRegNumber('KA 01 FA ' + Math.floor(1000 + Math.random() * 9000));
  };

  // Delete Bus Handler
  const handleDeleteBus = async (busId: string, regNum: string) => {
    if (!window.confirm(`Are you sure you want to remove bus ${regNum} from your fleet?`)) return;

    // 1. Delete Bus document from Firestore
    await deleteDoc(doc(db, 'buses', busId));

    // 2. Sync owner's activeBusesCount in Firestore
    await updateDoc(doc(db, 'owners', owner.id), {
      activeBusesCount: Math.max(0, buses.length - 1)
    });
  };

  // Filtered Buses
  const filteredBuses = buses.filter((bus) => {
    const status = getServiceStatus(bus.nextServiceDue);
    if (statusFilter === 'All') return true;
    return status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono uppercase tracking-widest mb-1 text-slate-600">
            <Wrench className="w-3.5 h-3.5" />
            <span>Vehicle Health & Maintenance Audit</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1F2C] tracking-tight">
            Fleet Vehicles & Service Schedules
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Service status badges are dynamically computed from service due dates. Update logs to recalculate health badges in Firestore.
          </p>
        </div>

        {/* Right Actions: Filter & Add Bus */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Status Filter Toggle Pills */}
          <div className="flex items-center space-x-1.5 bg-[#FBF9F5] p-1 border border-[#E8E4DC] rounded-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {(['All', 'Good', 'Due', 'Overdue'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-[11px] font-mono font-bold uppercase transition-colors rounded-xs ${
                  statusFilter === st
                    ? 'bg-[#1A1F2C] text-[#FBF9F5]'
                    : 'text-slate-600 hover:text-[#1A1F2C]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsAddBusModalOpen(true)}
            className="px-3.5 py-2 bg-[#1A1F2C] hover:bg-[#0F131D] text-white text-xs font-mono font-bold uppercase rounded-xs transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Bus to Fleet</span>
          </button>
        </div>
      </div>

      {/* Fleet Vehicles Table */}
      <div className="bg-white border border-[#E8E4DC] rounded-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DC] bg-[#FBF9F5] flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-700">
            Registered Vehicles ({filteredBuses.length})
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            Dynamic Badge Computation Engine
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] bg-[#FBF9F5] text-[11px] font-mono uppercase text-slate-500">
                <th className="py-3 px-4">Registration #</th>
                <th className="py-3 px-4">Bus Model & Capacity</th>
                <th className="py-3 px-4">Assigned Route</th>
                <th className="py-3 px-4">Last Service Date</th>
                <th className="py-3 px-4">Next Service Due</th>
                <th className="py-3 px-4">Service Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC] text-xs">
              {filteredBuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-mono">
                    No vehicles match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredBuses.map((bus) => {
                  const status = getServiceStatus(bus.nextServiceDue);

                  return (
                    <tr key={bus.id} className="hover:bg-[#FBF9F5]">
                      {/* Registration */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-[#1A1F2C]">
                        {bus.regNumber}
                      </td>

                      {/* Model & Seats */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#1A1F2C]">{bus.model}</div>
                        <div className="text-[10px] font-mono text-slate-500">{bus.capacity} Passengers</div>
                      </td>

                      {/* Route */}
                      <td className="py-3.5 px-4 text-slate-700 font-sans">
                        {bus.routeAssigned || 'Unassigned'}
                      </td>

                      {/* Last Service */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {bus.lastServiceDate || 'N/A'}
                      </td>

                      {/* Next Service Due */}
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1A1F2C]">
                        {bus.nextServiceDue}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-xs border inline-flex items-center space-x-1 ${
                          status === 'Good' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                          status === 'Due' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                          'bg-red-100 text-red-900 border-red-300'
                        }`}>
                          {status === 'Good' && <CheckCircle2 className="w-3 h-3 text-emerald-700" />}
                          {status === 'Due' && <Clock className="w-3 h-3 text-amber-700" />}
                          {status === 'Overdue' && <AlertTriangle className="w-3 h-3 text-red-700" />}
                          <span>{status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => handleOpenLogModal(bus)}
                            className={`px-3 py-1.5 font-mono text-[11px] font-bold uppercase rounded-xs transition-colors border flex items-center space-x-1 cursor-pointer ${
                              isSaaS
                                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-teal-50 hover:bg-teal-100 text-teal-900 border-teal-300'
                            }`}
                          >
                            <Wrench className="w-3 h-3" />
                            <span>Log Service</span>
                          </button>

                          <button
                            onClick={() => handleDeleteBus(bus.id, bus.regNumber)}
                            className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-xs transition-colors cursor-pointer"
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
      <div className="bg-white border border-[#E8E4DC] rounded-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DC] bg-[#FBF9F5] flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-700">
            Service & Maintenance Audit Logs ({maintenanceRecords.length})
          </span>
          <span className="text-[11px] font-mono text-slate-500">Firestore `maintenance` collection</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] bg-[#FBF9F5] text-[11px] font-mono uppercase text-slate-500">
                <th className="py-3 px-4">Service Date</th>
                <th className="py-3 px-4">Bus Registration</th>
                <th className="py-3 px-4">Service Performed</th>
                <th className="py-3 px-4">Garage / Workshop</th>
                <th className="py-3 px-4">Cost (₹)</th>
                <th className="py-3 px-4">Mechanic Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC] text-xs">
              {maintenanceRecords.map((m) => (
                <tr key={m.id} className="hover:bg-[#FBF9F5]">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#1A1F2C]">
                    {m.serviceDate}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-amber-900">
                    {m.busReg}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-[#1A1F2C]">
                    {m.serviceType}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 font-sans">
                    {m.mechanicShop || 'Tranzit Workshop'}
                  </td>
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                    {formatINR(m.cost)}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-sans max-w-xs truncate">
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
        <div className="fixed inset-0 z-50 bg-[#1A1F2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DC] max-w-lg w-full p-6 rounded-xs shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC] mb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#1A1F2C]">
                  Log Maintenance & Update Service Due
                </h3>
                <p className="text-xs font-mono text-amber-800 font-bold">
                  Bus: {selectedBus.regNumber} ({selectedBus.model})
                </p>
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">
                  Service / Repair Title
                </label>
                <input
                  type="text"
                  required
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="e.g. Oil Change & Brake Pad Replacement"
                  className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">
                    Service Date (Performed)
                  </label>
                  <input
                    type="date"
                    required
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">
                    Next Service Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-white font-bold text-amber-900 border-amber-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Service Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Workshop / Mechanic</label>
                  <input
                    type="text"
                    required
                    value={mechanicShop}
                    onChange={(e) => setMechanicShop(e.target.value)}
                    placeholder="Workshop name"
                    className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Mechanic Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div className="p-3 bg-[#FBF9F5] border border-[#E8E4DC] rounded-xs text-xs text-slate-600">
                Submitting this log will update <strong>{selectedBus.regNumber}</strong>'s Next Due Date to <strong>{nextDueDate}</strong> and instantly recalculate its status badge in Firestore.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E4DC] text-xs font-mono uppercase font-bold rounded-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1A1F2C] hover:bg-[#0F131D] text-white text-xs font-mono uppercase font-bold rounded-xs flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Update Firestore Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bus to Fleet Modal */}
      {isAddBusModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1F2C]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white border border-[#E8E4DC] max-w-lg w-full max-h-[90vh] flex flex-col rounded-xs shadow-2xl animate-in fade-in overflow-hidden my-auto">
            
            {/* Header */}
            <div className="bg-[#1A1F2C] text-white p-4 sm:p-5 flex items-center justify-between flex-shrink-0 border-b border-[#1A1F2C]">
              <div>
                <div className="flex items-center space-x-2 text-xs font-mono text-amber-400 uppercase tracking-widest">
                  <BusIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Fleet Vehicle Enrollment</span>
                </div>
                <h3 className="text-base sm:text-lg font-extrabold tracking-tight mt-0.5">
                  Enroll New Bus into Active Fleet
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBusModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xs transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddNewBus} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin">
                
                {/* Registration & Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                      Registration Number
                    </label>
                    <input
                      type="text"
                      required
                      value={newRegNumber}
                      onChange={(e) => setNewRegNumber(e.target.value)}
                      placeholder="e.g. KA 01 F 9090"
                      className="w-full px-3 py-2 text-xs font-mono font-bold border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                      Bus Model Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newModel}
                      onChange={(e) => setNewModel(e.target.value)}
                      placeholder="e.g. Ashok Leyland Viking 52s"
                      className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                    />
                  </div>
                </div>

                {/* Capacity & Assigned Route */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                      Seating Capacity
                    </label>
                    <input
                      type="number"
                      required
                      min={10}
                      max={80}
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                      Assigned Route
                    </label>
                    <input
                      type="text"
                      required
                      value={newRoute}
                      onChange={(e) => setNewRoute(e.target.value)}
                      placeholder="e.g. Bengaluru → Mysuru Express"
                      className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                    />
                  </div>
                </div>

                {/* Driver Name & Next Service Due */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                      Assigned Driver Name
                    </label>
                    <input
                      type="text"
                      required
                      value={newDriverName}
                      onChange={(e) => setNewDriverName(e.target.value)}
                      placeholder="e.g. Prakash Rao"
                      className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                      Next Service Due Date
                    </label>
                    <input
                      type="date"
                      required
                      value={newNextServiceDue}
                      onChange={(e) => setNewNextServiceDue(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-white font-bold text-amber-900 border-amber-300 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Driver Incentives & Performance */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xs space-y-3">
                  <div className="text-xs font-mono font-bold uppercase text-amber-950 flex items-center space-x-1">
                    <span>Initial Driver Incentive Metrics (Gemini AI)</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-900 font-bold mb-1">
                        On-Time %
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newOnTime}
                        onChange={(e) => setNewOnTime(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-amber-300 rounded-xs bg-white text-emerald-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-900 font-bold mb-1">
                        Fuel Score
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={newFuelScore}
                        onChange={(e) => setNewFuelScore(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-amber-300 rounded-xs bg-white text-teal-900"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-900 font-bold mb-1">
                        Perk Credit (₹)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={newIncentiveCredit}
                        onChange={(e) => setNewIncentiveCredit(Number(e.target.value))}
                        className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-amber-300 rounded-xs bg-white text-amber-900"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Pinned Action Buttons */}
              <div className="p-4 sm:px-6 bg-[#FBF9F5] border-t border-[#E8E4DC] flex items-center justify-end space-x-3 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddBusModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono uppercase text-slate-600 hover:text-slate-900 border border-transparent hover:border-[#E8E4DC] rounded-xs cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#1A1F2C] hover:bg-[#0F131D] text-white text-xs font-mono uppercase font-bold tracking-wider rounded-xs transition-colors flex items-center space-x-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Enroll Bus & Sync Fleet</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
