import eventData from "../content/events.json";
import type { EventItem } from "./types";
import { sortEvents } from "./event-utils";

export const events = sortEvents(eventData as EventItem[]);
