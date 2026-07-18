import { useState, useEffect } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Shows a purple banner when the user goes offline.
 * Automatically hides when connectivity is restored.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-brand-purple to-purple-600 text-white px-4 py-2.5 flex items-center justify-center gap-2 text-sm font-medium shadow-lg animate-slide-down">
      <WifiOff size={16} className="flex-shrink-0" />
      <span>Aap offline hain — cached data dikh raha hai</span>
    </div>
  );
}
