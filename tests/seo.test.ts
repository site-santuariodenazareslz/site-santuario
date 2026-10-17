import assert from "node:assert/strict";
import test from "node:test";
import { parseGoogleDocument } from "../scripts/google-doc-parser";
import { buildJsonLdSchema, resolvePageSeo } from "../src/lib/seo";
import type { Page } from "../src/lib/types";

const page = (overrides: Partial<Page> = {}): Page => ({
  title: "Santuário",
  description: "Descrição da página",
  blocks: [
    {
      type: "news-banner",
      image: "/images/noticia.webp",
      imageAlt: "Imagem da notícia",
      category: "Notícia",
    },
  ],
  ...overrides,
});

const document = (overrides: Partial<Page> = {}) => ({
  title: "Teste",
  body: {
    content: [
      {
        table: {
          tableRows: [
            {
              tableCells: [
                {
                  content: [
                    {
                      paragraph: {
                        elements: [{ textRun: { content: "seo\n" } }],
                      },
                    },
                  ],
                },
              ],
            },
            {
              tableCells: [
                {
                  content: [
                    {
                      paragraph: {
                        elements: [
                          {
                            textRun: {
                              content: "Descrição para compartilhamento\n",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
                {
                  content: [
                    {
                      paragraph: {
                        elements: [
                          { textRun: { content: "Meta description\n" } },
                        ],
                      },
                    },
                  ],
                },
                {
                  content: [
                    {
                      paragraph: {
                        elements: [
                          { textRun: { content: "/images/og.webp\n" } },
                        ],
                      },
                    },
                  ],
                },
                {
                  content: [
                    {
                      paragraph: {
                        elements: [
                          {
                            textRun: {
                              content: "Imagem de compartilhamento\n",
                            },
                          },
                        ],
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      },
    ],
  },
  ...overrides,
});

test("lê os campos do block SEO vindos do Google Docs", () => {
  const page = parseGoogleDocument(document());
  const seo = page.blocks.find((block) => block.type === "seo");

  assert.equal(seo?.type, "seo");
  if (seo?.type !== "seo") return;
  assert.equal(seo.description, "Descrição para compartilhamento");
  assert.equal(seo.metaDescription, "Meta description");
  assert.equal(seo.image, "/images/og.webp");
  assert.equal(seo.imageAlt, "Imagem de compartilhamento");
});

test("usa a imagem e a descrição configuradas pelo block SEO", () => {
  const seo = resolvePageSeo(
    page({
      blocks: [
        {
          type: "seo",
          description: "Descrição para compartilhamento",
          metaDescription: "Meta description",
          image: "/images/og.webp",
          imageAlt: "Imagem de compartilhamento",
        },
        {
          type: "news-banner",
          image: "/images/noticia.webp",
          imageAlt: "Imagem da notícia",
          category: "Notícia",
        },
      ],
    }),
  );

  assert.equal(seo.title, "Santuário");
  assert.equal(seo.description, "Descrição para compartilhamento");
  assert.equal(seo.metaDescription, "Meta description");
  assert.equal(seo.image, "/images/og.webp");
  assert.equal(seo.imageAlt, "Imagem de compartilhamento");
});

test("usa o banner da página quando o block SEO não configura a imagem", () => {
  const seo = resolvePageSeo(page());

  assert.equal(seo.title, "Santuário");
  assert.equal(seo.description, "Descrição da página");
  assert.equal(seo.metaDescription, "Descrição da página");
  assert.equal(seo.image, "/images/noticia.webp");
  assert.equal(seo.imageAlt, "Imagem da notícia");
});

test("gera dados estruturados JSON-LD completos com Organization, CatholicChurch e contactPoint", () => {
  const seo = resolvePageSeo(page());
  const jsonLd = buildJsonLdSchema({
    siteOrigin: "https://santuariodenazareslz.com.br",
    pageUrl: "https://santuariodenazareslz.com.br/",
    seo,
  });

  assert.equal(jsonLd["@context"], "https://schema.org");
  assert.ok(Array.isArray(jsonLd["@graph"]));

  const org = jsonLd["@graph"].find(
    (item: any) =>
      Array.isArray(item["@type"]) && item["@type"].includes("Organization"),
  ) as any;

  assert.ok(org, "Entidade Organization deve existir no schema");
  assert.equal(org.name, "Santuário Nossa Senhora de Nazaré");
  assert.equal(org.taxID, "00.112.399/0001-00");
  assert.equal(org.telephone, "+55-98-3238-3640");
  assert.equal(org.email, "pnsnaz@hotmail.com");

  assert.equal(org.address["@type"], "PostalAddress");
  assert.equal(org.address.addressLocality, "São Luís");
  assert.equal(org.address.addressRegion, "MA");
  assert.equal(org.address.postalCode, "65054-225");
  assert.equal(org.address.addressCountry, "BR");

  assert.ok(Array.isArray(org.contactPoint));
  assert.ok(org.contactPoint.length >= 2);
  assert.equal(org.contactPoint[0].contactType, "customer service");
  assert.equal(org.contactPoint[0].email, "pnsnaz@hotmail.com");

  assert.ok(Array.isArray(org.sameAs));
  assert.ok(
    org.sameAs.includes("https://www.instagram.com/santuariodenazareslz/"),
  );
  assert.ok(
    org.sameAs.includes("https://www.youtube.com/@santuariodenazareslz"),
  );

  const website = jsonLd["@graph"].find(
    (item: any) => item["@type"] === "WebSite",
  );
  assert.ok(website, "Entidade WebSite deve existir");

  const webPage = jsonLd["@graph"].find(
    (item: any) => item["@type"] === "WebPage",
  );
  assert.ok(webPage, "Entidade WebPage deve existir");
});
