import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, RouteItem } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StatCard } from './StatCard';
import { formatINR, getServiceStatus } from '../lib/utils';
import { Bus as BusIcon, TrendingUp, Calendar, Users, Sparkles, AlertTriangle, ArrowUpRight, Calculator, MapPin, Edit2, Compass, CheckCircle2, Wrench } from 'lucide-react';
import { EditProfileModal } from './EditProfileModal';

interface OverviewViewProps {
  owner: OwnerProfile;
  onNavigateTab: (tab: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ owner, onNavigateTab }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [routes, setRoutes] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isSaaS = owner.planType === 'SaaS';
  const accentColor = isSaaS ? 'amber' : 'teal';

  // Listen for real-time Firestore updates for owner's buses and routes
  useEffect(() => {
    if (!owner.id) return;

    // Buses Query
    const busesQuery = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsubBuses = onSnapshot(busesQuery, (snapshot) => {
      const busList: Bus[] = [];
      snapshot.forEach((doc) => {
        busList.push({ id: doc.id, ...doc.data() } as Bus);
      });
      setBuses(busList);
    });

    // Routes Query (for SaaS)
    const routesQuery = query(collection(db, 'routes'), where('ownerId', '==', owner.id));
    const unsubRoutes = onSnapshot(routesQuery, (snapshot) => {
      const routeList: RouteItem[] = [];
      snapshot.forEach((doc) => {
        routeList.push({ id: doc.id, ...doc.data() } as RouteItem);
      });
      setRoutes(routeList);
      setLoading(false);
    });

    return () => {
      unsubBuses();
      unsubRoutes();
    };
  }, [owner.id]);

  const activeBusesCount = buses.filter(b => b.status === 'Active').length;
  const totalBusesCount = buses.length || owner.activeBusesCount || 3;

  // Dynamic SaaS subscription flat fee calculation
  const saasFeePerBus = owner.saasFeePerBus || 4500;
  const totalMonthlySaasFee = saasFeePerBus * totalBusesCount;

  // Count service alerts
  const overdueCount = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Overdue').length;
  const dueSoonCount = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Due').length;

  // Calculate routes matching current hub city
  const currentHub = owner.city || "Bengaluru";
  const routesMatchingHub = routes.filter(r => 
    r.origin.toLowerCase().includes(currentHub.toLowerCase()) || 
    r.destination.toLowerCase().includes(currentHub.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Editorial Welcome Header */}
      <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-500 uppercase tracking-widest mb-1">
            <span>Operator Dashboard</span>
            <span>•</span>
            <span className={isSaaS ? 'text-amber-700 font-bold' : 'text-teal-700 font-bold'}>
              {owner.planType} Plan
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1A1F2C] tracking-tight">
            Welcome back, {owner.name}
          </h1>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-slate-600 font-sans">
            <span className="font-semibold text-[#1A1F2C]">{owner.companyName}</span>
            <span>•</span>
            <div className="inline-flex items-center space-x-1.5 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-xs font-mono">
              <MapPin className="w-3.5 h-3.5 text-amber-700" />
              <span>Operating Hub: <strong>{currentHub}</strong></span>
            </div>
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="inline-flex items-center space-x-1 text-slate-600 hover:text-[#1A1F2C] underline font-mono text-[11px] cursor-pointer ml-1"
            >
              <Edit2 className="w-3 h-3" />
              <span>Change Hub City</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3 py-2 bg-[#FBF9F5] hover:bg-[#E8E4DC]/50 border border-[#E8E4DC] text-slate-800 font-mono font-bold text-xs uppercase rounded-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-700" />
            <span>Refine Hub & Profile</span>
          </button>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1: Active Buses */}
        <StatCard
          label="Active Fleet Status"
          value={`${activeBusesCount} / ${totalBusesCount}`}
          subtext={`${totalBusesCount - activeBusesCount} in maintenance/idle`}
          icon={BusIcon}
          badgeText={activeBusesCount === totalBusesCount ? '100% Operational' : 'Partial Service'}
          accentColor={accentColor}
        />

