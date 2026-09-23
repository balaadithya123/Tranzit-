import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, RouteItem, Driver, DriverStatus } from '../types';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, Edit2, ShieldCheck, Trash2, AlertCircle } from 'lucide-react';
import { getLicenseValidityInfo } from '../lib/utils';

interface EditDriverModalProps {
  owner: OwnerProfile;
  driver: Driver | null;
  buses: Bus[];
  routes: RouteItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const EditDriverModal: React.FC<EditDriverModalProps> = ({
  driver,
  buses,
  routes,
  isOpen,
  onClose
}) => {
  const [name, setName] = useState(driver?.name || '');
  const [employeeId, setEmployeeId] = useState(driver?.employeeId || '');
  const [phone, setPhone] = useState(driver?.phone || '');
  const [emergencyContact, setEmergencyContact] = useState(driver?.emergencyContact || '');
  const [bloodGroup, setBloodGroup] = useState(driver?.bloodGroup || 'O+');
  const [status, setStatus] = useState<DriverStatus>(driver?.status || 'Active');
  
  // License fields
  const [licenseNumber, setLicenseNumber] = useState(driver?.licenseNumber || '');
  const [licenseType, setLicenseType] = useState(driver?.licenseType || 'Heavy Commercial Transport (HMV/HTV)');
  const [badgeNumber, setBadgeNumber] = useState(driver?.badgeNumber || '');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState(driver?.licenseExpiryDate || '');
  
  // Assignment fields
  const [assignedBusId, setAssignedBusId] = useState(driver?.assignedBusId || '');
  const [assignedRouteId, setAssignedRouteId] = useState(driver?.assignedRouteId || '');
  const [shiftTiming, setShiftTiming] = useState(driver?.shiftTiming || 'Morning Shift (06:00 - 14:30)');
  const [experienceYears, setExperienceYears] = useState(driver?.experienceYears || 5);
  const [safetyScore, setSafetyScore] = useState(driver?.safetyScore ?? 95);
  const [notes, setNotes] = useState(driver?.notes || '');

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state if driver changes
  useEffect(() => {
    if (driver && isOpen) {
      setName(driver.name);
      setEmployeeId(driver.employeeId);
      setPhone(driver.phone);
      setEmergencyContact(driver.emergencyContact || '');
      setBloodGroup(driver.bloodGroup || 'O+');
      setStatus(driver.status);
      setLicenseNumber(driver.licenseNumber);
      setLicenseType(driver.licenseType);
      setBadgeNumber(driver.badgeNumber || '');
      setLicenseExpiryDate(driver.licenseExpiryDate);
      setAssignedBusId(driver.assignedBusId || '');
      setAssignedRouteId(driver.assignedRouteId || '');
      setShiftTiming(driver.shiftTiming || 'Morning Shift (06:00 - 14:30)');
      setExperienceYears(driver.experienceYears || 5);
      setSafetyScore(driver.safetyScore ?? 95);
      setNotes(driver.notes || '');
      setError(null);
    }
  }, [driver, isOpen]);

  if (!isOpen || !driver) return null;

  const validityInfo = getLicenseValidityInfo(licenseExpiryDate);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Driver full name is required.');
      return;
    }
    if (!licenseNumber.trim()) {
      setError('License number is required.');
      return;
    }
    if (!licenseExpiryDate) {
      setError('License expiry date is required.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedBus = buses.find(b => b.id === assignedBusId);
      const selectedRoute = routes.find(r => r.id === assignedRouteId);

      const updatedFields: Partial<Driver> = {
        name: name.trim(),
        employeeId: employeeId.trim(),
        phone: phone.trim(),
        emergencyContact: emergencyContact.trim(),
        bloodGroup,
        status,
        licenseNumber: licenseNumber.trim().toUpperCase(),
        licenseType,
        badgeNumber: badgeNumber.trim().toUpperCase(),
        licenseExpiryDate,
        assignedBusId: assignedBusId || '',
        assignedBusReg: selectedBus ? selectedBus.regNumber : (assignedBusId ? 'Assigned Vehicle' : 'Standby / Relief Pool'),
        assignedRouteId: assignedRouteId || '',
        assignedRouteName: selectedRoute ? selectedRoute.routeName : (assignedRouteId ? 'Custom Route' : 'All Routes (Standby)'),
        shiftTiming,
        experienceYears: Number(experienceYears) || 0,
        safetyScore: Number(safetyScore) || 95,
        notes: notes.trim()
      };

      await updateDoc(doc(db, 'drivers', driver.id), updatedFields);

      // Also update assigned bus's driverName
      if (selectedBus) {
        try {
          await updateDoc(doc(db, 'buses', selectedBus.id), {
            driverName: name.trim()
          });
        } catch (busErr) {
          console.warn("Could not sync bus driverName:", busErr);
        }
      }

      onClose();
    } catch (err: any) {
      console.error("Error updating driver:", err);
      setError(err?.message || 'Failed to update driver details.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to remove ${driver.name} (${driver.employeeId}) from the driver roster?`)) {
      return;
    }

    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'drivers', driver.id));
      onClose();
    } catch (err: any) {
      console.error("Error deleting driver:", err);
      setError(err?.message || 'Failed to delete driver record.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 w-full max-w-2xl rounded-xl shadow-2xl my-8 overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-neutral-900 text-white flex items-center justify-between border-b border-slate-800 dark:border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold uppercase font-mono tracking-wide">
                  Edit Pilot: {driver.name}
                </h2>
                <span className="px-1.5 py-0.5 bg-slate-700 dark:bg-neutral-800 text-amber-300 font-mono text-xs rounded">
                  {driver.employeeId}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 dark:text-neutral-400 font-sans">
                Update commercial driving license, route assignments, and duty status.
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

        {/* License Validity Indicator Strip */}
        <div className={`px-6 py-2.5 text-xs font-mono flex items-center justify-between border-b ${
          validityInfo.status === 'Expired'
            ? 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
            : validityInfo.status === 'Expiring Soon'
            ? 'bg-amber-500/10 text-amber-800 dark:text-amber-400 border-amber-500/20'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
        }`}>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4" />
            <span className="font-bold uppercase">Commercial DL Status: {validityInfo.status}</span>
            <span>({validityInfo.label})</span>
          </div>
          <span className="text-[11px] font-sans">DL: {licenseNumber}</span>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdate} className="p-6 space-y-5">
          {/* Section 1: Identification & Contact */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-neutral-800 mb-3">
              <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-neutral-300">
                1. Driver Identification & Operational Duty
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Employee ID
                </label>
                <input
                  type="text"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Operational Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as DriverStatus)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none font-mono"
                >
                  <option value="Active">Active (On Regular Duty)</option>
                  <option value="Relief">Relief / Standby Pool</option>
                  <option value="On Leave">On Approved Leave</option>
                  <option value="Off Duty">Off Duty / Rest Day</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Blood Group
                </label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none font-mono"
                >
                  <option value="A+">A Positive (A+)</option>
                  <option value="A-">A Negative (A-)</option>
                  <option value="B+">B Positive (B+)</option>
                  <option value="B-">B Negative (B-)</option>
                  <option value="O+">O Positive (O+)</option>
                  <option value="O-">O Negative (O-)</option>
                  <option value="AB+">AB Positive (AB+)</option>
                  <option value="AB-">AB Negative (AB-)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: License Validity & Renewal */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-neutral-800 mb-3">
              <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-neutral-300">
                2. Commercial Driving License (DL) & Compliance
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  DL Number *
                </label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono uppercase text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  PSV Badge Number
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono uppercase text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  License Expiry Date *
                </label>
                <input
                  type="date"
                  required
                  value={licenseExpiryDate}
                  onChange={(e) => setLicenseExpiryDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  License Type / Endorsement
                </label>
                <input
                  type="text"
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Route & Bus Assignment */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-neutral-800 mb-3">
              <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-neutral-300">
                3. Associated Route & Fleet Vehicle Assignment
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Assigned Bus Registration
                </label>
                <select
                  value={assignedBusId}
                  onChange={(e) => setAssignedBusId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none font-mono"
                >
                  <option value="">-- No Bus (Relief / Standby Pool) --</option>
                  {buses.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.regNumber} ({b.model}) - {b.status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Assigned Route
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
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Duty Shift Timing
                </label>
                <input
                  type="text"
                  value={shiftTiming}
                  onChange={(e) => setShiftTiming(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Safety Rating Score (0-100)
                </label>
                <input
                  type="number"
                  min="50"
                  max="100"
                  value={safetyScore}
                  onChange={(e) => setSafetyScore(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Internal Operational Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || submitting}
              className="px-3.5 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-neutral-800 border border-transparent hover:border-red-200 text-xs font-mono uppercase font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{deleting ? 'Removing...' : 'Delete Driver'}</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting || deleting}
                className="px-4 py-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono uppercase font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || deleting}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold tracking-wider rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400 dark:text-slate-950" />
                <span>{submitting ? 'Updating...' : 'Save Driver Changes'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
