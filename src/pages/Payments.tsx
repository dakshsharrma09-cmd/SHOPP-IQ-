import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn, whatsappLink } from '../lib/formatters';
import { subscribeInvoices, subscribePayments, recordPayment } from '../lib/firestoreService';
import type { Invoice, Payment } from '../types/firestore';
import { Search, MessageCircle, Plus, X, CreditCard, Smartphone, Banknote } from 'lucide-react';

export default function Payments() {
  const { tenantId } = useAuth();
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<'recent' | 'outstanding'>('recent');
  const [search, setSearch] = useState('');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<Payment['paymentMethod']>('cash');
  const [payNotes, setPayNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Firestore state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeInvoices(tenantId, setInvoices, 200);
    const unsub2 = subscribePayments(tenantId, setPayments);
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
  const outstandingInvoices = useMemo(() =>
    invoices.filter(inv => inv.amountPending > 0).filter(inv => {
      if (!search) return true;
      return inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inv.invoiceNumber.includes(search);
    })
  , [invoices, search]);

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
    if (amount > selectedInvoice.amountPending) {
      alert(`Amount ₹${amount} exceeds pending ₹${selectedInvoice.amountPending}`);
      return;
    }
    setSaving(true);
    try {
      await recordPayment(
        tenantId, selectedInvoice.id, amount,
        payMethod, payNotes, tenantId
      );
      setShowRecordModal(false);
    } catch (err) {
      console.error('Payment failed:', err);
      alert('Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const handleRemind = (phone: string, name: string, amount: number, invoiceId: string) => {
    const msg = language === 'hi'
      ? `🙏 Namaste ${name}!\n\nAapka ${invoiceId} pe ₹${amount} baaki hai. Jaldi se jaldi bhugtan kar dein.\n\nDhanyavaad! 🙏`
      : `Hello ${name},\n\nA friendly reminder that ₹${amount} is pending for ${invoiceId}.\n\nThank you! 🙏`;
    window.open(whatsappLink(phone, msg), '_blank');
  };

  const getInvoiceForPayment = (p: Payment) => invoices.find(i => i.id === p.invoiceId);

  return (
    <div className="animate-fade-in">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-6 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #065f46, #4c1d95)' }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-1 flex items-center gap-2">
            {t('payments')} 💰
          </h1>
          <p className="text-green-200 text-sm">{language === 'hi' ? 'Apne len-den aur bakaaya rashi manage karein' : 'Manage your transactions and outstandings'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 px-5 py-3 rounded-xl">
            <span className="text-xs text-green-100 uppercase tracking-wider font-medium">Total Outstanding</span>
            <div className="text-xl font-bold font-heading text-white mt-1">{formatINR(totalOutstanding)}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-4">
        {(['recent', 'outstanding'] as const).map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t2 ? 'bg-white dark:bg-brand-dark-card text-brand-purple shadow' : 'text-gray-500')}>
            {t2 === 'recent' ? (language === 'hi' ? 'Haal ka Bhugtan' : 'Recent Payments') : (language === 'hi' ? 'Baaki Rashi' : 'Outstanding')}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'hi' ? 'Naam ya Invoice ID se dhundho...' : 'Search by name or invoice...'}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand-dark-border bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple transition-all" />
      </div>

      {tab === 'recent' && (
        <div className="glass-card card-glow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p, index) => {
                const inv = getInvoiceForPayment(p);
                return (
                  <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800 table-row-hover fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="px-4 py-3 font-medium text-brand-purple font-mono text-xs">{inv?.invoiceNumber || p.invoiceId.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{inv?.customerName || '—'}</td>
                    <td className="px-4 py-3 text-right font-bold text-brand-green">{formatINR(p.amount)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={cn('capitalize px-2 py-1 rounded-full text-xs font-medium', 
                        p.paymentMethod === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                        p.paymentMethod === 'upi' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 
                        'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      )}>{p.paymentMethod}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {p.createdAt ? new Date(p.createdAt.seconds * 1000).toLocaleDateString('en-IN') : ''}
                    </td>
                  </tr>
                );
              })}
              {recentPayments.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No payments recorded yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'outstanding' && (
        <div className="glass-card card-glow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount Due</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {outstandingInvoices.map((inv, index) => (
                <tr key={inv.id} className="border-b border-gray-50 dark:border-gray-800 table-row-hover fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                  <td className="px-4 py-3 font-medium text-brand-purple font-mono text-xs">{inv.invoiceNumber}</td>
                  <td className="px-4 py-3">
                    <div className="text-gray-700 dark:text-gray-300">{inv.customerName}</div>
                    <div className="text-xs text-gray-400">{inv.customerPhone}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-red-500">{formatINR(inv.amountPending)}</td>
                  <td className="px-4 py-3 text-center text-gray-400 text-xs">
                    {inv.invoiceDate ? new Date(inv.invoiceDate.seconds * 1000).toLocaleDateString('en-IN') : ''}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openRecordPayment(inv)}
                        className="px-3 py-1.5 rounded-lg bg-brand-purple/10 text-brand-purple text-xs font-medium hover:bg-brand-purple/20 transition-colors">
                        <Plus size={12} className="inline mr-1" />Record
                      </button>
                      {inv.customerPhone && (
                        <button onClick={() => handleRemind(inv.customerPhone, inv.customerName, inv.amountPending, inv.invoiceNumber)}
                          className="p-1.5 rounded-lg hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" title="Remind via WhatsApp">
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {outstandingInvoices.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-green font-medium">✅ No outstanding payments!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Record Payment Modal */}
      {showRecordModal && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 w-full max-w-sm mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-gray-900 dark:text-white">{language === 'hi' ? 'Bhugtan Darj Karein' : 'Record Payment'}</h3>
              <button onClick={() => setShowRecordModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">{selectedInvoice.invoiceNumber} · {selectedInvoice.customerName} · Due: {formatINR(selectedInvoice.amountPending)}</p>
            <div className="space-y-3">
              <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                placeholder="Amount" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'cash' as const, icon: Banknote, label: 'Cash' },
                  { id: 'upi' as const, icon: Smartphone, label: 'UPI' },
                  { id: 'card' as const, icon: CreditCard, label: 'Card' },
                ]).map(m => (
                  <button key={m.id} onClick={() => setPayMethod(m.id)}
                    className={cn('flex flex-col items-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all',
                      payMethod === m.id ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-200 dark:border-gray-700 text-gray-400')}>
                    <m.icon size={16} />{m.label}
                  </button>
                ))}
              </div>
              <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2}
                placeholder="Notes..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowRecordModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">{t('cancel')}</button>
                <button onClick={handleRecordPayment} disabled={saving || !payAmount}
                  className={cn('flex-1 btn-primary justify-center py-2.5 text-sm', (saving || !payAmount) && 'opacity-50')}>
                  {saving ? 'Saving...' : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
