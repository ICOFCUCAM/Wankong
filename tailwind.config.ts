import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        // ── WANKONG brand palette (single source of truth) ──────────────
        brand: {
          cyan:   "#00D9FF",
          purple: "#9D4EDD",
          gold:   "#FFB800",
          mint:   "#00F5A0",
          orange: "#FF6B00",
          pink:   "#FF006E",
        },
        // Surface tokens — near-black base + elevated layers
        ink:      "#0B0814", // page background
        surface:  "#120C22", // elevated cards/panels
        "surface-2": "#0F0A1E", // deeper inset
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "marquee": { "0%": { transform: "translateX(0)" }, "100%": { transform: "translateX(-50%)" } },
        "count-up": { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
        "shimmer": { "100%": { transform: "translateX(100%)" } },
        "fade-up": { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "marquee": "marquee 28s linear infinite",
        "count-up": "count-up 0.4s ease-out forwards",
        "shimmer": "shimmer 1.6s infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16,1,0.3,1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
