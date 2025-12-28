import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatTime, parseISO } from "../lib/datetime";
import { Event } from "../lib/types";

const TYPE_LABEL: Record<Event["type"], string> = {
	study: "Study",
	meetup: "Meetup",
	class: "Class",
};

export function EventCard({ event, onPress }: { event: Event; onPress?: () => void }) {
	const start = parseISO(event.startAt);
	const end = parseISO(event.endAt);

	return (
		<Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
			<View style={styles.row}>
				<Text style={styles.time}>
					{formatTime(start)}–{formatTime(end)}
				</Text>
				<View style={styles.badge}>
					<Text style={styles.badgeText}>{TYPE_LABEL[event.type]}</Text>
				</View>
			</View>

			<Text style={styles.title} numberOfLines={1}>
				{event.title}
			</Text>

			{!!event.location && (
				<Text style={styles.meta} numberOfLines={1}>
					📍 {event.location}
				</Text>
			)}
		</Pressable>
	);
}

const styles = StyleSheet.create({
	card: {
		padding: 12,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		backgroundColor: "white",
		marginBottom: 10,
	},
	pressed: { opacity: 0.85 },
	row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	time: { fontSize: 13, color: "#374151" },
	badge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 999,
		backgroundColor: "#f3f4f6",
	},
	badgeText: { fontSize: 12, color: "#111827" },
	title: { marginTop: 6, fontSize: 16, fontWeight: "600", color: "#111827" },
	meta: { marginTop: 6, fontSize: 13, color: "#6b7280" },
});
