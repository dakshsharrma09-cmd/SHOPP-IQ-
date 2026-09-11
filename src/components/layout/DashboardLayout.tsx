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
    <div className="min-h-screen" style={{ background: '#F4F5F7' }}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="transition-all duration-200 pl-0 md:pl-[220px]">
        {!isWhatsApp && <Header onMenuClick={() => setSidebarOpen(true)} />}
        
        <main className={cn(
          'min-h-screen',
          isWhatsApp ? 'pt-0 pb-0' : 'pb-16 md:pb-0'
        )}>
          <div key={location.pathname} className={cn(isWhatsApp ? 'p-0 h-screen' : 'p-4 md:p-5')}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
