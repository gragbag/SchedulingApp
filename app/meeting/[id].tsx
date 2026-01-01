import { router, useLocalSearchParams } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { formatDateLong, formatTime, parseISO } from "../../lib/datetime";
import { useAppStore } from "../../lib/store";

export default function MeetingDetail() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const deleteEvent = useAppStore((s) => s.deleteEvent);
	const event = useAppStore((s) => (id ? s.getEventById(id) : undefined));

	if (!event) {
		return (
			<View className="flex-1 items-center justify-center bg-slate-50">
				<Text className="text-slate-500">Event not found.</Text>
			</View>
		);
	}

	const start = parseISO(event.startAt);
	const end = parseISO(event.endAt);

	const confirmDelete = () => {
		const doDelete = () => {
			deleteEvent(event.id);
			router.back(); // or router.replace("/calendar")
		};

		if (Platform.OS === "web") {
			// ✅ Works on web
			const ok = window.confirm("Delete event?\n\nThis can’t be undone.");
			if (ok) doDelete();
			return;
		}

		// ✅ Works on iOS/Android
		Alert.alert("Delete event?", "This will permanently remove the event. This can’t be undone.", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Delete", style: "destructive", onPress: doDelete },
		]);
	};

	return (
		<View className="flex-1 bg-slate-50">
			<ScrollView contentContainerClassName="p-4 pb-8">
				{/* Header row */}
				<View className="flex-row items-start justify-between gap-3">
					<View className="flex-1">
						<Text className="text-2xl font-extrabold text-slate-900">{event.title}</Text>
						<Text className="mt-1 text-slate-500">{formatDateLong(start)}</Text>
					</View>

					<Pressable onPress={confirmDelete} className="h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-red-700" style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
						<Text className="text-lg text-red-600">🗑️</Text>
					</Pressable>
				</View>

				{/* Details card */}
				<View className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
					<Text className="text-xs font-extrabold uppercase text-slate-500">Time</Text>
					<Text className="mt-1 text-base font-semibold text-slate-900">
						{formatTime(start)} – {formatTime(end)}
					</Text>

					{!!event.location && (
						<View className="mt-4">
							<Text className="text-xs font-extrabold uppercase text-slate-500">Location</Text>
							<Text className="mt-1 text-base font-semibold text-slate-900">{event.location}</Text>
						</View>
					)}

					{!!event.notes && (
						<View className="mt-4">
							<Text className="text-xs font-extrabold uppercase text-slate-500">Notes</Text>
							<Text className="mt-1 text-base font-semibold text-slate-900">{event.notes}</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	);
}
