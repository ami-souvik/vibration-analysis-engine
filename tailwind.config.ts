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
        "bg-deep": "var(--bg-deep)",
        "bg-base": "var(--bg-base)",
        "bg-elev": "var(--bg-elev)",
        "bg-elev-2": "var(--bg-elev-2)",
        border: "var(--border)",
        "border-soft": "var(--border-soft)",
        text: "var(--text)",
        "text-mute": "var(--text-mute)",
        "text-dim": "var(--text-dim)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        cyan: "var(--cyan)",
        "cyan-soft": "var(--cyan-soft)",
        green: "var(--green)",
        red: "var(--red)",
        "red-soft": "var(--red-soft)",
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
