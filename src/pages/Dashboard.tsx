import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, formatDate } from '../lib/formatters';
import { seedFirestore } from '../lib/seedData';
import {
  subscribeDailySnapshots, subscribeInvoices, subscribeProducts, subscribeCustomers
} from '../lib/firestoreService';
import type { Invoice, Product, DailySnapshot, Customer } from '../types/firestore';
import {
  TrendingUp, AlertTriangle, Users, Package,
  FileText, Plus, CreditCard, MessageSquare,
  Receipt, DollarSign, Star, ChevronDown, ChevronUp, ArrowUpRight, Sprout
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'badge-green', partial: 'badge-amber', unpaid: 'badge-red', overdue: 'badge-red',
  };
  return <span className={map[status] || 'badge-blue'}>{status}</span>;
}

function StatCard({ title, value, sub, subColor, icon: Icon, iconColor, iconBg, onClick, primary }: any) {
  if (primary) {
    return (
      <div className="stat-card-primary group" onClick={onClick}>
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <Icon size={22} className="text-white" />
          </div>
          <ArrowUpRight size={16} className="text-white/50 group-hover:text-white transition-colors" />
        </div>
        <div className="text-2xl font-bold font-heading text-white mb-1">{value}</div>
        <div className="text-sm text-white/80 mb-1">{title}</div>
        <div className="text-xs font-medium text-white/60">{sub}</div>
      </div>
    );
  }
  return (
    <div className="stat-card group" onClick={onClick}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
          <Icon size={22} className={iconColor} />
        </div>
        <ArrowUpRight size={16} className="text-gray-300 group-hover:text-brand-purple transition-colors" />
      </div>
      <div className="text-2xl font-bold font-heading text-gray-900 dark:text-white mb-1">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">{title}</div>
      <div className={`text-xs font-medium ${subColor}`}>{sub}</div>
    </div>
  );
}

