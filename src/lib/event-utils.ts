import type { EventItem } from "./types";

export function categoriesForEvent(event: EventItem): string[] {
  const categories = event.categories?.length
    ? event.categories
    : (event.category ?? "").split(/[;,|]/);
  return [
    ...new Set(categories.map((category) => category.trim()).filter(Boolean)),
  ];
}

export function sortEvents(items: EventItem[]): EventItem[] {
  return [...items].sort((left, right) =>
    `${left.startDate}T${left.startTime}`.localeCompare(
      `${right.startDate}T${right.startTime}`,
    ),
  );
}

export function eventsForCategories(
  items: EventItem[],
  selectedCategories: string[],
): EventItem[] {
  const selected = new Set(
    selectedCategories.map((category) => category.trim().toLocaleLowerCase()),
  );
  if (!selected.size) return [];

  const matches = items.filter((event) =>
    categoriesForEvent(event).some((category) =>
      selected.has(category.toLocaleLowerCase()),
    ),
  );
  return sortEvents([
    ...new Map(matches.map((event) => [event.id, event])).values(),
  ]);
}

export function groupEventsByMonth(
  items: EventItem[],
): Array<{ key: string; label: string; events: EventItem[] }> {
  const groups = new Map<string, EventItem[]>();

  for (const event of sortEvents(items)) {
    const key = event.startDate.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(key)) continue;
    const events = groups.get(key) ?? [];
    events.push(event);
    groups.set(key, events);
  }

  return [...groups].map(([key, events]) => {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return {
      key,
      label: new Intl.DateTimeFormat("pt-BR", {
        month: "long",
        year: "numeric",
      }).format(date),
      events,
    };
  });
}
