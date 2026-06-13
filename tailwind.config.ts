import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#f0f4ff",
          100: "#dce6ff",
          500: "#3b5bdb",
          600: "#2f4ac2",
          700: "#2340a8",
          900: "#0f1e5c",
        },
        surface: {
          0:   "#ffffff",
          50:  "#f8f9fc",
          100: "#f0f2f8",
          200: "#e4e7f0",
          border: "#dde1ee",
        },
        ink: {
          primary:   "#0f1e3d",
          secondary: "#4a5578",
          muted:     "#8892b0",
        },
        success: { 50: "#edfcf2", 600: "#16a34a" },
        warning: { 50: "#fffbeb", 600: "#d97706" },
        danger:  { 50: "#fff1f2", 600: "#dc2626" },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "10px",
        lg: "14px",
        xl: "20px",
      },
    },
  },
  plugins: [],
}
export default config
