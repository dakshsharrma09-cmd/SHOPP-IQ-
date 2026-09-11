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
  Download, Check, Gift
} from 'lucide-react';
import { InvoiceReceipt } from '../components/InvoiceReceipt';
import { generateInvoicePDF } from '../utils/generateInvoicePDF';
import BarcodeScanner from '../components/BarcodeScanner';
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
  const { tenantId, tenant } = useAuth();
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
  const [showScanner, setShowScanner] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  // const [customerCollapsed, setCustomerCollapsed] = useState(false);
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
      showToast('Bill safalta se ban gaya!', 'success');
      // Get next invoice number for the next bill
      const nextNum = await getNextInvoiceNumber(tenantId);
      setInvoiceNumber(nextNum);
    } catch (err) {
      showToast('Bill banane mein error aaya. Dobara try karo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // const loyaltyPointsEarned = Math.floor(Math.round(totals.grand) / 10);

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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 shadow-modal">
        <div className="bg-white rounded-md p-6 max-w-md w-full mx-4 text-center">
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
          <div className="w-12 h-12 rounded bg-gray-50 border border-gray-200 flex items-center justify-center mx-auto mb-3">
            <Check size={24} className="text-gray-900" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            Bill #{invoiceNumber} created
          </h2>
          <p className="text-gray-500 text-sm mb-1">{selectedCustomer?.fullName || 'Walk-in Customer'}</p>
          <p className="text-xl font-bold text-gray-900 mb-3">{formatINR(Math.round(totals.grand))}</p>
          <div className="flex gap-3 mb-4">
            <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-2 h-9 rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium">
              <Printer size={14} /> Print
            </button>
            <button onClick={() => {
              try {
                generateInvoicePDF({
                  invoiceNumber,
                  invoiceDate,
                  customerName: selectedCustomer?.fullName || 'Walk-in Customer',
                  customerPhone: selectedCustomer?.phoneNumber || '',
                  items: items.map(item => ({
                    productName: item.productName,
                    quantity: item.quantity,
                    unit: 'pc',
                    unitPrice: item.unitPrice,
                    gstRate: item.gstRate,
                    totalAmount: item.totalAmount,
                  })),
                  subtotal: totals.subtotal,
                  cgstTotal: totals.cgst,
                  sgstTotal: totals.sgst,
                  discountAmount: totals.discount,
                  grandTotal: totals.grand,
                  amountPaid: totals.grand,
                  amountPending: 0,
                  paymentMethod,
                  businessName: tenant?.businessName || 'ShoppIQ Store',
                  businessPhone: tenant?.phoneNumber,
                  businessAddress: tenant?.address ? `${tenant.address}, ${tenant.city}, ${tenant.state} - ${tenant.pincode}` : `${tenant?.city || ''}, ${tenant?.state || ''}`,
                  gstin: tenant?.gstin,
                });
                showToast('PDF downloaded!', 'success');
              } catch (err) {
                showToast('PDF download failed. Try again.', 'error');
              }
            }} className="flex-1 flex items-center justify-center gap-2 h-9 rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium">
              <Download size={14} /> PDF
            </button>
            <button onClick={handleWhatsAppSend} className="flex-1 flex items-center justify-center gap-2 h-9 rounded bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-medium">
              <MessageCircle size={14} /> WhatsApp
            </button>
          </div>
          <button onClick={() => { setShowSuccess(false); setItems([]); setSelectedCustomer(null); setLoyaltyRedeem(0); setCashTendered(''); setNotes(''); }}
            className="text-sm text-purple-700 hover:underline font-medium">
            New Bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Create Invoice</h1>
          <p className="text-xs text-gray-500">New customer invoice</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* LEFT: Items (70%) */}
        <div className="flex-1 w-full pr-0 lg:pr-4 lg:border-r lg:border-gray-200">
          {/* Customer Section */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <h3 className="text-gray-900 text-sm font-semibold uppercase tracking-wide mb-3">{t('customer')}</h3>
            <div>
              {selectedCustomer ? (
                <div className="flex items-center justify-between p-2 rounded border border-gray-200 bg-gray-50">
                  <div>
                    <span className="font-medium text-gray-900 text-sm">{selectedCustomer.fullName}</span>
                    <span className="text-gray-500 text-xs ml-2">{selectedCustomer.phoneNumber}</span>
                    <div className="flex gap-3 mt-1">
                      <span className="text-xs text-gray-600">{selectedCustomer.loyaltyPoints} pts</span>
                      {selectedCustomer.currentOutstanding > 0 && (
                        <span className="text-xs text-red-500">{formatINR(selectedCustomer.currentOutstanding)} due</span>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="text-gray-400 hover:text-gray-600">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" value={customerSearch}
                    onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder={language === 'hi' ? 'Customer ka naam ya phone...' : 'Search customer name or phone...'}
                    className="w-full pl-9 pr-4 h-9 rounded-md border border-gray-200 bg-white text-sm text-gray-900 outline-none" />
                    {showCustomerDropdown && customerSearch && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md border border-gray-100 shadow-lg z-20 overflow-hidden">
                        {filteredCustomers.length ? filteredCustomers.map(c => (
                          <button key={c.id} onClick={() => { setSelectedCustomer(c); setShowCustomerDropdown(false); setCustomerSearch(''); }}
                            className="w-full flex items-center justify-between px-4 py-3 hover:bg-brand-purple/5 text-left transition-colors">
                            <div>
                              <div className="text-sm font-medium text-gray-900 ">{c.fullName}</div>
                              <div className="text-xs text-gray-500">{c.phoneNumber}</div>
                            </div>
                            <span className="badge-purple text-[10px]">{c.customerSegment}</span>
                          </button>
                        )) : (
                          <div className="p-4 text-center text-sm text-gray-500">Not found — add new customer</div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
          </div>

          {/* Product Search */}
          <div className="border-b border-gray-200 pb-4 mb-4">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
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
                className="w-full pl-9 pr-20 h-9 rounded-md border border-gray-200 bg-white text-sm text-gray-900 outline-none" />
              <button onClick={() => setShowScanner(true)}
                className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 h-7 rounded bg-gray-100 text-gray-700 text-xs font-medium hover:bg-gray-200">
                <Camera size={14} /> Scan
              </button>
              {showProductDropdown && productSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md border border-gray-100 shadow-lg z-20 overflow-hidden">
                  {filteredProducts.length ? filteredProducts.map((p, index) => (
                    <button key={p.id} onClick={() => addProduct(p)}
                      className={cn("w-full flex items-center justify-between px-4 py-3 text-left transition-colors", highlightedIndex === index ? 'bg-brand-purple/10' : 'hover:bg-brand-purple/5')}>
                      <div>
                        <div className="text-sm font-medium text-gray-900 ">{p.name}</div>
                        <div className="text-xs text-gray-500">{p.nameHindi}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-brand-purple">{formatINR(p.sellingPrice)}</div>
                        <div className={cn('text-[10px] font-medium', p.currentStock <= p.minimumStockAlert ? 'text-red-500' : 'text-gray-500')}>
                          Stock: {p.currentStock}
                        </div>
                      </div>
                    </button>
                  )) : (
                    <div className="p-4 text-center text-sm text-gray-500">Koi product nahi mila</div>
                  )}
                </div>
              )}
            </div>

            {/* Items Table */}
            {items.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500 text-sm">
                  {language === 'hi' ? 'Koi product nahi add kiya abhi. Upar search karein.' : 'No products added yet. Search above to add.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-100">
                      <th className="py-2 px-3 font-medium text-left">#</th>
                      <th className="py-2 px-3 font-medium text-left">Product</th>
                      <th className="py-2 px-3 font-medium text-center">Qty</th>
                      <th className="py-2 px-3 font-medium text-right">Rate</th>
                      <th className="py-2 px-3 font-medium text-center">Disc%</th>
                      <th className="py-2 px-3 font-medium text-right">GST</th>
                      <th className="py-2 px-3 font-medium text-right">Total</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.productId} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-3 text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-gray-900 max-w-[160px] truncate">{item.productName}</td>
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-1 justify-center">
                            <button onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                              className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                              <Minus size={12} />
                            </button>
                            <input type="number" min="1" max={products.find(p => p.id === item.productId)?.currentStock || 1}
                              value={item.quantity} onChange={e => updateQuantity(item.productId, parseInt(e.target.value, 10) || 1)}
                              className="w-10 text-center font-bold bg-transparent border-b border-gray-200 outline-none text-sm h-6" />
                            <button onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center hover:bg-gray-200">
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <input type="number" value={item.unitPrice} onChange={e => updateUnitPrice(item.productId, Number(e.target.value))}
                            className="w-20 text-right px-2 h-7 rounded-md border border-gray-200 bg-transparent text-sm outline-none" />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input type="number" value={item.discountPercent} min={0} max={100}
                            onChange={e => updateDiscount(item.productId, Number(e.target.value))}
                            className="w-14 text-center px-2 h-7 rounded-md border border-gray-200 bg-transparent text-sm outline-none" />
                        </td>
                        <td className="py-2 px-3 text-right text-xs text-gray-500">
                          {item.gstRate}%
                          {item.isGstInclusive && <span className="block text-[9px]">(incl)</span>}
                        </td>
                        <td className="py-2 px-3 text-right font-medium text-gray-900">{formatINR(Math.round(item.totalAmount))}</td>
                        <td className="py-2 px-3 text-right">
                          <button onClick={() => removeItem(item.productId)} className="text-gray-400 hover:text-gray-600 transition-colors">
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
        <div className="w-full lg:w-80 xl:w-96 lg:sticky lg:top-4 lg:self-start">
          <div className="border border-gray-200 rounded-md p-3 space-y-4">
            {/* Invoice Info */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">Date</label>
                <div className="flex items-center gap-2 px-2 h-9 rounded-md border border-gray-200 text-sm text-gray-700 bg-gray-50">
                  <Calendar size={14} className="text-gray-500" /> {invoiceDate}
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] text-gray-500 font-semibold uppercase block mb-1">Invoice #</label>
                <input value={invoiceNumber} readOnly className="w-full px-2 h-9 rounded-md border border-gray-200 bg-gray-50 text-sm text-gray-700 font-mono" />
              </div>
            </div>

            <div className="border-b border-gray-100"></div>

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>{t('subtotal')}</span><span>{formatINR(Math.round(totals.subtotal))}</span>
              </div>
              {totals.discount > 0 && (
                <div className="flex justify-between text-sm text-gray-900">
                  <span>{t('discount')}</span><span>-{formatINR(Math.round(totals.discount))}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>CGST</span><span>{formatINR(Math.round(totals.cgst))}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>SGST</span><span>{formatINR(Math.round(totals.sgst))}</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900">{t('grandTotal')}</span>
                  <span className="text-xl font-semibold text-gray-900">{formatINR(Math.round(totals.grand))}</span>
                </div>
              </div>
            </div>

            <div className="border-b border-gray-100"></div>

            {/* Payment Method */}
            <div>
              <h3 className="text-gray-900 text-sm font-semibold uppercase tracking-wide mb-2">{t('payment')}</h3>
              <div className="grid grid-cols-4 gap-2 mb-3">
                {([
                  { id: 'cash', icon: Banknote, label: 'Cash' },
                  { id: 'upi', icon: Smartphone, label: 'UPI' },
                  { id: 'credit', icon: HandCoins, label: 'Credit' },
                  { id: 'mixed', icon: CreditCard, label: 'Mixed' },
                ] as const).map(m => (
                  <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                    className={cn('flex flex-col items-center gap-1 py-2 rounded border text-xs font-medium transition-all',
                      paymentMethod === m.id ? 'border-gray-900 bg-gray-50 text-gray-900' : 'border-gray-200 text-gray-500 hover:bg-gray-50')}>
                    <m.icon size={14} />{m.label}
                  </button>
                ))}
              </div>
              {paymentMethod === 'cash' && (
                <div className="space-y-2">
                  <input type="number" value={cashTendered} onChange={e => setCashTendered(e.target.value)}
                    placeholder="Amount tendered" className="w-full px-3 h-9 rounded-md border border-gray-200 bg-white text-sm outline-none" />
                  {change > 0 && <div className="text-sm text-gray-900 font-medium">Change: {formatINR(Math.round(change))}</div>}
                </div>
              )}
              {paymentMethod === 'upi' && (
                <div className="text-center py-2">
                  <div className="w-16 h-16 mx-auto mb-1 rounded border border-gray-200 flex items-center justify-center bg-gray-50">
                    <Smartphone size={20} className="text-gray-400" />
                  </div>
                  <p className="text-[10px] text-gray-500 uppercase">UPI QR Code</p>
                </div>
              )}
            </div>

            {/* Loyalty */}
            {selectedCustomer && selectedCustomer.loyaltyPoints > 0 && (
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <Gift size={14} className="text-gray-600" />
                  <span className="text-sm font-semibold text-gray-900 uppercase">Loyalty Points</span>
                </div>
                <p className="text-xs text-gray-500 mb-2">Balance: {selectedCustomer.loyaltyPoints} pts</p>
                <input type="range" min={0} max={Math.min(selectedCustomer.loyaltyPoints, Math.floor(totals.grand))}
                  value={loyaltyRedeem} onChange={e => setLoyaltyRedeem(Number(e.target.value))}
                  className="w-full" />
                <p className="text-xs text-gray-700 font-medium mt-1">Redeem: {loyaltyRedeem} pts = {formatINR(loyaltyRedeem)}</p>
              </div>
            )}

            {/* Notes */}
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder={language === 'hi' ? 'Notes...' : 'Add notes...'}
              className="w-full px-3 py-2 rounded-md border border-gray-200 bg-white text-sm resize-none outline-none" />

            {/* Action Buttons */}
            <button onClick={() => handleCreateBill()} disabled={items.length === 0 || saving}
              className={cn('bg-purple-700 text-white rounded w-full h-10 text-sm font-medium flex items-center justify-center gap-2', (items.length === 0 || saving) && 'opacity-50 cursor-not-allowed')}>
              {saving ? 'Saving...' : 'COMPLETE SALE'}
            </button>
          </div>
        </div>
      </div>
      <div className='text-center text-xs py-4 text-gray-400 mt-4'>Made in Jabalpur, India</div>

      {/* Barcode Scanner Modal */}
      <BarcodeScanner
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        tenantId={tenantId || ''}
        products={products}
        onProductFound={(product) => {
          addProduct(product);
          showToast(`${product.name} added!`, 'success');
        }}
      />
    </div>
  );
}
