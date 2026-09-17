import React, { useState, useEffect } from 'react';
import { OwnerProfile, RouteItem } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateFare, formatINR } from '../lib/utils';
import { Plus, Edit2, Trash2, Ticket, MapPin, X, Check } from 'lucide-react';

interface FaresRoutesViewProps {
  owner: OwnerProfile;
}

export const FaresRoutesView: React.FC<FaresRoutesViewProps> = ({ owner }) => {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit Route
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);

  // Form Fields
  const [routeName, setRouteName] = useState('');
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [distanceKm, setDistanceKm] = useState<number>(100);
  const [fixedCharge, setFixedCharge] = useState<number>(40);
  const [ratePerKm, setRatePerKm] = useState<number>(2.5);
  const [tripsPerDay, setTripsPerDay] = useState<number>(4);

  // Subscribe to routes in Firestore
  useEffect(() => {
    if (!owner.id) return;

    const q = query(collection(db, 'routes'), where('ownerId', '==', owner.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: RouteItem[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as RouteItem);
      });
      setRoutes(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [owner.id]);

  // Compute live preview fare for modal form whenever inputs change
  const liveFormFare = calculateFare(fixedCharge, distanceKm, ratePerKm);

  // Open modal for Create or Edit
  const handleOpenModal = (routeToEdit?: RouteItem) => {
    if (routeToEdit) {
      setEditingRoute(routeToEdit);
      setRouteName(routeToEdit.routeName);
      setOrigin(routeToEdit.origin);
      setDestination(routeToEdit.destination);
      setDistanceKm(routeToEdit.distanceKm);
      setFixedCharge(routeToEdit.fixedCharge);
      setRatePerKm(routeToEdit.ratePerKm || 2.5);
      setTripsPerDay(routeToEdit.tripsPerDay || 4);
    } else {
      setEditingRoute(null);
      const hubCity = owner.city || 'Bengaluru';
      setRouteName(`${hubCity} Express Line`);
      setOrigin(`${hubCity} Central Terminal`);
      setDestination('Mysuru KSRTC Bus Stand');
      setDistanceKm(120);
      setFixedCharge(40);
      setRatePerKm(2.5);
      setTripsPerDay(4);
    }
    setIsModalOpen(true);
  };

  // Save Route to Firestore
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const routeId = editingRoute ? editingRoute.id : `route-${Date.now()}`;
    const computed = calculateFare(fixedCharge, distanceKm, ratePerKm);

    const routeData: RouteItem = {
      id: routeId,
      ownerId: owner.id,
      routeName,
      origin,
      destination,
      distanceKm: Number(distanceKm),
      fixedCharge: Number(fixedCharge),
      ratePerKm: Number(ratePerKm),
      computedFare: computed,
      tripsPerDay: Number(tripsPerDay)
    };

    await setDoc(doc(db, 'routes', routeId), routeData);
    setIsModalOpen(false);
  };

  // Delete route
  const handleDeleteRoute = async (routeId: string) => {
    if (confirm("Are you sure you want to remove this route?")) {
      await deleteDoc(doc(db, 'routes', routeId));
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Title Bar */}
      <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-800 uppercase tracking-widest mb-1">
            <Ticket className="w-3.5 h-3.5" />
            <span>SaaS Fare Engine</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1F2C] tracking-tight">
            Fares & Routes Management
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Fare formula: <code className="font-mono bg-amber-50 text-amber-900 px-1 py-0.5 rounded border border-amber-200">Fare = (Distance × Rate/KM) + Base Fixed Charge</code>.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-xs transition-colors flex items-center space-x-2 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Route</span>
        </button>
      </div>

      {/* Routes Table */}
      <div className="bg-white border border-[#E8E4DC] rounded-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DC] bg-[#FBF9F5] flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-700">
            Active Configured Routes ({routes.length})
          </span>
          <span className="text-[11px] font-mono text-amber-800 bg-amber-100 px-2 py-0.5 rounded-xs border border-amber-300">
            Realtime Firestore Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E8E4DC] bg-[#FBF9F5] text-[11px] font-mono uppercase text-slate-500">
                <th className="py-3 px-4">Route Name & Terminals</th>
                <th className="py-3 px-4">Distance (KM)</th>
                <th className="py-3 px-4">Rate / KM (₹)</th>
                <th className="py-3 px-4">Base Fixed Charge (₹)</th>
                <th className="py-3 px-4">Computed Ticket Fare</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E4DC] text-xs">
              {routes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">
                    No routes found. Click "Add New Route" to configure your first route.
                  </td>
                </tr>
              ) : (
                routes.map((route) => {
                  const fare = calculateFare(route.fixedCharge, route.distanceKm, route.ratePerKm || 2.5);
                  return (
                    <tr key={route.id} className="hover:bg-[#FBF9F5] transition-colors">
                      {/* Route Name & Terminals */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#1A1F2C] text-sm">
                          {route.routeName}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span>{route.origin} → {route.destination}</span>
                        </div>
                      </td>

                      {/* Distance */}
                      <td className="py-3.5 px-4 font-mono font-medium text-[#1A1F2C]">
                        {route.distanceKm} KM
                      </td>

                      {/* Rate per KM */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                        ₹{route.ratePerKm || 2.5}/km
                      </td>

                      {/* Fixed Charge */}
                      <td className="py-3.5 px-4 font-mono font-medium text-[#1A1F2C]">
                        {formatINR(route.fixedCharge)}
                      </td>

                      {/* Computed Fare */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-base text-amber-900">
                          {formatINR(fare)}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ({route.distanceKm}km × ₹{route.ratePerKm || 2.5}) + ₹{route.fixedCharge}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(route)}
                          className="p-1.5 text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-xs border border-transparent hover:border-amber-200 transition-colors"
                          title="Edit Route & Pricing"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-xs border border-transparent hover:border-red-200 transition-colors"
                          title="Delete Route"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Route Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#1A1F2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DC] max-w-lg w-full p-6 rounded-xs shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DC]">
              <h3 className="text-base font-extrabold text-[#1A1F2C]">
                {editingRoute ? 'Edit Route & Configure Pricing' : 'Add New Route'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 mb-1">
                  Route Title
                </label>
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="e.g. Bengaluru → Mysuru Express"
                  className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5] focus:outline-none focus:border-[#1A1F2C]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Origin Terminal</label>
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Mysuru"
                    className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Distance (KM)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Rate / KM (₹)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    min={0.1}
                    value={ratePerKm}
                    onChange={(e) => setRatePerKm(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 mb-1">Base Fixed (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={fixedCharge}
                    onChange={(e) => setFixedCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                  />
                </div>
              </div>

              {/* Live Recalculated Fare Banner */}
              <div className="p-4 bg-[#1A1F2C] text-[#FBF9F5] rounded-xs flex items-center justify-between font-mono">
                <div>
                  <span className="text-[10px] uppercase text-slate-400 block">Computed Ticket Fare (Live)</span>
                  <span className="text-xs text-amber-300">
                    ({distanceKm} KM × ₹{ratePerKm}/km) + ₹{fixedCharge} fixed
                  </span>
                </div>
                <span className="text-2xl font-bold text-amber-400">
                  {formatINR(liveFormFare)}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E4DC] text-slate-700 text-xs font-mono uppercase font-bold rounded-xs hover:bg-[#FBF9F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono uppercase font-bold rounded-xs transition-colors flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Route to Firestore</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
