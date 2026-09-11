import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn, whatsappLink } from '../lib/formatters';
import { subscribeInvoices, subscribePayments, recordPayment } from '../lib/firestoreService';
import type { Invoice, Payment } from '../types/firestore';
import { Search, MessageCircle, Plus, X, CreditCard, Smartphone, Banknote } from 'lucide-react';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

export default function Payments() {
  const { tenantId } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const [tab, setTab] = useState<'recent' | 'outstanding'>('recent');
  const [search, setSearch] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<Payment['paymentMethod']>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Firestore state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeInvoices(tenantId, setInvoices, 200);
    const unsub2 = subscribePayments(tenantId, (data) => {
      setPayments(data);
      setLoading(false);
      setLoaded(true);
    });
    return () => { unsub1(); unsub2(); };
  }, [tenantId]);

  // Recent payments derived from payments collection
  const recentPayments = useMemo(() =>
    payments.filter(p => {
      if (!search) return true;
      const inv = invoices.find(i => i.id === p.invoiceId);
      return inv?.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        inv?.invoiceNumber?.includes(search) || false;
    }).slice(0, 20)
  , [payments, invoices, search]);

  // Outstanding invoices
  const outstandingInvoices = useMemo(() => {
    const filtered = invoices.filter(inv => inv.amountPending > 0).filter(inv => {
      if (!search) return true;
      return inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNumber.includes(search);
    });
    return filtered.sort((a, b) => {
      const aDate = a.invoiceDate?.toDate?.() || new Date();
      const bDate = b.invoiceDate?.toDate?.() || new Date();
      return aDate.getTime() - bDate.getTime();
    });
  }, [invoices, search]);

  const totalOutstanding = outstandingInvoices.reduce((s, inv) => s + inv.amountPending, 0);

  const openRecordPayment = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setPayAmount(String(inv.amountPending));
    setPayMethod('cash');
    setPayNotes('');
    setShowRecordModal(true);
  };

  const handleRecordPayment = async () => {
    if (!tenantId || !selectedInvoice || !payAmount) return;
    const amount = Number(payAmount);
    if (amount <= 0) {
      showToast('Amount 0 se zyada hona chahiye', 'error');
      return;
    }
    if (amount > selectedInvoice.amountPending) {
      showToast(`₹${amount} zyada hai! Pending sirf ₹${selectedInvoice.amountPending} hai.`, 'error');
      return;
    }
    setSaving(true);
    try {
      await recordPayment(
        tenantId, selectedInvoice.id, amount,
        payMethod, payNotes, tenantId
      );
      setShowRecordModal(false);
      showToast(' Payment record ho gaya!', 'success');
    } catch (err) {
      showToast('Payment record nahi hua. Dobara try karo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemind = (phone: string, name: string, amount: number, invoiceId: string) => {
    const msg = language === 'hi'
      ? ` Namaste ${name}!\n\nAapka ${invoiceId} pe ₹${amount} baaki hai. Jaldi se jaldi bhugtan kar dein.\n\nDhanyavaad! `
      : `Hello ${name},\n\nA friendly reminder that ₹${amount} is pending for ${invoiceId}.\n\nThank you! `;
    window.open(whatsappLink(phone, msg), '_blank');
  };

  const getInvoiceForPayment = (p: Payment) => invoices.find(i => i.id === p.invoiceId);

  if (loading) return <PageSkeleton />;

  if (loaded && payments.length === 0) {
    return (
      <EmptyState
        icon=""
        title="Koi payment record nahi hai"
        subtitle="Billing se payment automatically track hoga"
      />
    );
  }

  return (
    <div className="">
      

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            {t('payments')} 
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{language === 'hi' ? 'Apne len-den aur bakaaya rashi manage karein' : 'Manage your transactions and outstandings'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Outstanding</span>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatINR(totalOutstanding)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-4">
        {(["recent", "outstanding"] as const).map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className={cn("pb-2 text-sm font-medium border-b-2 transition-colors",
              tab === t2 ? "border-brand-purple text-brand-purple" : "border-transparent text-gray-500 hover:text-gray-700")}>
            {t2 === 'recent' ? (language === 'hi' ? 'Haal ka Bhugtan' : 'Recent Payments') : (language === 'hi' ? 'Baaki Rashi' : 'Outstanding')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'hi' ? 'Naam ya Invoice ID se dhundho...' : 'Search by name or invoice...'}
          className="w-full pl-10 pr-4 py-2.5 rounded-md border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple transition-all" />
      </div>

      {tab === 'recent' && (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Invoice</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Customer</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Amount</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Method</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p) => {
                const inv = getInvoiceForPayment(p);
                return (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50 " >
                    <td className="px-3 py-2 font-medium text-brand-purple font-mono text-xs">{inv?.invoiceNumber || p.invoiceId.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-gray-700">{inv?.customerName || '—'}</td>
                    <td className="px-3 py-2 text-right font-bold text-brand-green">{formatINR(p.amount)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('capitalize px-2 py-1 rounded-full text-xs font-medium', 
                        p.paymentMethod === 'cash' ? 'bg-green-100 text-green-700' : 
                        p.paymentMethod === 'upi' ? 'bg-blue-100 text-blue-700' : 
                        'bg-purple-100 text-purple-700'
                      )}>{p.paymentMethod}</span>
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">
                      {p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('en-IN') : ''}
                    </td>
                  </tr>
                );
              })}
              {recentPayments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No payments recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'outstanding' && (
        <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Invoice</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-900 uppercase tracking-wide">Customer</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-gray-900 uppercase tracking-wide">Amount Due</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Date</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-900 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outstandingInvoices.map((inv) => {
                const daysSince = Math.floor((Date.now() - (inv.invoiceDate?.toDate?.()?.getTime() || Date.now())) / 86400000);
                const colorClass = daysSince > 30 ? 'text-red-500 bg-red-500/10' : daysSince > 7 ? 'text-amber-500 bg-amber-500/10' : 'text-gray-500';
                
                return (
                  <tr key={inv.id} className={`border-b border-gray-100 hover:bg-gray-50 `} >
                    <td className="px-3 py-2 font-medium text-brand-purple font-mono text-xs">{inv.invoiceNumber}</td>
                    <td className="px-3 py-2">
                      <div className="text-gray-700">{inv.customerName}</div>
                      <div className="text-xs text-gray-500">{inv.customerPhone}</div>
                    </td>
                    <td className={`px-3 py-2 text-right font-bold ${colorClass.split(' ')[0]} ${colorClass.includes('bg') ? colorClass.split(' ')[1] : ''}`}>{formatINR(inv.amountPending)}</td>
                    <td className="px-3 py-2 text-center text-gray-500 text-xs">
                      {inv.invoiceDate ? new Date(inv.invoiceDate.seconds * 1000).toLocaleDateString('en-IN') : ''}
                    </td>
                    <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openRecordPayment(inv)}
                        className="px-3 py-1.5 rounded-md bg-brand-purple/10 text-brand-purple text-xs font-medium hover:bg-brand-purple/20 transition-colors">
                        <Plus size={12} className="inline mr-1" />Record
                      </button>
                      {inv.customerPhone && (
                        <button onClick={() => handleRemind(inv.customerPhone, inv.customerName, inv.amountPending, inv.invoiceNumber)}
                          className="p-1.5 rounded-md hover:bg-green-50 text-gray-500 hover:text-green-600 transition-colors" title="Remind via WhatsApp">
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
              })}
              {outstandingInvoices.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-green font-medium"> No outstanding payments!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ">
          <div className="bg-white rounded-md p-3 w-full max-w-sm mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-gray-900">{language === 'hi' ? 'Bhugtan Darj Karein' : 'Record Payment'}</h3>
              <button onClick={() => setShowRecordModal(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">{selectedInvoice.invoiceNumber} · {selectedInvoice.customerName} · Due: {formatINR(selectedInvoice.amountPending)}</p>
            <div className="space-y-3">
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder="Amount" className="w-full px-4 py-2.5 rounded-md border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple" />
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'cash' as const, icon: Banknote, label: 'Cash' },
                  { id: 'upi' as const, icon: Smartphone, label: 'UPI' },
                  { id: 'card' as const, icon: CreditCard, label: 'Card' },
                ]).map(m => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)}
                    className={cn('flex flex-col items-center gap-1 py-2 rounded-md border text-xs font-medium transition-all',
                      payMethod === m.id ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-200 text-gray-500')}>
                    <m.icon size={16} />{m.label}
                  </button>
                ))}
              </div>
              <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2}
                placeholder="Notes..." className="w-full px-4 py-2.5 rounded-md border border-gray-200 bg-white text-sm outline-none focus:border-brand-purple resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowRecordModal(false)} className="flex-1 py-2.5 rounded-md border border-gray-200 text-sm">{t('cancel')}</button>
                <button onClick={handleRecordPayment} disabled={saving || !payAmount}
                  className={cn('flex-1 btn-primary justify-center py-2.5 text-sm', (saving || !payAmount) && 'opacity-50')}>
                  {saving ? 'Saving...' : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="made-in-india mt-8 text-center text-sm text-gray-500">Made with  in Jabalpur, India </div>
    </div>
  );
}
