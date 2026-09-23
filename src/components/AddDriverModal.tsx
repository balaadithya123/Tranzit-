import React, { useState } from 'react';
import { OwnerProfile, Bus, RouteItem, Driver, DriverStatus } from '../types';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { X, UserPlus, AlertCircle } from 'lucide-react';

interface AddDriverModalProps {
  owner: OwnerProfile;
  buses: Bus[];
  routes: RouteItem[];
  isOpen: boolean;
  onClose: () => void;
}

export const AddDriverModal: React.FC<AddDriverModalProps> = ({
  owner,
  buses,
  routes,
  isOpen,
  onClose
}) => {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState(`DRV-${Math.floor(100 + Math.random() * 900)}`);
  const [phone, setPhone] = useState('+91 ');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [status, setStatus] = useState<DriverStatus>('Active');
  
  // License fields
  const [licenseNumber, setLicenseNumber] = useState('');
  const [licenseType, setLicenseType] = useState('Heavy Commercial Transport (HMV/HTV)');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  
  // Assignment fields
  const [assignedBusId, setAssignedBusId] = useState('');
  const [assignedRouteId, setAssignedRouteId] = useState('');
  const [shiftTiming, setShiftTiming] = useState('Morning Shift (06:00 - 14:30)');
  const [experienceYears, setExperienceYears] = useState(5);
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please enter the driver full name.');
      return;
    }
    if (!licenseNumber.trim()) {
      setError('Commercial Driving License (DL) Number is mandatory.');
      return;
    }
    if (!licenseExpiryDate) {
      setError('License expiry date is required for compliance tracking.');
      return;
    }

    setSubmitting(true);
    try {
      const newDriverId = `drv-${Date.now()}`;
      
      const selectedBus = buses.find(b => b.id === assignedBusId);
      const selectedRoute = routes.find(r => r.id === assignedRouteId);

      const newDriver: Driver = {
        id: newDriverId,
        ownerId: owner.id,
        employeeId: employeeId.trim() || `DRV-${Date.now().toString().slice(-4)}`,
        name: name.trim(),
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
        joiningDate: joiningDate || new Date().toISOString().split('T')[0],
        safetyScore: 95,
        tripsCompleted: 0,
        notes: notes.trim(),
        createdAt: new Date().toISOString()
      };

      // 1. Save to Firestore drivers collection
      await setDoc(doc(db, 'drivers', newDriverId), newDriver);

      // 2. If a bus was assigned, optionally update the bus document's driverName
      if (selectedBus) {
        try {
          await updateDoc(doc(db, 'buses', selectedBus.id), {
            driverName: newDriver.name
          });
        } catch (busErr) {
          console.warn("Could not update bus with driver name:", busErr);
        }
      }

      onClose();
    } catch (err: any) {
      console.error("Error creating driver:", err);
      setError(err?.message || 'Failed to enroll driver. Please verify permissions.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 w-full max-w-2xl rounded-xl shadow-2xl my-8 overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 dark:bg-neutral-900 text-white flex items-center justify-between border-b border-slate-800 dark:border-neutral-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold uppercase font-mono tracking-wide">
                Enroll Driver Profile
              </h2>
              <p className="text-[11px] text-slate-300 dark:text-neutral-400 font-sans">
                Add certified driver, verify commercial DL validity, and link route assignment.
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

        {/* Error notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-xs rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section 1: Personal & Employment Details */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-neutral-800 mb-3">
              <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-neutral-300">
                1. Driver Identification & Contact
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Driver Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Employee / Pilot ID *
                </label>
                <input
                  type="text"
                  required
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  placeholder="DRV-105"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Mobile Number *
                </label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98450 12345"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Emergency Contact & Relation
                </label>
                <input
                  type="text"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="+91 98450 88710 (Spouse)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
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

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Roster Operational Status
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
            </div>
          </div>

          {/* Section 2: Commercial License & Compliance */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-neutral-800 mb-3">
              <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-neutral-300">
                2. Commercial Driving License & PSV Badge
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  License Number (DL) *
                </label>
                <input
                  type="text"
                  required
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. KA01 20180004921"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono uppercase text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  License Category / Authorization
                </label>
                <select
                  value={licenseType}
                  onChange={(e) => setLicenseType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                >
                  <option value="Heavy Commercial Transport (HMV/HTV)">Heavy Commercial Transport (HMV/HTV)</option>
                  <option value="Heavy Passenger Commercial (HMV/PSV)">Heavy Passenger Commercial (HMV/PSV)</option>
                  <option value="Heavy Multi-Axle Certified (Volvo/Scania)">Heavy Multi-Axle Certified (Volvo/Scania)</option>
                  <option value="Medium Commercial Transport (MMV)">Medium Commercial Transport (MMV)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  PSV Badge Number
                </label>
                <input
                  type="text"
                  value={badgeNumber}
                  onChange={(e) => setBadgeNumber(e.target.value)}
                  placeholder="e.g. KA-PSV-8492"
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
            </div>
          </div>

          {/* Section 3: Route & Bus Assignment */}
          <div>
            <div className="flex items-center space-x-2 pb-2 border-b border-slate-200 dark:border-neutral-800 mb-3">
              <span className="text-xs font-mono uppercase font-bold text-slate-700 dark:text-neutral-300">
                3. Operational Assignment & Experience
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Assigned Bus Vehicle
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
                  placeholder="e.g. Morning Shift (06:00 - 14:30)"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Years of Commercial Experience
                </label>
                <input
                  type="number"
                  min="0"
                  max="45"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm font-mono text-slate-800 dark:text-neutral-100 rounded-lg outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-mono text-slate-600 dark:text-neutral-400 uppercase mb-1">
                  Pilot Operational Notes & Certifications
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Hill terrain certified, hill driving endorsement, badge verification notes..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 focus:border-amber-500 dark:focus:border-amber-400 text-sm text-slate-800 dark:text-neutral-100 rounded-lg outline-none resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-neutral-800 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono uppercase font-bold rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold tracking-wider rounded-lg transition-colors flex items-center space-x-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              <span>{submitting ? 'Enrolling Driver...' : 'Enroll Driver & Save'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
