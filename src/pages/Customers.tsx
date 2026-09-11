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
  all: { en: 'All', hi: 'Sab' }, vip: { en: 'VIP ', hi: 'VIP ' },
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
  const [newCust, setNewCust] = useState({ fullName: '', phoneNumber: '', city: '', email: '', address: '', creditLimit: 5000 });
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
        email: newCust.email,
        address: newCust.address,
        creditLimit: newCust.creditLimit,
        isActive: true,
      });
      setShowAddModal(false);
      setNewCust({ fullName: '', phoneNumber: '', city: '', email: '', address: '', creditLimit: 5000 });
      showToast(' Naya customer add ho gaya!', 'success');
    } catch (err) {
      showToast('Customer add nahi hua. Dobara try karo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleWhatsApp = (phone: string) => {
    const msg = language === 'hi'
      ? `Namaste! Aapka ShoppIQ account update hua hai. `
      : `Hello! Your ShoppIQ account has been updated. `;
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
        icon=""
        title="Koi customer nahi hai"
        subtitle="Apna pehla customer add karo!"
        actionLabel="+ Customer Add Karo"
        onAction={() => setShowAddModal(true)}
      />
    );
  }

  return (
    <div>
      {/* Header Banner */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{t('customers')}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{language === 'hi' ? 'Apne grahakon aur unke khate manage karein' : 'Manage your customers and their accounts'}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary text-sm px-3 py-1.5 rounded flex items-center gap-1">
          <Plus size={14} /> {language === 'hi' ? 'Naya Grahak' : 'New Customer'}
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="p-3 border border-gray-200 rounded-md bg-white">
          <div className="text-xs text-gray-500 mb-1">Total Customers</div>
          <div className="text-xl font-semibold text-gray-900">{customers.length}</div>
        </div>
        <div className="p-3 border border-gray-200 rounded-md bg-white">
          <div className="text-xs text-gray-500 mb-1">Active (Regular)</div>
          <div className="text-xl font-semibold text-gray-900">{customers.filter(c => c.customerSegment === 'regular').length}</div>
        </div>
        <div className="p-3 border border-gray-200 rounded-md bg-white">
          <div className="text-xs text-gray-500 mb-1">VIP Customers</div>
          <div className="text-xl font-semibold text-gray-900">{customers.filter(c => c.customerSegment === 'vip').length}</div>
        </div>
        <div className="p-3 border border-gray-200 rounded-md bg-white">
          <div className="text-xs text-gray-500 mb-1">New Customers</div>
          <div className="text-xl font-semibold text-gray-900">{customers.filter(c => c.customerSegment === 'new').length}</div>
        </div>
      </div>

      {/* Segment Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-4 overflow-x-auto">
        {segments.map(s => (
          <button key={s} onClick={() => setSegment(s)}
            className={cn('pb-2 text-sm font-medium whitespace-nowrap transition-colors',
              segment === s ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {language === 'hi' ? segmentLabels[s].hi : segmentLabels[s].en}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={language === 'hi' ? 'Naam ya phone se dhundho...' : 'Search by name or phone...'}
          className="w-full pl-8 pr-3 py-1.5 rounded text-sm border border-gray-200 bg-white outline-none focus:border-gray-400" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto border-t border-gray-200">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-3 py-2 font-medium text-gray-600">Customer</th>
              <th className="px-3 py-2 font-medium text-gray-600">Phone</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-center">Loyalty</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Total Spent</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-center">Visits</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-center">Segment</th>
              <th className="px-3 py-2 font-medium text-gray-600 text-right">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerNotes(c.notes || ''); setProfileTab('purchases'); }}
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-gray-100 flex items-center justify-center text-gray-600 text-xs font-medium">
                      {c.fullName.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900">{c.fullName}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-gray-500">{c.phoneNumber}</td>
                <td className="px-3 py-2 text-center text-gray-700">{c.loyaltyPoints}</td>
                <td className="px-3 py-2 text-right font-medium text-gray-900">{formatINR(c.totalLifetimeValue)}</td>
                <td className="px-3 py-2 text-center text-gray-500">{c.visitCount}</td>
                <td className="px-3 py-2 text-center">{segmentBadge(c.customerSegment)}</td>
                <td className="px-3 py-2 text-right">
                  {c.currentOutstanding > 0 ? (
                    <span className="text-red-500 font-medium">{formatINR(c.currentOutstanding)}</span>
                  ) : <span className="text-gray-500">—</span>}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-gray-500">No customers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Customer Profile Slide-Over */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setSelectedCustomer(null)} />
          <div className="relative w-full max-w-sm bg-white h-full overflow-y-auto border-l border-gray-200">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-600 text-lg font-medium">
                    {selectedCustomer.fullName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">{selectedCustomer.fullName}</h2>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{selectedCustomer.phoneNumber}</span>
                      {segmentBadge(selectedCustomer.customerSegment)}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-gray-500 hover:text-gray-700">
                  <X size={18} />
                </button>
              </div>

              {/* Edit button */}
              {!editingCustomer && (
                <button onClick={startEditCustomer}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 mb-4">
                  <Pencil size={12} /> Edit Customer
                </button>
              )}

              {/* Inline Edit Form */}
              {editingCustomer && (
                <div className="space-y-2 mb-4 p-3 rounded-md bg-gray-50 border border-gray-200">
                  <input value={editForm.fullName} onChange={e => setEditForm(p => ({ ...p, fullName: e.target.value }))}
                    placeholder="Full Name" className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
                  <input value={editForm.phoneNumber} onChange={e => setEditForm(p => ({ ...p, phoneNumber: e.target.value }))}
                    placeholder="Phone" className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
                  <input value={editForm.city} onChange={e => setEditForm(p => ({ ...p, city: e.target.value }))}
                    placeholder="City" className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
                  <input type="number" value={editForm.creditLimit} onChange={e => setEditForm(p => ({ ...p, creditLimit: Number(e.target.value) }))}
                    placeholder="Credit Limit ₹" className="w-full px-2 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
                  <div className="flex gap-2">
                    <button onClick={() => setEditingCustomer(false)} className="flex-1 py-1.5 rounded border border-gray-200 text-sm">Cancel</button>
                    <button onClick={handleUpdateCustomer} disabled={saving}
                      className={cn('flex-1 btn-primary py-1.5 text-sm rounded', saving && 'opacity-50')}>
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: 'Total Spent', value: formatINR(selectedCustomer.totalLifetimeValue) },
                  { label: 'Visits', value: selectedCustomer.visitCount },
                  { label: 'Loyalty Points', value: selectedCustomer.loyaltyPoints },
                  { label: 'Outstanding', value: formatINR(selectedCustomer.currentOutstanding), color: selectedCustomer.currentOutstanding > 0 ? 'text-red-500' : 'text-gray-900' },
                ].map(s => (
                  <div key={s.label} className="p-2 border border-gray-200 rounded-md">
                    <div className="text-xs text-gray-500 mb-0.5">{s.label}</div>
                    <div className={cn('text-sm font-semibold', s.color || 'text-gray-900')}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Profile Tabs */}
              <div className="flex gap-4 border-b border-gray-200 mb-3">
                {(['purchases', 'loyalty', 'notes'] as const).map(t2 => (
                  <button key={t2} onClick={() => setProfileTab(t2)}
                    className={cn('pb-1 text-sm font-medium capitalize',
                      profileTab === t2 ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-500')}>
                    {t2}
                  </button>
                ))}
              </div>

              {profileTab === 'purchases' && (
                <div className="space-y-2">
                  {customerInvoices(selectedCustomer.id).length > 0 ? customerInvoices(selectedCustomer.id).slice(0, 10).map(inv => (
                    <div key={inv.id} className="flex items-center justify-between p-2 border-b border-gray-100">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{inv.invoiceNumber}</div>
                        <div className="text-xs text-gray-500">{inv.invoiceDate ? new Date(inv.invoiceDate.seconds * 1000).toLocaleDateString('en-IN') : ''}</div>
                      </div>
                      <span className="font-semibold text-gray-900">{formatINR(inv.grandTotal)}</span>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-gray-500 text-sm">No purchases yet</div>
                  )}
                </div>
              )}

              {profileTab === 'loyalty' && (
                <div className="py-4 text-center">
                  <div className="text-xl font-semibold text-gray-900 mb-1">{selectedCustomer.loyaltyPoints}</div>
                  <div className="text-xs text-gray-500">Total loyalty points</div>
                </div>
              )}

              {profileTab === 'notes' && (
                <div>
                  <textarea
                    value={customerNotes}
                    onChange={e => setCustomerNotes(e.target.value)}
                    rows={4}
                    placeholder={language === 'hi' ? 'Customer ke baare mein notes likhen...' : 'Write notes about this customer...'}
                    className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm resize-none outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (!tenantId || !selectedCustomer) return;
                      try {
                        await updateCustomer(tenantId, selectedCustomer.id, { notes: customerNotes });
                        setSelectedCustomer(prev => prev ? { ...prev, notes: customerNotes } : null);
                        showToast('Notes saved!', 'success');
                      } catch (e) { showToast('Error saving notes.', 'error'); }
                    }}
                    className="mt-2 px-3 py-1.5 rounded text-sm font-medium border border-gray-200 hover:bg-gray-50">
                     {language === 'hi' ? 'Notes Save Karo' : 'Save Notes'}
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => { setSelectedCustomer(null); navigate('/billing/new'); }}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                  <FileText size={14} /> New Invoice
                </button>
                <div className="w-px bg-gray-200"></div>
                <button
                  onClick={() => { setSelectedCustomer(null); navigate('/payments'); }}
                  className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
                  <CreditCard size={14} /> Payment
                </button>
                <div className="w-px bg-gray-200"></div>
                <button onClick={() => handleWhatsApp(selectedCustomer.phoneNumber)} className="flex items-center gap-1 text-sm font-medium text-green-600 hover:text-green-700">
                  <MessageCircle size={14} /> WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-md p-4 w-full max-w-sm mx-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{language === 'hi' ? 'Naya Grahak' : 'New Customer'}</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              <input value={newCust.fullName} onChange={e => setNewCust(p => ({ ...p, fullName: e.target.value }))}
                placeholder="Full Name" className="w-full px-3 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
              <input value={newCust.phoneNumber} onChange={e => setNewCust(p => ({ ...p, phoneNumber: e.target.value }))}
                placeholder="Phone Number" className="w-full px-3 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
              <input value={newCust.city} onChange={e => setNewCust(p => ({ ...p, city: e.target.value }))}
                placeholder="City" className="w-full px-3 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
              <input type="email" value={newCust.email} onChange={e => setNewCust(p => ({ ...p, email: e.target.value }))}
                placeholder="Email (Optional)" className="w-full px-3 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
              <textarea value={newCust.address} onChange={e => setNewCust(p => ({ ...p, address: e.target.value }))}
                placeholder="Address (Optional)" rows={2} className="w-full px-3 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none resize-none" />
              <input type="number" value={newCust.creditLimit} onChange={e => setNewCust(p => ({ ...p, creditLimit: Number(e.target.value) }))}
                placeholder="Credit Limit ₹" className="w-full px-3 py-1.5 rounded border border-gray-200 bg-white text-sm outline-none" />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-1.5 rounded border border-gray-200 text-sm">{t('cancel')}</button>
                <button onClick={handleAddCustomer} disabled={saving || !newCust.fullName}
                  className={cn('flex-1 btn-primary py-1.5 text-sm rounded', (saving || !newCust.fullName) && 'opacity-50')}>
                  {saving ? 'Saving...' : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6 text-center text-xs text-gray-400">Made with in Jabalpur, India</div>
    </div>
  );
}
