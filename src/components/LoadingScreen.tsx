import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onFinished?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinished }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        if (onFinished) onFinished();
      }, 300);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [onFinished]);

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-300 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: '#F7F8FA' }}
    >
      <div className="flex flex-col items-center">
        <img src="/logo.png" alt="ShoppIQ" className="h-[80px] w-auto mb-4" />
        <p className="text-gray-500 text-sm font-medium">Dukaan se Digital tak</p>
        <div className="mt-4 w-32 h-0.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-purple-600 rounded-full" style={{ animation: 'loadBar 1.2s ease-out forwards' }} />
        </div>
      </div>

      <style>{`
        @keyframes loadBar {
          0% { width: 0; }
          100% { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
