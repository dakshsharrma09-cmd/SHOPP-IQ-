import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Package, Users, CreditCard, Gift,
  BarChart3, Receipt, Settings, LogOut, MessageCircle, Wallet
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../lib/formatters';

const mainNavItems = [
  { path: '/dashboard', icon: LayoutDashboard, key: 'dashboard', label: 'Dashboard' },
  { path: '/billing/new', icon: FileText, key: 'billing', label: 'Billing' },
  { path: '/inventory', icon: Package, key: 'inventory', label: 'Inventory' },
  { path: '/customers', icon: Users, key: 'customers', label: 'Customers' },
  { path: '/payments', icon: CreditCard, key: 'payments', label: 'Payments' },
];

const reportsNavItems = [
  { path: '/analytics', icon: BarChart3, key: 'analytics', label: 'Analytics' },
  { path: '/gst', icon: Receipt, key: 'gst', label: 'GST' },
  { path: '/whatsapp', icon: MessageCircle, key: 'whatsapp', label: 'WhatsApp AI' },
];

const settingsNavItems = [
  { path: '/settings', icon: Settings, key: 'settings', label: 'Settings' },
  { path: '/loyalty', icon: Gift, key: 'loyalty', label: 'Loyalty' },
  { path: '/expenses', icon: Wallet, key: 'expenses', label: 'Expenses' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { tenant, logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : 'S';
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-[#FFFFFF] w-[240px] border-r border-[#E5E7EB]">
      {/* LOGO AREA */}
      <div className="h-[72px] flex items-center px-4 border-b border-[#E5E7EB] flex-shrink-0">
        <img src="/logo.png" alt="ShoppIQ" className="h-[52px] w-auto" />
      </div>

      {/* NAV SECTIONS */}
      <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 scrollbar-hide">
        
        {/* MAIN SECTION */}
        <div>
          <div className="text-[10px] uppercase text-[#9CA3AF] font-bold px-3 mb-2 tracking-wider mt-[16px]">MAIN</div>
          <div className="space-y-1">
            {mainNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn('nav-item h-[44px]', isActive && 'active')}
              >
                <item.icon size={20} />
                <span className="font-medium text-sm">{t(item.key) || item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* REPORTS SECTION */}
        <div>
          <div className="text-[10px] uppercase text-[#9CA3AF] font-bold px-3 mb-2 tracking-wider mt-[16px]">REPORTS</div>
          <div className="space-y-1">
            {reportsNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn('nav-item h-[44px]', isActive && 'active')}
              >
                <item.icon size={20} />
                <span className="font-medium text-sm">{t(item.key) || item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>

        {/* SETTINGS SECTION */}
        <div>
          <div className="text-[10px] uppercase text-[#9CA3AF] font-bold px-3 mb-2 tracking-wider mt-[16px]">SETTINGS</div>
          <div className="space-y-1">
            {settingsNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => cn('nav-item h-[44px]', isActive && 'active')}
              >
                <item.icon size={20} />
                <span className="font-medium text-sm">{t(item.key) || item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>

      {/* BOTTOM USER SECTION */}
      <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-full bg-[#F3F4F6] text-[#4B5563] flex items-center justify-center font-bold text-sm flex-shrink-0">
            {getInitials(tenant?.ownerName || 'User')}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-gray-800 truncate">{tenant?.ownerName || 'Store Owner'}</span>
            <span className="text-xs text-gray-500 truncate">{tenant?.businessName || 'Business Name'}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0" title="Logout">
          <LogOut size={20} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-screen z-40">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50 transition-opacity" onClick={onClose} />
          <div className="relative flex-1 flex max-w-fit animate-slide-in">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
}