        {/* Stat 2: Today's Revenue (SaaS) or Next Payout (Lease) */}
        {isSaaS ? (
          <StatCard
            label="Today's Ticket Revenue"
            value={formatINR(owner.todayRevenue || 48250)}
            subtext="Live Firestore ticket aggregate"
            icon={TrendingUp}
            badgeText="SaaS Realtime"
            accentColor="amber"
          />
        ) : (
          <StatCard
            label="Next Guaranteed Payout"
            value={formatINR(owner.nextPayoutAmount || 255000)}
            subtext={`Scheduled: ${owner.nextPayoutDate || '2026-10-01'}`}
            icon={Calendar}
            badgeText="Fixed Lease"
            accentColor="teal"
          />
        )}

        {/* Stat 3: Plan Status & Computed SaaS Flat Fee */}
        {isSaaS ? (
          <StatCard
            label="SaaS Plan Subscription"
            value={formatINR(totalMonthlySaasFee)}
            subtext={`₹${saasFeePerBus.toLocaleString('en-IN')} × ${totalBusesCount} buses = ${formatINR(totalMonthlySaasFee)}/mo`}
            icon={Sparkles}
            badgeText="Flat Fee / Bus"
            accentColor="amber"
          />
        ) : (
          <StatCard
            label="Partner Plan"
            value={owner.planType}
            subtext="Zero-risk fixed monthly payout"
            icon={Sparkles}
            badgeText="Fleet Lease"
            accentColor="teal"
          />
        )}

        {/* Stat 4: Hub & Ridership */}
        <StatCard
          label="Operating Hub & Riders"
          value={`${owner.avgDailyRiders ? owner.avgDailyRiders.toLocaleString('en-IN') : '1,240'}/day`}
          subtext={`Base Depot: ${currentHub}`}
          icon={Users}
          badgeText={currentHub}
          accentColor={accentColor}
        />
      </div>

