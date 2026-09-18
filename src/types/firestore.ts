import { Timestamp } from 'firebase/firestore';

// ============================
// TENANT (Business)
// ============================
export interface Tenant {
  id: string;
  businessName: string;
  businessNameHindi?: string;
  ownerName: string;
  phoneNumber: string;
  whatsappNumber: string;
  gstin?: string;
  businessType: 'kirana' | 'grocery' | 'pharmacy' | 'electronics' | 'clothing' | 'restaurant' | 'other';
  city: string;
  state: string;
  pincode: string;
  email?: string;
  address?: string;
  subscriptionPlan: 'free' | 'starter' | 'pro';
  trialEndsAt?: Timestamp;
  logoUrl?: string;
  isMsmeRegistered: boolean;
  vyapaarScore: number;
  languagePreference: 'hi' | 'en';
  createdAt: Timestamp;
}

// ============================
// CATEGORY
// ============================
export interface Category {
  id: string;
  name: string;
  iconUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: Timestamp;
}

// ============================
// PRODUCT
// ============================
export interface Product {
  id: string;
  name: string;
  nameHindi?: string;
  barcode?: string;
  sku?: string;
  hsnCode?: string;
  categoryId: string;
  categoryName?: string;
  unit: 'kg' | 'g' | 'litre' | 'ml' | 'piece' | 'dozen' | 'box' | 'packet' | 'set' | 'pair' | 'bundle' | 'meter' | 'other';
  purchasePrice: number;
  sellingPrice: number;
  mrp: number;
  gstRate: 0 | 5 | 12 | 18 | 28;
  isGstInclusive: boolean;
  currentStock: number;
  minimumStockAlert: number;
  reorderQuantity: number;
  supplierId?: string;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ============================
// CUSTOMER
// ============================
export interface Customer {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  city?: string;
  gstin?: string;
  creditLimit: number;
  currentOutstanding: number;
  loyaltyPoints: number;
  totalLifetimeValue: number;
  visitCount: number;
  lastPurchaseAt?: Timestamp;
  customerSegment: 'regular' | 'vip' | 'new' | 'at_risk';
  isActive: boolean;
  notes?: string;
  createdAt: Timestamp;
}

// ============================
// INVOICE ITEM
// ============================
export interface InvoiceItem {
  productId: string;
  productName: string;
  hsnCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discountPercent: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  totalAmount: number;
}

// ============================
// INVOICE
// ============================
export interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceType: 'sale' | 'estimate' | 'credit_note';
  customerId?: string;
  customerName: string;
  customerPhone: string;
  invoiceDate: Timestamp;
  dueDate?: Timestamp;
  items: InvoiceItem[];
  subtotal: number;
  discountAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  grandTotal: number;
  amountPaid: number;
  amountPending: number;
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overdue';
  paymentMethod: 'cash' | 'upi' | 'card' | 'credit' | 'mixed';
  upiTransactionId?: string;
  loyaltyPointsUsed: number;
  loyaltyPointsEarned: number;
  whatsappSent: boolean;
  notes?: string;
  createdBy: string;
  createdAt: Timestamp;
}

// ============================
// STOCK MOVEMENT
// ============================
export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  movementType: 'purchase' | 'sale' | 'return' | 'adjustment_add' | 'adjustment_remove' | 'damaged';
  quantity: number;
  unitPrice: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  performedBy: string;
  createdAt: Timestamp;
}

// ============================
// PAYMENT
// ============================
export interface Payment {
  id: string;
  invoiceId: string;
  amount: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'credit' | 'mixed';
  paymentDate: Timestamp;
  upiReferenceId?: string;
  notes?: string;
  recordedBy: string;
  createdAt: Timestamp;
}

// ============================
// EXPENSE
// ============================
export interface Expense {
  id: string;
  categoryName: string;
  amount: number;
  description: string;
  expenseDate: Timestamp;
  paymentMethod: string;
  receiptUrl?: string;
  vendorName?: string;
  recordedBy: string;
  createdAt: Timestamp;
}

// ============================
// DAILY SNAPSHOT
// ============================
export interface DailySnapshot {
  totalSales: number;
  invoiceCount: number;
  totalCustomers: number;
  newCustomers: number;
  totalExpenses: number;
  grossProfit: number;
  cashCollected: number;
  upiCollected: number;
  outstandingReceivables: number;
  stockAlertsCount: number;
  topProductId?: string;
  topProductName?: string;
  topProductRevenue: number;
  createdAt: Timestamp;
}

// ============================
// SUPPLIER
// ============================
export interface Supplier {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  paymentTerms?: string;
  creditLimit: number;
  currentOutstanding: number;
  isActive: boolean;
  createdAt: Timestamp;
}

// ============================
// LOYALTY TRANSACTION
// ============================
export interface LoyaltyTransaction {
  id: string;
  customerId: string;
  invoiceId?: string;
  transactionType: 'earn' | 'redeem' | 'bonus';
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: Timestamp;
}
