import React, { useState } from 'react';
import { Driver, Bus, RouteItem } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

interface AssignRouteModalProps {
  driver: Driver | null;
  buses: Bus[];
  routes: RouteItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const AssignRouteModal: React.FC<AssignRouteModalProps> = ({
  driver,
  buses,
  routes,
  isOpen,
  onClose
}) => {
  const [assignedBusId, setAssignedBusId] = useState(driver?.assignedBusId || '');
  const [assignedRouteId, setAssignedRouteId] = useState(driver?.assignedRouteId || '');
  const [shiftTiming, setShiftTiming] = useState(driver?.shiftTiming || 'Morning Shift (06:00 - 14:30)');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (driver && isOpen) {
      setAssignedBusId(driver.assignedBusId || '');
      setAssignedRouteId(driver.assignedRouteId || '');
      setShiftTiming(driver.shiftTiming || 'Morning Shift (06:00 - 14:30)');
      setError(null);
      setSubmitting(false);
    }
  }, [driver, isOpen]);

  if (!isOpen || !driver) return null;

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const selectedBus = buses.find(b => b.id === assignedBusId);
      const selectedRoute = routes.find(r => r.id === assignedRouteId);

      const updatedData: Partial<Driver> = {
        assignedBusId: assignedBusId || '',
        assignedBusReg: selectedBus ? selectedBus.regNumber : (assignedBusId ? 'Assigned Vehicle' : 'Standby / Relief Pool'),
        assignedRouteId: assignedRouteId || '',
        assignedRouteName: selectedRoute ? selectedRoute.routeName : (assignedRouteId ? 'Custom Route' : 'All Routes (Standby)'),
        shiftTiming: shiftTiming.trim()
      };

      await updateDoc(doc(db, 'drivers', driver.id), updatedData);

      // Sync bus driverName
      if (selectedBus) {
        try {
          await updateDoc(doc(db, 'buses', selectedBus.id), {
            driverName: driver.name
          });
        } catch (busErr) {
          console.warn("Could not sync bus driverName:", busErr);
        }
      }

      onClose();
    } catch (err: any) {
      console.error("Error updating assignment:", err);
      setError(err?.message || 'Failed to update route/bus assignment.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 w-full max-w-md rounded-xl shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-900 dark:bg-neutral-900 text-white flex items-center justify-between border-b border-slate-800 dark:border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase font-mono tracking-wide">
                Assign Route & Fleet Bus
              </h2>
              <p className="text-[11px] text-slate-300 dark:text-neutral-400 font-sans">
                {driver.name} ({driver.employeeId})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-2.5 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAssign} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 uppercase font-bold mb-1">
              Select Bus Vehicle
            </label>
            <select
              value={assignedBusId}
              onChange={(e) => setAssignedBusId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none font-mono"
            >
              <option value="">-- No Bus (Relief / Standby Pool) --</option>
              {buses.map(b => (
                <option key={b.id} value={b.id}>
                  {b.regNumber} ({b.model}) — {b.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 uppercase font-bold mb-1">
              Select Operating Route
            </label>
            <select
              value={assignedRouteId}
              onChange={(e) => setAssignedRouteId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
            >
              <option value="">-- Standby across all routes --</option>
              {routes.map(r => {
                const permitTag = r.permitType === 'stage_carriage' 
                  ? '[STA Mandated]' 
                  : r.permitType === 'contract_carriage'
                  ? '[Contract]'
                  : r.permitType === 'tourist_permit'
                  ? '[Tourist]'
                  : '[Unverified]';
                return (
                  <option key={r.id} value={r.id}>
                    {r.routeName} ({r.distanceKm} km) {permitTag}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-slate-700 dark:text-neutral-300 uppercase font-bold mb-1">
              Shift Schedule & Timing
            </label>
            <input
              type="text"
              value={shiftTiming}
              onChange={(e) => setShiftTiming(e.target.value)}
              placeholder="e.g. Night Express (21:00 - 06:00)"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono uppercase font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              <span>{submitting ? 'Assigning...' : 'Save Assignment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
