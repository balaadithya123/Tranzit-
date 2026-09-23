import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, MaintenanceRecord, Driver, RouteItem } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getServiceStatus, formatINR, downloadCSV } from '../lib/utils';
import { CopyButton } from './CopyButton';
import { StatCard } from './StatCard';
import { ReportsModal } from './ReportsModal';
import { MaintenanceRoadmapChart } from './MaintenanceRoadmapChart';
import {
  Wrench,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Bus as BusIcon,
  X,
  Check,
  Filter,
  Trash2,
  Download,
  FileSpreadsheet,
  Search,
  Activity,
  ShieldCheck,
  History,
  ChevronDown, // Add ChevronDown for dropdown
  QrCode,
  Printer,
  ExternalLink
} from 'lucide-react';

interface FleetMaintenanceViewProps {
  owner: OwnerProfile;
  initialTab?: 'fleet' | 'service';
}

export const FleetMaintenanceView: React.FC<FleetMaintenanceViewProps> = ({ owner, initialTab = 'fleet' }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]); // New state
  const [routes, setRoutes] = useState<RouteItem[]>([]); // New state
  const [activeSubTab, setActiveSubTab] = useState<'fleet' | 'service'>(initialTab);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Good' | 'Due' | 'Overdue'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [isReportsModalOpen, setIsReportsModalOpen] = useState(false);

  // Bus QR state
  const [qrBus, setQrBus] = useState<Bus | null>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerView, setScannerView] = useState<'camera' | 'select'>('camera');
  const [cameraScanning, setCameraScanning] = useState(false);
  const [scannedResult, setScannedResult] = useState<Bus | null>(null);

  // Deep link detection for scanned QR code (?busId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlBusId = params.get('busId');
    if (urlBusId && buses.length > 0) {
      const found = buses.find(b => b.id === urlBusId);
      if (found) {
        setQrBus(found);
        // Clean URL to prevent popup repeating on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [buses]);

  useEffect(() => {
    setActiveSubTab(initialTab);
  }, [initialTab]);

  // Modal State for Logging Maintenance / Updating Service Date
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);

  const [serviceType, setServiceType] = useState('Scheduled Preventive Service');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = useState('');
  const [cost, setCost] = useState<number>(0);
  const [mechanicShop, setMechanicShop] = useState('');
  const [notes, setNotes] = useState('');

  // Modal State for Adding New Bus to Fleet
  const [isAddBusModalOpen, setIsAddBusModalOpen] = useState(false);
  const [newRegNumber, setNewRegNumber] = useState('KA 01 FA ' + Math.floor(1000 + Math.random() * 9000));
  const [newModel, setNewModel] = useState('');
  const [newCapacity, setNewCapacity] = useState<number>(50);
  const [newRoute, setNewRoute] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newOnTime, setNewOnTime] = useState<number>(95);
  const [newFuelScore, setNewFuelScore] = useState<number>(90);
  const [newIncentiveCredit, setNewIncentiveCredit] = useState<number>(0);
  const [newNextServiceDue, setNewNextServiceDue] = useState('');

  // Lock body scroll when any modal is open
  useEffect(() => {
    if (isLogModalOpen || isAddBusModalOpen || qrBus || isScannerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isLogModalOpen, isAddBusModalOpen, qrBus, isScannerOpen]);

  // Subscribe to buses and maintenance records in Firestore
  useEffect(() => {
    if (!owner.id) return;

    // Buses
    const busesQ = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsubBuses = onSnapshot(busesQ, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Bus);
      });
      setBuses(list);
    });

    // Maintenance
    const maintQ = query(collection(db, 'maintenance'), where('ownerId', '==', owner.id));
    const unsubMaint = onSnapshot(maintQ, (snapshot) => {
      const list: MaintenanceRecord[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as MaintenanceRecord);
      });
      list.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
      setMaintenanceRecords(list);
      setLoading(false);
    });

    // Drivers
    const driversQ = query(collection(db, 'drivers'), where('ownerId', '==', owner.id));
    const unsubDrivers = onSnapshot(driversQ, (snapshot) => {
      const list: Driver[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Driver);
      });
      setDrivers(list);
    });

    // Routes
    const routesQ = query(collection(db, 'routes'), where('ownerId', '==', owner.id));
    const unsubRoutes = onSnapshot(routesQ, (snapshot) => {
      const list: RouteItem[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as RouteItem);
      });
      setRoutes(list);
    });

    return () => {
      unsubBuses();
      unsubMaint();
      unsubDrivers();
      unsubRoutes();
    };
  }, [owner.id]);

  const handlePrintQR = (bus: Bus) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const qrUrl = `${window.location.origin}?busId=${bus.id}`;
    const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrUrl)}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Tranzit QR Decal - ${bus.regNumber}</title>
          <style>
            body {
              font-family: monospace;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
              background-color: #ffffff;
              color: #000000;
            }
            .card {
              border: 5px double #000;
              padding: 40px;
              border-radius: 20px;
              max-width: 420px;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
            }
            .header-title {
              font-size: 26px;
              font-weight: 900;
              margin: 0 0 5px 0;
              letter-spacing: -1.5px;
            }
            .header-subtitle {
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              letter-spacing: 2px;
              margin-bottom: 25px;
            }
            .qr-container {
              padding: 15px;
              background: white;
              border: 1px solid #ddd;
              border-radius: 12px;
              display: inline-block;
              margin-bottom: 20px;
            }
            .qr-image {
              width: 240px;
              height: 240px;
              display: block;
            }
            .reg-badge {
              font-size: 28px;
              font-weight: 900;
              background: #f1f5f9;
              border: 3px solid #000000;
              padding: 10px 24px;
              border-radius: 12px;
              letter-spacing: 1px;
              display: inline-block;
              margin-bottom: 20px;
              font-family: monospace;
            }
            .meta-grid {
              text-align: left;
              width: 100%;
              max-width: 320px;
              margin: 0 auto;
              font-size: 13px;
              line-height: 1.6;
              border-top: 1px dashed #ccc;
              padding-top: 15px;
            }
            .meta-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 4px;
            }
            .meta-label {
              font-weight: bold;
              color: #666;
            }
            .meta-val {
              font-weight: bold;
            }
            .footer-msg {
              font-size: 10px;
              color: #888;
              margin-top: 25px;
              font-weight: bold;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="card">
            <h1 class="header-title">TRANZIT FLEET OS</h1>
            <div class="header-subtitle">Official Vehicle QR Decal</div>
            
            <div class="reg-badge">${bus.regNumber}</div>
            
            <div>
              <div class="qr-container">
                <img class="qr-image" src="${qrImgSrc}" alt="QR Decal" />
              </div>
            </div>
            
            <div class="meta-grid">
              <div class="meta-row">
                <span class="meta-label">VEHICLE MODEL:</span>
                <span class="meta-val">${bus.model}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">PILOT ASSIGNED:</span>
                <span class="meta-val">${bus.driverName || 'N/A'}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">CORRIDOR:</span>
                <span class="meta-val">${bus.routeAssigned || 'Unassigned'}</span>
              </div>
              <div class="meta-row">
                <span class="meta-label">FITNESS EXPIRE:</span>
                <span class="meta-val">${bus.nextServiceDue}</span>
              </div>
            </div>
            
            <div class="footer-msg">SCAN PASSPORT TO RETRIEVE COMPLETE WORKSHOP HISTORY</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportCSV = () => {
    const headers = [
      'Bus Registration',
      'Model',
      'Capacity',
      'Assigned Route',
      'Last Service Date',
      'Next Service Due',
      'Status'
    ];

    const rows = buses.map((b) => [
      b.regNumber,
      b.model,
      b.capacity,
      b.routeAssigned || 'Unassigned',
      b.lastServiceDate || 'N/A',
      b.nextServiceDue,
      getServiceStatus(b.nextServiceDue)
    ]);

    downloadCSV(`tranzit_fleet_${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleOpenLogModal = (bus?: Bus) => {
    const target = bus || selectedBus || buses[0] || null;
    setSelectedBus(target);
    setServiceType('Scheduled Preventive Service');
    setCost(0);
    setMechanicShop('');
    setNotes('');

    const today = new Date().toISOString().split('T')[0];
    setServiceDate(today);

    // Calculate default next due (3 months from today)
    const next = new Date();
    next.setMonth(next.getMonth() + 3);
    setNextDueDate(next.toISOString().split('T')[0]);

    setIsLogModalOpen(true);
  };

  // Submit maintenance log and update bus nextServiceDue in Firestore
  const handleSaveMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeBus = selectedBus || buses[0];
    if (!activeBus) return;

    const mid = `m-${Date.now()}`;
    const newRecord: MaintenanceRecord = {
      id: mid,
      ownerId: owner.id,
      busId: activeBus.id,
      busReg: activeBus.regNumber,
      serviceType,
      serviceDate,
      nextDueDate,
      cost: Number(cost),
      mechanicShop,
      notes
    };

    await setDoc(doc(db, 'maintenance', mid), newRecord);

    await updateDoc(doc(db, 'buses', activeBus.id), {
      lastServiceDate: serviceDate,
      nextServiceDue: nextDueDate,
      status: 'Active'
    });

    setIsLogModalOpen(false);
  };

  // Add New Bus Handler
  const handleAddNewBus = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBusId = `bus-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Handle Driver Association
    let finalDriverName = newDriverName;
    const existingDriver = drivers.find(d => d.name.toLowerCase() === newDriverName.toLowerCase());

    if (!existingDriver && newDriverName.trim() !== '') {
      const newDriverId = `driver-${Date.now()}`;
      const newDriver: Driver = {
        id: newDriverId,
        ownerId: owner.id,
        employeeId: `DRV-${Date.now().toString().slice(-4)}`,
        name: newDriverName,
        phone: 'Not provided',
        status: 'profile incomplete',
        licenseNumber: 'Not provided',
        licenseType: 'Not provided',
        licenseExpiryDate: '1970-01-01',
      };
      await setDoc(doc(db, 'drivers', newDriverId), newDriver);
    }

    const busData: Bus = {
      id: newBusId,
      ownerId: owner.id,
      regNumber: newRegNumber,
      model: newModel,
      capacity: Number(newCapacity),
      routeAssigned: newRoute,
      lastServiceDate: todayStr,
      nextServiceDue: newNextServiceDue,
      status: 'Active',
      driverName: finalDriverName,
      onTimePercent: Number(newOnTime),
      fuelEfficiencyScore: Number(newFuelScore),
      fuelIncentiveCredit: Number(newIncentiveCredit)
    };

    await setDoc(doc(db, 'buses', newBusId), busData);

    await updateDoc(doc(db, 'owners', owner.id), {
      activeBusesCount: buses.length + 1
    });

    setIsAddBusModalOpen(false);
    setNewRegNumber('KA 01 FA ' + Math.floor(1000 + Math.random() * 9000));
  };

  // Delete Bus Handler
  const handleDeleteBus = async (busId: string, regNum: string) => {
    if (!window.confirm(`Are you sure you want to remove bus ${regNum} from your fleet?`)) return;

    await deleteDoc(doc(db, 'buses', busId));

    await updateDoc(doc(db, 'owners', owner.id), {
      activeBusesCount: Math.max(0, buses.length - 1)
    });
  };

  // Filtered Buses
  const filteredBuses = buses.filter((bus) => {
    const status = getServiceStatus(bus.nextServiceDue);
    const matchesFilter = statusFilter === 'All' || status === statusFilter;
    const matchesSearch = !searchQuery || 
      bus.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bus.routeAssigned && bus.routeAssigned.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  const goodCount = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Good').length;
  const dueCount = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Due').length;
  const overdueCount = buses.filter(b => getServiceStatus(b.nextServiceDue) === 'Overdue').length;
  const totalMaintenanceSpend = maintenanceRecords.reduce((acc, m) => acc + (m.cost || 0), 0);
  const urgentAttentionBuses = buses.filter(b => {
    const s = getServiceStatus(b.nextServiceDue);
    return s === 'Overdue' || s === 'Due';
  });

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
              {activeSubTab === 'service' ? 'Fleet Workshop & Service Records' : 'Fleet Health & Preventive Maintenance'}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800 whitespace-nowrap shrink-0">
              {activeSubTab === 'service' ? `${maintenanceRecords.length} Service Logs` : `${buses.length} Vehicles`}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-start md:self-auto flex-wrap gap-y-2">
          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            title="Export CSV manifest"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>CSV</span>
          </button>

          <button
            onClick={() => setIsReportsModalOpen(true)}
            className="px-3 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            title="Generate Maintenance PDF Report"
          >
            <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>PDF Report</span>
          </button>

          <button
            onClick={() => {
              setIsScannerOpen(true);
              setScannerView('camera');
              setCameraScanning(false);
              setScannedResult(null);
            }}
            className="md:hidden px-3 py-2 bg-white dark:bg-neutral-900 hover:bg-slate-50 dark:hover:bg-neutral-800 border border-slate-200 dark:border-neutral-800 text-slate-700 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs whitespace-nowrap shrink-0"
            title="Scan Bus QR Decal"
          >
            <QrCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Scan QR Decal</span>
          </button>



          {activeSubTab === 'service' ? (
            <button
              onClick={() => handleOpenLogModal()}
              className="px-3.5 sm:px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-amber-600/20 whitespace-nowrap shrink-0"
            >
              <Wrench className="w-4 h-4 shrink-0" />
              <span>Log Service</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddBusModalOpen(true)}
              className="px-3.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20 whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span>Add Vehicle</span>
            </button>
          )}
        </div>
      </div>

      {/* Sub-tab Switcher */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-neutral-800 pb-2 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveSubTab('fleet')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap shrink-0 ${
            activeSubTab === 'fleet'
              ? 'bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-950 shadow-xs'
              : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <BusIcon className="w-3.5 h-3.5 shrink-0" />
          <span>Vehicles & Fitness ({buses.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('service')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-2 whitespace-nowrap shrink-0 ${
            activeSubTab === 'service'
              ? 'bg-slate-900 text-white dark:bg-neutral-100 dark:text-neutral-950 shadow-xs'
              : 'bg-slate-100 dark:bg-neutral-900 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Wrench className="w-3.5 h-3.5 shrink-0" />
          <span>Workshop & Service Logs ({maintenanceRecords.length})</span>
          {overdueCount > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
          )}
        </button>
      </div>

      {/* SECTION 2: STAT CARDS */}
      {activeSubTab === 'service' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Service Logs Recorded"
            value={`${maintenanceRecords.length}`}
            subtext="Lifetime workshop events"
            icon={History}
          />
          <StatCard
            label="Workshop Spend"
            value={formatINR(totalMaintenanceSpend)}
            subtext="Cumulative service expenses"
            icon={ShieldCheck}
          />
          <StatCard
            label="Service Due Soon"
            value={`${dueCount}`}
            subtext="Buses scheduled for inspection"
            icon={Clock}
          />
          <StatCard
            label="Overdue Inspections"
            value={`${overdueCount}`}
            subtext={overdueCount > 0 ? "Immediate bay intake required" : "Zero overdue vehicles"}
            icon={AlertTriangle}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Fleet Units"
            value={`${buses.length}`}
            subtext="Active in carrier pool"
            icon={BusIcon}
          />
          <StatCard
            label="Fitness Compliant"
            value={`${goodCount}`}
            subtext={`${Math.round((goodCount / (buses.length || 1)) * 100)}% fleet in good health`}
            icon={CheckCircle2}
          />
          <StatCard
            label="Service Due Soon"
            value={`${dueCount}`}
            subtext="Scheduled within 14 days"
            icon={Clock}
          />
          <StatCard
            label="Overdue Inspection"
            value={`${overdueCount}`}
            subtext={overdueCount > 0 ? "Immediate bay intake required" : "Zero overdue vehicles"}
            icon={AlertTriangle}
          />
        </div>
      )}

      {/* SERVICE ATTENTION BANNER (Shown in service tab when items need attention) */}
      {activeSubTab === 'service' && urgentAttentionBuses.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {urgentAttentionBuses.length} Vehicle{urgentAttentionBuses.length > 1 ? 's' : ''} Require Scheduled Service
                </h4>
                <p className="text-xs text-slate-600 dark:text-neutral-400 font-mono mt-0.5">
                  {urgentAttentionBuses.map(b => b.regNumber).join(', ')}
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenLogModal(urgentAttentionBuses[0])}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-mono font-bold text-xs rounded-xl self-start sm:self-auto cursor-pointer"
            >
              Log Inspection for {urgentAttentionBuses[0].regNumber}
            </button>
          </div>
        </div>
      )}

      {/* D3 Roadmap Visual Module */}
      <MaintenanceRoadmapChart buses={buses} />

      {/* SECTION 3: VEHICLE FLEET TABLE */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Status Pills */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {(['All', 'Good', 'Due', 'Overdue'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-mono transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  statusFilter === st
                    ? 'bg-blue-600 text-white font-bold shadow-xs'
                    : 'bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {st} {st === 'All' ? `(${buses.length})` : st === 'Good' ? `(${goodCount})` : st === 'Due' ? `(${dueCount})` : `(${overdueCount})`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registration or model..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-full font-mono text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Vehicles Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Registration #</th>
                <th className="py-3 px-4">Model & Capacity</th>
                <th className="py-3 px-4">Assigned Corridor</th>
                <th className="py-3 px-4">Last Service</th>
                <th className="py-3 px-4">Next Due Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs font-sans">
              {filteredBuses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 dark:text-neutral-500 font-mono">
                    No vehicles match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredBuses.map((bus) => {
                  const status = getServiceStatus(bus.nextServiceDue);

                  return (
                    <tr key={bus.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900 dark:text-white">
                        <div className="flex items-center space-x-1.5">
                          <span>{bus.regNumber}</span>
                          <CopyButton textToCopy={bus.regNumber} label={bus.regNumber} />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{bus.model}</div>
                        <div className="text-[10px] font-mono text-slate-500 dark:text-neutral-400">{bus.capacity} Seats</div>
                      </td>

                      <td className="py-3.5 px-4 text-slate-700 dark:text-neutral-300 font-mono">
                        {bus.routeAssigned || 'Unassigned'}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-neutral-400">
                        {bus.lastServiceDate || 'N/A'}
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {bus.nextServiceDue}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full border inline-flex items-center space-x-1 ${
                          status === 'Good'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                            : status === 'Due'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                        }`}>
                          {status === 'Good' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {status === 'Due' && <Clock className="w-3 h-3 text-amber-600" />}
                          {status === 'Overdue' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          <span>{status}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5 font-mono">
                          <button
                            onClick={() => setQrBus(bus)}
                            className="px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                            title="View/Print QR Decal Passport"
                          >
                            <QrCode className="w-3 h-3 text-blue-600" />
                            <span>QR Decal</span>
                          </button>

                          <button
                            onClick={() => handleOpenLogModal(bus)}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-blue-600 dark:text-blue-400 text-[11px] font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <Wrench className="w-3 h-3 text-blue-600" />
                            <span>Log Service</span>
                          </button>

                          <button
                            onClick={() => handleDeleteBus(bus.id, bus.regNumber)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                            title="Remove Vehicle"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: MAINTENANCE AUDIT LOGS */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">
              Service & Maintenance Audit Logs ({maintenanceRecords.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Live Sync</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-neutral-800 text-[11px] font-mono uppercase text-slate-400">
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Bus Registration</th>
                <th className="py-2.5 px-3">Service Performed</th>
                <th className="py-2.5 px-3">Garage / Workshop</th>
                <th className="py-2.5 px-3">Cost (₹)</th>
                <th className="py-2.5 px-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 font-sans">
              {maintenanceRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-mono text-xs">
                    No maintenance logs recorded yet.
                  </td>
                </tr>
              ) : (
                maintenanceRecords.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-neutral-900/30">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{m.serviceDate}</td>
                    <td className="py-3 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">{m.busReg}</td>
                    <td className="py-3 px-3 font-bold text-slate-800 dark:text-neutral-200">{m.serviceType}</td>
                    <td className="py-3 px-3 text-slate-600 dark:text-neutral-400">{m.mechanicShop || 'Authorized Bay'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">{formatINR(m.cost)}</td>
                    <td className="py-3 px-3 text-slate-500 dark:text-neutral-400 truncate max-w-xs">{m.notes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LOG SERVICE MODAL */}
      {isLogModalOpen && (selectedBus || buses[0]) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 max-w-lg w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                  Log Maintenance & Next Service Due
                </h3>
                {buses.length > 1 ? (
                  <div className="mt-1 flex items-center space-x-1.5 text-xs font-mono">
                    <span className="text-slate-500 dark:text-neutral-400">Target Vehicle:</span>
                    <select
                      value={(selectedBus || buses[0])?.id || ''}
                      onChange={(e) => {
                        const found = buses.find(b => b.id === e.target.value);
                        if (found) setSelectedBus(found);
                      }}
                      className="font-bold text-blue-600 dark:text-blue-400 bg-transparent border-b border-blue-500/40 focus:outline-none cursor-pointer"
                    >
                      {buses.map(b => (
                        <option key={b.id} value={b.id} className="text-slate-900 dark:text-neutral-100 bg-white dark:bg-neutral-900">
                          {b.regNumber} ({b.model})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-xs font-mono text-blue-600 dark:text-blue-400 font-bold">
                    Vehicle: {(selectedBus || buses[0])?.regNumber} ({(selectedBus || buses[0])?.model})
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMaintenance} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Service / Repair Title
                </label>
                <input
                  type="text"
                  required
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value)}
                  placeholder="e.g. Oil Change & Brake Pad Replacement"
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Service Date
                  </label>
                  <input
                    type="date"
                    required
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                    Next Service Due
                  </label>
                  <input
                    type="date"
                    required
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 font-bold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">Service Cost (₹)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={cost}
                    onChange={(e) => setCost(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">Workshop / Garage</label>
                  <input
                    type="text"
                    required
                    value={mechanicShop}
                    onChange={(e) => setMechanicShop(e.target.value)}
                    placeholder="Workshop name"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">Technician Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-neutral-700 text-slate-700 dark:text-neutral-300 text-xs font-mono font-bold rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD VEHICLE MODAL */}
      {isAddBusModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 max-w-lg w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
                  <BusIcon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                  Enroll Bus to Fleet
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddBusModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddNewBus} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={newRegNumber}
                    onChange={(e) => setNewRegNumber(e.target.value)}
                    placeholder="e.g. KA 01 F 9090"
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Bus Model Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="e.g. Ashok Leyland Viking 52s"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Seating Capacity
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={80}
                    value={newCapacity}
                    onChange={(e) => setNewCapacity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Assigned Route Corridor
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={newRoute}
                      onChange={(e) => setNewRoute(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans appearance-none"
                    >
                      <option value="">Select a route</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.routeName}>{r.routeName}</option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Assigned Pilot Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newDriverName}
                    onChange={(e) => setNewDriverName(e.target.value)}
                    placeholder="e.g. Prakash Rao"
                    className="w-full px-3 py-2 text-xs border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 font-sans"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-1">
                    Next Service Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newNextServiceDue}
                    onChange={(e) => setNewNextServiceDue(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50 dark:bg-blue-950/30 font-bold text-blue-700 dark:text-blue-300 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddBusModalOpen(false)}
                  className="px-4 py-2 text-xs font-mono font-bold text-slate-600 dark:text-neutral-400 hover:text-slate-900 dark:hover:text-white rounded-xl cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Vehicle</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BUS QR PASSPORT MODAL */}
      {qrBus && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 max-w-2xl w-full p-5 sm:p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white my-8">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                    Vehicle QR Decal & Fitness Passport
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-neutral-400 font-mono">
                    Official inspection sheet for {qrBus.regNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrBus(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              
              {/* Left Column: QR Code Visualizer */}
              <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-neutral-900/40 border border-slate-200/60 dark:border-neutral-800/60 rounded-xl text-center">
                <div className="bg-white p-3.5 rounded-2xl shadow-xs border border-slate-200/60 dark:border-neutral-800">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}?busId=${qrBus.id}`)}`}
                    alt={`QR Code Decal for ${qrBus.regNumber}`}
                    className="w-40 h-40 object-contain block"
                  />
                </div>
                
                <span className="mt-3.5 px-3 py-1 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-mono font-bold text-sm tracking-widest rounded-lg border border-slate-700">
                  {qrBus.regNumber}
                </span>

                <div className="flex items-center space-x-2 mt-4 w-full">
                  <button
                    onClick={() => handlePrintQR(qrBus)}
                    className="flex-1 px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-950 font-mono font-bold text-[11px] rounded-lg cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print QR</span>
                  </button>

                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}?busId=${qrBus.id}`;
                      navigator.clipboard.writeText(shareUrl);
                      alert('Copied secure vehicle inspection link to clipboard!');
                    }}
                    className="px-3 py-2 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-neutral-200 font-mono font-bold text-[11px] rounded-lg cursor-pointer transition-all flex items-center justify-center space-x-1"
                    title="Copy Link"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Fleet Details & Fitness Records */}
              <div className="md:col-span-7 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <h4 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider">
                    Vehicle Demographics
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50/50 dark:bg-neutral-900/20 p-3 rounded-xl border border-slate-100 dark:border-neutral-900/60 text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px]">MODEL</span>
                      <span className="font-bold text-slate-800 dark:text-neutral-100 font-sans">{qrBus.model}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CORRIDOR</span>
                      <span className="font-bold text-slate-800 dark:text-neutral-100 font-sans">{qrBus.routeAssigned || 'Unassigned'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">PILOT</span>
                      <span className="font-bold text-slate-800 dark:text-neutral-100 font-sans">{qrBus.driverName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">CAPACITY</span>
                      <span className="font-bold text-slate-800 dark:text-neutral-100">{qrBus.capacity} Seats</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider mb-2">
                      Active Fitness & Service Status
                    </h4>
                    
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-neutral-900/50 rounded-xl border border-slate-200/40 dark:border-neutral-800/40">
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 block">NEXT SERVICE DUE</span>
                        <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">{qrBus.nextServiceDue}</span>
                      </div>
                      
                      <span className={`px-2.5 py-1 text-xs font-mono font-bold rounded-full border inline-flex items-center space-x-1.5 ${
                        getServiceStatus(qrBus.nextServiceDue) === 'Good'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                          : getServiceStatus(qrBus.nextServiceDue) === 'Due'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800'
                      }`}>
                        {getServiceStatus(qrBus.nextServiceDue) === 'Good' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {getServiceStatus(qrBus.nextServiceDue) === 'Due' && <Clock className="w-3.5 h-3.5" />}
                        {getServiceStatus(qrBus.nextServiceDue) === 'Overdue' && <AlertTriangle className="w-3.5 h-3.5 animate-bounce" />}
                        <span>{getServiceStatus(qrBus.nextServiceDue)}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-section: Service History Logs */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-mono uppercase text-slate-400 font-bold tracking-wider flex items-center justify-between">
                    <span>Recent Workshop Logs</span>
                    <span className="text-[10px] text-blue-500 font-bold normal-case">
                      {maintenanceRecords.filter(m => m.busId === qrBus.id).length} Logs
                    </span>
                  </h4>
                  
                  <div className="max-h-[140px] overflow-y-auto border border-slate-100 dark:border-neutral-800 rounded-xl divide-y divide-slate-100 dark:divide-neutral-800 text-[11px] bg-slate-50/20 dark:bg-neutral-900/10">
                    {maintenanceRecords.filter(m => m.busId === qrBus.id).length === 0 ? (
                      <p className="p-4 text-center text-slate-400 dark:text-neutral-500 font-mono">
                        No service logs found for this vehicle.
                      </p>
                    ) : (
                      maintenanceRecords
                        .filter(m => m.busId === qrBus.id)
                        .map((log) => (
                          <div key={log.id} className="p-2.5 flex items-start justify-between gap-2.5 hover:bg-slate-50 dark:hover:bg-neutral-900/40">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-neutral-200">{log.serviceType}</p>
                              <p className="text-[10px] text-slate-400 dark:text-neutral-500 mt-0.5">
                                Garage: {log.mechanicShop || 'Authorized Bay'} | {log.notes || 'No notes'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className="font-mono font-bold block text-slate-900 dark:text-white">{log.serviceDate}</span>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 block font-bold">{formatINR(log.cost)}</span>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>

              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-200 dark:border-neutral-800 pt-3.5 mt-5">
              <button
                type="button"
                onClick={() => setQrBus(null)}
                className="px-5 py-2 bg-slate-100 dark:bg-neutral-800 hover:bg-slate-200 dark:hover:bg-neutral-700 text-slate-800 dark:text-neutral-200 text-xs font-mono font-bold rounded-xl cursor-pointer"
              >
                Close Passport
              </button>
            </div>

          </div>
        </div>
      )}

      {/* INTERACTIVE SCANNER SIMULATOR MODAL */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-neutral-800 max-w-md w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-white">
            
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-neutral-800 mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-sans">
                    Virtual QR Scanner
                  </h3>
                  <p className="text-xs text-neutral-400 font-mono">
                    Simulate physical decal inspection
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => setIsScannerOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-white rounded-xl cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1.5 bg-neutral-950 p-1 rounded-xl mb-4 text-xs font-mono font-bold">
              <button
                onClick={() => {
                  setScannerView('camera');
                  setCameraScanning(false);
                  setScannedResult(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-all ${scannerView === 'camera' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
              >
                HUD Viewfinder
              </button>
              <button
                onClick={() => {
                  setScannerView('select');
                  setCameraScanning(false);
                  setScannedResult(null);
                }}
                className={`flex-1 py-1.5 rounded-lg text-center cursor-pointer transition-all ${scannerView === 'select' ? 'bg-neutral-800 text-white' : 'text-neutral-500'}`}
              >
                Target Select
              </button>
            </div>

            {/* Viewport Box */}
            <div className="relative h-64 bg-black rounded-2xl border-2 border-neutral-800 flex flex-col items-center justify-center overflow-hidden">
              
              {scannerView === 'camera' ? (
                <>
                  {/* Viewfinder borders */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-blue-500" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-blue-500" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-blue-500" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-blue-500" />

                  {/* Red laser line */}
                  <div className="absolute left-6 right-6 h-0.5 bg-rose-500/80 shadow-[0_0_8px_#ef4444] animate-bounce" style={{ animationDuration: '3s' }} />

                  {cameraScanning ? (
                    <div className="text-center space-y-3 animate-pulse">
                      <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">
                        Parsing QR Payload...
                      </p>
                    </div>
                  ) : scannedResult ? (
                    <div className="text-center space-y-2.5 px-6 animate-in fade-in zoom-in-95">
                      <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full inline-block mx-auto">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white font-mono">{scannedResult.regNumber}</p>
                        <p className="text-[10px] text-neutral-400 font-sans">{scannedResult.model}</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsScannerOpen(false);
                          setQrBus(scannedResult);
                        }}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono font-bold text-xs rounded-lg cursor-pointer transition-colors"
                      >
                        View Fitness Passport
                      </button>
                    </div>
                  ) : (
                    <div className="text-center space-y-4 px-6">
                      <p className="text-xs text-neutral-400 font-mono">
                        Hold camera up to the printed QR code decal, or simulate a scan below:
                      </p>
                      
                      {buses.length > 0 ? (
                        <div className="space-y-2 text-slate-900 dark:text-white">
                          <span className="text-[10px] font-mono text-neutral-500 block uppercase font-bold text-center">
                            Simulate physical scan of:
                          </span>
                          <div className="flex flex-col gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-neutral-950 rounded-xl border border-neutral-800">
                            {buses.map((b) => (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setCameraScanning(true);
                                  setTimeout(() => {
                                    setCameraScanning(false);
                                    setScannedResult(b);
                                  }, 1500);
                                }}
                                className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-350 hover:text-white rounded-lg text-left font-mono text-[10px] truncate cursor-pointer flex items-center justify-between"
                              >
                                <span>{b.regNumber}</span>
                                <span className="text-[9px] text-neutral-500 font-sans">{b.model}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs font-mono text-neutral-500">
                          Please enroll a vehicle to test scanner.
                        </p>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center px-6 space-y-4 w-full text-slate-900 dark:text-white">
                  <p className="text-xs text-neutral-400 font-mono">
                    Select a vehicle to pull up details manually as if scanned:
                  </p>
                  
                  {buses.length > 0 ? (
                    <div className="space-y-3.5 w-full">
                      <select
                        onChange={(e) => {
                          const found = buses.find(b => b.id === e.target.value);
                          if (found) {
                            setIsScannerOpen(false);
                            setQrBus(found);
                          }
                        }}
                        defaultValue=""
                        className="w-full px-3 py-2 text-xs font-mono font-bold bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="" disabled>-- Select Vehicle --</option>
                        {buses.map(b => (
                          <option key={b.id} value={b.id} className="text-white bg-neutral-900">
                            {b.regNumber} ({b.model})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <p className="text-xs font-mono text-neutral-500">
                      No vehicles enrolled in your carrier pool yet.
                    </p>
                  )}
                </div>
              )}

            </div>

            {/* Footer info text */}
            <p className="text-[10px] text-center text-neutral-500 font-mono mt-3.5">
              Powered by Tranzit Automated Fleet Inspection
            </p>

          </div>
        </div>
      )}

      <ReportsModal
        owner={owner}
        isOpen={isReportsModalOpen}
        onClose={() => setIsReportsModalOpen(false)}
        defaultReportType="maintenance"
      />
    </div>
  );
};
