/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F8FAFC",
        surface: {
          DEFAULT: "#FFFFFF",
          border: "#E2E8F0",
          hover: "#F1F5F9"
        },
        navy: {
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155"
        },
        emerald: {
          600: "#059669",
          500: "#10B981",
          50: "#ECFDF5"
        },
        indigo: {
          600: "#4F46E5",
          500: "#6366F1",
          50: "#EEF2FF"
        },
        danger: {
          500: "#EF4444",
          50: "#FEF2F2"
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'glass': '0 8px 32px 0 rgba(15, 23, 42, 0.08)'
      }
    },
  },
  plugins: [],
}
