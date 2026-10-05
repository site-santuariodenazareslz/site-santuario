export function todayLocalDate(): string {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

export function monthOffsetFromToday(monthKey: string): number {
  if (!/^\d{4}-\d{2}$/.test(monthKey)) return Number.POSITIVE_INFINITY;
  const [year, month] = monthKey.split("-").map(Number);
  const today = new Date();
  return year * 12 + month - 1 - (today.getFullYear() * 12 + today.getMonth());
}

export function isEventOnOrAfterDate(
  startDate: string,
  today: string,
): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate) && startDate >= today;
}

export function eventsOnOrAfterDate<T extends { startDate: string }>(
  items: T[],
  today = todayLocalDate(),
): T[] {
  return items.filter((event) => isEventOnOrAfterDate(event.startDate, today));
}

export function eventsOnOrAfterToday<T extends HTMLElement>(cards: T[]): T[] {
  const today = todayLocalDate();
  return cards.filter((card) =>
    isEventOnOrAfterDate(card.dataset.startDate ?? "", today),
  );
}

export function hidePastEvents<T extends HTMLElement>(cards: T[]): void {
  const visibleEvents = new Set(eventsOnOrAfterToday(cards));
  cards.forEach((card) => {
    if (!visibleEvents.has(card)) card.hidden = true;
  });
}
