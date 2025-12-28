import { router } from "expo-router";
import React, { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { DayAgenda } from "../../components/DayAgenda";
import { dayKeyLocal, formatDateLong, parseISO } from "../../lib/datetime";
import { useAppStore } from "../../lib/store";

export default function HomeScreen() {
	const events = useAppStore((s) => s.events);

	const today = useMemo(() => new Date(), []);

	const todaysEvents = useMemo(() => {
		const day = today.toISOString().slice(0, 10);
		return events.filter((e) => e.startAt.startsWith(day)).sort((a, b) => a.startAt.localeCompare(b.startAt));
	}, [events, today]);

	const upcoming = useMemo(() => {
		const startKey = dayKeyLocal(today);
		const inFuture = events
			.filter((e) => {
				const d = parseISO(e.startAt);
				// today and beyond
				return dayKeyLocal(d) >= startKey;
			})
			.sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime());

		// next ~10 items (MVP)
		return inFuture.slice(0, 10);
	}, [events]);

	return (
		<View style={styles.root}>
			<ScrollView contentContainerStyle={styles.content}>
				<View style={styles.headerRow}>
					<View>
						<Text style={styles.h1}>Today</Text>
						<Text style={styles.sub}>{formatDateLong(today)}</Text>
					</View>

					<Pressable onPress={() => router.push("/modal/create")} style={styles.createBtn}>
						<Text style={styles.createBtnText}>＋ Create</Text>
					</Pressable>
				</View>

				<DayAgenda title="Agenda" events={todaysEvents} onPressEvent={(id) => router.push(`/meeting/${id}`)} emptyText="No events today. Tap Create to add one." />

				<View style={{ marginTop: 22 }}>
					<Text style={styles.h2}>Upcoming</Text>
					<View style={{ marginTop: 10 }}>
						{upcoming.length === 0 ? (
							<Text style={styles.empty}>Nothing scheduled yet.</Text>
						) : (
							upcoming.map((e) => {
								const d = parseISO(e.startAt);
								return (
									<Pressable key={e.id} onPress={() => router.push(`/meeting/${e.id}`)} style={({ pressed }) => [styles.upRow, pressed && { opacity: 0.8 }]}>
										<View style={{ flex: 1 }}>
											<Text style={styles.upTitle} numberOfLines={1}>
												{e.title}
											</Text>
											<Text style={styles.upMeta}>
												{d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} • {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
											</Text>
										</View>
										<Text style={styles.chev}>›</Text>
									</Pressable>
								);
							})
						)}
					</View>
				</View>
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: "#f8fafc" },
	content: { padding: 16, paddingBottom: 28 },
	headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	h1: { fontSize: 28, fontWeight: "800", color: "#111827" },
	sub: { marginTop: 4, color: "#6b7280" },
	createBtn: {
		backgroundColor: "#111827",
		paddingHorizontal: 14,
		paddingVertical: 10,
		borderRadius: 999,
	},
	createBtnText: { color: "white", fontWeight: "700" },

	h2: { fontSize: 18, fontWeight: "800", color: "#111827" },
	empty: { color: "#6b7280" },

	upRow: {
		backgroundColor: "white",
		borderRadius: 14,
		borderWidth: 1,
		borderColor: "#e5e7eb",
		padding: 12,
		marginBottom: 10,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
	},
	upTitle: { fontSize: 16, fontWeight: "700", color: "#111827" },
	upMeta: { marginTop: 4, color: "#6b7280" },
	chev: { fontSize: 20, fontWeight: "800", color: "#9ca3af" },
});
