import type { Page, SeoBlock } from "./types";

export type PageSeo = {
  title: string;
  description: string;
  metaDescription: string;
  image?: string;
  imageAlt?: string;
};

export function resolvePageSeo(page: Page): PageSeo {
  const seoBlock = page.blocks.find(
    (block): block is SeoBlock => block.type === "seo",
  );
  const banner = page.blocks.find(
    (
      block,
    ): block is Extract<Page["blocks"][number], { type: "news-banner" }> =>
      block.type === "news-banner",
  );

  const description = seoBlock?.description ?? page.description;
  const metaDescription = seoBlock?.metaDescription ?? page.description;
  const image = seoBlock?.image ?? banner?.image;
  const imageAlt = seoBlock?.imageAlt ?? banner?.imageAlt;

  return {
    title: page.title,
    description,
    metaDescription,
    image,
    imageAlt,
  };
}