export default function Dashboard() {
  const { tenantId, tenant } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<'7D' | '30D'>('30D');
  const [scoreOpen, setScoreOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

  // Firestore state — all real-time via onSnapshot
  const [snapshots, setSnapshots] = useState<Array<DailySnapshot & { dateKey: string }>>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeDailySnapshots(tenantId, (data) => { setSnapshots(data); setIsLive(true); }, 30);
    const unsub2 = subscribeInvoices(tenantId, setInvoices, 200);
    const unsub3 = subscribeProducts(tenantId, setProducts);
    const unsub4 = subscribeCustomers(tenantId, setCustomers);
    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [tenantId]);

  // Compute chart data from daily snapshots
  const salesData30 = useMemo(() => snapshots.map(s => ({
    day: new Date(s.dateKey).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    sales: s.totalSales,
  })), [snapshots]);
  const salesData7 = salesData30.slice(-7);
  const chartData = chartPeriod === '7D' ? salesData7 : salesData30;

  // === STAT 1: Aaj ki Bikri — sum of today's invoice grandTotal ===
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInvoices = useMemo(() => invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const d = inv.invoiceDate.toDate().toISOString().split('T')[0];
    return d === todayStr;
  }), [invoices, todayStr]);
  const todaySales = todayInvoices.reduce((s, inv) => s + inv.grandTotal, 0);

  // === STAT 2: Pending Payments — invoices with status unpaid/partial/overdue ===
  const pendingInvoices = useMemo(() =>
    invoices.filter(inv => ['unpaid', 'partial', 'overdue'].includes(inv.paymentStatus))
  , [invoices]);
  const pendingTotal = pendingInvoices.reduce((s, inv) => s + inv.amountPending, 0);
  const pendingCount = pendingInvoices.length;

  // === STAT 3: Low Stock — products where currentStock <= minimumStockAlert ===
  const lowStockProducts = products.filter(p => p.isActive && p.currentStock <= p.minimumStockAlert);

  // === STAT 4: Naye Customers — customers created today ===
  const newCustomersToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return customers.filter(c => {
      if (!c.createdAt) return false;
      const created = c.createdAt.toDate();
      return created >= todayStart;
    }).length;
  }, [customers]);

  // Category breakdown from products
  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    products.filter(p => p.isActive).forEach(p => {
      const cat = p.categoryName || 'Others';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const total = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#7C3AED', '#F59E0B', '#10B981', '#3B82F6', '#EC4899', '#EF4444', '#06B6D4'];
    return Object.entries(catMap).map(([name, count], i) => ({
      name, value: Math.round((count / total) * 100), color: colors[i % colors.length],
    }));
  }, [products]);

  // Top products from invoices
  const topProducts = useMemo(() => {
    const prodMap: Record<string, number> = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(item => {
        prodMap[item.productName] = (prodMap[item.productName] || 0) + item.totalAmount;
      });
    });
    return Object.entries(prodMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, revenue]) => ({ name, revenue: Math.round(revenue) }));
  }, [invoices]);

  // Recent invoices (last 5)
  const recentInvoices = useMemo(() =>
    invoices.slice(0, 5).map(inv => ({
      id: inv.invoiceNumber,
      customer: inv.customerName,
      amount: inv.grandTotal,
      status: inv.paymentStatus,
      date: inv.invoiceDate ? formatDate(inv.invoiceDate.toDate()) : '',
    }))
  , [invoices]);

  const quickActions = [
    { icon: FileText, label: 'Naya Bill', labelHi: 'Naya Bill', path: '/billing/new', color: 'text-brand-purple' },
    { icon: Plus, label: 'Add Stock', labelHi: 'Stock Jodein', path: '/inventory', color: 'text-brand-green' },
    { icon: Users, label: 'Add Customer', labelHi: 'Grahak Jodein', path: '/customers', color: 'text-brand-blue' },
    { icon: CreditCard, label: 'Record Payment', labelHi: 'Bhugtan Darj', path: '/payments', color: 'text-brand-gold' },
    { icon: MessageSquare, label: 'WhatsApp Report', labelHi: 'WhatsApp Report', path: '/analytics', color: 'text-brand-whatsapp' },
    { icon: Receipt, label: 'GST Report', labelHi: 'GST Report', path: '/gst', color: 'text-purple-500' },
    { icon: DollarSign, label: 'Add Expense', labelHi: 'Kharcha Jodein', path: '/payments', color: 'text-red-500' },
    { icon: Star, label: 'Vyapaar Score', labelHi: 'Vyapaar Score', path: '/analytics', color: 'text-brand-gold' },
  ];

  const vyapaarScore = tenant?.vyapaarScore || 0;

  const scoreBreakdown = useMemo(() => {
    const invoiceHealth = invoices.length > 0
      ? Math.round((invoices.filter(i => i.paymentStatus === 'paid').length / invoices.length) * 100) : 0;
    const collectionsRate = invoices.length > 0
      ? Math.round((invoices.reduce((s, i) => s + i.amountPaid, 0) / Math.max(1, invoices.reduce((s, i) => s + i.grandTotal, 0))) * 100) : 0;
    const inventoryMgmt = products.length > 0
      ? Math.round(((products.filter(p => p.isActive && p.currentStock > p.minimumStockAlert).length) / Math.max(1, products.filter(p => p.isActive).length)) * 100) : 0;
    // Customer Retention: % of customers with 2+ visits (repeat buyers)
    const activeCustomers = customers.filter(c => c.visitCount > 0);
    const repeatCustomers = customers.filter(c => c.visitCount >= 2);
    const customerRetention = activeCustomers.length > 0
      ? Math.round((repeatCustomers.length / activeCustomers.length) * 100) : 0;
    // GST Compliance: % of invoices that have non-zero GST applied
    const gstInvoices = invoices.filter(i => (i.cgstTotal + i.sgstTotal) > 0);
    const gstCompliance = invoices.length > 0
      ? Math.round((gstInvoices.length / invoices.length) * 100) : 0;
    return [
      { label: 'Invoice Health', score: invoiceHealth, color: '#10B981' },
      { label: 'Collections Rate', score: collectionsRate, color: '#3B82F6' },
      { label: 'Inventory Mgmt', score: inventoryMgmt, color: '#F59E0B' },
      { label: 'Customer Retention', score: customerRetention, color: '#8B5CF6' },
      { label: 'GST Compliance', score: gstCompliance, color: '#10B981' },
    ];
  }, [invoices, products, customers]);

  const handleSeed = async () => {
    if (!tenantId) return;
    setSeeding(true);
    await seedFirestore(tenantId);
    setSeeded(true);
    setSeeding(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white">
            {language === 'hi' ? `Namaste, ${tenant?.ownerName?.split(' ')[0] || 'ji'} 👋` : `Good Morning, ${tenant?.ownerName?.split(' ')[0] || 'there'} 👋`}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {tenant?.businessName || 'Your Store'} · {formatDate(new Date())}
          </p>
        </div>
        {!seeded && (
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-purple/30 text-brand-purple text-sm font-medium hover:bg-brand-purple/10 transition-all"
          >
            <Sprout size={15} />
            {seeding ? 'Loading demo data...' : 'Load Demo Data'}
          </button>
        )}
      </div>

      {/* ROW 1: Stat Cards */}
      <div className="mb-1 flex items-center gap-2">
        {isLive && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-green/10">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-green"></span>
            </span>
            <span className="text-[10px] font-heading font-semibold text-brand-green uppercase tracking-wider">Live</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard primary title={t('todaySales')} value={formatINR(todaySales)} sub={`${todayInvoices.length} invoices today`} subColor="text-brand-green"
          icon={TrendingUp} iconColor="text-brand-purple" iconBg="bg-brand-purple/10" onClick={() => navigate('/analytics')} />
        <StatCard title={t('pendingPayments')} value={formatINR(pendingTotal)} sub={`${pendingCount} invoices pending`} subColor="text-brand-gold"
          icon={AlertTriangle} iconColor="text-brand-gold" iconBg="bg-brand-gold/10" onClick={() => navigate('/payments')} />
        <StatCard title={t('lowStock')} value={`${lowStockProducts.length} Products`} sub={lowStockProducts.length > 0 ? 'Reorder needed' : 'All stocked'} subColor={lowStockProducts.length > 0 ? 'text-red-500' : 'text-brand-green'}
          icon={Package} iconColor="text-red-500" iconBg="bg-red-50" onClick={() => navigate('/inventory')} />
        <StatCard title={t('newCustomers')} value={`${newCustomersToday} ${language === 'hi' ? 'Naye' : 'New'}`} sub={`${todayInvoices.filter(i => !i.customerId).length} walk-ins today`} subColor="text-blue-500"
          icon={Users} iconColor="text-blue-500" iconBg="bg-blue-50" onClick={() => navigate('/customers')} />
      </div>

      {/* ROW 2: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sales Trend */}
        <div className="lg:col-span-3 chart-container p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-semibold text-gray-900 dark:text-white">{t('salesTrend')}</h2>
              <p className="text-xs text-gray-400 mt-0.5">Bikri ka Rujhan</p>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(['7D', '30D'] as const).map(p => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${chartPeriod === p ? 'bg-brand-purple text-white shadow' : 'text-gray-500 hover:text-gray-700'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.08)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  interval={chartPeriod === '30D' ? 4 : 0} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${v/1000}k`} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'Sales']}
                  contentStyle={{ background: '#1A1035', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12 }}
                  labelStyle={{ color: '#E8E0FF', fontSize: 12 }} itemStyle={{ color: '#7C3AED' }} />
                <Line type="monotone" dataKey="sales" stroke="#7C3AED" strokeWidth={2.5}
                  dot={false} activeDot={{ r: 5, fill: '#7C3AED', stroke: 'white', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
              {language === 'hi' ? 'Data load ho raha hai... Demo data load karein ↗' : 'No data yet — Load Demo Data above ↗'}
            </div>
          )}
        </div>

        {/* Category Pie */}
        <div className="lg:col-span-2 chart-container p-6">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-1">{t('revenueByCategory')}</h2>
          <p className="text-xs text-gray-400 mb-3">Category wise</p>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    paddingAngle={3} dataKey="value">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, '']}
                    contentStyle={{ background: '#1A1035', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {categoryData.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                      <span className="text-gray-600 dark:text-gray-400">{c.name}</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-gray-200">{c.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No products yet</div>
          )}
        </div>
      </div>

      {/* ROW 3: Top Products + Recent Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="chart-container p-6">
          <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">{t('topProducts')}</h2>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.08)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${v/1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={110} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'Revenue']}
                  contentStyle={{ background: '#1A1035', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 10 }} />
                <Bar dataKey="revenue" radius={[0, 6, 6, 0]}
                  fill="url(#purpleGradient)" />
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6D28D9" />
                    <stop offset="100%" stopColor="#8B5CF6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">No invoice data yet</div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-gray-900 dark:text-white">{t('recentInvoices')}</h2>
            <button onClick={() => navigate('/payments')} className="text-xs text-brand-purple hover:underline font-medium">View all →</button>
          </div>
          <div className="space-y-3">
            {recentInvoices.length > 0 ? recentInvoices.map(inv => (
              <div key={inv.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-800 last:border-0 table-row-hover rounded-lg px-2 cursor-pointer">
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100 font-heading">{inv.id}</div>
                  <div className="text-xs text-gray-400">{inv.customer} · {inv.date}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-heading text-gray-900 dark:text-white">{formatINR(inv.amount)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            )) : (
              <div className="text-center py-6 text-gray-400 text-sm">No invoices yet</div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 4: Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="font-heading font-semibold text-gray-900 dark:text-white mb-4">{t('quickActions')}</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {quickActions.map(action => (
            <button key={action.label} onClick={() => navigate(action.path)} className="quick-action">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800 group-hover:bg-brand-purple/10`}>
                <action.icon size={20} className={action.color} />
              </div>
              <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight font-heading">
                {language === 'hi' ? action.labelHi : action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* VYAPAAR SCORE Panel */}
      <div className="glass-card overflow-hidden">
        <button
          onClick={() => setScoreOpen(!scoreOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-brand-purple/5 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center">
              <Star size={22} className="text-brand-gold" />
            </div>
            <div className="text-left">
              <div className="font-heading font-bold text-gray-900 dark:text-white">{t('vyapaarScore')} — {vyapaarScore}/1000</div>
              <div className="text-xs text-gray-400">Click to see breakdown</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={vyapaarScore >= 600 ? 'badge-green' : vyapaarScore >= 400 ? 'badge-amber' : 'badge-red'}>
              {vyapaarScore >= 600 ? 'Good ↑' : vyapaarScore >= 400 ? 'Average' : 'Needs Work'}
            </span>
            {scoreOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </div>
        </button>

        {scoreOpen && (
          <div className="px-6 pb-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Circular Score */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-40 h-40">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(124,58,237,0.1)" strokeWidth="8" />
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#7C3AED" strokeWidth="8"
                      strokeDasharray={`${(vyapaarScore/1000)*251.2} 251.2`} strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold font-heading text-gray-900 dark:text-white">{vyapaarScore}</span>
                    <span className="text-xs text-gray-400">out of 1000</span>
                  </div>
                </div>
              </div>
              {/* Breakdown */}
              <div className="space-y-3">
                {scoreBreakdown.map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 dark:text-gray-400">{item.label}</span>
                      <span className="font-medium font-heading" style={{ color: item.color }}>{item.score}/100</span>
                    </div>
                    <div className="progress-bar h-1.5">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${item.score}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/10">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    💡 <strong>Tip:</strong> {pendingCount} pending invoices remind karein → <span className="text-brand-purple font-medium">+15 pts</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
