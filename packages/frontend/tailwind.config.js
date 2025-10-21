/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Minimal Black & Purple Theme
        primary: {
          DEFAULT: '#9333ea', // purple-600
          light: '#a855f7',   // purple-500
          dark: '#7e22ce',    // purple-700
        },
        dark: {
          bg: '#000000',      // Pure black
          surface: '#0a0a0a', // Near black
          elevated: '#141414', // Slightly lighter
          border: '#1f1f1f',  // Subtle border
          hover: '#1a1a1a',   // Hover state
        }
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(147, 51, 234, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(147, 51, 234, 0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan': 'scan 8s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': {
            boxShadow: '0 0 5px rgba(147, 51, 234, 0.3), 0 0 20px rgba(147, 51, 234, 0.1)',
          },
          '100%': {
            boxShadow: '0 0 20px rgba(147, 51, 234, 0.5), 0 0 40px rgba(147, 51, 234, 0.2)',
          },
        },
        scan: {
          '0%, 100%': {
            backgroundPosition: '0 0',
          },
          '50%': {
            backgroundPosition: '100% 100%',
          },
        },
        float: {
          '0%, 100%': {
            transform: 'translateY(0px)',
          },
          '50%': {
            transform: 'translateY(-20px)',
          },
        },
        shimmer: {
          '0%': {
            backgroundPosition: '-1000px 0',
          },
          '100%': {
            backgroundPosition: '1000px 0',
          },
        },
      },
      boxShadow: {
        'glow-sm': '0 0 10px rgba(147, 51, 234, 0.3)',
        'glow-md': '0 0 20px rgba(147, 51, 234, 0.4)',
        'glow-lg': '0 0 30px rgba(147, 51, 234, 0.5)',
        'purple': '0 4px 14px 0 rgba(147, 51, 234, 0.39)',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Consolas', 'Monaco', 'monospace'],
        'display': ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
