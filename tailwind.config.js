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
          bg: '#F4F5F7',
          card: '#FFFFFF',
          hover: '#F9FAFB',
          border: '#E5E7EB',
          'border-light': '#F3F4F6',
        },
        text: {
          primary: '#111827',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        }
      },
      fontFamily: {
        heading: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        stat: ['Inter', 'sans-serif'],
      },
      fontSize: {
        'page-title': ['20px', { lineHeight: '1.3', fontWeight: '600' }],
        'section-heading': ['14px', { lineHeight: '1.4', fontWeight: '600' }],
        'card-title': ['13px', { lineHeight: '1.4', fontWeight: '600' }],
        'body-text': ['13px', { lineHeight: '1.5', fontWeight: '400' }],
        'label': ['11px', { lineHeight: '1.4', fontWeight: '500' }],
        'stat-number': ['22px', { lineHeight: '1.2', fontWeight: '600' }],
      },
      boxShadow: {
        'dropdown': '0 4px 12px rgba(0,0,0,0.08)',
        'modal': '0 8px 24px rgba(0,0,0,0.12)',
      },
      borderRadius: {
        'card': '6px',
        'btn': '6px',
        'input': '6px',
        'badge': '3px',
      },
      animation: {
        'fade-in': 'fadeIn 0.15s ease-out',
        'slide-in-right': 'slideInRight 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
