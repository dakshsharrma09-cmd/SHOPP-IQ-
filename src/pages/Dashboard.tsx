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

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'शुभ प्रभात', emoji: '☀️', sub: 'Good Morning' };
  if (hour < 17) return { text: 'नमस्ते', emoji: '🙏', sub: 'Good Afternoon' };
  if (hour < 21) return { text: 'शुभ संध्या', emoji: '🌅', sub: 'Good Evening' };
  return { text: 'शुभ रात्रि', emoji: '🌙', sub: 'Good Night' };
};

function AnimatedNumber({ value, prefix = '', suffix = '' }: { value: number; prefix?: string; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const steps = 40;
    const inc = value / steps;
    let cur = 0;
    const t = setInterval(() => {
      cur += inc;
      if (cur >= value) { setDisplay(value); clearInterval(t); }
      else setDisplay(Math.floor(cur));
    }, duration / steps);
    return () => clearInterval(t);
  }, [value]);
  return <>{prefix}{display.toLocaleString('en-IN')}{suffix}</>;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    paid: 'badge-green', partial: 'badge-amber', unpaid: 'badge-red', overdue: 'badge-red',
  };
  return <span className={map[status] || 'badge-blue'}>{status}</span>;
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

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .float-anim { animation: float 3s ease-in-out infinite; }
        @keyframes gradientMove { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes scoreRing { from { stroke-dasharray: 0 251.2; } }
        .score-ring-anim { animation: scoreRing 1.5s ease-out forwards; }
        @keyframes countPop { 0% { transform: scale(0.8); opacity: 0; } 60% { transform: scale(1.05); } 100% { transform: scale(1); opacity: 1; } }
        .count-pop { animation: countPop 0.5s ease-out forwards; }
      `}</style>

      {/* ═══════════════════ HERO BANNER ═══════════════════ */}
      <div className="relative overflow-hidden rounded-2xl p-6 md:p-8"
        style={{ background: 'linear-gradient(-45deg, #1E0A3C, #2D1266, #1A0D3F, #0F0A1E)', backgroundSize: '400% 400%', animation: 'gradientMove 12s ease infinite' }}>
        {/* Floating decorative orbs */}
        <div className="absolute top-4 right-12 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #7C3AED, transparent)' }} />
        <div className="absolute bottom-2 left-8 w-24 h-24 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #F59E0B, transparent)' }} />
        <div className="absolute top-1/2 right-1/3 w-16 h-16 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #10B981, transparent)' }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-white flex items-center gap-3 mb-1">
              <span className="text-3xl float-anim">{greeting.emoji}</span>
              <span>{greeting.text}, <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(135deg, #C4B5FD, #F9A8D4)' }}>{tenant?.ownerName?.split(' ')[0] || 'Boss'}</span>!</span>
              {isLive && (
                <span className="relative flex h-2.5 w-2.5 mt-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                </span>
              )}
            </h1>
            <p className="text-sm text-purple-300/70 font-heading">
              {new Intl.DateTimeFormat('hi-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(new Date())}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {!seeded && (
              <button onClick={handleSeed} disabled={seeding}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105 active:scale-95"
                style={{ background: 'rgba(124, 58, 237, 0.2)', border: '1px solid rgba(124, 58, 237, 0.3)', color: '#C4B5FD' }}>
                <Sprout size={15} />
                {seeding ? 'Loading...' : '🎲 Demo Data'}
              </button>
            )}
            <button onClick={() => navigate('/billing/new')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 active:scale-95 btn-pulse"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
              <Plus size={16} /> {t('createBill').split('&')[0]}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════ STAT CARDS ═══════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Sales — Purple Gradient */}
        <div className="fade-in-up rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
          style={{ animationDelay: '0ms', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 50%, #5B21B6 100%)', boxShadow: '0 8px 32px rgba(124, 58, 237, 0.3)' }}
          onClick={() => navigate('/analytics')}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <TrendingUp size={20} className="text-white" />
            </div>
            <ArrowUpRight size={14} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="text-2xl font-bold font-heading text-white mb-0.5 count-pop"><AnimatedNumber value={todaySales} prefix="₹" /></div>
          <div className="text-xs text-white/80 font-medium">{t('todaySales')}</div>
          <div className="text-[10px] text-white/50 mt-1">{todayInvoices.length} बिल आज</div>
        </div>

        {/* Pending — Amber/Orange */}
        <div className="fade-in-up rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
          style={{ animationDelay: '100ms', background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 50%, #B45309 100%)', boxShadow: '0 8px 32px rgba(245, 158, 11, 0.25)' }}
          onClick={() => navigate('/payments')}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <ArrowUpRight size={14} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="text-2xl font-bold font-heading text-white mb-0.5 count-pop"><AnimatedNumber value={pendingTotal} prefix="₹" /></div>
          <div className="text-xs text-white/80 font-medium">{t('pendingPayments')}</div>
          <div className="text-[10px] text-white/50 mt-1">{pendingCount} बिल बाकी</div>
        </div>

        {/* Low Stock — Red/Rose */}
        <div className="fade-in-up rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
          style={{ animationDelay: '200ms', background: lowStockProducts.length > 0 ? 'linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)', boxShadow: lowStockProducts.length > 0 ? '0 8px 32px rgba(239, 68, 68, 0.25)' : '0 8px 32px rgba(16, 185, 129, 0.25)' }}
          onClick={() => navigate('/inventory')}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Package size={20} className="text-white" />
            </div>
            <ArrowUpRight size={14} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="text-2xl font-bold font-heading text-white mb-0.5 count-pop"><AnimatedNumber value={lowStockProducts.length} /></div>
          <div className="text-xs text-white/80 font-medium">{t('lowStock')}</div>
          <div className="text-[10px] text-white/50 mt-1">{lowStockProducts.length > 0 ? '⚠️ Reorder करो' : '✅ सब ठीक'}</div>
        </div>

        {/* New Customers — Blue */}
        <div className="fade-in-up rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl group"
          style={{ animationDelay: '300ms', background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)', boxShadow: '0 8px 32px rgba(59, 130, 246, 0.25)' }}
          onClick={() => navigate('/customers')}>
          <div className="flex items-start justify-between mb-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Users size={20} className="text-white" />
            </div>
            <ArrowUpRight size={14} className="text-white/40 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
          </div>
          <div className="text-2xl font-bold font-heading text-white mb-0.5 count-pop"><AnimatedNumber value={newCustomersToday} /></div>
          <div className="text-xs text-white/80 font-medium">{t('newCustomers')}</div>
          <div className="text-[10px] text-white/50 mt-1">कुल {customers.length} ग्राहक</div>
        </div>
      </div>

      {/* ═══════════════════ CHARTS ROW ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Sales Trend */}
        <div className="lg:col-span-3 glass-card card-glow p-6 fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white text-base">{t('salesTrend')}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">📈 बिक्री का रुझान</p>
            </div>
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800/80 rounded-xl p-1">
              {(['7D', '30D'] as const).map(p => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${chartPeriod === p ? 'bg-brand-purple text-white shadow-md shadow-purple-500/30' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                  {p === '7D' ? '7 दिन' : '30 दिन'}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={chartData}>
                <defs>
                  <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#7C3AED" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6D28D9" />
                    <stop offset="50%" stopColor="#7C3AED" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.06)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  interval={chartPeriod === '30D' ? 4 : 0} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${v/1000}k`} width={50} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'बिक्री']}
                  contentStyle={{ background: 'rgba(26,16,53,0.95)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 14, backdropFilter: 'blur(10px)' }}
                  labelStyle={{ color: '#C4B5FD', fontSize: 11, fontWeight: 600 }} itemStyle={{ color: '#A78BFA' }} />
                <Line type="monotone" dataKey="sales" stroke="url(#lineGrad)" strokeWidth={3}
                  dot={false} activeDot={{ r: 6, fill: '#7C3AED', stroke: 'white', strokeWidth: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[230px] text-gray-400 text-sm gap-2">
              <span className="text-4xl">📊</span>
              <span>अभी कोई data नहीं — Demo Data लोड करें ↗</span>
            </div>
          )}
        </div>

        {/* Category Pie */}
        <div className="lg:col-span-2 glass-card card-glow p-6 fade-in-up" style={{ animationDelay: '500ms' }}>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white text-base mb-1">{t('revenueByCategory')}</h2>
          <p className="text-[11px] text-gray-400 mb-4">🏷️ श्रेणी अनुसार</p>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                    paddingAngle={4} dataKey="value" stroke="none">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, '']}
                    contentStyle={{ background: 'rgba(26,16,53,0.95)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {categoryData.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs group cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 py-1 -mx-2 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full shadow-sm" style={{ background: c.color }} />
                      <span className="text-gray-600 dark:text-gray-400 font-medium">{c.name}</span>
                    </div>
                    <span className="font-bold text-gray-900 dark:text-gray-200">{c.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-gray-400 text-sm gap-2">
              <span className="text-4xl">📦</span>
              <span>कोई product नहीं</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ TOP PRODUCTS + RECENT INVOICES ═══════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="glass-card card-glow p-6 fade-in-up" style={{ animationDelay: '600ms' }}>
          <h2 className="font-heading font-bold text-gray-900 dark:text-white text-base mb-1">🏆 {t('topProducts')}</h2>
          <p className="text-[11px] text-gray-400 mb-4">सबसे ज़्यादा बिकने वाले</p>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topProducts} layout="vertical" barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(124,58,237,0.06)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${v/1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={110} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'Revenue']}
                  contentStyle={{ background: 'rgba(26,16,53,0.95)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 12 }} />
                <Bar dataKey="revenue" radius={[0, 8, 8, 0]} fill="url(#purpleGradient)" />
                <defs>
                  <linearGradient id="purpleGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6D28D9" />
                    <stop offset="100%" stopColor="#A78BFA" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] text-gray-400 text-sm gap-2">
              <span className="text-4xl">🏪</span>
              <span>अभी कोई data नहीं</span>
            </div>
          )}
        </div>

        {/* Recent Invoices */}
        <div className="glass-card card-glow p-6 fade-in-up" style={{ animationDelay: '700ms' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-heading font-bold text-gray-900 dark:text-white text-base">🧾 {t('recentInvoices')}</h2>
              <p className="text-[11px] text-gray-400 mt-0.5">हाल के बिल</p>
            </div>
            <button onClick={() => navigate('/payments')} className="text-xs text-brand-purple hover:text-brand-purple-light font-semibold transition-colors">
              सब देखें →
            </button>
          </div>
          <div className="space-y-2">
            {recentInvoices.length > 0 ? recentInvoices.map((inv, i) => (
              <div key={inv.id} className="flex items-center justify-between py-2.5 px-3 rounded-xl border border-transparent hover:border-brand-purple/10 hover:bg-brand-purple/[0.03] transition-all cursor-pointer fade-in-up" style={{ animationDelay: `${700 + i * 80}ms` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple text-xs font-bold">
                    {inv.id.slice(-3)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 font-heading">{inv.customer || 'Walk-in'}</div>
                    <div className="text-[10px] text-gray-400">{inv.date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold font-heading text-gray-900 dark:text-white">{formatINR(inv.amount)}</span>
                  <StatusBadge status={inv.status} />
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400 text-sm">
                <span className="text-4xl block mb-2">📄</span>
                कोई बिल नहीं — पहला बिल बनाओ!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════ QUICK ACTIONS ═══════════════════ */}
      <div className="glass-card card-glow p-6 fade-in-up" style={{ animationDelay: '800ms' }}>
        <h2 className="font-heading font-bold text-gray-900 dark:text-white text-base mb-4">⚡ {t('quickActions')}</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
          {quickActions.map((action, i) => (
            <button key={action.label} onClick={() => navigate(action.path)}
              className="quick-action group hover:scale-105 active:scale-95 transition-all duration-200 fade-in-up"
              style={{ animationDelay: `${800 + i * 60}ms` }}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gray-50 dark:bg-gray-800/80 group-hover:bg-brand-purple/10 transition-all duration-200 group-hover:shadow-md`}>
                <action.icon size={20} className={`${action.color} transition-transform group-hover:scale-110`} />
              </div>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 text-center leading-tight font-heading">
                {language === 'hi' ? action.labelHi : action.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════ VYAPAAR SCORE ═══════════════════ */}
      <div className="glass-card card-glow overflow-hidden fade-in-up" style={{ animationDelay: '900ms' }}>
        <button onClick={() => setScoreOpen(!scoreOpen)}
          className="w-full flex items-center justify-between p-6 hover:bg-brand-purple/5 transition-colors">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(124, 58, 237, 0.15))' }}>
              <Star size={24} className="text-brand-gold" />
              <div className="absolute inset-0 rounded-2xl" style={{ background: 'linear-gradient(135deg, transparent, rgba(245, 158, 11, 0.1))', animation: 'pulse 2s ease-in-out infinite' }} />
            </div>
            <div className="text-left">
              <div className="font-heading font-bold text-lg text-gray-900 dark:text-white">{t('vyapaarScore')}</div>
              <div className="text-xs text-gray-400 flex items-center gap-2">
                आपके व्यापार की सेहत
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${vyapaarScore >= 600 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : vyapaarScore >= 400 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {vyapaarScore >= 600 ? '🟢 अच्छा' : vyapaarScore >= 400 ? '🟡 ठीक-ठाक' : '🔴 सुधारो'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold font-heading text-brand-purple">{vyapaarScore}<span className="text-sm text-gray-400 font-normal">/1000</span></span>
            {scoreOpen ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
          </div>
        </button>

        {scoreOpen && (
          <div className="px-6 pb-6 animate-slide-up">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Animated Circular Score */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-44 h-44">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(124,58,237,0.08)" strokeWidth="7" />
                    <circle cx="50" cy="50" r="40" fill="none" strokeWidth="7" strokeLinecap="round"
                      className="score-ring-anim"
                      style={{ stroke: vyapaarScore >= 600 ? '#10B981' : vyapaarScore >= 400 ? '#F59E0B' : '#EF4444', strokeDasharray: `${(vyapaarScore/1000)*251.2} 251.2` }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold font-heading text-gray-900 dark:text-white">{vyapaarScore}</span>
                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">1000 में से</span>
                  </div>
                </div>
              </div>
              {/* Breakdown */}
              <div className="space-y-4">
                {scoreBreakdown.map((item, i) => (
                  <div key={item.label} className="fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-gray-600 dark:text-gray-400 font-medium">{item.label}</span>
                      <span className="font-bold font-heading" style={{ color: item.color }}>{item.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${item.score}%`, background: `linear-gradient(90deg, ${item.color}, ${item.color}dd)` }} />
                    </div>
                  </div>
                ))}
                <div className="mt-4 p-3.5 rounded-xl border border-brand-purple/10"
                  style={{ background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.05), rgba(245, 158, 11, 0.03))' }}>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    💡 <strong>टिप:</strong> {pendingCount} बाकी बिल remind करो → <span className="text-brand-purple font-bold">+15 pts</span>
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
