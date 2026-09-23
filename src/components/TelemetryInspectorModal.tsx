import React, { useState } from 'react';
import { Bus, RouteItem, Driver, MaintenanceRecord } from '../types';
import { 
  X, 
  Activity, 
  Bus as BusIcon, 
  Radio, 
  Gauge, 
  Zap, 
  Fuel, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Route, 
  UserCheck, 
  Clock, 
  Calendar,
  Terminal,
  ExternalLink,
  Sliders,
  Send
} from 'lucide-react';
import { formatINR, getServiceStatus } from '../lib/utils';
import { CopyButton } from './CopyButton';

interface TelemetryInspectorModalProps {
  bus: Bus | null;
  isOpen: boolean;
  onClose: () => void;
  routes: RouteItem[];
  drivers: Driver[];
  maintenance: MaintenanceRecord[];
  onNavigateTab?: (tab: string) => void;
}

export const TelemetryInspectorModal: React.FC<TelemetryInspectorModalProps> = ({
  bus,
  isOpen,
  onClose,
  routes,
  drivers,
  maintenance,
  onNavigateTab
}) => {
  const [activeTab, setActiveTab] = useState<'telemetry' | 'contract' | 'logs'>('telemetry');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSent, setBroadcastSent] = useState(false);

  if (!isOpen || !bus) return null;

  const assignedRouteObj = routes.find(r => r.routeName === (bus.routeAssigned || (bus as any).assignedRoute));
  const assignedDriver = drivers.find(d => (d as any).assignedBus === bus.regNumber || (d as any).busRegNumber === bus.regNumber);
  const busMaintenance = maintenance.filter(m => m.busRegNumber === bus.regNumber);
  const serviceStatus = getServiceStatus(bus.nextServiceDue);

  // Simulated live telemetry metrics
  const isHealthy = bus.status === 'Active' && serviceStatus !== 'Overdue';
  const fuelLevel = 68; // percentage
  const coolantTemp = 86; // °C
  const tirePressure = { fl: 34, fr: 34, rl: 36, rr: 36 }; // PSI
  const speed = bus.status === 'Active' ? 44 : 0; // km/h
  const payloadLoad = bus.status === 'Active' ? 82 : 0; // % capacity

  const handleSendBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
      setBroadcastMessage('');
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#10131a] border border-slate-200 dark:border-neutral-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Bar */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/50 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${bus.status === 'Active' ? 'bg-emerald-500 shadow-xs shadow-emerald-500/50 animate-pulse' : 'bg-amber-500'}`} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-mono font-black text-base text-slate-900 dark:text-neutral-100">
                  {bus.regNumber}
                </span>
                <CopyButton textToCopy={bus.regNumber} label={bus.regNumber} />
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300">
                  {bus.model}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 mt-0.5">
                Bus ID: <span className="text-slate-700 dark:text-neutral-300">{bus.id || 'N/A'}</span> • Fleet Bus Telemetry
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 dark:border-neutral-800 flex space-x-6 text-xs font-mono font-bold">
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'telemetry'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Diagnostics</span>
          </button>

          <button
            onClick={() => setActiveTab('contract')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'contract'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Route className="w-3.5 h-3.5" />
            <span>Route & Driver</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'logs'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-neutral-400 dark:hover:text-white'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Live Logs</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {activeTab === 'telemetry' && (
            <div className="space-y-6">
              {/* Telemetry Metric Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs font-mono">
                    <span>Speed</span>
                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <div className="mt-1 font-mono font-black text-xl text-slate-900 dark:text-neutral-100">
                    {speed} <span className="text-xs font-normal text-slate-400">km/h</span>
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    {speed > 0 ? '● In Transit' : '○ Standby at Depot'}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs font-mono">
                    <span>Energy / Fuel</span>
                    <Fuel className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <div className="mt-1 font-mono font-black text-xl text-slate-900 dark:text-neutral-100">
                    {fuelLevel}%
                  </div>
                  <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400 mt-1">
                    Est. Range: ~380 km
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs font-mono">
                    <span>Coolant Temp</span>
                    <Zap className="w-3.5 h-3.5 text-cyan-500" />
                  </div>
                  <div className="mt-1 font-mono font-black text-xl text-slate-900 dark:text-neutral-100">
                    {coolantTemp}°C
                  </div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 mt-1">
                    Optimal Thermal Band
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800">
                  <div className="flex items-center justify-between text-slate-500 dark:text-neutral-400 text-xs font-mono">
                    <span>Passenger Load</span>
                    <Gauge className="w-3.5 h-3.5 text-violet-500" />
                  </div>
                  <div className="mt-1 font-mono font-black text-xl text-slate-900 dark:text-neutral-100">
                    {payloadLoad}%
                  </div>
                  <div className="text-[10px] font-mono text-violet-600 dark:text-violet-400 mt-1">
                    {bus.capacity ? `${Math.round((bus.capacity * payloadLoad) / 100)}/${bus.capacity} seats` : 'Occupied'}
                  </div>
                </div>
              </div>

              {/* Vehicle Sub-Systems Matrix */}
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold uppercase text-slate-700 dark:text-neutral-300">
                    Chassis & Tire Pressure (PSI)
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                    All 4 Sensors Calibrated
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700">
                    <span className="text-[10px] text-slate-400">Front Left</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{tirePressure.fl} PSI</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700">
                    <span className="text-[10px] text-slate-400">Front Right</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{tirePressure.fr} PSI</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700">
                    <span className="text-[10px] text-slate-400">Rear Left</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{tirePressure.rl} PSI</div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-white dark:bg-neutral-800/80 border border-slate-200 dark:border-neutral-700">
                    <span className="text-[10px] text-slate-400">Rear Right</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{tirePressure.rr} PSI</div>
                  </div>
                </div>
              </div>

              {/* Maintenance Health Status */}
              <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-neutral-900/40 border border-slate-200 dark:border-neutral-800 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ShieldCheck className={`w-5 h-5 ${serviceStatus === 'Overdue' ? 'text-red-500' : serviceStatus === 'Due' ? 'text-amber-500' : 'text-emerald-500'}`} />
                  <div>
                    <div className="text-xs font-mono font-bold text-slate-900 dark:text-neutral-100">
                      Service Health: {serviceStatus === 'Overdue' ? 'Critical Service Overdue' : serviceStatus === 'Due' ? 'Service Due Soon' : 'Optimal Inspection'}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
                      Next Service: {bus.nextServiceDue || 'Not recorded'} • Odometer: {bus.odometerKm ? `${bus.odometerKm.toLocaleString('en-IN')} km` : '18,450 km'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onClose();
                    onNavigateTab?.('fleet');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-xs font-mono font-bold transition-colors cursor-pointer"
                >
                  Log Service
                </button>
              </div>

              {/* Live Operations Radio Broadcast */}
              <form onSubmit={handleSendBroadcast} className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-xs font-mono font-bold text-amber-900 dark:text-amber-300">
                    <Radio className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-pulse" />
                    <span>Instant Driver & Bus Broadcast</span>
                  </div>
                  {broadcastSent && (
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
                      ✓ Broadcast Dispatched
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder={`Send message to driver of bus ${bus.regNumber}...`}
                    className="flex-1 px-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-mono font-black rounded-lg transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'contract' && (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800">
                  <span className="font-bold text-slate-900 dark:text-neutral-100">Assigned Route Details</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                    Active Route
                  </span>
                </div>

                {assignedRouteObj ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Route:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{assignedRouteObj.routeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Route Distance:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{assignedRouteObj.distanceKm} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Scheduled Frequency:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{assignedRouteObj.tripsPerDay} trips / day</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Calculated Tariff:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatINR(assignedRouteObj.computedFare)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 py-2">
                    No active route assigned to this bus.
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-neutral-800">
                  <span className="font-bold text-slate-900 dark:text-neutral-100">Assigned Driver</span>
                  <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-neutral-800 text-slate-700 dark:text-neutral-300 text-[10px] font-bold">
                    License Verified
                  </span>
                </div>

                {assignedDriver ? (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Driver Name:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{assignedDriver.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">License Number:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{assignedDriver.licenseNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Contact:</span>
                      <span className="font-bold text-slate-900 dark:text-white">{assignedDriver.phone}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 py-2">
                    Standard pool driver allocated on shift dispatch.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="bg-slate-950 text-emerald-400 p-4 rounded-xl font-mono text-[11px] space-y-2 max-h-64 overflow-y-auto border border-slate-800">
              <div className="text-slate-500 pb-1 border-b border-slate-800 text-[10px]">
                [LIVE LOGS: BUS_{bus.regNumber.replace(/[^A-Z0-9]/gi, '_')}]
              </div>
              <div>[21:44:12] GPS PING: Lat 12.9716, Lng 77.5946, Accuracy 2.1m</div>
              <div>[21:46:30] LIVE STATUS: Speed {speed}km/h | Fuel {fuelLevel}%</div>
              <div>[21:48:02] ROUTE CHECKPOINT: Passed on schedule</div>
              <div>[21:50:19] TIRE PRESSURE: 4/4 sensors reporting nominal pressure</div>
              <div>[21:51:45] HEALTH CHECK: Engine ECU status normal</div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/50 flex items-center justify-between">
          <span className="text-[11px] font-mono text-slate-500 dark:text-neutral-400">
            Tranzit Fleet Bus Telemetry v3.4
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-white text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
