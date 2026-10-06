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
