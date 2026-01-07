import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Animated,
	Image,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { dayKeyLocal, parseISO } from "../../lib/datetime";
import { Invite, RSVPValue } from "../../lib/social";
import { useAppStore } from "../../lib/store";
import { Event as CalendarEvent, EventType } from "../../lib/types";
import CreateEventModal from "../components/CreateEventModal";

const TYPE_LABEL: Record<EventType, string> = {
  study: "Study",
  meetup: "Meetup",
  class: "Class",
};
const BELL_ICON = require("../../assets/images/bell-icon.png");

function formatTime(date: Date) {
  // RN supports toLocaleTimeString; on Android some locales may vary but this matches your web logic
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDateLong(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function isSameDay(date1: Date, date2: Date) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

// Utility function to get time until event
function getTimeUntil(date: Date) {
  const now = new Date();
  const diff = date.getTime() - now.getTime();

  if (diff < 0) return "Now";

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `in ${days}d`;
  if (hours > 0) return `in ${hours}h`;
  if (minutes > 0) return `in ${minutes}m`;
  return "Starting soon";
}

// Get event type "gradient" colors (RN: we mimic with solid color + overlay)
function getEventTypeColor(type: EventType) {
  const colors: Record<EventType, { base: string; overlay: string }> = {
    study: { base: "#0f172a", overlay: "rgba(168, 85, 247, 0.25)" }, // slate-900 + purple overlay
    meetup: { base: "#0f172a", overlay: "rgba(59, 130, 246, 0.22)" }, // slate-900 + blue overlay
    class: { base: "#0f172a", overlay: "rgba(245, 158, 11, 0.22)" }, // slate-900 + amber overlay
  };
  return colors[type] || { base: "#0f172a", overlay: "rgba(148, 163, 184, 0.22)" };
}

function getEventTypeBg(type: EventType) {
  const colors: Record<EventType, string> = {
    study: "#f5f3ff", // purple-50
    meetup: "#eff6ff", // blue-50
    class: "#fffbeb", // amber-50
  };
  return colors[type] || "#f8fafc";
}

function getEventTypeText(type: EventType) {
  const colors: Record<EventType, string> = {
    study: "#6d28d9", // purple-700
    meetup: "#1d4ed8", // blue-700
    class: "#b45309", // amber-700
  };
  return colors[type] || "#334155";
}

// Get day of week abbreviation
function getDayAbbr(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

// Get next 7 days starting from today
function getNext7Days() {
  const days: Date[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 7; i++) {
    const day = new Date(today);
    day.setDate(today.getDate() + i);
    days.push(day);
  }
  return days;
}

// Get visual density emoji based on event count
function getDensityEmoji(count: number) {
  if (count === 0) return "😌";
  if (count <= 2) return "📅";
  if (count <= 4) return "😅";
  return "🔥";
}

function getDensityLabel(count: number) {
  if (count === 0) return "Free";
  if (count <= 2) return "Light";
  if (count <= 4) return "Busy";
  return "Packed";
}

function getDensityColors(count: number) {
  if (count === 0) return { border: "#bbf7d0", bg: "#f0fdf4" }; // green-200/50
  if (count <= 2) return { border: "#bfdbfe", bg: "#eff6ff" }; // blue
  if (count <= 4) return { border: "#fde68a", bg: "#fffbeb" }; // amber
  return { border: "#fecaca", bg: "#fef2f2" }; // red
}

// Week Timeline Component
function WeekTimeline({
  events,
  onEventPress,
  onNavigateToCalendar,
}: {
  events: CalendarEvent[];
  onEventPress: (id: string) => void;
  onNavigateToCalendar: (day: Date) => void;
}) {
  // Use useMemo instead of useState so days update when needed
  const days = useMemo(() => getNext7Days(), []);
  const scrollRef = useRef<ScrollView | null>(null);

  const getEventsForDay = (day: Date) => {
    const key = dayKeyLocal(day);
    return events
      .filter((e) => dayKeyLocal(parseISO(e.startAt)) === key)
      .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime());
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Auto-scroll to today on mount
  useEffect(() => {
    const todayIndex = days.findIndex((d) => isSameDay(d, today));
    if (todayIndex !== -1) {
      const scrollPosition = todayIndex * 136; // 128 width + 8 gap
      // small delay to ensure layout is ready
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: scrollPosition, y: 0, animated: true });
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>Your Week</Text>
        <View style={styles.rowCenter}>
          <View style={styles.rowCenter}>
            <Text style={styles.legendText}>😌 Free</Text>
            <Text style={styles.legendDot}>•</Text>
            <Text style={styles.legendText}>🔥 Packed</Text>
          </View>
          <Text style={styles.scrollHint}>← Scroll →</Text>
        </View>
      </View>

      <ScrollView
        ref={(r) => { scrollRef.current = r; }}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekScrollContent}
        snapToInterval={136}
        decelerationRate="fast"
      >
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isTodayFlag = isSameDay(day, today);
          const dayNum = day.getDate();
          const dayName = getDayAbbr(day);
          const count = dayEvents.length;
          const densityEmoji = getDensityEmoji(count);
          const densityLabel = getDensityLabel(count);
          const density = getDensityColors(count);

          return (
            <Pressable
              key={idx}
              onPress={() => onNavigateToCalendar(day)}
              style={[
                styles.dayCard,
                isTodayFlag
                  ? styles.dayCardToday
                  : { borderColor: density.border, backgroundColor: density.bg },
              ]}
            >
              {/* Day Header */}
              <View style={{ alignItems: "center", marginBottom: 8 }}>
                <Text style={[styles.dayHeaderSmall, isTodayFlag && styles.whiteText]}>
                  {isTodayFlag ? "Today" : dayName}
                </Text>
                <Text style={[styles.dayHeaderBig, isTodayFlag && styles.whiteText]}>{dayNum}</Text>
              </View>

              {/* Density Indicator */}
              <View
                style={[
                  styles.densityBox,
                  { backgroundColor: isTodayFlag ? "rgba(255,255,255,0.20)" : "rgba(255,255,255,0.70)" },
                ]}
              >
                <Text style={styles.densityEmoji}>{densityEmoji}</Text>
                <Text
                  style={[
                    styles.densityCount,
                    isTodayFlag
                      ? styles.whiteText
                      : count === 0
                      ? { color: "#15803d" }
                      : count >= 5
                      ? { color: "#b91c1c" }
                      : { color: "#334155" },
                  ]}
                >
                  {count === 0 ? "FREE" : `${count} event${count !== 1 ? "s" : ""}`}
                </Text>
                <Text style={[styles.densityLabel, isTodayFlag ? { color: "rgba(255,255,255,0.70)" } : { color: "#64748b" }]}>
                  {densityLabel}
                </Text>
              </View>

              {/* Preview first 2 event times only */}
              <View style={{ gap: 4 }}>
                {dayEvents.slice(0, 2).map((event, i) => {
                  const start = parseISO(event.startAt);
                  return (
                    <Pressable
                      key={i}
                      onPress={() => onEventPress(event.id)}
                      style={{ paddingVertical: 0 }}
                    >
                      <Text
                        style={[
                          styles.previewTime,
                          isTodayFlag ? { color: "rgba(255,255,255,0.90)" } : { color: "#475569" },
                        ]}
                      >
                        • {formatTime(start).replace(" ", "")}
                      </Text>
                    </Pressable>
                  );
                })}
                {dayEvents.length > 2 && (
                  <Text style={[styles.moreText, isTodayFlag ? { color: "rgba(255,255,255,0.70)" } : { color: "#64748b" }]}>
                    +{dayEvents.length - 2} more
                  </Text>
                )}
              </View>

              {/* Tap to view hint */}
              <View style={[styles.tapHintWrap, isTodayFlag ? { borderTopColor: "rgba(255,255,255,0.20)" } : { borderTopColor: "#e2e8f0" }]}>
                <Text style={[styles.tapHintText, isTodayFlag ? { color: "rgba(255,255,255,0.60)" } : { color: "#94a3b8" }]}>
                  Tap to view →
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// Nothing Hidden View with Show More
function NothingHiddenView({
  events,
  onEventPress,
}: {
  events: CalendarEvent[];
  onEventPress: (id: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const INITIAL_COUNT = 10;

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => parseISO(e.startAt) >= now)
      .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime());
  }, [events]);

  const displayedEvents = showAll ? upcomingEvents : upcomingEvents.slice(0, INITIAL_COUNT);
  const hasMore = upcomingEvents.length > INITIAL_COUNT;

  if (upcomingEvents.length === 0) {
    return (
      <View style={styles.allClearBox}>
        <Text style={styles.allClearEmoji}>📭</Text>
        <View style={styles.rowCenter}>
          <Text style={styles.allClearTitle}>All Clear!</Text>
          <View style={styles.badgeGreen}>
            <Text style={styles.badgeGreenText}>✓ Nothing Hidden</Text>
          </View>
        </View>
        <Text style={styles.allClearSubtitle}>Nothing on your schedule. Time to plan something!</Text>
      </View>
    );
  }

  // Group events by day - Today, Tomorrow, and next 3 days with events
  const groupedEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const groups: Array<{
      label: string;
      date: Date;
      events: CalendarEvent[];
      showConflicts: boolean;
    }> = [];

    const getDayLabel = (date: Date) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      if (dayKeyLocal(date) === dayKeyLocal(today)) return "Today";
      if (dayKeyLocal(date) === dayKeyLocal(tomorrow)) return "Tomorrow";

      return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    };

    const eventsByDate: Record<string, { date: Date; events: CalendarEvent[] }> = {};
    displayedEvents.forEach((event) => {
      const eventDate = parseISO(event.startAt);
      const dateKey = dayKeyLocal(eventDate);

      if (!eventsByDate[dateKey]) {
        eventsByDate[dateKey] = { date: eventDate, events: [] };
      }
      eventsByDate[dateKey].events.push(event);
    });

    const sortedDates = Object.keys(eventsByDate).sort();

    const todayKey = dayKeyLocal(now);
    const tomorrowKey = dayKeyLocal(new Date(now.getTime() + 86400000));

    if (eventsByDate[todayKey]) {
      groups.push({
        label: "Today",
        date: eventsByDate[todayKey].date,
        events: eventsByDate[todayKey].events,
        showConflicts: true,
      });
    }

    if (eventsByDate[tomorrowKey]) {
      groups.push({
        label: "Tomorrow",
        date: eventsByDate[tomorrowKey].date,
        events: eventsByDate[tomorrowKey].events,
        showConflicts: true,
      });
    }

    let daysAdded = 0;
    const maxDaysToShow = 3;

    for (const dateKey of sortedDates) {
      if (daysAdded >= maxDaysToShow) break;
      if (dateKey === todayKey || dateKey === tomorrowKey) continue;

      const dayData = eventsByDate[dateKey];
      groups.push({
        label: getDayLabel(dayData.date),
        date: dayData.date,
        events: dayData.events,
        showConflicts: false,
      });

      daysAdded++;
    }

    return groups;
  }, [displayedEvents]);

  const renderEventGroup = (groupData: {
    label: string;
    date: Date;
    events: CalendarEvent[];
    showConflicts: boolean;
  }) => {
    if (!groupData || groupData.events.length === 0) return null;

    const { label, events, showConflicts } = groupData;

    const conflicts: Array<{ event1: CalendarEvent; event2: CalendarEvent }> = [];
    if (showConflicts) {
      for (let i = 0; i < events.length - 1; i++) {
        const current = events[i];
        const next = events[i + 1];
        const currentEnd = parseISO(current.endAt);
        const nextStart = parseISO(next.startAt);

        if (currentEnd > nextStart) {
          conflicts.push({ event1: current, event2: next });
        }
      }
    }

    return (
      <View key={label} style={{ marginBottom: 16 }}>
        <Text style={styles.groupHeader}>{label}</Text>

        <View style={styles.groupCard}>
          {events.map((event) => {
            const start = parseISO(event.startAt);

            const hasConflict = conflicts.some(
              (c) => c.event1.id === event.id || c.event2.id === event.id
            );
            const isFirstInConflict = conflicts.some((c) => c.event1.id === event.id);
            const isSecondInConflict = conflicts.some((c) => c.event2.id === event.id);

            return (
              <View key={event.id} style={{ borderBottomWidth: 1, borderBottomColor: "#f1f5f9" }}>
                <Pressable
                  onPress={() => onEventPress(event.id)}
                  style={[
                    styles.eventRow,
                    hasConflict
                      ? { borderLeftColor: "#ef4444", backgroundColor: "rgba(239,68,68,0.06)" }
                      : { borderLeftColor: "transparent" },
                  ]}
                >
                  {/* Header: Time + Badge */}
                  <View style={[styles.rowBetween, { marginBottom: 8 }]}>
                    <View style={styles.rowCenter}>
                      <View style={styles.rowCenter}>
                        <Text style={styles.iconMuted}>⏰</Text>
                        <Text style={styles.timeText}>{formatTime(start)}</Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.typeBadge,
                        { backgroundColor: getEventTypeBg(event.type) },
                      ]}
                    >
                      <Text style={[styles.typeBadgeText, { color: getEventTypeText(event.type) }]}>
                        {TYPE_LABEL[event.type]}
                      </Text>
                    </View>
                  </View>

                  {/* Title */}
                  <Text style={styles.eventTitle}>{event.title}</Text>

                  {/* Footer: Location */}
                  {event.location ? (
                    <View style={[styles.rowCenter, { marginTop: 2 }]}>
                      <Text style={styles.iconMuted}>📍</Text>
                      <Text style={styles.locationText}>{event.location}</Text>
                    </View>
                  ) : null}

                  {/* Hover indicator (RN: always subtle) */}
                  <View style={styles.chevWrap}>
                    <Text style={styles.chevText}>›</Text>
                  </View>
                </Pressable>

                {/* Conflict warning - shows on both conflicting events */}
                {hasConflict ? (
                  <View style={styles.conflictBar}>
                    <Text style={styles.conflictIcon}>⚠️</Text>
                    <Text style={styles.conflictText}>
                      {isFirstInConflict && isSecondInConflict
                        ? "Multiple time conflicts"
                        : isFirstInConflict
                        ? "Time conflict with next event"
                        : "Time conflict with previous event"}
                    </Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={{ gap: 12 }}>
      <View style={styles.rowBetween}>
        <View style={[styles.rowCenter, { gap: 8 }]}>
          <Text style={styles.sectionTitle}>Everything Coming Up</Text>
          {showAll ? (
            <View style={styles.badgeGreenLight}>
              <Text style={styles.badgeGreenLightText}>✓ Nothing Hidden</Text>
            </View>
          ) : null}
        </View>
        {!showAll && hasMore ? (
          <Text style={styles.smallMuted}>
            Showing {INITIAL_COUNT} of {upcomingEvents.length}
          </Text>
        ) : null}
      </View>

      {groupedEvents.map((g) => renderEventGroup(g))}

      {/* Show More Button */}
      {hasMore && !showAll ? (
        <View style={{ marginHorizontal: 8 }}>
          <Pressable onPress={() => setShowAll(true)} style={styles.bigButton}>
            <Text style={styles.bigButtonText}>Show All {upcomingEvents.length} Events →</Text>
          </Pressable>
        </View>
      ) : null}

      {/* All Set Banner - shows when everything is visible */}
      {showAll ? <AllSetBanner show={true} /> : null}

      {/* Show Less Button */}
      {showAll && hasMore ? (
        <View style={{ marginHorizontal: 8, marginTop: 12 }}>
          <Pressable
            onPress={() => {
              setShowAll(false);
              // RN has no window.scrollTo; parent scroll stays where it is (closest compatibility)
            }}
            style={styles.bigButton}
          >
            <Text style={styles.bigButtonText}>↑ Collapse List</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

// Focus Card - What's next RIGHT NOW
function TodayFocusCard({ event, onPress }: { event: CalendarEvent | undefined; onPress: () => void }) {
  if (!event) return null;

  const [timeUntil, setTimeUntil] = useState(() => getTimeUntil(parseISO(event.startAt)));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntil(getTimeUntil(parseISO(event.startAt)));
    }, 30000);
    return () => clearInterval(interval);
  }, [event.startAt]);

  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);
  const gradient = getEventTypeColor(event.type);

  const now = new Date();
  const hoursUntil = (parseISO(event.startAt).getTime() - now.getTime()) / (1000 * 60 * 60);
  const isUrgent = hoursUntil <= 2;

  return (
    <Pressable onPress={onPress} style={[styles.focusCard, { backgroundColor: gradient.base }]}>
      {/* "Gradient background" overlay */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: gradient.overlay }]} />

      <View style={{ position: "relative" }}>
        <View style={[styles.rowCenter, { gap: 8, marginBottom: 12 }]}>
          <View style={[styles.dot, { backgroundColor: isUrgent ? "#ef4444" : "#22c55e" }]} />
          <Text style={styles.focusLabel}>{isUrgent ? "Coming Up Soon" : "Next Up"}</Text>

          <View style={styles.focusPill}>
            <Text style={styles.focusPillText}>{timeUntil}</Text>
          </View>

          {!isUrgent ? (
            <View style={styles.badgeGreenSolid}>
              <Text style={styles.badgeGreenSolidText}>✓ Nothing Urgent</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.focusTitle}>{event.title}</Text>

        <View style={[styles.rowCenter, { gap: 16, marginTop: 6 }]}>
          <Text style={styles.focusMeta}>
            {formatTime(start)} - {formatTime(end)}
          </Text>
          {event.location ? <Text style={styles.focusMeta}>📍 {event.location}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

// "You're All Set" Confirmation Banner
function AllSetBanner({ show }: { show: boolean }) {
  if (!show) return null;

  return (
    <View style={styles.allSetWrap}>
      <View style={[styles.rowCenter, { gap: 8, marginBottom: 8, justifyContent: "center" }]}>
        <Text style={{ fontSize: 22 }}>✅</Text>
        <Text style={styles.allSetTitle}>You're All Set!</Text>
      </View>
      <Text style={styles.allSetSubtitle}>You've reviewed everything. No surprises ahead.</Text>
      <View style={[styles.rowCenter, { gap: 10, marginTop: 10, justifyContent: "center" }]}>
        <Text style={styles.allSetTiny}>✓ Week checked</Text>
        <Text style={styles.allSetDot}>•</Text>
        <Text style={styles.allSetTiny}>✓ No conflicts</Text>
        <Text style={styles.allSetDot}>•</Text>
        <Text style={styles.allSetTiny}>✓ Nothing hidden</Text>
      </View>
    </View>
  );
}

// Quick Stats Banner with trust indicators
function QuickStatsBanner({ events }: { events: CalendarEvent[] }) {
  const stats = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextWeekEnd = new Date(weekEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    const thisWeek = events.filter((e) => {
      const d = parseISO(e.startAt);
      return d >= now && d < weekEnd;
    });

    const nextWeek = events.filter((e) => {
      const d = parseISO(e.startAt);
      return d >= weekEnd && d < nextWeekEnd;
    });

    const today = events.filter((e) => {
      const d = parseISO(e.startAt);
      return dayKeyLocal(d) === dayKeyLocal(now);
    });

    return {
      today: today.length,
      week: thisWeek.length,
      nextWeek: nextWeek.length,
    };
  }, [events]);

  return (
    <View style={styles.statsRow}>
      <Pressable style={[styles.statCard, { backgroundColor: "#dbeafe", borderColor: "#bfdbfe" }]}>
        <Text style={[styles.statNum, { color: "#1e3a8a" }]}>{stats.today}</Text>
        <Text style={[styles.statLabel, { color: "#1d4ed8" }]}>Today</Text>
      </Pressable>

      <Pressable style={[styles.statCard, { backgroundColor: "#ede9fe", borderColor: "#ddd6fe" }]}>
        <Text style={[styles.statNum, { color: "#4c1d95" }]}>{stats.week}</Text>
        <Text style={[styles.statLabel, { color: "#6d28d9" }]}>This Week</Text>
      </Pressable>

      <Pressable style={[styles.statCard, { backgroundColor: "#ecfeff", borderColor: "#cffafe" }]}>
        <Text style={[styles.statNum, { color: "#0e7490" }]}>{stats.nextWeek}</Text>
        <Text style={[styles.statLabel, { color: "#0891b2" }]}>Next Week</Text>
      </Pressable>
    </View>
  );
}

// Notification Drawer Component
function NotificationDrawer({
  isOpen,
  onClose,
  pendingSocialInvites,
  pendingCalendarEvents,
  onDismiss,
  onClearAll,
}: {
  isOpen: boolean;
  onClose: () => void;
  pendingSocialInvites: any[];
  pendingCalendarEvents: any[];
  onDismiss: (id: string) => void;
  onClearAll: (ids: string[]) => void;
}) {
  if (!isOpen) return null;

  const totalPending = pendingSocialInvites.length + pendingCalendarEvents.length;

  const handleDismissInvite = (id: string) => {
    onDismiss(id);
  };

  const handleClearAll = () => {
    const allIds = [...pendingSocialInvites.map((inv) => inv.id), ...pendingCalendarEvents.map((evt) => evt.id)];
    onClearAll(allIds);
  };

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.drawerOverlay} onPress={onClose}>
        <View style={styles.drawerContainer}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={styles.drawerContent}>
              {/* Header */}
              <View style={styles.drawerHeader}>
                <View style={[styles.rowCenter, { gap: 8 }]}>
                  <Text style={styles.drawerTitle}>Notifications</Text>
                  {totalPending > 0 && (
                    <View style={styles.drawerBadge}>
                      <Text style={styles.drawerBadgeText}>{totalPending}</Text>
                    </View>
                  )}
                </View>
                <View style={[styles.rowCenter, { gap: 8 }]}>
                  {totalPending > 0 && (
                    <Pressable onPress={handleClearAll} style={styles.drawerClearBtn}>
                      <Text style={styles.drawerClearText}>Clear All</Text>
                    </Pressable>
                  )}
                  <Pressable onPress={onClose} style={styles.drawerCloseBtn}>
                    <Text style={styles.drawerCloseText}>✕</Text>
                  </Pressable>
                </View>
              </View>

              {/* Content */}
              <ScrollView style={styles.drawerScroll} showsVerticalScrollIndicator={false}>
                {totalPending === 0 ? (
                  <View style={styles.drawerEmpty}>
                    <Text style={styles.drawerEmptyEmoji}>✅</Text>
                    <Text style={styles.drawerEmptyTitle}>All caught up!</Text>
                    <Text style={styles.drawerEmptyText}>No pending invites or events.</Text>
                  </View>
                ) : (
                  <View style={styles.drawerList}>
                    {/* Social Invites Section */}
                    {pendingSocialInvites.length > 0 && (
                      <View>
                        <View style={styles.drawerSectionHeader}>
                          <Text style={styles.drawerSectionTitle}>Social Invites</Text>
                          <View style={styles.drawerSectionBadge}>
                            <Text style={styles.drawerSectionBadgeText}>{pendingSocialInvites.length}</Text>
                          </View>
                        </View>
                        {pendingSocialInvites.map((invite) => (
                          <View key={invite.id} style={styles.drawerItemWrapper}>
                            <Pressable
                              style={styles.drawerItem}
                              onPress={() => {
                                onClose();
                                router.push("/social?filter=social");
                              }}
                            >
                              <View style={styles.drawerItemIcon}>
                                <Text style={{ fontSize: 20 }}>👥</Text>
                              </View>
                              <View style={styles.drawerItemContent}>
                                <Text style={styles.drawerItemTitle}>{invite.title}</Text>
                                <Text style={styles.drawerItemSubtitle}>
                                  From {invite.organizer} {invite.group ? `• ${invite.group}` : ""}
                                </Text>
                                <Text style={styles.drawerItemTime}>{formatTime(parseISO(invite.startAt))}</Text>
                              </View>
                              <View style={styles.drawerItemChevron}>
                                <Text style={{ fontSize: 16, color: "#94a3b8" }}>›</Text>
                              </View>
                            </Pressable>
                            <Pressable
                              style={styles.drawerItemDismiss}
                              onPress={() => handleDismissInvite(invite.id)}
                            >
                              <Text style={styles.drawerItemDismissText}>✕</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Calendar Events Section */}
                    {pendingCalendarEvents.length > 0 && (
                      <View style={{ marginTop: pendingSocialInvites.length > 0 ? 16 : 0 }}>
                        <View style={styles.drawerSectionHeader}>
                          <Text style={styles.drawerSectionTitle}>Calendar Events</Text>
                          <View style={styles.drawerSectionBadge}>
                            <Text style={styles.drawerSectionBadgeText}>{pendingCalendarEvents.length}</Text>
                          </View>
                        </View>
                        {pendingCalendarEvents.map((event) => (
                          <View key={event.id} style={styles.drawerItemWrapper}>
                            <Pressable
                              style={styles.drawerItem}
                              onPress={() => {
                                onClose();
                                router.push("/social?filter=calendar");
                              }}
                            >
                              <View style={styles.drawerItemIcon}>
                                <Text style={{ fontSize: 20 }}>📅</Text>
                              </View>
                              <View style={styles.drawerItemContent}>
                                <Text style={styles.drawerItemTitle}>{event.title}</Text>
                                <Text style={styles.drawerItemSubtitle}>
                                  From {event.creator} {event.group ? `• ${event.group}` : ""}
                                </Text>
                                <Text style={styles.drawerItemTime}>{formatTime(parseISO(event.startAt))}</Text>
                              </View>
                              <View style={styles.drawerItemChevron}>
                                <Text style={{ fontSize: 16, color: "#94a3b8" }}>›</Text>
                              </View>
                            </Pressable>
                            <Pressable
                              style={styles.drawerItemDismiss}
                              onPress={() => handleDismissInvite(event.id)}
                            >
                              <Text style={styles.drawerItemDismissText}>✕</Text>
                            </Pressable>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* Footer CTA */}
              {totalPending > 0 && (
                <View style={styles.drawerFooter}>
                  <Pressable
                    style={styles.drawerFooterBtn}
                    onPress={() => {
                      onClose();
                      router.push("/social");
                    }}
                  >
                    <Text style={styles.drawerFooterBtnText}>View All in Social</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// Event Detail Modal
function EventDetailModal({
  event,
  isOpen,
  onClose,
  onDelete,
}: {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  if (!isOpen || !event) return null;

  const start = parseISO(event.startAt);
  const end = parseISO(event.endAt);
  const translateY = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    translateY.setValue(0);
    onClose();
  };

  const handlePullEnd = (offsetY: number) => {
    const distance = offsetY < 0 ? -offsetY : 0;
    if (distance > 120) {
      Animated.timing(translateY, {
        toValue: 400,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        translateY.setValue(0);
        onClose();
      });
    } else if (distance > 0) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete event?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          onDelete(event.id);
          onClose();
        },
      },
    ]);
  };

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.sheetOverlay}>
        <Animated.View
          style={[
            styles.sheetCard,
            styles.sheetCardOffset,
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.modalTopBar}>
            <Pressable onPress={handleClose}>
              <Text style={styles.modalTopTextMuted}>Close</Text>
            </Pressable>
            <Text style={styles.modalTopTitle}>Event</Text>
            <View style={{ width: 56 }} />
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
            <View style={[styles.rowBetween, { alignItems: "flex-start", gap: 12, marginBottom: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.detailTitle}>{event.title}</Text>
                <Text style={styles.detailDate}>{formatDateLong(start)}</Text>
              </View>

              <Pressable onPress={handleDelete} style={styles.trashBtn}>
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </Pressable>
            </View>

            <View style={styles.detailCard}>
              <View style={{ gap: 4 }}>
                <Text style={styles.detailLabel}>Time</Text>
                <Text style={styles.detailValue}>
                  {formatTime(start)} - {formatTime(end)}
                </Text>
              </View>

              {event.location ? (
                <View style={{ gap: 4 }}>
                  <Text style={styles.detailLabel}>Location</Text>
                  <Text style={styles.detailValue}>{event.location}</Text>
                </View>
              ) : null}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function SocialInviteDetailModal({
  invite,
  isOpen,
  onClose,
}: {
  invite: Invite | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !invite) return null;

  const start = parseISO(invite.startAt);
  const end = parseISO(invite.endAt);
  const translateY = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    translateY.setValue(0);
    onClose();
  };

  const handlePullEnd = (offsetY: number) => {
    const distance = offsetY < 0 ? -offsetY : 0;
    if (distance > 120) {
      Animated.timing(translateY, {
        toValue: 400,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        translateY.setValue(0);
        onClose();
      });
    } else if (distance > 0) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    }
  };

  const sections: Array<{
    label: string;
    status: RSVPValue | null;
    pill: object;
    text: object;
  }> = [
    { label: "Going", status: "yes", pill: styles.invitePillGreen, text: styles.invitePillTextGreen },
    { label: "Maybe", status: "maybe", pill: styles.invitePillYellow, text: styles.invitePillTextYellow },
    { label: "Can't Go", status: "no", pill: styles.invitePillRed, text: styles.invitePillTextRed },
    { label: "Pending", status: null, pill: styles.invitePillSlate, text: styles.invitePillTextSlate },
  ];

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.sheetOverlay}>
        <Animated.View
          style={[
            styles.sheetCard,
            styles.sheetCardOffset,
            { transform: [{ translateY }] },
          ]}
        >
          <View style={styles.modalTopBar}>
            <Pressable onPress={handleClose}>
              <Text style={styles.modalTopTextMuted}>Close</Text>
            </Pressable>
            <Text style={styles.modalTopTitle}>Event</Text>
            <View style={{ width: 56 }} />
          </View>

          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
            scrollEventThrottle={8}
            decelerationRate={0.98}
            bounces
            alwaysBounceVertical
            onScroll={(event) => {
              const offsetY = event.nativeEvent.contentOffset.y;
              if (offsetY < 0) {
                translateY.setValue(Math.min(-offsetY, 240));
              } else if (offsetY === 0) {
                translateY.setValue(0);
              }
            }}
            onScrollEndDrag={(event) => handlePullEnd(event.nativeEvent.contentOffset.y)}
          >
            <View style={styles.inviteHero}>
              <Text style={styles.inviteHeroLabel}>Social Event</Text>
              <Text style={styles.inviteHeroTitle}>{invite.title}</Text>
              <Text style={styles.inviteHeroMeta}>
                {formatDateLong(start)} | {formatTime(start)} - {formatTime(end)}
              </Text>
              <Text style={styles.inviteHeroMeta}>{invite.location}</Text>

              <View style={styles.inviteHeroChips}>
                <View style={styles.inviteHeroChip}>
                  <Text style={styles.inviteHeroChipText}>{invite.organizer}</Text>
                </View>
                {invite.group ? (
                  <View style={styles.inviteHeroChip}>
                    <Text style={styles.inviteHeroChipText}>{invite.group}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={styles.inviteStatsRow}>
              {sections.map((section) => {
                const count = invite.attendees.filter((a) => a.status === section.status).length;
                return (
                  <View key={section.label} style={[styles.inviteStatPill, section.pill]}>
                    <Text style={[styles.inviteStatCount, section.text]}>{count}</Text>
                    <Text style={[styles.inviteStatLabel, section.text]}>{section.label}</Text>
                  </View>
                );
              })}
            </View>

            <View style={{ marginTop: 12, gap: 14 }}>
              {sections.map((section) => {
                const attendees = invite.attendees.filter((a) => a.status === section.status);
                return (
                  <View key={section.label} style={styles.inviteSection}>
                    <View style={styles.inviteSectionHeader}>
                      <Text style={styles.inviteSectionTitle}>{section.label}</Text>
                      <View style={[styles.inviteSectionBadge, section.pill]}>
                        <Text style={[styles.inviteSectionBadgeText, section.text]}>{attendees.length}</Text>
                      </View>
                    </View>

                    {attendees.length === 0 ? (
                      <Text style={styles.inviteSectionEmpty}>No one yet</Text>
                    ) : (
                      attendees.map((attendee, idx) => (
                        <View key={`${attendee.name}-${idx}`} style={styles.invitePersonRow}>
                          <View style={styles.inviteAvatar}>
                            <Text style={styles.inviteAvatarText}>{attendee.name.charAt(0)}</Text>
                          </View>
                          <Text style={styles.invitePersonName}>{attendee.name}</Text>
                        </View>
                      ))
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// IDIOT-PROOF HOME SCREEN
export default function HomeScreen() {
  const showMockChrome = Platform.OS === "web";
  const events = useAppStore((s) => s.events);
  const addEvent = useAppStore((s) => s.addEvent);
  const deleteEvent = useAppStore((s) => s.deleteEvent);
  const groupInvites = useAppStore((s) => s.groupInvites);
  const friendInvites = useAppStore((s) => s.friendInvites);
  const groupCalendarEvents = useAppStore((s) => s.groupCalendarEvents);
  const friendCalendarEvents = useAppStore((s) => s.friendCalendarEvents);
  const inviteNotificationDismissals = useAppStore((s) => s.inviteNotificationDismissals);
  const dismissInviteNotification = useAppStore((s) => s.dismissInviteNotification);
  const clearInviteNotifications = useAppStore((s) => s.clearInviteNotifications);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [notificationDayKey, setNotificationDayKey] = useState(() => dayKeyLocal(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      const nextKey = dayKeyLocal(new Date());
      setNotificationDayKey((prev) => (prev === nextKey ? prev : nextKey));
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const today = useMemo(() => new Date(), []);

  const nextEvent = useMemo(() => {
    const now = new Date();
    return events
      .filter((e) => parseISO(e.startAt) > now)
      .sort((a, b) => parseISO(a.startAt).getTime() - parseISO(b.startAt).getTime())[0];
  }, [events]);

  const handleEventPress = (id: string) => {
    const event = events.find((e) => e.id === id) || null;
    if (!event) return;

    const inviteMatch =
      groupInvites.find((inv) => inv.title === event.title && inv.startAt === event.startAt) ||
      friendInvites.find((inv) => inv.title === event.title && inv.startAt === event.startAt) ||
      null;

    if (inviteMatch) {
      setSelectedInvite(inviteMatch);
      setSelectedEvent(null);
      return;
    }

    setSelectedInvite(null);
    setSelectedEvent(event);
  };

  const handleCreateEvent = (newEvent: Omit<CalendarEvent, "id">) => {
    addEvent(newEvent);
  };

  const handleDeleteEvent = (id: string) => {
    deleteEvent(id);
  };

  const handleNavigateToCalendar = (day: Date) => {
    // Navigate to calendar tab with the specific date
    router.push({
      pathname: "/calendar",
      params: { selectedDate: day.toISOString() },
    });
  };

  const pendingSocialInvites = useMemo(
    () => [...groupInvites.filter((inv) => !inv.rsvpStatus), ...friendInvites.filter((inv) => !inv.rsvpStatus)],
    [friendInvites, groupInvites]
  );
  const pendingCalendarEvents = useMemo(
    () => [...groupCalendarEvents.filter((evt) => !evt.acceptStatus), ...friendCalendarEvents.filter((evt) => !evt.acceptStatus)],
    [friendCalendarEvents, groupCalendarEvents]
  );
  const dismissedToday = inviteNotificationDismissals[notificationDayKey] ?? [];
  const dismissedSet = useMemo(() => new Set(dismissedToday), [dismissedToday]);
  const visibleSocialInvites = useMemo(
    () => pendingSocialInvites.filter((inv) => !dismissedSet.has(inv.id)),
    [dismissedSet, pendingSocialInvites]
  );
  const visibleCalendarEvents = useMemo(
    () => pendingCalendarEvents.filter((evt) => !dismissedSet.has(evt.id)),
    [dismissedSet, pendingCalendarEvents]
  );
  const pendingTotal = visibleSocialInvites.length + visibleCalendarEvents.length;

  const getConflicts = useAppStore((s) => s.getConflicts);
  const todayConflicts = useMemo(() => getConflicts(today), [getConflicts, today]);
  const hasConflicts = todayConflicts.length > 0;

  return (
    <View style={[styles.screenRoot, Platform.OS !== "web" && styles.screenRootNative]}>
      {/* Phone Frame */}
      <View style={[styles.phoneFrame, Platform.OS !== "web" && styles.phoneFrameNative]}>
        {/* Content Scroll */}
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
        >
          {/* Header with trust indicators */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.mainTitle}>Your Schedule</Text>

              <View style={[styles.rowCenter, { gap: 8 }]}>
                <Text style={styles.dateText}>{formatDateLong(today)}</Text>
                <Text style={{ color: "#cbd5e1" }}>•</Text>
                <View style={[styles.rowCenter, { gap: 6 }]}>
                  <View style={styles.greenDot} />
                  <Text style={styles.uptodateText}>Up to date</Text>
                </View>
              </View>
            </View>

            <View style={[styles.rowCenter, { gap: 12 }]}>
              {/* Notification Bell */}
              <Pressable onPress={() => setIsNotificationDrawerOpen(!isNotificationDrawerOpen)} style={styles.bellBtn}>
                <Image source={BELL_ICON} style={styles.bellImage} resizeMode="contain" />
                {pendingTotal > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{pendingTotal}</Text>
                  </View>
                )}
              </Pressable>

              <Pressable onPress={() => setIsCreateModalOpen(true)} style={styles.addBtn}>
                <Text style={styles.addBtnText}>＋ Add</Text>
              </Pressable>
            </View>
          </View>

          {/* Quick Stats */}
          <QuickStatsBanner events={events} />

          {/* Conflict Warning */}
          {hasConflicts && (
            <View style={{ marginTop: 16, borderRadius: 16, borderWidth: 2, borderColor: "#fecaca", backgroundColor: "#fef2f2", padding: 14 }}>
              <View style={[styles.rowCenter, { gap: 8, marginBottom: 6 }]}>
                <Text style={{ fontSize: 18 }}>⚠️</Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#b91c1c" }}>
                  {todayConflicts.length} Scheduling Conflict{todayConflicts.length > 1 ? "s" : ""}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#dc2626" }}>
                You have overlapping events today. Check your schedule below.
              </Text>
            </View>
          )}

          {/* Focus Card */}
          {nextEvent ? (
            <View>
              <TodayFocusCard event={nextEvent} onPress={() => handleEventPress(nextEvent.id)} />
            </View>
          ) : null}

          {/* Week Timeline */}
          <WeekTimeline
            events={events}
            onEventPress={handleEventPress}
            onNavigateToCalendar={handleNavigateToCalendar}
          />

          {/* Nothing Hidden List */}
          <NothingHiddenView events={events} onEventPress={handleEventPress} />
        </ScrollView>

        {/* Bottom Tabs */}
        {showMockChrome && (
          <View style={styles.tabBar}>
          <Pressable style={styles.tabBtnActive}>
            <Text style={styles.tabIcon}>🏠</Text>
            <Text style={styles.tabLabelActive}>Home</Text>
          </Pressable>

          <Pressable style={styles.tabBtn} onPress={() => router.push("/calendar")}>
            <Text style={styles.tabIcon}>📅</Text>
            <Text style={styles.tabLabel}>Calendar</Text>
          </Pressable>

          <Pressable style={styles.tabBtn} onPress={() => router.push("/social")}>
            <View style={{ position: "relative" }}>
              <Text style={styles.tabIcon}>👥</Text>
              {pendingTotal > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingTotal}</Text>
                </View>
              )}
            </View>
            <Text style={styles.tabLabel}>Social</Text>
          </Pressable>
          </View>
        )}
      </View>

      {/* Modals */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateEvent}
      />

      <EventDetailModal
        event={selectedEvent}
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDelete={handleDeleteEvent}
      />

      <SocialInviteDetailModal
        invite={selectedInvite}
        isOpen={!!selectedInvite}
        onClose={() => setSelectedInvite(null)}
      />

      <NotificationDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        pendingSocialInvites={visibleSocialInvites}
        pendingCalendarEvents={visibleCalendarEvents}
        onDismiss={dismissInviteNotification}
        onClearAll={clearInviteNotifications}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  screenRootNative: {
    alignItems: "stretch",
    justifyContent: "flex-start",
    paddingVertical: 0,
  },

  // Frame like your web preview (844px)
  phoneFrame: {
    width: 390, // iPhone-ish
    height: 844,
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    borderColor: "#e2e8f0",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  phoneFrameNative: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },

  topBar: {
    backgroundColor: "#fff",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0f172a",
  },
  profileBtn: {
    transform: [{ scale: 1 }],
  },
  profileBtnText: {
    fontSize: 18,
  },

  contentScroll: {
    flex: 1,
    backgroundColor: "#fff",
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 28,
    gap: 16,
    backgroundColor: "#fff",
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  dateText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#475569",
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: "#22c55e",
  },
  uptodateText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#16a34a",
  },
  addBtn: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  addBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 14,
  },

  tabBar: {
    backgroundColor: "#fff",
    borderTopColor: "#e2e8f0",
    borderTopWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  tabBtnActive: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    transform: [{ scale: 1.05 }],
  },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabLabel: { fontSize: 12, fontWeight: "500", color: "#94a3b8" },
  tabLabelActive: { fontSize: 12, fontWeight: "500", color: "#0f172a" },

  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowCenter: { flexDirection: "row", alignItems: "center" },

  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  socialSection: { marginTop: 18 },
  socialHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  socialLinkBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: "#e2e8f0" },
  socialLinkText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  socialCard: { borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#fff", padding: 14 },
  socialSummary: { fontSize: 14, fontWeight: "700", color: "#0f172a" },
  socialPillRow: { marginTop: 10, flexDirection: "row", gap: 10, flexWrap: "wrap" },
  socialPill: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  socialPillText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  legendText: { fontSize: 12, fontWeight: "500", color: "#64748b" },
  legendDot: { fontSize: 12, color: "#94a3b8", marginHorizontal: 6 },
  scrollHint: { fontSize: 12, fontWeight: "700", color: "#94a3b8", marginLeft: 10 },

  weekScrollContent: {
    paddingHorizontal: 4,
    gap: 8,
    paddingBottom: 8,
  },
  dayCard: {
    width: 128,
    borderRadius: 16,
    borderWidth: 2,
    padding: 12,
  },
  dayCardToday: {
    borderColor: "#0f172a",
    backgroundColor: "#0f172a",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 5,
  },
  dayHeaderSmall: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    textTransform: "uppercase",
  },
  dayHeaderBig: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 2,
  },
  whiteText: { color: "#fff" },

  densityBox: {
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 8,
  },
  densityEmoji: { fontSize: 22, marginBottom: 2 },
  densityCount: { fontSize: 12, fontWeight: "800" },
  densityLabel: { fontSize: 12, fontWeight: "600" },

  previewTime: { fontSize: 12, fontWeight: "600", textAlign: "center" },
  moreText: { fontSize: 12, fontWeight: "800", textAlign: "center" },

  tapHintWrap: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    alignItems: "center",
  },
  tapHintText: { fontSize: 12, fontWeight: "600" },

  statsRow: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 12, fontWeight: "800" },

  focusCard: {
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#0f172a",
    padding: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 999 },
  focusLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    color: "rgba(255,255,255,0.70)",
  },
  focusPill: {
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  focusPillText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  focusTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: 4 },
  focusMeta: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.90)" },

  badgeGreenSolid: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeGreenSolidText: { color: "#fff", fontSize: 12, fontWeight: "800" },

  allClearBox: {
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    padding: 24,
    alignItems: "center",
    marginHorizontal: 8,
  },
  allClearEmoji: { fontSize: 44, marginBottom: 12 },
  allClearTitle: { fontSize: 18, fontWeight: "800", color: "#14532d", marginRight: 8 },
  badgeGreen: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeGreenText: { color: "#fff", fontSize: 12, fontWeight: "800" },
  allClearSubtitle: { marginTop: 6, fontSize: 14, fontWeight: "500", color: "#15803d", textAlign: "center" },

  groupHeader: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
  groupCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    overflow: "hidden",
    marginHorizontal: 8,
  },
  eventRow: {
    position: "relative",
    padding: 16,
    borderLeftWidth: 4,
  },
  iconMuted: { color: "#94a3b8", fontSize: 14, marginRight: 6 },
  timeText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  typeBadgeText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6 },
  eventTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginBottom: 8 },
  locationText: { fontSize: 14, color: "#475569" },
  chevWrap: { position: "absolute", right: 12, top: "50%" },
  chevText: { fontSize: 22, color: "#cbd5e1" },

  conflictBar: {
    backgroundColor: "#fee2e2",
    borderTopWidth: 1,
    borderTopColor: "#fecaca",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  conflictIcon: { color: "#dc2626", fontSize: 14 },
  conflictText: { fontSize: 12, fontWeight: "700", color: "#b91c1c" },

  badgeGreenLight: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  badgeGreenLightText: { color: "#15803d", fontSize: 12, fontWeight: "800" },
  smallMuted: { fontSize: 12, fontWeight: "600", color: "#64748b" },

  bigButton: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    paddingVertical: 12,
    alignItems: "center",
  },
  bigButtonText: { color: "#0f172a", fontWeight: "800" },

  allSetWrap: {
    marginHorizontal: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#bbf7d0",
    backgroundColor: "#f0fdf4",
    padding: 16,
    alignItems: "center",
  },
  allSetTitle: { fontSize: 18, fontWeight: "800", color: "#14532d" },
  allSetSubtitle: { fontSize: 13, fontWeight: "500", color: "#15803d", textAlign: "center" },
  allSetTiny: { fontSize: 12, fontWeight: "700", color: "#16a34a" },
  allSetDot: { fontSize: 12, color: "#86efac" },

  modalOverlayCenter: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.50)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 24,
    overflow: "hidden",
    maxHeight: "90%",
  },
  modalTopBar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTopTextMuted: { color: "#475569", fontWeight: "600" },
  modalTopTitle: { color: "#0f172a", fontWeight: "600" },
  modalTopTextBold: { color: "#0f172a", fontWeight: "800" },
  modalTopTextDisabled: { color: "#94a3b8" },

  inputLabel: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    color: "#64748b",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#fff",
  },
  inputError: { borderColor: "#fca5a5" },
  requiredStar: { color: "#ef4444", fontWeight: "800" },
  pickerField: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pickerValueText: { fontWeight: "700", color: "#0f172a" },
  pickerChevron: { fontSize: 12, color: "#94a3b8" },
  pickerWrap: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    minHeight: 180,
  },
  pickerModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 16,
  },
  pickerModalSheet: { backgroundColor: "#ffffff", borderRadius: 18, padding: 16 },
  pickerModalTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a", marginBottom: 8 },
  pickerModalFooter: { flexDirection: "row", gap: 12, marginTop: 12 },
  pickerModalBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  pickerModalBtnSecondary: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
  },
  pickerModalBtnTextPrimary: { color: "#fff", fontWeight: "800" },
  pickerModalBtnTextSecondary: { color: "#0f172a", fontWeight: "800" },
  typePick: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  typePickActive: {
    backgroundColor: "#0f172a",
  },
  typePickInactive: {
    backgroundColor: "#f1f5f9",
  },
  typePickText: {
    fontWeight: "700",
    fontSize: 14,
  },
  progressCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    padding: 14,
  },
  progressTitle: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", color: "#64748b" },
  progressText: { marginTop: 6, fontSize: 14, fontWeight: "700", color: "#0f172a" },
  progressTrack: {
    marginTop: 10,
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#2563eb" },
  progressHint: { marginTop: 6, fontSize: 12, fontWeight: "700", color: "#64748b" },
  timePickerCard: {
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  timePickerValue: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginBottom: 6 },
  pickerWheel: { height: 180 },
  helperText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },

  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.50)",
    justifyContent: "flex-end",
  },
  sheetCard: {
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    overflow: "hidden",
  },
  sheetCardOffset: {
    marginTop: 240,
  },

  detailTitle: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  detailDate: { marginTop: 4, color: "#64748b" },
  trashBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    alignItems: "center",
    justifyContent: "center",
  },
  detailCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 16,
    gap: 16,
  },
  detailLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", color: "#64748b" },
  detailValue: { marginTop: 4, fontSize: 16, fontWeight: "600", color: "#0f172a" },

  inviteHero: {
    borderRadius: 18,
    backgroundColor: "#0f172a",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  inviteHeroLabel: {
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#cbd5e1",
  },
  inviteHeroTitle: { marginTop: 8, fontSize: 22, fontWeight: "800", color: "#ffffff" },
  inviteHeroMeta: { marginTop: 6, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.8)" },
  inviteHeroChips: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 },
  inviteHeroChip: { borderRadius: 999, backgroundColor: "rgba(255,255,255,0.18)", paddingHorizontal: 10, paddingVertical: 4 },
  inviteHeroChipText: { color: "#ffffff", fontSize: 12, fontWeight: "700" },

  inviteStatsRow: {
    marginTop: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  inviteStatPill: {
    flex: 1,
    minWidth: 120,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  inviteStatCount: { fontSize: 16, fontWeight: "800" },
  inviteStatLabel: { fontSize: 12, fontWeight: "700" },
  invitePillGreen: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  invitePillYellow: { backgroundColor: "#fef9c3", borderColor: "#fde047" },
  invitePillRed: { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
  invitePillSlate: { backgroundColor: "#e2e8f0", borderColor: "#cbd5e1" },
  invitePillTextGreen: { color: "#15803d" },
  invitePillTextYellow: { color: "#a16207" },
  invitePillTextRed: { color: "#b91c1c" },
  invitePillTextSlate: { color: "#475569" },
  inviteSection: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    padding: 12,
  },
  inviteSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  inviteSectionTitle: { fontSize: 13, fontWeight: "800", color: "#0f172a" },
  inviteSectionBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  inviteSectionBadgeText: { fontSize: 12, fontWeight: "800" },
  inviteSectionEmpty: { fontSize: 12, fontWeight: "600", color: "#64748b" },
  invitePersonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  inviteAvatar: {
    height: 28,
    width: 28,
    borderRadius: 14,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  inviteAvatarText: { color: "#fff", fontWeight: "800" },
  invitePersonName: { fontSize: 14, fontWeight: "600", color: "#0f172a" },

  // Notification Bell Styles
  bellBtn: {
    position: "relative",
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bellIcon: {
    fontSize: 20,
  },
  bellImage: {
    width: 36,
    height: 36,
  },
  bellBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 999,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  bellBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },

  // Notification Drawer Styles
  drawerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-start",
  },
  drawerContainer: {
    width: "100%",
    maxHeight: "80%",
    marginTop: 60,
  },
  drawerContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f172a",
  },
  drawerBadge: {
    backgroundColor: "#ef4444",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
  },
  drawerBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  drawerClearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  drawerClearText: {
    fontSize: 13,
    color: "#64748b",
    fontWeight: "700",
  },
  drawerCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerCloseText: {
    fontSize: 18,
    color: "#64748b",
    fontWeight: "600",
  },
  drawerScroll: {
    maxHeight: 400,
  },
  drawerEmpty: {
    paddingVertical: 48,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  drawerEmptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  drawerEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  drawerEmptyText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
  },
  drawerList: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  drawerSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  drawerSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  drawerSectionBadge: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  drawerSectionBadgeText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "700",
  },
  drawerItemWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    paddingRight: 48,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  drawerItemDismiss: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -16 }],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#fee2e2",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerItemDismissText: {
    fontSize: 14,
    color: "#dc2626",
    fontWeight: "700",
  },
  drawerItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  drawerItemContent: {
    flex: 1,
  },
  drawerItemTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 2,
  },
  drawerItemSubtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 4,
  },
  drawerItemTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0891b2",
  },
  drawerItemChevron: {
    marginLeft: 8,
  },
  drawerFooter: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  drawerFooterBtn: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  drawerFooterBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },

  // Tab Badge Styles
  tabBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    backgroundColor: "#ef4444",
    borderRadius: 999,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: "#fff",
  },
  tabBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
  },
});

