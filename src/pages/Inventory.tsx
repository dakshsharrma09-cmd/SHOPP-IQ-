import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn } from '../lib/formatters';
import { useToast } from '../components/Toast';
import {
  subscribeProducts, subscribeCategories, subscribeStockMovements,
  addProduct, updateProduct, deleteProduct, adjustStock
} from '../lib/firestoreService';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Product, Category, StockMovement } from '../types/firestore';
import {
  Search, Plus, Upload, LayoutGrid, LayoutList, AlertTriangle, X,
  Pencil, Trash2, PlusCircle
} from 'lucide-react';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';

const defaultForm = {
  name: '', nameHindi: '', barcode: '', sku: '', hsnCode: '',
  categoryId: '', categoryName: '', unit: 'piece' as const,
  purchasePrice: 0, sellingPrice: 0, mrp: 0, gstRate: 0 as 0|5|12|18|28,
  isGstInclusive: false, currentStock: 0, minimumStockAlert: 10, reorderQuantity: 20,
  isActive: true,
};

export default function Inventory() {
  const { tenantId } = useAuth();
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<'products' | 'movements'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'normal'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'stock' | 'category'>('name');
  const [showSlideOver, setShowSlideOver] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);

  // Firestore state
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);

  // Form state
  const [form, setForm] = useState(defaultForm);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [stockAdjustType, setStockAdjustType] = useState<'add' | 'remove'>('add');
  const [stockAdjustQty, setStockAdjustQty] = useState(0);
  const [stockAdjustReason, setStockAdjustReason] = useState('purchase');
  const [stockAdjustNotes, setStockAdjustNotes] = useState('');

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeProducts(tenantId, (data) => {
      setProducts(data);
      setLoading(false);
      setLoaded(true);
    });
    const unsub2 = subscribeCategories(tenantId, setCategories);
    const unsub3 = subscribeStockMovements(tenantId, setStockMovements);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [tenantId]);

  const activeProducts = products.filter(p => p.isActive !== false);
  const lowStockCount = activeProducts.filter(p => p.currentStock <= p.minimumStockAlert).length;

  const filteredProducts = activeProducts.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (p.nameHindi || '').includes(searchQuery) ||
                        (p.barcode || '').includes(searchQuery) ||
                        (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
    const matchStock = stockFilter === 'all' ||
      (stockFilter === 'low' && p.currentStock <= p.minimumStockAlert && p.currentStock > 0) ||
      (stockFilter === 'out' && p.currentStock === 0) ||
      (stockFilter === 'normal' && p.currentStock > p.minimumStockAlert);
    return matchSearch && matchCategory && matchStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case 'name': return a.name.localeCompare(b.name);
      case 'price': return (b.sellingPrice || 0) - (a.sellingPrice || 0);
      case 'stock': return (a.currentStock || 0) - (b.currentStock || 0);
      case 'category': return (a.categoryName || '').localeCompare(b.categoryName || '');
      default: return 0;
    }
  });

  const getStockBadge = (stock: number, min: number) => {
    if (stock === 0) return <span className="badge-red">🔴 Out of Stock</span>;
    if (stock <= min) return <span className="badge-amber">🟡 Low Stock</span>;
    return <span className="badge-green">🟢 Normal</span>;
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setForm(defaultForm);
    setShowSlideOver(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setForm({
      name: p.name, nameHindi: p.nameHindi || '', barcode: p.barcode || '', sku: p.sku || '', hsnCode: p.hsnCode || '',
      categoryId: p.categoryId, categoryName: p.categoryName || '', unit: (p.unit as typeof defaultForm.unit) || 'piece',
      purchasePrice: p.purchasePrice, sellingPrice: p.sellingPrice, mrp: p.mrp, gstRate: p.gstRate,
      isGstInclusive: p.isGstInclusive, currentStock: p.currentStock, minimumStockAlert: p.minimumStockAlert,
      reorderQuantity: p.reorderQuantity, isActive: true,
    });
    setShowSlideOver(true);
  };

  const handleAddCategory = async () => {
    if (!tenantId || !newCategoryName.trim()) return;
    try {
      const catRef = doc(collection(db, 'tenants', tenantId, 'categories'));
      await setDoc(catRef, { 
        name: newCategoryName.trim(), 
        displayOrder: categories.length + 1, 
        isActive: true, 
        createdAt: Timestamp.now() 
      });
      setIsAddingCategory(false);
      setNewCategoryName('');
      setForm(prev => ({ ...prev, categoryId: catRef.id }));
      showToast('Category added', 'success');
    } catch (err) {
      showToast('Category add nahi hua', 'error');
    }
  };

  const handleSaveProduct = async () => {
    if (!tenantId || !form.name) return;
    setSaving(true);
    try {
      const catName = categories.find(c => c.id === form.categoryId)?.name || form.categoryName;
      const data = { ...form, categoryName: catName };
      if (editingProduct) {
        await updateProduct(tenantId, editingProduct.id, data);
      } else {
        await addProduct(tenantId, data as any);
      }
      setShowSlideOver(false);
    } catch (err) {
      showToast('Product save nahi hua. Dobara try karo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!tenantId) return;
    try {
      await deleteProduct(tenantId, productId);
      setShowDeleteConfirm(null);
    } catch (err) {
      showToast('Product delete nahi hua.', 'error');
    }
  };

  const handleStockAdjust = async () => {
    if (!tenantId || !stockProduct || stockAdjustQty <= 0) return;
    // Prevent negative stock
    if (stockAdjustType === 'remove' && stockAdjustQty > stockProduct.currentStock) {
      showToast(`${stockAdjustQty} units remove nahi ho sakte. Sirf ${stockProduct.currentStock} stock mein hai.`, 'error');
      return;
    }
    setSaving(true);
    try {
      const qty = stockAdjustType === 'add' ? stockAdjustQty : -stockAdjustQty;
      const movType = stockAdjustType === 'add'
        ? (stockAdjustReason === 'purchase' ? 'purchase' : 'adjustment_add')
        : (stockAdjustReason === 'damaged' ? 'damaged' : 'adjustment_remove');
      await adjustStock(tenantId, stockProduct.id, stockProduct.name, qty, movType as any, stockAdjustNotes, tenantId);
      setShowStockModal(false);
      setStockAdjustQty(0);
      setStockAdjustNotes('');
    } catch (err) {
      showToast('Stock adjust nahi hua.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (loaded && products.length === 0) {
    return (
      <EmptyState
        icon="📦"
        title="Koi product nahi hai"
        subtitle="Apna pehla product add karo!"
        actionLabel="+ Product Add Karo"
        onAction={() => setShowSlideOver(true)}
      />
    );
  }

  return (
    <div className="animate-fade-in">
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .fade-in-up { animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
      `}</style>

      {/* Low Stock Banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/30">
          <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
          <span className="text-sm text-amber-700 dark:text-amber-300 font-medium">
            ⚠️ {lowStockCount} products low stock mein hain.
          </span>
          <button onClick={() => setStockFilter('low')} className="ml-auto text-xs font-semibold text-amber-600 hover:underline">Dekhein →</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 p-6 rounded-2xl shadow-lg" style={{ background: 'linear-gradient(135deg, #4c1d95, #7c3aed)' }}>
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-white mb-1 flex items-center gap-2">
            {t('inventory')} 📦
          </h1>
          <p className="text-purple-200 text-sm">{language === 'hi' ? 'Apne stock aur products ko manage karein' : 'Manage your stock and products'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => showToast('Bulk import jaldi aa raha hai!', 'info')} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-white hover:bg-white/20 border border-white/20 backdrop-blur-sm transition-all text-sm font-medium">
            <Upload size={15} /> {t('bulkImport')}
          </button>
          <button onClick={openAddProduct}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-brand-purple hover:bg-gray-50 transition-all text-sm font-bold shadow-md">
            <Plus size={15} /> {language === 'hi' ? 'Product Jodein' : 'Add Product'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="fade-in-up p-5 rounded-2xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', animationDelay: '0.1s' }}>
          <div className="text-purple-200 text-xs font-medium mb-1 uppercase tracking-wider">Total Products</div>
          <div className="text-2xl font-bold font-heading">{products.length}</div>
        </div>
        <div className="fade-in-up p-5 rounded-2xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #EF4444, #991B1B)', animationDelay: '0.2s' }}>
          <div className="text-red-200 text-xs font-medium mb-1 uppercase tracking-wider">Low Stock</div>
          <div className="text-2xl font-bold font-heading">{lowStockCount}</div>
        </div>
        <div className="fade-in-up p-5 rounded-2xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #3B82F6, #1E40AF)', animationDelay: '0.3s' }}>
          <div className="text-blue-200 text-xs font-medium mb-1 uppercase tracking-wider">Categories</div>
          <div className="text-2xl font-bold font-heading">{categories.length}</div>
        </div>
        <div className="fade-in-up p-5 rounded-2xl shadow-lg text-white" style={{ background: 'linear-gradient(135deg, #10B981, #065F46)', animationDelay: '0.4s' }}>
          <div className="text-green-200 text-xs font-medium mb-1 uppercase tracking-wider">Total Value</div>
          <div className="text-2xl font-bold font-heading">{formatINR(products.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0))}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit mb-4">
        {(['products', 'movements'] as const).map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className={cn('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === t2 ? 'bg-white dark:bg-brand-dark-card text-brand-purple shadow' : 'text-gray-500')}>
            {t2 === 'products' ? t('products') : t('stockMovements')}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('search') + '...'} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand-dark-border bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple transition-all" />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
              <option value="all">{t('allProducts')}</option>
              <option value="low">{t('lowStockItems')}</option>
              <option value="out">{t('outOfStock')}</option>
              <option value="normal">{t('normalStock')}</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="stock">Sort by Stock</option>
              <option value="category">Sort by Category</option>
            </select>
            <div className="flex border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <button onClick={() => setViewMode('table')} className={cn('p-2.5', viewMode === 'table' ? 'bg-brand-purple text-white' : 'text-gray-400')}>
                <LayoutList size={16} />
              </button>
              <button onClick={() => setViewMode('grid')} className={cn('p-2.5', viewMode === 'grid' ? 'bg-brand-purple text-white' : 'text-gray-400')}>
                <LayoutGrid size={16} />
              </button>
            </div>
          </div>

          {/* Product Table */}
          {viewMode === 'table' ? (
            <div className="glass-card card-glow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Min</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Price</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">GST</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedProducts.map(p => (
                      <tr key={p.id} className="border-b border-gray-50 dark:border-gray-800 table-row-hover">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                          <div className="text-xs text-gray-400">{p.nameHindi}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{p.categoryName}</td>
                        <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-white">{p.currentStock}</td>
                        <td className="px-4 py-3 text-center text-gray-400">{p.minimumStockAlert}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{formatINR(p.sellingPrice)}</td>
                        <td className="px-4 py-3 text-center text-gray-400">{p.gstRate}%</td>
                        <td className="px-4 py-3 text-center">{getStockBadge(p.currentStock, p.minimumStockAlert)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => openEditProduct(p)}
                              className="p-1.5 rounded-lg hover:bg-brand-purple/10 text-gray-400 hover:text-brand-purple transition-colors" title="Edit">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => { setStockProduct(p); setShowStockModal(true); setStockAdjustQty(0); setStockAdjustNotes(''); }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-500 transition-colors" title="Adjust Stock">
                              <PlusCircle size={14} />
                            </button>
                            <button onClick={() => setShowDeleteConfirm(p.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {sortedProducts.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No products found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {sortedProducts.map(p => (
                <div key={p.id} className="glass-card card-glow p-4 hover:shadow-card-hover transition-all cursor-pointer group" onClick={() => openEditProduct(p)}>
                  <div className="w-full h-20 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <span className="text-2xl">📦</span>
                  </div>
                  <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate">{p.name}</h3>
                  <p className="text-xs text-gray-400 mb-2">{p.nameHindi}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-purple">{formatINR(p.sellingPrice)}</span>
                    {getStockBadge(p.currentStock, p.minimumStockAlert)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'movements' && (
        <div className="glass-card card-glow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Product</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Reference</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody>
              {stockMovements.map((m) => (
                <tr key={m.id} className={cn('border-b border-gray-50 dark:border-gray-800', m.quantity > 0 ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10')}>
                  <td className="px-4 py-3 text-gray-500">{m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleDateString('en-IN') : ''}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{m.productName}</td>
                  <td className="px-4 py-3 text-center capitalize"><span className={m.quantity > 0 ? 'badge-green' : 'badge-red'}>{m.movementType}</span></td>
                  <td className={cn('px-4 py-3 text-center font-bold', m.quantity > 0 ? 'text-brand-green' : 'text-red-500')}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs font-mono">{m.referenceId || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{m.notes || '—'}</td>
                </tr>
              ))}
              {stockMovements.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No stock movements yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-Over: Add/Edit Product */}
      {showSlideOver && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowSlideOver(false)} />
          <div className="slide-over p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-heading font-bold text-gray-900 dark:text-white">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => setShowSlideOver(false)} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Name (English)', placeholder: 'Product name', key: 'name' },
                { label: 'Name (Hindi)', placeholder: 'प्रोडक्ट का नाम', key: 'nameHindi' },
                { label: 'Barcode', placeholder: 'Scan or enter', key: 'barcode' },
                { label: 'SKU', placeholder: 'SKU code', key: 'sku' },
                { label: 'HSN Code', placeholder: 'HSN Code', key: 'hsnCode' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs text-gray-500 font-heading mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-500 font-heading mb-1">Category</label>
                {!isAddingCategory ? (
                  <select value={form.categoryId} onChange={e => {
                    if (e.target.value === 'ADD_NEW') setIsAddingCategory(true);
                    else setForm(prev => ({ ...prev, categoryId: e.target.value }));
                  }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="ADD_NEW" className="font-bold text-brand-purple">+ Add New Category</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="New category name" className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
                    <button onClick={handleAddCategory} className="px-3 py-2 bg-brand-purple text-white rounded-xl text-sm font-medium">Save</button>
                    <button onClick={() => setIsAddingCategory(false)} className="px-3 py-2 bg-gray-200 text-gray-700 rounded-xl text-sm font-medium">Cancel</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs text-gray-500 font-heading mb-1">Unit</label>
                <select value={form.unit} onChange={e => setForm(prev => ({ ...prev, unit: e.target.value as any }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
                  <option value="piece">Piece</option>
                  <option value="packet">Packet</option>
                  <option value="kg">KG</option>
                  <option value="gram">Gram</option>
                  <option value="litre">Litre</option>
                  <option value="ml">ML</option>
                  <option value="box">Box</option>
                  <option value="dozen">Dozen</option>
                  <option value="meter">Meter</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="block text-xs text-gray-500 font-heading mb-1">Purchase ₹</label>
                  <input type="number" value={form.purchasePrice || ''} onChange={e => setForm(prev => ({ ...prev, purchasePrice: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" /></div>
                <div><label className="block text-xs text-gray-500 font-heading mb-1">Selling ₹</label>
                  <input type="number" value={form.sellingPrice || ''} onChange={e => setForm(prev => ({ ...prev, sellingPrice: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" /></div>
                <div><label className="block text-xs text-gray-500 font-heading mb-1">MRP ₹</label>
                  <input type="number" value={form.mrp || ''} onChange={e => setForm(prev => ({ ...prev, mrp: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-500 font-heading mb-1">GST Rate</label>
                  <select value={form.gstRate} onChange={e => setForm(prev => ({ ...prev, gstRate: Number(e.target.value) as any }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
                    <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option>
                  </select></div>
                <div><label className="block text-xs text-gray-500 font-heading mb-1">Min Stock Alert</label>
                  <input type="number" value={form.minimumStockAlert || ''} onChange={e => setForm(prev => ({ ...prev, minimumStockAlert: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" /></div>
              </div>
              {!editingProduct && (
                <div><label className="block text-xs text-gray-500 font-heading mb-1">Opening Stock</label>
                  <input type="number" value={form.currentStock || ''} onChange={e => setForm(prev => ({ ...prev, currentStock: Number(e.target.value) }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" /></div>
              )}
              <button onClick={handleSaveProduct} disabled={saving || !form.name}
                className={cn('btn-primary w-full justify-center py-3', (saving || !form.name) && 'opacity-50')}>
                {saving ? 'Saving...' : `${t('save')} ✅`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 w-full max-w-sm mx-4 animate-scale-in">
            <h3 className="font-heading font-bold text-gray-900 dark:text-white mb-1">{t('adjustStock')}</h3>
            <p className="text-sm text-gray-400 mb-4">{stockProduct.name} · Current: {stockProduct.currentStock}</p>
            <div className="space-y-3">
              <select value={stockAdjustType} onChange={e => setStockAdjustType(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
                <option value="add">Add Stock</option><option value="remove">Remove Stock</option>
              </select>
              <input type="number" placeholder="Quantity" value={stockAdjustQty || ''} onChange={e => setStockAdjustQty(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple" />
              <select value={stockAdjustReason} onChange={e => setStockAdjustReason(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple">
                <option value="purchase">Purchase</option><option value="returned">Returned</option><option value="damaged">Damaged</option><option value="manual">Manual</option><option value="expired">Expired</option>
              </select>
              <textarea rows={2} placeholder="Notes..." value={stockAdjustNotes} onChange={e => setStockAdjustNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark text-sm outline-none focus:border-brand-purple resize-none" />
              <div className="flex gap-2">
                <button onClick={() => setShowStockModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">{t('cancel')}</button>
                <button onClick={handleStockAdjust} disabled={saving || stockAdjustQty <= 0}
                  className={cn('flex-1 btn-primary justify-center py-2.5 text-sm', (saving || stockAdjustQty <= 0) && 'opacity-50')}>
                  {saving ? 'Saving...' : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-brand-dark-card rounded-2xl p-6 w-full max-w-xs mx-4 text-center animate-scale-in">
            <Trash2 size={32} className="text-red-500 mx-auto mb-3" />
            <h3 className="font-heading font-bold text-gray-900 dark:text-white mb-2">{t('deleteConfirm')}</h3>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm">{t('cancel')}</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
