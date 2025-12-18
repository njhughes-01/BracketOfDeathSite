/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#104dc6", // Deep Electric Blue
        "primary-hover": "#0e3da0",
        "primary-dark": "#0a3690",
        // Standardizing accent to the neon lime/yellow from design
        "accent": "#DFFF00",
        "accent-lime": "#ccff00",
        "tennis-green": "#ccff00",
        "neon-accent": "#ccff00",
        "background-light": "#f6f6f8",
        "background-dark": "#0f1115", // Deep charcoal from plan
        "surface-dark": "#1a2230",
        "surface-dark-lighter": "#242c3d",
        "card-dark": "#161b26",
        "surface": "#1c1f27",
        "input-dark": "#242a38",
        "input-border": "#3b4354",
        "error": "#ef4444",
      },
      fontFamily: {
        "display": ["Lexend", "sans-serif"],
        "sans": ["Lexend", "sans-serif"],
      },
      boxShadow: {
        "glow": "0 0 15px rgba(204, 255, 0, 0.2)",
        "glow-accent": "0 0 15px rgba(204, 255, 0, 0.3)",
        "glow-primary": "0 0 20px rgba(16, 77, 198, 0.4)",
      },
      backgroundImage: {
        'court-gradient': 'linear-gradient(135deg, rgba(16, 77, 198, 0.15) 0%, rgba(16, 22, 34, 0) 100%)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}