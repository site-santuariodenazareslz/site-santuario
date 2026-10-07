import assert from "node:assert/strict";
import test from "node:test";
import { parseGoogleDocument } from "../scripts/google-doc-parser";
import { resolvePageSeo } from "../src/lib/seo";
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
