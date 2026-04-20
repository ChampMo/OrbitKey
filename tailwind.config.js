/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom ring accent colours — will be used heavily in Step 2
        ring: {
          bg:      "#0f1117",
          surface: "#1a1d27",
          border:  "#2d3148",
          accent:  "#6366f1",
          glow:    "#818cf8",
        },
      },
      animation: {
        "ring-in":  "ringIn 150ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
        "ring-out": "ringOut 120ms ease-in forwards",
      },
      keyframes: {
        ringIn: {
          "0%":   { opacity: "0", transform: "scale(0.7)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        ringOut: {
          "0%":   { opacity: "1", transform: "scale(1)" },
          "100%": { opacity: "0", transform: "scale(0.7)" },
        },
      },
    },
  },
  plugins: [],
};
