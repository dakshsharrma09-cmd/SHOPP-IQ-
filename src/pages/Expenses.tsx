import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn } from '../lib/formatters';
import { subscribeExpenses, addExpense, deleteExpense } from '../lib/firestoreService';
import type { Expense } from '../types/firestore';
import { Plus, X, Trash2, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Timestamp } from 'firebase/firestore';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const CATEGORIES = ['Rent', 'Salary', 'Electricity', 'Transport', 'Raw Material', 'Maintenance', 'Marketing', 'Other'];
const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer'];
const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];

export default function Expenses() {
  const { tenantId } = useAuth();
  const { language } = useLanguage();
  const { showToast } = useToast();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  
  // Form State
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const unsub = subscribeExpenses(tenantId, (data) => {
      setExpenses(data);
      setLoading(false);
      setLoaded(true);
    });
    return () => unsub();
  }, [tenantId]);

  const handleAddExpense = async () => {
    if (!tenantId || !amount || !description) return;
    setSaving(true);
    try {
      await addExpense(tenantId, {
        categoryName: category,
        amount: Number(amount),
        description,
        expenseDate: Timestamp.fromDate(new Date(date)),
        paymentMethod: method,
        recordedBy: tenantId,
      });
      setShowAddModal(false);
      setAmount('');
      setDescription('');
      showToast('✅ Expense add ho gaya!', 'success');
    } catch (error) {
      showToast('Expense add nahi hua.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!tenantId) return;
    if (confirm(language === 'hi' ? 'क्या आप सच में इसे मिटाना चाहते हैं?' : 'Are you sure you want to delete this?')) {
      try {
        await deleteExpense(tenantId, id);
        showToast('Expense delete ho gaya.', 'info');
      } catch (error) {
        showToast('Expense delete nahi hua.', 'error');
      }
    }
  };

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => 
      exp.description.toLowerCase().includes(search.toLowerCase()) || 
      exp.categoryName.toLowerCase().includes(search.toLowerCase())
    );
  }, [expenses, search]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const daysPassed = now.getDate();
    
    let total = 0;
    let thisMonth = 0;
    
    expenses.forEach(exp => {
      total += exp.amount;
      const expDate = exp.expenseDate.toDate();
      if (expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear) {
        thisMonth += exp.amount;
      }
    });
    
    return {
      total,
      thisMonth,
      avgDaily: thisMonth / (daysPassed || 1)
    };
  }, [expenses]);

  const chartData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(exp => {
      categoryTotals[exp.categoryName] = (categoryTotals[exp.categoryName] || 0) + exp.amount;
    });
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  if (loading) return <PageSkeleton />;

  if (loaded && expenses.length === 0) {
    return (
      <EmptyState
        icon="💸"
        title="Koi expense nahi hai"
        subtitle="Apna pehla kharcha add karo!"
        actionLabel="+ Expense Add Karo"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-6 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #7f1d1d, #4c1d95)' }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-1 flex items-center gap-2">
            Expenses 💸
          </h1>
          <p className="text-red-200 text-sm">{language === 'hi' ? 'खर्चे ट्रैक करो' : 'Track your expenses'}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors text-white px-4 py-2.5 rounded-xl font-medium shadow-sm backdrop-blur-sm border border-white/10">
          <Plus size={18} /> {language === 'hi' ? 'खर्चा जोड़ें' : 'Add Expense'}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="glass-card card-glow p-5 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <div className="text-red-600 dark:text-red-400 text-sm font-semibold tracking-wide uppercase mb-1">Total Expenses</div>
          <div className="text-2xl font-bold font-heading">{formatINR(stats.total)}</div>
        </div>
        <div className="glass-card card-glow p-5 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <div className="text-amber-600 dark:text-amber-400 text-sm font-semibold tracking-wide uppercase mb-1">This Month</div>
          <div className="text-2xl font-bold font-heading">{formatINR(stats.thisMonth)}</div>
        </div>
        <div className="glass-card card-glow p-5 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="text-blue-600 dark:text-blue-400 text-sm font-semibold tracking-wide uppercase mb-1">Average Daily</div>
          <div className="text-2xl font-bold font-heading">{formatINR(stats.avgDaily)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main List */}
        <div className="lg:col-span-2">
          <div className="glass-card card-glow mb-4 p-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder={language === 'hi' ? 'खोजें...' : 'Search expenses...'}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand-dark-border bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple transition-all" />
            </div>
          </div>

          <div className="glass-card card-glow overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Description</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Method</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((exp, index) => (
                  <tr key={exp.id} className="border-b border-gray-50 dark:border-gray-800 table-row-hover fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="px-4 py-3 text-gray-500 text-xs">{exp.expenseDate.toDate().toLocaleDateString('en-IN')}</td>
                    <td className="px-4 py-3 font-medium text-brand-purple">{exp.categoryName}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{exp.description}</td>
                    <td className="px-4 py-3 text-right font-bold text-red-500">{formatINR(exp.amount)}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">{exp.paymentMethod}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => handleDelete(exp.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredExpenses.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">{language === 'hi' ? 'कोई खर्चे नहीं मिले' : 'No expenses found'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sidebar Chart */}
        <div>
          <div className="glass-card card-glow p-5">
            <h3 className="font-heading font-bold text-gray-900 dark:text-white mb-4">{language === 'hi' ? 'खर्चों का विवरण' : 'Expense Breakdown'}</h3>
            {chartData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#374151" opacity={0.2} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <Tooltip 
                      formatter={(value: any) => formatINR(value)}
                      contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: 'rgba(75, 85, 99, 0.4)', borderRadius: '8px', color: '#fff' }}
                    />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                      {chartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 w-full max-w-sm mx-4 animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-bold text-gray-900 dark:text-white">{language === 'hi' ? 'खर्चा जोड़ें' : 'Add Expense'}</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{language === 'hi' ? 'श्रेणी' : 'Category'}</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{language === 'hi' ? 'रकम' : 'Amount'}</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{language === 'hi' ? 'विवरण' : 'Description'}</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{language === 'hi' ? 'तारीख' : 'Date'}</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{language === 'hi' ? 'भुगतान का तरीका' : 'Payment Method'}</label>
                <select value={method} onChange={e => setMethod(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
                  {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300">{language === 'hi' ? 'रद्द करें' : 'Cancel'}</button>
                <button onClick={handleAddExpense} disabled={saving || !amount || !description} className={cn('flex-1 btn-primary justify-center py-2.5 text-sm', (saving || !amount || !description) && 'opacity-50')}>
                  {saving ? (language === 'hi' ? 'सेव हो रहा है...' : 'Saving...') : (language === 'hi' ? 'सेव करें' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
