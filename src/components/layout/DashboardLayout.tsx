import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { cn } from '../../lib/formatters';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const isWhatsApp = location.pathname === '/whatsapp';

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={cn(
        'transition-all duration-300',
        'pl-0 md:pl-60'
      )}>
        {!isWhatsApp && <Header onMenuClick={() => setSidebarOpen(true)} />}
        
        {/* Main Content */}
        <main className={cn(
          'min-h-screen',
          isWhatsApp ? 'pt-0 pb-0' : 'pt-16 pb-20 md:pb-0'
        )}>
          <div key={location.pathname} className={cn('page-enter', isWhatsApp ? 'p-0 h-screen' : 'p-4 md:p-6')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
