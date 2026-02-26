import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#0a0a0f",
          secondary: "#111114",
          card: "#16161a",
        },
        border: "#222228",
        accent: "#2D7EFF",
        "text-primary": "#FFFFFF",
        "text-secondary": "#8B95A9",
        positive: "#00D897",
        negative: "#FF4D4D",
      },
      fontFamily: {
        sans: ["DM Sans", "Neue Montreal", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
