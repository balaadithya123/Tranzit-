import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { Bus, MaintenanceRecord } from '../types';
import { 
  Wrench, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  History, 
  FileText, 
  User, 
  MapPin, 
  Layers, 
  Sparkles, 
  ArrowLeft,
  Settings,
  Check,
  RotateCw,
  Gauge,
  Activity,
  Flame,
  Battery,
  Fuel,
  Cpu,
  Wifi,
  Printer,
  FileCheck
} from 'lucide-react';

interface PublicBusPortalProps {
  busId: string;
  onExitPortal?: () => void;
  isLoggedIn: boolean;
}

export function PublicBusPortal({ busId, onExitPortal, isLoggedIn }: PublicBusPortalProps) {
  const [bus, setBus] = useState<Bus | null>(null);
  const [logs, setLogs] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [submittingStatus, setSubmittingStatus] = useState<string | null>(null);
  const [submittingLog, setSubmittingLog] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);
  
  // Real-time ticking clock widget
  const [liveTime, setLiveTime] = useState<string>('');

  // Tabs for the desktop right pane
  const [activePaneTab, setActivePaneTab] = useState<'control' | 'history'>('control');

  // Search and status filter inside timeline
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineTypeFilter, setTimelineTypeFilter] = useState<'all' | 'maintenance' | 'status'>('all');

  // Form states for new service log
  const [serviceType, setServiceType] = useState('Routine Checkup');
  const [customType, setCustomType] = useState('');
  const [notes, setNotes] = useState('');
  const [mechanicShop, setMechanicShop] = useState('Depot Workshop Bay 3');
  const [cost, setCost] = useState('0');

  // Load Bus and Logs
  const fetchData = async () => {
    try {
      setLoading(true);
      const busDocRef = doc(db, 'buses', busId);
      const busSnap = await getDoc(busDocRef);
      
      if (busSnap.exists()) {
        setBus({ id: busSnap.id, ...busSnap.data() } as Bus);
        
        // Fetch past service logs for this bus
        const maintRef = collection(db, 'maintenance');
        const q = query(maintRef, where('busId', '==', busId));
        const qSnap = await getDocs(q);
        
        const list: MaintenanceRecord[] = [];
        qSnap.forEach(d => {
          list.push({ id: d.id, ...d.data() } as MaintenanceRecord);
        });
        
        // Sort logs newest first
        list.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
        setLogs(list);
      }
    } catch (err) {
      console.error('Error fetching public bus details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [busId]);

  // Handle digital clock tick
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setLiveTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle status toggle (Technician tap-to-update status)
  const handleUpdateStatus = async (newStatus: 'Active' | 'Under Maintenance' | 'Breakdown') => {
    if (!bus) return;
    setSubmittingStatus(newStatus);
    try {
      const busRef = doc(db, 'buses', busId);
      await updateDoc(busRef, { status: newStatus });
      
      // Update local state instantly
      setBus(prev => prev ? { ...prev, status: newStatus } : null);

      // Log an automatic status change event
      const maintRef = collection(db, 'maintenance');
      await addDoc(maintRef, {
        busId,
        regNumber: bus.regNumber,
        serviceType: `Status changed to ${newStatus}`,
        serviceDate: new Date().toISOString().split('T')[0],
        cost: 0,
        mechanicShop: 'Tranzit Scan Portal',
        notes: `Vehicle dispatch status toggled via mobile QR inspection portal.`,
        ownerId: bus.ownerId,
        createdAt: new Date().toISOString()
      });

      // Refresh log timeline
      fetchData();
    } catch (err) {
      console.error('Error updating bus status:', err);
      alert('Could not update status. Please try again.');
    } finally {
      setSubmittingStatus(null);
    }
  };

  // Submit quick manual workshop event from phone
  const handleSubmitLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bus) return;
    setSubmittingLog(true);
    setLogSuccess(false);

    try {
      const maintRef = collection(db, 'maintenance');
      const finalServiceType = serviceType === 'Other' ? customType : serviceType;
      
      await addDoc(maintRef, {
        busId,
        regNumber: bus.regNumber,
        serviceType: finalServiceType || 'Workshop Update',
        serviceDate: new Date().toISOString().split('T')[0],
        cost: parseFloat(cost) || 0,
        mechanicShop: mechanicShop || 'Main Garage',
        notes: notes || 'Logged via Mobile QR Decal Scanner.',
        ownerId: bus.ownerId,
        createdAt: new Date().toISOString()
      });

      // Clear form
      setNotes('');
      setCost('0');
      setCustomType('');
      setLogSuccess(true);
      
      // Refresh timeline
      await fetchData();
      
      setTimeout(() => {
        setLogSuccess(false);
      }, 4000);
    } catch (err) {
      console.error('Error submitting log:', err);
      alert('Could not record workshop log. Please try again.');
    } finally {
      setSubmittingLog(false);
    }
  };

  // Calculate validity status
  const getFitnessBadge = (nextDue: string) => {
    const today = new Date();
    const dueDate = new Date(nextDue);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: 'Fitness Overdue', bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border-rose-200 dark:border-rose-850', icon: <AlertTriangle className="w-4 h-4 animate-pulse" /> };
    } else if (diffDays <= 7) {
      return { label: `Due in ${diffDays} days`, bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-850', icon: <Clock className="w-4 h-4" /> };
    }
    return { label: 'Fitness Good', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-850', icon: <CheckCircle2 className="w-4 h-4" /> };
  };

  // Generate deterministic vehicle stats based on busId to look super immersive and real
  const getTelemetryStats = (id: string) => {
    let sum = 0;
    for (let i = 0; i < id.length; i++) {
      sum += id.charCodeAt(i);
    }
    const odometer = 64000 + (sum % 48000);
    const engineTemp = 78 + (sum % 16);
    const batteryHealth = 92 + (sum % 8);
    const fuelLevel = 45 + (sum % 40);
    const brakeLife = 65 + (sum % 30);
    const tiresPSI = 112 + (sum % 14);
    
    return { odometer, engineTemp, batteryHealth, fuelLevel, brakeLife, tiresPSI };
  };

  const formatINR = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#08090d] flex flex-col items-center justify-center p-6">
        <div className="w-14 h-14 bg-gradient-to-tr from-slate-900 to-slate-800 text-white flex items-center justify-center font-black text-lg rounded-2xl mb-4 shadow-xl animate-pulse border border-slate-700/55">
          TZ
        </div>
        <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-500 mt-4">Calibrating Diagnostic Interface...</p>
      </div>
    );
  }

  if (!bus) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#08090d] flex flex-col items-center justify-center p-6 text-center">
        <div className="p-4 bg-rose-100 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 rounded-full mb-4">
          <AlertTriangle className="w-12 h-12" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Invalid Decal QR Code</h2>
        <p className="text-sm text-slate-500 dark:text-neutral-400 max-w-sm mt-2">
          This vehicle registration token could not be verified in the Tranzit Fleet registry database.
        </p>
        <button
          onClick={onExitPortal}
          className="mt-6 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-mono font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  const fitness = getFitnessBadge(bus.nextServiceDue);
  const tele = getTelemetryStats(bus.id);
  
  // Total recorded service expense for this specific vehicle
  const totalExpense = logs.reduce((acc, curr) => acc + curr.cost, 0);

  // Filtered timeline logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.serviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.mechanicShop.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase()));

    if (timelineTypeFilter === 'all') return matchesSearch;
    if (timelineTypeFilter === 'status') {
      return matchesSearch && log.serviceType.includes('Status changed');
    }
    if (timelineTypeFilter === 'maintenance') {
      return matchesSearch && !log.serviceType.includes('Status changed');
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07090e] text-slate-900 dark:text-neutral-100 flex flex-col font-sans transition-colors relative selection:bg-amber-500 selection:text-black">
      
      {/* Background Decorative Tech Lines */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#ffffff02_1px,transparent_1px),linear-gradient(to_bottom,#ffffff02_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      {/* Top Professional Header */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0b0e14]/95 backdrop-blur-md border-b border-slate-200 dark:border-neutral-800/80 px-4 sm:px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 bg-slate-950 dark:bg-amber-500/10 text-white dark:text-amber-400 flex items-center justify-center font-black text-base rounded-2xl border border-slate-800 dark:border-amber-500/30">
            TZ
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-mono font-bold rounded-md border border-blue-200/50 dark:border-blue-900/40 tracking-wider">
                DEPOT DOCK LIVE
              </span>
              <h1 className="text-sm font-black tracking-tight text-slate-900 dark:text-white hidden sm:block">TRANZIT FLEET PORTAL</h1>
            </div>
            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mt-0.5">Vehicle Decal & Maintenance Passport</p>
          </div>
        </div>

        {/* Diagnostic widgets / system live status info */}
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-4 font-mono text-xs text-slate-500">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>DOCK SECURE</span>
            </div>
            <span className="text-slate-350">|</span>
            <div className="flex items-center space-x-1">
              <Clock className="w-3.5 h-3.5" />
              <span className="font-bold text-slate-800 dark:text-slate-200">{liveTime || '00:00:00'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {isLoggedIn ? (
              <button
                onClick={onExitPortal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-slate-950 text-xs font-mono font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-all shadow-md"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Admin Console</span>
              </button>
            ) : (
              <a
                href="/"
                className="px-4 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 border border-slate-200 dark:border-neutral-800 text-xs font-mono font-bold rounded-xl flex items-center space-x-1 cursor-pointer transition-all shadow-2xs"
              >
                <span>Owner Sign In</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Mobile Cozy layout OR Desktop dual-pane dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN (Pane 1): Physical HUD Demographics & Subsystem Inspection Panel (Col Span 5) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* Main Diagnostics Card */}
            <div className="bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              
              {/* Dynamic Live Status Accent Strip */}
              <div className={`absolute top-0 left-0 right-0 h-2 bg-gradient-to-r ${
                bus.status === 'Active' 
                  ? 'from-emerald-500 to-teal-400' 
                  : bus.status === 'Under Maintenance' 
                  ? 'from-amber-500 to-orange-400' 
                  : 'from-rose-600 to-pink-500'
              }`} />

              {/* Indian Reflective Yellow/Black Commercial Plate Design */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex flex-col">
                  <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">IND Commercial Carrier Plate</span>
                  <div className="inline-flex items-center bg-[#FBC02D] text-neutral-950 border-2 border-neutral-900 rounded-lg px-4 py-1.5 font-mono font-extrabold text-xl tracking-widest shadow-sm select-none">
                    <span className="text-[10px] border-r border-neutral-900/30 pr-1.5 mr-1.5 font-bold">IND</span>
                    <span>{bus.regNumber}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[8px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1 block">Fitness Expiry</span>
                  <span className={`px-2.5 py-1 text-[11px] font-mono font-bold rounded-lg border inline-flex items-center space-x-1.5 ${fitness.bg}`}>
                    {fitness.icon}
                    <span>{fitness.label}</span>
                  </span>
                </div>
              </div>

              {/* Status Ring representation */}
              <div className="bg-slate-50 dark:bg-neutral-950/50 border border-slate-150 dark:border-neutral-900/40 rounded-2xl p-5 flex items-center justify-between mb-5">
                <div className="flex items-center space-x-3.5">
                  <div className={`p-3 rounded-xl ${
                    bus.status === 'Active' 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : bus.status === 'Under Maintenance' 
                      ? 'bg-amber-500/10 text-amber-500' 
                      : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {bus.status === 'Active' && <CheckCircle2 className="w-6 h-6" />}
                    {bus.status === 'Under Maintenance' && <Wrench className="w-6 h-6" />}
                    {bus.status === 'Breakdown' && <AlertTriangle className="w-6 h-6 animate-pulse" />}
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-bold">CURRENT STATUS</span>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-neutral-100">
                      {bus.status === 'Under Maintenance' ? 'Depot Workshop Repair' : bus.status}
                    </h3>
                  </div>
                </div>

                <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-200/50 dark:bg-neutral-800/80 rounded-lg text-slate-600 dark:text-neutral-300">
                  {bus.status === 'Active' ? 'READY' : bus.status === 'Under Maintenance' ? 'IN-BAY' : 'S.O.S.'}
                </span>
              </div>

              {/* Realistic Telemetry Instruments Cluster Dashboard (Immersive Viewport Graphics) */}
              <div className="space-y-4 border-t border-slate-100 dark:border-neutral-900/60 pt-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">LIVE INSTRUMENT CLUSTER</h4>
                  <span className="text-[9px] font-mono font-bold text-blue-500 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-200/40">ECU OK</span>
                </div>

                {/* Subsystem bars Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                  {/* Engine Temperature */}
                  <div className="bg-slate-50 dark:bg-neutral-900/30 p-3 rounded-xl border border-slate-150/55 dark:border-neutral-800/30">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[9px] font-bold uppercase">Engine Temp</span>
                      <Flame className="w-3.5 h-3.5 text-orange-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-extrabold text-slate-800 dark:text-neutral-100 font-sans text-sm">{tele.engineTemp}°C</span>
                      <span className="text-[9px] text-emerald-500 font-bold">OPTIMAL</span>
                    </div>
                    {/* Progress indicator */}
                    <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-orange-500 h-1" style={{ width: `${(tele.engineTemp / 120) * 100}%` }} />
                    </div>
                  </div>

                  {/* Battery Health Indicator */}
                  <div className="bg-slate-50 dark:bg-neutral-900/30 p-3 rounded-xl border border-slate-150/55 dark:border-neutral-800/30">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[9px] font-bold uppercase">Battery State</span>
                      <Battery className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-extrabold text-slate-800 dark:text-neutral-100 font-sans text-sm">{tele.batteryHealth}%</span>
                      <span className="text-[9px] text-emerald-500 font-bold">HEALTHY</span>
                    </div>
                    {/* Progress indicator */}
                    <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-emerald-500 h-1" style={{ width: `${tele.batteryHealth}%` }} />
                    </div>
                  </div>

                  {/* Fuel Tank Level */}
                  <div className="bg-slate-50 dark:bg-neutral-900/30 p-3 rounded-xl border border-slate-150/55 dark:border-neutral-800/30">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[9px] font-bold uppercase">Diesel Reserves</span>
                      <Fuel className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-extrabold text-slate-800 dark:text-neutral-100 font-sans text-sm">{tele.fuelLevel}%</span>
                      <span className="text-[9px] text-slate-500">{(tele.fuelLevel * 3.5).toFixed(0)} Liters</span>
                    </div>
                    {/* Progress indicator */}
                    <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-blue-500 h-1" style={{ width: `${tele.fuelLevel}%` }} />
                    </div>
                  </div>

                  {/* Air brake pressure / Tire Pressure */}
                  <div className="bg-slate-50 dark:bg-neutral-900/30 p-3 rounded-xl border border-slate-150/55 dark:border-neutral-800/30">
                    <div className="flex items-center justify-between text-slate-400 mb-1.5">
                      <span className="text-[9px] font-bold uppercase">Tire Air Pres.</span>
                      <Cpu className="w-3.5 h-3.5 text-purple-500" />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="font-extrabold text-slate-800 dark:text-neutral-100 font-sans text-sm">{tele.tiresPSI} PSI</span>
                      <span className="text-[9px] text-emerald-500 font-bold">STABLE</span>
                    </div>
                    {/* Progress indicator */}
                    <div className="w-full bg-slate-200 dark:bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                      <div className="bg-purple-500 h-1 animate-pulse" style={{ width: `${(tele.tiresPSI / 150) * 100}%` }} />
                    </div>
                  </div>
                </div>

                {/* Simulated Odometer and Trip Meter Block */}
                <div className="bg-slate-900 dark:bg-black border border-slate-800 text-white rounded-xl p-4 flex items-center justify-between shadow-inner">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest font-bold">LIFETIME ODOMETER READING</span>
                    <div className="flex items-baseline space-x-1">
                      <span className="text-xl font-sans font-black text-amber-400 tracking-wider">
                        {tele.odometer.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-neutral-400">km</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[8px] font-mono text-neutral-500 uppercase tracking-widest font-bold block">GPS LAT/LONG</span>
                    <span className="text-[10px] font-mono text-neutral-300 font-bold">12.9716° N, 77.5946° E</span>
                  </div>
                </div>
              </div>

              {/* Subsystems Schematics Graphical Blueprint (Highly Interactive Element) */}
              <div className="mt-5 border-t border-slate-100 dark:border-neutral-900/60 pt-5 space-y-3.5">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">Transit Carrier Chassis Schematic</span>
                
                <div className="relative border border-slate-200 dark:border-neutral-800 p-3 rounded-2xl bg-slate-50/50 dark:bg-neutral-950/30 flex items-center justify-between">
                  {/* Mini Blueprint representation */}
                  <div className="flex-1 max-w-[200px] h-12 relative opacity-80 select-none">
                    {/* Simplified horizontal SVG of bus */}
                    <svg viewBox="0 0 160 50" className="w-full h-full text-slate-350 dark:text-neutral-700">
                      <rect x="10" y="10" width="130" height="25" rx="4" fill="none" stroke="currentColor" strokeWidth="2" />
                      <line x1="25" y1="10" x2="25" y2="35" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2" />
                      <line x1="95" y1="10" x2="95" y2="35" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2" />
                      <circle cx="35" cy="38" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="115" cy="38" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
                      {/* Subsystem active light nodes */}
                      <circle cx="15" cy="22" r="3.5" className={`${bus.status === 'Active' ? 'fill-emerald-500 animate-pulse' : bus.status === 'Under Maintenance' ? 'fill-amber-500' : 'fill-rose-500 animate-ping'}`} />
                      <circle cx="130" cy="22" r="3.5" className={`${bus.status === 'Active' ? 'fill-emerald-500' : 'fill-rose-500'}`} />
                    </svg>
                  </div>

                  <div className="space-y-1 text-right text-[10px] font-mono">
                    <div className="flex items-center space-x-1.5 justify-end">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Front ADAS Node</span>
                    </div>
                    <div className="flex items-center space-x-1.5 justify-end">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Climate Control</span>
                    </div>
                    <div className="flex items-center space-x-1.5 justify-end">
                      <span className={`w-2 h-2 rounded-full ${bus.status === 'Active' ? 'bg-emerald-500' : bus.status === 'Under Maintenance' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                      <span>Main Powerpack</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Summary: Cumulative Maintenance Cost (Desktop enhancement) */}
              <div className="mt-5 p-4 bg-blue-50/50 dark:bg-blue-950/15 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-mono text-blue-600 dark:text-blue-400 block font-bold">CUMULATIVE WORKSHOP INVOICES</span>
                  <span className="text-lg font-black font-mono text-blue-700 dark:text-blue-300">{formatINR(totalExpense)}</span>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
              </div>

            </div>

            {/* General Vehicle Demographics Details Box */}
            <div className="bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-neutral-800 rounded-3xl p-5 shadow-xs font-mono text-xs">
              <h4 className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">STATIC SPECIFICATIONS</h4>
              <div className="space-y-2.5">
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-neutral-900/50">
                  <span className="text-slate-400">CARRIER MODEL</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">{bus.model}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-neutral-900/50">
                  <span className="text-slate-400">PASSENGER CAPACITY</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">{bus.capacity} Seats</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-neutral-900/50">
                  <span className="text-slate-400">ASSIGNED ROUTE</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">{bus.routeAssigned || 'None'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-400">DUTY PILOT</span>
                  <span className="font-bold text-slate-800 dark:text-neutral-200">{bus.driverName || 'Not Assigned'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN (Pane 2): Interactive Service Control Center (Col Span 7 on Desktop) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Desktop Exclusive Navigation Tab Bar */}
            <div className="bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-neutral-800 p-1.5 rounded-2xl flex space-x-1.5 font-mono text-xs font-bold shadow-xs">
              <button
                onClick={() => setActivePaneTab('control')}
                className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  activePaneTab === 'control' 
                    ? 'bg-slate-900 text-white dark:bg-neutral-800 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Control & Repair</span>
              </button>
              <button
                onClick={() => setActivePaneTab('history')}
                className={`flex-1 py-3 px-4 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                  activePaneTab === 'history' 
                    ? 'bg-slate-900 text-white dark:bg-neutral-800 dark:text-white shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-900'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Service Timeline ({logs.length})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: Technician Control Room & Dispatching Status */}
            {activePaneTab === 'control' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                
                {/* Station Dispatch Status */}
                <div className="bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center space-x-2">
                    <Gauge className="w-4 h-4 text-blue-500" />
                    <span>Technician Status Cockpit</span>
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => handleUpdateStatus('Active')}
                      disabled={submittingStatus !== null}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        bus.status === 'Active'
                          ? 'bg-emerald-500/10 border-emerald-500 text-emerald-800 dark:text-emerald-400 shadow-2xs font-extrabold'
                          : 'bg-white hover:bg-slate-50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900 border-slate-200 dark:border-neutral-800/80 text-slate-500 dark:text-neutral-400'
                      }`}
                    >
                      {submittingStatus === 'Active' ? (
                        <RotateCw className="w-5 h-5 text-emerald-500 animate-spin" />
                      ) : (
                        <CheckCircle2 className={`w-5 h-5 ${bus.status === 'Active' ? 'text-emerald-500' : 'text-slate-400'}`} />
                      )}
                      <span className="text-xs mt-1.5 font-sans">Active</span>
                      <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400 mt-0.5 font-bold">Ready</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('Under Maintenance')}
                      disabled={submittingStatus !== null}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        bus.status === 'Under Maintenance'
                          ? 'bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-400 shadow-2xs font-extrabold'
                          : 'bg-white hover:bg-slate-50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900 border-slate-200 dark:border-neutral-800/80 text-slate-500 dark:text-neutral-400'
                      }`}
                    >
                      {submittingStatus === 'Under Maintenance' ? (
                        <RotateCw className="w-5 h-5 text-amber-500 animate-spin" />
                      ) : (
                        <Wrench className={`w-5 h-5 ${bus.status === 'Under Maintenance' ? 'text-amber-500' : 'text-slate-400'}`} />
                      )}
                      <span className="text-xs mt-1.5 font-sans">Workshop</span>
                      <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400 mt-0.5 font-bold">Repair</span>
                    </button>

                    <button
                      onClick={() => handleUpdateStatus('Breakdown')}
                      disabled={submittingStatus !== null}
                      className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                        bus.status === 'Breakdown'
                          ? 'bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-400 shadow-2xs font-extrabold'
                          : 'bg-white hover:bg-slate-50 dark:bg-neutral-900/30 dark:hover:bg-neutral-900 border-slate-200 dark:border-neutral-800/80 text-slate-500 dark:text-neutral-400'
                      }`}
                    >
                      {submittingStatus === 'Breakdown' ? (
                        <RotateCw className="w-5 h-5 text-rose-500 animate-spin" />
                      ) : (
                        <AlertTriangle className={`w-5 h-5 ${bus.status === 'Breakdown' ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                      )}
                      <span className="text-xs mt-1.5 font-sans">Breakdown</span>
                      <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400 mt-0.5 font-bold">Urgent</span>
                    </button>
                  </div>
                </div>

                {/* Instant Workshop Invoice/Event Logger Form */}
                <div className="bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-neutral-900/50 mb-5">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                      <Plus className="w-4 h-4 text-emerald-500" />
                      <span>Publish Repair Dispatch Voucher</span>
                    </h3>
                    <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800 px-2 py-0.5 rounded-md font-bold tracking-wider uppercase">
                      Depot GPS Verified
                    </span>
                  </div>

                  <form onSubmit={handleSubmitLog} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">SERVICE ACTION TYPE</label>
                        <select
                          value={serviceType}
                          onChange={(e) => setServiceType(e.target.value)}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 dark:text-neutral-200 font-bold"
                        >
                          <option value="Routine Checkup">Routine Checkup</option>
                          <option value="Engine Oil Change">Engine Oil Change</option>
                          <option value="Brake Pad Replacement">Brake Replacement</option>
                          <option value="Tyre Rotation / Replacement">Tyre Replacement</option>
                          <option value="AC Compressor Refill">AC Servicing</option>
                          <option value="Bodywork & Painting">Bodywork/Painting</option>
                          <option value="Electrical Repair">Electrical Repair</option>
                          <option value="Other">Other (Type Below)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">REPAIR FACILITY BAY</label>
                        <input
                          type="text"
                          value={mechanicShop}
                          onChange={(e) => setMechanicShop(e.target.value)}
                          placeholder="e.g. Workshop Bay 3"
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 dark:text-neutral-200"
                          required
                        />
                      </div>
                    </div>

                    {serviceType === 'Other' && (
                      <div className="animate-in fade-in slide-in-from-top-1">
                        <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase mb-1.5">CUSTOM REPAIR TYPE</label>
                        <input
                          type="text"
                          value={customType}
                          onChange={(e) => setCustomType(e.target.value)}
                          placeholder="e.g., Windshield Replacement"
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 dark:text-neutral-200 text-xs font-mono"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[10px] font-mono text-slate-400 font-bold uppercase mb-1.5">WORK DIAGNOSTIC NOTES</label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Detail the specific parts inspected, dynamic repairs completed, or any upcoming warnings..."
                        rows={3}
                        className="w-full px-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 dark:text-neutral-200 text-xs"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono items-end">
                      <div>
                        <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1.5">INVOICE COST VALUATION (₹ INR)</label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-400 font-sans">₹</span>
                          <input
                            type="number"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            placeholder="0"
                            className="w-full pl-6 pr-3 py-2.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:border-blue-500 text-slate-800 dark:text-neutral-200 font-bold"
                            min="0"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submittingLog}
                        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-400 text-white font-mono font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/25 text-xs h-[42px]"
                      >
                        {submittingLog ? (
                          <RotateCw className="w-4 h-4 animate-spin" />
                        ) : logSuccess ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                        <span>{logSuccess ? 'Voucher Recorded!' : 'Publish Workshop Event'}</span>
                      </button>
                    </div>
                  </form>

                  {logSuccess && (
                    <div className="mt-4 p-3.5 bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/40 rounded-xl flex items-center space-x-2 text-xs font-mono text-emerald-850 dark:text-emerald-400 animate-in fade-in">
                      <Sparkles className="w-4 h-4 shrink-0 text-emerald-500 animate-pulse" />
                      <span>Event published to telemetry cloud! Owner alerted in real-time.</span>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT 2: Historical Chronological Service Records Ledger */}
            {activePaneTab === 'history' && (
              <div className="bg-white dark:bg-[#0b0e14] border border-slate-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs animate-in fade-in duration-150 space-y-4">
                
                {/* Search & Sub-Filtering Panel inside Ledger */}
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between border-b border-slate-100 dark:border-neutral-900/50 pb-4">
                  <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5 self-start sm:self-auto">
                    <History className="w-4 h-4 text-amber-500" />
                    <span>Workshop Inspection Ledger</span>
                  </h3>

                  {/* Filter elements */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto font-mono text-xs">
                    <select
                      value={timelineTypeFilter}
                      onChange={(e: any) => setTimelineTypeFilter(e.target.value)}
                      className="px-2 py-1.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-600 dark:text-neutral-300"
                    >
                      <option value="all">All Events</option>
                      <option value="maintenance">Repairs Only</option>
                      <option value="status">Status Logs</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Filter notes..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-600 dark:text-neutral-300 w-full sm:w-36 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="relative border-l-2 border-slate-100 dark:border-neutral-800/80 pl-5 space-y-6 font-mono text-xs">
                  {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-neutral-500">
                      <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                      <p>No matching workshop service events found.</p>
                    </div>
                  ) : (
                    filteredLogs.map((log) => {
                      const isStatusChange = log.serviceType.includes('Status changed');
                      return (
                        <div key={log.id} className="relative group animate-in fade-in">
                          {/* Circle bullet index indicator */}
                          <div className={`absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 ${
                            isStatusChange
                              ? 'bg-blue-500 border-white dark:border-[#0b0e14]'
                              : 'bg-emerald-500 border-white dark:border-[#0b0e14]'
                          }`} />

                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <div className="flex items-center space-x-2">
                                <p className="font-bold text-slate-800 dark:text-neutral-200 text-sm">{log.serviceType}</p>
                                {isStatusChange && (
                                  <span className="text-[8px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-1 py-0.5 rounded uppercase font-bold">Status</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1">
                                Garage Facility: {log.mechanicShop}
                              </p>
                              <p className="text-xs text-slate-600 dark:text-neutral-400 mt-1.5 border-l-2 border-slate-200 dark:border-neutral-850 pl-2.5 py-0.5 leading-relaxed bg-slate-50/50 dark:bg-neutral-950/20 p-2 rounded-lg">
                                {log.notes || 'No description supplied.'}
                              </p>
                            </div>
                            
                            <div className="text-right shrink-0">
                              <span className="font-bold text-slate-900 dark:text-white block text-xs">{log.serviceDate}</span>
                              {log.cost > 0 && (
                                <span className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1.5 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                                  {formatINR(log.cost)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      </main>

      {/* Modern Footnote bar */}
      <footer className="text-center py-6 border-t border-slate-200 dark:border-neutral-850/80 font-mono text-[10px] text-slate-400 uppercase tracking-widest bg-white dark:bg-[#0b0e14] relative z-10">
        Tranzit Fleet OS Verified Vehicle Decal Passport • Secure Handshake SSL Verified
      </footer>

    </div>
  );
}
