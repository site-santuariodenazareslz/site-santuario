import assert from "node:assert/strict";
import test from "node:test";
import {
  eventsForCategories,
  groupEventsByMonth,
  sortEvents,
} from "../src/lib/event-utils";
import { isEventOnOrAfterDate } from "../src/lib/event-date";
import { parseGoogleDocument } from "../scripts/google-doc-parser";
import type { EventItem } from "../src/lib/types";

const cell = (value: string) => ({
  content: [
    { paragraph: { elements: [{ textRun: { content: `${value}\n` } }] } },
  ],
});

const documentWithTable = (rows: string[][]) => ({
  title: "Eventos",
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

function event(
  overrides: Partial<EventItem> &
    Pick<EventItem, "id" | "startDate" | "startTime">,
): EventItem {
  return {
    id: overrides.id,
    image: "/event.webp",
    imageAlt: "",
    title: overrides.title ?? overrides.id,
    description: "Descrição",
    location: "Santuário",
    categories: overrides.categories,
    category: overrides.category,
    startDate: overrides.startDate,
    startTime: overrides.startTime,
  };
}

test("filtra por qualquer categoria selecionada e deduplica por id", () => {
  const items = [
    event({
      id: "missa",
      startDate: "2026-10-03",
      startTime: "09:00",
      categories: ["Missas", "Círio"],
    }),
    event({
      id: "missa",
      startDate: "2026-10-03",
      startTime: "09:00",
      categories: ["Missas", "Círio"],
    }),
    event({
      id: "festa",
      startDate: "2026-10-04",
      startTime: "10:00",
      categories: ["Festividade"],
    }),
  ];

  assert.deepEqual(
    eventsForCategories(items, ["Círio", "Missas"]).map(({ id }) => id),
    ["missa"],
  );
});

test("mantém compatibilidade com a categoria singular e ordena por data e hora", () => {
  const items = [
    event({
      id: "tarde",
      startDate: "2026-10-03",
      startTime: "17:00",
      category: "Missas, Círio",
    }),
    event({
      id: "amanha",
      startDate: "2026-10-04",
      startTime: "08:00",
      category: "Círio",
    }),
    event({
      id: "manha",
      startDate: "2026-10-03",
      startTime: "08:00",
      category: "Missas",
    }),
  ];

  assert.deepEqual(
    sortEvents(items).map(({ id }) => id),
    ["manha", "tarde", "amanha"],
  );
  assert.deepEqual(
    eventsForCategories(items, ["círio"]).map(({ id }) => id),
    ["tarde", "amanha"],
  );
});

test("agrupa os eventos em ordem cronológica por mês", () => {
  const groups = groupEventsByMonth([
    event({ id: "nov", startDate: "2026-11-01", startTime: "08:00" }),
    event({ id: "oct", startDate: "2026-10-31", startTime: "20:00" }),
  ]);

  assert.deepEqual(
    groups.map(({ key }) => key),
    ["2026-10", "2026-11"],
  );
});

test("mantém evento durante todo o dia e exclui apenas datas anteriores", () => {
  assert.equal(isEventOnOrAfterDate("2026-10-03", "2026-10-03"), true);
  assert.equal(isEventOnOrAfterDate("2026-10-03", "2026-10-04"), false);
  assert.equal(isEventOnOrAfterDate("2026-10-04", "2026-10-03"), true);
});

test("lê múltiplas categorias na tabela events-list do Google Docs", () => {
  const page = parseGoogleDocument(
    documentWithTable([
      ["events-list"],
      ["# id (opcional)"],
      ["agenda"],
      [
        "# imagem",
        "texto alternativo",
        "categorias",
        "título",
        "descrição",
        "local",
        "data",
        "hora",
        "hora final (opcional)",
      ],
      [
        "/missa.webp",
        "Celebração",
        "Missas, Círio",
        "Missa",
        "Descrição",
        "Santuário",
        "2026-10-03",
        "08:00",
        "10:30",
      ],
    ]),
  );
  const block = page.blocks.find(
    (candidate) => candidate.type === "events-list",
  );

  assert.equal(block?.type, "events-list");
  if (block?.type !== "events-list") return;
  assert.deepEqual(block.events?.[0].categories, ["Missas", "Círio"]);
  assert.equal(block.events?.[0].endTime, "10:30");
});

test("mantém evento cirio com horário digitado como 9:00", () => {
  const page = parseGoogleDocument(
    documentWithTable([
      ["events-list"],
      ["eventos"],
      [
        "# imagem",
        "alt",
        "categoria",
        "título",
        "descrição",
        "local",
        "data",
        "hora",
        "hora final",
      ],
      [
        "/doacao.webp",
        "Projeto Irmãos de Sangue",
        "cirio",
        "Doação de Sangue",
        "Participe dessa ação de solidariedade.",
        "Paróquia Santuário Nossa Senhora de Nazaré",
        "2026-10-19",
        "9:00",
        "19:00",
      ],
    ]),
  );
  const block = page.blocks.find(
    (candidate) => candidate.type === "events-list",
  );

  assert.equal(block?.type, "events-list");
  if (block?.type !== "events-list") return;
  assert.equal(block.events?.length, 1);
  assert.equal(block.events?.[0].startTime, "09:00");
  assert.equal(block.events?.[0].endTime, "19:00");
  assert.deepEqual(block.events?.[0].categories, ["cirio"]);
  assert.equal(eventsForCategories(block.events ?? [], ["cirio"]).length, 1);
});

test("mantém hora final opcional ao ler tabelas antigas de eventos", () => {
  const page = parseGoogleDocument(
    documentWithTable([
      ["events-list"],
      ["agenda"],
      [
        "# imagem",
        "alt",
        "categorias",
        "título",
        "descrição",
        "local",
        "data",
        "hora",
      ],
      [
        "/missa.webp",
        "Celebração",
        "Missas",
        "Missa",
        "Descrição",
        "Santuário",
        "2026-10-03",
        "08:00",
      ],
    ]),
  );
  const block = page.blocks.find(
    (candidate) => candidate.type === "events-list",
  );

  assert.equal(block?.type, "events-list");
  if (block?.type !== "events-list") return;
  assert.equal(block.events?.[0].endTime, undefined);
});

test("aceita events-list sem registros como placeholder da página geral", () => {
  const page = parseGoogleDocument(
    documentWithTable([
      ["events-list"],
      ["# id (opcional)"],
      ["eventos"],
      [
        "# imagem",
        "texto alternativo",
        "categoria(s)",
        "título",
        "descrição",
        "local",
        "data",
        "hora",
      ],
    ]),
  );
  const block = page.blocks.find(
    (candidate) => candidate.type === "events-list",
  );

  assert.deepEqual(block, {
    type: "events-list",
    id: "eventos",
    events: [],
  });
});

test("lê categorias selecionadas no novo formato de card-event", () => {
  const page = parseGoogleDocument(
    documentWithTable([
      ["card-event"],
      ["# id", "categorias", "título", "texto"],
      [
        "programacao-cirio",
        "Círio, Missas",
        "Programação",
        "Confira a agenda.",
      ],
    ]),
  );
  const block = page.blocks.find(
    (candidate) => candidate.type === "card-event",
  );

  assert.deepEqual(block, {
    type: "card-event",
    id: "programacao-cirio",
    categories: ["Círio", "Missas"],
    title: "Programação",
    text: "Confira a agenda.",
  });
});

test("lê categorias opcionais do upcoming-events e deixa vazio como todas", () => {
  const withCategories = parseGoogleDocument(
    documentWithTable([
      ["upcoming-events"],
      ["Ver todos", "/eventos/", "eventos", "Missas, Círio"],
    ]),
  );
  const filteredBlock = withCategories.blocks.find(
    (block) => block.type === "upcoming-events",
  );
  assert.equal(filteredBlock?.type, "upcoming-events");
  if (filteredBlock?.type !== "upcoming-events") return;
  assert.deepEqual(filteredBlock.categories, ["Missas", "Círio"]);

  const withoutCategories = parseGoogleDocument(
    documentWithTable([
      ["upcoming-events"],
      ["Ver todos", "/eventos/", "eventos", ""],
    ]),
  );
  const allEventsBlock = withoutCategories.blocks.find(
    (block) => block.type === "upcoming-events",
  );
  assert.equal(allEventsBlock?.type, "upcoming-events");
  if (allEventsBlock?.type !== "upcoming-events") return;
  assert.equal(allEventsBlock.categories, undefined);
});
