export type EventType = "study" | "meetup" | "class";

export type Event = {
	id: string;
	title: string;
	type: EventType;
	startAt: string; // ISO string
	endAt: string; // ISO string
	location?: string;
	notes?: string;
};
