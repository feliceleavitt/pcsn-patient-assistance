import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#182126",
        paper: "#f7f5f1",
        mist: "#e7ece8",
        pine: "#2d6a4f",
        coral: "#b95c4b",
        gold: "#d7a43b"
      },
      boxShadow: {
        soft: "0 18px 40px rgba(24, 33, 38, 0.08)",
      },
    },
  },
  plugins: [],
} satisfies Config;
