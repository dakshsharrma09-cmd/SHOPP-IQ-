import { Menu, Bell, Plus } from 'lucide-react';
// import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate, useLocation } from 'react-router-dom';

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
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const currentTitle = pageTitle || routeTitles[location.pathname] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-gray-200 h-12">
      <div className="flex items-center justify-between h-full px-4 gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onMenuClick} className="md:hidden p-1 text-gray-500 hover:text-gray-700">
            <Menu size={18} />
          </button>
          <h1 className="text-sm font-semibold text-gray-900 truncate">{currentTitle}</h1>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLanguage(language === 'en' ? 'hi' : 'en')}
            className="px-2 py-1 text-[11px] font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded"
          >
            {language === 'en' ? 'HI' : 'EN'}
          </button>

          <button className="relative p-1.5 text-gray-400 hover:text-gray-600">
            <Bell size={16} />
          </button>

          <button
            onClick={() => navigate('/billing/new')}
            className="hidden md:flex items-center gap-1 bg-purple-700 hover:bg-purple-800 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
          >
            <Plus size={14} />
            New Bill
          </button>
        </div>
      </div>
    </header>
  );
}
