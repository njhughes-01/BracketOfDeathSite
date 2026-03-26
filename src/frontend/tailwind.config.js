/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Bracket of Death brand colors (from logo)
        'bod-black': '#000000',
        'bod-gray': '#808080',
        'bod-charcoal': '#333333',
        'bod-light': '#F5F5F5',
        'bod-white': '#FFFFFF',
        
        // Keep existing colors for gradual migration
        primary: "#000000", // Changed to black to match BOD branding
        "primary-hover": "#333333", // Charcoal
        "primary-dark": "#000000",
        accent: "#808080", // Gray accent
        "accent-lime": "#ccff00", // Keep for tennis theme
        "tennis-green": "#ccff00",
        "neon-accent": "#ccff00",
        "background-light": "#FFFFFF",
        "background-dark": "#000000",
        "surface-dark": "#1a1a1a",
        "surface-dark-lighter": "#333333",
        "card-dark": "#1a1a1a",
        surface: "#F5F5F5",
        "input-dark": "#333333",
        "input-border": "#808080",
        error: "#ef4444",
      },
      fontFamily: {
        display: ["Lexend", "sans-serif"],
        sans: ["Lexend", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 15px rgba(204, 255, 0, 0.2)",
        "glow-accent": "0 0 15px rgba(204, 255, 0, 0.3)",
        "glow-primary": "0 0 20px rgba(16, 77, 198, 0.4)",
      },
      backgroundImage: {
        "court-gradient":
          "linear-gradient(135deg, rgba(16, 77, 198, 0.15) 0%, rgba(16, 22, 34, 0) 100%)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/container-queries"),
  ],
};
