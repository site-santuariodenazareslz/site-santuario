import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export default defineConfig({
  output: "static",
  site: "https://santuariodenazareslz.com.br",
  integrations: [
    sitemap({
      xslURL: "/sitemap.xsl",
    }),
    {
      name: "copy-sitemap-xml",
      hooks: {
        "astro:build:done": async ({ dir }) => {
          const destDir = fileURLToPath(dir);
          const sitemap0 = path.join(destDir, "sitemap-0.xml");
          const sitemapXml = path.join(destDir, "sitemap.xml");
          if (fs.existsSync(sitemap0)) {
            fs.copyFileSync(sitemap0, sitemapXml);
          }
        },
      },
    },
  ],
});
