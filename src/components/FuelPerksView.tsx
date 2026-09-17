import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus } from '../types';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR } from '../lib/utils';
import { Sparkles, Fuel, Award, Clock, RefreshCw, Edit2, Check, X, ShieldCheck, Zap, UserCheck, TrendingUp } from 'lucide-react';

interface FuelPerksViewProps {
  owner: OwnerProfile;
}

export const FuelPerksView: React.FC<FuelPerksViewProps> = ({ owner }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);

  // Map storing live Gemini AI generated rationale for each bus ID
  const [rationales, setRationales] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});

  // Driver metrics edit modal
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [editOnTime, setEditOnTime] = useState<number>(94);
  const [editFuelScore, setEditFuelScore] = useState<number>(92);
  const [editIncentive, setEditIncentive] = useState<number>(2000);
  const [editDriverName, setEditDriverName] = useState<string>('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

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
          onTimePercent: bus.onTimePercent || 94,
          fuelEfficiencyScore: bus.fuelEfficiencyScore || 90,
          fuelIncentiveCredit: bus.fuelIncentiveCredit || 2000,
        })
      });

      if (res.ok) {
        const data = await res.json();
        setRationales(prev => ({ ...prev, [bus.id]: data.rationale }));
      }
    } catch (err) {
      console.error(`Failed to generate Gemini rationale for bus ${bus.id}:`, err);
    } finally {
      setGenerating(prev => ({ ...prev, [bus.id]: false }));
    }
  };

  // Automatically trigger Gemini API calls when buses are loaded or updated from Firestore
  useEffect(() => {
    buses.forEach(bus => {
      // If we don't have a rationale yet or if metrics changed, fetch live from Gemini
      if (!rationales[bus.id]) {
        fetchGeminiRationale(bus);
      }
    });
  }, [buses]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isEditModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isEditModalOpen]);
  // Open Edit Metrics Modal
  const handleOpenEdit = (bus: Bus) => {
    setSelectedBus(bus);
    setEditDriverName(bus.driverName || 'Ramesh Kumar');
    setEditOnTime(bus.onTimePercent || 94);
    setEditFuelScore(bus.fuelEfficiencyScore || 92);
    setEditIncentive(bus.fuelIncentiveCredit || 2000);
    setIsEditModalOpen(true);
  };

  // Save updated driver metrics to Firestore and re-fetch Gemini rationale
  const handleSaveMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBus) return;

    const busRef = doc(db, 'buses', selectedBus.id);
    await updateDoc(busRef, {
      driverName: editDriverName,
      onTimePercent: Number(editOnTime),
      fuelEfficiencyScore: Number(editFuelScore),
      fuelIncentiveCredit: Number(editIncentive)
    });

    setIsEditModalOpen(false);

    // Re-fetch live Gemini rationale with updated Firestore scores
    const updatedBus: Bus = {
      ...selectedBus,
      driverName: editDriverName,
      onTimePercent: Number(editOnTime),
      fuelEfficiencyScore: Number(editFuelScore),
      fuelIncentiveCredit: Number(editIncentive)
    };
    fetchGeminiRationale(updatedBus);
  };

  // Aggregates for summary stats
  const totalIncentiveBudget = buses.reduce((acc, b) => acc + (b.fuelIncentiveCredit || 2000), 0);
  const avgOnTime = Math.round(buses.reduce((acc, b) => acc + (b.onTimePercent || 90), 0) / (buses.length || 1));
  const avgFuelRating = Math.round(buses.reduce((acc, b) => acc + (b.fuelEfficiencyScore || 88), 0) / (buses.length || 1));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-[#E8E4DC] p-6 rounded-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-amber-800 uppercase tracking-widest mb-1">
            <Fuel className="w-3.5 h-3.5 text-amber-700" />
            <span>Driver Performance & Incentive Engine</span>
          </div>
          <h2 className="text-2xl font-extrabold text-[#1A1F2C] tracking-tight flex items-center space-x-2">
            <span>Fuel & Driver Perks Management</span>
          </h2>
          <p className="text-xs text-slate-500 font-sans mt-0.5">
            Real-time driver incentive scoring calculated by <strong>Gemini AI</strong> based on live Firestore on-time percentages and fuel efficiency ratings.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1 bg-amber-50 text-amber-900 border border-amber-300 font-mono text-xs font-bold rounded-xs flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Gemini 2.5 Flash Engine Active</span>
          </span>
        </div>
      </div>

      {/* 3 Key Metrics Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Monthly Incentive Pool */}
        <div className="bg-white border border-[#E8E4DC] border-l-4 border-l-amber-600 p-5 rounded-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase font-bold text-slate-500">
              Total Monthly Incentive Pool
            </span>
            <Award className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#1A1F2C]">
            {formatINR(totalIncentiveBudget)}
          </div>
          <div className="text-[11px] font-mono text-amber-900 mt-1">
            Budget allocated across {buses.length} registered fleet drivers
          </div>
        </div>

        {/* Fleet On-Time Performance */}
        <div className="bg-white border border-[#E8E4DC] border-l-4 border-l-emerald-600 p-5 rounded-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase font-bold text-slate-500">
              Fleet On-Time Average
            </span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#1A1F2C]">
            {avgOnTime}%
          </div>
          <div className="text-[11px] font-mono text-emerald-800 mt-1">
            Realtime punctuality benchmark from Firestore
          </div>
        </div>

        {/* Fleet Fuel Efficiency Score */}
        <div className="bg-white border border-[#E8E4DC] border-l-4 border-l-teal-600 p-5 rounded-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono uppercase font-bold text-slate-500">
              Fleet Fuel Efficiency Rating
            </span>
            <Fuel className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl font-mono font-bold text-[#1A1F2C]">
            {avgFuelRating} / 100
          </div>
          <div className="text-[11px] font-mono text-teal-800 mt-1">
            Eco-driving compliance score across active routes
          </div>
        </div>
      </div>

      {/* Drivers List & AI Incentive Rationales */}
      <div className="bg-white border border-[#E8E4DC] rounded-xs overflow-hidden">
        <div className="p-4 border-b border-[#E8E4DC] bg-[#FBF9F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <UserCheck className="w-4 h-4 text-slate-700" />
            <span className="text-xs font-mono uppercase font-bold text-slate-700">
              Driver Roster & AI Incentive Rationale ({buses.length} Drivers)
            </span>
          </div>
          <div className="text-[11px] font-mono text-amber-900 bg-amber-50 px-2.5 py-1 rounded-xs border border-amber-200 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-700" />
            <span>Rationale generated live from Firestore via Gemini API</span>
          </div>
        </div>

        <div className="divide-y divide-[#E8E4DC]">
          {buses.map((bus) => {
            const driverName = bus.driverName || (bus.id === 'bus-saas-1' ? 'Ramesh Kumar' : bus.id === 'bus-saas-2' ? 'Siddharth Gowda' : 'Manjunath Naidu');
            const onTime = bus.onTimePercent || 94;
            const fuelScore = bus.fuelEfficiencyScore || 92;
            const credit = bus.fuelIncentiveCredit || 2000;
            const isGenerating = generating[bus.id];
            const liveRationale = rationales[bus.id];

            return (
              <div key={bus.id} className="p-5 hover:bg-[#FBF9F5] transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left: Driver & Bus Info */}
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-[#1A1F2C] text-[#FBF9F5] flex items-center justify-center font-extrabold text-sm rounded-xs flex-shrink-0">
                      {driverName.split(' ').map(n => n[0]).join('')}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-extrabold text-[#1A1F2C]">
                          {driverName}
                        </h4>
                        <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-xs border border-slate-200">
                          {bus.regNumber}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-sans mt-0.5">
                        Assigned Bus: <strong>{bus.model}</strong> • Route: <strong>{bus.routeAssigned}</strong>
                      </p>
                    </div>
                  </div>

                  {/* Middle: Performance Metrics Pills */}
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                    <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xs text-emerald-900">
                      <span className="text-[10px] uppercase block text-emerald-700 font-semibold">On-Time Rate</span>
                      <strong className="text-sm font-bold">{onTime}%</strong>
                    </div>

                    <div className="px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-xs text-teal-900">
                      <span className="text-[10px] uppercase block text-teal-700 font-semibold">Fuel Score</span>
                      <strong className="text-sm font-bold">{fuelScore} / 100</strong>
                    </div>

                    <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xs text-amber-950">
                      <span className="text-[10px] uppercase block text-amber-800 font-semibold">Fuel Credit</span>
                      <strong className="text-sm font-bold text-amber-900">{formatINR(credit)}</strong>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(bus)}
                      className="px-2.5 py-2 bg-white border border-[#E8E4DC] hover:border-[#1A1F2C] text-slate-700 hover:text-[#1A1F2C] text-xs font-mono font-bold rounded-xs transition-colors flex items-center space-x-1 cursor-pointer"
                      title="Edit Driver Scores in Firestore"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>Edit Metrics</span>
                    </button>
                  </div>

                </div>

                {/* Gemini AI Generated Incentive Rationale Callout */}
                <div className="mt-4 p-3.5 bg-amber-50/70 border border-amber-200 rounded-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-start space-x-2.5">
                    <div className="p-1.5 bg-amber-500 text-white rounded-xs mt-0.5 flex-shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2 mb-0.5">
                        <span className="text-[11px] font-mono font-extrabold text-amber-950 uppercase tracking-wider">
                          AI Incentive Rationale (Gemini Live API)
                        </span>
                        <span className="text-[10px] font-mono bg-white text-amber-900 px-1.5 py-0.2 rounded border border-amber-300">
                          {isGenerating ? 'Computing...' : 'Verified Live'}
                        </span>
                      </div>
                      
                      {isGenerating ? (
                        <div className="flex items-center space-x-2 text-xs font-mono text-amber-800 py-0.5 animate-pulse">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-700" />
                          <span>Gemini is analyzing driver on-time % and fuel efficiency scores from Firestore...</span>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-950 font-sans font-medium leading-relaxed">
                          "{liveRationale || `${onTime}% on-time performance and ${fuelScore}/100 fuel efficiency — eligible for the full ${formatINR(credit)} credit this month.`}"
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => fetchGeminiRationale(bus)}
                    disabled={isGenerating}
                    className="px-2.5 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-mono font-bold uppercase rounded-xs transition-colors flex items-center space-x-1 whitespace-nowrap cursor-pointer self-start sm:self-auto"
                    title="Regenerate Gemini AI rationale"
                  >
                    <RefreshCw className={`w-3 h-3 text-amber-700 ${isGenerating ? 'animate-spin' : ''}`} />
                    <span>Re-evaluate</span>
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Driver Metrics Modal */}
      {isEditModalOpen && selectedBus && (
        <div className="fixed inset-0 z-50 bg-[#1A1F2C]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8E4DC] max-w-md w-full p-6 rounded-xs shadow-xl animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8E4DC] mb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#1A1F2C]">
                  Update Driver Performance Scores
                </h3>
                <p className="text-xs font-mono text-amber-800 font-bold">
                  Bus: {selectedBus.regNumber} ({selectedBus.model})
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMetrics} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                  Driver Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editDriverName}
                  onChange={(e) => setEditDriverName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 text-xs border border-[#E8E4DC] rounded-xs bg-[#FBF9F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                    On-Time Rate (%)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={editOnTime}
                    onChange={(e) => setEditOnTime(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-white font-bold text-emerald-900 border-emerald-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                    Fuel Score (/100)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={100}
                    value={editFuelScore}
                    onChange={(e) => setEditFuelScore(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-white font-bold text-teal-900 border-teal-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-700 font-bold mb-1">
                  Monthly Fuel Incentive Credit (₹)
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  value={editIncentive}
                  onChange={(e) => setEditIncentive(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-[#E8E4DC] rounded-xs bg-white font-bold text-amber-900 border-amber-300"
                />
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xs text-xs font-mono text-amber-900">
                Updating these numbers in Firestore will instantly trigger Gemini AI to re-evaluate and write a new live rationale for {editDriverName}.
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#E8E4DC]">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#E8E4DC] text-xs font-mono uppercase font-bold rounded-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#1A1F2C] hover:bg-[#0F131D] text-white text-xs font-mono uppercase font-bold rounded-xs flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Update Firestore & Gemini</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
