import React, { useState, useEffect } from 'react';
import { OwnerProfile, Bus, PayoutEntry } from '../types';
import { collection, query, where, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatINR } from '../lib/utils';
import { ShieldCheck, CheckCircle2, Clock, Plus, X } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 p-5 sm:p-6 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs transition-colors">
        <div>
          <div className="flex items-center space-x-2 text-xs font-mono text-teal-800 dark:text-teal-400 uppercase tracking-widest mb-1.5 font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Lease</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-neutral-100 tracking-tight font-sans">
            Lease Terms & Guaranteed Payouts
          </h2>
          <p className="text-xs text-slate-500 dark:text-neutral-400 font-sans mt-0.5">
            Fixed payouts credited on the 1st of each month.
          </p>
        </div>

        {/* Guaranteed Monthly Payout Box */}
        <div className="bg-teal-50 dark:bg-neutral-900 border border-teal-200 dark:border-neutral-800 p-4 rounded-xl text-left md:text-right shadow-2xs">
          <span className="text-[10px] font-mono uppercase text-teal-900 dark:text-teal-300 block font-bold">
            Monthly Guarantee
          </span>
          <span className="text-2xl font-mono font-bold text-teal-950 dark:text-teal-400">
            {formatINR(totalMonthlyLeaseGuarantee || 0)} / mo
          </span>
        </div>
      </div>

      {/* Leased Buses Table */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 flex items-center justify-between">
          <span className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-neutral-200">
            Leased Bus Contracts ({buses.length})
          </span>
          <span className="text-[11px] font-mono text-teal-800 dark:text-teal-300 bg-teal-100 dark:bg-teal-950/40 px-2.5 py-0.5 rounded-md border border-teal-300 dark:border-teal-800/60 font-semibold">
            Managed by Tranzit
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/60 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Bus Registration</th>
                <th className="py-3 px-4">Vehicle Model</th>
                <th className="py-3 px-4">Capacity</th>
                <th className="py-3 px-4">Monthly Lease Value</th>
                <th className="py-3 px-4">Lease Renewal Date</th>
                <th className="py-3 px-4 text-right">Contract Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
              {buses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 dark:text-neutral-500 font-mono">
                    No leased vehicles found.
                  </td>
                </tr>
              ) : (
                buses.map((bus) => (
                  <tr key={bus.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-sm text-slate-900 dark:text-neutral-100">
                      {bus.regNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-neutral-300">
                      {bus.model}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-neutral-400">
                      {bus.capacity} Seats
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-teal-800 dark:text-teal-400 text-sm">
                      {formatINR(bus.leaseValue || 0)} / mo
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-neutral-400">
                      {bus.renewalDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded-md bg-teal-100 dark:bg-teal-950/40 text-teal-900 dark:text-teal-300 border border-teal-300 dark:border-teal-800/60">
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

      {/* Payout History Table */}
      <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-neutral-800 bg-slate-50/70 dark:bg-neutral-900/40 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-mono uppercase font-bold text-slate-800 dark:text-neutral-200">
              Payout History & Scheduled Transfers
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-neutral-400">Direct NEFT/RTGS bank transfers</span>
          </div>

          <button
            onClick={() => setIsPayoutModalOpen(true)}
            className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white text-xs font-mono uppercase font-bold rounded-lg transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Payout Record</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/60 text-[11px] font-mono uppercase text-slate-500 dark:text-neutral-400">
                <th className="py-3 px-4">Payout Date</th>
                <th className="py-3 px-4">Amount (₹)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference / Txn #</th>
                <th className="py-3 px-4 text-right">Settlement Bank</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs font-mono">
              {payouts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/70 dark:hover:bg-neutral-900/50 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-neutral-100">
                    {p.date}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-teal-800 dark:text-teal-400 text-sm">
                    {formatINR(p.amount)}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-md border flex items-center w-fit space-x-1 ${
                      p.status === 'Paid' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/60' :
                      p.status === 'Scheduled' ? 'bg-teal-100 dark:bg-teal-950/40 text-teal-900 dark:text-teal-300 border-teal-300 dark:border-teal-800/60' :
                      'bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-800/60'
                    }`}>
                      {p.status === 'Paid' && <CheckCircle2 className="w-3 h-3 text-emerald-700 dark:text-emerald-400" />}
                      {p.status === 'Scheduled' && <Clock className="w-3 h-3 text-teal-700 dark:text-teal-400" />}
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

      {/* Add Payout Record Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121214] border border-slate-200 dark:border-neutral-800 max-w-md w-full p-6 rounded-xl shadow-xl animate-in fade-in text-slate-900 dark:text-neutral-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-neutral-800 mb-4">
              <h3 className="text-base font-extrabold text-slate-900 dark:text-neutral-100 font-sans">
                Record Lease Payout Schedule
              </h3>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-neutral-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPayoutRecord} className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Payout Date</label>
                <input
                  type="date"
                  required
                  value={payoutDate}
                  onChange={(e) => setPayoutDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Payout Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1000}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-slate-600 dark:text-neutral-400 mb-1">Status</label>
                <select
                  value={payoutStatus}
                  onChange={(e) => setPayoutStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-200 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 text-slate-900 dark:text-neutral-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="Scheduled">Scheduled</option>
                  <option value="Processing">Processing</option>
                  <option value="Paid">Paid</option>
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-neutral-700 text-xs font-mono uppercase font-bold rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-mono uppercase font-bold rounded-lg cursor-pointer"
                >
                  Save Payout Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
