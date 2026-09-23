import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, PayoutEntry } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR } from '../lib/utils';
import { ShieldCheck, CheckCircle2, Clock, Plus, X, Bus as BusIcon, Building, ArrowUpRight } from 'lucide-react';
import { StatCard } from './StatCard';

interface LeaseTermsPayoutsViewProps {
  owner: OwnerProfile;
}

export const LeaseTermsPayoutsView: React.FC<LeaseTermsPayoutsViewProps> = ({ owner }) => {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [payouts, setPayouts] = useState<PayoutEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for adding/simulating payout record
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutDate, setPayoutDate] = useState('2026-11-01');
  const [payoutAmount, setPayoutAmount] = useState<number>(0);
  const [payoutStatus, setPayoutStatus] = useState<'Paid' | 'Scheduled' | 'Processing'>('Scheduled');

  // Subscribe to buses and payouts in Firestore
  useEffect(() => {
    if (!owner.id) return;

    // Buses Query
    const busesQuery = query(collection(db, 'buses'), where('ownerId', '==', owner.id));
    const unsubBuses = onSnapshot(busesQuery, (snapshot) => {
      const list: Bus[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as Bus);
      });
      setBuses(list);
    });

    // Payouts Query
    const payoutsQuery = query(collection(db, 'payouts'), where('ownerId', '==', owner.id));
    const unsubPayouts = onSnapshot(payoutsQuery, (snapshot) => {
      const list: PayoutEntry[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as PayoutEntry);
      });
      list.sort((a, b) => b.date.localeCompare(a.date));
      setPayouts(list);
      setLoading(false);
    });

    return () => {
      unsubBuses();
      unsubPayouts();
    };
  }, [owner.id]);

  const totalMonthlyLeaseGuarantee = buses.reduce((sum, b) => sum + (b.leaseValue || 0), 0);

  const handleAddPayoutRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const pid = `p-${Date.now()}`;
    const newPayout: PayoutEntry = {
      id: pid,
      ownerId: owner.id,
      date: payoutDate,
      amount: Number(payoutAmount),
      status: payoutStatus,
      referenceNo: payoutStatus === 'Paid' ? `TXN-${Date.now().toString().slice(-6)}` : `SCH-${payoutDate.replace(/-/g, '')}`,
      bankAccount: "HDFC Bank (•••• 4921)"
    };

    await setDoc(doc(db, 'payouts', pid), newPayout);
    setIsPayoutModalOpen(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* SECTION 1: HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80 dark:border-neutral-800">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
              Lease Terms & Monthly Guarantee
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
              Contract Active
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-neutral-400 mt-1">
            Contractual bus leases, guaranteed monthly disbursements, and bank settlement logs.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 self-start md:self-auto">
          <button
            onClick={() => setIsPayoutModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Record Payout</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Guaranteed Monthly Lease Payout"
          value={`${formatINR(totalMonthlyLeaseGuarantee || 0)}`}
          subtext="Direct auto-credit on the 1st of every month"
          icon={ShieldCheck}
        />
        <StatCard
          label="Contracted Vehicles"
          value={`${buses.length} Buses`}
          subtext="Fully managed and insured by Tranzit"
          icon={BusIcon}
        />
        <StatCard
          label="Settlement Partner"
          value="HDFC Bank"
          subtext="Corporate escrow direct clearing"
          icon={Building}
        />
      </div>

      {/* SECTION 3: LEASED CONTRACTS TABLE */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">
              Leased Fleet Contracts ({buses.length})
            </h3>
          </div>
          <span className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/60">
            Escrow Backed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Bus Registration</th>
                <th className="py-3 px-4">Model</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Monthly Lease Amount</th>
                <th className="py-3 px-4">Renewal Date</th>
                <th className="py-3 px-4 text-right">Contract Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {buses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-mono">
                    No leased vehicles found.
                  </td>
                </tr>
              ) : (
                buses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900 dark:text-white">
                      {bus.regNumber}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-neutral-200">
                      {bus.model}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-neutral-400">
                      {bus.capacity} Seats
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {formatINR(bus.leaseValue || 0)} / mo
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-neutral-400">
                      {bus.renewalDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        Active Lease
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4: PAYOUT HISTORY */}
      <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900 dark:text-white font-sans">
              Payout History & Scheduled Transfers
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Direct RTGS / NEFT Settlements</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-900/60 text-[11px] uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Payout Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference / Txn #</th>
                <th className="py-3 px-4 text-right">Settlement Bank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/40 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                    {p.date}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400 text-sm">
                    {formatINR(p.amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full border inline-flex items-center space-x-1 ${
                      p.status === 'Paid'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                        : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    }`}>
                      {p.status === 'Paid' ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      <span>{p.status}</span>
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-neutral-400">
                    {p.referenceNo}
                  </td>
                  <td className="py-3.5 px-4 text-right text-slate-600 dark:text-neutral-400">
                    {p.bankAccount || 'HDFC Bank (•••• 4921)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECORD PAYOUT MODAL */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#10131a] border border-slate-200/90 dark:border-neutral-800/80 max-w-md w-full p-6 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">
                Record Lease Payout Schedule
              </h3>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPayoutRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Payout Date
                </label>
                <input
                  type="date"
                  required
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Payout Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1 font-bold">
                  Status
                </label>
                <select
                  value={payoutStatus}
                  onChange={(e) => setPayoutStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-800 rounded-xl bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Processing">Processing</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-neutral-700 text-xs font-mono font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer text-slate-600 dark:text-neutral-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold rounded-xl cursor-pointer shadow-md shadow-blue-500/20"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
