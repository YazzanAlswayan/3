import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        midnight: {
          950: "#0a0e1f",
          900: "#0d1226",
          800: "#131a33",
          700: "#1a2140",
        },
        sun: {
          DEFAULT: "#f4c76b",
          soft: "#f6d691",
          glow: "#f4c76b33",
        },
        moon: {
          DEFAULT: "#9fb8d9",
          soft: "#c2d4ec",
          glow: "#9fb8d933",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(0,0,0,0.35)",
        glowSun: "0 0 24px rgba(244,199,107,0.25)",
        glowMoon: "0 0 24px rgba(159,184,217,0.25)",
      },
      keyframes: {
        twinkle: {
          "0%, 100%": { opacity: "0.15" },
          "50%": { opacity: "0.9" },
        },
        drift: {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-20px)" },
        },
        pulseGlow: {
          "0%, 100%": { opacity: "0.5" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        twinkle: "twinkle 4s ease-in-out infinite",
        drift: "drift 60s linear infinite alternate",
        pulseGlow: "pulseGlow 3s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
