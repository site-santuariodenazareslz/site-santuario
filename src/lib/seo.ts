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

export function buildJsonLdSchema({
  siteOrigin,
  pageUrl,
  seo,
}: {
  siteOrigin: string;
  pageUrl: string;
  seo: PageSeo;
}) {
  const logoUrl = `${siteOrigin}/images/99f2a40cbf6fe023.webp`;
  const defaultImage = `${siteOrigin}/images/99f2a40cbf6fe023.webp`;
  const pageImageUrl = seo.image
    ? seo.image.startsWith("http")
      ? seo.image
      : `${siteOrigin}${seo.image.startsWith("/") ? "" : "/"}${seo.image}`
    : defaultImage;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "CatholicChurch", "PlaceOfWorship"],
        "@id": `${siteOrigin}/#organization`,
        name: "Santuário Nossa Senhora de Nazaré",
        alternateName: "Santuário de Nazaré São Luís",
        legalName: "Santuário Nossa Senhora de Nazaré",
        taxID: "00.112.399/0001-00",
        url: siteOrigin,
        logo: {
          "@type": "ImageObject",
          url: logoUrl,
        },
        image: defaultImage,
        description:
          "Santuário católico localizado no Cohatrac em São Luís - MA. Comunidade de fé e devoção, celebração do tradicional Círio de Nazaré e ações de evangelização.",
        telephone: "+55-98-3238-3640",
        email: "pnsnaz@hotmail.com",
        address: {
          "@type": "PostalAddress",
          streetAddress: "Cohatrac I",
          addressLocality: "São Luís",
          addressRegion: "MA",
          postalCode: "65054-225",
          addressCountry: "BR",
        },
        contactPoint: [
          {
            "@type": "ContactPoint",
            telephone: "+55-98-3238-3640",
            contactType: "customer service",
            email: "pnsnaz@hotmail.com",
            availableLanguage: ["Portuguese"],
          },
          {
            "@type": "ContactPoint",
            telephone: "+55-98-99909-5939",
            contactType: "customer service",
            email: "pnsnaz@hotmail.com",
            availableLanguage: ["Portuguese"],
          },
        ],
        sameAs: [
          "https://www.instagram.com/santuariodenazareslz/",
          "https://www.youtube.com/@santuariodenazareslz",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${siteOrigin}/#website`,
        url: siteOrigin,
        name: "Santuário Nossa Senhora de Nazaré",
        description:
          "Site oficial do Santuário Nossa Senhora de Nazaré em São Luís - MA.",
        publisher: {
          "@id": `${siteOrigin}/#organization`,
        },
        inLanguage: "pt-BR",
      },
      {
        "@type": "WebPage",
        "@id": pageUrl,
        url: pageUrl,
        name: seo.title,
        description: seo.description,
        isPartOf: {
          "@id": `${siteOrigin}/#website`,
        },
        primaryImageOfPage: pageImageUrl,
        inLanguage: "pt-BR",
      },
    ],
  };
}
