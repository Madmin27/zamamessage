import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight: "#0f172a",
        aurora: "#38bdf8",
        sunset: "#f97316"
      },
      animation: {
        'in': 'in 0.5s ease-out',
        'spin': 'spin 1s linear infinite',
      },
      keyframes: {
        in: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    }
  },
  plugins: []
};

export default config;
