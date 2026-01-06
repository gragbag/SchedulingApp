import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import {
	addMonths,
	dayKeyLocal,
	endOfMonth,
	formatDateLong,
	formatTime,
	isSameDay,
	parseISO,
	startOfMonth,
} from "../../lib/datetime";
import { useAppStore } from "../../lib/store";
import { EventType } from "../../lib/types";

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const INDICATOR_COLORS = ["bg-emerald-300", "bg-amber-300", "bg-rose-300"];
const LEGEND_LABELS = ["Light", "Busy", "Packed"];
const LIST_RANGE_DAYS = {
	day: 1,
	week: 7,
	twoweeks: 14,
	month: 30,
} as const;

type ViewMode = "calendar" | "list";
type ListRange = keyof typeof LIST_RANGE_DAYS;

const TYPE_LABEL: Record<EventType, string> = {
	study: "Study",
	meetup: "Meetup",
	class: "Class",
};

function sortByStart(a: { startAt: string }, b: { startAt: string }) {
	return parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime();
}

type CalendarCell = { date: Date; dayNum: number; inMonth: boolean };

function buildMonthCells(month: Date) {
	const start = startOfMonth(month);
	const end = endOfMonth(month);
	const leading = start.getDay(); // Sunday-first
	const daysInMonth = end.getDate();

	const prevMonth = addMonths(month, -1);
	const prevMonthEnd = endOfMonth(prevMonth).getDate();

	const cells: CalendarCell[] = [];

	// Add leading empty cells for alignment
	for (let i = 0; i < leading; i++) {
		const dayNum = prevMonthEnd - leading + 1 + i;
		cells.push({
			date: new Date(prevMonth.getFullYear(), prevMonth.getMonth(), dayNum),
			dayNum,
			inMonth: false,
		});
	}

	// Add all days in the month
	for (let d = 1; d <= daysInMonth; d++) {
		cells.push({
			date: new Date(start.getFullYear(), start.getMonth(), d),
			dayNum: d,
			inMonth: true,
		});
	}

	// Only pad to complete the last week (not to 42 cells)
	const cellsInLastWeek = cells.length % 7;
	if (cellsInLastWeek !== 0) {
		const remainingInWeek = 7 - cellsInLastWeek;
		for (let d = 1; d <= remainingInWeek; d++) {
			cells.push({
				date: new Date(start.getFullYear(), start.getMonth() + 1, d),
				dayNum: d,
				inMonth: false,
			});
		}
	}

	return cells;
}

function chunkCells(cells: CalendarCell[]) {
	const rows: CalendarCell[][] = [];
	for (let i = 0; i < cells.length; i += 7) {
		rows.push(cells.slice(i, i + 7));
	}
	return rows.filter((row) => row.some((cell) => cell.inMonth));
}

function startOfDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export default function CalendarScreen() {
	const events = useAppStore((s) => s.events);

	const today = useMemo(() => new Date(), []);

	const [month, setMonth] = useState<Date>(() => startOfMonth(today));
	const [selectedDate, setSelectedDate] = useState<Date>(today);
	const [viewMode, setViewMode] = useState<ViewMode>("calendar");
	const [listRange, setListRange] = useState<ListRange>("week");

	const eventsForSelected = useMemo(() => {
		const key = dayKeyLocal(selectedDate);
		return events.filter((ev) => dayKeyLocal(parseISO(ev.startAt)) === key).sort(sortByStart);
	}, [events, selectedDate]);

	const eventsByDay = useMemo(() => {
		const map = new Map<string, number>();
		for (const ev of events) {
			const key = dayKeyLocal(parseISO(ev.startAt));
			map.set(key, (map.get(key) ?? 0) + 1);
		}
		return map;
	}, [events]);

	const cells = useMemo(() => buildMonthCells(month), [month]);
	const prevMonth = useMemo(() => addMonths(month, -1), [month]);
	const nextMonth = useMemo(() => addMonths(month, 1), [month]);
	const prevCells = useMemo(() => buildMonthCells(prevMonth), [prevMonth]);
	const nextCells = useMemo(() => buildMonthCells(nextMonth), [nextMonth]);

	const onPrev = useCallback(() => {
		const newMonth = addMonths(month, -1);
		setMonth(newMonth);
		// Set selected date to first day of new month
		setSelectedDate(startOfMonth(newMonth));
		void Haptics.selectionAsync();
	}, [month]);
	const onNext = useCallback(() => {
		const newMonth = addMonths(month, 1);
		setMonth(newMonth);
		// Set selected date to first day of new month
		setSelectedDate(startOfMonth(newMonth));
		void Haptics.selectionAsync();
	}, [month]);
	const monthName = useMemo(() => month.toLocaleDateString([], { month: "long" }), [month]);
	const yearLabel = month.getFullYear();

	const onSelectDate = (date: Date) => {
		setSelectedDate(date);
		if (date.getMonth() !== month.getMonth() || date.getFullYear() !== month.getFullYear()) {
			setMonth(startOfMonth(date));
		}
		void Haptics.selectionAsync();
	};

	const isOnToday = isSameDay(selectedDate, today);

	const goToToday = () => {
		const now = new Date();
		setSelectedDate(now);
		setMonth(startOfMonth(now));
		void Haptics.selectionAsync();
	};

	const eventsForToday = useMemo(() => {
		const key = dayKeyLocal(today);
		return events.filter((ev) => dayKeyLocal(parseISO(ev.startAt)) === key).sort(sortByStart);
	}, [events, today]);
	const todayCount = eventsForToday.length;
	const firstToday = eventsForToday[0] ?? null;

	const listWindowStart = useMemo(() => startOfDay(today), [today]);
	const listWindowEnd = useMemo(() => addDays(listWindowStart, LIST_RANGE_DAYS[listRange]), [listRange, listWindowStart]);

	const listEvents = useMemo(() => {
		return events
			.filter((ev) => {
				const start = parseISO(ev.startAt);
				return start >= listWindowStart && start < listWindowEnd;
			})
			.sort(sortByStart);
	}, [events, listWindowStart, listWindowEnd]);

	const [showBoost, setShowBoost] = useState(false);
	const [dismissedSignature, setDismissedSignature] = useState<string | null>(null);
	const navigation = useNavigation();

	const boostProfile = useMemo(() => {
		if (todayCount >= 10) {
			return {
				tone: "power",
				title: "Peak day mode",
				subtitle: "Pick your top 3 and protect your momentum.",
			};
		}
		if (todayCount >= 7) {
			return {
				tone: "drive",
				title: "High output day",
				subtitle: "Batch similar tasks and add short recovery gaps.",
			};
		}
		if (todayCount >= 4) {
			return {
				tone: "steady",
				title: "Strong rhythm",
				subtitle: "Keep the pace steady and protect focus blocks.",
			};
		}
		if (todayCount >= 1) {
			return {
				tone: "light",
				title: "Light day, sharp focus",
				subtitle: "Finish one meaningful win and enjoy the margin.",
			};
		}
		return {
			tone: "open",
			title: "Open day ahead",
			subtitle: "Choose one thing that moves you forward.",
		};
	}, [todayCount]);

	const boostSignature = useMemo(() => {
		const firstKey = firstToday ? `${firstToday.id}-${firstToday.startAt}` : "none";
		return `${todayCount}|${boostProfile.tone}|${firstKey}`;
	}, [boostProfile.tone, firstToday, todayCount]);

	const triggerBoost = useCallback(() => {
		if (dismissedSignature === boostSignature) return;
		setShowBoost(true);
	}, [boostSignature, dismissedSignature]);

	useEffect(() => {
		const unsubscribe = navigation.addListener("focus", () => {
			// Reset to today when tab is focused
			const now = new Date();
			setSelectedDate(now);
			setMonth(startOfMonth(now));
			triggerBoost();
		});
		return unsubscribe;
	}, [navigation, triggerBoost]);

	const boostDetail = firstToday
		? `Next up: ${firstToday.title} at ${formatTime(parseISO(firstToday.startAt))}.`
		: "Tap + to add a plan for today.";

	const boostStyles = {
		open: {
			card: "border-sky-200 bg-sky-50",
			kicker: "text-sky-700",
			title: "text-sky-900",
			subtitle: "text-sky-800",
			detail: "text-sky-700",
			pill: "bg-sky-100",
			pillText: "text-sky-800",
			close: "bg-sky-100",
			closeText: "text-sky-800",
		},
		light: {
			card: "border-emerald-200 bg-emerald-50",
			kicker: "text-emerald-700",
			title: "text-emerald-900",
			subtitle: "text-emerald-800",
			detail: "text-emerald-700",
			pill: "bg-emerald-100",
			pillText: "text-emerald-800",
			close: "bg-emerald-100",
			closeText: "text-emerald-800",
		},
		steady: {
			card: "border-indigo-200 bg-indigo-50",
			kicker: "text-indigo-700",
			title: "text-indigo-900",
			subtitle: "text-indigo-800",
			detail: "text-indigo-700",
			pill: "bg-indigo-100",
			pillText: "text-indigo-800",
			close: "bg-indigo-100",
			closeText: "text-indigo-800",
		},
		drive: {
			card: "border-amber-200 bg-amber-50",
			kicker: "text-amber-700",
			title: "text-amber-900",
			subtitle: "text-amber-800",
			detail: "text-amber-700",
			pill: "bg-amber-100",
			pillText: "text-amber-800",
			close: "bg-amber-100",
			closeText: "text-amber-800",
		},
		power: {
			card: "border-rose-200 bg-rose-50",
			kicker: "text-rose-700",
			title: "text-rose-900",
			subtitle: "text-rose-800",
			detail: "text-rose-700",
			pill: "bg-rose-100",
			pillText: "text-rose-800",
			close: "bg-rose-100",
			closeText: "text-rose-800",
		},
	} as const;

	const tone = boostStyles[boostProfile.tone as keyof typeof boostStyles];
	const todayLabel = todayCount === 0 ? "No plans today" : `${todayCount} plan${todayCount === 1 ? "" : "s"} today`;

	const { width: screenWidth } = useWindowDimensions();
	const gridMaxWidth = Math.max(0, screenWidth - 32);
	const cellWidth = gridMaxWidth / 7;
	const gridWidth = gridMaxWidth;
	const monthGridWidth = gridWidth || gridMaxWidth;
	const cellHeight = 56;
	const gridLineWidth = StyleSheet.hairlineWidth;
	const gridLineColor = "#E2E8F0";
	const gridOutlineColor = "#7C8AA3";
	const gridOutlineWidth = 2;
	const rowStyle = gridWidth
		? ({ flexDirection: "row", width: monthGridWidth } as const)
		: ({ flexDirection: "row", width: "100%" } as const);
	const dayCellStyle = gridWidth
		? ({ width: cellWidth, height: cellHeight } as const)
		: ({ flex: 1, height: cellHeight } as const);
	const weekdayCellStyle = gridWidth
		? ({ width: cellWidth } as const)
		: ({ flex: 1 } as const);

	const currentRows = useMemo(() => chunkCells(cells), [cells]);
	const prevRows = useMemo(() => chunkCells(prevCells), [prevCells]);
	const nextRows = useMemo(() => chunkCells(nextCells), [nextCells]);

	// Calculate dynamic height based on number of rows in current month
	const weekdayHeaderHeight = 40;
	const currentMonthHeight = currentRows.length * cellHeight + weekdayHeaderHeight;

	const monthPagerRef = useRef<ScrollView>(null);
	const [isPaging, setIsPaging] = useState(false);
	useEffect(() => {
		if (!monthGridWidth) return;
		requestAnimationFrame(() => {
			monthPagerRef.current?.scrollTo({ x: monthGridWidth, animated: false });
			setIsPaging(false);
		});
	}, [month, monthGridWidth]);
	const handleMonthScrollEnd = useCallback(
		(event: { nativeEvent: { contentOffset: { x: number } } }) => {
			if (!monthGridWidth) return;
			const offsetX = event.nativeEvent.contentOffset.x;
			if (offsetX >= monthGridWidth * 1.5) {
				setIsPaging(true);
				onNext();
				return;
			}
			if (offsetX <= monthGridWidth * 0.5) {
				setIsPaging(true);
				onPrev();
				return;
			}
			monthPagerRef.current?.scrollTo({ x: monthGridWidth, animated: true });
		},
		[monthGridWidth, onNext, onPrev]
	);

	const renderWeekdayHeader = useCallback(
		(prefix: string) => (
			<View style={[rowStyle, { height: weekdayHeaderHeight }]}>
				{WEEKDAY_LETTERS.map((w, idx) => {
					const isLast = idx === WEEKDAY_LETTERS.length - 1;
					const borderStyle = {
						borderRightWidth: isLast ? 0 : gridLineWidth,
						borderBottomWidth: gridLineWidth,
						borderColor: gridLineColor,
					};
					return (
						<View
							key={`${prefix}-${w}-${idx}`}
							style={[weekdayCellStyle, borderStyle, { height: weekdayHeaderHeight }]}
							className="items-center justify-center"
						>
							<Text className="text-center text-xs font-semibold text-slate-400">{w}</Text>
						</View>
					);
				})}
			</View>
		),
		[gridLineColor, gridLineWidth, rowStyle, weekdayCellStyle, weekdayHeaderHeight]
	);

	const renderMonthRows = useCallback(
		(rows: CalendarCell[][], prefix: string) => {
			return rows.map((row, rowIndex) => {
				const isLastRow = rowIndex === rows.length - 1;

				return (
					<View key={`${prefix}-row-${rowIndex}`} style={rowStyle} className="">
						{row.map((c, idx) => {
							const cellKey = `${prefix}-${rowIndex}-${idx}`;
							const isLastCol = idx === row.length - 1;
							const borderStyle = {
								borderRightWidth: isLastCol ? 0 : gridLineWidth,
								borderBottomWidth: isLastRow ? 0 : gridLineWidth,
								borderColor: gridLineColor,
							};
							const cellClass = "items-center justify-center";

							if (!c.inMonth) {
								return (
									<View key={cellKey} style={[dayCellStyle, borderStyle]} className={cellClass}>
										<View className="flex-1 w-full items-center justify-between py-2">
											<View className="h-9 w-9 items-center justify-center rounded-full bg-transparent">
												<Text className="text-sm font-semibold text-transparent">.</Text>
											</View>
											<View className="h-2" />
										</View>
									</View>
								);
							}

							const isSelected = isSameDay(c.date, selectedDate);
							const isTodayCell = isSameDay(c.date, today);
							const dayKey = dayKeyLocal(c.date);
							const eventCount = eventsByDay.get(dayKey) ?? 0;
							const indicatorCount = Math.min(eventCount, 3);

							const dayTextClass = ["text-sm font-semibold", isSelected ? "text-white" : "text-slate-900"].join(" ");

							return (
								<View
									key={cellKey}
									style={[dayCellStyle, borderStyle]}
									className={cellClass}
								>
									<Pressable
										onPress={() => onSelectDate(c.date)}
										className="flex-1 w-full items-center justify-between py-2"
										style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
									>
										{isSelected ? (
											<View className="h-9 w-9 items-center justify-center rounded-full bg-red-500">
												<Text className={dayTextClass}>{c.dayNum}</Text>
											</View>
										) : isTodayCell ? (
											<View className="h-9 w-9 items-center justify-center rounded-full border border-slate-900">
												<Text className="text-sm font-semibold text-slate-900">{c.dayNum}</Text>
											</View>
										) : (
											<Text className="text-sm font-semibold text-slate-900">{c.dayNum}</Text>
										)}

										<View className="h-2 items-center justify-center">
											{indicatorCount ? (
												<View className="flex-row items-center justify-center gap-1">
													{Array.from({ length: indicatorCount }).map((_, dotIndex) => (
														<View
															key={`${cellKey}-dot-${dotIndex}`}
															className={`h-1.5 w-3 rounded-full ${INDICATOR_COLORS[dotIndex]}`}
														/>
													))}
												</View>
											) : (
												<View className="h-1.5 w-3" />
											)}
										</View>
									</Pressable>
								</View>
							);
						})}
					</View>
				);
			});
		},
		[dayCellStyle, eventsByDay, gridLineColor, gridLineWidth, onSelectDate, rowStyle, selectedDate, today]
	);

	const renderMonthPanel = useCallback(
		(rows: CalendarCell[][], prefix: string) => (
			<View style={{ width: monthGridWidth }}>
				{renderWeekdayHeader(prefix)}
				{renderMonthRows(rows, prefix)}
			</View>
		),
		[monthGridWidth, renderMonthRows, renderWeekdayHeader]
	);


	return (
		<View className="flex-1 bg-white">
			<ScrollView
				contentContainerClassName="px-4 pb-10 pt-2"
				showsVerticalScrollIndicator={false}
				decelerationRate={0.99}
				scrollEventThrottle={16}
			>
				{showBoost ? (
					<View className={`mt-4 rounded-2xl border px-4 py-4 ${tone.card}`}>
						<View className="flex-row items-start justify-between">
							<View>
								<Text className={`text-xs font-semibold uppercase ${tone.kicker}`}>Today</Text>
								<Text className={`mt-1 text-lg font-extrabold ${tone.title}`}>{boostProfile.title}</Text>
							</View>
							<Pressable
								onPress={() => {
									setShowBoost(false);
									setDismissedSignature(boostSignature);
								}}
								className={`h-7 w-7 items-center justify-center rounded-full ${tone.close}`}
							>
								<Text className={`text-xs font-extrabold ${tone.closeText}`}>x</Text>
							</Pressable>
						</View>
						<View className="mt-3 flex-row items-center justify-between">
							<View className={`rounded-full px-3 py-1 ${tone.pill}`}>
								<Text className={`text-xs font-extrabold ${tone.pillText}`}>{todayLabel}</Text>
							</View>
						</View>
						<Text className={`mt-3 text-sm font-semibold ${tone.subtitle}`}>{boostProfile.subtitle}</Text>
						<Text className={`mt-2 text-xs font-semibold ${tone.detail}`}>{boostDetail}</Text>
					</View>
				) : null}

				<View className="mt-4 flex-row items-center justify-between">
					<View className="flex-row items-center rounded-full bg-slate-100 px-3 py-2">
						<Pressable
							onPress={onPrev}
							className="h-8 w-8 items-center justify-center rounded-full bg-white"
							style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
						>
							<Text className="text-lg font-extrabold text-slate-900">&lt;</Text>
						</Pressable>
						<Text className="mx-3 text-base font-extrabold text-slate-900">{yearLabel}</Text>
						<Pressable
							onPress={onNext}
							className="h-8 w-8 items-center justify-center rounded-full bg-white"
							style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
						>
							<Text className="text-lg font-extrabold text-slate-900">&gt;</Text>
						</Pressable>
					</View>

					<View className="flex-row items-center rounded-full bg-slate-100 px-2 py-2">
						{viewMode === "calendar" ? (
							<Pressable
								onPress={goToToday}
								disabled={isOnToday}
								className={[
									"rounded-full px-3 py-1",
									isOnToday ? "bg-slate-200" : "bg-white",
								].join(" ")}
								style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
							>
								<Text className={["text-xs font-bold", isOnToday ? "text-slate-500" : "text-slate-900"].join(" ")}>
									Today
								</Text>
							</Pressable>
						) : null}
						<Pressable
							onPress={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}
							className={[viewMode === "calendar" ? "ml-2" : "", "rounded-full bg-white px-3 py-1"].join(" ")}
							style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
						>
							<Text className="text-xs font-bold text-slate-900">
								{viewMode === "calendar" ? "List" : "Calendar"}
							</Text>
						</Pressable>
						<Pressable
							onPress={() => router.push("/modal/create")}
							className="ml-2 h-8 w-8 items-center justify-center rounded-full bg-white"
							style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
						>
							<Text className="text-lg font-extrabold text-slate-900">+</Text>
						</Pressable>
					</View>
				</View>

				<View className="mt-6">
					<Text className="text-4xl font-extrabold text-slate-900">{monthName}</Text>
				</View>
				<View className="mt-3 flex-row items-center gap-4">
					{LEGEND_LABELS.map((label, idx) => (
						<View key={label} className="flex-row items-center gap-2">
							<View className={`h-1.5 w-5 rounded-full ${INDICATOR_COLORS[idx]}`} />
							<Text className="text-xs font-semibold text-slate-400">{label}</Text>
						</View>
					))}
				</View>

				{viewMode === "calendar" ? (
					<View className="mt-4">
						<View
							className="mt-4 rounded-2xl bg-white"
							style={{
								width: monthGridWidth,
								height: currentMonthHeight,
								alignSelf: "center",
								overflow: "hidden",
								borderWidth: gridOutlineWidth,
								borderColor: gridOutlineColor,
							}}
						>
							<ScrollView
								ref={monthPagerRef}
								horizontal
								pagingEnabled
								decelerationRate={0.98}
								showsHorizontalScrollIndicator={false}
								bounces={true}
								scrollEventThrottle={8}
								snapToInterval={monthGridWidth}
								snapToAlignment="center"
								disableIntervalMomentum={true}
								onMomentumScrollEnd={handleMonthScrollEnd}
								contentOffset={{ x: monthGridWidth, y: 0 }}
								style={{ width: monthGridWidth, height: currentMonthHeight, overflow: "hidden" }}
								contentContainerStyle={{ width: monthGridWidth * 3 }}
								scrollEnabled={!isPaging}
							>
								{renderMonthPanel(prevRows, "prev")}
								{renderMonthPanel(currentRows, "current")}
								{renderMonthPanel(nextRows, "next")}
							</ScrollView>
						</View>

						<View className="mt-8 items-center">
							<Text className="text-sm font-semibold text-slate-500">{formatDateLong(selectedDate)}</Text>
						</View>

						{eventsForSelected.length === 0 ? (
							<View className="mt-16 items-center">
								<Text className="text-base font-semibold text-slate-400">No Events</Text>
							</View>
						) : (
							<View className="mt-6 gap-y-2.5">
								{eventsForSelected.map((event) => {
									const start = parseISO(event.startAt);
									const end = parseISO(event.endAt);

									return (
										<Pressable
											key={event.id}
											onPress={() => router.push(`/meeting/${event.id}`)}
											className="rounded-2xl border border-gray-200 bg-white p-3"
											style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
										>
											<View className="flex-row items-center justify-between mb-1.5">
												<Text className="text-[13px] text-gray-700">
													{formatTime(start)} - {formatTime(end)}
												</Text>
												<View className="px-2.5 py-1 rounded-full bg-gray-100">
													<Text className="text-xs text-gray-900 font-semibold">
														{TYPE_LABEL[event.type as EventType]}
													</Text>
												</View>
											</View>

											<Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
												{event.title}
											</Text>

											{event.location && (
												<Text className="text-[13px] text-gray-600 mt-1.5" numberOfLines={1}>
													Location: {event.location}
												</Text>
											)}
										</Pressable>
									);
								})}
							</View>
						)}

					</View>
				) : null}

				{viewMode === "list" ? (
					<View className="mt-4">
						<View className="flex-row rounded-full bg-slate-100 p-1">
							{([
								{ key: "day", label: "Day" },
								{ key: "week", label: "Week" },
								{ key: "twoweeks", label: "2 Weeks" },
								{ key: "month", label: "Month" },
							] as Array<{ key: ListRange; label: string }>).map((range) => {
								const isActive = listRange === range.key;
								return (
									<Pressable
										key={range.key}
										onPress={() => setListRange(range.key)}
										className={[
											"flex-1 items-center rounded-full py-2",
											isActive ? "bg-white" : "",
										].join(" ")}
									>
										<Text className={["text-xs font-extrabold", isActive ? "text-slate-900" : "text-slate-500"].join(" ")}>
											{range.label}
										</Text>
									</Pressable>
								);
							})}
						</View>

						<View className="mt-4">
							<Text className="text-lg font-bold text-slate-900 mb-3">Upcoming events</Text>

							{listEvents.length === 0 ? (
								<View className="items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-6">
									<Text className="text-base font-extrabold text-slate-900 text-center">
										No upcoming events
									</Text>
									<Text className="mt-1 text-slate-500 font-semibold text-center">
										Add a new event to start filling this list.
									</Text>
									<Pressable
										onPress={() => router.push("/modal/create")}
										className="mt-4 rounded-xl bg-slate-900 px-4 py-3"
									>
										<Text className="text-white font-extrabold">Add event</Text>
									</Pressable>
								</View>
							) : (
								<View className="gap-y-2.5">
									{listEvents.map((event) => {
										const start = parseISO(event.startAt);
										const end = parseISO(event.endAt);

										return (
											<Pressable
												key={event.id}
												onPress={() => router.push(`/meeting/${event.id}`)}
												className="p-3 rounded-2xl border border-gray-200 bg-white"
												style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
											>
												<View className="flex-row items-center justify-between mb-1.5">
													<Text className="text-[13px] text-gray-700">
														{formatDateLong(start)} - {formatTime(start)}
													</Text>
													<View className="px-2.5 py-1 rounded-full bg-gray-100">
														<Text className="text-xs text-gray-900 font-semibold">
															{TYPE_LABEL[event.type as EventType]}
														</Text>
													</View>
												</View>

												<Text className="text-base font-semibold text-gray-900" numberOfLines={1}>
													{event.title}
												</Text>

												<View className="mt-1 flex-row items-center justify-between">
													<Text className="text-[13px] text-gray-600">
														{formatTime(start)} - {formatTime(end)}
													</Text>
													{event.location ? (
														<Text className="text-[13px] text-gray-600" numberOfLines={1}>
															{event.location}
														</Text>
													) : null}
												</View>
											</Pressable>
										);
									})}
								</View>
							)}
						</View>
					</View>
				) : null}
			</ScrollView>
		</View>
	);
}
