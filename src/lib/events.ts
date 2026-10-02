import eventData from "../content/events.json";
import type { EventItem } from "./types";

export const events = [...(eventData as EventItem[])].sort((a, b) =>
  `${a.startDate}T${a.startTime}`.localeCompare(`${b.startDate}T${b.startTime}`),
);
