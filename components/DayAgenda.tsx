import { router } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";
import { Event } from "../lib/types";
import { EventCard } from "./EventCard";

export function DayAgenda({ title, events, onPressEvent }: { title: string; events: Event[]; onPressEvent: (id: string) => void }) {
	const isEmpty = events.length === 0;

	return (
		<View className="mt-4">
			<Text className="text-[18px] font-bold text-slate-900">{title}</Text>

			<View className="mt-3">
				{isEmpty ? (
					<View className="items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-6">
						<Text className="text-4xl mb-2">🗓️😴</Text>
						<Text className="text-base font-extrabold text-slate-900 text-center">No events on this day</Text>
						<Text className="mt-1 text-slate-500 font-semibold text-center">Your schedule is free. Create your first event!</Text>

						<Pressable onPress={() => router.push("/modal/create")} className="mt-4 rounded-xl bg-slate-900 px-4 py-3">
							<Text className="text-white font-extrabold">＋ Create your first event</Text>
						</Pressable>
					</View>
				) : (
					events.map((e) => <EventCard key={e.id} event={e} onPress={() => onPressEvent(e.id)} />)
				)}
			</View>
		</View>
	);
}
