import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}", "./pages/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backdropBlur: {
        none: '0',
        sm: '0',    // Disable blur for dropdowns
        DEFAULT: '0',
        md: '0',
        lg: '0',
        xl: '0',
        '2xl': '0',
        '3xl': '0',
      },
      colors: {
        // Tech-Noir Ana Renkler
        midnight: "#0A0A1A",
        "cyber-blue": "#00BFFF",
        "neon-green": "#39FF14",
        "neon-purple": "#BF00FF",
        "neon-orange": "#FF8C00",
        "gold-yellow": "#FFD700",
        "text-light": "#E0E0FF",
        "parchment-light": "#F5DEB3",
        "parchment-dark": "#D2B48C",
        
        // Legacy (backward compatibility)
        aurora: "#00BFFF",
        sunset: "#FF8C00"
      },
      boxShadow: {
        'glow-blue': '0 0 8px #00BFFF, 0 0 12px #00BFFF',
        'glow-blue-strong': '0 0 30px rgba(0, 191, 255, 0.8), inset 0 0 20px rgba(0, 191, 255, 0.4)',
        'glow-green': 'none',
        'glow-purple': '0 0 8px #BF00FF, 0 0 12px #BF00FF',
        'glow-orange': '0 0 8px #FF8C00, 0 0 12px #FF8C00',
        'glow-yellow': '0 0 8px rgba(255, 215, 0, 0.6)',
      },
      animation: {
        'in': 'in 0.5s ease-out',
        'spin': 'spin 1s linear infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
      keyframes: {
        in: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        spin: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 8px #00BFFF, 0 0 12px #00BFFF' },
          '50%': { boxShadow: '0 0 20px #00BFFF, 0 0 30px #00BFFF' },
        }
      }
    }
  },
  plugins: []
};

export default config;
