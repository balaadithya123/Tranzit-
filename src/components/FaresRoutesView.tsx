import React, { useState, useEffect } from 'react';
import { OwnerProfile, RouteItem } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateFare, formatINR } from '../lib/utils';
import { CopyButton } from './CopyButton';
import { Plus, Edit2, Trash2, Ticket, MapPin, X, Check, Search, Calculator } from 'lucide-react';

interface FaresRoutesViewProps {
  owner: OwnerProfile;
}

export const FaresRoutesView: React.FC<FaresRoutesViewProps> = ({ owner }) => {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredRoutes = routes.filter(r => 
    r.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(r.distanceKm).includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Editorial Title Bar */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1.5 font-bold">
            <Ticket className="w-3.5 h-3.5" />
            <span>SaaS Dynamic Fare Engine</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight font-sans">
            Fares & Routes Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-0.5">
            Dynamic pricing formula: <code className="font-mono bg-amber-50 dark:bg-neutral-900 text-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-200 dark:border-neutral-700 text-[11px]">Fare = (Distance × Rate/KM) + Base Fixed Charge</code>
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center space-x-2 self-start sm:self-auto cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Route</span>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#121214] p-4 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search routes by city, terminal, or distance..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-sans"
          />
        </div>
        <div className="text-xs font-mono text-slate-500 dark:text-neutral-400">
          Showing <span className="font-bold text-slate-900 dark:text-neutral-100">{filteredRoutes.length}</span> of {routes.length} routes
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-neutral-200">
            Active Configured Routes ({routes.length})
          </span>
          <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800/60 font-semibold">
            Realtime Firestore Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/60 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Route Name & Terminals</th>
                <th className="py-3 px-4">Distance (KM)</th>
                <th className="py-3 px-4">Rate / KM (₹)</th>
                <th className="py-3 px-4">Base Fixed Charge (₹)</th>
                <th className="py-3 px-4">Computed Ticket Fare</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-neutral-500 font-mono">
                    Loading route manifests...
                  </td>
                </tr>
              ) : filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-neutral-500 font-mono">
                    {searchQuery ? `No routes matching "${searchQuery}"` : 'No routes found. Click "Add New Route" to configure your first route.'}
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((route) => {
                  const fare = calculateFare(route.fixedCharge, route.distanceKm, route.ratePerKm || 2.5);
                  return (
                    <tr key={route.id} className="hover:bg-slate-50/80 dark:hover:bg-neutral-900/50 transition-colors">
                      {/* Route Name & Terminals */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-neutral-100 text-sm flex items-center space-x-2">
                          <span>{route.routeName}</span>
                          <CopyButton textToCopy={route.routeName} label={route.routeName} />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400 dark:text-neutral-500 flex-shrink-0" />
                          <span>{route.origin} → {route.destination}</span>
                        </div>
                      </td>

                      {/* Distance */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-neutral-100">
                        {route.distanceKm} KM
                      </td>

                      {/* Rate per KM */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 dark:text-neutral-300">
                        ₹{route.ratePerKm || 2.5}/km
                      </td>

                      {/* Fixed Charge */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-neutral-100">
                        {formatINR(route.fixedCharge)}
                      </td>

                      {/* Computed Fare */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-base text-amber-700 dark:text-amber-400">
                          {formatINR(fare)}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                          ({route.distanceKm}km × ₹{route.ratePerKm || 2.5}) + ₹{route.fixedCharge}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenModal(route)}
                          className="p-1.5 text-slate-600 dark:text-neutral-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-lg border border-transparent hover:border-amber-200 dark:hover:border-neutral-700 transition-colors cursor-pointer"
                          title="Edit Route & Pricing"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-neutral-800 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-neutral-700 transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 max-w-lg w-full p-6 rounded-xl shadow-xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-neutral-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-neutral-800">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-neutral-100 font-sans">
                {editingRoute ? 'Edit Route & Configure Pricing' : 'Add New Route'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">
                  Route Title
                </label>
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="e.g. Bengaluru → Mysuru Express"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Origin Terminal</label>
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Mysuru"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Distance (KM)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Rate / KM (₹)</label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    min={0.1}
                    value={ratePerKm}
                    onChange={(e) => setRatePerKm(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Base Fixed (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={fixedCharge}
                    onChange={(e) => setFixedCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Live Recalculated Fare Banner */}
              <div className="p-4 bg-black text-white rounded-lg flex items-center justify-between font-mono border border-neutral-800">
                <div>
                  <span className="text-[10px] uppercase text-neutral-400 block font-bold">Computed Ticket Fare (Live)</span>
                  <span className="text-xs text-amber-300">
                    ({distanceKm} KM × ₹{ratePerKm}/km) + ₹{fixedCharge} fixed
                  </span>
                </div>
                <span className="text-2xl font-bold text-amber-400">
                  {formatINR(liveFormFare)}
                </span>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono uppercase font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono uppercase font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
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
