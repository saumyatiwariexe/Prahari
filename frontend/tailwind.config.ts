import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#161B22",
        border: "#21262D",
        "density-safe":     "#22C55E",
        "density-warning":  "#F59E0B",
        "density-red":      "#EF4444",
        "density-critical": "#DC2626",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      animation: {
        "pulse-red": "pulseRed 1s ease-in-out infinite",
        "slide-up":  "slideUp 0.3s ease-out",
        "fade-in":   "fadeIn 0.4s ease-out",
      },
      keyframes: {
        pulseRed: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0.6)" },
          "50%":      { boxShadow: "0 0 0 8px rgba(239,68,68,0)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(12px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
