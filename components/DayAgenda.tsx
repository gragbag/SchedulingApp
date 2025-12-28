import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { Event } from "../lib/types";
import { EventCard } from "./EventCard";

export function DayAgenda({ title, events, onPressEvent, emptyText = "No events" }: { title: string; events: Event[]; onPressEvent: (id: string) => void; emptyText?: string }) {
	return (
		<View style={styles.wrap}>
			<Text style={styles.h2}>{title}</Text>

			<View style={{ marginTop: 10 }}>{events.length === 0 ? <Text style={styles.empty}>{emptyText}</Text> : events.map((e) => <EventCard key={e.id} event={e} onPress={() => onPressEvent(e.id)} />)}</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrap: { marginTop: 16 },
	h2: { fontSize: 18, fontWeight: "700", color: "#111827" },
	empty: { color: "#6b7280", paddingVertical: 8 },
});
