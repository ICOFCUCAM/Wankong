import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";

// Re-brand the static index.html at build time for the SmartKong (market)
// deployment, so crawlers and link unfurls get the right title/description/OG
// before the SPA hydrates. The default (WANKONG) HTML is left untouched.
function brandHtml(mode: string): Plugin {
  const isMarket = mode === "market" || process.env.VITE_SITE_MODE === "market";
  return {
    name: "smartkong-brand-html",
    transformIndexHtml(html) {
      if (!isMarket) return html;
      const title = "SmartKong — The World's Shopping Layer";
      const desc =
        "SmartKong is the shopping layer for the whole internet — one AI search across every store on Earth, one place to compare every price, one cart to check out once.";
      return html
        .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
        .replace(/(<meta name="description" content=")[^"]*(")/, `$1${desc}$2`)
        .replace(/(<meta property="og:site_name" content=")[^"]*(")/, `$1SmartKong$2`)
        .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${title}$2`)
        .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${desc}$2`)
        .replace(/(<meta name="twitter:title" content=")[^"]*(")/, `$1${title}$2`)
        .replace(/(<meta name="twitter:description" content=")[^"]*(")/, `$1${desc}$2`)
        .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/, `$1SmartKong$2`)
        .replace(/(<meta name="theme-color" content=")[^"]*(")/, `$1#070A14$2`);
    },
    // Rebrand the emitted PWA manifest for the SmartKong install experience.
    closeBundle() {
      if (!isMarket) return;
      const out = path.resolve(__dirname, "dist/manifest.json");
      try {
        const m = JSON.parse(fs.readFileSync(out, "utf8"));
        m.name = "SmartKong — The World's Shopping Layer";
        m.short_name = "SmartKong";
        m.description = "One AI search across every store on Earth. Compare every price, check out once.";
        m.background_color = "#070A14";
        m.theme_color = "#2563EB";
        m.categories = ["shopping", "productivity", "lifestyle"];
        if (Array.isArray(m.shortcuts)) {
          m.shortcuts = [
            { name: "Search products", url: "/shop" },
            { name: "Ask the AI", url: "/ai-solver" },
            { name: "Your wishlist", url: "/wishlist" },
          ];
        }
        fs.writeFileSync(out, JSON.stringify(m, null, 2));
      } catch {
        /* manifest absent — nothing to rebrand */
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), brandHtml(mode)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "ui-vendor": ["lucide-react", "sonner", "@tanstack/react-query"],
          "supabase": ["@supabase/supabase-js"],
          "charts": ["recharts"],
        },
      },
    },
  },
}));
