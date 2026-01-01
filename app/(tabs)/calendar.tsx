import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { CalendarGrid } from "../../components/CalendarGrid";
import { DayAgenda } from "../../components/DayAgenda";
import { addMonths, dayKeyLocal, formatDateLong, isSameDay, parseISO, startOfMonth } from "../../lib/datetime";
import { useAppStore } from "../../lib/store";

function sortByStart(a: { startAt: string }, b: { startAt: string }) {
	return parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime();
}

export default function CalendarScreen() {
	const events = useAppStore((s) => s.events);
	const hasEventsOnDay = useAppStore((s) => s.hasEventsOnDay);

	const today = new Date();

	const [month, setMonth] = useState<Date>(() => startOfMonth(today));
	const [selectedDate, setSelectedDate] = useState<Date>(today);

	const eventsForSelected = useMemo(() => {
		const key = dayKeyLocal(selectedDate);
		return events.filter((ev) => dayKeyLocal(parseISO(ev.startAt)) === key).sort(sortByStart);
	}, [events, selectedDate]);

	const onPrev = () => setMonth((m) => addMonths(m, -1));
	const onNext = () => setMonth((m) => addMonths(m, 1));

	const isOnToday = isSameDay(selectedDate, today);

	const goToToday = () => {
		const now = new Date();
		setSelectedDate(now);
		setMonth(startOfMonth(now));
	};

	return (
		<View className="flex-1 bg-slate-50">
			<ScrollView contentContainerClassName="p-4 pb-7">
				<CalendarGrid month={month} selectedDate={selectedDate} onSelectDate={setSelectedDate} onPrevMonth={onPrev} onNextMonth={onNext} hasEventsOnDay={hasEventsOnDay} onToday={goToToday} isOnToday={isOnToday} />

				<View className="mt-4 flex-row items-center gap-2">
					<View className="flex-1">
						<View className="flex-row items-center gap-2">
							<Text className="text-base font-extrabold text-slate-900">{formatDateLong(selectedDate)}</Text>
						</View>
					</View>
					<Pressable onPress={() => router.push("/modal/create")} className="h-10 w-10 items-center justify-center rounded-full bg-slate-900">
						<Text className="text-white text-lg font-extrabold">＋</Text>
					</Pressable>
				</View>

				<DayAgenda title="Agenda" events={eventsForSelected} onPressEvent={(id) => router.push(`/meeting/${id}`)} emptyText="No events on this day." />
			</ScrollView>
		</View>
	);
}
