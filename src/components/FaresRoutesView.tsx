import React, { useState, useEffect } from 'react';
import { OwnerProfile, RouteItem, PermitType } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateFare, formatINR, getPermitTypeConfig } from '../lib/utils';
import { CopyButton } from './CopyButton';
import {
  Plus,
  Edit2,
  Trash2,
  Ticket,
  MapPin,
  X,
  Check,
  Search,
  Lock,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Scale,
  FileCheck2,
  HelpCircle
} from 'lucide-react';

interface FaresRoutesViewProps {
  owner: OwnerProfile;
}

export const FaresRoutesView: React.FC<FaresRoutesViewProps> = ({ owner }) => {
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPermitFilter, setSelectedPermitFilter] = useState<'all' | PermitType>('all');

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
  const [permitType, setPermitType] = useState<PermitType>('unverified');
  const [permitNumber, setPermitNumber] = useState('');

  // Subscribe to routes in Firestore
  useEffect(() => {
    if (!owner.id) return;

    const q = query(collection(db, 'routes'), where('ownerId', '==', owner.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: RouteItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          permitType: data.permitType || 'unverified',
          ...data
        } as RouteItem);
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
      setPermitType(routeToEdit.permitType || 'unverified');
      setPermitNumber(routeToEdit.permitNumber || '');
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
      // Requirement: Default every newly added route to "unverified"
      setPermitType('unverified');
      setPermitNumber('');
    }
    setIsModalOpen(true);
  };

  // Quick verify action from table row
  const handleQuickVerify = (route: RouteItem, newPermit: PermitType) => {
    handleOpenModal({ ...route, permitType: newPermit });
  };

  // Save Route to Firestore
  const handleSaveRoute = async (e: React.FormEvent) => {
    e.preventDefault();
    const routeId = editingRoute ? editingRoute.id : `route-${Date.now()}`;
    const computed = calculateFare(fixedCharge, distanceKm, ratePerKm);

    const routeData: RouteItem = {
      id: routeId,
      ownerId: owner.id,
      routeName: routeName.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      distanceKm: Number(distanceKm),
      fixedCharge: Number(fixedCharge),
      ratePerKm: Number(ratePerKm),
      computedFare: computed,
      tripsPerDay: Number(tripsPerDay),
      permitType: permitType,
      permitNumber: permitNumber.trim() || undefined
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

  const filteredRoutes = routes.filter(r => {
    const rPermit = r.permitType || 'unverified';
    if (selectedPermitFilter !== 'all' && rPermit !== selectedPermitFilter) {
      return false;
    }
    return (
      r.routeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.origin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(r.distanceKm).includes(searchQuery) ||
      (r.permitNumber && r.permitNumber.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const unverifiedCount = routes.filter(r => (r.permitType || 'unverified') === 'unverified').length;
  const stageCarriageCount = routes.filter(r => r.permitType === 'stage_carriage').length;
  const contractCount = routes.filter(r => r.permitType === 'contract_carriage' || r.permitType === 'tourist_permit').length;

  return (
    <div className="space-y-6">
      {/* Editorial Title Bar */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-1.5 font-bold">
            <Ticket className="w-3.5 h-3.5" />
            <span>SaaS Dynamic Fare Engine & Permit Governance</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight font-sans">
            Fares & Routes Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-0.5 max-w-2xl">
            Configure routes with statutory permit safeguards. Stage Carriage fares are mandated by the State Transport Authority (STA), while Contract & Tourist permits support operator dynamic pricing.
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

      {/* Regulatory Safeguard Notice Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-amber-500/20 text-amber-700 dark:text-amber-400 rounded-lg flex-shrink-0 mt-0.5">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 dark:text-neutral-100 font-sans">
              Regulatory Safeguard Active
            </h4>
            <p className="text-slate-600 dark:text-neutral-400 mt-0.5 leading-relaxed font-sans">
              This safeguard stops Tranzit from quietly treating every route as operator-priced. Stage Carriage fares are read-only per STA notification; new routes default to <strong>Unverified</strong> until confirmed.
            </p>
          </div>
        </div>

        {unverifiedCount > 0 && (
          <div className="flex items-center space-x-2 self-stretch sm:self-auto bg-amber-500/20 text-amber-900 dark:text-amber-300 px-3 py-1.5 rounded-lg border border-amber-500/30 text-[11px] font-mono font-bold whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" />
            <span>{unverifiedCount} Unverified Route{unverifiedCount > 1 ? 's' : ''} Need Confirmation</span>
          </div>
        )}
      </div>

      {/* Filter / Search Bar & Permit Category Tabs */}
      <div className="space-y-3 bg-white dark:bg-[#121214] p-4 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-neutral-800 pb-3">
          <button
            onClick={() => setSelectedPermitFilter('all')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
              selectedPermitFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold'
                : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:bg-slate-200 dark:hover:bg-neutral-700'
            }`}
          >
            All Routes ({routes.length})
          </button>

          <button
            onClick={() => setSelectedPermitFilter('stage_carriage')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
              selectedPermitFilter === 'stage_carriage'
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
            }`}
          >
            <Lock className="w-3 h-3" />
            <span>Stage Carriage (STA) ({stageCarriageCount})</span>
          </button>

          <button
            onClick={() => setSelectedPermitFilter('contract_carriage')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
              selectedPermitFilter === 'contract_carriage'
                ? 'bg-emerald-600 text-white font-bold'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20'
            }`}
          >
            <Check className="w-3 h-3" />
            <span>Contract Carriage</span>
          </button>

          <button
            onClick={() => setSelectedPermitFilter('tourist_permit')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
              selectedPermitFilter === 'tourist_permit'
                ? 'bg-purple-600 text-white font-bold'
                : 'bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
            }`}
          >
            <Ticket className="w-3 h-3" />
            <span>Tourist Permit</span>
          </button>

          <button
            onClick={() => setSelectedPermitFilter('unverified')}
            className={`px-3 py-1.5 text-xs font-mono font-medium rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer ${
              selectedPermitFilter === 'unverified'
                ? 'bg-amber-600 text-white font-bold'
                : 'bg-amber-500/10 text-amber-800 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/30'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Unverified ({unverifiedCount})</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 dark:text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search routes by city, terminal, permit number, distance..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-900 dark:text-neutral-100 placeholder-slate-400 dark:placeholder-neutral-500 focus:outline-none focus:border-amber-500 font-sans"
            />
          </div>
          <div className="text-xs font-mono text-slate-500 dark:text-neutral-400">
            Showing <span className="font-bold text-slate-900 dark:text-neutral-100">{filteredRoutes.length}</span> of {routes.length} routes
          </div>
        </div>
      </div>

      {/* Routes Table */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-neutral-200">
            Configured Fleet Routes ({routes.length})
          </span>
          <span className="text-[11px] font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-800/60 font-semibold">
            Firestore Live Sync
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/60 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Route Name & Terminals</th>
                <th className="py-3 px-4">Permit Classification</th>
                <th className="py-3 px-4">Distance (KM)</th>
                <th className="py-3 px-4">Rate / KM (₹)</th>
                <th className="py-3 px-4">Base Fixed (₹)</th>
                <th className="py-3 px-4">Computed Ticket Fare</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-neutral-500 font-mono">
                    Loading route manifests...
                  </td>
                </tr>
              ) : filteredRoutes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-neutral-500 font-mono">
                    {searchQuery
                      ? `No routes matching "${searchQuery}"`
                      : selectedPermitFilter !== 'all'
                      ? `No routes with permit classification "${selectedPermitFilter}"`
                      : 'No routes found. Click "Add New Route" to configure your first route.'}
                  </td>
                </tr>
              ) : (
                filteredRoutes.map((route) => {
                  const pType: PermitType = route.permitType || 'unverified';
                  const permitCfg = getPermitTypeConfig(pType);
                  const isStageCarriage = pType === 'stage_carriage';
                  const isUnverified = pType === 'unverified';
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
                        {route.permitNumber && (
                          <div className="text-[10px] font-mono text-slate-400 dark:text-neutral-500 mt-0.5">
                            Permit: {route.permitNumber}
                          </div>
                        )}
                      </td>

                      {/* Permit Classification Badge */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold border ${permitCfg.badgeClass}`}>
                            {isUnverified ? (
                              <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-pulse" />
                            ) : isStageCarriage ? (
                              <Lock className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                            ) : (
                              <FileCheck2 className="w-3 h-3" />
                            )}
                            <span>{permitCfg.shortLabel}</span>
                          </span>

                          {isUnverified && (
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-medium">
                              ⚠️ Confirmation needed
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Distance */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-900 dark:text-neutral-100">
                        {route.distanceKm} KM
                      </td>

                      {/* Rate per KM */}
                      <td className="py-3.5 px-4 font-mono">
                        {isStageCarriage ? (
                          <span className="text-blue-700 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[11px] font-medium">
                            STA Mandated
                          </span>
                        ) : isUnverified ? (
                          <span className="text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px] font-medium">
                            Locked
                          </span>
                        ) : (
                          <span className="text-slate-700 dark:text-neutral-300 font-medium">
                            ₹{route.ratePerKm || 2.5}/km
                          </span>
                        )}
                      </td>

                      {/* Base Fixed Charge */}
                      <td className="py-3.5 px-4 font-mono">
                        {isStageCarriage ? (
                          <span className="text-blue-700 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded text-[11px] font-medium">
                            STA Fixed
                          </span>
                        ) : isUnverified ? (
                          <span className="text-amber-700 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded text-[11px] font-medium">
                            Locked
                          </span>
                        ) : (
                          <span className="text-slate-900 dark:text-neutral-100 font-medium">
                            {formatINR(route.fixedCharge)}
                          </span>
                        )}
                      </td>

                      {/* Computed Ticket Fare & Statutory Notice */}
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-base text-slate-900 dark:text-neutral-100">
                          {formatINR(fare)}
                        </div>

                        {isStageCarriage ? (
                          <div className="text-[11px] text-blue-700 dark:text-blue-400 font-sans font-medium flex items-center space-x-1 mt-0.5">
                            <Lock className="w-3 h-3 flex-shrink-0" />
                            <span>Set by State Transport Authority — not editable</span>
                          </div>
                        ) : isUnverified ? (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-mono font-medium flex items-center space-x-1 mt-0.5">
                            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                            <span>Unverified route — Fare locked</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 dark:text-neutral-500 font-mono">
                            ({route.distanceKm}km × ₹{route.ratePerKm || 2.5}) + ₹{route.fixedCharge}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {isUnverified && (
                          <button
                            onClick={() => handleOpenModal(route)}
                            className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-800 dark:text-amber-300 text-[11px] font-mono font-bold rounded-lg border border-amber-500/30 transition-colors inline-flex items-center space-x-1 cursor-pointer mr-1"
                            title="Confirm statutory permit type"
                          >
                            <ShieldAlert className="w-3 h-3" />
                            <span>Verify Permit</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleOpenModal(route)}
                          className="p-1.5 text-slate-600 dark:text-neutral-400 hover:text-amber-700 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-neutral-800 rounded-lg border border-transparent hover:border-amber-200 dark:hover:border-neutral-700 transition-colors cursor-pointer inline-flex"
                          title="Edit Route & Permit Settings"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteRoute(route.id)}
                          className="p-1.5 text-slate-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-neutral-800 rounded-lg border border-transparent hover:border-red-200 dark:hover:border-neutral-700 transition-colors cursor-pointer inline-flex"
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

      {/* Edit / Add Route Modal with Statutory Safeguards */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 max-w-xl w-full p-6 rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-neutral-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-neutral-800">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 rounded-lg">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-neutral-100 font-sans">
                    {editingRoute ? 'Edit Route & Permit Configuration' : 'Add New Route'}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-neutral-400 font-sans">
                    Statutory Permit Verification & Fare Policy
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-neutral-200 cursor-pointer rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 mt-4">
              {/* Route Identity */}
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Route Name / Line Title
                </label>
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="e.g. Bengaluru → Mysuru Express"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">Origin Terminal</label>
                  <input
                    type="text"
                    required
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="e.g. Bengaluru Central"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">Destination Terminal</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder="e.g. Mysuru Suburban Stand"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500 font-sans"
                  />
                </div>
              </div>

              {/* PERMIT CLASSIFICATION SELECTOR */}
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold">
                    Statutory Permit Type (Motor Vehicles Act)
                  </label>
                  <span className="text-[11px] font-mono text-slate-400 dark:text-neutral-500">
                    Required for Pricing Rules
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Unverified */}
                  <label
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-2.5 ${
                      permitType === 'unverified'
                        ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="permitType"
                      value="unverified"
                      checked={permitType === 'unverified'}
                      onChange={() => setPermitType('unverified')}
                      className="mt-1 text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 font-sans">
                          Unverified Permit
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-tight font-sans">
                        Pending verification. Fare editing is locked as a safety measure.
                      </p>
                    </div>
                  </label>

                  {/* Stage Carriage */}
                  <label
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-2.5 ${
                      permitType === 'stage_carriage'
                        ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="permitType"
                      value="stage_carriage"
                      checked={permitType === 'stage_carriage'}
                      onChange={() => setPermitType('stage_carriage')}
                      className="mt-1 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 font-sans">
                          Stage Carriage
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-tight font-sans">
                        State Transport Authority (STA) mandated fares — strictly read-only.
                      </p>
                    </div>
                  </label>

                  {/* Contract Carriage */}
                  <label
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-2.5 ${
                      permitType === 'contract_carriage'
                        ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="permitType"
                      value="contract_carriage"
                      checked={permitType === 'contract_carriage'}
                      onChange={() => setPermitType('contract_carriage')}
                      className="mt-1 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 font-sans">
                          Contract Carriage
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-tight font-sans">
                        Operator-set dynamic distance & fixed rate pricing.
                      </p>
                    </div>
                  </label>

                  {/* Tourist Permit */}
                  <label
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-2.5 ${
                      permitType === 'tourist_permit'
                        ? 'border-purple-500 bg-purple-500/10 ring-1 ring-purple-500'
                        : 'border-slate-200 dark:border-neutral-800 hover:border-slate-300 dark:hover:border-neutral-700 bg-slate-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="permitType"
                      value="tourist_permit"
                      checked={permitType === 'tourist_permit'}
                      onChange={() => setPermitType('tourist_permit')}
                      className="mt-1 text-purple-600 focus:ring-purple-500"
                    />
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <Ticket className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-neutral-100 font-sans">
                          Tourist Permit
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-neutral-400 mt-0.5 leading-tight font-sans">
                        All-India / State commercial tourist charter rates.
                      </p>
                    </div>
                  </label>
                </div>

                {/* Optional Permit Number */}
                <div className="mt-2.5">
                  <input
                    type="text"
                    value={permitNumber}
                    onChange={(e) => setPermitNumber(e.target.value)}
                    placeholder="Optional RTO Permit Reg Number (e.g. KA/STA/SC/2024/9912)"
                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* DYNAMIC FARE CONFIGURATION OR READ-ONLY MANDATED NOTICES */}
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 space-y-3">
                {/* Distance is always relevant */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                      Route Distance (KM)
                    </label>
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
                    <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                      Trips Per Day
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={tripsPerDay}
                      onChange={(e) => setTripsPerDay(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* CONDITIONAL PRICING FORM FIELDS ACCORDING TO PERMIT TYPE */}
                {permitType === 'stage_carriage' ? (
                  /* Stage Carriage: Show fare as read-only with explicit label */
                  <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2.5">
                    <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-400 font-mono text-xs font-bold uppercase">
                      <Lock className="w-4 h-4 flex-shrink-0" />
                      <span>Set by State Transport Authority — not editable</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 font-sans leading-relaxed">
                      Under Section 67 of the Motor Vehicles Act, fares on Stage Carriage routes are statutory tariffs published by the State Transport Authority (STA). Operator-side dynamic pricing rate fields are disabled for this route.
                    </p>
                    <div className="pt-2 border-t border-blue-500/20 flex items-center justify-between font-mono text-xs text-blue-900 dark:text-blue-300">
                      <span>Statutory Gazetted Rate:</span>
                      <span className="font-bold">₹{ratePerKm}/km + ₹{fixedCharge} STA Base</span>
                    </div>
                  </div>
                ) : permitType === 'unverified' ? (
                  /* Unverified: Show warning notice and lock rate editing */
                  <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2">
                    <div className="flex items-center space-x-2 text-amber-800 dark:text-amber-400 font-mono text-xs font-bold uppercase">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 animate-pulse" />
                      <span>Regulatory Safeguard — Verification Required</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-neutral-300 font-sans leading-relaxed">
                      Every new route defaults to <strong>Unverified</strong> to prevent accidental dynamic fare configuration on regulated Stage Carriage lines. To enable custom rate editing, confirm this route's classification as <em>Contract Carriage</em> or <em>Tourist Permit</em> above.
                    </p>
                  </div>
                ) : (
                  /* Contract Carriage & Tourist Permit: Keep existing editable fields exactly as they are */
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-neutral-900/60 rounded-xl border border-slate-200 dark:border-neutral-800">
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                        Rate / KM (₹)
                      </label>
                      <input
                        type="number"
                        required
                        step="0.1"
                        min={0.1}
                        value={ratePerKm}
                        onChange={(e) => setRatePerKm(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                        Base Fixed Charge (₹)
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={fixedCharge}
                        onChange={(e) => setFixedCharge(Number(e.target.value))}
                        className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-amber-500 font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* LIVE RECALCULATED / STATUTORY FARE BANNER */}
              {permitType === 'stage_carriage' ? (
                <div className="p-4 bg-slate-950 text-white rounded-xl flex items-center justify-between font-mono border border-blue-900/40">
                  <div>
                    <span className="text-[10px] uppercase text-blue-400 block font-bold">
                      STA Statutory Mandated Fare
                    </span>
                    <span className="text-xs text-blue-200 font-sans">
                      Set by State Transport Authority — not editable
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-blue-400">
                      {formatINR(liveFormFare)}
                    </span>
                    <span className="block text-[10px] text-slate-400 font-mono">STA Gazette Rate</span>
                  </div>
                </div>
              ) : permitType === 'unverified' ? (
                <div className="p-4 bg-slate-950 text-white rounded-xl flex items-center justify-between font-mono border border-amber-900/40">
                  <div>
                    <span className="text-[10px] uppercase text-amber-400 block font-bold">
                      Unverified Route Status
                    </span>
                    <span className="text-xs text-amber-300/80 font-sans">
                      Fare locked pending statutory permit confirmation
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-amber-400">
                      {formatINR(liveFormFare)}
                    </span>
                    <span className="block text-[10px] text-amber-500 font-mono">Unverified</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-black text-white rounded-xl flex items-center justify-between font-mono border border-neutral-800">
                  <div>
                    <span className="text-[10px] uppercase text-neutral-400 block font-bold">
                      Dynamic Computed Fare (Live)
                    </span>
                    <span className="text-xs text-amber-300 font-mono">
                      ({distanceKm} KM × ₹{ratePerKm}/km) + ₹{fixedCharge} fixed
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-amber-400">
                    {formatINR(liveFormFare)}
                  </span>
                </div>
              )}

              {/* Modal Buttons */}
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-mono uppercase font-bold rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingRoute ? 'Update Route' : 'Save Route to Firestore'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
