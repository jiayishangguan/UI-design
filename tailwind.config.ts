import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        background: "#020602",
        panel: "#09120b",
        surface: "#0f1b12",
        outline: "rgba(173, 255, 195, 0.12)",
        glow: "#6fbf88",
        muted: "#92a198"
      },
      fontFamily: {
        sans: ["Avenir Next", "Trebuchet MS", "Segoe UI", "sans-serif"],
        serif: ["Baskerville", "Georgia", "Palatino Linotype", "serif"]
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(132,193,148,.10), 0 18px 48px rgba(9,26,14,.36), inset 0 1px 0 rgba(255,255,255,.03)"
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top right, rgba(42,108,57,.18), transparent 30%), radial-gradient(circle at 20% 85%, rgba(33,83,43,.18), transparent 26%), linear-gradient(135deg, #010301 0%, #031007 52%, #08150c 100%)"
      }
    }
  },
  plugins: []
};

export default config;
