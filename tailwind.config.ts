import type { Config } from 'tailwindcss'

export default <Partial<Config>>{
  content: [
    './app/components/**/*.{vue,js,ts}',
    './app/layouts/**/*.vue',
    './app/pages/**/*.vue',
    './app/app.vue',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Nunito', 'Quicksand', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['Quicksand', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      colors: {
        forest: {
          50: '#eefaf2',
          100: '#d5f3df',
          200: '#ade6c2',
          300: '#78d29d',
          400: '#41b876',
          500: '#1f9c5a',
          600: '#147d47',
          700: '#12633b',
          800: '#124f31',
          900: '#1b3b2b',
        },
        sun: {
          100: '#fef7d6',
          300: '#fde067',
          400: '#facc15',
          500: '#eab308',
          600: '#ca8a04',
        },
        wood: {
          100: '#f7ead9',
          300: '#dfc099',
          500: '#b67d43',
          700: '#7f4f24',
          900: '#4e2e12',
        },
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-8px)' },
          '40%': { transform: 'translateX(8px)' },
          '60%': { transform: 'translateX(-6px)' },
          '80%': { transform: 'translateX(6px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        pop: {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '70%': { transform: 'scale(1.06)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        shake: 'shake 0.45s ease-in-out',
        float: 'float 3s ease-in-out infinite',
        pop: 'pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
      },
    },
  },
}
