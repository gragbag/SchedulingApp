import { create } from "zustand";
import { dayKeyLocal, parseISO } from "./datetime";
import {
	CalendarEvent,
	CreateInvitePayload,
	FRIEND_CALENDAR_EVENTS,
	FRIEND_INVITES,
	FRIENDS,
	GROUP_CALENDAR_EVENTS,
	GROUP_INVITES,
	GROUPS,
	Invite,
	RSVPValue,
	buildLocalDateTime,
	isFriend,
} from "./social";
import { Event, EventType } from "./types";

type LastCreated = Pick<CreateInvitePayload, "eventType" | "sendTo">;

export type UserProfile = {
	username: string;
	name: string;
	aboutMe: string;
	profilePicture: string; // emoji for now
};

type State = {
	events: Event[];
	isLoggedIn: boolean;
	userProfile: UserProfile;
	updateProfile: (profile: Partial<UserProfile>) => void;
	setLoggedIn: (next: boolean) => void;
	addEvent: (e: Omit<Event, "id">) => string;
	getEventById: (id: string) => Event | undefined;
	eventsForDay: (day: Date) => Event[];
	hasEventsOnDay: (day: Date) => boolean;
	deleteEvent: (id: string) => void;
	groupInvites: Invite[];
	friendInvites: Invite[];
	groupCalendarEvents: CalendarEvent[];
	friendCalendarEvents: CalendarEvent[];
	updateInviteRSVP: (id: string, status: RSVPValue, isGroup: boolean) => void;
	updateCalendarEvent: (id: string, isGroup: boolean, updates: Partial<CalendarEvent>) => void;
	createInvite: (payload: CreateInvitePayload) => boolean;
	lastCreated: LastCreated | null;
	clearLastCreated: () => void;
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
	isLoggedIn: false,
	userProfile: {
		username: "@yourusername",
		name: "Your Name",
		aboutMe: "Tell people a bit about yourself...",
		profilePicture: "",
	},
	groupInvites: GROUP_INVITES,
	friendInvites: FRIEND_INVITES,
	groupCalendarEvents: GROUP_CALENDAR_EVENTS,
	friendCalendarEvents: FRIEND_CALENDAR_EVENTS,
	lastCreated: null,

	updateProfile: (profile) => {
		set((s) => ({ userProfile: { ...s.userProfile, ...profile } }));
	},

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

	updateInviteRSVP: (id, status, isGroup) => {
		const applyRSVP = (inv: Invite) => {
			if (inv.id !== id) return inv;

			const youIndex = inv.attendees.findIndex((attendee) => attendee.name === "You");
			const nextAttendees =
				youIndex >= 0
					? inv.attendees.map((attendee, index) =>
							index === youIndex ? { ...attendee, status } : attendee
						)
					: [
							...inv.attendees,
							{
								name: "You",
								status,
								isFriend: isFriend("You"),
							},
						];
			const totalInvited = Math.max(inv.totalInvited, nextAttendees.length);

			return {
				...inv,
				rsvpStatus: status,
				attendees: nextAttendees,
				totalInvited,
			};
		};

		if (isGroup) {
			set((s) => ({ groupInvites: s.groupInvites.map(applyRSVP) }));
		} else {
			set((s) => ({ friendInvites: s.friendInvites.map(applyRSVP) }));
		}
	},

	updateCalendarEvent: (id, isGroup, updates) => {
		if (isGroup) {
			set((s) => ({ groupCalendarEvents: s.groupCalendarEvents.map((evt) => (evt.id === id ? { ...evt, ...updates } : evt)) }));
		} else {
			set((s) => ({ friendCalendarEvents: s.friendCalendarEvents.map((evt) => (evt.id === id ? { ...evt, ...updates } : evt)) }));
		}
	},

	createInvite: (payload) => {
		const start = buildLocalDateTime(payload.date, payload.startTime);
		const end = buildLocalDateTime(payload.date, payload.endTime);
		if (!start || !end || end.getTime() < start.getTime()) return false;

		if (payload.eventType === "social") {
			const group = payload.sendTo === "group" ? GROUPS.find((g) => g.id === payload.selectedGroupId) : null;
			if (payload.sendTo === "group" && !group) return false;

			const attendees =
				payload.sendTo === "group" && group
					? group.members.map((member) => ({
							name: member.name,
							status: null,
							isFriend: isFriend(member.name),
						}))
					: payload.selectedFriendIds
							.map((id) => {
								const friend = FRIENDS.find((f) => f.id === id);
								return friend ? { name: friend.name, status: null, isFriend: true } : null;
							})
							.filter((friend): friend is Invite["attendees"][number] => friend !== null);

			if (payload.sendTo === "friends") {
				attendees.unshift({ name: "You", status: null, isFriend: false });
			}

			const totalInvited = payload.sendTo === "group" && group ? group.totalMembers : attendees.length;

			const newInvite: Invite = {
				id: makeId(),
				title: payload.title.trim(),
				organizer: "You",
				group: group?.name,
				location: payload.location.trim(),
				startAt: start.toISOString(),
				endAt: end.toISOString(),
				attendees,
				totalInvited,
				rsvpStatus: null,
			};

			if (payload.sendTo === "group") {
				set((s) => ({ groupInvites: [newInvite, ...s.groupInvites], lastCreated: { eventType: payload.eventType, sendTo: payload.sendTo } }));
			} else {
				set((s) => ({ friendInvites: [newInvite, ...s.friendInvites], lastCreated: { eventType: payload.eventType, sendTo: payload.sendTo } }));
			}
			return true;
		}

		const group = payload.sendTo === "group" ? GROUPS.find((g) => g.id === payload.selectedGroupId) : null;
		if (payload.sendTo === "group" && !group) return false;

		const totalSentTo = payload.sendTo === "group" && group ? group.totalMembers : payload.selectedFriendIds.length + 1;

		const newEvent: CalendarEvent = {
			id: makeId(),
			title: payload.title.trim(),
			creator: "You",
			group: group?.name,
			location: payload.location.trim(),
			startAt: start.toISOString(),
			endAt: end.toISOString(),
			notes: payload.notes.trim() || undefined,
			totalSentTo,
			acceptStatus: null,
			reminderSettings: null,
		};

		if (payload.sendTo === "group") {
			set((s) => ({ groupCalendarEvents: [newEvent, ...s.groupCalendarEvents], lastCreated: { eventType: payload.eventType, sendTo: payload.sendTo } }));
		} else {
			set((s) => ({ friendCalendarEvents: [newEvent, ...s.friendCalendarEvents], lastCreated: { eventType: payload.eventType, sendTo: payload.sendTo } }));
		}

		return true;
	},

	clearLastCreated: () => set({ lastCreated: null }),
	setLoggedIn: (next) => set({ isLoggedIn: next }),
}));


