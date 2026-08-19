import { Menu, Search, Bell, Plus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/formatters';

interface HeaderProps {
  onMenuClick?: () => void;
  pageTitle?: string;
}

export default function Header({ onMenuClick, pageTitle = 'Dashboard' }: HeaderProps) {
  const { tenant } = useAuth();
  const { language, setLanguage } = useLanguage();
  const navigate = useNavigate();

  const score = tenant?.vyapaarScore ?? 0;
  const notificationCount = 2; // Mock count for UI

  return (
    <header 
      className="sticky top-0 z-30 w-full bg-[#FFFFFF]"
      style={{ height: '64px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      <div className="flex items-center justify-between h-full px-4 md:px-6 gap-2 sm:gap-4">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={onMenuClick}
            className="md:hidden p-1 -ml-1 text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={24} />
          </button>
          <h1 className="text-[20px] font-semibold text-[#1F2937] hidden sm:block whitespace-nowrap" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
            {pageTitle}
          </h1>
        </div>

        {/* CENTER */}
        <div className="flex-1 max-w-sm w-full">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="🔍 Kuch bhi dhundho..."
              className="w-full pl-9 pr-4 py-2 text-sm rounded-full bg-[#F5F3FF] border border-[#E5E7EB] text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6D28D9]/20"
            />
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* Language Toggle */}
          <div className="flex bg-[#F5F3FF] rounded-full p-0.5">
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                "px-2.5 py-1 text-[10px] sm:text-xs font-semibold rounded-full transition-colors",
                language === 'en' ? "bg-[#6D28D9] text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('hi')}
              className={cn(
                "px-2.5 py-1 text-[10px] sm:text-xs font-semibold rounded-full transition-colors",
                language === 'hi' ? "bg-[#6D28D9] text-white" : "text-gray-600 hover:text-gray-900"
              )}
            >
              HI
            </button>
          </div>

          {/* Notification Bell */}
          <button className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
            <Bell size={20} />
            {notificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          {/* Vyapaar Score */}
          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#F5F3FF] rounded-full border border-[#E5E7EB]">
            <span className="w-2 h-2 rounded-full bg-[#6D28D9]"></span>
            <span className="text-xs font-bold text-[#6D28D9]">{score}/1000</span>
          </div>

          {/* Naya Bill Button */}
          <button
            onClick={() => navigate('/billing/new')}
            className="hidden md:flex items-center gap-1.5 btn-primary bg-gradient-to-r from-[#6D28D9] to-[#8B5CF6] text-white px-4 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={16} />
            Naya Bill
          </button>
        </div>
      </div>
    </header>
  );
}
