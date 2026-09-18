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
  Pencil, Trash2, PlusCircle, Camera
} from 'lucide-react';
import { PageSkeleton } from '../components/Skeleton';
import { EmptyState } from '../components/EmptyState';
import InventoryScanner from '../components/InventoryScanner';

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
  const [showScanner, setShowScanner] = useState(false);
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
    if (stock === 0) return <span className="bg-red-100 text-red-800 text-[11px] px-1.5 py-0.5 rounded-sm font-medium">Out of Stock</span>;
    if (stock <= min) return <span className="bg-amber-100 text-amber-800 text-[11px] px-1.5 py-0.5 rounded-sm font-medium">Low Stock</span>;
    return <span className="bg-green-100 text-green-800 text-[11px] px-1.5 py-0.5 rounded-sm font-medium">Normal</span>;
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

  // Scanner callbacks
  const handleScanNewProduct = (barcode: string) => {
    setEditingProduct(null);
    setForm({ ...defaultForm, barcode });
    setShowSlideOver(true);
  };

  const handleScanEditProduct = (product: Product) => {
    openEditProduct(product);
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

  const showEmptyState = loaded && products.length === 0;

  return (
    <div>
      {showEmptyState ? (
        <EmptyState
          title="Koi product nahi hai"
          subtitle="Apna pehla product add karo!"
          actionLabel="+ Product Add Karo"
          onAction={() => { setEditingProduct(null); setForm(defaultForm); setShowSlideOver(true); }}
        />
      ) : (
        <>
      {/* Low Stock Banner */}
      {lowStockCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 bg-amber-50 border border-amber-200 rounded-md">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-700 font-medium">
            {lowStockCount} products low stock mein hain.
          </span>
          <button onClick={() => setStockFilter('low')} className="ml-auto text-[11px] font-semibold text-amber-600 hover:underline">Dekhein →</button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{t('inventory')}</h1>
          <p className="text-xs text-gray-500">{language === 'hi' ? 'Apne stock aur products ko manage karein' : 'Manage your stock and products'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => showToast('Bulk import jaldi aa raha hai!', 'info')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all text-sm">
            <Upload size={14} /> {t('bulkImport')}
          </button>
          <button onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all text-sm">
            <Camera size={14} /> Scan
          </button>
          <button onClick={openAddProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-purple-700 hover:bg-purple-800 text-white transition-all text-sm font-medium">
            <Plus size={14} /> {language === 'hi' ? 'Product Jodein' : 'Add Product'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 border border-gray-200 rounded-md bg-white">
          <div className="text-xs text-gray-500 mb-0.5">Total Products</div>
          <div className="text-lg font-semibold text-gray-900">{products.length}</div>
        </div>
        <div className="p-3 border border-gray-200 rounded-md bg-white">
          <div className="text-xs text-gray-500 mb-0.5">Low Stock</div>
          <div className="text-lg font-semibold text-gray-900">{lowStockCount}</div>
        </div>
        <div className="p-3 border border-gray-200 rounded-md bg-white">
          <div className="text-xs text-gray-500 mb-0.5">Categories</div>
          <div className="text-lg font-semibold text-gray-900">{categories.length}</div>
        </div>
        <div className="p-3 border border-gray-200 rounded-md bg-white">
          <div className="text-xs text-gray-500 mb-0.5">Total Value</div>
          <div className="text-lg font-semibold text-gray-900">{formatINR(products.reduce((acc, p) => acc + (p.currentStock * p.purchasePrice), 0))}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4 gap-4">
        {(['products', 'movements'] as const).map(t2 => (
          <button key={t2} onClick={() => setTab(t2)}
            className={cn('pb-2 text-sm font-medium border-b-2 transition-all', tab === t2 ? 'border-brand-purple text-brand-purple' : 'border-transparent text-gray-500 hover:text-gray-700')}>
            {t2 === 'products' ? t('products') : t('stockMovements')}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('search') + '...'} className="w-full pl-8 pr-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" />
            </div>
            <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple">
              <option value="all">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={stockFilter} onChange={e => setStockFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple">
              <option value="all">{t('allProducts')}</option>
              <option value="low">{t('lowStockItems')}</option>
              <option value="out">{t('outOfStock')}</option>
              <option value="normal">{t('normalStock')}</option>
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
              className="px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple">
              <option value="name">Sort by Name</option>
              <option value="price">Sort by Price</option>
              <option value="stock">Sort by Stock</option>
              <option value="category">Sort by Category</option>
            </select>
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              <button onClick={() => setViewMode('table')} className={cn('px-2.5 py-1.5', viewMode === 'table' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50')}>
                <LayoutList size={14} />
              </button>
              <button onClick={() => setViewMode('grid')} className={cn('px-2.5 py-1.5', viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50')}>
                <LayoutGrid size={14} />
              </button>
            </div>
          </div>

          {/* Product Table */}
          {viewMode === 'table' ? (
            <div className="w-full overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Category</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Stock</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Min</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 uppercase">Price</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">GST</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedProducts.map(p => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900 ">{p.name}</div>
                        <div className="text-[11px] text-gray-500">{p.nameHindi}</div>
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{p.categoryName}</td>
                      <td className="px-3 py-2 text-center font-semibold text-gray-900 ">{p.currentStock}</td>
                      <td className="px-3 py-2 text-center text-gray-500 text-xs">{p.minimumStockAlert}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900 ">{formatINR(p.sellingPrice)}</td>
                      <td className="px-3 py-2 text-center text-gray-500 text-xs">{p.gstRate}%</td>
                      <td className="px-3 py-2 text-center">{getStockBadge(p.currentStock, p.minimumStockAlert)}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => openEditProduct(p)}
                            className="text-gray-400 hover:text-brand-purple transition-colors" title="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => { setStockProduct(p); setShowStockModal(true); setStockAdjustQty(0); setStockAdjustNotes(''); }}
                            className="text-gray-400 hover:text-blue-500 transition-colors" title="Adjust Stock">
                            <PlusCircle size={14} />
                          </button>
                          <button onClick={() => setShowDeleteConfirm(p.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {sortedProducts.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-sm text-gray-500">No products found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {sortedProducts.map(p => (
                <div key={p.id} className="border border-gray-200 p-3 rounded-md hover:bg-gray-50 transition-all cursor-pointer bg-white group" onClick={() => openEditProduct(p)}>
                  <div className="w-full h-16 rounded bg-gray-50 flex items-center justify-center mb-2">
                    <LayoutGrid size={20} className="text-gray-300" />
                  </div>
                  <h3 className="font-medium text-sm text-gray-900 truncate">{p.name}</h3>
                  <p className="text-[11px] text-gray-500 mb-2">{p.nameHindi}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-purple text-sm">{formatINR(p.sellingPrice)}</span>
                    {getStockBadge(p.currentStock, p.minimumStockAlert)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'movements' && (
        <div className="w-full overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-y border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Reference</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase">Notes</th>
              </tr>
            </thead>
            <tbody>
              {stockMovements.map((m) => (
                <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-500 text-xs">{m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleDateString('en-IN') : ''}</td>
                  <td className="px-3 py-2 font-medium text-gray-900 ">{m.productName}</td>
                  <td className="px-3 py-2 text-center capitalize text-xs">
                    <span className={m.quantity > 0 ? 'bg-green-100 text-green-800 text-[11px] px-1.5 py-0.5 rounded-sm' : 'bg-red-100 text-red-800 text-[11px] px-1.5 py-0.5 rounded-sm'}>{m.movementType}</span>
                  </td>
                  <td className={cn('px-3 py-2 text-center font-semibold text-xs', m.quantity > 0 ? 'text-green-600' : 'text-red-500')}>
                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs font-mono">{m.referenceId || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{m.notes || '—'}</td>
                </tr>
              ))}
              {stockMovements.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-500">No stock movements yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      </>
      )}

      {/* Slide-Over: Add/Edit Product */}
      {showSlideOver && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/20" onClick={() => setShowSlideOver(false)} />
          <div className="w-full max-w-md bg-white border-l border-gray-200 p-4 overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 ">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button onClick={() => setShowSlideOver(false)} className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Name (English)', placeholder: 'Product name', key: 'name' },
                { label: 'Name (Hindi)', placeholder: 'Product name in Hindi', key: 'nameHindi' },
                { label: 'Barcode', placeholder: 'Scan or enter', key: 'barcode' },
                { label: 'SKU', placeholder: 'SKU code', key: 'sku' },
                { label: 'HSN Code', placeholder: 'HSN Code', key: 'hsnCode' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                {!isAddingCategory ? (
                  <select value={form.categoryId} onChange={e => {
                    if (e.target.value === 'ADD_NEW') setIsAddingCategory(true);
                    else setForm(prev => ({ ...prev, categoryId: e.target.value }));
                  }}
                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    <option value="ADD_NEW" className="font-semibold text-brand-purple">+ Add New Category</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input autoFocus value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)}
                      placeholder="New category name" className="flex-1 px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" />
                    <button onClick={handleAddCategory} className="px-3 py-1.5 bg-brand-purple text-white rounded-md text-xs font-medium">Save</button>
                    <button onClick={() => setIsAddingCategory(false)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">Cancel</button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Unit</label>
                <select value={form.unit} onChange={e => setForm(prev => ({ ...prev, unit: e.target.value as any }))}
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple">
                  <option value="piece">Piece</option>
                  <option value="packet">Packet</option>
                  <option value="set">Set</option>
                  <option value="pair">Pair</option>
                  <option value="kg">KG</option>
                  <option value="gram">Gram</option>
                  <option value="litre">Litre</option>
                  <option value="ml">ML</option>
                  <option value="box">Box</option>
                  <option value="dozen">Dozen</option>
                  <option value="meter">Meter</option>
                  <option value="bundle">Bundle</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Purchase ₹</label>
                  <input type="number" value={form.purchasePrice || ''} onChange={e => setForm(prev => ({ ...prev, purchasePrice: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Selling ₹</label>
                  <input type="number" value={form.sellingPrice || ''} onChange={e => setForm(prev => ({ ...prev, sellingPrice: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">MRP ₹</label>
                  <input type="number" value={form.mrp || ''} onChange={e => setForm(prev => ({ ...prev, mrp: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">GST Rate</label>
                  <select value={form.gstRate} onChange={e => setForm(prev => ({ ...prev, gstRate: Number(e.target.value) as any }))}
                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple">
                    <option value={0}>0%</option><option value={5}>5%</option><option value={12}>12%</option><option value={18}>18%</option><option value={28}>28%</option>
                  </select></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Min Stock Alert</label>
                  <input type="number" value={form.minimumStockAlert || ''} onChange={e => setForm(prev => ({ ...prev, minimumStockAlert: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" /></div>
              </div>
              {!editingProduct && (
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Opening Stock</label>
                  <input type="number" value={form.currentStock || ''} onChange={e => setForm(prev => ({ ...prev, currentStock: Number(e.target.value) }))}
                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" /></div>
              )}
              <div className="pt-2">
                <button onClick={handleSaveProduct} disabled={saving || !form.name}
                  className={cn('w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-purple hover:bg-purple-800 focus:outline-none', (saving || !form.name) && 'opacity-50')}>
                  {saving ? 'Saving...' : `${t('save')}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {showStockModal && stockProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-md p-4 w-full max-w-sm mx-4 shadow-lg border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-1">{t('adjustStock')}</h3>
            <p className="text-xs text-gray-500 mb-4">{stockProduct.name} · Current: {stockProduct.currentStock}</p>
            <div className="space-y-3">
              <select value={stockAdjustType} onChange={e => setStockAdjustType(e.target.value as any)}
                className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple">
                <option value="add">Add Stock</option><option value="remove">Remove Stock</option>
              </select>
              <input type="number" placeholder="Quantity" value={stockAdjustQty || ''} onChange={e => setStockAdjustQty(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple" />
              <select value={stockAdjustReason} onChange={e => setStockAdjustReason(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple">
                <option value="purchase">Purchase</option><option value="returned">Returned</option><option value="damaged">Damaged</option><option value="manual">Manual</option><option value="expired">Expired</option>
              </select>
              <textarea rows={2} placeholder="Notes..." value={stockAdjustNotes} onChange={e => setStockAdjustNotes(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-gray-200 text-sm outline-none focus:border-brand-purple resize-none" />
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowStockModal(false)} className="flex-1 py-1.5 rounded-md border border-gray-200 text-sm hover:bg-gray-50">{t('cancel')}</button>
                <button onClick={handleStockAdjust} disabled={saving || stockAdjustQty <= 0}
                  className={cn('flex-1 py-1.5 rounded-md bg-brand-purple text-white text-sm font-medium hover:bg-purple-800', (saving || stockAdjustQty <= 0) && 'opacity-50')}>
                  {saving ? 'Saving...' : t('save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-md p-4 w-full max-w-xs mx-4 text-center shadow-lg border border-gray-200">
            <Trash2 size={24} className="text-red-500 mx-auto mb-2" />
            <h3 className="font-semibold text-gray-900 mb-1">{t('deleteConfirm')}</h3>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowDeleteConfirm(null)} className="flex-1 py-1.5 rounded-md border border-gray-200 text-sm hover:bg-gray-50">{t('cancel')}</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="flex-1 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-sm font-medium">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Inventory Scanner */}
      <InventoryScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        products={products}
        onNewProduct={handleScanNewProduct}
        onEditProduct={handleScanEditProduct}
      />

      <div className="text-center text-xs py-4 text-gray-400 mt-4">Made in Jabalpur, India</div>
    </div>
  );
}
