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
  { id: 'cat6', name: 'Personal Care', displayOrder: 6, isActive: true },
  { id: 'cat7', name: 'Health', displayOrder: 7, isActive: true },
];

// 20 products — Sharma General Store, Jabalpur MP
export const SEED_PRODUCTS = [
  { id:'p1', name:'Aata 10kg', nameHindi:'आटा 10 किलो', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'packet', purchasePrice:380, sellingPrice:450, mrp:470, gstRate:0, isGstInclusive:false, currentStock:45, minimumStockAlert:10, reorderQuantity:20, isActive:true },
  { id:'p2', name:'Parle-G 200g', nameHindi:'पार्ले-जी', categoryId:'cat3', categoryName:'Snacks', unit:'piece', purchasePrice:10, sellingPrice:12, mrp:12, gstRate:12, isGstInclusive:true, currentStock:120, minimumStockAlert:20, reorderQuantity:50, isActive:true },
  { id:'p3', name:'Tata Salt 1kg', nameHindi:'टाटा नमक', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'packet', purchasePrice:20, sellingPrice:24, mrp:25, gstRate:0, isGstInclusive:false, currentStock:80, minimumStockAlert:15, reorderQuantity:30, isActive:true },
  { id:'p4', name:'Amul Butter 500g', nameHindi:'अमूल मक्खन', categoryId:'cat4', categoryName:'Dairy', unit:'piece', purchasePrice:240, sellingPrice:280, mrp:290, gstRate:12, isGstInclusive:false, currentStock:15, minimumStockAlert:20, reorderQuantity:10, isActive:true },
  { id:'p5', name:'Surf Excel 1kg', nameHindi:'सर्फ एक्सेल', categoryId:'cat5', categoryName:'Household', unit:'packet', purchasePrice:185, sellingPrice:220, mrp:230, gstRate:18, isGstInclusive:false, currentStock:30, minimumStockAlert:8, reorderQuantity:15, isActive:true },
  { id:'p6', name:'Maggi 70g', nameHindi:'मैगी', categoryId:'cat3', categoryName:'Snacks', unit:'piece', purchasePrice:12, sellingPrice:14, mrp:15, gstRate:12, isGstInclusive:false, currentStock:200, minimumStockAlert:30, reorderQuantity:100, isActive:true },
  { id:'p7', name:'Colgate 200g', nameHindi:'कोलगेट', categoryId:'cat6', categoryName:'Personal Care', unit:'piece', purchasePrice:82, sellingPrice:98, mrp:105, gstRate:18, isGstInclusive:false, currentStock:25, minimumStockAlert:10, reorderQuantity:20, isActive:true },
  { id:'p8', name:'Rice 5kg', nameHindi:'चावल 5 किलो', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'packet', purchasePrice:275, sellingPrice:320, mrp:340, gstRate:5, isGstInclusive:false, currentStock:60, minimumStockAlert:10, reorderQuantity:20, isActive:true },
  { id:'p9', name:'Dal Chana 1kg', nameHindi:'चना दाल', categoryId:'cat1', categoryName:'Atta/Dal/Chawal', unit:'kg', purchasePrice:90, sellingPrice:110, mrp:120, gstRate:0, isGstInclusive:false, currentStock:40, minimumStockAlert:10, reorderQuantity:20, isActive:true },
  { id:'p10', name:'Dettol Soap', nameHindi:'डेटॉल साबुन', categoryId:'cat6', categoryName:'Personal Care', unit:'piece', purchasePrice:38, sellingPrice:48, mrp:52, gstRate:18, isGstInclusive:false, currentStock:0, minimumStockAlert:10, reorderQuantity:20, isActive:true },
  { id:'p11', name:'Lays 26g', nameHindi:'लेज़', categoryId:'cat3', categoryName:'Snacks', unit:'piece', purchasePrice:17, sellingPrice:20, mrp:20, gstRate:12, isGstInclusive:true, currentStock:150, minimumStockAlert:20, reorderQuantity:50, isActive:true },
  { id:'p12', name:'Frooti 200ml', nameHindi:'फ्रूटी', categoryId:'cat2', categoryName:'Beverages', unit:'piece', purchasePrice:16, sellingPrice:20, mrp:20, gstRate:12, isGstInclusive:true, currentStock:90, minimumStockAlert:15, reorderQuantity:40, isActive:true },
  { id:'p13', name:'Bisleri 1L', nameHindi:'बिसलेरी', categoryId:'cat2', categoryName:'Beverages', unit:'piece', purchasePrice:16, sellingPrice:20, mrp:20, gstRate:18, isGstInclusive:true, currentStock:48, minimumStockAlert:10, reorderQuantity:24, isActive:true },
  { id:'p14', name:'Vim Bar', nameHindi:'विम बार', categoryId:'cat5', categoryName:'Household', unit:'piece', purchasePrice:28, sellingPrice:35, mrp:38, gstRate:18, isGstInclusive:false, currentStock:55, minimumStockAlert:10, reorderQuantity:20, isActive:true },
  { id:'p15', name:'Lifebuoy Soap', nameHindi:'लाइफबॉय', categoryId:'cat6', categoryName:'Personal Care', unit:'piece', purchasePrice:36, sellingPrice:45, mrp:48, gstRate:18, isGstInclusive:false, currentStock:70, minimumStockAlert:15, reorderQuantity:30, isActive:true },
  { id:'p16', name:'Boost 500g', nameHindi:'बूस्ट', categoryId:'cat2', categoryName:'Beverages', unit:'piece', purchasePrice:265, sellingPrice:310, mrp:320, gstRate:12, isGstInclusive:false, currentStock:12, minimumStockAlert:15, reorderQuantity:10, isActive:true },
  { id:'p17', name:'Hajmola', nameHindi:'हाजमोला', categoryId:'cat7', categoryName:'Health', unit:'piece', purchasePrice:4, sellingPrice:5, mrp:5, gstRate:12, isGstInclusive:true, currentStock:200, minimumStockAlert:30, reorderQuantity:100, isActive:true },
  { id:'p18', name:'Chewmint', nameHindi:'च्यूमिंट', categoryId:'cat3', categoryName:'Snacks', unit:'piece', purchasePrice:1.5, sellingPrice:2, mrp:2, gstRate:12, isGstInclusive:true, currentStock:500, minimumStockAlert:50, reorderQuantity:200, isActive:true },
  { id:'p19', name:'Amul Milk 500ml', nameHindi:'अमूल दूध', categoryId:'cat4', categoryName:'Dairy', unit:'piece', purchasePrice:25, sellingPrice:30, mrp:32, gstRate:5, isGstInclusive:false, currentStock:20, minimumStockAlert:10, reorderQuantity:30, isActive:true },
  { id:'p20', name:'Eno 100g', nameHindi:'ईनो', categoryId:'cat7', categoryName:'Health', unit:'piece', purchasePrice:78, sellingPrice:95, mrp:100, gstRate:12, isGstInclusive:false, currentStock:30, minimumStockAlert:8, reorderQuantity:15, isActive:true },
];

