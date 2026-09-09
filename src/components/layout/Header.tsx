import { Menu, Search, Bell, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../lib/formatters';

const routeTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/billing/new': 'Billing',
  '/inventory': 'Inventory',
  '/customers': 'Customers',
  '/payments': 'Payments',
  '/analytics': 'Analytics',
  '/gst': 'GST',
  '/whatsapp': 'WhatsApp',
  '/settings': 'Settings',
  '/loyalty': 'Loyalty',
  '/expenses': 'Expenses',
};

interface HeaderProps {
  onMenuClick?: () => void;
  pageTitle?: string;
}

export default function Header({ onMenuClick, pageTitle }: HeaderProps) {
  const { tenant } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const currentTitle = pageTitle || routeTitles[location.pathname] || 'Dashboard';
  const score = tenant?.vyapaarScore ?? 0;
  const notificationCount = 2;

  return (
    <header 
      className="sticky top-0 z-30 w-full bg-white border-b border-gray-200"
      style={{ height: '56px' }}
    >
      <div className="flex items-center justify-between h-full px-4 md:px-6 gap-2 sm:gap-4">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={onMenuClick}
            className="md:hidden p-1 -ml-1 text-gray-600 hover:bg-gray-100 rounded-md"
          >
            <Menu size={22} />
          </button>
          <h1 className="text-base font-semibold text-gray-900 hidden sm:block whitespace-nowrap font-heading">
            {currentTitle}
          </h1>
        </div>

        {/* CENTER — Search */}
        <div className="flex-1 max-w-sm w-full">
          <div className="relative w-full">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Kuch bhi dhundho..."
              className="w-full pl-9 pr-4 py-1.5 text-sm rounded-md bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500/20"
            />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Language Toggle */}
          <div className="flex bg-gray-100 rounded-md p-0.5">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "px-2 py-1 text-[11px] font-semibold rounded transition-colors",
                language === 'en' ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={cn(
                "px-2 py-1 text-[11px] font-semibold rounded transition-colors",
                language === 'hi' ? "bg-white text-purple-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              HI
            </button>
          </div>

          {/* Notification Bell */}
          <button className="relative p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors">
            <Bell size={18} />
            {notificationCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
            )}
          </button>

          {/* Bills usage — compact */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 bg-gray-50 rounded-md border border-gray-200">
            <span className="text-[11px] text-gray-500 font-medium">Score:</span>
            <span className="text-[11px] font-bold text-gray-700">{score}/1000</span>
          </div>

          {/* New Bill Button */}
          <button
            onClick={() => navigate('/billing/new')}
            className="hidden md:flex items-center gap-1.5 bg-purple-700 hover:bg-purple-800 text-white px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            New Bill
          </button>
        </div>
      </div>
    </header>
  );
}
