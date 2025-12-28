import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CalendarGrid } from "../../components/CalendarGrid";
import { DayAgenda } from "../../components/DayAgenda";
import { addMonths, formatDateLong, startOfMonth } from "../../lib/datetime";
import { useAppStore } from "../../lib/store";

export default function CalendarScreen() {
	const today = new Date();

	const [month, setMonth] = useState<Date>(() => startOfMonth(today));
	const [selectedDate, setSelectedDate] = useState<Date>(today);

	const events = useAppStore((s) => s.events);
	const eventsForSelected = useMemo(() => {
		return events.filter((e) => e.startAt.startsWith(selectedDate.toISOString().slice(0, 10))).sort((a, b) => a.startAt.localeCompare(b.startAt));
	}, [events, selectedDate]);
	const hasEventsOnDay = useAppStore((s) => s.hasEventsOnDay);

	// If user flips month, keep selected date sane.
	const onPrev = () => setMonth((m) => addMonths(m, -1));
	const onNext = () => setMonth((m) => addMonths(m, 1));

	return (
		<View style={styles.root}>
			<ScrollView contentContainerStyle={styles.content}>
				<CalendarGrid month={month} selectedDate={selectedDate} onSelectDate={setSelectedDate} onPrevMonth={onPrev} onNextMonth={onNext} hasEventsOnDay={hasEventsOnDay} />

				<View style={styles.row}>
					<View style={{ flex: 1 }}>
						<Text style={styles.selectedTitle}>{formatDateLong(selectedDate)}</Text>
					</View>
					<Pressable onPress={() => router.push("/modal/create")} style={styles.createBtn}>
						<Text style={styles.createBtnText}>＋</Text>
					</Pressable>
				</View>

				<DayAgenda title="Agenda" events={eventsForSelected} onPressEvent={(id) => router.push(`/meeting/${id}`)} emptyText="No events on this day." />
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: "#f8fafc" },
	content: { padding: 16, paddingBottom: 28 },
	row: { flexDirection: "row", alignItems: "center", marginTop: 14, gap: 10 },
	selectedTitle: { fontSize: 16, fontWeight: "800", color: "#111827" },
	createBtn: {
		width: 38,
		height: 38,
		borderRadius: 999,
		backgroundColor: "#111827",
		alignItems: "center",
		justifyContent: "center",
	},
	createBtnText: { color: "white", fontSize: 18, fontWeight: "800" },
});
