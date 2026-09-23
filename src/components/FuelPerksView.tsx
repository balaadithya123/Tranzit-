import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR } from '../lib/utils';
import { Sparkles, Fuel, Award, Clock, RefreshCw, ShieldCheck, UserCheck, Flame, Zap } from 'lucide-react';
import { StatCard } from './StatCard';

interface FuelPerksViewProps {
  owner: OwnerProfile;
}

export const FuelPerksView: React.FC<FuelPerksViewProps> = ({ owner }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  // Map storing live Gemini AI generated rationale for each bus ID
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  // Subscribe to buses in Firestore
  useEffect(() => {
    if (!owner.id) return;

    const q = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach((doc) => {
        const busData = { id: doc.id, ...doc.data() } as Bus;
        list.push(busData);
      });
      setBuses(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [owner.id]);

  // Fetch live Gemini AI rationale for a specific bus record
  const fetchGeminiRationale = async (bus: Bus) => {
    setGenerating(prev => ({ ...prev, [bus.id]: true }));
    try {
      const res = await fetch('/api/driver-incentive-rationale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driverName: bus.driverName || 'Bus Driver',
          regNumber: bus.regNumber,
          onTimePercent: bus.onTimePercent ?? 94,
          fuelEfficiencyScore: bus.fuelEfficiencyScore ?? 90,
          fuelIncentiveCredit: bus.fuelIncentiveCredit ?? 2000,
        })
      });

      if (res.ok) {
        const data = await res.json();
        const newRationale = data.rationale;
        setRationales(prev => ({ ...prev, [bus.id]: newRationale }));

        try {
          await updateDoc(doc(db, 'buses', bus.id), {
            aiRationale: newRationale
          });
        } catch (dbErr) {
          console.info("Could not save cached rationale to bus doc:", dbErr);
        }
      }
    } catch (err) {
      console.warn(`Notice generating Gemini rationale for bus ${bus.id}:`, err);
    } finally {
      setGenerating(prev => ({ ...prev, [bus.id]: false }));
    }
  };

  useEffect(() => {
    buses.forEach(bus => {
      const cached = bus.aiRationale || bus.aiIncentiveRationale;
      if (cached && !rationales[bus.id]) {
        setRationales(prev => ({ ...prev, [bus.id]: cached }));
      } else if (!cached && !rationales[bus.id] && !generating[bus.id]) {
        fetchGeminiRationale(bus);
      }
    });
  }, [buses]);

  // Aggregates for summary stats
  const totalIncentiveBudget = buses.reduce((acc, b) => acc + (b.fuelIncentiveCredit || 0), 0);
  const avgOnTime = buses.length > 0 ? Math.round(buses.reduce((acc, b) => acc + (b.onTimePercent || 0), 0) / buses.length) : 0;
  const avgFuelRating = buses.length > 0 ? Math.round(buses.reduce((acc, b) => acc + (b.fuelEfficiencyScore || 0), 0) / buses.length) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
              Fuel Rewards & Pilot Incentives
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center space-x-1">
              <Sparkles className="w-3 h-3" />
              <span>AI Automated</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Performance scoring, eco-driving fuel credits, and Gemini-evaluated driver rewards.
          </p>
        </div>
      </div>

      {/* SECTION 2: STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Monthly Incentive Pool"
          value={formatINR(totalIncentiveBudget)}
          subtext={`${buses.length} active pilots eligible for reward payouts`}
          icon={Award}
        />
        <StatCard
          label="Fleet Punctuality Rating"
          value={`${avgOnTime}%`}
          subtext="Corridor schedule compliance benchmark"
          icon={Clock}
        />
        <StatCard
          label="Eco-Driving Efficiency Score"
          value={`${avgFuelRating} / 100`}
          subtext="Calculated from real-time speed & idle telemetry"
          icon={Fuel}
        />
      </div>

      {/* SECTION 3: DRIVERS ROSTER & AI INCENTIVES */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">
              Driver Roster & Monthly Telemetry ({buses.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Realtime GPS & Fuel Sync</span>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-neutral-800">
          {buses.map((bus) => {
            const driverName = bus.driverName || 'Prakash Rao';
            const onTime = bus.onTimePercent || 94;
            const fuelScore = bus.fuelEfficiencyScore || 92;
            const credit = bus.fuelIncentiveCredit || 2000;
            const isGenerating = generating[bus.id];
            const liveRationale = rationales[bus.id];

            return (
              <div key={bus.id} className="py-4.5 first:pt-0 last:pb-0 hover:bg-slate-50/50 dark:hover:bg-neutral-900/30 transition-colors rounded-xl p-2">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left info */}
                  <div className="flex items-start space-x-3.5">
                    <div className="w-10 h-10 bg-slate-900 dark:bg-neutral-800 text-white font-mono font-black text-sm flex items-center justify-center rounded-xl shrink-0 border border-slate-800 dark:border-neutral-700">
                      {driverName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white font-sans">
                          {driverName}
                        </h4>
                        <span className="px-2 py-0.5 bg-slate-100 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 font-mono text-[10px] font-bold rounded-md">
                          {bus.regNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-0.5">
                        Corridor: <strong>{bus.routeAssigned || 'Unassigned'}</strong> • Vehicle: <strong>{bus.model}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Middle metrics */}
                  <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
                    <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-emerald-800 dark:text-emerald-300">
                      <span className="text-[9px] uppercase block text-emerald-600 font-bold">On-Time</span>
                      <strong className="text-xs font-bold">{onTime}%</strong>
                    </div>

                    <div className="px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl text-blue-800 dark:text-blue-300">
                      <span className="text-[9px] uppercase block text-blue-600 font-bold">Fuel Score</span>
                      <strong className="text-xs font-bold">{fuelScore}/100</strong>
                    </div>

                    <div className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-amber-800 dark:text-amber-300">
                      <span className="text-[9px] uppercase block text-amber-600 font-bold">Perk Credit</span>
                      <strong className="text-xs font-bold">{formatINR(credit)}</strong>
                    </div>
                  </div>
                </div>

                {/* AI Rationale box */}
                <div className="mt-3 p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center space-x-1.5 font-mono text-[10px] text-amber-900 dark:text-amber-300 font-bold uppercase">
                        <span>AI Performance Assessment</span>
                      </div>
                      {isGenerating ? (
                        <div className="flex items-center space-x-2 text-slate-500 text-xs font-mono mt-0.5">
                          <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
                          <span>Generating driver incentive analysis...</span>
                        </div>
                      ) : (
                        <p className="text-slate-700 dark:text-neutral-300 mt-0.5 leading-relaxed font-sans text-xs">
                          {liveRationale || `${onTime}% punctuality record with optimal idling habits — authorized for full ₹${credit.toLocaleString('en-IN')} incentive.`}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => fetchGeminiRationale(bus)}
                    disabled={isGenerating}
                    className="px-2.5 py-1 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-neutral-800 font-mono text-[10px] font-bold rounded-lg cursor-pointer shrink-0 transition-colors flex items-center space-x-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Re-evaluate</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
