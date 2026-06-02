/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // KitaLuna Brand Colors — weiche, warme Pastelltöne
        // Primär: Salbeigrün (Hauptaktionen)
        primary: {
          50: '#F2F8F3',
          100: '#E1EFE4',
          200: '#C3DFC9',
          300: '#9FCBA8',
          400: '#76B284',
          500: '#579A67',
          600: '#458052',
          700: '#386A43',
          800: '#2F5537',
          900: '#26442D',
        },
        // Sekundär: präzise, neutrale Grautöne (Apple/UBS-Ästhetik)
        secondary: {
          50: '#F5F5F7',
          100: '#EBEBED',
          200: '#DCDCDF',
          300: '#C7C7CC',
          400: '#9A9AA0',
          500: '#6E6E73',
          600: '#48484A',
          700: '#363638',
          800: '#1D1D1F',
          900: '#0B0B0C',
        },
        // Akzent: Himmel-Türkis (sekundäre Akzente)
        accent: {
          50: '#EEF8F8',
          100: '#D6EFEF',
          200: '#AFE0E1',
          300: '#7FCCCD',
          400: '#4FB3B5',
          500: '#319A9C',
          600: '#287E80',
          700: '#236668',
          800: '#1F5253',
          900: '#1B4243',
        },
        // Warme Marken-Extras (Creme, Honig-Gold, Koralle)
        cream: '#F5ECD6',
        honey: '#E3C36A',
        coral: '#DD9580',
        kita: {
          50: '#F5F7FA',
          100: '#EAEEF5',
          200: '#D0D8E8',
          300: '#A8B5D1',
          400: '#7A8FB0',
          500: '#546B7C',
          600: '#3E4E63',
          700: '#2D3847',
          800: '#1D2330',
          900: '#0F1419',
        },
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'Segoe UI', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
        mono: ['Menlo', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
      },
      spacing: {
        'xs': '4px',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        '2xl': '32px',
        '3xl': '48px',
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.08)',
        'md': '0 2px 4px 0 rgb(0 0 0 / 0.08)',
        'lg': '0 4px 8px 0 rgb(0 0 0 / 0.1)',
        'xl': '0 8px 16px 0 rgb(0 0 0 / 0.12)',
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.08)',
        'elevated': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'card': '0 2px 8px 0 rgb(0 0 0 / 0.08)',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-in-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
