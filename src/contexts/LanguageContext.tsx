import React, { createContext, useContext, useState, useCallback } from 'react';

type Language = 'hi' | 'en';

interface Translations {
  [key: string]: string;
}

const strings: Record<Language, Translations> = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    billing: 'Billing',
    inventory: 'Inventory',
    customers: 'Customers',
    payments: 'Payments',
    loyalty: 'Loyalty',
    analytics: 'Analytics',
    expenses: 'Expenses',
    gst: 'GST',
    settings: 'Settings',

    // Common actions
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    print: 'Print',
    download: 'Download',
    send: 'Send',
    back: 'Back',
    next: 'Next',
    close: 'Close',
    confirm: 'Confirm',
    loading: 'Loading...',

    // Dashboard
    todaySales: "Today's Sales",
    pendingPayments: 'Pending Payments',
    lowStock: 'Low Stock',
    newCustomers: 'New Customers',
    salesTrend: 'Sales Trend',
    revenueByCategory: 'Revenue by Category',
    topProducts: 'Top Products Today',
    recentInvoices: 'Recent Invoices',
    quickActions: 'Quick Actions',
    vyapaarScore: 'Vyapaar Score',

    // Billing
    createInvoice: 'Create Invoice',
    addProduct: 'Add Product',
    customer: 'Customer',
    product: 'Product',
    quantity: 'Quantity',
    price: 'Price',
    discount: 'Discount',
    gstAmount: 'GST',
    total: 'Total',
    subtotal: 'Subtotal',
    grandTotal: 'Grand Total',
    payment: 'Payment',
    cash: 'Cash',
    upi: 'UPI',
    credit: 'Credit',
    mixed: 'Mixed',
    notes: 'Notes',
    createBill: 'Create Bill & Send WhatsApp',
    saveOnly: 'Save Only',

    // Inventory
    products: 'Products',
    stockMovements: 'Stock Movements',
    addProduct2: 'Add Product',
    bulkImport: 'Bulk Import CSV',
    category: 'Category',
    stockStatus: 'Stock Status',
    allProducts: 'All',
    lowStockItems: 'Low Stock',
    outOfStock: 'Out of Stock',
    normalStock: 'Normal',
    adjustStock: 'Adjust Stock',
    purchasePrice: 'Purchase Price',
    sellingPrice: 'Selling Price',
    mrp: 'MRP',
    gstRate: 'GST Rate',
    currentStock: 'Current Stock',
    minStock: 'Min Stock Alert',

    // Customers
    allCustomers: 'All',
    vipCustomers: 'VIP',
    regularCustomers: 'Regular',
    newCustomersTab: 'New',
    atRisk: 'At Risk',
    totalSpent: 'Total Spent',
    loyaltyPoints: 'Loyalty Points',
    lastPurchase: 'Last Purchase',
    visits: 'Visits',
    outstanding: 'Outstanding',

    // Payments
    allPayments: 'All Payments',
    pendingDues: 'Outstanding',
    reminders: 'Reminders',
    recordPayment: 'Record Payment',
    daysOverdue: 'Days Overdue',
    whatsappRemind: 'WhatsApp Remind',
    bulkRemind: 'Bulk Remind',

    // Analytics
    today: 'Today',
    last7Days: '7 Days',
    last30Days: '30 Days',
    last3Months: '3 Months',
    custom: 'Custom',
    totalRevenue: 'Total Revenue',
    grossProfit: 'Gross Profit',
    avgOrderValue: 'Avg Order Value',
    activeCustomers: 'Active Customers',

    // GST
    gstSummary: 'GST Summary',
    gstr1Ready: 'GSTR-1 Ready',
    totalSales: 'Total Sales',
    totalCGST: 'Total CGST',
    totalSGST: 'Total SGST',
    taxLiability: 'Tax Liability',
    downloadGSTR1: 'Download GSTR-1',
    sendToCA: 'Send to CA',

    // Settings
    businessProfile: 'Business Profile',
    users: 'Users',
    subscription: 'Subscription',
    whatsappConfig: 'WhatsApp Config',

    // Messages
    noDataFound: 'No data found',
    deleteConfirm: 'Are you sure you want to delete this?',
    savedSuccessfully: 'Saved successfully!',
    deletedSuccessfully: 'Deleted successfully!',
    errorOccurred: 'An error occurred. Please try again.',
    sendingWhatsApp: 'Sending WhatsApp...',
    whatsappSent: 'WhatsApp sent!',

    // Login
    loginTitle: 'Welcome to ShoppIQ',
    phoneNumber: 'Phone Number',
    sendOTP: 'Send OTP via WhatsApp',
    enterOTP: 'Enter OTP',
    verifyOTP: 'Verify OTP',
    resendOTP: 'Resend OTP',
    resendIn: 'Resend in',

    // Register
    step1: 'Phone Verification',
    step2: 'Business Info',
    step3: 'Owner Details',
    step4: 'WhatsApp Setup',
    businessName: 'Business Name',
    businessType: 'Business Type',
    city: 'City',
    state: 'State',
    ownerName: 'Owner Name',
    gstin: 'GSTIN (Optional)',
    msmeRegistered: 'MSME Registered',
    whatsappNumber: 'WhatsApp Number',
    languagePreference: 'Language Preference',
    welcomeMessage: 'Welcome to ShoppIQ!',
    registrationComplete: 'Your business is now digital!',
  },

  hi: {
    // Navigation
    dashboard: 'मुख्य पेज',
    billing: 'बिल बनाओ',
    inventory: 'माल-सूची',
    customers: 'ग्राहक',
    payments: 'भुगतान',
    loyalty: 'लॉयल्टी',
    analytics: 'व्यापार विवरण',
    expenses: 'खर्चे',
    gst: 'GST',
    settings: 'सेटिंग्स',

    // Common actions
    save: 'सेव करें',
    cancel: 'रद्द करें',
    delete: 'मिटाएं',
    edit: 'बदलें',
    add: 'जोड़ें',
    search: 'खोजें',
    filter: 'छांटें',
    export: 'निकालें',
    import: 'दाखिल करें',
    print: 'छापें',
    download: 'डाउनलोड',
    send: 'भेजें',
    back: 'पीछे',
    next: 'आगे बढ़ो',
    close: 'बंद करें',
    confirm: 'पक्का करें',
    loading: 'लोड हो रहा है...',

    // Dashboard
    todaySales: 'आज की बिक्री',
    pendingPayments: 'बाकी भुगतान',
    lowStock: 'कम माल',
    newCustomers: 'नए ग्राहक',
    salesTrend: 'बिक्री का रुझान',
    revenueByCategory: 'श्रेणी अनुसार कमाई',
    topProducts: 'आज के टॉप प्रोडक्ट',
    recentInvoices: 'हाल के बिल',
    quickActions: 'जल्दी काम',
    vyapaarScore: 'व्यापार स्कोर',

    // Billing
    createInvoice: 'बिल बनाओ',
    addProduct: 'प्रोडक्ट जोड़ो',
    customer: 'ग्राहक',
    product: 'माल',
    quantity: 'मात्रा',
    price: 'दाम',
    discount: 'छूट',
    gstAmount: 'GST',
    total: 'कुल',
    subtotal: 'उप-कुल',
    grandTotal: 'कुल जोड़',
    payment: 'भुगतान',
    cash: 'नकद',
    upi: 'UPI',
    credit: 'उधार',
    mixed: 'मिलाकर',
    notes: 'नोट्स',
    createBill: 'बिल बनाओ और WhatsApp भेजो 📱',
    saveOnly: 'सिर्फ सेव करो',

    // Inventory
    products: 'सामान',
    stockMovements: 'माल का आना-जाना',
    addProduct2: 'प्रोडक्ट जोड़ें',
    bulkImport: 'बल्क CSV इंपोर्ट',
    category: 'श्रेणी',
    stockStatus: 'स्टॉक की स्थिति',
    allProducts: 'सब',
    lowStockItems: 'कम स्टॉक',
    outOfStock: 'स्टॉक खत्म',
    normalStock: 'सही स्टॉक',
    adjustStock: 'स्टॉक ठीक करें',
    purchasePrice: 'खरीद दाम',
    sellingPrice: 'बेचने का दाम',
    mrp: 'MRP',
    gstRate: 'GST दर',
    currentStock: 'अभी का स्टॉक',
    minStock: 'कम से कम स्टॉक',

    // Customers
    allCustomers: 'सब',
    vipCustomers: 'VIP ⭐',
    regularCustomers: 'नियमित',
    newCustomersTab: 'नए',
    atRisk: 'खतरे में',
    totalSpent: 'कुल खर्चा',
    loyaltyPoints: 'लॉयल्टी अंक',
    lastPurchase: 'आखरी खरीद',
    visits: 'बार आए',
    outstanding: 'बाकी',

    // Payments
    allPayments: 'सब भुगतान',
    pendingDues: 'बाकी राशि',
    reminders: 'रिमाइंडर',
    recordPayment: 'भुगतान दर्ज करें',
    daysOverdue: 'दिन बीत गए',
    whatsappRemind: 'WhatsApp याद दिलाएं',
    bulkRemind: 'सबको याद दिलाएं',

    // Analytics
    today: 'आज',
    last7Days: '7 दिन',
    last30Days: '30 दिन',
    last3Months: '3 महीने',
    custom: 'अपनी मर्ज़ी',
    totalRevenue: 'कुल कमाई',
    grossProfit: 'कुल मुनाफा',
    avgOrderValue: 'एक बिल की औसत कमाई',
    activeCustomers: 'सक्रिय ग्राहक',

    // GST
    gstSummary: 'GST सारांश',
    gstr1Ready: 'GSTR-1 तैयार ✅',
    totalSales: 'कुल बिक्री',
    totalCGST: 'कुल CGST',
    totalSGST: 'कुल SGST',
    taxLiability: 'टैक्स देनदारी',
    downloadGSTR1: 'GSTR-1 डाउनलोड',
    sendToCA: 'CA को भेजें',

    // Settings
    businessProfile: 'दुकान की जानकारी',
    users: 'यूज़र्स',
    subscription: 'प्लान',
    whatsappConfig: 'WhatsApp सेटिंग',

    // Messages
    noDataFound: 'कोई डाटा नहीं मिला',
    deleteConfirm: 'क्या आप सच में मिटाना चाहते हैं?',
    savedSuccessfully: 'सफलतापूर्वक सेव हो गया! ✅',
    deletedSuccessfully: 'सफलतापूर्वक मिटा दिया गया!',
    errorOccurred: 'कोई गलती हुई। दोबारा कोशिश करें।',
    sendingWhatsApp: 'WhatsApp भेजा जा रहा है...',
    whatsappSent: 'WhatsApp भेज दिया! 📱',

    // Login
    loginTitle: 'ShoppIQ में स्वागत है',
    phoneNumber: 'फ़ोन नंबर',
    sendOTP: 'WhatsApp पर OTP भेजो',
    enterOTP: 'OTP डालो',
    verifyOTP: 'OTP सत्यापित करो',
    resendOTP: 'OTP दोबारा भेजो',
    resendIn: 'दोबारा भेजो',

    // Register
    step1: 'फ़ोन सत्यापन',
    step2: 'दुकान की जानकारी',
    step3: 'मालिक की जानकारी',
    step4: 'WhatsApp सेटअप',
    businessName: 'दुकान का नाम',
    businessType: 'दुकान का प्रकार',
    city: 'शहर',
    state: 'राज्य',
    ownerName: 'मालिक का नाम',
    gstin: 'GSTIN (ज़रूरी नहीं)',
    msmeRegistered: 'MSME पंजीकृत',
    whatsappNumber: 'WhatsApp नंबर',
    languagePreference: 'भाषा चुनिए',
    welcomeMessage: 'ShoppIQ में स्वागत है! 🎉',
    registrationComplete: 'आपकी दुकान अब डिजिटल हो गई!',
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({} as LanguageContextType);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    return (localStorage.getItem('shoppiq_lang') as Language) || 'en';
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('shoppiq_lang', lang);
  }, []);

  const t = useCallback((key: string): string => {
    return strings[language][key] || strings['en'][key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
