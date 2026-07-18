import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn } from '../lib/formatters';
import {
  subscribeInvoices, subscribeProducts,
  subscribeCustomers, subscribeExpenses
} from '../lib/firestoreService';
import type { Invoice, Product, Customer, Expense } from '../types/firestore';
import { TrendingUp, Package, Users, DollarSign, FileSpreadsheet } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

export default function Analytics() {
  const { tenantId } = useAuth();
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  // Firestore state — all real-time via onSnapshot
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeInvoices(tenantId, setInvoices, 1000);
    const unsub2 = subscribeProducts(tenantId, setProducts);
    const unsub3 = subscribeCustomers(tenantId, setCustomers);
    const unsub4 = subscribeExpenses(tenantId, setExpenses);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [tenantId, periodDays]);

  // ── Date range filter ──────────────────────────────────────
  const cutoffDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - periodDays);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [periodDays]);

  const periodInvoices = useMemo(() =>
    invoices.filter(inv => {
      if (!inv.invoiceDate) return false;
      return inv.invoiceDate.toDate() >= cutoffDate;
    })
  , [invoices, cutoffDate]);

  const periodExpenses = useMemo(() =>
    expenses.filter(exp => {
      if (!exp.expenseDate) return false;
      return exp.expenseDate.toDate() >= cutoffDate;
    })
  , [expenses, cutoffDate]);

  // ── 1. Revenue Trend (grouped by day from invoices) ────────
  const revenueData = useMemo(() => {
    const dayMap: Record<string, number> = {};

    // Initialize all days in the range to 0
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = 0;
    }

    // Fill with actual invoice data
    periodInvoices.forEach(inv => {
      if (!inv.invoiceDate) return;
      const key = inv.invoiceDate.toDate().toISOString().split('T')[0];
      dayMap[key] = (dayMap[key] || 0) + inv.grandTotal;
    });

    return Object.entries(dayMap).map(([dateKey, rev]) => ({
      day: new Date(dateKey).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      dateKey,
      rev: Math.round(rev),
    }));
  }, [periodInvoices, periodDays]);

  // ── 2. Top products (from invoice items) ───────────────────
  const topProductsData = useMemo(() => {
    const prodMap: Record<string, number> = {};
    periodInvoices.forEach(inv => {
      inv.items.forEach(item => {
        prodMap[item.productName] = (prodMap[item.productName] || 0) + item.totalAmount;
      });
    });
    return Object.entries(prodMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, revenue]) => ({
        name: name.length > 15 ? name.slice(0, 15) + '…' : name,
        fullName: name,
        revenue: Math.round(revenue),
      }));
  }, [periodInvoices]);

  // ── 3. Customer segments ───────────────────────────────────
  const customerSegments = useMemo(() => {
    const segMap: Record<string, number> = {};
    customers.forEach(c => {
      segMap[c.customerSegment] = (segMap[c.customerSegment] || 0) + 1;
    });
    const colors = ['#8B5CF6', '#3B82F6', '#10B981', '#EF4444', '#F59E0B'];
    return Object.entries(segMap).map(([name, value], i) => ({
      name: name.replace('_', ' '),
      value,
      color: colors[i % colors.length],
    }));
  }, [customers]);

  // ── 4. Monthly P&L ─────────────────────────────────────────
  const pnl = useMemo(() => {
    const revenue = periodInvoices.reduce((s, i) => s + i.grandTotal, 0);

    const cogs = periodInvoices.reduce((s, i) => s + i.items.reduce((is, item) => {
      const prod = products.find(p => p.id === item.productId);
      const costPrice = prod ? prod.purchasePrice : item.unitPrice * 0.7;
      return is + (costPrice * item.quantity);
    }, 0), 0);

    const grossProfit = revenue - cogs;

    const totalExpenses = periodExpenses.reduce((s, e) => s + e.amount, 0);

    const netProfit = grossProfit - totalExpenses;

    const grossMargin = revenue > 0 ? ((grossProfit / revenue) * 100) : 0;
    const netMargin = revenue > 0 ? ((netProfit / revenue) * 100) : 0;

    return { revenue, cogs, grossProfit, totalExpenses, netProfit, grossMargin, netMargin };
  }, [periodInvoices, periodExpenses, products]);

  // ── Category donut ─────────────────────────────────────────
  const categoryDonut = useMemo(() => {
    const catMap: Record<string, number> = {};
    periodInvoices.forEach(inv => inv.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      const cat = prod?.categoryName || 'Others';
      catMap[cat] = (catMap[cat] || 0) + item.totalAmount;
    }));
    const colors = ['#7C3AED', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#EF4444'];
    return Object.entries(catMap).map(([name, value], i) => ({
      name, value: Math.round(value), color: colors[i % colors.length],
    }));
  }, [periodInvoices, products]);

  // ── GST summary ────────────────────────────────────────────
  const totalCGST = periodInvoices.reduce((s, i) => s + i.cgstTotal, 0);
  const totalSGST = periodInvoices.reduce((s, i) => s + i.sgstTotal, 0);

  // ── Stat cards ─────────────────────────────────────────────
  const aov = periodInvoices.length > 0 ? Math.round(pnl.revenue / periodInvoices.length) : 0;
  const activeCustomerCount = customers.filter(c => c.visitCount > 0).length;

  // ── 6. Export CSV ──────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    // Build CSV rows from the currently visible data
    const rows: string[][] = [];

    // Section 1: P&L Summary
    rows.push(['--- P&L Summary ---']);
    rows.push(['Metric', 'Amount (₹)']);
    rows.push(['Revenue', String(Math.round(pnl.revenue))]);
    rows.push(['COGS', String(Math.round(pnl.cogs))]);
    rows.push(['Gross Profit', String(Math.round(pnl.grossProfit))]);
    rows.push(['Expenses', String(Math.round(pnl.totalExpenses))]);
    rows.push(['Net Profit', String(Math.round(pnl.netProfit))]);
    rows.push(['Gross Margin %', pnl.grossMargin.toFixed(1)]);
    rows.push(['Net Margin %', pnl.netMargin.toFixed(1)]);
    rows.push([]);

    // Section 2: Revenue by Day
    rows.push(['--- Revenue by Day ---']);
    rows.push(['Date', 'Revenue (₹)']);
    revenueData.forEach(d => rows.push([d.dateKey, String(d.rev)]));
    rows.push([]);

    // Section 3: Top Products
    rows.push(['--- Top Products ---']);
    rows.push(['Product', 'Revenue (₹)']);
    topProductsData.forEach(p => rows.push([p.fullName, String(p.revenue)]));
    rows.push([]);

    // Section 4: Customer Segments
    rows.push(['--- Customer Segments ---']);
    rows.push(['Segment', 'Count']);
    customerSegments.forEach(s => rows.push([s.name, String(s.value)]));
    rows.push([]);

    // Section 5: GST Summary
    rows.push(['--- GST Summary ---']);
    rows.push(['Type', 'Amount (₹)']);
    rows.push(['CGST', String(Math.round(totalCGST))]);
    rows.push(['SGST', String(Math.round(totalSGST))]);
    rows.push(['Total GST', String(Math.round(totalCGST + totalSGST))]);

    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ShoppIQ_Analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [pnl, revenueData, topProductsData, customerSegments, totalCGST, totalSGST, period]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">{t('analytics')} 📊</h1>
        <div className="flex items-center gap-3">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-purple/20 text-brand-purple text-sm font-medium hover:bg-brand-purple/10 transition-all"
          >
            <FileSpreadsheet size={15} />
            Export CSV
          </button>
          {/* Period Selector */}
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  period === p ? 'bg-white dark:bg-brand-dark-card text-brand-purple shadow' : 'text-gray-500')}>
                {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: t('totalRevenue'), value: formatINR(Math.round(pnl.revenue)), icon: TrendingUp, color: 'text-brand-purple', bg: 'bg-brand-purple/10' },
          { title: 'Gross Profit', value: formatINR(Math.round(pnl.grossProfit)), icon: DollarSign, color: 'text-brand-green', bg: 'bg-green-50' },
          { title: 'Avg. Order Value', value: formatINR(aov), icon: Package, color: 'text-brand-gold', bg: 'bg-amber-50' },
          { title: 'Active Customers', value: String(activeCustomerCount), icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map(s => (
          <div key={s.title} className="stat-card">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-3', s.bg)}>
              <s.icon size={20} className={s.color} />
            </div>
            <div className="text-xl font-bold font-heading text-gray-900 dark:text-white">{s.value}</div>
            <div className="text-sm text-gray-500">{s.title}</div>
          </div>
        ))}
      </div>

      {/* Revenue Trend — Area Chart */}
      <div className="chart-container p-6">
        <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">
          {language === 'hi' ? 'Revenue Trend' : 'Revenue Trend'}
          <span className="text-xs text-gray-400 font-normal ml-2">Last {periodDays} days</span>
        </h2>
        {revenueData.some(d => d.rev > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.08)" />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(revenueData.length / 8))} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                tickFormatter={v => `₹${v / 1000}k`} />
              <Tooltip formatter={(v: any) => [formatINR(v), 'Revenue']}
                contentStyle={{ background: '#1A1035', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12, color: '#fff' }}
                labelStyle={{ color: '#9CA3AF' }} />
              <Area type="monotone" dataKey="rev" stroke="#7C3AED" strokeWidth={2.5}
                fill="url(#revGradient)" activeDot={{ r: 5, fill: '#7C3AED', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[280px] text-gray-400">No data yet — load demo data from Dashboard</div>
        )}
      </div>

      {/* P&L Statement */}
      <div className="chart-container p-6">
        <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">
          {language === 'hi' ? 'Profit & Loss' : 'Profit & Loss'}
          <span className="text-xs text-gray-400 font-normal ml-2">Last {periodDays} days</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* P&L Breakdown */}
          <div className="space-y-2">
            {[
              { label: 'Revenue', value: pnl.revenue, color: 'text-brand-purple', bold: true },
              { label: '(-) COGS', value: pnl.cogs, color: 'text-red-400', bold: false },
              { label: 'Gross Profit', value: pnl.grossProfit, color: 'text-brand-green', bold: true },
              { label: '(-) Expenses', value: pnl.totalExpenses, color: 'text-red-400', bold: false },
              { label: 'Net Profit', value: pnl.netProfit, color: pnl.netProfit >= 0 ? 'text-brand-green' : 'text-red-500', bold: true },
            ].map((row) => (
              <div key={row.label} className={cn(
                'flex items-center justify-between p-3 rounded-xl',
                row.bold ? 'bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800' : ''
              )}>
                <span className={cn('text-sm', row.bold ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-500 pl-4')}>{row.label}</span>
                <span className={cn('font-bold font-heading', row.color)}>{formatINR(Math.round(Math.abs(row.value)))}</span>
              </div>
            ))}
          </div>

          {/* Margin Indicators */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-brand-purple/5 to-purple-100/30 dark:from-brand-purple/10 dark:to-purple-900/10 border border-brand-purple/10">
              <div className="text-sm text-gray-500 mb-1">Gross Margin</div>
              <div className="text-3xl font-bold font-heading text-brand-purple">{pnl.grossMargin.toFixed(1)}%</div>
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-brand-purple rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, pnl.grossMargin))}%` }} />
              </div>
            </div>
            <div className={cn(
              'p-4 rounded-xl border',
              pnl.netProfit >= 0
                ? 'bg-gradient-to-br from-green-50/50 to-emerald-100/30 dark:from-green-900/10 dark:to-emerald-900/10 border-green-100 dark:border-green-900/30'
                : 'bg-gradient-to-br from-red-50/50 to-rose-100/30 dark:from-red-900/10 dark:to-rose-900/10 border-red-100 dark:border-red-900/30'
            )}>
              <div className="text-sm text-gray-500 mb-1">Net Margin</div>
              <div className={cn('text-3xl font-bold font-heading', pnl.netProfit >= 0 ? 'text-brand-green' : 'text-red-500')}>
                {pnl.netMargin.toFixed(1)}%
              </div>
              <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className={cn('h-full rounded-full transition-all duration-500', pnl.netProfit >= 0 ? 'bg-brand-green' : 'bg-red-500')}
                  style={{ width: `${Math.min(100, Math.max(0, Math.abs(pnl.netMargin)))}%` }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Top Products + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container p-6">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">{t('topProducts')}</h2>
          {topProductsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={topProductsData} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={v => `₹${v / 1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} width={120} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'Revenue']} />
                <Bar dataKey="revenue" fill="#7C3AED" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">No data</div>
          )}
        </div>

        <div className="chart-container p-6">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">{t('revenueByCategory')}</h2>
          {categoryDonut.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryDonut} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {categoryDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [formatINR(v), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {categoryDonut.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} /><span className="text-gray-500">{c.name}</span></div>
                    <span className="font-medium text-gray-900 dark:text-gray-200">{formatINR(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-gray-400">No data</div>
          )}
        </div>
      </div>

      {/* Customer Segments + GST */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="chart-container p-6">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">Customer Segments</h2>
          {customerSegments.length > 0 ? (
            <div className="space-y-3">
              {customerSegments.map(seg => {
                const total = customers.length || 1;
                const pct = Math.round((seg.value / total) * 100);
                return (
                  <div key={seg.name} className="p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ background: seg.color }} />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{seg.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{pct}%</span>
                        <span className="font-bold font-heading text-gray-900 dark:text-white">{seg.value}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: seg.color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400">No customers yet</div>
          )}
        </div>

        <div className="chart-container p-6">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">GST Summary</h2>
          <div className="space-y-3">
            {[
              { label: 'CGST Collected', value: formatINR(Math.round(totalCGST)), color: 'text-brand-purple' },
              { label: 'SGST Collected', value: formatINR(Math.round(totalSGST)), color: 'text-blue-500' },
              { label: 'Total GST', value: formatINR(Math.round(totalCGST + totalSGST)), color: 'text-brand-green' },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className={cn('font-bold font-heading', item.color)}>{item.value}</span>
              </div>
            ))}
          </div>
          {/* Expense breakdown */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
            <h3 className="text-sm font-heading font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Expenses ({periodDays}d)
            </h3>
            {periodExpenses.length > 0 ? (
              <div className="space-y-2">
                {(() => {
                  const catTotals: Record<string, number> = {};
                  periodExpenses.forEach(e => {
                    catTotals[e.categoryName] = (catTotals[e.categoryName] || 0) + e.amount;
                  });
                  return Object.entries(catTotals)
                    .sort(([, a], [, b]) => b - a)
                    .slice(0, 5)
                    .map(([cat, amount]) => (
                      <div key={cat} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 capitalize">{cat}</span>
                        <span className="font-medium text-red-500">{formatINR(Math.round(amount))}</span>
                      </div>
                    ));
                })()}
                <div className="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800 text-sm">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Total</span>
                  <span className="font-bold font-heading text-red-500">{formatINR(Math.round(pnl.totalExpenses))}</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">No expenses recorded yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
