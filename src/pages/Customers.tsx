import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn, whatsappLink } from '../lib/formatters';
import { subscribeCustomers, subscribeInvoices, addCustomer, updateCustomer } from '../lib/firestoreService';
import type { Customer, Invoice } from '../types/firestore';
import { Search, Plus, X, FileText, CreditCard, MessageCircle, Pencil } from 'lucide-react';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const segments = ['all', 'vip', 'regular', 'new', 'at_risk'] as const;
const segmentLabels: Record<string, { en: string; hi: string }> = {
  all: { en: 'All', hi: 'Sab' }, vip: { en: 'VIP ⭐', hi: 'VIP ⭐' },
  regular: { en: 'Regular', hi: 'Niyamit' }, new: { en: 'New', hi: 'Naye' },
  at_risk: { en: 'At Risk', hi: 'Khatare mein' },
};

export default function Customers() {
  const { tenantId } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [segment, setSegment] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [profileTab, setProfileTab] = useState<'purchases' | 'loyalty' | 'notes'>('purchases');
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newCust, setNewCust] = useState({ fullName: '', phoneNumber: '', city: '', creditLimit: 5000 });
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editForm, setEditForm] = useState({ fullName: '', phoneNumber: '', city: '', creditLimit: 0 });
  const [customerNotes, setCustomerNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Firestore state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeCustomers(tenantId, (data) => {
      setCustomers(data);
      setLoading(false);
      setLoaded(true);
    });
    const unsub2 = subscribeInvoices(tenantId, setInvoices, 200);
    return () => { unsub1(); unsub2(); };
  }, [tenantId]);

  const filtered = customers.filter(c => {
    const matchSearch = c.fullName.toLowerCase().includes(search.toLowerCase()) || c.phoneNumber.includes(search);
    const matchSegment = segment === 'all' || c.customerSegment === segment;
    return matchSearch && matchSegment;
  });

  const segmentBadge = (s: string) => {
    const map: Record<string, string> = { vip: 'badge-purple', regular: 'badge-blue', new: 'badge-green', at_risk: 'badge-red' };
    return <span className={map[s] || 'badge-blue'}>{s.replace('_', ' ')}</span>;
  };

  const customerInvoices = (customerId: string) =>
    invoices.filter(inv => inv.customerId === customerId);

  const handleAddCustomer = async () => {
    if (!tenantId || !newCust.fullName || !newCust.phoneNumber) return;
    setSaving(true);
    try {
      await addCustomer(tenantId, {
        fullName: newCust.fullName,
        phoneNumber: newCust.phoneNumber,
        city: newCust.city,
        creditLimit: newCust.creditLimit,
        isActive: true,
      });
      setShowAddModal(false);
      setNewCust({ fullName: '', phoneNumber: '', city: '', creditLimit: 5000 });
      showToast('✅ Naya customer add ho gaya!', 'success');
    } catch (err) {
      showToast('Customer add nahi hua. Dobara try karo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const msg = language === 'hi'
      ? `Namaste! Aapka ShoppIQ account update hua hai. 🙏`
      : `Hello! Your ShoppIQ account has been updated. 🙏`;
    window.open(whatsappLink(phone, msg), '_blank');
  };

  const startEditCustomer = () => {
    if (!selectedCustomer) return;
    setEditForm({
      fullName: selectedCustomer.fullName,
      phoneNumber: selectedCustomer.phoneNumber,
      city: selectedCustomer.city || '',
      creditLimit: selectedCustomer.creditLimit || 5000,
    });
    setEditingCustomer(true);
  };

  const handleUpdateCustomer = async () => {
    if (!tenantId || !selectedCustomer) return;
    setSaving(true);
    try {
      await updateCustomer(tenantId, selectedCustomer.id, {
        fullName: editForm.fullName,
        phoneNumber: editForm.phoneNumber,
        city: editForm.city,
        creditLimit: editForm.creditLimit,
      });
      setEditingCustomer(false);
      // Update local selected customer to reflect changes
      setSelectedCustomer(prev => prev ? { ...prev, ...editForm } : null);
    } catch (err) {
      showToast('Customer update nahi hua.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (loaded && customers.length === 0) {
    return (
      <EmptyState
        icon="👥"
        title="Koi customer nahi hai"
        subtitle="Apna pehla customer add karo!"
        actionLabel="+ Customer Add Karo"
        onAction={() => setShowAddModal(true)}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      `}</style>

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-6 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #1e3a8a, #4c1d95)' }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-1 flex items-center gap-2">
            {t('customers')} 👥
          </h1>
          <p className="text-blue-200 text-sm">{language === 'hi' ? 'Apne grahakon aur unke khate manage karein' : 'Manage your customers and their accounts'}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-blue-900 hover:bg-gray-50 transition-all text-sm font-bold shadow-md w-fit">
          <Plus size={15} /> {language === 'hi' ? 'Naya Grahak' : 'New Customer'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="fade-in-up p-5 rounded-2xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', animationDelay: '0.1s' }}>
          <div className="text-purple-200 text-xs font-medium mb-1 uppercase tracking-wider">Total Customers</div>
          <div className="text-2xl font-bold font-heading">{customers.length}</div>
        </div>
        <div className="fade-in-up p-5 rounded-2xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #10B981, #065F46)', animationDelay: '0.2s' }}>
          <div className="text-green-200 text-xs font-medium mb-1 uppercase tracking-wider">Active (Regular)</div>
          <div className="text-2xl font-bold font-heading">{customers.filter(c => c.customerSegment === 'regular').length}</div>
        </div>
        <div className="fade-in-up p-5 rounded-2xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #EAB308, #854D0E)', animationDelay: '0.3s' }}>
          <div className="text-yellow-200 text-xs font-medium mb-1 uppercase tracking-wider">VIP Customers</div>
          <div className="text-2xl font-bold font-heading">{customers.filter(c => c.customerSegment === 'vip').length}</div>
        </div>
        <div className="fade-in-up p-5 rounded-2xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #3B82F6, #1E40AF)', animationDelay: '0.4s' }}>
          <div className="text-blue-200 text-xs font-medium mb-1 uppercase tracking-wider">New Customers</div>
          <div className="text-2xl font-bold font-heading">{customers.filter(c => c.customerSegment === 'new').length}</div>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-4 overflow-x-auto">
        {segments.map(s => (
          <button key={s} onClick={() => setSegment(s)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all',
              segment === s ? 'bg-white dark:bg-brand-dark-card text-brand-purple shadow' : 'text-gray-500')}>
            {language === 'hi' ? segmentLabels[s].hi : segmentLabels[s].en}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'hi' ? 'Naam ya phone se dhundho...' : 'Search by name or phone...'}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand-dark-border bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple transition-all" />
      </div>

      {/* Table */}
      <div className="glass-card card-glow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Phone</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Loyalty</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Total Spent</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Visits</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Segment</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Outstanding</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerNotes(c.notes || ''); setProfileTab('purchases'); }}
                  className="border-b border-gray-50 dark:border-gray-800 table-row-hover cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-purple to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                        {c.fullName.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{c.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.phoneNumber}</td>
                  <td className="px-4 py-3 text-center"><span className="text-brand-gold font-medium">🎁 {c.loyaltyPoints}</span></td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatINR(c.totalLifetimeValue)}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{c.visitCount}</td>
                  <td className="px-4 py-3 text-center">{segmentBadge(c.customerSegment)}</td>
                  <td className="px-4 py-3 text-right">
                    {c.currentOutstanding > 0 ? (
                      <span className="text-red-500 font-medium">{formatINR(c.currentOutstanding)}</span>
                    ) : <span className="text-brand-green">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Profile Slide-Over */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div className="slide-over overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-purple to-purple-400 flex items-center justify-center text-white text-xl font-bold">
                    {selectedCustomer.fullName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">{selectedCustomer.fullName}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-sm text-gray-400">{selectedCustomer.phoneNumber}</span>
                      {segmentBadge(selectedCustomer.customerSegment)}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* Edit button */}
              {!editingCustomer && (
                <button onClick={startEditCustomer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-purple border border-brand-purple/20 hover:bg-brand-purple/5 transition-all mb-4">
                  <Pencil size={12} /> Edit Customer
                </button>
              )}

              {/* Inline Edit Form */}
              {editingCustomer && (
                <div className="space-y-2 mb-4 p-4 rounded-xl bg-brand-purple/5 border border-brand-purple/10 animate-fade-in">
                  <input value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                    placeholder="Full Name" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
                  <input value={editForm.phoneNumber} onChange={e => setEditForm(p => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="Phone" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
                  <input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="City" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
                  <input type="number" value={editForm.creditLimit} onChange={e => setEditForm(p => ({ ...p, creditLimit: Number(e.target.value) }))}
                    placeholder="Credit Limit ₹" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCustomer(false)} className="flex-1 py-2 rounded-lg border border-gray-200 text-sm">Cancel</button>
                    <button onClick={handleUpdateCustomer} disabled={saving}
                      className={cn('flex-1 btn-primary justify-center py-2 text-sm', saving && 'opacity-50')}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {[
                  { label: 'Total Spent', value: formatINR(selectedCustomer.totalLifetimeValue), color: 'text-brand-purple' },
                  { label: 'Visits', value: selectedCustomer.visitCount, color: 'text-blue-500' },
                  { label: 'Loyalty Points', value: `🎁 ${selectedCustomer.loyaltyPoints}`, color: 'text-brand-gold' },
                  { label: 'Outstanding', value: formatINR(selectedCustomer.currentOutstanding), color: selectedCustomer.currentOutstanding > 0 ? 'text-red-500' : 'text-brand-green' },
                ].map(s => (
                  <div key={s.label} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-xs text-gray-400 mb-1">{s.label}</div>
                    <div className={cn('text-lg font-bold font-heading', s.color)}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Profile Tabs */}
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-4">
                {(['purchases', 'loyalty', 'notes'] as const).map(t2 => (
                  <button key={t2} onClick={() => setProfileTab(t2)}
                    className={cn('flex-1 px-3 py-2 rounded-lg text-sm font-medium capitalize transition-all',
                      profileTab === t2 ? 'bg-white dark:bg-brand-dark-card text-brand-purple shadow' : 'text-gray-500')}>
                    {t2}
                  </button>
                ))}
              </div>

              {profileTab === 'purchases' && (
                <div className="space-y-2 animate-fade-in">
                  {customerInvoices(selectedCustomer.id).length > 0 ? customerInvoices(selectedCustomer.id).slice(0, 10).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{inv.invoiceNumber}</div>
                        <div className="text-xs text-gray-400">{inv.invoiceDate ? new Date(inv.invoiceDate.seconds * 1000).toLocaleDateString('en-IN') : ''}</div>
                      </div>
                      <span className="font-bold text-brand-purple">{formatINR(inv.grandTotal)}</span>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-gray-400 text-sm">No purchases yet</div>
                  )}
                </div>
              )}

              {profileTab === 'loyalty' && (
                <div className="space-y-2 animate-fade-in">
                  <div className="text-center py-4">
                    <div className="text-3xl font-bold font-heading text-brand-gold mb-1">🎁 {selectedCustomer.loyaltyPoints}</div>
                    <div className="text-sm text-gray-400">Total loyalty points</div>
                  </div>
                </div>
              )}

              {profileTab === 'notes' && (
                <div className="animate-fade-in">
                  <textarea
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                    rows={4}
                    placeholder={language === 'hi' ? 'Customer ke baare mein notes likhen...' : 'Write notes about this customer...'}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark-card text-sm resize-none outline-none focus:border-brand-purple"
                  />
                  <button
                    onClick={async () => {
                      if (!tenantId || !selectedCustomer) return;
                      try {
                        await updateCustomer(tenantId, selectedCustomer.id, { notes: customerNotes });
                        setSelectedCustomer(prev => prev ? { ...prev, notes: customerNotes } : null);
                        showToast('✅ Notes save ho gaye!', 'success');
                      } catch (e) { showToast('Notes save nahi hua.', 'error'); }
                    }}
                    className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #7C3AED, #6D28D9)' }}>
                    💾 {language === 'hi' ? 'Notes सेव करो' : 'Save Notes'}
                  </button>
                  <p className="text-xs text-gray-400 mt-2">✅ {language === 'hi' ? 'Notes Firestore mein save hoti hain' : 'Notes are saved to cloud'}</p>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => { setSelectedCustomer(null); navigate('/billing/new'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <FileText size={16} /> New Invoice
                </button>
                <button
                  onClick={() => { setSelectedCustomer(null); navigate('/payments'); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
                  <CreditCard size={16} /> Payment
                </button>
                <button onClick={() => handleWhatsApp(selectedCustomer.phoneNumber)} className="flex-1 btn-whatsapp justify-center py-3 text-sm rounded-xl">
                  <MessageCircle size={16} /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 w-full max-w-sm mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-gray-900 dark:text-white">{language === 'hi' ? 'Naya Grahak' : 'New Customer'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-3">
              <input value={newCust.fullName} onChange={e => setNewCust(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Full Name" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              <input value={newCust.phoneNumber} onChange={e => setNewCust(p => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="Phone Number" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              <input value={newCust.city} onChange={e => setNewCust(p => ({ ...p, city: e.target.value }))}
                placeholder="City" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              <input type="number" value={newCust.creditLimit} onChange={e => setNewCust(p => ({ ...p, creditLimit: Number(e.target.value) }))}
                placeholder="Credit Limit ₹" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              <div className="flex gap-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">{t('cancel')}</button>
                <button onClick={handleAddCustomer} disabled={saving || !newCust.fullName}
                  className={cn('flex-1 btn-primary justify-center py-2.5 text-sm', (saving || !newCust.fullName) && 'opacity-50')}>
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
