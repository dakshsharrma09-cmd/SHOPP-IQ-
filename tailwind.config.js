/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED',
          'purple-light': '#8B5CF6',
          'purple-dark': '#6D28D9',
          'purple-glow': 'rgba(124, 58, 237, 0.3)',
          dark: '#0F0A1E',
          'dark-card': '#1A1035',
          'dark-border': '#2D1F5E',
          gold: '#F59E0B',
          'gold-light': '#FCD34D',
          green: '#10B981',
          'green-light': '#34D399',
          whatsapp: '#25D366',
          'whatsapp-dark': '#128C7E',
          amber: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        'purple-glow': '0 0 30px rgba(124, 58, 237, 0.4)',
        'purple-glow-sm': '0 0 15px rgba(124, 58, 237, 0.25)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'dark-card': '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.4s ease-out',
        'bounce-subtle': 'bounceSubtle 0.6s ease-in-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
        'confetti': 'confettiFall 3s ease-in forwards',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        'purple-gradient': 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'dark-gradient': 'linear-gradient(135deg, #0F0A1E 0%, #1A1035 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(124, 58, 237, 0.05) 0%, rgba(109, 40, 217, 0.1) 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
