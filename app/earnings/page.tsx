'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, DollarSign, TrendingUp, Wallet } from 'lucide-react';

interface EarningsData {
  totalEarnings: number;
  totalPaidOut: number;
  pendingBalance: number;
  perList: { listId: string; title: string; salesCount: number; totalEarned: number }[];
  recentSales: { id: string; buyerName: string; listTitle: string; amount: number; creatorShare: number; createdAt: string }[];
}

export default function EarningsPage() {
  const router = useRouter();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/earnings')
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Failed to load earnings data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 flex items-center h-14 bg-white/90 backdrop-blur-md px-4 border-b border-slate-100">
        <button onClick={() => router.back()} className="flex items-center justify-center size-10 rounded-full hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10">Earnings</h1>
      </header>

      <main className="max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="flex justify-center mb-2">
              <div className="size-9 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900">{fmt(data.totalEarnings)}</p>
            <p className="text-xs text-slate-500">Total Earned</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="flex justify-center mb-2">
              <div className="size-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900">{fmt(data.totalPaidOut)}</p>
            <p className="text-xs text-slate-500">Paid Out</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
            <div className="flex justify-center mb-2">
              <div className="size-9 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-lg font-bold text-slate-900">{fmt(data.pendingBalance)}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
        </div>

        {/* Per-List Breakdown */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Per-List Breakdown</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {data.perList.length === 0 && (
              <p className="p-4 text-sm text-slate-500 text-center">No premium lists yet.</p>
            )}
            {data.perList.map((item) => (
              <div key={item.listId} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{item.title}</p>
                  <p className="text-xs text-slate-500">{item.salesCount} {item.salesCount === 1 ? 'sale' : 'sales'}</p>
                </div>
                <span className="font-bold text-slate-900 shrink-0 ml-4">{fmt(item.totalEarned)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Recent Sales</h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
            {data.recentSales.length === 0 && (
              <p className="p-4 text-sm text-slate-500 text-center">No sales yet.</p>
            )}
            {data.recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 truncate">{sale.listTitle}</p>
                  <p className="text-xs text-slate-500">by {sale.buyerName} &middot; {new Date(sale.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="font-bold text-green-600 shrink-0 ml-4">+{fmt(sale.creatorShare)}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
