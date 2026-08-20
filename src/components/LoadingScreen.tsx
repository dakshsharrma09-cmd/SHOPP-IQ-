import React, { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onFinished?: () => void;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ onFinished }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [taglineText, setTaglineText] = useState('');
  const fullText = "Dukaan se Digital tak";

  useEffect(() => {
    // Typewriter effect
    let currentText = '';
    const interval = setInterval(() => {
      if (currentText.length < fullText.length) {
        currentText += fullText[currentText.length];
        setTaglineText(currentText);
      } else {
        clearInterval(interval);
      }
    }, 50);

    // End of splash screen
    const timeout = setTimeout(() => {
      setIsFadingOut(true);
      setTimeout(() => {
        if (onFinished) onFinished();
      }, 500); // 500ms fade out duration
    }, 2000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [onFinished]);

  return (
    <div 
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-opacity duration-500 overflow-hidden ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: 'linear-gradient(135deg, #fdf4ff 0%, #f3e8ff 100%)' }}
    >
      {/* Floating Orbs */}
      <div 
        className="absolute rounded-full opacity-60 mix-blend-multiply pointer-events-none"
        style={{
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(219,39,119,0.3) 0%, rgba(255,255,255,0) 70%)',
          top: '-10%', left: '-10%',
          animation: 'float 8s ease-in-out infinite'
        }}
      />
      <div 
        className="absolute rounded-full opacity-50 mix-blend-multiply pointer-events-none"
        style={{
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(147,51,234,0.3) 0%, rgba(255,255,255,0) 70%)', // Purple
          bottom: '-15%', right: '-10%',
          animation: 'float 12s ease-in-out infinite reverse'
        }}
      />
      <div 
        className="absolute rounded-full opacity-60 mix-blend-multiply pointer-events-none"
        style={{
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(244,114,182,0.3) 0%, rgba(255,255,255,0) 70%)',
          top: '40%', right: '20%',
          animation: 'float 10s ease-in-out infinite 2s'
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <div className="relative mb-6">
          <div 
            className="absolute inset-0 rounded-full blur-xl opacity-40"
            style={{ 
              background: 'linear-gradient(135deg, #DB2777, #9333EA)',
              animation: 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          <img src="/logo.png" alt="ShoppIQ" className="relative h-[120px] w-auto drop-shadow-lg" />
        </div>

        {/* Tagline (Typewriter) */}
        <p className="text-purple-600 text-sm md:text-base font-medium italic h-6 tracking-wide mb-8 flex items-center">
          {taglineText}
          <span className="animate-ping inline-block ml-1 w-1.5 h-4 bg-purple-500 rounded-sm"></span>
        </p>

        {/* Shimmer Loading Bar */}
        <div className="w-48 h-1 bg-purple-200 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 bottom-0 left-0 w-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(219,39,119,0.8), transparent)',
              animation: 'shimmer 1.5s infinite linear',
              transform: 'translateX(-100%)'
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0.9; transform: scale(1.15); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingScreen;
