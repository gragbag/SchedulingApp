import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { endOfMonth, isSameDay, monthTitle, startOfMonth } from "../lib/datetime";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthCells(month: Date) {
	const start = startOfMonth(month);
	const end = endOfMonth(month);

	const leading = start.getDay(); // 0-6
	const daysInMonth = end.getDate();

	const cells: { date: Date | null; dayNum?: number }[] = [];

	for (let i = 0; i < leading; i++) cells.push({ date: null });

	for (let d = 1; d <= daysInMonth; d++) {
		cells.push({ date: new Date(start.getFullYear(), start.getMonth(), d), dayNum: d });
	}

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
	onToday,
	isOnToday = false,
}: {
	month: Date;
	selectedDate: Date;
	onSelectDate: (d: Date) => void;
	onPrevMonth: () => void;
	onNextMonth: () => void;
	hasEventsOnDay: (d: Date) => boolean;
	onToday?: () => void;
	isOnToday?: boolean;
}) {
	// Keep "today" stable for cell highlighting
	const today = useMemo(() => new Date(), []);
	const cells = useMemo(() => buildMonthCells(month), [month]);

	return (
		<View className="rounded-2xl border border-slate-200 bg-white p-3">
			{/* Header */}
			<View className="flex-row items-center justify-between mb-2">
				<Pressable onPress={onPrevMonth} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100" style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
					<Text className="text-xl font-extrabold text-slate-900 -mt-[2px]">‹</Text>
				</Pressable>

				{/* Center area between arrows */}
				<View className="flex-1 items-center justify-center">
					<Text className="text-base font-extrabold text-slate-900">{monthTitle(month)}</Text>

					{onToday ? (
						<Pressable
							onPress={onToday}
							disabled={isOnToday}
							className={["mt-1 rounded-full border px-3 py-1", isOnToday ? "bg-slate-900 border-slate-900 opacity-90" : "bg-white border-slate-200"].join(" ")}
							style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
						>
							<Text className={["text-xs font-extrabold", isOnToday ? "text-white" : "text-slate-900"].join(" ")}>Today</Text>
						</Pressable>
					) : null}
				</View>

				<Pressable onPress={onNextMonth} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100" style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
					<Text className="text-xl font-extrabold text-slate-900 -mt-[2px]">›</Text>
				</Pressable>
			</View>

			{/* Weekday labels */}
			<View className="flex-row justify-between px-1 mb-2">
				{WEEKDAYS.map((w) => (
					<Text key={w} className="w-[34px] text-center text-xs font-bold text-slate-500">
						{w}
					</Text>
				))}
			</View>

			{/* Grid */}
			<View className="flex-row flex-wrap">
				{cells.map((c, idx) => {
					if (!c.date) {
						return <View key={idx} className="w-[14.2857%] items-center py-2" />;
					}

					const isSelected = isSameDay(c.date, selectedDate);
					const isTodayCell = isSameDay(c.date, today);
					const hasDot = hasEventsOnDay(c.date);

					const pillClass = ["h-8 w-8 items-center justify-center rounded-full", isSelected ? "bg-slate-900" : "bg-slate-100", !isSelected && isTodayCell ? "border-2 border-slate-900 bg-white" : ""].join(" ");

					const dayTextClass = ["text-sm font-semibold", isSelected ? "text-white" : "text-slate-900"].join(" ");

					return (
						<Pressable key={idx} onPress={() => onSelectDate(c.date!)} className="w-[14.2857%] items-center py-2" style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}>
							<View className={pillClass}>
								<Text className={dayTextClass}>{c.dayNum}</Text>
							</View>

							{hasDot ? <View className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-900" /> : null}
						</Pressable>
					);
				})}
			</View>
		</View>
	);
}
