export type RSVPStatus = "yes" | "maybe" | "no";
export type RSVPValue = RSVPStatus | null;

export type Attendee = {
	name: string;
	status: RSVPValue;
	isFriend: boolean;
};

export type Invite = {
	id: string;
	title: string;
	organizer: string;
	group?: string;
	location: string;
	startAt: string;
	endAt: string;
	attendees: Attendee[];
	totalInvited: number;
	rsvpStatus: RSVPValue;
};

export type GroupMemberRole = "admin" | "member";

export type GroupMember = {
	id: string;
	name: string;
	role: GroupMemberRole;
};

export type Group = {
	id: string;
	name: string;
	totalMembers: number;
	members: GroupMember[];
};

export type Friend = {
	id: string;
	name: string;
};

export type ReminderTime = "1week" | "1day" | "1hour" | "30min";

export type ReminderSettings = { times: ReminderTime[] };

export type CalendarEvent = {
	id: string;
	title: string;
	creator: string;
	group?: string;
	location: string;
	startAt: string;
	endAt: string;
	notes?: string;
	totalSentTo: number;
	acceptStatus: "accepted" | "declined" | null;
	reminderSettings: ReminderSettings | null;
};

export type CreateInvitePayload = {
	eventType: "social" | "calendar";
	sendTo: "group" | "friends";
	selectedGroupId: string | null;
	selectedFriendIds: string[];
	title: string;
	location: string;
	date: string;
	startTime: string;
	endTime: string;
	notes: string;
};

export const GROUPS: Group[] = [
	{
		id: "g1",
		name: "CS 201 Winter 2024",
		totalMembers: 24,
		members: [
			{ id: "m1", name: "Grace Chen", role: "admin" },
			{ id: "m2", name: "David Kim", role: "member" },
			{ id: "m3", name: "Sarah Johnson", role: "member" },
			{ id: "m4", name: "You", role: "member" },
			{ id: "m5", name: "Emma Wilson", role: "member" },
			{ id: "m6", name: "Liam Chen", role: "member" },
			{ id: "m7", name: "Alex Martinez", role: "member" },
		],
	},
	{
		id: "g2",
		name: "Product Builders",
		totalMembers: 8,
		members: [
			{ id: "m10", name: "Alex Martinez", role: "admin" },
			{ id: "m11", name: "Jamie Lee", role: "member" },
			{ id: "m12", name: "You", role: "member" },
			{ id: "m13", name: "Taylor Swift", role: "member" },
		],
	},
	{
		id: "g3",
		name: "Campus Study Crew",
		totalMembers: 12,
		members: [
			{ id: "m20", name: "Morgan Taylor", role: "admin" },
			{ id: "m21", name: "Casey Brown", role: "member" },
			{ id: "m22", name: "You", role: "member" },
			{ id: "m23", name: "Riley Davis", role: "member" },
			{ id: "m24", name: "Jordan Park", role: "member" },
		],
	},
	{
		id: "g4",
		name: "Weekend Meetup Circle",
		totalMembers: 15,
		members: [
			{ id: "m30", name: "Marisol Garcia", role: "admin" },
			{ id: "m31", name: "Quinn Smith", role: "member" },
			{ id: "m32", name: "You", role: "member" },
		],
	},
];

export const FRIENDS: Friend[] = [
	{ id: "f1", name: "Grace Chen" },
	{ id: "f2", name: "David Kim" },
	{ id: "f3", name: "Marisol Garcia" },
	{ id: "f4", name: "Alex Martinez" },
	{ id: "f5", name: "Taylor Swift" },
	{ id: "f6", name: "Morgan Taylor" },
];

export function isFriend(name: string) {
	return FRIENDS.some((friend) => friend.name === name);
}

export function buildLocalDateTime(date: string, time: string) {
	if (!date || !time) return null;
	const [year, month, day] = date.split("-").map(Number);
	const [hour, minute] = time.split(":").map(Number);
	if (!year || !month || !day || Number.isNaN(hour) || Number.isNaN(minute)) return null;
	return new Date(year, month - 1, day, hour, minute);
}

