/** @type {import('tailwindcss').Config} */
import forms from '@tailwindcss/forms';
import daisyui from 'daisyui';

export default {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',  // Enable dark mode using classes
  theme: {
    extend: {
      colors: {
        'blue': {
          '500': '#1d4ed8',
        },
      },
    },
  },
  plugins: [
    forms,
    daisyui,
  ],
  daisyui: {
    themes: ["light", "dark"],
    darkTheme: "dark",
  },
};