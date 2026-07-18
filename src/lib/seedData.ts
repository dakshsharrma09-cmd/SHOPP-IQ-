import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return Timestamp.fromDate(d);
}

export const SEED_CATEGORIES = [
  { id: 'cat1', name: 'Atta/Dal/Chawal', displayOrder: 1, isActive: true },
  { id: 'cat2', name: 'Beverages', displayOrder: 2, isActive: true },
  { id: 'cat3', name: 'Snacks', displayOrder: 3, isActive: true },
  { id: 'cat4', name: 'Dairy', displayOrder: 4, isActive: true },
  { id: 'cat5', name: 'Household', displayOrder: 5, isActive: true },
];

export const SEED_PRODUCTS = [
  { id:'p1', name:'Aashirvaad Atta 10kg', nameHindi:'आशीर्वाद आटा', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'packet', purchasePrice:310, sellingPrice:345, mrp:360, gstRate:0, isGstInclusive:false, currentStock:45, minimumStockAlert:10, reorderQuantity:20, isActive:true },
  { id:'p2', name:'Toor Dal 1kg', nameHindi:'तूर दाल', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'kg', purchasePrice:105, sellingPrice:120, mrp:130, gstRate:0, isGstInclusive:false, currentStock:8, minimumStockAlert:10, reorderQuantity:25, isActive:true },
  { id:'p3', name:'India Gate Basmati 5kg', nameHindi:'इंडिया गेट चावल', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'packet', purchasePrice:380, sellingPrice:420, mrp:450, gstRate:5, isGstInclusive:false, currentStock:22, minimumStockAlert:5, reorderQuantity:15, isActive:true },
  { id:'p4', name:'Moong Dal 500g', nameHindi:'मूंग दाल', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'packet', purchasePrice:58, sellingPrice:68, mrp:75, gstRate:0, isGstInclusive:false, currentStock:30, minimumStockAlert:8, reorderQuantity:20, isActive:true },
  { id:'p5', name:'Parle-G Biscuits 800g', nameHindi:'पार्ले-जी', categoryId:'cat3', categoryName:'Snacks', unit:'packet', purchasePrice:45, sellingPrice:50, mrp:55, gstRate:12, isGstInclusive:false, currentStock:60, minimumStockAlert:15, reorderQuantity:50, isActive:true },
  { id:'p6', name:"Lay's Classic 26g", nameHindi:'लेज़ चिप्स', categoryId:'cat3', categoryName:'Snacks', unit:'piece', purchasePrice:18, sellingPrice:20, mrp:20, gstRate:12, isGstInclusive:true, currentStock:3, minimumStockAlert:10, reorderQuantity:30, isActive:true },
  { id:'p7', name:'Haldiram Bhujia 200g', nameHindi:'हल्दीराम भुजिया', categoryId:'cat3', categoryName:'Snacks', unit:'packet', purchasePrice:52, sellingPrice:60, mrp:65, gstRate:12, isGstInclusive:false, currentStock:25, minimumStockAlert:8, reorderQuantity:20, isActive:true },
  { id:'p8', name:'Thums Up 2L', nameHindi:'थम्स अप', categoryId:'cat2', categoryName:'Beverages', unit:'piece', purchasePrice:75, sellingPrice:85, mrp:90, gstRate:28, isGstInclusive:false, currentStock:18, minimumStockAlert:10, reorderQuantity:24, isActive:true },
  { id:'p9', name:'Amul Taaza Milk 1L', nameHindi:'अमूल दूध', categoryId:'cat4', categoryName:'Dairy', unit:'piece', purchasePrice:52, sellingPrice:58, mrp:60, gstRate:5, isGstInclusive:false, currentStock:2, minimumStockAlert:5, reorderQuantity:20, isActive:true },
  { id:'p10', name:'Nescafe Classic 200g', nameHindi:'नेस्काफे', categoryId:'cat2', categoryName:'Beverages', unit:'piece', purchasePrice:380, sellingPrice:420, mrp:450, gstRate:12, isGstInclusive:false, currentStock:12, minimumStockAlert:3, reorderQuantity:10, isActive:true },
  { id:'p11', name:'Amul Butter 500g', nameHindi:'अमूल मक्खन', categoryId:'cat4', categoryName:'Dairy', unit:'piece', purchasePrice:220, sellingPrice:250, mrp:270, gstRate:12, isGstInclusive:false, currentStock:8, minimumStockAlert:5, reorderQuantity:10, isActive:true },
  { id:'p12', name:'Surf Excel 1kg', nameHindi:'सर्फ एक्सेल', categoryId:'cat5', categoryName:'Household', unit:'packet', purchasePrice:145, sellingPrice:165, mrp:180, gstRate:18, isGstInclusive:false, currentStock:20, minimumStockAlert:5, reorderQuantity:15, isActive:true },
  { id:'p13', name:'Vim Bar 300g', nameHindi:'विम बार', categoryId:'cat5', categoryName:'Household', unit:'piece', purchasePrice:28, sellingPrice:35, mrp:38, gstRate:18, isGstInclusive:false, currentStock:35, minimumStockAlert:10, reorderQuantity:20, isActive:true },
  { id:'p14', name:'Sprite 1.25L', nameHindi:'स्प्राइट', categoryId:'cat2', categoryName:'Beverages', unit:'piece', purchasePrice:48, sellingPrice:55, mrp:60, gstRate:28, isGstInclusive:false, currentStock:14, minimumStockAlert:8, reorderQuantity:24, isActive:true },
  { id:'p15', name:'Mother Dairy Curd 400g', nameHindi:'मदर डेयरी दही', categoryId:'cat4', categoryName:'Dairy', unit:'piece', purchasePrice:38, sellingPrice:45, mrp:48, gstRate:5, isGstInclusive:false, currentStock:10, minimumStockAlert:5, reorderQuantity:15, isActive:true },
  { id:'p16', name:'Maggi Masala 70g', nameHindi:'मैगी मसाला', categoryId:'cat3', categoryName:'Snacks', unit:'piece', purchasePrice:12, sellingPrice:14, mrp:15, gstRate:12, isGstInclusive:false, currentStock:80, minimumStockAlert:20, reorderQuantity:50, isActive:true },
  { id:'p17', name:'Chana Dal 1kg', nameHindi:'चना दाल', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'kg', purchasePrice:78, sellingPrice:90, mrp:95, gstRate:0, isGstInclusive:false, currentStock:15, minimumStockAlert:8, reorderQuantity:20, isActive:true },
  { id:'p18', name:'Dettol Handwash 250ml', nameHindi:'डेटॉल हैंडवाश', categoryId:'cat5', categoryName:'Household', unit:'piece', purchasePrice:68, sellingPrice:80, mrp:85, gstRate:18, isGstInclusive:false, currentStock:22, minimumStockAlert:5, reorderQuantity:12, isActive:true },
  { id:'p19', name:'Amul Gold Milk 500ml', nameHindi:'अमूल गोल्ड', categoryId:'cat4', categoryName:'Dairy', unit:'piece', purchasePrice:28, sellingPrice:32, mrp:34, gstRate:5, isGstInclusive:false, currentStock:16, minimumStockAlert:10, reorderQuantity:30, isActive:true },
  { id:'p20', name:'Kurkure 40g', nameHindi:'कुरकुरे', categoryId:'cat3', categoryName:'Snacks', unit:'piece', purchasePrice:15, sellingPrice:20, mrp:20, gstRate:12, isGstInclusive:true, currentStock:50, minimumStockAlert:15, reorderQuantity:40, isActive:true },
];

