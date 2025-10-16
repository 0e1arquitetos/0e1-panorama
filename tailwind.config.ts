import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './lib/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          cobalt: '#3154df',
          lilac: '#dcdfff',
          indigo: '#2436be',
          teal: '#063c46',
          mint: '#0cffcb',
          coral: '#f698ff'
        }
      },
      fontFamily: {
        primary: ['"N27"', '"Exo"', 'sans-serif'],
        secondary: ['"Exo"', 'sans-serif']
      }
    }
  },
  plugins: []
};

export default config;
