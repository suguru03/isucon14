import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/{**,.client,.server}/**/*.{js,jsx,ts,tsx}"],
  plugins: [],
  safelist: [{ pattern: /bg-.+-600/ }, { pattern: /border-.+-500/ }],
} satisfies Config;
