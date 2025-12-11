/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bye': {
          red: '#FF3B3B',
          pink: '#FF6B9D',
          dark: '#0A0A0F',
          darker: '#050508',
          gray: '#1A1A24',
          light: '#2A2A3A',
        }
      },
      fontFamily: {
        'display': ['Unbounded', 'sans-serif'],
        'body': ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(255, 59, 59, 0.3)' },
          '100%': { boxShadow: '0 0 40px rgba(255, 59, 59, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
