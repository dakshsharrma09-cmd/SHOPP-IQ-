import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { formatINR, cn } from '../lib/formatters';
import {
  subscribeProducts, subscribeCustomers, createInvoice, getNextInvoiceNumber
} from '../lib/firestoreService';
import type { Product, Customer } from '../types/firestore';
import { Timestamp } from 'firebase/firestore';
import {
  Search, Plus, Minus, X, Camera, Calendar, CreditCard,
  Smartphone, Banknote, HandCoins, MessageCircle, Printer,
  Download, Check, ChevronDown, Gift
} from 'lucide-react';
import { InvoiceReceipt } from '../components/InvoiceReceipt';
import '../styles/print.css';

interface CartItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstRate: number;
  isGstInclusive: boolean;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

export default function Billing() {
  const { tenantId } = useAuth();
  const { t, language } = useLanguage();
  const { showToast } = useToast();

  // Firestore state
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeProducts(tenantId, setProducts);
    const unsub2 = subscribeCustomers(tenantId, setCustomers);
    return () => { unsub1(); unsub2(); };
  }, [tenantId]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [items, setItems] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'credit' | 'mixed'>('cash');
  const [cashTendered, setCashTendered] = useState('');
  const [notes, setNotes] = useState('');
  const [loyaltyRedeem, setLoyaltyRedeem] = useState(0);
  const [invoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2026-0001');
  const [showSuccess, setShowSuccess] = useState(false);
  const [customerCollapsed, setCustomerCollapsed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Get next invoice number
  useEffect(() => {
    if (!tenantId) return;
    getNextInvoiceNumber(tenantId).then(setInvoiceNumber);
  }, [tenantId]);

  const filteredCustomers = customers.filter(c =>
    c.fullName.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.phoneNumber.includes(customerSearch)
  ).slice(0, 5);

  const activeProducts = products.filter(p => p.isActive !== false);
  const filteredProducts = activeProducts.filter(p =>
    p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
    (p.nameHindi && p.nameHindi.includes(productSearch))
  ).slice(0, 6);

  /**
   * GST Calculation Helper
   * If isGstInclusive: price already contains GST, back-calculate taxable
   *   taxable = price / (1 + gstRate/100)
   *   gstAmount = price - taxable
   * If NOT inclusive: add GST on top
   *   taxable = price
   *   gstAmount = price * gstRate / 100
   */
  const calcGst = (price: number, gstRate: number, isGstInclusive: boolean) => {
    if (isGstInclusive) {
      const taxable = price / (1 + gstRate / 100);
      const gst = price - taxable;
      return { taxable, cgst: gst / 2, sgst: gst / 2, total: price };
    } else {
      const cgst = (price * gstRate) / 200;
      const sgst = cgst;
      return { taxable: price, cgst, sgst, total: price + cgst + sgst };
    }
  };

  const addProduct = (prod: Product) => {
    const existing = items.find(i => i.productId === prod.id);
    if (existing) {
      if (existing.quantity + 1 > prod.currentStock) {
        showToast('Not enough stock!', 'error');
        return;
      }
      updateQuantity(prod.id, existing.quantity + 1);
    } else {
      if (prod.currentStock < 1) {
        showToast('Not enough stock!', 'error');
        return;
      }
      const gst = calcGst(prod.sellingPrice, prod.gstRate, prod.isGstInclusive);
      setItems(prev => [...prev, {
        productId: prod.id, productName: prod.name, quantity: 1,
        unitPrice: prod.sellingPrice, discountPercent: 0, gstRate: prod.gstRate,
        isGstInclusive: prod.isGstInclusive,
        cgstAmount: gst.cgst, sgstAmount: gst.sgst,
        totalAmount: gst.total,
      }]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
    setHighlightedIndex(-1);
  };

  const updateQuantity = (productId: string, qty: number) => {
    if (qty < 1) return removeItem(productId);
    const product = products.find(p => p.id === productId);
    if (product && qty > product.currentStock) {
      showToast('Not enough stock!', 'error');
      return;
    }
    setItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const basePrice = item.unitPrice * qty * (1 - item.discountPercent / 100);
      const gst = calcGst(basePrice, item.gstRate, item.isGstInclusive);
      return { ...item, quantity: qty, cgstAmount: gst.cgst, sgstAmount: gst.sgst, totalAmount: gst.total };
    }));
  };

  const updateUnitPrice = (productId: string, newPrice: number) => {
    if (newPrice < 0) return;
    setItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const basePrice = newPrice * item.quantity * (1 - item.discountPercent / 100);
      const gst = calcGst(basePrice, item.gstRate, item.isGstInclusive);
      return { ...item, unitPrice: newPrice, cgstAmount: gst.cgst, sgstAmount: gst.sgst, totalAmount: gst.total };
    }));
  };

  const updateDiscount = (productId: string, disc: number) => {
    const validDisc = Math.max(0, Math.min(100, disc));
    setItems(prev => prev.map(item => {
      if (item.productId !== productId) return item;
      const basePrice = item.unitPrice * item.quantity * (1 - validDisc / 100);
      const gst = calcGst(basePrice, item.gstRate, item.isGstInclusive);
      return { ...item, discountPercent: validDisc, cgstAmount: gst.cgst, sgstAmount: gst.sgst, totalAmount: gst.total };
    }));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.productId !== productId));
  };

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const discount = items.reduce((s, i) => s + (i.unitPrice * i.quantity * i.discountPercent / 100), 0);
    const cgst = items.reduce((s, i) => s + i.cgstAmount, 0);
    const sgst = items.reduce((s, i) => s + i.sgstAmount, 0);
    const grand = items.reduce((s, i) => s + i.totalAmount, 0);
    const loyaltyReduction = loyaltyRedeem;
    return { subtotal, discount, cgst, sgst, grand: grand - loyaltyReduction };
  }, [items, loyaltyRedeem]);

  const change = cashTendered ? Number(cashTendered) - totals.grand : 0;

  const handleCreateBill = async () => {
    if (!tenantId || items.length === 0) return;
    setSaving(true);
    try {
      const grandTotal = Math.round(totals.grand);
      const amountPaid = paymentMethod === 'credit' ? 0 : grandTotal;
      const amountPending = grandTotal - amountPaid;
      const paymentStatus = amountPaid >= grandTotal ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid';
      const loyaltyPointsEarned = Math.floor(grandTotal / 10); // 1 point per ₹10

      const invoiceItems = items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unit: products.find(p => p.id === item.productId)?.unit || 'piece',
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        gstRate: item.gstRate,
        cgstAmount: Math.round(item.cgstAmount),
        sgstAmount: Math.round(item.sgstAmount),
        totalAmount: Math.round(item.totalAmount),
      }));

      await createInvoice(tenantId, {
        invoiceNumber,
        invoiceType: 'sale',
        customerId: selectedCustomer?.id || '',
        customerName: selectedCustomer?.fullName || 'Walk-in Customer',
        customerPhone: selectedCustomer?.phoneNumber || '',
        invoiceDate: Timestamp.now(),
        items: invoiceItems,
        subtotal: Math.round(totals.subtotal),
        discountAmount: Math.round(totals.discount),
        cgstTotal: Math.round(totals.cgst),
        sgstTotal: Math.round(totals.sgst),
        grandTotal,
        amountPaid,
        amountPending,
        paymentStatus: paymentStatus as any,
        paymentMethod,
        loyaltyPointsUsed: loyaltyRedeem,
        loyaltyPointsEarned,
        whatsappSent: false,
        createdBy: tenantId,
        notes,
      }, invoiceItems);

      setShowSuccess(true);
      showToast('✅ Bill safalta se ban gaya!', 'success');
      // Get next invoice number for the next bill
      const nextNum = await getNextInvoiceNumber(tenantId);
      setInvoiceNumber(nextNum);
    } catch (err) {
      showToast('Bill banane mein error aaya. Dobara try karo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const loyaltyPointsEarned = Math.floor(Math.round(totals.grand) / 10);

  const handleWhatsAppSend = () => {
    const phone = selectedCustomer?.phoneNumber || '';
    if (!phone) return;
    const cleanPhone = phone.replace(/\D/g, '');
    const phoneNum = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;
    const amount = formatINR(Math.round(totals.grand));
    const name = selectedCustomer?.fullName || 'ji';
    const msg = `Namaste ${name}! Aapka bill ${invoiceNumber} ban gaya hai. Total amount: ${amount}. ShoppIQ dwara bheja gaya.`;
    window.open(`https://wa.me/${phoneNum}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white dark:bg-brand-dark-card rounded-3xl p-8 max-w-md w-full mx-4 text-center animate-scale-in shadow-2xl">
          <InvoiceReceipt 
            data={{
              items: items.map(i => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, totalAmount: i.totalAmount })),
              subtotal: totals.subtotal,
              discount: totals.discount,
              cgst: totals.cgst,
              sgst: totals.sgst,
              grandTotal: totals.grand,
              customerName: selectedCustomer?.fullName || 'Walk-in Customer',
              customerPhone: selectedCustomer?.phoneNumber || '',
              invoiceNumber,
              date: invoiceDate,
              paymentMethod,
            }}
          />
          <div className="w-20 h-20 rounded-full bg-brand-green/20 flex items-center justify-center mx-auto mb-4">
            <Check size={40} className="text-brand-green" />
          </div>
          <h2 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-2">
            Bill #{invoiceNumber} ban gaya! 🎉
          </h2>
          <p className="text-gray-500 mb-1">{selectedCustomer?.fullName || 'Walk-in Customer'}</p>
          <p className="text-2xl font-bold font-heading text-brand-purple mb-1">{formatINR(Math.round(totals.grand))}</p>
          <p className="text-sm text-gray-400 mb-2">{items.length} items</p>
          {loyaltyPointsEarned > 0 && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/10 mb-4">
              <Gift size={16} className="text-brand-gold" />
              <span className="text-sm font-heading font-semibold text-brand-gold">
                +{loyaltyPointsEarned} Loyalty Points Earned! 🎁
              </span>
            </div>
          )}
          <div className="flex gap-3 mt-2">
            <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-all">
              <Printer size={16} /> Print
            </button>
            <button onClick={() => { showToast('PDF download jaldi aa raha hai!', 'info'); }} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium transition-all">
              <Download size={16} /> PDF
            </button>
            <button onClick={handleWhatsAppSend} className="flex-1 btn-whatsapp justify-center py-3 rounded-xl text-sm">
              <MessageCircle size={16} /> WhatsApp
            </button>
          </div>
          <button onClick={() => { setShowSuccess(false); setItems([]); setSelectedCustomer(null); setLoyaltyRedeem(0); setCashTendered(''); setNotes(''); }}
            className="mt-4 text-sm text-brand-purple hover:underline font-medium">
            Naya Bill Banao →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl font-heading font-bold text-gray-900 dark:text-white mb-4">{t('createInvoice')} ✍️</h1>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: Items (70%) */}
        <div className="flex-1 space-y-4">
          {/* Customer Section */}
          <div className="glass-card p-4">
            <button onClick={() => setCustomerCollapsed(!customerCollapsed)}
              className="flex items-center justify-between w-full mb-2">
              <h3 className="font-heading font-semibold text-gray-900 dark:text-white text-sm">{t('customer')} 👤</h3>
              <ChevronDown size={16} className={cn('text-gray-400 transition-transform', customerCollapsed && '-rotate-180')} />
            </button>
            {!customerCollapsed && (
              <div className="animate-slide-up">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-brand-purple/5 border border-brand-purple/20">
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{selectedCustomer.fullName}</span>
                      <span className="text-gray-400 text-xs ml-2">📞 {selectedCustomer.phoneNumber}</span>
                      <div className="flex gap-3 mt-1">
                        <span className="text-xs text-brand-gold">🎁 {selectedCustomer.loyaltyPoints} pts</span>
                        {selectedCustomer.currentOutstanding > 0 && (
                          <span className="text-xs text-red-500">💰 {formatINR(selectedCustomer.currentOutstanding)} due</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-red-500">
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={customerSearch}
                      onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      placeholder={language === 'hi' ? 'Customer ka naam ya phone...' : 'Search customer name or phone...'}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-brand-dark-border bg-white dark:bg-brand-dark text-sm text-gray-900 dark:text-gray-100 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all" />
                    {showCustomerDropdown && customerSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-brand-dark-card rounded-xl border border-gray-100 dark:border-brand-dark-border shadow-xl z-20 overflow-hidden">
                        {filteredCustomers.length ? filteredCustomers.map(c => (
                          <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-brand-purple/5 text-left transition-colors">
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.fullName}</div>
                              <div className="text-xs text-gray-400">{c.phoneNumber}</div>
                            </div>
                            <span className="badge-purple text-[10px]">{c.customerSegment}</span>
                          </button>
                        )) : (
                          <div className="p-4 text-center text-sm text-gray-400">Not found — add new customer</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Product Search */}
          <div className="glass-card p-4">
            <div className="relative mb-4">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={productSearch}
                onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); setHighlightedIndex(-1); }}
                onFocus={() => productSearch && setShowProductDropdown(true)}
                onKeyDown={(e) => {
                  if (!showProductDropdown || !filteredProducts.length) return;
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev + 1) % filteredProducts.length);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setHighlightedIndex(prev => (prev - 1 + filteredProducts.length) % filteredProducts.length);
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (highlightedIndex >= 0 && highlightedIndex < filteredProducts.length) {
                      addProduct(filteredProducts[highlightedIndex]);
                    }
                  } else if (e.key === 'Escape') {
                    setShowProductDropdown(false);
                  }
                }}
                placeholder={language === 'hi' ? 'Product dhundho ya barcode scan karo...' : 'Search product or scan barcode...'}
                className="w-full pl-10 pr-20 py-3 rounded-xl border border-gray-200 dark:border-brand-dark-border bg-white dark:bg-brand-dark text-sm text-gray-900 dark:text-gray-100 focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 outline-none transition-all" />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 text-xs hover:bg-brand-purple/10 hover:text-brand-purple transition-all">
                <Camera size={14} /> Scan
              </button>
              {showProductDropdown && productSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-brand-dark-card rounded-xl border border-gray-100 dark:border-brand-dark-border shadow-xl z-20 overflow-hidden">
                  {filteredProducts.length ? filteredProducts.map((p, index) => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className={cn("w-full flex items-center justify-between px-4 py-3 text-left transition-colors", highlightedIndex === index ? 'bg-brand-purple/10' : 'hover:bg-brand-purple/5')}>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.name}</div>
                        <div className="text-xs text-gray-400">{p.nameHindi}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-brand-purple">{formatINR(p.sellingPrice)}</div>
                        <div className={cn('text-[10px] font-medium', p.currentStock <= p.minimumStockAlert ? 'text-red-500' : 'text-gray-400')}>
                          Stock: {p.currentStock}
                        </div>
                      </div>
                    </button>
                  )) : (
                    <div className="p-4 text-center text-sm text-gray-400">Koi product nahi mila 🔍</div>
                  )}
                </div>
              )}
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-400 text-sm">
                  {language === 'hi' ? 'Koi product nahi add kiya abhi. Upar search karein.' : 'No products added yet. Search above to add.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 border-b border-gray-100 dark:border-gray-800">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Product</th>
                      <th className="pb-2 font-medium text-center">Qty</th>
                      <th className="pb-2 font-medium text-right">Rate</th>
                      <th className="pb-2 font-medium text-center">Disc%</th>
                      <th className="pb-2 font-medium text-right">GST</th>
                      <th className="pb-2 font-medium text-right">Total</th>
                      <th className="pb-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.productId} className="border-b border-gray-50 dark:border-gray-800 table-row-hover">
                        <td className="py-3 text-gray-400">{idx + 1}</td>
                        <td className="py-3 font-medium text-gray-900 dark:text-gray-100 max-w-[160px] truncate">{item.productName}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-brand-purple/10 transition-colors">
                              <Minus size={12} />
                            </button>
                            <input type="number" min="1" max={products.find(p => p.id === item.productId)?.currentStock || 1}
                              value={item.quantity} onChange={e => updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                              className="w-12 text-center font-bold bg-transparent border-b border-gray-200 dark:border-gray-700 outline-none focus:border-brand-purple" />
                            <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center hover:bg-brand-purple/10 transition-colors">
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 text-right">
                          <input type="number" value={item.unitPrice} onChange={e => updateUnitPrice(item.productId, Number(e.target.value))}
                            className="w-20 text-right py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none focus:border-brand-purple" />
                        </td>
                        <td className="py-3">
                          <input type="number" value={item.discountPercent} min={0} max={100}
                            onChange={e => updateDiscount(item.productId, Number(e.target.value))}
                            className="w-14 text-center py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none focus:border-brand-purple" />
                        </td>
                        <td className="py-3 text-right text-xs text-gray-400">
                          {item.gstRate}%
                          {item.isGstInclusive && <span className="block text-[9px] text-brand-purple">(incl)</span>}
                        </td>
                        <td className="py-3 text-right font-bold text-gray-900 dark:text-white">{formatINR(Math.round(item.totalAmount))}</td>
                        <td className="py-3">
                          <button onClick={() => removeItem(item.productId)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Summary (30%) — sticky */}
        <div className="w-full lg:w-80 xl:w-96 space-y-4 lg:sticky lg:top-20 lg:self-start">
          {/* Invoice Info */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-heading mb-1 block">Date</label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-300">
                  <Calendar size={14} className="text-gray-400" /> {invoiceDate}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 font-heading mb-1 block">Invoice #</label>
                <input value={invoiceNumber} readOnly className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 font-mono" />
              </div>
            </div>
          </div>

          {/* Totals */}
          <div className="glass-card p-4 space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{t('subtotal')}</span><span>{formatINR(Math.round(totals.subtotal))}</span>
            </div>
            {totals.discount > 0 && (
              <div className="flex justify-between text-sm text-brand-green">
                <span>{t('discount')}</span><span>-{formatINR(Math.round(totals.discount))}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>CGST</span><span>{formatINR(Math.round(totals.cgst))}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>SGST</span><span>{formatINR(Math.round(totals.sgst))}</span>
            </div>
            <div className="border-t border-dashed border-gray-200 dark:border-gray-700 my-2" />
            <div className="flex justify-between items-center">
              <span className="font-heading font-bold text-gray-900 dark:text-white">{t('grandTotal')}</span>
              <span className="text-2xl font-bold font-heading text-brand-purple">{formatINR(Math.round(totals.grand))}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="glass-card p-4">
            <h3 className="font-heading font-semibold text-sm text-gray-900 dark:text-white mb-3">{t('payment')}</h3>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {([
                { id: 'cash', icon: Banknote, label: 'Cash' },
                { id: 'upi', icon: Smartphone, label: 'UPI' },
                { id: 'credit', icon: HandCoins, label: 'Credit' },
                { id: 'mixed', icon: CreditCard, label: 'Mixed' },
              ] as const).map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={cn('flex flex-col items-center gap-1 py-2.5 rounded-xl border text-xs font-medium transition-all',
                    paymentMethod === m.id ? 'border-brand-purple bg-brand-purple/10 text-brand-purple' : 'border-gray-200 dark:border-gray-700 text-gray-400')}>
                  <m.icon size={16} />{m.label}
                </button>
              ))}
            </div>
            {paymentMethod === 'cash' && (
              <div className="space-y-2 animate-fade-in">
                <input type="number" value={cashTendered} onChange={e => setCashTendered(e.target.value)}
                  placeholder="Amount tendered" className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm outline-none focus:border-brand-purple" />
                {change > 0 && <div className="text-sm text-brand-green font-medium">Change: {formatINR(Math.round(change))}</div>}
              </div>
            )}
            {paymentMethod === 'upi' && (
              <div className="text-center py-4 animate-fade-in">
                <div className="w-24 h-24 mx-auto mb-2 rounded-xl border-2 border-dashed border-brand-purple/30 flex items-center justify-center bg-brand-purple/5">
                  <Smartphone size={28} className="text-brand-purple/50" />
                </div>
                <p className="text-xs text-gray-400">UPI QR Code</p>
                <p className="text-lg font-bold font-heading text-brand-purple mt-1">{formatINR(Math.round(totals.grand))}</p>
              </div>
            )}
          </div>

          {/* Loyalty */}
          {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
            <div className="glass-card p-4 animate-fade-in">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={16} className="text-brand-gold" />
                <span className="text-sm font-heading font-semibold text-gray-900 dark:text-white">Loyalty Points</span>
              </div>
              <p className="text-xs text-gray-400 mb-2">Balance: {selectedCustomer.loyaltyPoints} pts</p>
              <input type="range" min={0} max={Math.min(selectedCustomer.loyaltyPoints, Math.floor(totals.grand))}
                value={loyaltyRedeem} onChange={e => setLoyaltyRedeem(Number(e.target.value))}
                className="w-full accent-brand-purple" />
              <p className="text-xs text-brand-purple font-medium mt-1">Redeem: {loyaltyRedeem} pts = {formatINR(loyaltyRedeem)}</p>
            </div>
          )}

          {/* Notes */}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            placeholder={language === 'hi' ? 'Notes...' : 'Add notes...'}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-brand-dark-card text-sm resize-none outline-none focus:border-brand-purple" />

          {/* Action Buttons */}
          <button onClick={() => handleCreateBill()} disabled={items.length === 0 || saving}
            className={cn('btn-whatsapp w-full justify-center py-4 rounded-2xl text-base font-heading', (items.length === 0 || saving) && 'opacity-40 cursor-not-allowed')}>
            <MessageCircle size={20} />
            {saving ? 'Saving...' : language === 'hi' ? 'Bill Banao & WhatsApp Bhejo 📱' : 'Create Bill & Send WhatsApp 📱'}
          </button>
          <button onClick={() => handleCreateBill()} disabled={items.length === 0 || saving}
            className={cn('w-full py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all', (items.length === 0 || saving) && 'opacity-40 cursor-not-allowed')}>
            {saving ? 'Saving...' : language === 'hi' ? 'Sirf Save Karo' : 'Save Only'}
          </button>
        </div>
      </div>
    </div>
  );
}
