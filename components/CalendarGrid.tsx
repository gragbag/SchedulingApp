import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { endOfMonth, isSameDay, monthTitle, startOfMonth } from "../lib/datetime";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthCells(month: Date) {
	const start = startOfMonth(month);
	const end = endOfMonth(month);

	// Leading blanks
	const leading = start.getDay(); // 0-6
	const daysInMonth = end.getDate();

	const cells: { date: Date | null; dayNum?: number }[] = [];

	for (let i = 0; i < leading; i++) cells.push({ date: null });

	for (let day = 1; day <= daysInMonth; day++) {
		cells.push({ date: new Date(month.getFullYear(), month.getMonth(), day), dayNum: day });
	}

	// Trailing blanks to fill last week
	while (cells.length % 7 !== 0) cells.push({ date: null });

	return cells;
}

export function CalendarGrid({
	month,
	selectedDate,
	onSelectDate,
	onPrevMonth,
	onNextMonth,
	hasEventsOnDay,
}: {
	month: Date;
	selectedDate: Date;
	onSelectDate: (d: Date) => void;
	onPrevMonth: () => void;
	onNextMonth: () => void;
	hasEventsOnDay: (d: Date) => boolean;
}) {
	const today = new Date();

	const cells = useMemo(() => buildMonthCells(month), [month]);

	return (
		<View style={styles.card}>
			<View style={styles.header}>
				<Pressable onPress={onPrevMonth} hitSlop={10} style={styles.navBtn}>
					<Text style={styles.navText}>‹</Text>
				</Pressable>

				<Text style={styles.title}>{monthTitle(month)}</Text>

				<Pressable onPress={onNextMonth} hitSlop={10} style={styles.navBtn}>
					<Text style={styles.navText}>›</Text>
				</Pressable>
			</View>

			<View style={styles.weekRow}>
				{WEEKDAYS.map((w) => (
					<Text key={w} style={styles.weekday}>
						{w}
					</Text>
				))}
			</View>

			<View style={styles.grid}>
				{cells.map((c, idx) => {
					if (!c.date) {
						return <View key={idx} style={styles.cell} />;
					}

					const isSelected = isSameDay(c.date, selectedDate);
					const isToday = isSameDay(c.date, today);
					const hasDot = hasEventsOnDay(c.date);

					return (
						<Pressable key={idx} onPress={() => onSelectDate(c.date!)} style={({ pressed }) => [styles.cell, pressed && { opacity: 0.75 }]}>
							<View style={[styles.dayPill, isSelected && styles.selectedPill, !isSelected && isToday && styles.todayPill]}>
								<Text style={[styles.dayText, isSelected && styles.selectedText]}>{c.dayNum}</Text>
							</View>

							{hasDot && <View style={styles.dot} />}
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: "white",
		borderRadius: 16,
		padding: 12,
		borderWidth: 1,
		borderColor: "#e5e7eb",
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		paddingHorizontal: 6,
		paddingBottom: 8,
	},
	title: { fontSize: 16, fontWeight: "700", color: "#111827" },
	navBtn: { padding: 6 },
	navText: { fontSize: 20, fontWeight: "700", color: "#111827" },

	weekRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingHorizontal: 4,
		marginBottom: 6,
	},
	weekday: { width: "14.2857%", textAlign: "center", fontSize: 12, color: "#6b7280" },

	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	cell: {
		width: "14.2857%",
		paddingVertical: 8,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 44,
	},
	dayPill: {
		width: 30,
		height: 30,
		borderRadius: 999,
		alignItems: "center",
		justifyContent: "center",
	},
	todayPill: {
		borderWidth: 1,
		borderColor: "#111827",
	},
	selectedPill: {
		backgroundColor: "#111827",
	},
	dayText: { fontSize: 14, color: "#111827", fontWeight: "600" },
	selectedText: { color: "white" },
	dot: {
		width: 6,
		height: 6,
		borderRadius: 999,
		marginTop: 4,
		backgroundColor: "#111827",
	},
});
