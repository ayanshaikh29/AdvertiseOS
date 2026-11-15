/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-hover": "var(--surface-hover)",
        border: "var(--border)",
        muted: "var(--text-muted)",
        brand: "var(--blue)",
        "brand-soft": "var(--blue-soft)",
        indigo2: "var(--indigo)",
        success: "var(--success)",
        warning: "var(--warning)",
        danger: "var(--danger)",
        ink: "#0b1220",
        pill: "#E5E5E5",
      },
      fontFamily: {
        display: ["'Plus Jakarta Sans'", "Inter", "sans-serif"],
        sans: ["Inter", "sans-serif"],
      },
      borderRadius: {
        "3xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
