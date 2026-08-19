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
          purple: '#6D28D9',
          'purple-light': '#EDE9FE',
          'purple-vlight': '#F5F3FF',
          'purple-dark': '#5B21B6',
          navy: '#1E1B4B',
          pink: '#DB2777',
          gold: '#D97706',
          green: '#059669',
          red: '#DC2626',
          whatsapp: '#25D366',
          'whatsapp-dark': '#128C7E',
          blue: '#3B82F6',
        },
        surface: {
          bg: '#FAFAFA',
          card: '#FFFFFF',
          hover: '#F5F3FF',
          border: '#E5E7EB',
          'border-light': '#F3F4F6',
        },
        text: {
          primary: '#1F2937',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        stat: ['Poppins', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['28px', { lineHeight: '1.2', fontWeight: '700' }],
        'section-heading': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'card-title': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-text': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        'stat-number': ['32px', { lineHeight: '1.1', fontWeight: '700' }],
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(109,40,217,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08), 0 8px 24px rgba(109,40,217,0.08)',
        'header': '0 1px 3px rgba(0,0,0,0.08)',
        'btn-primary': '0 4px 12px rgba(109,40,217,0.3)',
        'btn-primary-hover': '0 6px 20px rgba(109,40,217,0.4)',
        'purple-glow': '0 0 30px rgba(109,40,217,0.3)',
      },
      borderRadius: {
        'card': '16px',
        'btn': '10px',
        'input': '10px',
        'badge': '6px',
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
          '0%, 100%': { boxShadow: '0 0 20px rgba(109,40,217,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(109,40,217,0.5)' },
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
        'purple-gradient': 'linear-gradient(135deg, #6D28D9 0%, #DB2777 100%)',
        'gold-gradient': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'card-gradient': 'linear-gradient(135deg, rgba(109,40,217,0.03) 0%, rgba(219,39,119,0.03) 100%)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