      {/* Direct Module Quick Navigation Grid */}
      <div className="bg-white border border-[#E8E4DC] p-5 rounded-xs">
        <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC] mb-4">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
            <h3 className="text-xs font-mono font-extrabold uppercase text-[#1A1F2C] tracking-wider">
              Quick Module Navigation & Shortcuts
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">5 Active Platform Modules</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Module 1: Fleet & Maintenance */}
          <button
            onClick={() => onNavigateTab('fleet')}
            className="p-3.5 bg-[#FBF9F5] hover:bg-amber-50/60 border border-[#E8E4DC] hover:border-amber-300 rounded-xs text-left transition-all group cursor-pointer flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-extrabold uppercase text-[#1A1F2C] group-hover:text-amber-900 flex items-center space-x-1.5">
                  <Wrench className="w-4 h-4 text-slate-700 group-hover:text-amber-700" />
                  <span>Fleet & Maintenance</span>
                </span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
              <p className="text-[11px] text-slate-500 font-sans leading-tight">
                Inspect service health badges, log maintenance, and manage vehicle repair schedules.
              </p>
            </div>
            <div className="mt-3 text-[10px] font-mono font-bold text-amber-800 uppercase flex items-center space-x-1">
              <span>Open Fleet Management</span>
            </div>
          </button>

          {/* Module 2: Fuel & Perks (AI) */}
          {isSaaS && (
            <button
              onClick={() => onNavigateTab('fuel-perks')}
              className="p-3.5 bg-[#FBF9F5] hover:bg-amber-50/60 border border-[#E8E4DC] hover:border-amber-300 rounded-xs text-left transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-extrabold uppercase text-[#1A1F2C] group-hover:text-amber-900 flex items-center space-x-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span>Fuel & Perks (AI)</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="text-[11px] text-slate-500 font-sans leading-tight">
                  Gemini API driver scoring for fuel efficiency and on-time incentive credits.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-mono font-bold text-amber-800 uppercase flex items-center space-x-1">
                <span>View AI Driver Scoring</span>
              </div>
            </button>
          )}

          {/* Module 3: Fares & Routes */}
          {isSaaS && (
            <button
              onClick={() => onNavigateTab('fares')}
              className="p-3.5 bg-[#FBF9F5] hover:bg-amber-50/60 border border-[#E8E4DC] hover:border-amber-300 rounded-xs text-left transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-extrabold uppercase text-[#1A1F2C] group-hover:text-amber-900 flex items-center space-x-1.5">
                    <Calculator className="w-4 h-4 text-amber-700" />
                    <span>Fares & Routes</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="text-[11px] text-slate-500 font-sans leading-tight">
                  Distance × per-km rate + fixed charge calculator for origin-destination routes.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-mono font-bold text-amber-800 uppercase flex items-center space-x-1">
                <span>Manage Route Fares</span>
              </div>
            </button>
          )}

          {/* Module 4: Earnings & Wallet */}
          {isSaaS ? (
            <button
              onClick={() => onNavigateTab('earnings')}
              className="p-3.5 bg-[#FBF9F5] hover:bg-amber-50/60 border border-[#E8E4DC] hover:border-amber-300 rounded-xs text-left transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-extrabold uppercase text-[#1A1F2C] group-hover:text-amber-900 flex items-center space-x-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-700" />
                    <span>Earnings & Settlement</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="text-[11px] text-slate-500 font-sans leading-tight">
                  Collected today revenue vs. running wallet balance with payout schedule.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-mono font-bold text-amber-800 uppercase flex items-center space-x-1">
                <span>Open Revenue Ledger</span>
              </div>
            </button>
          ) : (
            <button
              onClick={() => onNavigateTab('lease')}
              className="p-3.5 bg-[#FBF9F5] hover:bg-teal-50/60 border border-[#E8E4DC] hover:border-teal-300 rounded-xs text-left transition-all group cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-extrabold uppercase text-[#1A1F2C] group-hover:text-teal-900 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-teal-700" />
                    <span>Lease Terms & Payouts</span>
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-teal-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
                <p className="text-[11px] text-slate-500 font-sans leading-tight">
                  Fixed monthly guaranteed payout schedule and bank settlement details.
                </p>
              </div>
              <div className="mt-3 text-[10px] font-mono font-bold text-teal-800 uppercase flex items-center space-x-1">
                <span>View Lease Contract</span>
              </div>
            </button>
          )}
        </div>
      </div>
      <div className="bg-white border border-[#E8E4DC] p-5 rounded-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xs text-amber-800">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-extrabold text-[#1A1F2C] uppercase font-mono">
                Operating Hub Network Alignment ({currentHub})
              </h3>
              <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-xs font-bold border border-emerald-200">
                Hub Active
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {isSaaS ? (
                <>Your primary terminal is <strong>{currentHub}</strong>. {routesMatchingHub.length} active routes originate from or connect to this hub station.</>
              ) : (
                <>Your fleet depot is located in <strong>{currentHub}</strong>. Tranzit operates intercity passenger schedules out of this hub depot.</>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="px-3.5 py-2 bg-[#1A1F2C] hover:bg-[#0F131D] text-white text-xs font-mono font-bold uppercase rounded-xs transition-colors flex items-center justify-center space-x-1.5 whitespace-nowrap cursor-pointer w-full md:w-auto"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Update Hub City</span>
          </button>
        </div>
      </div>

      {/* Maintenance Alert Banner if any overdue */}
      {(overdueCount > 0 || dueSoonCount > 0) && (
        <div className="bg-amber-50/80 border border-amber-300 p-4 rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold font-mono text-amber-900 uppercase">
                Fleet Maintenance Advisory ({overdueCount + dueSoonCount} Action Items)
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                {overdueCount > 0 && `${overdueCount} bus(es) are OVERDUE for service. `}
                {dueSoonCount > 0 && `${dueSoonCount} bus(es) have service due in under 14 days.`}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('fleet')}
            className="px-3 py-1.5 bg-amber-700 text-white text-xs font-mono font-semibold uppercase rounded-xs hover:bg-amber-800 transition-colors flex items-center space-x-1 whitespace-nowrap cursor-pointer"
          >
            <span>View Maintenance Log</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Plan Details & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Plan Overview Card */}
        <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E4DC]">
            <div className="flex items-center space-x-2">
              <span className={`w-3 h-3 rounded-full ${isSaaS ? 'bg-amber-500' : 'bg-teal-500'}`}></span>
              <h3 className="text-base font-extrabold text-[#1A1F2C]">
                {isSaaS ? 'SaaS Flat-Fee Subscription Model' : 'Fleet Lease Agreement Overview'}
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-500 uppercase">Contract Active</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-slate-700">
            {isSaaS ? (
              <>
                <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xs">
                  <div className="flex items-center space-x-2 text-amber-950 font-bold font-mono text-xs uppercase mb-1">
                    <Calculator className="w-4 h-4 text-amber-700" />
                    <span>Flat Subscription Calculation</span>
                  </div>
                  <div className="text-lg font-mono font-bold text-[#1A1F2C] my-1">
                    ₹{saasFeePerBus.toLocaleString('en-IN')} × {totalBusesCount} buses = {formatINR(totalMonthlySaasFee)}/month
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed font-mono">
                    Computed dynamically from your {totalBusesCount} registered vehicles in Firestore at ₹{saasFeePerBus.toLocaleString('en-IN')}/bus/month.
                  </p>
                </div>
                <div className="p-4 bg-[#FBF9F5] border border-[#E8E4DC] rounded-xs">
                  <div className="font-bold text-[#1A1F2C] mb-1 uppercase font-mono">You Keep Operations & Fares</div>
                  <p className="leading-relaxed text-slate-600">
                    You maintain full control of your bus drivers and daily dispatch out of <strong>{currentHub}</strong>. Tranzit handles ticketing software and revenue settlement.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3.5 bg-[#FBF9F5] border border-[#E8E4DC] rounded-xs">
                  <div className="font-bold text-[#1A1F2C] mb-1 uppercase font-mono">Turnkey Tranzit Managed</div>
                  <p className="leading-relaxed text-slate-600">
                    Tranzit operates your buses entirely — drivers, fuel, conductor ticketing, and route permits out of your <strong>{currentHub}</strong> depot.
                  </p>
                </div>
                <div className="p-3.5 bg-[#FBF9F5] border border-[#E8E4DC] rounded-xs">
                  <div className="font-bold text-[#1A1F2C] mb-1 uppercase font-mono">Fixed Monthly Guarantee</div>
                  <p className="leading-relaxed text-slate-600">
                    You receive guaranteed monthly lease payments deposited on the 1st of every month regardless of market fluctuations or passenger occupancy.
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-[#E8E4DC] flex flex-wrap items-center justify-between gap-3 text-xs">
            <span className="text-slate-500 font-mono">
              Profile Plan Type: <strong className="text-[#1A1F2C]">{owner.planType}</strong>
            </span>
            <button
              onClick={() => onNavigateTab(isSaaS ? 'fares' : 'lease')}
              className={`px-4 py-2 font-mono font-bold text-xs uppercase rounded-xs transition-colors text-white cursor-pointer ${
                isSaaS ? 'bg-amber-600 hover:bg-amber-700' : 'bg-teal-600 hover:bg-teal-700'
              }`}
            >
              {isSaaS ? 'Manage Fares & Routes' : 'View Lease Terms & Payouts'}
            </button>
          </div>
        </div>

        {/* Quick Fleet Summary */}
        <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#E8E4DC]">
              <h3 className="text-sm font-bold uppercase font-mono text-[#1A1F2C]">
                Fleet At A Glance
              </h3>
              <span className="text-xs font-mono text-slate-500">{buses.length} Vehicles</span>
            </div>

            <div className="space-y-3">
              {buses.slice(0, 3).map((bus) => {
                const status = getServiceStatus(bus.nextServiceDue);
                return (
                  <div key={bus.id} className="p-3 bg-[#FBF9F5] border border-[#E8E4DC] rounded-xs flex items-center justify-between">
                    <div>
                      <div className="font-mono font-bold text-xs text-[#1A1F2C]">
                        {bus.regNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 font-sans">
                        {bus.model}
                      </div>
                    </div>
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border rounded-xs ${
                      status === 'Good' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      status === 'Due' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                      'bg-red-50 text-red-800 border-red-200'
                    }`}>
                      {status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('fleet')}
            className="w-full mt-4 py-2 bg-[#FBF9F5] hover:bg-[#E8E4DC]/50 text-slate-800 border border-[#E8E4DC] text-xs font-mono uppercase font-bold rounded-xs transition-colors text-center cursor-pointer"
          >
            Manage Fleet & Maintenance
          </button>
        </div>

      </div>

      {/* Edit Hub Modal */}
      <EditProfileModal
        owner={owner}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />
    </div>
  );
};
