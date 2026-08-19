import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn, whatsappLink } from '../lib/formatters';
import { subscribeInvoices, subscribeProducts, subscribeCustomers } from '../lib/firestoreService';
import type { Invoice, Product, Customer } from '../types/firestore';
import { FileDown, Printer, MessageCircle } from 'lucide-react';

// Standard Indian GST slabs
const GST_SLABS = [0, 5, 12, 18, 28] as const;

export default function GST() {
  const { tenantId, tenant } = useAuth();
  const { t, language } = useLanguage();
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState<'gstr1' | 'slabs' | 'hsn'>('gstr1');

  // Firestore state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeInvoices(tenantId, setInvoices, 2000);
    const unsub2 = subscribeProducts(tenantId, setProducts);
    const unsub3 = subscribeCustomers(tenantId, setCustomers);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [tenantId]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthsFull = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  // ── 1. Filter invoices for selected month/year ─────────────
  const monthInvoices = useMemo(() => invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const d = inv.invoiceDate.toDate();
    return d.getMonth() === month && d.getFullYear() === year;
  }), [invoices, month, year]);

  // ── 2. B2B vs B2C separation ───────────────────────────────
  // B2B = customer has a valid GSTIN (15 chars); B2C = everything else
  const { b2bInvoices, b2cInvoices } = useMemo(() => {
    const b2b: Invoice[] = [];
    const b2c: Invoice[] = [];
    monthInvoices.forEach(inv => {
      const customer = customers.find(c => c.id === inv.customerId);
      const hasGstin = customer?.gstin && customer.gstin.length >= 15;
      if (hasGstin) b2b.push(inv);
      else b2c.push(inv);
    });
    return { b2bInvoices: b2b, b2cInvoices: b2c };
  }, [monthInvoices, customers]);

  // ── GSTR-1 Summary: B2B, B2C, Nil Rated ───────────────────
  const gstr1Summary = useMemo(() => {
    const makeBucket = () => ({ count: 0, taxable: 0, cgst: 0, sgst: 0, total: 0 });
    const b2b = makeBucket();
    const b2c = makeBucket();
    const nil = makeBucket();

    const addToBucket = (bucket: ReturnType<typeof makeBucket>, inv: Invoice) => {
      bucket.count++;
      bucket.taxable += inv.subtotal - inv.discountAmount;
      bucket.cgst += inv.cgstTotal;
      bucket.sgst += inv.sgstTotal;
      bucket.total += inv.grandTotal;
    };

    b2bInvoices.forEach(inv => {
      if (inv.cgstTotal + inv.sgstTotal === 0) addToBucket(nil, inv);
      else addToBucket(b2b, inv);
    });

    b2cInvoices.forEach(inv => {
      if (inv.cgstTotal + inv.sgstTotal === 0) addToBucket(nil, inv);
      else addToBucket(b2c, inv);
    });

    return [
      { type: 'B2B (Registered Dealers)', ...b2b },
      { type: 'B2C (Unregistered)', ...b2c },
      { type: 'Nil Rated / Exempt', ...nil },
    ];
  }, [b2bInvoices, b2cInvoices]);

  // ── 3. GST Rate Slab breakdown ─────────────────────────────
  const slabSummary = useMemo(() => {
    const slabMap: Record<number, { count: Set<string>; taxable: number; cgst: number; sgst: number }> = {};
    GST_SLABS.forEach(rate => {
      slabMap[rate] = { count: new Set(), taxable: 0, cgst: 0, sgst: 0 };
    });

    monthInvoices.forEach(inv => {
      inv.items.forEach(item => {
        // Snap the item's gstRate to the nearest standard slab
        const rate = GST_SLABS.reduce((prev, curr) =>
          Math.abs(curr - item.gstRate) < Math.abs(prev - item.gstRate) ? curr : prev
        , 0);
        const slab = slabMap[rate] || slabMap[0];
        slab.count.add(inv.id);
        // Taxable = totalAmount minus GST portion
        const taxable = item.totalAmount - item.cgstAmount - item.sgstAmount;
        slab.taxable += taxable;
        slab.cgst += item.cgstAmount;
        slab.sgst += item.sgstAmount;
      });
    });

    return GST_SLABS.map(rate => ({
      rate,
      invoiceCount: slabMap[rate].count.size,
      taxable: slabMap[rate].taxable,
      cgst: slabMap[rate].cgst,
      sgst: slabMap[rate].sgst,
      total: slabMap[rate].taxable + slabMap[rate].cgst + slabMap[rate].sgst,
    }));
  }, [monthInvoices]);

  // ── 4. HSN Summary ─────────────────────────────────────────
  const hsnSummary = useMemo(() => {
    const hsnMap: Record<string, { desc: string; gstRate: number; qty: number; taxable: number; cgst: number; sgst: number }> = {};
    monthInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const hsn = prod?.hsnCode || item.hsnCode || 'N/A';
        if (!hsnMap[hsn]) {
          hsnMap[hsn] = { desc: item.productName, gstRate: item.gstRate, qty: 0, taxable: 0, cgst: 0, sgst: 0 };
        }
        hsnMap[hsn].qty += item.quantity;
        hsnMap[hsn].taxable += item.totalAmount - item.cgstAmount - item.sgstAmount;
        hsnMap[hsn].cgst += item.cgstAmount;
        hsnMap[hsn].sgst += item.sgstAmount;
      });
    });
    return Object.entries(hsnMap)
      .map(([hsn, data]) => ({ hsn, ...data }))
      .sort((a, b) => (b.taxable + b.cgst + b.sgst) - (a.taxable + a.cgst + a.sgst));
  }, [monthInvoices, products]);

  // ── Totals ─────────────────────────────────────────────────
  const totalCGST = gstr1Summary.reduce((s, r) => s + r.cgst, 0);
  const totalSGST = gstr1Summary.reduce((s, r) => s + r.sgst, 0);
  const totalTax = totalCGST + totalSGST;
  const totalTaxable = gstr1Summary.reduce((s, r) => s + r.taxable, 0);

  // ── 6. Download PDF via window.print() ─────────────────────
  const handlePrintPDF = () => {
    window.print();
  };

  // ── 7. WhatsApp CA ─────────────────────────────────────────
  const handleWhatsAppCA = () => {
    const businessName = tenant?.businessName || 'Meri Dukaan';
    const monthName = monthsFull[month];
    const msg = `Namaste CA sahab! ShoppIQ se ${businessName} ki ${monthName} ${year} ki GST Report ready hai. Total Tax: ${formatINR(Math.round(totalTax))}. GSTR-1 details attach kar raha hoon.`;
    window.open(whatsappLink('', msg), '_blank');
  };

  // ── JSON download ──────────────────────────────────────────
  const handleDownloadJSON = () => {
    const data = {
      gstin: tenant?.gstin || '',
      businessName: tenant?.businessName || '',
      period: `${months[month]} ${year}`,
      generatedAt: new Date().toISOString(),
      gstr1: {
        b2b: gstr1Summary[0],
        b2c: gstr1Summary[1],
        nil: gstr1Summary[2],
      },
      slabWise: slabSummary,
      hsn: hsnSummary,
      totals: { taxable: totalTaxable, cgst: totalCGST, sgst: totalSGST, totalTax },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GSTR1_${months[month]}_${year}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6" id="gst-report">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      `}</style>
      {/* ── Print-only header (hidden on screen) ──────────── */}
      <div className="print-header hidden">
        <div style={{ borderBottom: '2px solid #7C3AED', paddingBottom: 12, marginBottom: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>GSTR-1 Summary</h1>
          <p style={{ fontSize: 13, color: '#6B7280', margin: '4px 0 0' }}>
            {tenant?.businessName || 'Business'} • GSTIN: {tenant?.gstin || 'N/A'} • Period: {monthsFull[month]} {year}
          </p>
          <p style={{ fontSize: 11, color: '#9CA3AF', margin: '2px 0 0' }}>Generated by ShoppIQ on {new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      {/* ── Screen header ─────────────────────────────────── */}
      <div className="p-8 rounded-3xl bg-gradient-to-r from-purple-50 to-pink-50 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl border border-white/10 fade-in-up" style={{ animationDelay: '0.1s' }} data-print-hide>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full blur-[100px] opacity-40"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-heading font-extrabold text-gray-900 mb-2 tracking-tight flex items-center gap-3">
            {t('gst')} 🧾
          </h1>
          <p className="text-indigo-700 text-sm font-medium tracking-widest uppercase">जीएसटी रिपोर्ट</p>
        </div>
        <div className="relative z-10 flex gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-black/40 backdrop-blur-md text-gray-900 text-sm outline-none focus:border-indigo-400 font-medium">
            {months.map((m, i) => <option key={i} value={i} className="bg-surface-bg text-gray-900">{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-black/40 backdrop-blur-md text-gray-900 text-sm outline-none focus:border-indigo-400 font-medium">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y} className="bg-surface-bg text-gray-900">{y}</option>)}
          </select>
        </div>
      </div>

      {/* ── Business Info Banner ──────────────────────────── */}
      <div className="glass-card card-glow p-4 flex flex-col md:flex-row md:items-center justify-between gap-2 fade-in-up" style={{ animationDelay: '0.2s' }}>
        <div>
          <div className="text-sm text-gray-900 font-heading text-section-heading-white">{tenant?.businessName || 'Your Business'}</div>
          <div className="text-xs text-gray-500">GSTIN: <span className="font-mono text-brand-purple">{tenant?.gstin || 'Not set — update in Settings'}</span></div>
        </div>
        <div className="text-xs text-gray-500">
          Period: <span className="font-medium text-gray-700-gray-300">{monthsFull[month]} {year}</span>
          {' • '}B2B: <span className="font-medium text-brand-purple">{b2bInvoices.length}</span>
          {' • '}B2C: <span className="font-medium text-blue-500">{b2cInvoices.length}</span>
        </div>
      </div>

      {/* ── GST Stat Cards ────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Invoices', value: String(monthInvoices.length), gradient: 'linear-gradient(135deg, #6366f1, #4338ca)' },
          { label: 'Taxable Value', value: formatINR(Math.round(totalTaxable)), gradient: 'linear-gradient(135deg, #475569, #334155)' },
          { label: 'CGST', value: formatINR(Math.round(totalCGST)), gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
          { label: 'SGST', value: formatINR(Math.round(totalSGST)), gradient: 'linear-gradient(135deg, #10b981, #047857)' },
          { label: 'Total Tax', value: formatINR(Math.round(totalTax)), gradient: 'linear-gradient(135deg, #f59e0b, #b45309)' },
        ].map((s, i) => (
          <div key={s.label} className="stat-card border-none relative overflow-hidden fade-in-up" style={{ animationDelay: `${0.3 + i * 0.1}s`, background: s.gradient }}>
            <div className="text-xs text-gray-900/80 font-medium mb-1 relative z-10">{s.label}</div>
            <div className="text-xl font-bold font-heading text-gray-900 relative z-10 drop-shadow-md">{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── Tabs ──────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-gray-100-gray-800 rounded-xl w-fit" data-print-hide>
        {(['gstr1', 'slabs', 'hsn'] as const).map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t2 ? 'bg-white-brand-dark-card text-brand-purple shadow' : 'text-gray-500')}>
            {t2 === 'gstr1' ? 'GSTR-1 Summary' : t2 === 'slabs' ? 'Rate Slabs' : 'HSN Summary'}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB 1: GSTR-1 Summary (B2B / B2C / Nil)
          ═══════════════════════════════════════════════════════ */}
      {tab === 'gstr1' && (
        <div className="glass-card card-glow overflow-hidden fade-in-up" style={{ animationDelay: '0.8s' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Invoices</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Taxable Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">CGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">SGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total</th>
              </tr>
            </thead>
            <tbody>
              {gstr1Summary.map(row => (
                <tr key={row.type} className="border-b border-gray-50-gray-800 table-row-hover">
                  <td className="px-4 py-3 font-medium text-gray-900-gray-100">{row.type}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.count}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(row.taxable))}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(row.cgst))}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(row.sgst))}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900-white">{formatINR(Math.round(row.total))}</td>
                </tr>
              ))}
              {/* Totals row */}
              <tr className="bg-brand-purple/5-brand-purple/10 font-semibold">
                <td className="px-4 py-3 text-gray-900-white">Total</td>
                <td className="px-4 py-3 text-center text-gray-900-white">{monthInvoices.length}</td>
                <td className="px-4 py-3 text-right text-gray-900-white">{formatINR(Math.round(totalTaxable))}</td>
                <td className="px-4 py-3 text-right text-brand-purple">{formatINR(Math.round(totalCGST))}</td>
                <td className="px-4 py-3 text-right text-brand-purple">{formatINR(Math.round(totalSGST))}</td>
                <td className="px-4 py-3 text-right text-brand-purple font-bold">{formatINR(Math.round(totalTax + totalTaxable))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: GST Rate Slab Breakdown
          ═══════════════════════════════════════════════════════ */}
      {tab === 'slabs' && (
        <div className="glass-card card-glow overflow-hidden fade-in-up" style={{ animationDelay: '0.8s' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">GST Rate</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Invoices</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Taxable Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">CGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">SGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {slabSummary.map(slab => (
                <tr key={slab.rate} className={cn(
                  'border-b border-gray-50-gray-800 table-row-hover',
                  slab.invoiceCount === 0 && 'opacity-40'
                )}>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-bold',
                      slab.rate === 0 ? 'bg-gray-100 text-gray-600-gray-800-gray-400' :
                      slab.rate === 5 ? 'bg-green-100 text-green-700-green-900/30-green-400' :
                      slab.rate === 12 ? 'bg-blue-100 text-blue-700-blue-900/30-blue-400' :
                      slab.rate === 18 ? 'bg-purple-100 text-purple-700-purple-900/30-purple-400' :
                      'bg-red-100 text-red-700-red-900/30-red-400'
                    )}>
                      {slab.rate}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{slab.invoiceCount}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(slab.taxable))}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(slab.cgst))}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(slab.sgst))}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900-white">{formatINR(Math.round(slab.total))}</td>
                </tr>
              ))}
              {/* Totals */}
              <tr className="bg-brand-purple/5-brand-purple/10 font-semibold">
                <td className="px-4 py-3 text-gray-900-white">All Slabs</td>
                <td className="px-4 py-3 text-center text-gray-900-white">{monthInvoices.length}</td>
                <td className="px-4 py-3 text-right text-gray-900-white">{formatINR(Math.round(slabSummary.reduce((s, r) => s + r.taxable, 0)))}</td>
                <td className="px-4 py-3 text-right text-brand-purple">{formatINR(Math.round(totalCGST))}</td>
                <td className="px-4 py-3 text-right text-brand-purple">{formatINR(Math.round(totalSGST))}</td>
                <td className="px-4 py-3 text-right text-brand-purple font-bold">{formatINR(Math.round(slabSummary.reduce((s, r) => s + r.total, 0)))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3: HSN Summary
          ═══════════════════════════════════════════════════════ */}
      {tab === 'hsn' && (
        <div className="glass-card card-glow overflow-hidden fade-in-up" style={{ animationDelay: '0.8s' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">HSN Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">GST %</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Qty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Taxable Value</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">CGST</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">SGST</th>
              </tr>
            </thead>
            <tbody>
              {hsnSummary.map(row => (
                <tr key={row.hsn} className="border-b border-gray-50-gray-800 table-row-hover">
                  <td className="px-4 py-3 font-mono text-xs text-brand-purple font-semibold">{row.hsn}</td>
                  <td className="px-4 py-3 text-gray-700-gray-300 text-xs">{row.desc}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs px-2 py-0.5 rounded bg-gray-100-gray-800 text-gray-600-gray-400">{row.gstRate}%</span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(row.taxable))}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(row.cgst))}</td>
                  <td className="px-4 py-3 text-right text-gray-700-gray-300">{formatINR(Math.round(row.sgst))}</td>
                </tr>
              ))}
              {hsnSummary.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No data for {months[month]} {year}</td></tr>
              )}
              {hsnSummary.length > 0 && (
                <tr className="bg-brand-purple/5-brand-purple/10 font-semibold">
                  <td className="px-4 py-3 text-gray-900-white" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-center text-gray-900-white">{hsnSummary.reduce((s, r) => s + r.qty, 0)}</td>
                  <td className="px-4 py-3 text-right text-gray-900-white">{formatINR(Math.round(hsnSummary.reduce((s, r) => s + r.taxable, 0)))}</td>
                  <td className="px-4 py-3 text-right text-brand-purple">{formatINR(Math.round(hsnSummary.reduce((s, r) => s + r.cgst, 0)))}</td>
                  <td className="px-4 py-3 text-right text-brand-purple">{formatINR(Math.round(hsnSummary.reduce((s, r) => s + r.sgst, 0)))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Action Buttons ────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 fade-in-up" style={{ animationDelay: '0.9s' }} data-print-hide>
        <button onClick={handleWhatsAppCA} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-gray-900 text-sm font-medium hover:scale-105 hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all">
          <MessageCircle size={16} /> {language === 'hi' ? 'CA ko WhatsApp Bhejo' : 'WhatsApp to CA'}
        </button>
        <button onClick={handlePrintPDF} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-brand-purple to-purple-600 text-gray-900 text-sm font-medium hover:scale-105 hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all">
          <Printer size={16} /> {language === 'hi' ? 'PDF Download Karo' : 'Download PDF'}
        </button>
        <button onClick={handleDownloadJSON} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 border border-brand-purple/30 text-brand-purple-purple-300 text-sm font-medium hover:bg-brand-purple/10 transition-all">
          <FileDown size={16} /> Download GSTR-1 JSON
        </button>
      </div>

      {/* ── Tax Liability Summary (always visible) ────────── */}
      <div className="glass-card card-glow p-6 fade-in-up" style={{ animationDelay: '1.0s' }}>
        <h2 className="text-gray-900 font-heading text-section-heading-white mb-4">
          {language === 'hi' ? 'Tax Liability Summary' : 'Tax Liability Summary'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-blue-50-blue-900/10 border border-blue-100-blue-900/30">
            <div className="text-xs text-blue-600-blue-400 mb-1">CGST Payable</div>
            <div className="text-2xl font-bold font-heading text-blue-700-blue-300">{formatINR(Math.round(totalCGST))}</div>
          </div>
          <div className="p-4 rounded-xl bg-green-50-green-900/10 border border-green-100-green-900/30">
            <div className="text-xs text-green-600-green-400 mb-1">SGST Payable</div>
            <div className="text-2xl font-bold font-heading text-green-700-green-300">{formatINR(Math.round(totalSGST))}</div>
          </div>
          <div className="p-4 rounded-xl bg-gradient-to-br from-brand-purple/10 to-purple-100/50-brand-purple/20-purple-900/10 border border-brand-purple/20">
            <div className="text-xs text-brand-purple mb-1">Total Tax Liability</div>
            <div className="text-2xl font-bold font-heading text-brand-purple">{formatINR(Math.round(totalTax))}</div>
          </div>
        </div>
      </div>
      <div className='made-in-india text-center text-sm py-4 text-gray-500'>Made with ❤️ in Jabalpur, India 🇮🇳</div>
    </div>
  );
}