export const SEED_CUSTOMERS = [
  { id:'c1', fullName:'Ravi Kumar', phoneNumber:'9876543210', city:'Jaipur', creditLimit:5000, currentOutstanding:1250, loyaltyPoints:1250, totalLifetimeValue:45000, visitCount:38, customerSegment:'vip', isActive:true },
  { id:'c2', fullName:'Priya Sharma', phoneNumber:'9123456789', city:'Jaipur', creditLimit:3000, currentOutstanding:0, loyaltyPoints:680, totalLifetimeValue:28000, visitCount:22, customerSegment:'regular', isActive:true },
  { id:'c3', fullName:'Mohan Lal', phoneNumber:'8765432109', city:'Jaipur', creditLimit:2000, currentOutstanding:800, loyaltyPoints:320, totalLifetimeValue:12000, visitCount:10, customerSegment:'regular', isActive:true },
  { id:'c4', fullName:'Sunita Devi', phoneNumber:'7654321098', city:'Jaipur', creditLimit:1000, currentOutstanding:0, loyaltyPoints:90, totalLifetimeValue:3500, visitCount:4, customerSegment:'new', isActive:true },
  { id:'c5', fullName:'Ramesh Patel', phoneNumber:'9988776655', city:'Jaipur', creditLimit:8000, currentOutstanding:3200, loyaltyPoints:2100, totalLifetimeValue:85000, visitCount:72, customerSegment:'vip', isActive:true },
  { id:'c6', fullName:'Neha Gupta', phoneNumber:'8899001122', city:'Jaipur', creditLimit:2000, currentOutstanding:0, loyaltyPoints:150, totalLifetimeValue:6000, visitCount:6, customerSegment:'new', isActive:true },
  { id:'c7', fullName:'Vikram Singh', phoneNumber:'7788990011', city:'Jaipur', creditLimit:4000, currentOutstanding:1800, loyaltyPoints:420, totalLifetimeValue:18000, visitCount:14, customerSegment:'at_risk', isActive:true },
  { id:'c8', fullName:'Anita Verma', phoneNumber:'6677889900', city:'Jaipur', creditLimit:3000, currentOutstanding:0, loyaltyPoints:890, totalLifetimeValue:35000, visitCount:29, customerSegment:'regular', isActive:true },
];

