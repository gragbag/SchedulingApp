import DateTimePicker from "@react-native-community/datetimepicker";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAppStore } from "../../lib/store";
import { EventType } from "../../lib/types";

const TYPES: { type: EventType; label: string }[] = [
	{ type: "study", label: "Study" },
	{ type: "meetup", label: "Meetup" },
	{ type: "class", label: "Class" },
];

export default function CreateModal() {
	const addEvent = useAppStore((s) => s.addEvent);

	const now = new Date();
	const [title, setTitle] = useState("");
	const [type, setType] = useState<EventType>("study");
	const [location, setLocation] = useState("");
	const [notes, setNotes] = useState("");

	const [start, setStart] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 15, 0));
	const [end, setEnd] = useState<Date>(() => new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0));

	const canSave = useMemo(() => title.trim().length > 0 && end.getTime() > start.getTime(), [title, start, end]);

	const onSave = () => {
		if (!canSave) return;

		const id = addEvent({
			title: title.trim(),
			type,
			startAt: start.toISOString(),
			endAt: end.toISOString(),
			location: location.trim() || undefined,
			notes: notes.trim() || undefined,
		});

		// Replace the modal route with the detail screen (clean + reliable)
		router.replace(`/meeting/${id}`);
	};

	return (
		<View style={styles.root}>
			<Text style={styles.h1}>New Event</Text>

			<Text style={styles.label}>Title</Text>
			<TextInput value={title} onChangeText={setTitle} placeholder="e.g., Math study session" style={styles.input} autoFocus />

			<Text style={styles.label}>Type</Text>
			<View style={styles.typeRow}>
				{TYPES.map((t) => {
					const active = t.type === type;
					return (
						<Pressable key={t.type} onPress={() => setType(t.type)} style={[styles.typePill, active && styles.typePillActive]}>
							<Text style={[styles.typeText, active && styles.typeTextActive]}>{t.label}</Text>
						</Pressable>
					);
				})}
			</View>

			<Text style={styles.label}>Start</Text>
			<View style={styles.pickerRow}>
				<DateTimePicker value={start} mode="datetime" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={(_, d) => d && setStart(d)} />
			</View>

			<Text style={styles.label}>End</Text>
			<View style={styles.pickerRow}>
				<DateTimePicker value={end} mode="datetime" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={(_, d) => d && setEnd(d)} />
			</View>

			<Text style={styles.label}>Location (optional)</Text>
			<TextInput value={location} onChangeText={setLocation} placeholder="Library, Zoom, etc." style={styles.input} />

			<Text style={styles.label}>Notes (optional)</Text>
			<TextInput value={notes} onChangeText={setNotes} placeholder="Bring problem set, etc." style={[styles.input, { height: 90 }]} multiline />

			<Pressable onPress={onSave} disabled={!canSave} style={[styles.saveBtn, !canSave && { opacity: 0.5 }]}>
				<Text style={styles.saveText}>Save</Text>
			</Pressable>

			<Pressable onPress={() => router.back()} style={styles.cancelBtn}>
				<Text style={styles.cancelText}>Cancel</Text>
			</Pressable>

			{!canSave && <Text style={styles.hint}>Add a title and make sure End is after Start.</Text>}
		</View>
	);
}

const styles = StyleSheet.create({
	root: { flex: 1, backgroundColor: "#f8fafc", padding: 16, gap: 8 },
	h1: { fontSize: 22, fontWeight: "900", color: "#111827", marginBottom: 6 },
	label: {
		fontSize: 12,
		fontWeight: "800",
		color: "#6b7280",
		marginTop: 6,
		textTransform: "uppercase",
	},
	input: {
		backgroundColor: "white",
		borderWidth: 1,
		borderColor: "#e5e7eb",
		borderRadius: 14,
		paddingHorizontal: 12,
		paddingVertical: 10,
		fontSize: 16,
	},
	typeRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
	typePill: {
		borderWidth: 1,
		borderColor: "#e5e7eb",
		backgroundColor: "white",
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 999,
	},
	typePillActive: { backgroundColor: "#111827", borderColor: "#111827" },
	typeText: { fontWeight: "800", color: "#111827" },
	typeTextActive: { color: "white" },
	pickerRow: {
		backgroundColor: "white",
		borderWidth: 1,
		borderColor: "#e5e7eb",
		borderRadius: 14,
		padding: 6,
	},
	saveBtn: {
		marginTop: 10,
		backgroundColor: "#111827",
		borderRadius: 14,
		paddingVertical: 12,
		alignItems: "center",
	},
	saveText: { color: "white", fontWeight: "900", fontSize: 16 },
	cancelBtn: { alignItems: "center", paddingVertical: 10 },
	cancelText: { color: "#6b7280", fontWeight: "800" },
	hint: { color: "#6b7280", marginTop: 4 },
});
