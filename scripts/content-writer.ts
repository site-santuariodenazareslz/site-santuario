import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { EventItem, NewsItem, Page } from "../src/lib/types";

const pagesDirectory = fileURLToPath(
  new URL("../src/content/pages/", import.meta.url),
);
const fragmentsDirectory = fileURLToPath(
  new URL("../src/content/fragments/", import.meta.url),
);
const newsDirectory = fileURLToPath(
  new URL("../src/content/news/", import.meta.url),
);
const eventsFile = fileURLToPath(
  new URL("../src/content/events.json", import.meta.url),
);

async function writeContent(
  directory: string,
  entries: Array<{ path: string[]; page: Page }>,
): Promise<void> {
  await rm(directory, { recursive: true, force: true });

  for (const { path, page } of entries) {
    const destination = join(directory, ...path, "index.json");
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(page, null, 2)}\n`);
  }
}

export async function writePages(
  pages: Array<{ path: string[]; page: Page }>,
): Promise<void> {
  await writeContent(pagesDirectory, pages);
}

export async function writeFragments(
  fragments: Array<{ path: string[]; page: Page }>,
): Promise<void> {
  await writeContent(fragmentsDirectory, fragments);
}

export async function writeNews(news: NewsItem[]): Promise<void> {
  await rm(newsDirectory, { recursive: true, force: true });
  for (const item of news) {
    const destination = join(newsDirectory, item.slug, "index.json");
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(item, null, 2)}\n`);
  }
}

/** A agenda compartilhada pelos blocos upcoming-events vem dos events-list. */
export async function writeEvents(events: EventItem[]): Promise<void> {
  const uniqueEvents = [
    ...new Map(events.map((event) => [event.id, event])).values(),
  ].sort((a, b) =>
    `${a.startDate}T${a.startTime}`.localeCompare(`${b.startDate}T${b.startTime}`),
  );
  await writeFile(eventsFile, `${JSON.stringify(uniqueEvents, null, 2)}\n`);
}
