/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF0000', // Red
        'dark-teal': '#004B5B',
        'bright-teal': '#00B19C',
        'dark-crimson': '#6F003C',
        'hover-red': '#C70000',
      },
    },
  },
  plugins: [],
};