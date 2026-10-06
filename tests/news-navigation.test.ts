import assert from "node:assert/strict";
import test from "node:test";
import { getAdjacentNews, type NewsSummary } from "../src/lib/news";

const news = (slug: string, createdAt: string): NewsSummary => ({
  slug,
  createdAt,
  image: `/${slug}.jpg`,
  imageAlt: slug,
  category: "",
  title: slug,
  excerpt: "",
});

test("finds older and newer news relative to the current article", () => {
  const items = [
    news("older", "2024-01-01"),
    news("current", "2025-01-01"),
    news("newer", "2026-01-01"),
  ];

  assert.deepEqual(getAdjacentNews(items, "current"), {
    previous: items[0],
    next: items[2],
  });
});

test("omits a neighbor beyond the oldest or newest article", () => {
  const items = [news("older", "2024-01-01"), news("newer", "2026-01-01")];

  assert.deepEqual(getAdjacentNews(items, "older"), { next: items[1] });
  assert.deepEqual(getAdjacentNews(items, "newer"), { previous: items[0] });
});