// 8 customers — Sharma General Store, Jabalpur MP
export const SEED_CUSTOMERS = [
  { id:'c1', fullName:'Ramesh Kumar', phoneNumber:'9876543210', city:'Jabalpur', creditLimit:5000, currentOutstanding:1200, loyaltyPoints:850, totalLifetimeValue:42000, visitCount:35, customerSegment:'vip' as const, isActive:true },
  { id:'c2', fullName:'Sunita Devi', phoneNumber:'9765432109', city:'Jabalpur', creditLimit:3000, currentOutstanding:0, loyaltyPoints:450, totalLifetimeValue:22000, visitCount:20, customerSegment:'regular' as const, isActive:true },
  { id:'c3', fullName:'Mohan Lal', phoneNumber:'9654321098', city:'Jabalpur', creditLimit:8000, currentOutstanding:0, loyaltyPoints:1800, totalLifetimeValue:75000, visitCount:65, customerSegment:'vip' as const, isActive:true },
  { id:'c4', fullName:'Priya Sharma', phoneNumber:'9543210987', city:'Jabalpur', creditLimit:2000, currentOutstanding:0, loyaltyPoints:120, totalLifetimeValue:4800, visitCount:5, customerSegment:'new' as const, isActive:true },
  { id:'c5', fullName:'Rajesh Gupta', phoneNumber:'9432109876', city:'Jabalpur', creditLimit:6000, currentOutstanding:2500, loyaltyPoints:680, totalLifetimeValue:35000, visitCount:28, customerSegment:'regular' as const, isActive:true },
  { id:'c6', fullName:'Anita Singh', phoneNumber:'9321098765', city:'Jabalpur', creditLimit:3000, currentOutstanding:0, loyaltyPoints:320, totalLifetimeValue:15000, visitCount:14, customerSegment:'regular' as const, isActive:true },
  { id:'c7', fullName:'Deepak Verma', phoneNumber:'9210987654', city:'Jabalpur', creditLimit:4000, currentOutstanding:0, loyaltyPoints:180, totalLifetimeValue:8000, visitCount:8, customerSegment:'at_risk' as const, isActive:true },
  { id:'c8', fullName:'Kavita Patel', phoneNumber:'9109876543', city:'Jabalpur', creditLimit:5000, currentOutstanding:0, loyaltyPoints:1250, totalLifetimeValue:55000, visitCount:48, customerSegment:'vip' as const, isActive:true },
];

