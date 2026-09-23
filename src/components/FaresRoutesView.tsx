import React, { useState, useEffect } from 'react';
import { OwnerProfile, RouteItem, PermitType } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { calculateFare, formatINR, getPermitTypeConfig } from '../lib/utils';
import { calculatePlaceDistance } from '../lib/geoDistance';
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
  FileCheck2,
  Route as RouteIcon,
  Navigation,
  ShieldAlert
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
      setPermitType('unverified');
      setPermitNumber('');
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
      routeName: routeName.trim(),
      origin: origin.trim(),
      destination: destination.trim(),
      distanceKm: Number(distanceKm),
      fixedCharge: Number(fixedCharge),
      ratePerKm: Number(ratePerKm),
      computedFare: computed,
      tripsPerDay: Number(tripsPerDay),
      permitType: permitType,
      permitNumber: permitNumber.trim()
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
  const contractCount = routes.filter(r => r.permitType === 'contract_carriage').length;
  const touristCount = routes.filter(r => r.permitType === 'tourist_permit').length;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER & STATUTORY ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
              Route Corridors & Fare Matrix
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              {routes.length} Active Corridors
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Manage stage carriage STA-regulated lines, contract charter rates, and live ticket pricing policies.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20 self-start md:self-auto whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add Route Corridor</span>
        </button>
      </div>

      {unverifiedCount > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between gap-4 text-xs font-mono font-bold text-amber-800 dark:text-amber-300 shadow-2xs">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 animate-pulse" />
            <span>{unverifiedCount} unverified permit{unverifiedCount > 1 ? 's' : ''} require RTO verification</span>
          </div>
        </div>
      )}

      {/* SECTION 3: PERMIT FILTERS & SEARCH */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Filter Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedPermitFilter('all')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                selectedPermitFilter === 'all'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({routes.length})
            </button>

            <button
              onClick={() => setSelectedPermitFilter('stage_carriage')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                selectedPermitFilter === 'stage_carriage'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3 h-3 shrink-0" />
              <span>Stage Carriage ({stageCarriageCount})</span>
            </button>

            <button
              onClick={() => setSelectedPermitFilter('contract_carriage')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                selectedPermitFilter === 'contract_carriage'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Check className="w-3 h-3 shrink-0" />
              <span>Contract ({contractCount})</span>
            </button>

            <button
              onClick={() => setSelectedPermitFilter('tourist_permit')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                selectedPermitFilter === 'tourist_permit'
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Ticket className="w-3 h-3 shrink-0" />
              <span>Tourist ({touristCount})</span>
            </button>

            {unverifiedCount > 0 && (
              <button
                onClick={() => setSelectedPermitFilter('unverified')}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all flex items-center space-x-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  selectedPermitFilter === 'unverified'
                    ? 'bg-amber-600 text-white font-bold shadow-xs'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
                }`}
              >
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Unverified ({unverifiedCount})</span>
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search route or terminal..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-full font-mono text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* SECTION 4: ROUTE CARDS GRID (Responsive for Mobile and Desktop) */}
        {filteredRoutes.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-neutral-900/50 rounded-xl border border-slate-200 dark:border-neutral-800 text-slate-500 font-mono text-xs">
            {searchQuery ? `No routes found matching "${searchQuery}"` : 'No routes configured yet. Click "Add Route Corridor" to get started.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRoutes.map((route) => {
              const pType: PermitType = route.permitType || 'unverified';
              const permitCfg = getPermitTypeConfig(pType);
              const isStageCarriage = pType === 'stage_carriage';
              const isUnverified = pType === 'unverified';
              const fare = calculateFare(route.fixedCharge, route.distanceKm, route.ratePerKm || 2.5);

              return (
                <div
                  key={route.id}
                  className="bg-slate-50/70 dark:bg-neutral-900/40 border border-slate-200/80 dark:border-neutral-800/80 rounded-2xl p-4.5 space-y-3.5 hover:border-slate-300 dark:hover:border-neutral-700 transition-all shadow-2xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-9 h-9 rounded-xl bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 flex items-center justify-center text-blue-600 shrink-0">
                          <RouteIcon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate font-sans">
                            {route.routeName}
                          </h4>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 block truncate">
                            {route.distanceKm} km • {route.tripsPerDay || 4} trips/day
                          </span>
                        </div>
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase shrink-0 border ${
                          isStageCarriage
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                            : isUnverified
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        }`}
                      >
                        {permitCfg.shortLabel}
                      </span>
                    </div>

                    {/* Terminals */}
                    <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-xl border border-slate-100 dark:border-neutral-800 space-y-1.5 text-xs font-mono">
                      <div className="flex items-center space-x-1.5 text-slate-700 dark:text-neutral-300">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{route.origin}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-700 dark:text-neutral-300">
                        <Navigation className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        <span className="truncate">{route.destination}</span>
                      </div>
                    </div>

                    {/* Fare Summary */}
                    <div className="flex items-center justify-between font-mono bg-blue-50/50 dark:bg-blue-950/20 px-3 py-2 rounded-xl border border-blue-100 dark:border-blue-900/40">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 dark:text-neutral-400 block font-sans">
                          {isStageCarriage ? 'STA Mandated Fare' : 'Computed Fare'}
                        </span>
                        <span className="text-xs text-slate-600 dark:text-neutral-300">
                          ₹{route.ratePerKm || 2.5}/km + ₹{route.fixedCharge} base
                        </span>
                      </div>
                      <span className="text-base font-black text-slate-900 dark:text-white">
                        {formatINR(fare)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-slate-200/60 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
                    <button
                      onClick={() => handleOpenModal(route)}
                      className="text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>{isUnverified ? 'Verify Permit' : 'Edit Fare'}</span>
                    </button>

                    <button
                      onClick={() => handleDeleteRoute(route.id)}
                      className="text-slate-400 hover:text-rose-600 transition-colors p-1 cursor-pointer"
                      title="Delete Route"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT ROUTE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 max-w-xl w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-neutral-800">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                    {editingRoute ? 'Edit Route Corridor' : 'Add New Route Corridor'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400">
                    Statutory Permit Verification & Fare Tariffs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoute} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Route Corridor Name
                </label>
                <input
                  type="text"
                  required
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="e.g. Bengaluru → Mysuru Express"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
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
                    onBlur={() => {
                      if (origin.length > 2 && destination.length > 2) {
                        const { distanceKm } = calculatePlaceDistance(origin, destination);
                        setDistanceKm(distanceKm);
                      }
                    }}
                    placeholder="e.g. Majestic Terminal"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">Destination Terminal</label>
                  <input
                    type="text"
                    required
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    onBlur={() => {
                      if (origin.length > 2 && destination.length > 2) {
                        const { distanceKm } = calculatePlaceDistance(origin, destination);
                        setDistanceKm(distanceKm);
                      }
                    }}
                    placeholder="e.g. Mysuru Suburban Stand"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>
              </div>

              {/* PERMIT CLASSIFICATION */}
              <div className="pt-2 border-t border-slate-100 dark:border-neutral-800">
                <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-2">
                  Statutory Permit Classification
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-2.5 ${
                      permitType === 'stage_carriage'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="permitType"
                      value="stage_carriage"
                      checked={permitType === 'stage_carriage'}
                      onChange={() => setPermitType('stage_carriage')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block font-sans">
                        Stage Carriage
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight block">
                        State Transport Authority (STA) mandated fares.
                      </span>
                    </div>
                  </label>

                  <label
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start space-x-2.5 ${
                      permitType === 'contract_carriage'
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="permitType"
                      value="contract_carriage"
                      checked={permitType === 'contract_carriage'}
                      onChange={() => setPermitType('contract_carriage')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 dark:text-white block font-sans">
                        Contract Carriage
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-neutral-400 leading-tight block">
                        Operator-set custom distance & fixed rate pricing.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* DISTANCE & FARE CONFIGURATION */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-neutral-800">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Distance (KM)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={distanceKm}
                    onChange={(e) => setDistanceKm(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Rate / KM (₹)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.1"
                    min={0.1}
                    disabled={permitType === 'stage_carriage'}
                    value={ratePerKm}
                    onChange={(e) => setRatePerKm(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Base Fixed (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    disabled={permitType === 'stage_carriage'}
                    value={fixedCharge}
                    onChange={(e) => setFixedCharge(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
                  />
                </div>
              </div>

              {/* LIVE RECALCULATED FARE BANNER */}
              <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-between font-mono border border-blue-200 dark:border-blue-800/60">
                <div>
                  <span className="text-[10px] uppercase text-blue-700 dark:text-blue-300 block font-bold">
                    Total Single Passenger Fare
                  </span>
                  <span className="text-xs text-slate-600 dark:text-neutral-400 font-sans">
                    ({distanceKm} KM × ₹{ratePerKm}/km) + ₹{fixedCharge} fixed
                  </span>
                </div>
                <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {formatINR(liveFormFare)}
                </span>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingRoute ? 'Update Corridor' : 'Save Corridor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
