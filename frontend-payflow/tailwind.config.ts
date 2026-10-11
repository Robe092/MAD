import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        payflow: {
          dark: "#070B14",
          card: "rgba(15, 23, 42, 0.85)",
          border: "rgba(148, 163, 184, 0.16)",
          paypalBlue: "#003087",
          paypalCyan: "#0070BA",
          paypalGold: "#FFC439",
          emerald: "#10B981",
          amber: "#F59E0B",
          rose: "#F43F5E"
        }
      }
    },
  },
  plugins: [],
};
export default config;