export const SEED_SUPPLIERS = [
  { id:'s1', name:'Jabalpur Wholesale Mart', phoneNumber:'9876500001', city:'Jabalpur', paymentTerms:'Net 30', creditLimit:50000, currentOutstanding:12000, isActive:true },
  { id:'s2', name:'HUL Distributor Jabalpur', phoneNumber:'9876500002', city:'Jabalpur', paymentTerms:'Net 15', creditLimit:30000, currentOutstanding:5500, isActive:true },
  { id:'s3', name:'Amul Dairy Depot', phoneNumber:'9876500003', city:'Jabalpur', paymentTerms:'Net 7', creditLimit:20000, currentOutstanding:2200, isActive:true },
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

  // 15 invoices — last 30 days, mix of paid/unpaid/overdue
  const invoiceData = [
    { id:'inv1', num:'INV-2026-0001', cust:'Ramesh Kumar', phone:'9876543210', cid:'c1', items:[
      {productId:'p1',productName:'Aata 10kg',quantity:2,unit:'packet',unitPrice:450,discountPercent:0,gstRate:0,cgstAmount:0,sgstAmount:0,totalAmount:900},
      {productId:'p6',productName:'Maggi 70g',quantity:10,unit:'piece',unitPrice:14,discountPercent:0,gstRate:12,cgstAmount:8.4,sgstAmount:8.4,totalAmount:156.8},
    ], subtotal:1040, discount:0, cgst:8.4, sgst:8.4, grand:1056.8, paid:1056.8, pending:0, status:'paid', method:'upi', da:1 },
    { id:'inv2', num:'INV-2026-0002', cust:'Sunita Devi', phone:'9765432109', cid:'c2', items:[
      {productId:'p5',productName:'Surf Excel 1kg',quantity:2,unit:'packet',unitPrice:220,discountPercent:0,gstRate:18,cgstAmount:39.6,sgstAmount:39.6,totalAmount:519.2},
      {productId:'p15',productName:'Lifebuoy Soap',quantity:4,unit:'piece',unitPrice:45,discountPercent:0,gstRate:18,cgstAmount:16.2,sgstAmount:16.2,totalAmount:212.4},
    ], subtotal:620, discount:0, cgst:55.8, sgst:55.8, grand:731.6, paid:731.6, pending:0, status:'paid', method:'cash', da:2 },
    { id:'inv3', num:'INV-2026-0003', cust:'Rajesh Gupta', phone:'9432109876', cid:'c5', items:[
      {productId:'p8',productName:'Rice 5kg',quantity:3,unit:'packet',unitPrice:320,discountPercent:0,gstRate:5,cgstAmount:24,sgstAmount:24,totalAmount:1008},
      {productId:'p9',productName:'Dal Chana 1kg',quantity:5,unit:'kg',unitPrice:110,discountPercent:0,gstRate:0,cgstAmount:0,sgstAmount:0,totalAmount:550},
      {productId:'p4',productName:'Amul Butter 500g',quantity:2,unit:'piece',unitPrice:280,discountPercent:0,gstRate:12,cgstAmount:33.6,sgstAmount:33.6,totalAmount:627.2},
    ], subtotal:1510, discount:0, cgst:57.6, sgst:57.6, grand:2185.2, paid:0, pending:2185.2, status:'unpaid', method:'credit', da:3 },
    { id:'inv4', num:'INV-2026-0004', cust:'Mohan Lal', phone:'9654321098', cid:'c3', items:[
      {productId:'p16',productName:'Boost 500g',quantity:1,unit:'piece',unitPrice:310,discountPercent:0,gstRate:12,cgstAmount:18.6,sgstAmount:18.6,totalAmount:347.2},
      {productId:'p19',productName:'Amul Milk 500ml',quantity:4,unit:'piece',unitPrice:30,discountPercent:0,gstRate:5,cgstAmount:3,sgstAmount:3,totalAmount:126},
    ], subtotal:430, discount:0, cgst:21.6, sgst:21.6, grand:473.2, paid:473.2, pending:0, status:'paid', method:'upi', da:4 },
    { id:'inv5', num:'INV-2026-0005', cust:'Walk-in', phone:'', cid:'', items:[
      {productId:'p2',productName:'Parle-G 200g',quantity:5,unit:'piece',unitPrice:12,discountPercent:0,gstRate:12,cgstAmount:0,sgstAmount:0,totalAmount:60},
      {productId:'p12',productName:'Frooti 200ml',quantity:3,unit:'piece',unitPrice:20,discountPercent:0,gstRate:12,cgstAmount:0,sgstAmount:0,totalAmount:60},
      {productId:'p17',productName:'Hajmola',quantity:10,unit:'piece',unitPrice:5,discountPercent:0,gstRate:12,cgstAmount:0,sgstAmount:0,totalAmount:50},
    ], subtotal:170, discount:0, cgst:0, sgst:0, grand:170, paid:170, pending:0, status:'paid', method:'cash', da:5 },
    { id:'inv6', num:'INV-2026-0006', cust:'Kavita Patel', phone:'9109876543', cid:'c8', items:[
      {productId:'p1',productName:'Aata 10kg',quantity:1,unit:'packet',unitPrice:450,discountPercent:0,gstRate:0,cgstAmount:0,sgstAmount:0,totalAmount:450},
      {productId:'p3',productName:'Tata Salt 1kg',quantity:3,unit:'packet',unitPrice:24,discountPercent:0,gstRate:0,cgstAmount:0,sgstAmount:0,totalAmount:72},
      {productId:'p7',productName:'Colgate 200g',quantity:2,unit:'piece',unitPrice:98,discountPercent:0,gstRate:18,cgstAmount:17.64,sgstAmount:17.64,totalAmount:231.28},
    ], subtotal:718, discount:0, cgst:17.64, sgst:17.64, grand:753.28, paid:753.28, pending:0, status:'paid', method:'upi', da:7 },
    { id:'inv7', num:'INV-2026-0007', cust:'Deepak Verma', phone:'9210987654', cid:'c7', items:[
      {productId:'p5',productName:'Surf Excel 1kg',quantity:1,unit:'packet',unitPrice:220,discountPercent:0,gstRate:18,cgstAmount:19.8,sgstAmount:19.8,totalAmount:259.6},
    ], subtotal:220, discount:0, cgst:19.8, sgst:19.8, grand:259.6, paid:0, pending:259.6, status:'overdue', method:'credit', da:20 },
    { id:'inv8', num:'INV-2026-0008', cust:'Priya Sharma', phone:'9543210987', cid:'c4', items:[
      {productId:'p11',productName:'Lays 26g',quantity:10,unit:'piece',unitPrice:20,discountPercent:0,gstRate:12,cgstAmount:0,sgstAmount:0,totalAmount:200},
      {productId:'p13',productName:'Bisleri 1L',quantity:6,unit:'piece',unitPrice:20,discountPercent:0,gstRate:18,cgstAmount:0,sgstAmount:0,totalAmount:120},
    ], subtotal:320, discount:0, cgst:0, sgst:0, grand:320, paid:320, pending:0, status:'paid', method:'cash', da:8 },
    { id:'inv9', num:'INV-2026-0009', cust:'Ramesh Kumar', phone:'9876543210', cid:'c1', items:[
      {productId:'p8',productName:'Rice 5kg',quantity:2,unit:'packet',unitPrice:320,discountPercent:0,gstRate:5,cgstAmount:16,sgstAmount:16,totalAmount:672},
      {productId:'p14',productName:'Vim Bar',quantity:3,unit:'piece',unitPrice:35,discountPercent:0,gstRate:18,cgstAmount:9.45,sgstAmount:9.45,totalAmount:123.9},
    ], subtotal:745, discount:0, cgst:25.45, sgst:25.45, grand:795.9, paid:0, pending:795.9, status:'unpaid', method:'credit', da:10 },
    { id:'inv10', num:'INV-2026-0010', cust:'Anita Singh', phone:'9321098765', cid:'c6', items:[
      {productId:'p20',productName:'Eno 100g',quantity:2,unit:'piece',unitPrice:95,discountPercent:0,gstRate:12,cgstAmount:11.4,sgstAmount:11.4,totalAmount:212.8},
      {productId:'p6',productName:'Maggi 70g',quantity:5,unit:'piece',unitPrice:14,discountPercent:0,gstRate:12,cgstAmount:4.2,sgstAmount:4.2,totalAmount:78.4},
    ], subtotal:260, discount:0, cgst:15.6, sgst:15.6, grand:291.2, paid:291.2, pending:0, status:'paid', method:'upi', da:12 },
    { id:'inv11', num:'INV-2026-0011', cust:'Mohan Lal', phone:'9654321098', cid:'c3', items:[
      {productId:'p1',productName:'Aata 10kg',quantity:3,unit:'packet',unitPrice:450,discountPercent:0,gstRate:0,cgstAmount:0,sgstAmount:0,totalAmount:1350},
      {productId:'p9',productName:'Dal Chana 1kg',quantity:3,unit:'kg',unitPrice:110,discountPercent:0,gstRate:0,cgstAmount:0,sgstAmount:0,totalAmount:330},
      {productId:'p5',productName:'Surf Excel 1kg',quantity:2,unit:'packet',unitPrice:220,discountPercent:0,gstRate:18,cgstAmount:39.6,sgstAmount:39.6,totalAmount:519.2},
    ], subtotal:2010, discount:0, cgst:39.6, sgst:39.6, grand:2089.2, paid:2089.2, pending:0, status:'paid', method:'cash', da:14 },
    { id:'inv12', num:'INV-2026-0012', cust:'Rajesh Gupta', phone:'9432109876', cid:'c5', items:[
      {productId:'p4',productName:'Amul Butter 500g',quantity:1,unit:'piece',unitPrice:280,discountPercent:0,gstRate:12,cgstAmount:16.8,sgstAmount:16.8,totalAmount:313.6},
    ], subtotal:280, discount:0, cgst:16.8, sgst:16.8, grand:313.6, paid:0, pending:313.6, status:'overdue', method:'credit', da:22 },
    { id:'inv13', num:'INV-2026-0013', cust:'Kavita Patel', phone:'9109876543', cid:'c8', items:[
      {productId:'p16',productName:'Boost 500g',quantity:2,unit:'piece',unitPrice:310,discountPercent:0,gstRate:12,cgstAmount:37.2,sgstAmount:37.2,totalAmount:694.4},
      {productId:'p19',productName:'Amul Milk 500ml',quantity:6,unit:'piece',unitPrice:30,discountPercent:0,gstRate:5,cgstAmount:4.5,sgstAmount:4.5,totalAmount:189},
    ], subtotal:800, discount:0, cgst:41.7, sgst:41.7, grand:883.4, paid:883.4, pending:0, status:'paid', method:'upi', da:18 },
    { id:'inv14', num:'INV-2026-0014', cust:'Sunita Devi', phone:'9765432109', cid:'c2', items:[
      {productId:'p15',productName:'Lifebuoy Soap',quantity:6,unit:'piece',unitPrice:45,discountPercent:0,gstRate:18,cgstAmount:24.3,sgstAmount:24.3,totalAmount:318.6},
      {productId:'p7',productName:'Colgate 200g',quantity:1,unit:'piece',unitPrice:98,discountPercent:0,gstRate:18,cgstAmount:8.82,sgstAmount:8.82,totalAmount:115.64},
    ], subtotal:368, discount:0, cgst:33.12, sgst:33.12, grand:434.24, paid:0, pending:434.24, status:'overdue', method:'credit', da:25 },
    { id:'inv15', num:'INV-2026-0015', cust:'Walk-in', phone:'', cid:'', items:[
      {productId:'p18',productName:'Chewmint',quantity:20,unit:'piece',unitPrice:2,discountPercent:0,gstRate:12,cgstAmount:0,sgstAmount:0,totalAmount:40},
      {productId:'p2',productName:'Parle-G 200g',quantity:3,unit:'piece',unitPrice:12,discountPercent:0,gstRate:12,cgstAmount:0,sgstAmount:0,totalAmount:36},
      {productId:'p12',productName:'Frooti 200ml',quantity:5,unit:'piece',unitPrice:20,discountPercent:0,gstRate:12,cgstAmount:0,sgstAmount:0,totalAmount:100},
    ], subtotal:176, discount:0, cgst:0, sgst:0, grand:176, paid:176, pending:0, status:'paid', method:'cash', da:28 },
  ];

  for (const inv of invoiceData) {
    await setDoc(doc(tenantRef, 'invoices', inv.id), {
      invoiceNumber: inv.num, invoiceType:'sale', customerId: inv.cid,
      customerName: inv.cust, customerPhone: inv.phone,
      items: inv.items,
      subtotal: inv.subtotal, discountAmount: inv.discount,
      cgstTotal: inv.cgst, sgstTotal: inv.sgst,
      grandTotal: inv.grand, amountPaid: inv.paid, amountPending: inv.pending,
      paymentStatus: inv.status, paymentMethod: inv.method,
      loyaltyPointsUsed:0, loyaltyPointsEarned: Math.floor(inv.grand / 10),
      whatsappSent:false, createdBy: tenantId,
      invoiceDate: daysAgo(inv.da), createdAt: daysAgo(inv.da),
    });
  }

  // 30-day sales pattern for chart
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
      outstandingReceivables:3989, stockAlertsCount:3,
      topProductName:'Aata 10kg', topProductRevenue: Math.floor(sales*0.12),
      createdAt: Timestamp.fromDate(dateKey),
    });
  }

  // Seed some expenses
  const expenses = [
    { id:'exp1', category:'rent', description:'Dukaan kiraya - August', amount:8000, date: daysAgo(1) },
    { id:'exp2', category:'electricity', description:'Bijli ka bill - July', amount:2400, date: daysAgo(5) },
    { id:'exp3', category:'salary', description:'Helper salary - Raju', amount:6000, date: daysAgo(2) },
    { id:'exp4', category:'transport', description:'Maal dhulai - wholesale market', amount:800, date: daysAgo(8) },
    { id:'exp5', category:'raw_material', description:'Packaging bags', amount:500, date: daysAgo(12) },
    { id:'exp6', category:'other', description:'Dukaan safai supplies', amount:350, date: daysAgo(15) },
  ];
  for (const exp of expenses) {
    await setDoc(doc(tenantRef, 'expenses', exp.id), {
      ...exp, createdAt: exp.date, createdBy: tenantId,
    });
  }

  console.log('✅ Seed complete! Sharma General Store — Jabalpur');
}
