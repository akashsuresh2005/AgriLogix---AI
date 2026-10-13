/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          bg: '#F3F8F1',          // main background
          secondary: '#EAF4E6',   // secondary green surface
          surface: '#FFFFFF',     // cards
          primary: '#087443',     // primary agricultural green
          forest: '#075C36',      // deep forest green
          soft: '#DDF3E4',        // soft green
          gold: '#D6A72C',        // harvest gold
          text: '#17251B',        // text
        },
        primary: {
          50: '#F3F8F1',
          100: '#EAF4E6',
          200: '#DDF3E4',
          300: '#A4DCB4',
          400: '#4DAF7A',
          500: '#087443', // primary agricultural green
          600: '#087443',
          700: '#075C36', // deep forest green
          800: '#05472A',
          900: '#03331D',
          950: '#021F12',
        },
        forest: {
          50: '#F3F8F1',
          100: '#EAF4E6',
          200: '#DDF3E4',
          300: '#A4DCB4',
          400: '#4DAF7A',
          500: '#087443',
          600: '#087443',
          700: '#075C36',
          800: '#05472A',
          900: '#03331D',
          950: '#021F12',
        },
        emerald: {
          50: '#F3F8F1',
          100: '#EAF4E6',
          200: '#DDF3E4',
          300: '#A4DCB4',
          400: '#4DAF7A',
          500: '#087443',
          600: '#087443',
          700: '#075C36',
          800: '#05472A',
          900: '#03331D',
          950: '#021F12',
        },
        accent: {
          50: '#FCF9ED',
          100: '#F8F1D2',
          200: '#F0E2A5',
          300: '#E7D072',
          400: '#DFC045',
          500: '#D6A72C', // harvest gold
          600: '#B88B1E',
          700: '#946E13',
          800: '#75550C',
        },
        harvest: {
          DEFAULT: '#D6A72C',
          50: '#FCF9ED',
          100: '#F8F1D2',
          500: '#D6A72C',
          600: '#B88B1E',
          700: '#946E13',
        },
        background: '#F3F8F1',
        surface: '#FFFFFF',
        'surface-subtle': '#EAF4E6',
        'surface-soft': '#DDF3E4',
        border: '#D5E2D2',
        heading: '#17251B',
        body: '#17251B',
        muted: '#536557',
        risk: {
          low: { bg: '#EAF4E6', text: '#075C36', border: '#DDF3E4', badge: '#087443' },
          medium: { bg: '#FCF9ED', text: '#946E13', border: '#F0E2A5', badge: '#D6A72C' },
          high: { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', badge: '#DC2626' },
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'subtle': '0 1px 3px 0 rgba(16, 24, 40, 0.06), 0 1px 2px -1px rgba(16, 24, 40, 0.04)',
        'card': '0 4px 6px -1px rgba(16, 24, 40, 0.05), 0 2px 4px -2px rgba(16, 24, 40, 0.04)',
        'elevated': '0 10px 15px -3px rgba(16, 24, 40, 0.07), 0 4px 6px -4px rgba(16, 24, 40, 0.03)',
      }
    },
  },
  plugins: [],
}