export const GROUP_INVITES: Invite[] = [
	{
		id: "g1",
		title: "CS 201 Study Session",
		organizer: "Grace Chen",
		group: "CS 201 Winter 2024",
		location: "Library Room 304",
		startAt: "2026-01-05T14:00:00",
		endAt: "2026-01-05T17:00:00",
		attendees: [
			{ name: "Grace Chen", status: "yes", isFriend: true },
			{ name: "David Kim", status: "yes", isFriend: true },
			{ name: "Sarah Johnson", status: "yes", isFriend: false },
			{ name: "Emma Wilson", status: "yes", isFriend: false },
			{ name: "Liam Chen", status: "yes", isFriend: false },
			{ name: "Olivia Martinez", status: "yes", isFriend: false },
			{ name: "Noah Taylor", status: "yes", isFriend: false },
			{ name: "Ava Anderson", status: "yes", isFriend: false },
			{ name: "Alex Martinez", status: "maybe", isFriend: true },
			{ name: "Jamie Lee", status: "maybe", isFriend: false },
			{ name: "Sophia Brown", status: "maybe", isFriend: false },
			{ name: "Mason Davis", status: "maybe", isFriend: false },
			{ name: "Morgan Taylor", status: "no", isFriend: true },
			{ name: "Isabella Garcia", status: "no", isFriend: false },
			{ name: "Casey Brown", status: null, isFriend: false },
			{ name: "Riley Davis", status: null, isFriend: false },
			{ name: "Jordan Park", status: null, isFriend: false },
			{ name: "Quinn Smith", status: null, isFriend: false },
		],
		totalInvited: 24,
		rsvpStatus: null,
	},
	{
		id: "g2",
		title: "Group Project Kickoff",
		organizer: "Alex Martinez",
		group: "Product Builders",
		location: "Innovation Lab",
		startAt: "2026-01-06T18:30:00",
		endAt: "2026-01-06T20:00:00",
		attendees: [
			{ name: "Alex Martinez", status: "yes", isFriend: true },
			{ name: "Jamie Lee", status: "yes", isFriend: false },
			{ name: "Taylor Swift", status: "maybe", isFriend: true },
			{ name: "Jordan Park", status: null, isFriend: false },
		],
		totalInvited: 8,
		rsvpStatus: null,
	},
	{
		id: "g3",
		title: "Weekly Team Sync",
		organizer: "Morgan Taylor",
		group: "Campus Study Crew",
		location: "Student Center",
		startAt: "2026-01-04T12:00:00",
		endAt: "2026-01-04T13:00:00",
		attendees: [
			{ name: "Morgan Taylor", status: "yes", isFriend: true },
			{ name: "Casey Brown", status: "yes", isFriend: false },
			{ name: "Riley Davis", status: "yes", isFriend: false },
			{ name: "Jordan Park", status: "yes", isFriend: false },
			{ name: "Sam Wilson", status: "no", isFriend: false },
		],
		totalInvited: 12,
		rsvpStatus: "yes",
	},
	{
		id: "g4",
		title: "Fall Study Wrap-Up",
		organizer: "Grace Chen",
		group: "CS 201 Winter 2024",
		location: "Library Room 201",
		startAt: "2025-12-01T17:00:00",
		endAt: "2025-12-01T18:30:00",
		attendees: [
			{ name: "Grace Chen", status: "yes", isFriend: true },
			{ name: "You", status: "no", isFriend: false },
			{ name: "David Kim", status: "maybe", isFriend: true },
			{ name: "Sarah Johnson", status: "yes", isFriend: false },
		],
		totalInvited: 24,
		rsvpStatus: "no",
	},
	{
		id: "g5",
		title: "Sprint Demo Night",
		organizer: "You",
		group: "Product Builders",
		location: "Design Studio",
		startAt: "2026-01-12T18:00:00",
		endAt: "2026-01-12T20:00:00",
		attendees: [
			{ name: "You", status: null, isFriend: false },
			{ name: "Alex Martinez", status: "yes", isFriend: true },
			{ name: "Jamie Lee", status: "maybe", isFriend: false },
			{ name: "Taylor Swift", status: null, isFriend: true },
			{ name: "Jordan Park", status: "no", isFriend: false },
			{ name: "Casey Brown", status: null, isFriend: false },
		],
		totalInvited: 8,
		rsvpStatus: null,
	},
	{
		id: "g6",
		title: "Study Hall Planning",
		organizer: "You",
		group: "Campus Study Crew",
		location: "Student Center",
		startAt: "2026-01-09T16:00:00",
		endAt: "2026-01-09T17:00:00",
		attendees: [
			{ name: "You", status: null, isFriend: false },
			{ name: "Morgan Taylor", status: "yes", isFriend: true },
			{ name: "Riley Davis", status: "maybe", isFriend: false },
			{ name: "Jordan Park", status: null, isFriend: false },
			{ name: "Sam Wilson", status: null, isFriend: false },
		],
		totalInvited: 12,
		rsvpStatus: null,
	},
];

