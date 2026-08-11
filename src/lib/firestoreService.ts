/**
 * Firestore Service Layer for SHOPPIQ
 * Centralized CRUD operations with real-time listeners
 * All data is tenant-scoped: /tenants/{tenantId}/{collection}
 */

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, limit, onSnapshot, Timestamp, writeBatch, serverTimestamp,
  increment, runTransaction, type Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Product, Customer, Invoice, InvoiceItem, Payment,
  StockMovement, Category, DailySnapshot, Supplier, Expense
} from '../types/firestore';

// ============================================================
// HELPER: Get tenant-scoped collection reference
// ============================================================
function tenantCol(tenantId: string, col: string) {
  return collection(db, 'tenants', tenantId, col);
}
function tenantDoc(tenantId: string, col: string, docId: string) {
  return doc(db, 'tenants', tenantId, col, docId);
}

// ============================================================
// CATEGORIES
// ============================================================
export function subscribeCategories(
  tenantId: string,
  callback: (categories: Category[]) => void
): Unsubscribe {
  const q = query(tenantCol(tenantId, 'categories'), orderBy('displayOrder'));
  return onSnapshot(q, (snap) => {
    const categories = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
    callback(categories);
  });
}

// ============================================================
// PRODUCTS
// ============================================================
export function subscribeProducts(
  tenantId: string,
  callback: (products: Product[]) => void
): Unsubscribe {
  const q = query(tenantCol(tenantId, 'products'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const products = snap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
    callback(products);
  });
}

