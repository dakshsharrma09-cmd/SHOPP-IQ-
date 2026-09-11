import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, formatDate } from '../lib/formatters';
import { useToast } from '../components/Toast';
import { seedFirestore } from '../lib/seedData';
import {
  subscribeDailySnapshots, subscribeInvoices, subscribeProducts, subscribeCustomers
} from '../lib/firestoreService';
import type { Invoice, Product, DailySnapshot, Customer } from '../types/firestore';
import {
  TrendingUp, AlertTriangle, Users, Package,
  FileText, Plus, CreditCard, MessageCircle,
  Receipt, DollarSign, Star, ChevronDown, ChevronUp, Sprout
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

export default function Dashboard() {
  const { tenantId, tenant } = useAuth();
  const { showToast } = useToast();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState<'7D' | '30D'>('30D');
  const [scoreOpen, setScoreOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seeded, setSeeded] = useState(false);

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

  const salesData30 = useMemo(() => snapshots.map(s => ({
    day: new Date(s.dateKey).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    sales: s.totalSales,
  })), [snapshots]);
  const salesData7 = salesData30.slice(-7);
  const chartData = chartPeriod === '7D' ? salesData7 : salesData30;

  const todayInvoices = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return invoices.filter(inv => {
      if (!inv.invoiceDate) return false;
      return inv.invoiceDate.toDate() >= todayStart;
    });
  }, [invoices]);
  const todaySales = todayInvoices.reduce((s, inv) => s + inv.grandTotal, 0);

  const pendingInvoices = useMemo(() =>
    invoices.filter(inv => ['unpaid', 'partial', 'overdue'].includes(inv.paymentStatus))
  , [invoices]);
  const pendingTotal = pendingInvoices.reduce((s, inv) => s + inv.amountPending, 0);
  const pendingCount = pendingInvoices.length;

  const lowStockProducts = products.filter(p => p.isActive && p.currentStock <= p.minimumStockAlert);

  const newCustomersToday = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return customers.filter(c => {
      if (!c.createdAt) return false;
      const created = c.createdAt.toDate();
      return created >= todayStart;
    }).length;
  }, [customers]);

  const categoryData = useMemo(() => {
    const catMap: Record<string, number> = {};
    products.filter(p => p.isActive).forEach(p => {
      const cat = p.categoryName || 'Others';
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    const total = Object.values(catMap).reduce((a, b) => a + b, 0) || 1;
    const colors = ['#6D28D9', '#D97706', '#059669', '#3B82F6', '#DC2626', '#6B7280'];
    return Object.entries(catMap).map(([name, count], i) => ({
      name, value: Math.round((count / total) * 100), color: colors[i % colors.length],
    }));
  }, [products]);

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

  const recentInvoices = useMemo(() =>
    invoices.slice(0, 5).map(inv => ({
      id: inv.invoiceNumber,
      customer: inv.customerName,
      customerPhone: inv.customerPhone,
      amount: inv.grandTotal,
      status: inv.paymentStatus,
      date: inv.invoiceDate ? formatDate(inv.invoiceDate.toDate()) : '',
    }))
  , [invoices]);

  const quickActions = [
    { icon: FileText, label: 'New Bill', path: '/billing/new' },
    { icon: Plus, label: 'Add Stock', path: '/inventory' },
    { icon: Users, label: 'Add Customer', path: '/customers' },
    { icon: CreditCard, label: 'Record Payment', path: '/payments' },
    { icon: Receipt, label: 'GST Report', path: '/gst' },
    { icon: DollarSign, label: 'Add Expense', path: '/expenses' },
  ];

  const scoreBreakdown = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekInvoices = invoices.filter(inv => inv.invoiceDate && inv.invoiceDate.toDate() >= weekAgo);
    const invoiceHealth = Math.min(200, Math.round((weekInvoices.length / 7) * 200));
    const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'paid').length;
    const collectionsRate = invoices.length > 0 ? Math.round((paidInvoices / invoices.length) * 250) : 0;
    const activeProds = products.filter(p => p.isActive !== false);
    const normalStock = activeProds.filter(p => (p.currentStock || 0) > (p.minimumStockAlert || 0)).length;
    const inventoryMgmt = activeProds.length > 0 ? Math.round((normalStock / activeProds.length) * 200) : 0;
    const repeatCustomers = customers.filter(c => (c.visitCount || 0) > 1).length;
    const customerRetention = customers.length > 0 ? Math.round((repeatCustomers / customers.length) * 200) : 0;
    const gstInvoices = invoices.filter(inv => (inv.cgstTotal || 0) + (inv.sgstTotal || 0) > 0).length;
    const gstCompliance = invoices.length > 0 ? Math.round((gstInvoices / invoices.length) * 150) : 0;
    return [
      { label: 'Invoice Health', score: invoiceHealth, max: 200 },
      { label: 'Collections', score: collectionsRate, max: 250 },
      { label: 'Inventory', score: inventoryMgmt, max: 200 },
      { label: 'Retention', score: customerRetention, max: 200 },
      { label: 'GST', score: gstCompliance, max: 150 },
    ];
  }, [invoices, products, customers]);

  const vyapaarScore = useMemo(() => scoreBreakdown.reduce((sum, item) => sum + item.score, 0), [scoreBreakdown]);

  const handleSeed = async () => {
    if (!tenantId) return;
    setSeeding(true);
    try {
      await seedFirestore(tenantId);
      setSeeded(true);
    } catch (err) {
      showToast('Demo data load nahi hua. Dobara try karo.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const tooltipStyle = { background: '#fff', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: 12 };

  return (
    <div className="space-y-4">
      {/* PAGE HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Namaste, {tenant?.ownerName?.split(' ')[0] || 'Boss'}
            {isLive && <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 ml-2 align-middle" />}
          </h1>
          <p className="text-xs text-gray-500">
            {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!seeded && (
            <button onClick={handleSeed} disabled={seeding}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border border-gray-200 text-gray-600 hover:bg-gray-50">
              <Sprout size={14} />
              {seeding ? 'Loading...' : 'Demo Data'}
            </button>
          )}
          <button onClick={() => navigate('/billing/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium text-white bg-purple-700 hover:bg-purple-800">
            <Plus size={14} />
            New Bill
          </button>
        </div>
      </div>

      {/* KEY METRICS — plain, quiet */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 border border-gray-200 rounded-md bg-white cursor-pointer hover:bg-gray-50" onClick={() => navigate('/analytics')}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500 font-medium">{t('todaySales')}</span>
            <TrendingUp size={14} className="text-gray-400" />
          </div>
          <div className="text-xl font-semibold text-gray-900">₹{todaySales.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{todayInvoices.length} bills today</div>
        </div>

        <div className="p-3 border border-gray-200 rounded-md bg-white cursor-pointer hover:bg-gray-50" onClick={() => navigate('/payments')}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500 font-medium">{t('pendingPayments')}</span>
            <AlertTriangle size={14} className="text-gray-400" />
          </div>
          <div className="text-xl font-semibold text-gray-900">₹{pendingTotal.toLocaleString('en-IN')}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{pendingCount} pending</div>
        </div>

        <div className="p-3 border border-gray-200 rounded-md bg-white cursor-pointer hover:bg-gray-50" onClick={() => navigate('/inventory')}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500 font-medium">{t('lowStock')}</span>
            <Package size={14} className="text-gray-400" />
          </div>
          <div className="text-xl font-semibold text-gray-900">{lowStockProducts.length}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">{lowStockProducts.length > 0 ? 'Reorder needed' : 'Stock OK'}</div>
        </div>

        <div className="p-3 border border-gray-200 rounded-md bg-white cursor-pointer hover:bg-gray-50" onClick={() => navigate('/customers')}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-gray-500 font-medium">{t('newCustomers')}</span>
            <Users size={14} className="text-gray-400" />
          </div>
          <div className="text-xl font-semibold text-gray-900">{newCustomersToday}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">Total {customers.length}</div>
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-3 bg-white border border-gray-200 rounded-md p-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">{t('salesTrend')}</h2>
            <div className="flex gap-0.5 bg-gray-100 rounded p-0.5">
              {(['7D', '30D'] as const).map(p => (
                <button key={p} onClick={() => setChartPeriod(p)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium ${chartPeriod === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}>
                  {p === '7D' ? '7D' : '30D'}
                </button>
              ))}
            </div>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  interval={chartPeriod === '30D' ? 4 : 0} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${v/1000}k`} width={45} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'Sales']} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="sales" stroke="#6D28D9" strokeWidth={2} dot={false}
                  activeDot={{ r: 4, fill: '#6D28D9', stroke: '#fff', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400 text-xs">No data — load demo data</div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-md p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('revenueByCategory')}</h2>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={60}
                    paddingAngle={2} dataKey="value" stroke="none">
                    {categoryData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => [`${v}%`, '']} contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1 mt-2">
                {categoryData.map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs py-0.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-sm" style={{ background: c.color }} />
                      <span className="text-gray-600">{c.name}</span>
                    </div>
                    <span className="font-medium text-gray-900">{c.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-gray-400 text-xs">No products</div>
          )}
        </div>
      </div>

      {/* TOP PRODUCTS + RECENT INVOICES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">{t('topProducts')}</h2>
          {topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={topProducts} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false}
                  tickFormatter={v => `₹${v/1000}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} width={100} />
                <Tooltip formatter={(v: any) => [formatINR(v), 'Revenue']} contentStyle={tooltipStyle} />
                <Bar dataKey="revenue" radius={[0, 3, 3, 0]} fill="#6D28D9" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[180px] text-gray-400 text-xs">No data</div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold text-gray-900">{t('recentInvoices')}</h2>
            <button onClick={() => navigate('/payments')} className="text-[11px] text-purple-700 font-medium hover:underline">View all</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-gray-500 uppercase border-b border-gray-200">
                <th className="text-left py-1.5 font-medium">Customer</th>
                <th className="text-right py-1.5 font-medium">Amount</th>
                <th className="text-center py-1.5 font-medium">Status</th>
                <th className="w-6"></th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.length > 0 ? recentInvoices.map(inv => (
                <tr key={inv.id} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                  <td className="py-2">
                    <div className="text-sm font-medium text-gray-900">{inv.customer || 'Walk-in'}</div>
                    <div className="text-[10px] text-gray-400">{inv.date}</div>
                  </td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatINR(inv.amount)}</td>
                  <td className="py-2 text-center"><StatusBadge status={inv.status} /></td>
                  <td className="py-2">
                    {inv.customerPhone && (
                      <button onClick={(e) => {
                        e.stopPropagation();
                        window.open(`https://wa.me/91${inv.customerPhone}?text=${encodeURIComponent(`Namaste ${inv.customer}! Aapka bill ${inv.id} ready hai. Total: ${formatINR(inv.amount)}. - ShoppIQ`)}`, '_blank');
                      }} className="text-gray-400 hover:text-green-600">
                        <MessageCircle size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center py-6 text-gray-400 text-xs">No invoices yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK ACTIONS — compact inline row */}
      <div className="flex flex-wrap gap-2">
        {quickActions.map(action => (
          <button key={action.label} onClick={() => navigate(action.path)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded bg-white text-xs font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors">
            <action.icon size={14} className="text-gray-400" />
            {action.label}
          </button>
        ))}
      </div>

      {/* VYAPAAR SCORE — collapsible */}
      <div className="border border-gray-200 rounded-md bg-white">
        <button onClick={() => setScoreOpen(!scoreOpen)}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-900">{t('vyapaarScore')}</span>
            <span className="text-xs text-gray-500">Business Health</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-gray-900">{vyapaarScore}<span className="text-xs text-gray-400 font-normal">/1000</span></span>
            {scoreOpen ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
          </div>
        </button>

        {scoreOpen && (
          <div className="px-3 pb-3 border-t border-gray-100">
            <div className="space-y-2.5 mt-3">
              {scoreBreakdown.map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-600">{item.label}</span>
                    <span className="font-medium text-gray-900">{item.score}/{item.max}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-purple-700 transition-all" style={{ width: `${(item.score / item.max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {pendingCount > 0 && (
              <p className="text-[11px] text-gray-500 mt-3 p-2 bg-gray-50 rounded">
                Tip: Remind {pendingCount} pending bills to improve score by ~15 pts
              </p>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-gray-400 py-3">Made with ❤️ in Jabalpur, India 🇮🇳</div>
    </div>
  );
}
