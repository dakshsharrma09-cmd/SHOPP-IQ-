import React, { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';

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
      style={{ background: 'linear-gradient(to bottom, #0F0A1E, #1A0D3F)' }}
    >
      {/* Floating Orbs */}
      <div 
        className="absolute rounded-full opacity-30 mix-blend-screen pointer-events-none"
        style={{
          width: '300px', height: '300px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.6) 0%, rgba(0,0,0,0) 70%)',
          top: '-10%', left: '-10%',
          animation: 'float 8s ease-in-out infinite'
        }}
      />
      <div 
        className="absolute rounded-full opacity-20 mix-blend-screen pointer-events-none"
        style={{
          width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(217,119,6,0.5) 0%, rgba(0,0,0,0) 70%)', // Gold
          bottom: '-15%', right: '-10%',
          animation: 'float 12s ease-in-out infinite reverse'
        }}
      />
      <div 
        className="absolute rounded-full opacity-30 mix-blend-screen pointer-events-none"
        style={{
          width: '200px', height: '200px',
          background: 'radial-gradient(circle, rgba(167,139,250,0.6) 0%, rgba(0,0,0,0) 70%)',
          top: '40%', right: '20%',
          animation: 'float 10s ease-in-out infinite 2s'
        }}
      />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with Glow */}
        <div className="relative mb-6">
          <div 
            className="absolute inset-0 rounded-full blur-xl opacity-60"
            style={{ 
              background: 'linear-gradient(135deg, #8B5CF6, #3B82F6)',
              animation: 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
          <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg border border-purple-400/30">
            <ShoppingBag className="w-12 h-12 text-white" strokeWidth={1.5} />
          </div>
        </div>

        {/* Brand Name */}
        <h1 
          className="text-4xl md:text-5xl font-bold mb-2 tracking-tight"
          style={{ 
            fontFamily: '"Plus Jakarta Sans", sans-serif',
            background: 'linear-gradient(to right, #ffffff, #c4b5fd)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          SHOPP IQ
        </h1>

        {/* Tagline (Typewriter) */}
        <p className="text-purple-300/80 text-sm md:text-base font-medium h-6 tracking-wide mb-8 flex items-center">
          {taglineText}
          <span className="animate-ping inline-block ml-1 w-1.5 h-4 bg-purple-400 rounded-sm"></span>
        </p>

        {/* Shimmer Loading Bar */}
        <div className="w-48 h-1 bg-purple-900/50 rounded-full overflow-hidden relative">
          <div 
            className="absolute top-0 bottom-0 left-0 w-full"
            style={{
              background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.8), transparent)',
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
