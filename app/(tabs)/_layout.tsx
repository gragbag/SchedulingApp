import { Tabs } from "expo-router";
import React, { useMemo } from "react";
import { ProfileHeaderButton } from "../../components/ProfileHeaderButton";
import { dayKeyLocal } from "../../lib/datetime";
import { useAppStore } from "../../lib/store";

export default function TabsLayout() {
	const groupInvites = useAppStore((s) => s.groupInvites);
	const friendInvites = useAppStore((s) => s.friendInvites);
	const groupCalendarEvents = useAppStore((s) => s.groupCalendarEvents);
	const friendCalendarEvents = useAppStore((s) => s.friendCalendarEvents);
	const inviteNotificationDismissals = useAppStore((s) => s.inviteNotificationDismissals);

	const pendingTotal = useMemo(() => {
		const todayKey = dayKeyLocal(new Date());
		const dismissedToday = inviteNotificationDismissals[todayKey] ?? [];
		const dismissedSet = new Set(dismissedToday);
		const pendingInvites = [
			...groupInvites.filter((inv) => !inv.rsvpStatus),
			...friendInvites.filter((inv) => !inv.rsvpStatus),
		].filter((inv) => !dismissedSet.has(inv.id)).length;
		const pendingCalendar = [
			...groupCalendarEvents.filter((evt) => !evt.acceptStatus),
			...friendCalendarEvents.filter((evt) => !evt.acceptStatus),
		].filter((evt) => !dismissedSet.has(evt.id)).length;
		return pendingInvites + pendingCalendar;
	}, [friendCalendarEvents, friendInvites, groupCalendarEvents, groupInvites, inviteNotificationDismissals]);

	const socialBadge = pendingTotal > 99 ? "99+" : pendingTotal || undefined;

	return (
		<Tabs screenOptions={{ headerTitleStyle: { fontWeight: "700" } }}>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					headerShown: true,
					headerRight: () => <ProfileHeaderButton />,
				}}
			/>
			<Tabs.Screen
				name="calendar"
				options={{
					title: "Calendar",
					headerRight: () => <ProfileHeaderButton />,
				}}
			/>
			<Tabs.Screen
				name="social"
				options={{
					title: "Social",
					headerRight: () => <ProfileHeaderButton />,
					tabBarBadge: socialBadge,
				}}
			/>
		</Tabs>
	);
}
