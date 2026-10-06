import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  output: "static",
  site: "https://site-santuariodenazareslz.github.io",
  base: "/site-santuario",
  integrations: [sitemap()],
});