export const SEED_SUPPLIERS = [
  { id:'s1', name:'Rajasthan Wholesale Mart', phoneNumber:'9876500001', city:'Jaipur', paymentTerms:'Net 30', creditLimit:50000, currentOutstanding:12000, isActive:true },
  { id:'s2', name:'HUL Distributor Jaipur', phoneNumber:'9876500002', city:'Jaipur', paymentTerms:'Net 15', creditLimit:30000, currentOutstanding:5500, isActive:true },
  { id:'s3', name:'Amul Dairy Depot', phoneNumber:'9876500003', city:'Jaipur', paymentTerms:'Net 7', creditLimit:20000, currentOutstanding:2200, isActive:true },
];

export async function seedFirestore(tenantId: string) {
  const tenantRef = doc(db, 'tenants', tenantId);

  for (const cat of SEED_CATEGORIES) {
    await setDoc(doc(tenantRef, 'categories', cat.id), { ...cat, createdAt: Timestamp.now() });
  }
  for (const prod of SEED_PRODUCTS) {
    await setDoc(doc(tenantRef, 'products', prod.id), { ...prod, createdAt: daysAgo(60), updatedAt: Timestamp.now() });
  }
  for (const cust of SEED_CUSTOMERS) {
    await setDoc(doc(tenantRef, 'customers', cust.id), { ...cust, lastPurchaseAt: daysAgo(Math.floor(Math.random()*10)), createdAt: daysAgo(90) });
  }
  for (const sup of SEED_SUPPLIERS) {
    await setDoc(doc(tenantRef, 'suppliers', sup.id), { ...sup, createdAt: daysAgo(60) });
  }

  const invoices = [
    { id:'inv1', num:'INV-2026-0001', customer:'Ravi Kumar', phone:'9876543210', cid:'c1', total:2450, paid:2450, pending:0, status:'paid', method:'upi', da:1 },
    { id:'inv2', num:'INV-2026-0002', customer:'Priya Sharma', phone:'9123456789', cid:'c2', total:1850, paid:1850, pending:0, status:'paid', method:'cash', da:2 },
    { id:'inv3', num:'INV-2026-0003', customer:'Ramesh Patel', phone:'9988776655', cid:'c5', total:5200, paid:2000, pending:3200, status:'partial', method:'mixed', da:3 },
    { id:'inv4', num:'INV-2026-0004', customer:'Mohan Lal', phone:'8765432109', cid:'c3', total:950, paid:0, pending:950, status:'unpaid', method:'credit', da:5 },
    { id:'inv5', num:'INV-2026-0005', customer:'Walk-in', phone:'', cid:'', total:340, paid:340, pending:0, status:'paid', method:'cash', da:5 },
    { id:'inv6', num:'INV-2026-0006', customer:'Anita Verma', phone:'6677889900', cid:'c8', total:3100, paid:3100, pending:0, status:'paid', method:'upi', da:7 },
    { id:'inv7', num:'INV-2026-0007', customer:'Vikram Singh', phone:'7788990011', cid:'c7', total:1800, paid:0, pending:1800, status:'overdue', method:'credit', da:15 },
    { id:'inv8', num:'INV-2026-0008', customer:'Sunita Devi', phone:'7654321098', cid:'c4', total:620, paid:620, pending:0, status:'paid', method:'cash', da:8 },
    { id:'inv9', num:'INV-2026-0009', customer:'Neha Gupta', phone:'8899001122', cid:'c6', total:1200, paid:1200, pending:0, status:'paid', method:'upi', da:9 },
    { id:'inv10', num:'INV-2026-0010', customer:'Ravi Kumar', phone:'9876543210', cid:'c1', total:890, paid:890, pending:0, status:'paid', method:'cash', da:10 },
    { id:'inv11', num:'INV-2026-0011', customer:'Ramesh Patel', phone:'9988776655', cid:'c5', total:4100, paid:4100, pending:0, status:'paid', method:'upi', da:12 },
    { id:'inv12', num:'INV-2026-0012', customer:'Walk-in', phone:'', cid:'', total:780, paid:780, pending:0, status:'paid', method:'cash', da:14 },
    { id:'inv13', num:'INV-2026-0013', customer:'Priya Sharma', phone:'9123456789', cid:'c2', total:2300, paid:2300, pending:0, status:'paid', method:'upi', da:18 },
    { id:'inv14', num:'INV-2026-0014', customer:'Mohan Lal', phone:'8765432109', cid:'c3', total:560, paid:560, pending:0, status:'paid', method:'cash', da:20 },
    { id:'inv15', num:'INV-2026-0015', customer:'Anita Verma', phone:'6677889900', cid:'c8', total:1950, paid:1950, pending:0, status:'paid', method:'upi', da:25 },
  ];
  for (const inv of invoices) {
    await setDoc(doc(tenantRef, 'invoices', inv.id), {
      invoiceNumber: inv.num, invoiceType:'sale', customerId: inv.cid,
      customerName: inv.customer, customerPhone: inv.phone,
      items:[], subtotal: inv.total, discountAmount:0, cgstTotal:0, sgstTotal:0,
      grandTotal: inv.total, amountPaid: inv.paid, amountPending: inv.pending,
      paymentStatus: inv.status, paymentMethod: inv.method,
      loyaltyPointsUsed:0, loyaltyPointsEarned: Math.floor(inv.total/100),
      whatsappSent:false, createdBy: tenantId,
      invoiceDate: daysAgo(inv.da), createdAt: daysAgo(inv.da),
    });
  }

  const salesPattern = [8950,7200,11400,9800,6500,5200,13200,10500,8900,7600,12000,9200,8100,6800,11500,10200,9400,8200,7500,13800,11200,9600,8400,7100,12500,10800,9100,7800,6300,8950];
  for (let i = 0; i < 30; i++) {
    const dateKey = new Date();
    dateKey.setDate(dateKey.getDate() - (29 - i));
    const key = dateKey.toISOString().split('T')[0];
    const sales = salesPattern[i];
    await setDoc(doc(tenantRef, 'dailySnapshots', key), {
      totalSales: sales, invoiceCount: Math.floor(sales/400),
      totalCustomers: Math.floor(Math.random()*5)+8, newCustomers: Math.floor(Math.random()*3),
      totalExpenses: Math.floor(sales*0.12), grossProfit: Math.floor(sales*0.22),
      cashCollected: Math.floor(sales*0.45), upiCollected: Math.floor(sales*0.55),
      outstandingReceivables:7250, stockAlertsCount:4,
      topProductName:'Parle-G Biscuits', topProductRevenue: Math.floor(sales*0.08),
      createdAt: Timestamp.fromDate(dateKey),
    });
  }
  console.log('✅ Seed complete!');
}
