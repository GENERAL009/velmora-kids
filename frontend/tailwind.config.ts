import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#FDF5F5",
          100: "#F9E8E8",
          200: "#F3D1D1",
          300: "#E8ABAB",
          400: "#D99090",
          500: "#C77D7D",
          600: "#B56A6A",
          700: "#9C5555",
          800: "#804646",
          900: "#663838",
          950: "#4A2828",
        },
        secondary: {
          50: "#F2FAF5",
          100: "#E8F4ED",
          200: "#D1E9DB",
          300: "#B3D9C2",
          400: "#95C9A9",
          500: "#7DAF8E",
          600: "#6A9C7A",
          700: "#558066",
          800: "#466652",
          900: "#3A5444",
          950: "#2A3D31",
        },
        accent: {
          50: "#FBF6ED",
          100: "#F5E6C8",
          200: "#EDD5A3",
          300: "#E2BF78",
          400: "#D9AD5A",
          500: "#C9A96E",
          600: "#B8923E",
          700: "#9A7A34",
          800: "#7D632B",
          900: "#665123",
          950: "#4A3B19",
        },
        neutral: {
          50: "#FAF9F7",
          100: "#F5F3F0",
          200: "#E8E5E0",
          300: "#D1CCC4",
          400: "#B5AFA6",
          500: "#9C9589",
          600: "#7D776C",
          700: "#6B6560",
          800: "#504B47",
          900: "#3D3835",
          950: "#1A1714",
        },
        cream: "#FDF8F4",
        charcoal: "#2D2926",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: [
          "var(--font-playfair)",
          "Playfair Display",
          "Georgia",
          "serif",
        ],
      },
      borderRadius: {
        DEFAULT: "12px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "40px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
        "34": "8.5rem",
        "38": "9.5rem",
      },
      screens: {
        xs: "480px",
        "3xl": "1920px",
      },
      boxShadow: {
        soft: "0 2px 15px -3px rgba(45, 41, 38, 0.07), 0 10px 20px -2px rgba(45, 41, 38, 0.04)",
        card: "0 4px 25px -5px rgba(45, 41, 38, 0.08), 0 10px 30px -5px rgba(45, 41, 38, 0.04)",
        elevated:
          "0 10px 40px -10px rgba(45, 41, 38, 0.12), 0 20px 50px -10px rgba(45, 41, 38, 0.06)",
        glow: "0 0 30px rgba(199, 125, 125, 0.15)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.5s ease-out",
        slideUp: "slideUp 0.5s ease-out",
        slideDown: "slideDown 0.5s ease-out",
        scaleIn: "scaleIn 0.3s ease-out",
        float: "float 3s ease-in-out infinite",
        shimmer: "shimmer 2s infinite",
      },
      aspectRatio: {
        "3/4": "3 / 4",
        "4/3": "4 / 3",
      },
      transitionDuration: {
        "400": "400ms",
      },
    },
  },
  plugins: [],
};
export default config;
