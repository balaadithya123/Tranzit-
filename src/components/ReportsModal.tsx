import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, EarningsEntry, MaintenanceRecord } from '../types';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR } from '../lib/utils';
import {
  generateEarningsReportPDF,
  generateMaintenanceReportPDF,
  generateCombinedOperationsReportPDF
} from '../lib/pdfGenerator';
import {
  FileText,
  Download,
  Calendar,
  X,
  CheckCircle2,
  Wrench,
  Wallet,
  ShieldCheck,
  Sparkles,
  Layers
} from 'lucide-react';

interface ReportsModalProps {
  owner: OwnerProfile;
  isOpen: boolean;
  onClose: () => void;
  defaultReportType?: 'earnings' | 'maintenance' | 'combined';
}

export const ReportsModal: React.FC<ReportsModalProps> = ({
  owner,
  isOpen,
  onClose,
  defaultReportType = 'earnings'
}) => {
  const [reportType, setReportType] = useState<'earnings' | 'maintenance' | 'combined'>(defaultReportType);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Data from Firestore
  const [earnings, setEarnings] = useState<EarningsEntry[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setReportType(defaultReportType);
      setDownloadSuccess(null);
      const now = new Date();
      const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      setSelectedMonth(currentYearMonth);
    }
  }, [isOpen, defaultReportType]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !owner.id) return;

    setLoading(true);

    const qEarnings = query(collection(db, 'earnings'), where('ownerId', '==', owner.id));
    const unsubEarnings = onSnapshot(qEarnings, (snap) => {
      const list: EarningsEntry[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as EarningsEntry));
      list.sort((a, b) => b.date.localeCompare(a.date));
      setEarnings(list);
    });

    const qBuses = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsubBuses = onSnapshot(qBuses, (snap) => {
      const list: Bus[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Bus));
      setBuses(list);
    });

    const qMaint = query(collection(db, 'maintenance'), where('ownerId', '==', owner.id));
    const unsubMaint = onSnapshot(qMaint, (snap) => {
      const list: MaintenanceRecord[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as MaintenanceRecord));
      list.sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
      setMaintenance(list);
      setLoading(false);
    });

    return () => {
      unsubEarnings();
      unsubBuses();
      unsubMaint();
    };
  }, [isOpen, owner.id]);

  if (!isOpen) return null;

  const availableMonthsSet = new Set<string>();
  earnings.forEach(e => {
    if (e.date && e.date.length >= 7) availableMonthsSet.add(e.date.slice(0, 7));
  });
  maintenance.forEach(m => {
    if (m.serviceDate && m.serviceDate.length >= 7) availableMonthsSet.add(m.serviceDate.slice(0, 7));
  });

  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYm = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
  availableMonthsSet.add(currentYm);
  availableMonthsSet.add(prevYm);

  const monthOptions = Array.from(availableMonthsSet).sort().reverse();

  const filteredEarnings = selectedMonth && selectedMonth !== 'all'
    ? earnings.filter(e => e.date.startsWith(selectedMonth))
    : earnings;

  const filteredMaint = selectedMonth && selectedMonth !== 'all'
    ? maintenance.filter(m => m.serviceDate.startsWith(selectedMonth))
    : maintenance;

  const totalRev = filteredEarnings.reduce((s, e) => s + (e.ticketRevenue || 0), 0);
  const totalSpend = filteredMaint.reduce((s, m) => s + (m.cost || 0), 0);

  const handleDownload = async () => {
    setIsGenerating(true);
    setDownloadSuccess(null);

    try {
      if (reportType === 'earnings') {
        await generateEarningsReportPDF({
          owner,
          earnings: filteredEarnings,
          filterMonth: selectedMonth
        });
        setDownloadSuccess('Revenue & Fares Statement PDF exported successfully!');
      } else if (reportType === 'maintenance') {
        await generateMaintenanceReportPDF({
          owner,
          buses,
          maintenance: filteredMaint,
          filterMonth: selectedMonth
        });
        setDownloadSuccess('Fleet Maintenance & Workshop Log PDF exported successfully!');
      } else if (reportType === 'combined') {
        await generateCombinedOperationsReportPDF({
          owner,
          buses,
          earnings: filteredEarnings,
          maintenance: filteredMaint,
          filterMonth: selectedMonth
        });
        setDownloadSuccess('Executive Operations Dossier PDF exported successfully!');
      }
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      alert("Failed to export PDF: " + (err.message || 'Unknown error'));
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/75 backdrop-blur-xs p-3 sm:p-4 flex items-center justify-center transition-opacity">
      <div 
        className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 max-w-2xl w-full p-5 sm:p-6 rounded-xl shadow-2xl animate-in fade-in duration-200 text-slate-900 dark:text-neutral-100 transition-colors my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-neutral-800 mb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">
                Export Executive Fleet Statement
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close dialog"
            className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Report Type Selector Tabs */}
        <div className="mb-5">
          <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-2">
            Select Report Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* 1. Earnings Report */}
            <button
              type="button"
              onClick={() => setReportType('earnings')}
              className={`p-3 border text-left rounded-lg transition-all flex flex-col justify-between cursor-pointer ${
                reportType === 'earnings'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-200 ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-600 bg-slate-50 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Wallet className={`w-4 h-4 ${reportType === 'earnings' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-neutral-400'}`} />
                <span className="text-xs font-mono font-bold">Revenue & Fares</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-snug">
                Daily ticket revenue, payment channels (UPI/Cash/Card) & settlements.
              </p>
            </button>

            {/* 2. Maintenance Report */}
            <button
              type="button"
              onClick={() => setReportType('maintenance')}
              className={`p-3 border text-left rounded-lg transition-all flex flex-col justify-between cursor-pointer ${
                reportType === 'maintenance'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-200 ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-600 bg-slate-50 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Wrench className={`w-4 h-4 ${reportType === 'maintenance' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-neutral-400'}`} />
                <span className="text-xs font-mono font-bold">Maintenance & Fleet</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-snug">
                Workshop repair records, parts cost ledger & vehicle fitness compliance.
              </p>
            </button>

            {/* 3. Combined Dossier */}
            <button
              type="button"
              onClick={() => setReportType('combined')}
              className={`p-3 border text-left rounded-lg transition-all flex flex-col justify-between cursor-pointer ${
                reportType === 'combined'
                  ? 'border-amber-500 bg-amber-500/15 text-amber-950 dark:text-amber-200 ring-1 ring-amber-500'
                  : 'border-slate-200 dark:border-neutral-700 hover:border-slate-400 dark:hover:border-neutral-600 bg-slate-50 dark:bg-neutral-900/60 text-slate-700 dark:text-neutral-300'
              }`}
            >
              <div className="flex items-center space-x-2 mb-2">
                <Layers className={`w-4 h-4 ${reportType === 'combined' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-neutral-400'}`} />
                <span className="text-xs font-mono font-bold">Complete Dossier</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-neutral-400 leading-snug">
                Multi-page executive dossier combining both financials and fleet maintenance.
              </p>
            </button>
          </div>
        </div>

        {/* Audit Period Selection */}
        <div className="mb-5">
          <label className="block text-xs font-mono uppercase text-slate-700 dark:text-neutral-300 font-bold mb-2">
            Statement Period / Month
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-800 dark:text-neutral-200 font-bold focus:outline-none focus:border-amber-500"
              >
                {monthOptions.map((ym) => {
                  const [y, m] = ym.split('-');
                  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
                  const label = d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
                  return (
                    <option key={ym} value={ym}>
                      {label} ({ym})
                    </option>
                  );
                })}
                <option value="all">Complete Operational History (All Dates)</option>
              </select>
            </div>

            <div className="text-[11px] font-mono text-slate-500 dark:text-neutral-400 px-2.5 py-1.5 bg-slate-100 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg self-center">
              Operator Hub: <strong className="text-slate-900 dark:text-neutral-100">{owner.city || 'Bengaluru'}</strong>
            </div>
          </div>
        </div>

        {/* Live Preview Summary Card */}
        <div className="bg-slate-50 dark:bg-neutral-900/60 border border-slate-200 dark:border-neutral-800 p-4 rounded-xl mb-5">
          <div className="flex items-center justify-between mb-3 border-b border-slate-200 dark:border-neutral-800 pb-2">
            <span className="text-[11px] font-mono uppercase font-bold text-slate-600 dark:text-neutral-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Statement Preview Summary</span>
            </span>
            <span className="text-[10px] font-mono bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded font-semibold">
              {selectedMonth === 'all' ? 'All Records' : selectedMonth}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            {/* Ticket Revenue */}
            <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
              <span className="text-[10px] uppercase text-slate-500 dark:text-neutral-400 block mb-0.5">Ticket Revenue</span>
              <span className="font-bold text-sm text-slate-900 dark:text-neutral-100">{formatINR(totalRev)}</span>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mt-0.5">{filteredEarnings.length} log shifts</span>
            </div>

            {/* Maintenance Cost */}
            <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
              <span className="text-[10px] uppercase text-slate-500 dark:text-neutral-400 block mb-0.5">Service Spend</span>
              <span className="font-bold text-sm text-red-600 dark:text-red-400">{formatINR(totalSpend)}</span>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mt-0.5">{filteredMaint.length} garage visits</span>
            </div>

            {/* Active Buses */}
            <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
              <span className="text-[10px] uppercase text-slate-500 dark:text-neutral-400 block mb-0.5">Fleet Size</span>
              <span className="font-bold text-sm text-emerald-700 dark:text-emerald-400">{(buses.length > 0 ? buses.length : (owner.activeBusesCount ?? 3))} Buses</span>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mt-0.5">
                {buses.filter(b => b.status === 'Active').length} road-active
              </span>
            </div>

            {/* Operating Plan */}
            <div className="bg-white dark:bg-neutral-900 p-2.5 rounded-lg border border-slate-200 dark:border-neutral-800">
              <span className="text-[10px] uppercase text-slate-500 dark:text-neutral-400 block mb-0.5">Plan Type</span>
              <span className="font-bold text-sm text-amber-700 dark:text-amber-400">{owner.planType} Fleet</span>
              <span className="text-[10px] text-slate-400 dark:text-neutral-500 block mt-0.5">Verified Profile</span>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {downloadSuccess && (
          <div className="mb-5 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-mono rounded-lg flex items-center space-x-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{downloadSuccess}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-neutral-800">
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-neutral-700 text-xs font-mono uppercase font-bold text-slate-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-lg cursor-pointer"
            >
              Close
            </button>

            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating || loading}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-slate-950 text-xs font-mono uppercase font-bold rounded-lg flex items-center space-x-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
            >
              <Download className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              <span>{isGenerating ? 'Generating PDF...' : 'Download PDF Report'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
