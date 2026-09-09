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
          bg: '#F7F8FA',
          card: '#FFFFFF',
          hover: '#F9FAFB',
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
        'page-title': ['24px', { lineHeight: '1.2', fontWeight: '700' }],
        'section-heading': ['17px', { lineHeight: '1.3', fontWeight: '600' }],
        'card-title': ['15px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-text': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['12px', { lineHeight: '1.4', fontWeight: '500' }],
        'stat-number': ['28px', { lineHeight: '1.1', fontWeight: '700' }],
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.05)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.08)',
        'header': '0 1px 2px rgba(0,0,0,0.06)',
        'dropdown': '0 4px 12px rgba(0,0,0,0.1)',
        'modal': '0 8px 30px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'card': '8px',
        'btn': '6px',
        'input': '8px',
        'badge': '4px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'shimmer': 'shimmer 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
