import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn } from '../lib/formatters';
import {
  subscribeInvoices, subscribeProducts,
  subscribeCustomers, subscribeExpenses
} from '../lib/firestoreService';
import type { Invoice, Product, Customer, Expense } from '../types/firestore';
import { TrendingUp, Package, Users, DollarSign, ShoppingCart, ArrowUpRight, ArrowDownRight, Download, RefreshCw, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Area, AreaChart
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────
function formatCompact(n: number): string {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
}

function downloadCSV(rows: string[][], filename: string) {
  const csvContent = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

// ── Shimmer Skeleton ─────────────────────────────────────────
function Skeleton({ h = 'h-6', w = 'w-full', className = '' }: { h?: string; w?: string; className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200', h, w, className)} />;
}

function CardSkeleton() {
  return (
    <div className="p-3 rounded-md bg-white border border-gray-200 space-y-3">
      <Skeleton h="h-4" w="w-24" />
      <Skeleton h="h-8" w="w-32" />
      <Skeleton h="h-3" w="w-20" />
    </div>
  );
}

function ChartSkeleton({ height = 280 }: { height?: number }) {
  return <div className="animate-pulse rounded-md bg-gray-100" style={{ height }} />;
}

// ── Empty State ──────────────────────────────────────────────
function EmptyChart({ message, showCTA = true }: { message: string; showCTA?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center h-[260px] text-center px-4">
      <FileText size={40} className="text-gray-300 mb-3" />
      <p className="text-xs text-gray-500 mt-0.5">{message}</p>
      {showCTA && (
        <Link to="/billing/new" className="text-sm text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1">
          <ShoppingCart size={14} /> Create First Bill
        </Link>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────
export default function Analytics() {
  const { tenantId } = useAuth();
  const { t, language } = useLanguage();
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Firestore real-time state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

  // ── Firestore subscriptions (once, not per period) ─────────
  useEffect(() => {
    if (!tenantId) return;
    setLoading(true);
    let loaded = 0;
    const markLoaded = () => { loaded++; if (loaded >= 4) setLoading(false); };

    const unsub1 = subscribeInvoices(tenantId, (data) => { setInvoices(data); markLoaded(); }, 1000);
    const unsub2 = subscribeProducts(tenantId, (data) => { setProducts(data); markLoaded(); });
    const unsub3 = subscribeCustomers(tenantId, (data) => { setCustomers(data); markLoaded(); });
    const unsub4 = subscribeExpenses(tenantId, (data) => { setExpenses(data); markLoaded(); });
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [tenantId]);

  // ── Date ranges ────────────────────────────────────────────
  const { cutoffDate, prevCutoffDate } = useMemo(() => {
    const now = new Date();
    const cut = new Date(now);
    cut.setDate(cut.getDate() - periodDays);
    cut.setHours(0, 0, 0, 0);
    const prev = new Date(cut);
    prev.setDate(prev.getDate() - periodDays);
    return { cutoffDate: cut, prevCutoffDate: prev };
  }, [periodDays]);

  const periodInvoices = useMemo(() =>
    invoices.filter(inv => inv.invoiceDate && inv.invoiceDate.toDate() >= cutoffDate)
  , [invoices, cutoffDate]);

  const prevPeriodInvoices = useMemo(() =>
    invoices.filter(inv => {
      if (!inv.invoiceDate) return false;
      const d = inv.invoiceDate.toDate();
      return d >= prevCutoffDate && d < cutoffDate;
    })
  , [invoices, prevCutoffDate, cutoffDate]);

  const periodExpenses = useMemo(() =>
    expenses.filter(exp => exp.expenseDate && exp.expenseDate.toDate() >= cutoffDate)
  , [expenses, cutoffDate]);

  // ── 1. Summary Stats ──────────────────────────────────────
  const stats = useMemo(() => {
    const revenue = periodInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const prevRevenue = prevPeriodInvoices.reduce((s, i) => s + i.grandTotal, 0);
    const orders = periodInvoices.length;
    const prevOrders = prevPeriodInvoices.length;
    const aov = orders > 0 ? Math.round(revenue / orders) : 0;
    const prevAov = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

    // Active customers — unique customerIds in this period
    const activeCustomers = new Set(periodInvoices.filter(i => i.customerId).map(i => i.customerId)).size;
    const prevActiveCustomers = new Set(prevPeriodInvoices.filter(i => i.customerId).map(i => i.customerId)).size;

    const pct = (curr: number, prev: number) => prev > 0 ? Math.round(((curr - prev) / prev) * 100) : curr > 0 ? 100 : 0;

    return {
      revenue, prevRevenue, revenuePct: pct(revenue, prevRevenue),
      orders, prevOrders, ordersPct: pct(orders, prevOrders),
      aov, prevAov, aovPct: pct(aov, prevAov),
      activeCustomers, prevActiveCustomers, customersPct: pct(activeCustomers, prevActiveCustomers),
    };
  }, [periodInvoices, prevPeriodInvoices]);

  // ── 2. Revenue Trend ──────────────────────────────────────
  const revenueData = useMemo(() => {
    const dayMap: Record<string, { rev: number; count: number }> = {};
    for (let i = periodDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dayMap[key] = { rev: 0, count: 0 };
    }
    periodInvoices.forEach(inv => {
      if (!inv.invoiceDate) return;
      const key = inv.invoiceDate.toDate().toISOString().split('T')[0];
      if (dayMap[key]) {
        dayMap[key].rev += inv.grandTotal;
        dayMap[key].count += 1;
      }
    });
    return Object.entries(dayMap).map(([dateKey, data]) => ({
      day: new Date(dateKey).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      dateKey,
      rev: Math.round(data.rev),
      count: data.count,
      aov: data.count > 0 ? Math.round(data.rev / data.count) : 0,
    }));
  }, [periodInvoices, periodDays]);

  // ── 3. Top Products ───────────────────────────────────────
  const topProductsData = useMemo(() => {
    const prodMap: Record<string, { revenue: number; qty: number }> = {};
    periodInvoices.forEach(inv => inv.items.forEach(item => {
      if (!prodMap[item.productName]) prodMap[item.productName] = { revenue: 0, qty: 0 };
      prodMap[item.productName].revenue += item.totalAmount;
      prodMap[item.productName].qty += item.quantity;
    }));
    const totalRevenue = Object.values(prodMap).reduce((s, p) => s + p.revenue, 0);
    return Object.entries(prodMap)
      .sort(([, a], [, b]) => b.revenue - a.revenue)
      .slice(0, 10)
      .map(([name, data], i) => ({
        rank: i + 1,
        name: name.length > 20 ? name.slice(0, 20) + '…' : name,
        fullName: name,
        revenue: Math.round(data.revenue),
        quantity: data.qty,
        pct: totalRevenue > 0 ? Math.round((data.revenue / totalRevenue) * 100) : 0,
      }));
  }, [periodInvoices]);

  // ── 4. Revenue by Category ────────────────────────────────
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    periodInvoices.forEach(inv => inv.items.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      const cat = prod?.categoryName || 'Others';
      catMap[cat] = (catMap[cat] || 0) + item.totalAmount;
    }));
    const total = Object.values(catMap).reduce((s, v) => s + v, 0);
    const colors = ['#7C3AED', '#DB2777', '#D97706', '#059669', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'];
    return Object.entries(catMap)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], i) => ({
        name, value: Math.round(value),
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        color: colors[i % colors.length],
      }));
  }, [periodInvoices, products]);

  // ── 5. Customer Segments (computed dynamically) ───────────
  const customerSegments = useMemo(() => {
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date(); sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    let vip = 0, newC = 0, atRisk = 0, regular = 0;
    customers.forEach(c => {
      if (c.totalLifetimeValue > 10000) { vip++; return; }
      if (c.createdAt && c.createdAt.toDate() >= thirtyDaysAgo) { newC++; return; }
      if (c.lastPurchaseAt && c.lastPurchaseAt.toDate() < sixtyDaysAgo) { atRisk++; return; }
      regular++;
    });
    return [
      { name: 'VIP', value: vip, color: '#8B5CF6' },
      { name: 'Regular', value: regular, color: '#3B82F6' },
      { name: 'New', value: newC, color: '#10B981' },
      { name: 'At Risk', value: atRisk, color: '#EF4444' },
    ].filter(s => s.value > 0);
  }, [customers]);

  // ── 6. P&L Summary ────────────────────────────────────────
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

  // ── 7. Monthly P&L Table (last 6 months) ──────────────────
  const monthlyPnL = useMemo(() => {
    const months: Array<{
      month: string; key: string; revenue: number; cogs: number;
      grossProfit: number; expenses: number; netProfit: number; margin: number;
    }> = [];

    for (let m = 5; m >= 0; m--) {
      const d = new Date();
      d.setMonth(d.getMonth() - m);
      const year = d.getFullYear();
      const month = d.getMonth();
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

      const monthInv = invoices.filter(inv => {
        if (!inv.invoiceDate) return false;
        const date = inv.invoiceDate.toDate();
        return date >= monthStart && date <= monthEnd;
      });

      const rev = monthInv.reduce((s, i) => s + i.grandTotal, 0);
      const cogs = monthInv.reduce((s, i) => s + i.items.reduce((is, item) => {
        const prod = products.find(p => p.id === item.productId);
        return is + ((prod ? prod.purchasePrice : item.unitPrice * 0.7) * item.quantity);
      }, 0), 0);
      const gp = rev - cogs;

      const monthExp = expenses.filter(exp => {
        if (!exp.expenseDate) return false;
        const date = exp.expenseDate.toDate();
        return date >= monthStart && date <= monthEnd;
      });
      const exp = monthExp.reduce((s, e) => s + e.amount, 0);
      const np = gp - exp;
      const margin = rev > 0 ? ((gp / rev) * 100) : 0;

      months.push({
        month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        key: `${year}-${String(month + 1).padStart(2, '0')}`,
        revenue: Math.round(rev), cogs: Math.round(cogs),
        grossProfit: Math.round(gp), expenses: Math.round(exp),
        netProfit: Math.round(np), margin: Math.round(margin * 10) / 10,
      });
    }
    return months;
  }, [invoices, expenses, products]);

  // ── 8. GST Summary ────────────────────────────────────────
  const totalCGST = periodInvoices.reduce((s, i) => s + (i.cgstTotal || 0), 0);
  const totalSGST = periodInvoices.reduce((s, i) => s + (i.sgstTotal || 0), 0);

  // ── 9. Vyapaar Score ──────────────────────────────────────
  const vyapaarScore = useMemo(() => {
    // 1. Invoice Regularity (20pts)
    const last7 = new Date(); last7.setDate(last7.getDate() - 7);
    const daysWithInvoices = new Set(
      invoices.filter(i => i.invoiceDate && i.invoiceDate.toDate() >= last7)
        .map(i => i.invoiceDate.toDate().toISOString().split('T')[0])
    ).size;
    const invoiceScore = daysWithInvoices >= 7 ? 20 : daysWithInvoices >= 5 ? 15 : daysWithInvoices >= 3 ? 10 : daysWithInvoices >= 1 ? 5 : 0;

    // 2. Collections Rate (25pts)
    const totalInv = invoices.length;
    const paidInv = invoices.filter(i => i.paymentStatus === 'paid').length;
    const collectionRate = totalInv > 0 ? (paidInv / totalInv) * 100 : 0;
    const collectionScore = collectionRate > 90 ? 25 : collectionRate > 75 ? 20 : collectionRate > 60 ? 15 : collectionRate > 45 ? 10 : 5;

    // 3. Inventory Health (20pts)
    const activeProducts = products.filter(p => p.isActive);
    const normalStock = activeProducts.filter(p => p.currentStock > p.minimumStockAlert).length;
    const stockRate = activeProducts.length > 0 ? (normalStock / activeProducts.length) * 100 : 0;
    const stockScore = stockRate > 90 ? 20 : stockRate > 75 ? 15 : stockRate > 60 ? 10 : 5;

    // 4. Customer Retention (20pts)
    const repeatCustomers = customers.filter(c => c.visitCount > 1).length;
    const retentionRate = customers.length > 0 ? (repeatCustomers / customers.length) * 100 : 0;
    const retentionScore = retentionRate > 60 ? 20 : retentionRate > 45 ? 15 : retentionRate > 30 ? 10 : 5;

    // 5. GST Compliance (15pts)
    const gstInvoices = invoices.filter(i => (i.cgstTotal || 0) + (i.sgstTotal || 0) > 0).length;
    const gstRate = totalInv > 0 ? (gstInvoices / totalInv) * 100 : 0;
    const gstScore = gstRate > 80 ? 15 : gstRate > 60 ? 10 : 5;

    const rawTotal = invoiceScore + collectionScore + stockScore + retentionScore + gstScore;
    const total = rawTotal * 10; // out of 1000

    const components = [
      { label: 'Invoice Regularity', score: invoiceScore, max: 20, color: '#7C3AED', tip: daysWithInvoices < 5 ? 'Rozana bill banao for higher score' : '' },
      { label: 'Collections Rate', score: collectionScore, max: 25, color: '#3B82F6', tip: collectionRate < 75 ? 'Pending payments collect karo' : '' },
      { label: 'Inventory Health', score: stockScore, max: 20, color: '#10B981', tip: stockRate < 75 ? 'Low stock items reorder karo' : '' },
      { label: 'Customer Retention', score: retentionScore, max: 20, color: '#F59E0B', tip: retentionRate < 45 ? 'Repeat customers ko loyalty offer do' : '' },
      { label: 'GST Compliance', score: gstScore, max: 15, color: '#EF4444', tip: gstRate < 60 ? 'GST invoices banao for compliance' : '' },
    ];

    return { total, components, tips: components.filter(c => c.tip).sort((a, b) => (a.score / a.max) - (b.score / b.max)).slice(0, 3).map(c => c.tip) };
  }, [invoices, products, customers]);

  // ── Export Functions ───────────────────────────────────────
  const exportSalesCSV = useCallback(() => {
    const rows = [['Date', 'Revenue (₹)', 'Invoice Count', 'Avg Order Value (₹)']];
    revenueData.forEach(d => rows.push([d.dateKey, String(d.rev), String(d.count), String(d.aov)]));
    downloadCSV(rows, `ShoppIQ-Sales-${period}-${new Date().toISOString().split('T')[0]}.csv`);
  }, [revenueData, period]);

  const exportTopProductsCSV = useCallback(() => {
    const rows = [['Rank', 'Product Name', 'Total Revenue (₹)', 'Total Quantity', 'Percentage (%)']];
    topProductsData.forEach(p => rows.push([String(p.rank), p.fullName, String(p.revenue), String(p.quantity), String(p.pct)]));
    downloadCSV(rows, `ShoppIQ-TopProducts-${new Date().toISOString().split('T')[0]}.csv`);
  }, [topProductsData]);

  const exportPnLCSV = useCallback(() => {
    const rows = [['Month', 'Revenue (₹)', 'COGS (₹)', 'Gross Profit (₹)', 'Expenses (₹)', 'Net Profit (₹)', 'Gross Margin (%)']];
    monthlyPnL.forEach(m => rows.push([m.month, String(m.revenue), String(m.cogs), String(m.grossProfit), String(m.expenses), String(m.netProfit), String(m.margin)]));
    const totals = monthlyPnL.reduce((t, m) => ({
      revenue: t.revenue + m.revenue, cogs: t.cogs + m.cogs, grossProfit: t.grossProfit + m.grossProfit,
      expenses: t.expenses + m.expenses, netProfit: t.netProfit + m.netProfit,
    }), { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 });
    const totalMargin = totals.revenue > 0 ? ((totals.grossProfit / totals.revenue) * 100).toFixed(1) : '0';
    rows.push(['TOTAL', String(totals.revenue), String(totals.cogs), String(totals.grossProfit), String(totals.expenses), String(totals.netProfit), totalMargin]);
    downloadCSV(rows, `ShoppIQ-PnL-${new Date().toISOString().split('T')[0]}.csv`);
  }, [monthlyPnL]);

  // ── Trend Arrow Component ─────────────────────────────────
  const Trend = ({ pct }: { pct: number }) => {
    if (pct === 0) return null;
    return (
      <span className={cn('flex items-center gap-0.5 text-xs font-medium', pct > 0 ? 'text-green-600' : 'text-red-500')}>
        {pct > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
        {Math.abs(pct)}%
      </span>
    );
  };

  // ── Error handler ─────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-center">
        <p className="text-red-500 text-sm mb-3">{language === 'hi' ? 'Data load nahi ho paya. Dobara try karo' : 'Failed to load data. Please try again.'}</p>
        <button onClick={() => { setError(''); window.location.reload(); }}
          className="flex items-center gap-2 text-sm text-purple-600 font-medium">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  // ── Score ring params ─────────────────────────────────────
  const scoreRadius = 70;
  const scoreCirc = 2 * Math.PI * scoreRadius;
  const scorePct = vyapaarScore.total / 1000;
  const scoreColor = vyapaarScore.total >= 700 ? '#059669' : vyapaarScore.total >= 400 ? '#D97706' : '#DC2626';

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="p-3 md:p-8 rounded-md bg-white border border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
             {t('analytics')}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">व्यापार विश्लेषण — Business Intelligence</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-gray-100 rounded-md p-1">
            {(['7d', '30d', '90d', '1y'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  period === p ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200')}>
                {p === '7d' ? '7D' : p === '30d' ? '30D' : p === '90d' ? '90D' : '1Y'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ STAT CARDS ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton />
          </>
        ) : (
          [
            { title: language === 'hi' ? 'कुल बिक्री' : 'Total Revenue', value: formatINR(Math.round(stats.revenue)), pct: stats.revenuePct, icon: TrendingUp, borderColor: '#6D28D9' },
            { title: language === 'hi' ? 'कुल ऑर्डर' : 'Total Orders', value: String(stats.orders), pct: stats.ordersPct, icon: Package, borderColor: '#DB2777' },
            { title: language === 'hi' ? 'औसत ऑर्डर' : 'Avg Order Value', value: formatINR(stats.aov), pct: stats.aovPct, icon: DollarSign, borderColor: '#D97706' },
            { title: language === 'hi' ? 'सक्रिय ग्राहक' : 'Active Customers', value: String(stats.activeCustomers), pct: stats.customersPct, icon: Users, borderColor: '#059669' },
          ].map((s) => (
            <div key={s.title} className="p-3 border border-gray-200 rounded-md">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <s.icon size={16} />
                  {s.title}
                </div>
                <Trend pct={s.pct} />
              </div>
              <div className="text-xl font-semibold text-gray-900">{s.value}</div>
            </div>
          ))
        )}
      </div>

      {/* ═══ REVENUE TREND ═══ */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            {language === 'hi' ? 'बिक्री रुझान' : 'Revenue Trend'}
            <span className="text-xs text-gray-400 font-normal ml-2">Last {periodDays} days</span>
          </h2>
          <button onClick={exportSalesCSV} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors">
            <Download size={13} /> CSV
          </button>
        </div>
        {loading ? <ChartSkeleton /> : revenueData.some(d => d.rev > 0) ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={revenueData}>
              
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                interval={Math.max(0, Math.floor(revenueData.length / 8))} />
              <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                tickFormatter={(v: number) => formatCompact(v).replace('₹', '')} />
              <Tooltip
                formatter={(v: any) => [formatINR(v), 'Revenue']}
                contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }}
                labelStyle={{ color: '#6B7280', fontSize: 11 }} />
              <Area type="monotone" dataKey="rev" stroke="#7C3AED" strokeWidth={2.5}
                fill="#7C3AED" activeDot={{ r: 5, fill: '#7C3AED', stroke: 'white', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        ) : <EmptyChart message={language === 'hi' ? 'Is period mein koi bill nahi bana' : 'No invoices found in this period'} />}
      </div>

      {/* ═══ TOP PRODUCTS + CATEGORY ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{t('topProducts')}</h2>
            <button onClick={exportTopProductsCSV} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors">
              <Download size={13} /> CSV
            </button>
          </div>
          {loading ? <ChartSkeleton height={260} /> : topProductsData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topProductsData} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickFormatter={(v: number) => formatCompact(v).replace('₹', '')} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#4B5563' }} width={120} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'Revenue']}
                  contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }} />
                <Bar dataKey="revenue" radius={[0, 0, 0, 0]}>
                  {topProductsData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? '#6D28D9' : i === 1 ? '#8B5CF6' : i === 2 ? '#A78BFA' : '#C4B5FD'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="No product sales data" />}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">{t('revenueByCategory')}</h2>
          {loading ? <ChartSkeleton height={260} /> : categoryData.length > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
                    {categoryData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [formatINR(v), '']}
                    contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full space-y-1.5 mt-2">
                {categoryData.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-gray-600">{c.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{formatINR(c.value)} ({c.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart message="No category data" />}
        </div>
      </div>

      {/* ═══ P&L STATEMENT ═══ */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          {language === 'hi' ? 'लाभ और हानि' : 'Profit & Loss'}
          <span className="text-xs text-gray-400 font-normal ml-2">Last {periodDays} days</span>
        </h2>
        {loading ? <ChartSkeleton height={200} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              {[
                { label: 'Revenue', value: pnl.revenue, color: 'text-purple-700', bold: true },
                { label: '(-) COGS', value: pnl.cogs, color: 'text-red-500', bold: false },
                { label: 'Gross Profit', value: pnl.grossProfit, color: 'text-green-600', bold: true },
                { label: '(-) Expenses', value: pnl.totalExpenses, color: 'text-red-500', bold: false },
                { label: 'Net Profit', value: pnl.netProfit, color: pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-500', bold: true },
              ].map(row => (
                <div key={row.label} className={cn('flex items-center justify-between p-3 rounded-md', row.bold ? 'bg-gray-50 border border-gray-100' : '')}>
                  <span className={cn('text-sm', row.bold ? 'font-semibold text-gray-900' : 'text-gray-500 pl-4')}>{row.label}</span>
                  <span className={cn('font-bold font-stat', row.color)}>{formatINR(Math.round(Math.abs(row.value)))}</span>
                </div>
              ))}
            </div>
            <div className="space-y-4">
              <div className="p-4 rounded-md bg-purple-50 border border-purple-100">
                <div className="text-sm text-gray-600 mb-1">Gross Margin</div>
                <div className="text-2xl font-bold font-stat text-purple-700">{pnl.grossMargin.toFixed(1)}%</div>
                <div className="mt-2 h-2 bg-purple-100 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-600 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, pnl.grossMargin))}%` }} />
                </div>
              </div>
              <div className={cn('p-4 rounded-md border', pnl.netProfit >= 0 ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100')}>
                <div className="text-sm text-gray-600 mb-1">Net Margin</div>
                <div className={cn('text-2xl font-bold font-stat', pnl.netProfit >= 0 ? 'text-green-600' : 'text-red-500')}>
                  {pnl.netMargin.toFixed(1)}%
                </div>
                <div className={cn('mt-2 h-2 rounded-full overflow-hidden', pnl.netProfit >= 0 ? 'bg-green-100' : 'bg-red-100')}>
                  <div className={cn('h-full rounded-full transition-all duration-500', pnl.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500')}
                    style={{ width: `${Math.min(100, Math.max(0, Math.abs(pnl.netMargin)))}%` }} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ MONTHLY P&L TABLE ═══ */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
            {language === 'hi' ? 'मासिक लाभ-हानि' : 'Monthly P&L'}
          </h2>
          <button onClick={exportPnLCSV} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-purple-600 transition-colors">
            <Download size={13} /> Export CSV
          </button>
        </div>
        {loading ? <ChartSkeleton height={200} /> : (
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs text-gray-500 uppercase font-medium">Month</th>
                  {monthlyPnL.map(m => <th key={m.key} className="text-right py-2 text-xs text-gray-500 uppercase font-medium px-2">{m.month}</th>)}
                  <th className="text-right py-2 text-xs text-gray-500 uppercase font-medium px-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {['Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit', 'Margin %'].map(label => {
                  const key = label === 'Revenue' ? 'revenue' : label === 'COGS' ? 'cogs' : label === 'Gross Profit' ? 'grossProfit' : label === 'Expenses' ? 'expenses' : label === 'Net Profit' ? 'netProfit' : 'margin';
                  const isBold = ['Revenue', 'Gross Profit', 'Net Profit'].includes(label);
                  const totals = monthlyPnL.reduce((t, m) => ({
                    revenue: t.revenue + m.revenue, cogs: t.cogs + m.cogs, grossProfit: t.grossProfit + m.grossProfit,
                    expenses: t.expenses + m.expenses, netProfit: t.netProfit + m.netProfit,
                  }), { revenue: 0, cogs: 0, grossProfit: 0, expenses: 0, netProfit: 0 });
                  const totalMargin = totals.revenue > 0 ? Math.round((totals.grossProfit / totals.revenue) * 100 * 10) / 10 : 0;

                  return (
                    <tr key={label} className={cn('border-b border-gray-50', isBold ? 'bg-gray-50/50' : '')}>
                      <td className={cn('py-2 text-sm', isBold ? 'font-semibold text-gray-900' : 'text-gray-500 pl-3')}>{label}</td>
                      {monthlyPnL.map(m => {
                        const val = m[key as keyof typeof m] as number;
                        return (
                          <td key={m.key} className={cn('text-right py-2 px-2 font-stat text-sm',
                            key === 'margin' ? (val >= 30 ? 'text-green-600' : val < 10 ? 'text-red-500' : 'text-gray-700') :
                            key === 'netProfit' ? (val >= 0 ? 'text-green-600' : 'text-red-500') :
                            isBold ? 'text-gray-900 font-semibold' : 'text-gray-600'
                          )}>
                            {key === 'margin' ? `${val}%` : formatINR(Math.abs(val))}
                          </td>
                        );
                      })}
                      <td className={cn('text-right py-2 px-2 font-stat font-semibold text-sm',
                        key === 'netProfit' ? ((totals as any)[key] >= 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-900'
                      )}>
                        {key === 'margin' ? `${totalMargin}%` : formatINR(Math.abs((totals as any)[key] || 0))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══ CUSTOMER SEGMENTS + GST ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Customer Segments Donut */}
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">Customer Segments</h2>
          {loading ? <ChartSkeleton height={260} /> : customerSegments.length > 0 ? (
            <div className="flex flex-col items-center">
              <div className="relative">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={customerSegments} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {customerSegments.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => [v, 'Customers']}
                      contentStyle={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-stat text-gray-900">{customers.length}</div>
                    <div className="text-[10px] text-gray-500">Total</div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-4 mt-3">
                {customerSegments.map(s => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                    <span className="text-gray-600">{s.name}: <strong className="text-gray-900">{s.value}</strong></span>
                  </div>
                ))}
              </div>
            </div>
          ) : <EmptyChart message="No customers yet" showCTA={false} />}
        </div>

        {/* GST + Expenses */}
        <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">GST Summary</h2>
          {loading ? <ChartSkeleton height={200} /> : (
            <>
              <div className="space-y-3">
                {[
                  { label: 'CGST', value: formatINR(Math.round(totalCGST)), color: 'text-purple-700' },
                  { label: 'SGST', value: formatINR(Math.round(totalSGST)), color: 'text-blue-600' },
                  { label: 'Total GST', value: formatINR(Math.round(totalCGST + totalSGST)), color: 'text-green-600' },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-3 rounded-md border border-gray-100 bg-gray-50">
                    <span className="text-sm text-gray-600">{item.label}</span>
                    <span className={cn('font-bold font-stat', item.color)}>{item.value}</span>
                  </div>
                ))}
              </div>
              <Link to="/gst" className="block text-center text-sm text-purple-600 font-medium mt-3 hover:text-purple-700">
                View Full GST Report →
              </Link>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <h3 className="text-sm font-heading font-semibold text-gray-700 mb-3">Expenses ({periodDays}d)</h3>
                {periodExpenses.length > 0 ? (
                  <div className="space-y-2">
                    {(() => {
                      const catTotals: Record<string, number> = {};
                      periodExpenses.forEach(e => { catTotals[e.categoryName] = (catTotals[e.categoryName] || 0) + e.amount; });
                      return Object.entries(catTotals).sort(([, a], [, b]) => b - a).slice(0, 5).map(([cat, amount]) => (
                        <div key={cat} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 capitalize">{cat}</span>
                          <span className="font-medium text-red-500">{formatINR(Math.round(amount))}</span>
                        </div>
                      ));
                    })()}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-sm">
                      <span className="font-medium text-gray-700">Total</span>
                      <span className="font-bold font-stat text-red-500">{formatINR(Math.round(pnl.totalExpenses))}</span>
                    </div>
                  </div>
                ) : <p className="text-xs text-gray-500">No expenses recorded yet</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ═══ VYAPAAR SCORE ═══ */}
      <div className="bg-white rounded-md border border-gray-200 shadow-sm p-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
          {language === 'hi' ? 'व्यापार स्कोर' : 'Vyapaar Score'}
        </h2>
        {loading ? <ChartSkeleton height={200} /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Score Ring */}
            <div className="flex flex-col items-center">
              <div className="relative w-[180px] h-[180px]">
                <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90">
                  <circle cx="90" cy="90" r={scoreRadius} fill="none" stroke="#F3F4F6" strokeWidth="10" />
                  <circle cx="90" cy="90" r={scoreRadius} fill="none" stroke={scoreColor} strokeWidth="10"
                    strokeDasharray={`${scorePct * scoreCirc} ${scoreCirc}`}
                    strokeLinecap="round" className="transition-all duration-1000" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold font-stat" style={{ color: scoreColor }}>{vyapaarScore.total}</div>
                    <div className="text-xs text-gray-500">/1000</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Score Components */}
            <div className="space-y-4">
              {vyapaarScore.components.map(comp => (
                <div key={comp.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-700">{comp.label}</span>
                    <span className="text-xs font-stat font-medium text-gray-500">{comp.score}/{comp.max}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${(comp.score / comp.max) * 100}%`, background: comp.color }} />
                  </div>
                </div>
              ))}

              {/* Tips */}
              {vyapaarScore.tips.length > 0 && (
                <div className="mt-4 p-3 rounded-md bg-purple-50 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-700 mb-2"> Score Improve Tips:</p>
                  {vyapaarScore.tips.map((tip, i) => (
                    <p key={i} className="text-xs text-purple-600 mb-1">• {tip}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="made-in-india text-center text-sm py-4 text-gray-500">Made with  in Jabalpur, India </div>
    </div>
  );
}
