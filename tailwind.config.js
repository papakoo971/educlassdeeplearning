/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        mint: { DEFAULT: "#36a58b", dark: "#247f6a" },
        ink: "#193238",
        muted: "#52727a",
        line: "#d4e3e1",
        warn: "#a32525",
        panel: "#ffffff",
      },
    },
  },
  plugins: [],
};
