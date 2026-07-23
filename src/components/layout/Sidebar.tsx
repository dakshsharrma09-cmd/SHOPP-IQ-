
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users, CreditCard, Gift,
  BarChart3, Receipt, Settings, LogOut, MessageCircle, ChevronLeft,
  ChevronRight, Store, Menu, ShoppingBag
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/formatters';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { path: '/billing/new', icon: FileText, key: 'billing' },
  { path: '/inventory', icon: Package, key: 'inventory' },
  { path: '/customers', icon: Users, key: 'customers' },
  { path: '/payments', icon: CreditCard, key: 'payments' },
  { path: '/loyalty', icon: Gift, key: 'loyalty' },
  { path: '/analytics', icon: BarChart3, key: 'analytics' },
  { path: '/gst', icon: Receipt, key: 'gst' },
  { path: '/settings', icon: Settings, key: 'settings' },
];

// Mobile bottom tab items
const mobileTabItems = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
  { path: '/billing/new', icon: FileText, key: 'billing' },
  { path: '/inventory', icon: Package, key: 'inventory' },
  { path: '/customers', icon: Users, key: 'customers' },
];

interface SidebarProps {
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

export default function Sidebar({ collapsed, onCollapse }: SidebarProps) {
  const { tenant, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col fixed left-0 top-0 h-screen z-40 transition-all duration-300 border-r',
          'bg-white dark:bg-brand-dark-card border-gray-100 dark:border-brand-dark-border',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'flex items-center gap-3 px-4 py-5 border-b border-gray-100 dark:border-brand-dark-border',
          collapsed && 'justify-center px-2'
        )}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-purple-600 flex items-center justify-center flex-shrink-0 shadow-purple-glow-sm animate-pulse-glow">
            <ShoppingBag size={18} className="text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-heading font-extrabold text-brand-purple text-sm tracking-wide leading-tight">SHOPP IQ</div>
              <div className="text-[10px] text-brand-purple/60 font-heading font-medium leading-tight">
                Dukaan se Digital tak
              </div>
            </div>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
          <div className="space-y-1 px-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  cn(
                    'nav-item group',
                    isActive && 'active',
                    collapsed && 'justify-center px-2'
                  )
                }
                title={collapsed ? t(item.key) : undefined}
              >
                {({ isActive }) => (
                  <>
                    <item.icon
                      size={18}
                      className={cn(
                        'flex-shrink-0 transition-colors',
                        isActive ? 'text-white' : 'text-gray-500 group-hover:text-brand-purple'
                      )}
                    />
                    {!collapsed && (
                      <span className={cn(
                        'text-sm font-medium transition-colors font-heading',
                        isActive ? 'text-white' : 'text-gray-600 dark:text-gray-400 group-hover:text-brand-purple'
                      )}>
                        {t(item.key)}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* WhatsApp Chat */}
        {!collapsed && (
          <div className="px-3 pb-2">
            <NavLink
              to="/whatsapp"
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-brand-whatsapp/20 shadow-sm'
                    : 'bg-brand-whatsapp/10 hover:bg-brand-whatsapp/20'
                }`
              }
            >
              <div className="relative">
                <MessageCircle size={18} className="text-brand-whatsapp" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-brand-whatsapp text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">AI</span>
              </div>
              <span className="text-sm font-medium font-heading text-brand-whatsapp">WhatsApp Bot</span>
            </NavLink>
          </div>
        )}

        {/* User / Logout */}
        <div className={cn(
          'p-3 border-t border-gray-100 dark:border-brand-dark-border',
          collapsed && 'flex justify-center'
        )}>
          {collapsed ? (
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-purple to-purple-600 flex items-center justify-center flex-shrink-0">
                <Store size={14} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold font-heading truncate dark:text-gray-200">
                  {tenant?.ownerName || 'Store Owner'}
                </div>
                <div className="text-[10px] text-gray-400 truncate capitalize">
                  {tenant?.subscriptionPlan || 'free'} plan
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => onCollapse(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-brand-purple text-white flex items-center justify-center shadow-purple-glow-sm hover:scale-110 transition-transform z-50"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>

      {/* Mobile Bottom Tabs */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-brand-dark-card border-t border-gray-100 dark:border-brand-dark-border safe-area-pb">
        <div className="mobile-tab-bar">
          {mobileTabItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'mobile-tab-item',
                  isActive ? 'text-brand-purple bg-brand-purple/10' : 'text-gray-400'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon size={20} className={isActive ? 'text-brand-purple' : 'text-gray-400'} />
                  <span className="text-[10px] font-medium font-heading truncate">{t(item.key)}</span>
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn('mobile-tab-item',
                isActive ? 'text-brand-purple bg-brand-purple/10' : 'text-gray-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Menu size={20} className={isActive ? 'text-brand-purple' : 'text-gray-400'} />
                <span className="text-[10px] font-medium font-heading">More</span>
              </>
            )}
          </NavLink>
        </div>
      </div>
    </>
  );
}
