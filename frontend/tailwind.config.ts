import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#2563eb', dark: '#1d4ed8' },
        accent: '#10b981',
        'salud-light': '#e0f2fe',
        'salud-sidebar': '#7dd3fc',
      },
    },
  },
  plugins: [],
};

export default config;
