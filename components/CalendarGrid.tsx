import React, { useMemo, useState } from "react";
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
	const [containerWidth, setContainerWidth] = useState(0);

	// Calculate exact pixel width for each cell
	const cellWidth = containerWidth > 0 ? containerWidth / 7 : 0;

	// Split cells into rows for proper alignment
	const cellRows = useMemo(() => {
		const rows: Array<typeof cells> = [];
		for (let i = 0; i < cells.length; i += 7) {
			rows.push(cells.slice(i, i + 7));
		}
		return rows;
	}, [cells]);

	return (
		<View className="rounded-2xl border border-slate-200 bg-white p-3">
			{/* Header */}
			<View className="flex-row items-center justify-between mb-2">
				<Pressable onPress={onPrevMonth} hitSlop={10} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100" style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}>
					<Text className="text-xl font-extrabold text-slate-900 -mt-[2px]">&lt;</Text>
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
					<Text className="text-xl font-extrabold text-slate-900 -mt-[2px]">&gt;</Text>
				</Pressable>
			</View>

			<View
				onLayout={(e) => {
					const width = e.nativeEvent.layout.width;
					if (width !== containerWidth) {
						setContainerWidth(width);
					}
				}}
			>
				{/* Weekday labels */}
				<View style={{ flexDirection: "row" }} className="mb-2">
					{WEEKDAYS.map((w) => (
						<View key={w} style={{ width: cellWidth, alignItems: "center" }}>
							<Text className="text-center text-xs font-bold text-slate-500">{w}</Text>
						</View>
					))}
				</View>

				{/* Grid */}
				{cellRows.map((row, rowIndex) => (
					<View key={`row-${rowIndex}`} style={{ flexDirection: "row" }}>
						{row.map((c, idx) => {
							const key = `${rowIndex}-${idx}`;
							if (!c.date) {
								return <View key={key} style={{ width: cellWidth, alignItems: "center", paddingVertical: 8 }} />;
							}

							const isSelected = isSameDay(c.date, selectedDate);
							const isTodayCell = isSameDay(c.date, today);
							const hasDot = hasEventsOnDay(c.date);

							const pillClass = ["h-8 w-8 items-center justify-center rounded-full", isSelected ? "bg-slate-900" : "bg-slate-100", !isSelected && isTodayCell ? "border-2 border-slate-900 bg-white" : ""].join(" ");

							const dayTextClass = ["text-sm font-semibold", isSelected ? "text-white" : "text-slate-900"].join(" ");

							return (
								<Pressable
									key={key}
									onPress={() => onSelectDate(c.date!)}
									style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1, width: cellWidth, alignItems: "center", paddingVertical: 8 }]}
								>
									<View className={pillClass}>
										<Text className={dayTextClass}>{c.dayNum}</Text>
									</View>

									<View className="mt-1 h-2 items-center justify-center">
										{hasDot ? <View className="h-1.5 w-1.5 rounded-full bg-slate-900" /> : null}
									</View>
								</Pressable>
							);
						})}
					</View>
				))}
			</View>
		</View>
	);
}
