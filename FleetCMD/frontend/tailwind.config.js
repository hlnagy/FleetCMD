/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sapphire: {
          50: '#f0f5f8',
          100: '#d9e5ed',
          300: '#5c87a1',
          500: '#35627A',
          600: '#2a5065',
          700: '#203e4f',
          900: '#142733',
        },
        roseash: {
          100: '#fcf3f2',
          300: '#E5AEA9',
          500: '#d48d87',
        },
        terracotta: {
          100: '#f7ebe9',
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
          50: '#FFFFFF',
          100: '#F5F5F5',
          200: '#EAEAEA',
          300: '#E0E0E0',
        },
        sage: {
          100: '#f0f3f3',
          300: '#b2bcbb',
          500: '#8E9A98',
          700: '#687472',
        }
      },
    },
  },
  plugins: [],
}
