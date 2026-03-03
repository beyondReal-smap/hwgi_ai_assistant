import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        hanwha: {
          orange: "#F37321",
          "orange-dark": "#E06A1B",
          "orange-deeper": "#C75E14",
          "orange-light": "#FFF3EB",
          "orange-muted": "#FDEEDE",
          navy: "#1A2B4A",
          "navy-light": "#2D4168",
          "navy-muted": "#3D537F",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F7F9FC",
          tertiary: "#EEF2F7",
        },
        border: {
          light: "#E2E8F0",
          DEFAULT: "#CBD5E0",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 12px 0 rgba(26, 43, 74, 0.08)",
        "card-hover": "0 8px 24px 0 rgba(26, 43, 74, 0.14)",
        modal: "0 20px 60px 0 rgba(26, 43, 74, 0.20)",
        glass: "0 4px 24px 0 rgba(26, 43, 74, 0.06)",
        glow: "0 0 20px rgba(243, 115, 33, 0.25)",
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "bounce-dot": "bounceDot 1.4s ease-in-out infinite",
        "fade-in-up": "fadeInUp 0.4s ease-out",
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-in-left": "slideInLeft 0.4s ease-out",
        "count-up": "countUp 1s ease-out",
        shimmer: "shimmer 1.5s infinite",
      },
      keyframes: {
        bounceDot: {
          "0%, 60%, 100%": { transform: "translateY(0)" },
          "30%": { transform: "translateY(-8px)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
