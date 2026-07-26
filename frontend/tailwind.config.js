/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{html,jsx,tsx,vue,js,ts}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          dark: 'rgb(var(--brand-dark) / <alpha-value>)',
        },
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        'surface-2': 'rgb(var(--surface-2) / <alpha-value>)',
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          muted: 'rgb(var(--ink-muted) / <alpha-value>)',
        },
        line: 'rgb(var(--line) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
      },
      boxShadow: {
        panel: '0 10px 30px -12px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
}
