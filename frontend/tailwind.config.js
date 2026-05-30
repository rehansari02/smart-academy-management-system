/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        rozha: ['"Rozha One"', 'serif'],
      },
      colors: {
        primary: "#1e3a8a", // Dark Blue (Like screenshot)
        secondary: "#3b82f6",
        accent: "#f59e0b", // Orange/Gold
      },
      animation: {
        'whatsapp-pulse': 'whatsapp-pulse 2s ease-in-out infinite',
      },
      keyframes: {
        'whatsapp-pulse': {
          '0%, 100%': { transform: 'scale(1)', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.3)' },
          '50%': { transform: 'scale(1.08)', boxShadow: '0 8px 30px rgba(37, 211, 102, 0.6)' },
        },
      },
    },
  },
  plugins: [],
}