export async function addProduct(
  tenantId: string,
  data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const now = Timestamp.now();
  const docRef = await addDoc(tenantCol(tenantId, 'products'), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateProduct(
  tenantId: string,
  productId: string,
  data: Partial<Product>
): Promise<void> {
  await updateDoc(tenantDoc(tenantId, 'products', productId), {
    ...data,
    updatedAt: Timestamp.now(),
  });
}

export async function deleteProduct(
  tenantId: string,
  productId: string
): Promise<void> {
  // Soft delete — set isActive to false
  await updateDoc(tenantDoc(tenantId, 'products', productId), {
    isActive: false,
    updatedAt: Timestamp.now(),
  });
}

export async function adjustStock(
  tenantId: string,
  productId: string,
  productName: string,
  adjustmentQty: number,
  movementType: StockMovement['movementType'],
  notes: string,
  performedBy: string
): Promise<void> {
  const batch = writeBatch(db);

  // Update product stock
  batch.update(tenantDoc(tenantId, 'products', productId), {
    currentStock: increment(adjustmentQty),
    updatedAt: Timestamp.now(),
  });

  // Create stock movement record
  const movementRef = doc(tenantCol(tenantId, 'stockMovements'));
  batch.set(movementRef, {
    productId,
    productName,
    movementType,
    quantity: adjustmentQty,
    unitPrice: 0,
    notes,
    performedBy,
    createdAt: Timestamp.now(),
  });

  await batch.commit();
}

// ============================================================
// CUSTOMERS
// ============================================================
export function subscribeCustomers(
  tenantId: string,
  callback: (customers: Customer[]) => void
): Unsubscribe {
  const q = query(tenantCol(tenantId, 'customers'), orderBy('fullName'));
  return onSnapshot(q, (snap) => {
    const customers = snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
    callback(customers);
  });
}

export async function addCustomer(
  tenantId: string,
  data: Omit<Customer, 'id' | 'createdAt' | 'loyaltyPoints' | 'totalLifetimeValue' | 'visitCount' | 'currentOutstanding' | 'customerSegment'>
): Promise<string> {
  const docRef = await addDoc(tenantCol(tenantId, 'customers'), {
    ...data,
    loyaltyPoints: 0,
    totalLifetimeValue: 0,
    visitCount: 0,
    currentOutstanding: 0,
    customerSegment: 'new',
    isActive: true,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function updateCustomer(
  tenantId: string,
  customerId: string,
  data: Partial<Customer>
): Promise<void> {
  await updateDoc(tenantDoc(tenantId, 'customers', customerId), data);
}

// ============================================================
// INVOICES
// ============================================================
export function subscribeInvoices(
  tenantId: string,
  callback: (invoices: Invoice[]) => void,
  maxItems = 100
): Unsubscribe {
  const q = query(
    tenantCol(tenantId, 'invoices'),
    orderBy('createdAt', 'desc'),
    limit(maxItems)
  );
  return onSnapshot(q, (snap) => {
    const invoices = snap.docs.map(d => ({ id: d.id, ...d.data() } as Invoice));
    callback(invoices);
  });
}

export async function getNextInvoiceNumber(tenantId: string): Promise<string> {
  const counterRef = doc(db, 'tenants', tenantId, 'meta', 'counters');
  const year = new Date().getFullYear();

  const nextNum = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(counterRef);
    let currentCount = 0;
    if (counterSnap.exists()) {
      currentCount = counterSnap.data().invoiceCount || 0;
    }
    const newCount = currentCount + 1;
    transaction.set(counterRef, { invoiceCount: newCount }, { merge: true });
    return newCount;
  });

  return `INV-${year}-${String(nextNum).padStart(4, '0')}`;
}

export async function createInvoice(
  tenantId: string,
  invoiceData: Omit<Invoice, 'id' | 'createdAt'>,
  items: InvoiceItem[]
): Promise<string> {
  const batch = writeBatch(db);
  const now = Timestamp.now();

  // 1. Create invoice document
  const invoiceRef = doc(tenantCol(tenantId, 'invoices'));
  batch.set(invoiceRef, {
    ...invoiceData,
    items,
    createdAt: now,
  });

  // 2. Decrement stock for each item + create stock movements
  for (const item of items) {
    if (item.productId) {
      batch.update(tenantDoc(tenantId, 'products', item.productId), {
        currentStock: increment(-item.quantity),
        updatedAt: now,
      });

      const movRef = doc(tenantCol(tenantId, 'stockMovements'));
      batch.set(movRef, {
        productId: item.productId,
        productName: item.productName,
        movementType: 'sale',
        quantity: -item.quantity,
        unitPrice: item.unitPrice,
        referenceId: invoiceRef.id,
        referenceType: 'invoice',
        performedBy: tenantId,
        createdAt: now,
      });
    }
  }

  // 3. Update customer if not walk-in
  if (invoiceData.customerId) {
    const customerRef = tenantDoc(tenantId, 'customers', invoiceData.customerId);
    const updates: Record<string, any> = {
      totalLifetimeValue: increment(invoiceData.grandTotal),
      visitCount: increment(1),
      lastPurchaseAt: now,
    };

    if (invoiceData.amountPending > 0) {
      updates.currentOutstanding = increment(invoiceData.amountPending);
    }

    if (invoiceData.loyaltyPointsEarned > 0) {
      updates.loyaltyPoints = increment(invoiceData.loyaltyPointsEarned);
    }

    if (invoiceData.loyaltyPointsUsed > 0) {
      updates.loyaltyPoints = increment(-invoiceData.loyaltyPointsUsed);
    }

    batch.update(customerRef, updates);
  }

  // 4. Create payment document if amount was paid
  if (invoiceData.amountPaid > 0) {
    const paymentRef = doc(tenantCol(tenantId, 'payments'));
    batch.set(paymentRef, {
      invoiceId: invoiceRef.id,
      amount: invoiceData.amountPaid,
      paymentMethod: invoiceData.paymentMethod,
      paymentDate: now,
      notes: `Auto-created with invoice ${invoiceData.invoiceNumber}`,
      recordedBy: invoiceData.createdBy || tenantId,
      createdAt: now,
    });
  }

  await batch.commit();
  return invoiceRef.id;
}

// ============================================================
// PAYMENTS
// ============================================================
export function subscribePayments(
  tenantId: string,
  callback: (payments: Payment[]) => void
): Unsubscribe {
  const q = query(tenantCol(tenantId, 'payments'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    const payments = snap.docs.map(d => ({ id: d.id, ...d.data() } as Payment));
    callback(payments);
  });
}

export async function recordPayment(
  tenantId: string,
  invoiceId: string,
  amount: number,
  paymentMethod: Payment['paymentMethod'],
  notes: string,
  recordedBy: string
): Promise<void> {
  const now = Timestamp.now();
  const invoiceRef = tenantDoc(tenantId, 'invoices', invoiceId);
  const paymentRef = doc(tenantCol(tenantId, 'payments'));

  await runTransaction(db, async (transaction) => {
    const invoiceSnap = await transaction.get(invoiceRef);
    if (!invoiceSnap.exists()) {
      throw new Error('Invoice not found');
    }
    
    const inv = invoiceSnap.data() as Invoice;
    const newPaid = inv.amountPaid + amount;
    const newPending = inv.grandTotal - newPaid;
    const newStatus = newPending <= 0 ? 'paid' : 'partial';

    // 1. Create payment record
    transaction.set(paymentRef, {
      invoiceId,
      amount,
      paymentMethod,
      paymentDate: now,
      notes,
      recordedBy,
      createdAt: now,
    });

    // 2. Update invoice
    transaction.update(invoiceRef, {
      amountPaid: newPaid,
      amountPending: Math.max(0, newPending),
      paymentStatus: newStatus,
    });

    // 3. Update customer outstanding
    if (inv.customerId) {
      const customerRef = tenantDoc(tenantId, 'customers', inv.customerId);
      const customerSnap = await transaction.get(customerRef);
      if (customerSnap.exists()) {
        const customerData = customerSnap.data() as Customer;
        transaction.update(customerRef, {
          currentOutstanding: Math.max(0, (customerData.currentOutstanding || 0) - amount),
        });
      }
    }
  });
}

// ============================================================
// STOCK MOVEMENTS
// ============================================================
export function subscribeStockMovements(
  tenantId: string,
  callback: (movements: StockMovement[]) => void,
  maxItems = 50
): Unsubscribe {
  const q = query(
    tenantCol(tenantId, 'stockMovements'),
    orderBy('createdAt', 'desc'),
    limit(maxItems)
  );
  return onSnapshot(q, (snap) => {
    const movements = snap.docs.map(d => ({ id: d.id, ...d.data() } as StockMovement));
    callback(movements);
  });
}

// ============================================================
// DAILY SNAPSHOTS
// ============================================================
export function subscribeDailySnapshots(
  tenantId: string,
  callback: (snapshots: Array<DailySnapshot & { dateKey: string }>) => void,
  days = 30
): Unsubscribe {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startTimestamp = Timestamp.fromDate(startDate);

  const q = query(
    tenantCol(tenantId, 'dailySnapshots'),
    where('createdAt', '>=', startTimestamp),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    const snapshots = snap.docs.map(d => ({
      dateKey: d.id,
      ...(d.data() as DailySnapshot),
    }));
    callback(snapshots);
  });
}

// ============================================================
// TENANT / SETTINGS
// ============================================================
export async function updateTenantProfile(
  tenantId: string,
  data: Record<string, any>
): Promise<void> {
  await updateDoc(doc(db, 'tenants', tenantId), data);
}

// ============================================================
// SUPPLIERS
// ============================================================
export function subscribeSuppliers(
  tenantId: string,
  callback: (suppliers: Supplier[]) => void
): Unsubscribe {
  const q = query(tenantCol(tenantId, 'suppliers'), orderBy('name'));
  return onSnapshot(q, (snap) => {
    const suppliers = snap.docs.map(d => ({ id: d.id, ...d.data() } as Supplier));
    callback(suppliers);
  });
}

// ============================================================
// EXPENSES
// ============================================================
export function subscribeExpenses(
  tenantId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    tenantCol(tenantId, 'expenses'),
    orderBy('expenseDate', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const expenses = snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense));
    callback(expenses);
  });
}

export async function addExpense(tenantId: string, data: Omit<Expense, 'id' | 'createdAt'>): Promise<string> {
  const ref = collection(db, 'tenants', tenantId, 'expenses');
  const docRef = await addDoc(ref, { ...data, createdAt: serverTimestamp() });
  return docRef.id;
}

export async function deleteExpense(tenantId: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'tenants', tenantId, 'expenses', expenseId));
}
