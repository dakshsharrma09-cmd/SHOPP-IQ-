import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, Plus, Globe, Sun, Moon, X, Package, Users, FileText, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn, formatINR } from '../../lib/formatters';
import { subscribeProducts, subscribeCustomers, subscribeInvoices } from '../../lib/firestoreService';
import type { Product, Customer, Invoice } from '../../types/firestore';

interface HeaderProps {
  sidebarCollapsed: boolean;
}

interface SearchResult {
  type: 'product' | 'customer' | 'invoice';
  id: string;
  title: string;
  subtitle: string;
  extra?: string;
  path: string;
  icon: typeof Package;
  iconColor: string;
}

export default function Header({ sidebarCollapsed }: HeaderProps) {
  const { tenantId, tenant } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Real-time data for search
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const unsub1 = subscribeProducts(tenantId, setProducts);
    const unsub2 = subscribeCustomers(tenantId, setCustomers);
    const unsub3 = subscribeInvoices(tenantId, setInvoices, 100);
    return () => { unsub1(); unsub2(); unsub3(); };
  }, [tenantId]);

  const score = tenant?.vyapaarScore ?? 0;
  const scoreColor = score >= 700 ? 'text-brand-green' : score >= 400 ? 'text-brand-gold' : 'text-red-500';
  const scoreBg = score >= 700 ? 'bg-brand-green/10' : score >= 400 ? 'bg-brand-gold/10' : 'bg-red-50';

  // Compute search results
  const searchResults = useMemo((): SearchResult[] => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];

    const results: SearchResult[] = [];

    // Search products
    products
      .filter(p => p.isActive !== false && (
        p.name.toLowerCase().includes(q) ||
        (p.nameHindi && p.nameHindi.includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      ))
      .slice(0, 4)
      .forEach(p => {
        results.push({
          type: 'product',
          id: p.id,
          title: p.name,
          subtitle: `Stock: ${p.currentStock} · ${formatINR(p.sellingPrice)}`,
          extra: p.currentStock <= p.minimumStockAlert ? 'Low Stock' : undefined,
          path: '/inventory',
          icon: Package,
          iconColor: p.currentStock <= p.minimumStockAlert ? 'text-red-500' : 'text-brand-purple',
        });
      });

    // Search customers
    customers
      .filter(c =>
        c.fullName.toLowerCase().includes(q) ||
        c.phoneNumber.includes(q) ||
        (c.city && c.city.toLowerCase().includes(q))
      )
      .slice(0, 4)
      .forEach(c => {
        results.push({
          type: 'customer',
          id: c.id,
          title: c.fullName,
          subtitle: `${c.phoneNumber} · ${c.customerSegment}`,
          extra: c.currentOutstanding > 0 ? `₹${c.currentOutstanding} due` : undefined,
          path: '/customers',
          icon: Users,
          iconColor: 'text-blue-500',
        });
      });

    // Search invoices
    invoices
      .filter(i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        i.customerName.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .forEach(i => {
        results.push({
          type: 'invoice',
          id: i.id,
          title: i.invoiceNumber,
          subtitle: `${i.customerName} · ${formatINR(i.grandTotal)}`,
          extra: i.paymentStatus !== 'paid' ? i.paymentStatus : undefined,
          path: '/payments',
          icon: FileText,
          iconColor: i.paymentStatus === 'paid' ? 'text-brand-green' : 'text-brand-gold',
        });
      });

    return results;
  }, [searchQuery, products, customers, invoices]);

  // Low stock count for notification bell
  const lowStockCount = useMemo(() =>
    products.filter(p => p.isActive && p.currentStock <= p.minimumStockAlert).length
  , [products]);

  const pendingPaymentCount = useMemo(() =>
    invoices.filter(i => ['unpaid', 'partial', 'overdue'].includes(i.paymentStatus)).length
  , [invoices]);

  const notificationCount = lowStockCount + pendingPaymentCount;

  // Keyboard shortcut: press "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'n' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        navigate('/billing/new');
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setShowResults(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [navigate]);

  // Click outside to close search results
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Dark mode toggle
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleResultClick = (result: SearchResult) => {
    setSearchQuery('');
    setShowResults(false);
    navigate(result.path);
  };

  // Notification panel state
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className={cn(
      'fixed top-0 right-0 z-30 h-16 bg-white/80 dark:bg-brand-dark-card/80 backdrop-blur-xl border-b border-gray-100 dark:border-brand-dark-border transition-all duration-300 header-shine',
      'left-0 md:left-auto',
      sidebarCollapsed ? 'md:left-16' : 'md:left-60'
    )}>
      <div className="flex items-center gap-3 h-full px-4 md:px-6">
        {/* Search bar */}
        <div className="flex-1 max-w-xl" ref={dropdownRef}>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowResults(true); }}
              onFocus={() => searchQuery.length >= 2 && setShowResults(true)}
              placeholder={t('search') + '... (Press /)'}
              className={cn(
                'w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border bg-gray-50 dark:bg-brand-dark border-gray-200 dark:border-brand-dark-border',
                'text-gray-900 dark:text-gray-100 placeholder:text-gray-400',
                'focus:outline-none focus:border-brand-purple focus:ring-2 focus:ring-brand-purple/20 transition-all'
              )}
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showResults && searchQuery.length >= 2 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border shadow-2xl z-50 overflow-hidden animate-scale-in max-h-[400px] overflow-y-auto">
                {searchResults.length > 0 ? (
                  <>
                    {/* Group headers */}
                    {(['product', 'customer', 'invoice'] as const).map(type => {
                      const items = searchResults.filter(r => r.type === type);
                      if (items.length === 0) return null;
                      const groupLabel = type === 'product' ? 'Products' : type === 'customer' ? 'Customers' : 'Invoices';
                      return (
                        <div key={type}>
                          <div className="px-4 py-2 text-[10px] font-heading font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 dark:bg-brand-dark/50">
                            {groupLabel}
                          </div>
                          {items.map(result => (
                            <button
                              key={`${result.type}-${result.id}`}
                              onClick={() => handleResultClick(result)}
                              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-purple/5 dark:hover:bg-brand-purple/10 text-left transition-colors"
                            >
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', result.iconColor, 'bg-current/10')}>
                                <result.icon size={15} className={result.iconColor} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{result.title}</div>
                                <div className="text-xs text-gray-400 truncate">{result.subtitle}</div>
                              </div>
                              {result.extra && (
                                <span className={cn(
                                  'text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0',
                                  result.extra === 'Low Stock' ? 'bg-red-50 text-red-500' :
                                  result.extra.includes('due') ? 'bg-amber-50 text-amber-600' :
                                  'bg-amber-50 text-amber-600'
                                )}>
                                  {result.extra}
                                </span>
                              )}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-6 text-center">
                    <Search size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">
                      {language === 'hi' ? `"${searchQuery}" ke liye kuch nahi mila` : `No results for "${searchQuery}"`}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Dark Mode */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-xl text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 transition-all"
            title="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {/* Language Toggle */}
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium font-heading hover:bg-brand-purple/10 text-gray-500 hover:text-brand-purple transition-all"
            title="Toggle language"
          >
            <Globe size={14} />
            <span>{language === 'en' ? 'हिं' : 'EN'}</span>
          </button>

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-gray-500 hover:text-brand-purple hover:bg-brand-purple/10 transition-all"
            >
              <Bell size={18} />
              {notificationCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-brand-dark-card rounded-2xl border border-gray-100 dark:border-brand-dark-border shadow-2xl z-50 animate-scale-in overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-brand-dark-border">
                  <h3 className="font-heading font-semibold text-sm text-gray-900 dark:text-white">Notifications</h3>
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {lowStockCount > 0 && (
                    <button
                      onClick={() => { navigate('/inventory'); setShowNotifications(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-purple/5 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={15} className="text-red-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {lowStockCount} products low stock
                        </div>
                        <div className="text-xs text-gray-400">Reorder needed</div>
                      </div>
                    </button>
                  )}
                  {pendingPaymentCount > 0 && (
                    <button
                      onClick={() => { navigate('/payments'); setShowNotifications(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-purple/5 text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={15} className="text-amber-500" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {pendingPaymentCount} payments pending
                        </div>
                        <div className="text-xs text-gray-400">Collect payments</div>
                      </div>
                    </button>
                  )}
                  {notificationCount === 0 && (
                    <div className="p-6 text-center text-sm text-gray-400">
                      Sab theek hai! ✨ No alerts.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vyapaar Score chip */}
          <button
            onClick={() => navigate('/analytics')}
            className={cn(
              'hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:shadow-sm',
              scoreBg,
              'border-transparent'
            )}
            title="Vyapaar Score"
          >
            <div className="flex flex-col items-end">
              <span className={cn('text-xs font-bold font-heading leading-none', scoreColor)}>
                {score}/1000
              </span>
              <span className="text-[10px] text-gray-400 leading-none mt-0.5">Vyapaar</span>
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-current flex items-center justify-center" style={{ borderColor: score >= 700 ? '#10B981' : score >= 400 ? '#F59E0B' : '#EF4444' }}>
              <span className={cn('text-[8px] font-bold', scoreColor)}>★</span>
            </div>
          </button>

          {/* Naya Bill Button */}
          <button
            onClick={() => navigate('/billing/new')}
            className="btn-primary btn-pulse text-sm px-4 py-2.5 hidden sm:flex"
          >
            <Plus size={16} />
            <span className="font-heading">Naya Bill</span>
          </button>

          {/* Mobile: just the + icon */}
          <button
            onClick={() => navigate('/billing/new')}
            className="sm:hidden p-2.5 rounded-xl bg-brand-purple text-white"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}
