/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sapphire: {
          50: 'rgb(var(--color-sapphire-50) / <alpha-value>)',
          100: 'rgb(var(--color-sapphire-100) / <alpha-value>)',
          300: 'rgb(var(--color-sapphire-300) / <alpha-value>)',
          500: 'rgb(var(--color-sapphire-500) / <alpha-value>)',
          600: 'rgb(var(--color-sapphire-600) / <alpha-value>)',
          700: 'rgb(var(--color-sapphire-700) / <alpha-value>)',
          900: 'rgb(var(--color-sapphire-900) / <alpha-value>)',
        },
        roseash: {
          100: 'rgb(var(--color-roseash-100) / <alpha-value>)',
          300: 'rgb(var(--color-roseash-300) / <alpha-value>)',
          500: 'rgb(var(--color-roseash-500) / <alpha-value>)',
        },
        terracotta: {
          100: 'rgb(var(--color-terracotta-100) / <alpha-value>)',
          500: '#B46258',
          600: '#9d5249',
        },
        periwinkle: {
          100: '#f0f1f8',
          300: '#c5c7e4',
          500: '#A6A9D0',
          700: '#7d81b3',
        },
        morning: {
          50: 'rgb(var(--color-morning-50) / <alpha-value>)',
          100: 'rgb(var(--color-morning-100) / <alpha-value>)',
          200: 'rgb(var(--color-morning-200) / <alpha-value>)',
          300: 'rgb(var(--color-morning-300) / <alpha-value>)',
        },
        sage: {
          100: 'rgb(var(--color-sage-100) / <alpha-value>)',
          300: '#b2bcbb',
          500: 'rgb(var(--color-sage-500) / <alpha-value>)',
          700: 'rgb(var(--color-sage-700) / <alpha-value>)',
        }
      },
    },
  },
  plugins: [],
}
