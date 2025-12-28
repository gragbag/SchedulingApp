import { useLocalSearchParams } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { formatDateLong, formatTime, parseISO } from "../../lib/datetime";
import { useAppStore } from "../../lib/store";

export default function MeetingDetail() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const event = useAppStore((s) => (id ? s.getEventById(id) : undefined));

	if (!event) {
		return (
			<View style={[styles.root, styles.center]}>
				<Text style={{ color: "#6b7280" }}>Event not found.</Text>
			</View>
		);
	}

	const start = parseISO(event.startAt);
	const end = parseISO(event.endAt);

	return (
		<View style={styles.root}>
			<ScrollView contentContainerStyle={styles.content}>
				<Text style={styles.h1}>{event.title}</Text>
				<Text style={styles.sub}>{formatDateLong(start)}</Text>

				<View style={styles.card}>
					<Text style={styles.label}>Time</Text>
					<Text style={styles.value}>
						{formatTime(start)} – {formatTime(end)}
					</Text>

					{!!event.location && (
						<>
							<Text style={[styles.label, { marginTop: 12 }]}>Location</Text>
							<Text style={styles.value}>{event.location}</Text>
						</>
					)}

					{!!event.notes && (
						<>
							<Text style={[styles.label, { marginTop: 12 }]}>Notes</Text>
							<Text style={styles.value}>{event.notes}</Text>
						</>
					)}
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: "#f8fafc" },
	center: { alignItems: "center", justifyContent: "center" },
	content: { padding: 16 },
	h1: { fontSize: 24, fontWeight: "900", color: "#111827" },
	sub: { marginTop: 6, color: "#6b7280" },
	card: {
		marginTop: 16,
		backgroundColor: "white",
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		padding: 14,
	},
	label: { fontSize: 12, fontWeight: "800", color: "#6b7280", textTransform: "uppercase" },
	value: { marginTop: 6, fontSize: 16, fontWeight: "600", color: "#111827" },
});