export const GROUP_CALENDAR_EVENTS: CalendarEvent[] = [
	{
		id: "gc1",
		title: "CS 201 Midterm Exam",
		creator: "Sarah Johnson",
		group: "CS 201 Winter 2024",
		location: "Engineering Building Room 201",
		startAt: "2026-01-15T14:00:00",
		endAt: "2026-01-15T16:00:00",
		notes: "Covers chapters 1-5. Bring calculator and student ID.",
		totalSentTo: 24,
		acceptStatus: null,
		reminderSettings: null,
	},
	{
		id: "gc2",
		title: "Project Proposal Due",
		creator: "Alex Martinez",
		group: "Product Builders",
		location: "Submit online via Canvas",
		startAt: "2026-01-10T23:59:00",
		endAt: "2026-01-10T23:59:00",
		notes: "Final draft of project proposal. Max 5 pages.",
		totalSentTo: 8,
		acceptStatus: "accepted",
		reminderSettings: { times: ["1day", "1hour"] },
	},
	{
		id: "gc3",
		title: "Weekly Class - CS 201",
		creator: "Grace Chen",
		group: "CS 201 Winter 2024",
		location: "Science Hall 105",
		startAt: "2026-01-07T14:00:00",
		endAt: "2026-01-07T15:30:00",
		notes: "Regular Tuesday lecture. Topic: Data Structures.",
		totalSentTo: 24,
		acceptStatus: "accepted",
		reminderSettings: { times: ["30min"] },
	},
	{
		id: "gc4",
		title: "CS 201 Review Session",
		creator: "Grace Chen",
		group: "CS 201 Winter 2024",
		location: "Engineering Building Room 120",
		startAt: "2025-12-02T15:00:00",
		endAt: "2025-12-02T16:00:00",
		notes: "Past review session with practice questions.",
		totalSentTo: 24,
		acceptStatus: "declined",
		reminderSettings: null,
	},
];

export const FRIEND_INVITES: Invite[] = [
	{
		id: "f1",
		title: "Sunday Brunch",
		organizer: "Marisol Garcia",
		location: "Maple Café",
		startAt: "2026-01-05T11:00:00",
		endAt: "2026-01-05T13:00:00",
		attendees: [
			{ name: "Marisol Garcia", status: "yes", isFriend: true },
			{ name: "Taylor Swift", status: "yes", isFriend: true },
			{ name: "David Kim", status: "maybe", isFriend: true },
			{ name: "Grace Chen", status: null, isFriend: true },
		],
		totalInvited: 4,
		rsvpStatus: null,
	},
	{
		id: "f2",
		title: "Coffee & Catch Up",
		organizer: "David Kim",
		location: "Downtown Roasters",
		startAt: "2026-01-07T10:00:00",
		endAt: "2026-01-07T11:30:00",
		attendees: [
			{ name: "David Kim", status: "yes", isFriend: true },
			{ name: "Alex Martinez", status: "yes", isFriend: true },
			{ name: "Morgan Taylor", status: null, isFriend: true },
		],
		totalInvited: 3,
		rsvpStatus: "maybe",
	},
	{
		id: "f3",
		title: "Movie Night",
		organizer: "Alex Martinez",
		location: "Downtown Cinema",
		startAt: "2025-11-20T19:00:00",
		endAt: "2025-11-20T21:30:00",
		attendees: [
			{ name: "Alex Martinez", status: "yes", isFriend: true },
			{ name: "You", status: "yes", isFriend: false },
			{ name: "Taylor Swift", status: "no", isFriend: true },
		],
		totalInvited: 3,
		rsvpStatus: "yes",
	},
	{
		id: "f4",
		title: "Rooftop Hang",
		organizer: "You",
		location: "Skyline Terrace",
		startAt: "2026-01-11T19:30:00",
		endAt: "2026-01-11T22:00:00",
		attendees: [
			{ name: "You", status: null, isFriend: false },
			{ name: "Grace Chen", status: "yes", isFriend: true },
			{ name: "David Kim", status: "maybe", isFriend: true },
			{ name: "Marisol Garcia", status: null, isFriend: true },
			{ name: "Alex Martinez", status: "no", isFriend: true },
		],
		totalInvited: 5,
		rsvpStatus: null,
	},
];

export const FRIEND_CALENDAR_EVENTS: CalendarEvent[] = [
	{
		id: "fc1",
		title: "Gym Session",
		creator: "David Kim",
		location: "Campus Rec Center",
		startAt: "2026-01-08T06:00:00",
		endAt: "2026-01-08T07:30:00",
		notes: "Morning workout - we talked about this on Tuesday!",
		totalSentTo: 2,
		acceptStatus: null,
		reminderSettings: null,
	},
	{
		id: "fc2",
		title: "Taylor's Birthday",
		creator: "Marisol Garcia",
		location: "All day",
		startAt: "2026-01-20T00:00:00",
		endAt: "2026-01-20T23:59:00",
		notes: "Don't forget! Planning surprise party separately.",
		totalSentTo: 5,
		acceptStatus: "accepted",
		reminderSettings: { times: ["1week", "1day"] },
	},
	{
		id: "fc3",
		title: "Coffee Catch Up",
		creator: "Marisol Garcia",
		location: "Maple Cafe",
		startAt: "2025-11-18T09:00:00",
		endAt: "2025-11-18T10:00:00",
		notes: "Past catch-up after class.",
		totalSentTo: 2,
		acceptStatus: "accepted",
		reminderSettings: { times: ["1day"] },
	},
];
