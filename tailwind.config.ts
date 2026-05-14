import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#182027",
        paper: "#f7f4ed",
        line: "#ddd6c8",
        pine: "#2f5f52",
        berry: "#8f3f5d",
        amber: "#b87528"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(24, 32, 39, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
