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

  const monthInvoices = useMemo(() => invoices.filter(inv => {
    if (!inv.invoiceDate) return false;
    const d = inv.invoiceDate.toDate();
    return d.getMonth() === month && d.getFullYear() === year;
  }), [invoices, month, year]);

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

  const slabSummary = useMemo(() => {
    const slabMap: Record<number, { count: Set<string>; taxable: number; cgst: number; sgst: number }> = {};
    GST_SLABS.forEach(rate => {
      slabMap[rate] = { count: new Set(), taxable: 0, cgst: 0, sgst: 0 };
    });

    monthInvoices.forEach(inv => {
      inv.items.forEach(item => {
        const rate = GST_SLABS.reduce((prev, curr) =>
          Math.abs(curr - item.gstRate) < Math.abs(prev - item.gstRate) ? curr : prev
        , 0);
        const slab = slabMap[rate] || slabMap[0];
        slab.count.add(inv.id);
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

  const totalCGST = gstr1Summary.reduce((s, r) => s + r.cgst, 0);
  const totalSGST = gstr1Summary.reduce((s, r) => s + r.sgst, 0);
  const totalTax = totalCGST + totalSGST;
  const totalTaxable = gstr1Summary.reduce((s, r) => s + r.taxable, 0);

  const handlePrintPDF = () => {
    window.print();
  };

  const handleWhatsAppCA = () => {
    const businessName = tenant?.businessName || 'Meri Dukaan';
    const monthName = monthsFull[month];
    const msg = `Namaste CA sahab! ShoppIQ se ${businessName} ki ${monthName} ${year} ki GST Report ready hai. Total Tax: ${formatINR(Math.round(totalTax))}. GSTR-1 details attach kar raha hoon.`;
    window.open(whatsappLink('', msg), '_blank');
  };

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
    <div className="space-y-4" id="gst-report">
      <div className="print-header hidden">
        <div className="border-b border-gray-900 pb-2 mb-4">
          <h1 className="text-xl font-bold m-0">GSTR-1 Summary</h1>
          <p className="text-sm text-gray-500 m-0 mt-1">
            {tenant?.businessName || 'Business'} • GSTIN: {tenant?.gstin || 'N/A'} • Period: {monthsFull[month]} {year}
          </p>
          <p className="text-xs text-gray-400 m-0 mt-1">Generated by ShoppIQ on {new Date().toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2" data-print-hide>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{t('gst')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">जीएसटी रिपोर्ट</p>
        </div>
        <div className="flex gap-2">
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-brand-purple">
            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-md border border-gray-200 bg-white text-gray-900 text-sm outline-none focus:border-brand-purple">
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="border-b border-gray-200 pb-4 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-gray-900">{tenant?.businessName || 'Your Business'}</div>
          <div className="text-xs text-gray-500">GSTIN: <span className="font-mono text-gray-900">{tenant?.gstin || 'Not set — update in Settings'}</span></div>
        </div>
        <div className="text-xs text-gray-500">
          Period: <span className="font-medium text-gray-900">{monthsFull[month]} {year}</span>
          {' | '}B2B: <span className="font-medium text-gray-900">{b2bInvoices.length}</span>
          {' | '}B2C: <span className="font-medium text-gray-900">{b2cInvoices.length}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: 'Total Invoices', value: String(monthInvoices.length) },
          { label: 'Taxable Value', value: formatINR(Math.round(totalTaxable)) },
          { label: 'CGST', value: formatINR(Math.round(totalCGST)) },
          { label: 'SGST', value: formatINR(Math.round(totalSGST)) },
          { label: 'Total Tax', value: formatINR(Math.round(totalTax)) },
        ].map((s) => (
          <div key={s.label} className="p-3 border border-gray-200 rounded-md bg-white">
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className="text-xl font-semibold text-gray-900">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-4 border-b border-gray-200 mb-4" data-print-hide>
        {(['gstr1', 'slabs', 'hsn'] as const).map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className={cn('px-1 py-2 text-sm font-medium transition-all border-b-2',
              tab === t2 ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-500 hover:text-gray-900')}>
            {t2 === 'gstr1' ? 'GSTR-1 Summary' : t2 === 'slabs' ? 'Rate Slabs' : 'HSN Summary'}
          </button>
        ))}
      </div>

      {tab === 'gstr1' && (
        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-500 uppercase text-xs">
                <th className="px-4 py-3 text-left font-medium">Type</th>
                <th className="px-4 py-3 text-center font-medium">Invoices</th>
                <th className="px-4 py-3 text-right font-medium">Taxable Value</th>
                <th className="px-4 py-3 text-right font-medium">CGST</th>
                <th className="px-4 py-3 text-right font-medium">SGST</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {gstr1Summary.map(row => (
                <tr key={row.type} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{row.type}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.count}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(row.taxable))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(row.cgst))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(row.sgst))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatINR(Math.round(row.total))}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-4 py-3 text-gray-900">Total</td>
                <td className="px-4 py-3 text-center text-gray-900">{monthInvoices.length}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(totalTaxable))}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(totalCGST))}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(totalSGST))}</td>
                <td className="px-4 py-3 text-right text-gray-900 font-bold">{formatINR(Math.round(totalTax + totalTaxable))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === 'slabs' && (
        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-500 uppercase text-xs">
                <th className="px-4 py-3 text-left font-medium">GST Rate</th>
                <th className="px-4 py-3 text-center font-medium">Invoices</th>
                <th className="px-4 py-3 text-right font-medium">Taxable Value</th>
                <th className="px-4 py-3 text-right font-medium">CGST</th>
                <th className="px-4 py-3 text-right font-medium">SGST</th>
                <th className="px-4 py-3 text-right font-medium">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {slabSummary.map(slab => (
                <tr key={slab.rate} className={cn('border-b border-gray-100 hover:bg-gray-50', slab.invoiceCount === 0 && 'opacity-50')}>
                  <td className="px-4 py-3 text-gray-900">{slab.rate}%</td>
                  <td className="px-4 py-3 text-center text-gray-500">{slab.invoiceCount}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(slab.taxable))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(slab.cgst))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(slab.sgst))}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatINR(Math.round(slab.total))}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                <td className="px-4 py-3 text-gray-900">All Slabs</td>
                <td className="px-4 py-3 text-center text-gray-900">{monthInvoices.length}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(slabSummary.reduce((s, r) => s + r.taxable, 0)))}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(totalCGST))}</td>
                <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(totalSGST))}</td>
                <td className="px-4 py-3 text-right text-gray-900 font-bold">{formatINR(Math.round(slabSummary.reduce((s, r) => s + r.total, 0)))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {tab === 'hsn' && (
        <div className="bg-white border border-gray-200 rounded-md overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr className="text-gray-500 uppercase text-xs">
                <th className="px-4 py-3 text-left font-medium">HSN Code</th>
                <th className="px-4 py-3 text-left font-medium">Description</th>
                <th className="px-4 py-3 text-center font-medium">GST %</th>
                <th className="px-4 py-3 text-center font-medium">Qty</th>
                <th className="px-4 py-3 text-right font-medium">Taxable Value</th>
                <th className="px-4 py-3 text-right font-medium">CGST</th>
                <th className="px-4 py-3 text-right font-medium">SGST</th>
              </tr>
            </thead>
            <tbody>
              {hsnSummary.map(row => (
                <tr key={row.hsn} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900">{row.hsn}</td>
                  <td className="px-4 py-3 text-gray-900">{row.desc}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.gstRate}%</td>
                  <td className="px-4 py-3 text-center text-gray-500">{row.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(row.taxable))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(row.cgst))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(row.sgst))}</td>
                </tr>
              ))}
              {hsnSummary.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No data</td></tr>
              )}
              {hsnSummary.length > 0 && (
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td className="px-4 py-3 text-gray-900" colSpan={3}>Total</td>
                  <td className="px-4 py-3 text-center text-gray-900">{hsnSummary.reduce((s, r) => s + r.qty, 0)}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(hsnSummary.reduce((s, r) => s + r.taxable, 0)))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(hsnSummary.reduce((s, r) => s + r.cgst, 0)))}</td>
                  <td className="px-4 py-3 text-right text-gray-900">{formatINR(Math.round(hsnSummary.reduce((s, r) => s + r.sgst, 0)))}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex flex-wrap gap-4 mt-6" data-print-hide>
        <button onClick={handleWhatsAppCA} className="flex items-center gap-2 text-sm text-brand-purple hover:text-purple-700 font-medium">
          <MessageCircle size={16} /> {language === 'hi' ? 'CA ko WhatsApp Bhejo' : 'WhatsApp to CA'}
        </button>
        <button onClick={handlePrintPDF} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
          <Printer size={16} /> {language === 'hi' ? 'PDF Download Karo' : 'Download PDF'}
        </button>
        <button onClick={handleDownloadJSON} className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium">
          <FileDown size={16} /> Download GSTR-1 JSON
        </button>
      </div>

      <div className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          {language === 'hi' ? 'Tax Liability Summary' : 'Tax Liability Summary'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 border border-gray-200 rounded-md bg-white">
            <div className="text-xs text-gray-500 mb-1">CGST Payable</div>
            <div className="text-xl font-semibold text-gray-900">{formatINR(Math.round(totalCGST))}</div>
          </div>
          <div className="p-3 border border-gray-200 rounded-md bg-white">
            <div className="text-xs text-gray-500 mb-1">SGST Payable</div>
            <div className="text-xl font-semibold text-gray-900">{formatINR(Math.round(totalSGST))}</div>
          </div>
          <div className="p-3 border border-gray-200 rounded-md bg-white">
            <div className="text-xs text-gray-500 mb-1">Total Tax Liability</div>
            <div className="text-xl font-semibold text-gray-900">{formatINR(Math.round(totalTax))}</div>
          </div>
        </div>
      </div>
      <div className='text-center text-xs py-4 text-gray-500'>Made in India</div>
    </div>
  );
}
