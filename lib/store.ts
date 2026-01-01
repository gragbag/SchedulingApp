import { create } from "zustand";
import { dayKeyLocal, parseISO } from "./datetime";
import { Event, EventType } from "./types";

type State = {
	events: Event[];
	addEvent: (e: Omit<Event, "id">) => string;
	getEventById: (id: string) => Event | undefined;
	eventsForDay: (day: Date) => Event[];
	hasEventsOnDay: (day: Date) => boolean;
	deleteEvent: (id: string) => void;
};

function makeId() {
	// Good enough for MVP; replace with UUID later if you want.
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function sortByStart(a: Event, b: Event) {
	return parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime();
}

// Seed a couple sample events so you can see dots + agenda instantly.
function seedEvents(): Event[] {
	const now = new Date();
	const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0);
	const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0);

	const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 30);
	const tomorrowEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 12, 0);

	const mk = (title: string, type: EventType, start: Date, end: Date): Event => ({
		id: makeId(),
		title,
		type,
		startAt: start.toISOString(),
		endAt: end.toISOString(),
		location: type === "study" ? "Library" : undefined,
	});

	return [mk("CS Study Session", "study", todayStart, todayEnd), mk("Coffee Meetup", "meetup", tomorrowStart, tomorrowEnd)];
}

export const useAppStore = create<State>((set, get) => ({
	events: seedEvents(),

	addEvent: (e) => {
		const id = makeId();
		const ev: Event = { id, ...e };
		set((s) => ({ events: [...s.events, ev].sort(sortByStart) }));
		return id;
	},

	getEventById: (id) => get().events.find((x) => x.id === id),

	eventsForDay: (day) => {
		const key = dayKeyLocal(day);
		return get()
			.events.filter((ev) => dayKeyLocal(parseISO(ev.startAt)) === key)
			.sort(sortByStart);
	},

	hasEventsOnDay: (day) => {
		const key = dayKeyLocal(day);
		return get().events.some((ev) => dayKeyLocal(parseISO(ev.startAt)) === key);
	},

	deleteEvent: (id: string) => {
		set((s) => ({ events: s.events.filter((ev) => ev.id !== id) }));
	},
}));
