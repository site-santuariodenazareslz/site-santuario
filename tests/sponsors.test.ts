import assert from "node:assert/strict";
import test from "node:test";
import { parseGoogleDocument } from "../scripts/google-doc-parser";

const cell = (value: string) => ({
  content: [
    { paragraph: { elements: [{ textRun: { content: `${value}\n` } }] } },
  ],
});

const documentWithTable = (rows: string[][]) => ({
  title: "Apoiadores",
  body: {
    content: [
      {
        table: {
          tableRows: rows.map((row) => ({ tableCells: row.map(cell) })),
        },
      },
    ],
  },
});

test("lê categorias e URLs opcionais no bloco sponsors", () => {
  const page = parseGoogleDocument(
    documentWithTable([
      ["sponsors"],
      ["# categoria", "logo", "nome", "link opcional"],
      [
        "Patrocínio",
        "/prefeitura.webp",
        "Prefeitura de São Luís",
        "https://saoluis.ma.gov.br/",
      ],
      ["Apoio", "/loja.webp", "Loja das Cadeiras", ""],
    ]),
  );
  const block = page.blocks.find((candidate) => candidate.type === "sponsors");

  assert.equal(block?.type, "sponsors");
  if (block?.type !== "sponsors") return;
  assert.deepEqual(block.sponsors, [
    {
      category: "Patrocínio",
      image: "/prefeitura.webp",
      name: "Prefeitura de São Luís",
      href: "https://saoluis.ma.gov.br/",
    },
    {
      category: "Apoio",
      image: "/loja.webp",
      name: "Loja das Cadeiras",
      href: undefined,
    },
  ]);
});

test("lê um id opcional antes das marcas", () => {
  const page = parseGoogleDocument(
    documentWithTable([
      ["sponsors"],
      ["patrocinadores", "", "", ""],
      ["Patrocínio", "/prefeitura.webp", "Prefeitura de São Luís", ""],
    ]),
  );
  const block = page.blocks.find((candidate) => candidate.type === "sponsors");

  assert.equal(block?.type, "sponsors");
  if (block?.type !== "sponsors") return;
  assert.equal(block.id, "patrocinadores");
  assert.equal(block.sponsors.length, 1);
});

test("preserva listas com marcadores e formatação no texto do teaser", async () => {
  const richCell = (
    paragraphs: Array<{ text: string; bullet?: boolean; bold?: boolean }>,
  ) => ({
    content: paragraphs.map(({ text, bullet, bold }) => ({
      paragraph: {
        ...(bullet ? { bullet: { listId: "list-1" } } : {}),
        elements: [
          {
            textRun: {
              content: `${text}\n`,
              textStyle: { bold },
            },
          },
        ],
      },
    })),
  });
  const page = parseGoogleDocument({
    title: "Teaser",
    body: {
      content: [
        {
          table: {
            tableRows: [
              { tableCells: [cell("teaser-image")] },
              {
                tableCells: [
                  cell("/comidas.webp"),
                  cell("Comidas do Círio"),
                  cell("Comidas típicas"),
                  richCell([
                    { text: "A variedade inclui:" },
                    { text: "Comidas típicas", bullet: true, bold: true },
                    { text: "Churrasquinhos", bullet: true },
                  ]),
                  cell("direita"),
                ],
              },
            ],
          },
        },
      ],
    },
  });
  const block = page.blocks.find(
    (candidate) => candidate.type === "teaser-image",
  );

  assert.equal(block?.type, "teaser-image");
  if (block?.type !== "teaser-image") return;
  assert.equal(
    block.text,
    "A variedade inclui:\n<ul><li><strong>Comidas típicas</strong></li><li>Churrasquinhos</li></ul>",
  );
});
