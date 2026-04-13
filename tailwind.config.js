/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@tremor/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ddor: {
          navy: '#0E2235',
          blue: '#1A73A8',
          teal: '#2BA5B5',
          light: '#F0F7FA',
        },
        // Tremor color overrides
        tremor: {
          brand: {
            faint: '#F0F7FA',
            muted: '#B5D4F4',
            subtle: '#1A73A8',
            DEFAULT: '#1A73A8',
            emphasis: '#0E2235',
            inverted: '#ffffff',
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
