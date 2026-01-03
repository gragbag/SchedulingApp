import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
	Alert,
	Animated,
	Easing,
	Modal,
	PanResponder,
	Platform,
	Pressable,
	ScrollView,
	StyleProp,
	StyleSheet,
	Text,
	View,
	ViewStyle,
} from "react-native";
import {
	Attendee,
	CalendarEvent,
	Group,
	Invite,
	ReminderSettings,
	ReminderTime,
	RSVPStatus,
	RSVPValue,
	GROUPS,
} from "../../lib/social";
import { useAppStore } from "../../lib/store";

/**
 * NOTE:
 * - This is a React Native TSX 1:1 rewrite of the original JSX UI/UX patterns.
 * - Tailwind classes were translated into StyleSheet styles.
 * - Web-only behaviors like hover were translated to press feedback.
 * - Fixed/sticky overlays were implemented with Modal + sticky header View.
 * - Swipe gestures implemented with PanResponder + Animated.
 */

/* ----------------------------- Mock Data ----------------------------- */

/* ----------------------------- Helpers ----------------------------- */

function formatDateLong(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function formatTime(date: string | Date) {
  return new Date(date).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ----------------------------- Attendees ----------------------------- */

type CompactAttendeeListProps = {
  title: string;
  icon: string;
  color: "green" | "yellow" | "red" | "gray";
  attendees: Attendee[];
  expanded: boolean;
  onToggle: () => void;
  initialShow?: number;
};

function CompactAttendeeList({
  title,
  icon,
  color,
  attendees,
  expanded,
  onToggle,
  initialShow = 4,
}: CompactAttendeeListProps) {
  if (attendees.length === 0) return null;

  const sortedAttendees = [...attendees].sort((a, b) => {
    if (a.isFriend && !b.isFriend) return -1;
    if (!a.isFriend && b.isFriend) return 1;
    return a.name.localeCompare(b.name);
  });

  const displayedAttendees = expanded ? sortedAttendees : sortedAttendees.slice(0, initialShow);
  const hasMore = sortedAttendees.length > initialShow;

  const colorStyles = {
    green: {
      bg: styles.bgGreen50,
      border: styles.borderGreen200,
      text: styles.textGreen700,
      iconBg: styles.bgGreen500,
    },
    yellow: {
      bg: styles.bgYellow50,
      border: styles.borderYellow200,
      text: styles.textYellow700,
      iconBg: styles.bgYellow500,
    },
    red: {
      bg: styles.bgRed50,
      border: styles.borderRed200,
      text: styles.textRed700,
      iconBg: styles.bgRed500,
    },
    gray: {
      bg: styles.bgSlate50,
      border: styles.borderSlate200,
      text: styles.textSlate600,
      iconBg: styles.bgSlate400,
    },
  }[color];

  return (
    <View>
      <Pressable
        onPress={onToggle}
        style={[styles.compactHeaderBtn, colorStyles.bg, colorStyles.border]}
      >
        <View style={styles.rowGap2}>
          <View style={[styles.iconCircleSm, colorStyles.iconBg]}>
            <Text style={styles.iconCircleSmText}>{icon}</Text>
          </View>
          <Text style={[styles.fontBold, colorStyles.text]}>{title}</Text>
          <Text style={[styles.textXs, styles.fontBold, colorStyles.text, styles.opacity70]}>
            ({sortedAttendees.length})
          </Text>
        </View>
        <Text style={[styles.textSm, colorStyles.text]}>{expanded ? "▲" : "▼"}</Text>
      </Pressable>

      {expanded && (
        <View style={styles.spaceY8}>
          {displayedAttendees.map((attendee, idx) => (
            <View key={`${attendee.name}-${idx}`} style={styles.attendeeRow}>
              <View style={[styles.avatarSm, colorStyles.iconBg]}>
                <Text style={styles.avatarSmText}>{attendee.name.charAt(0)}</Text>
              </View>
              <View style={styles.flex1Min0}>
                <Text numberOfLines={1} style={[styles.fontSemibold, styles.textSlate900]}>
                  {attendee.name}
                </Text>
                {attendee.isFriend && (
                  <View style={styles.friendPill}>
                    <Text style={styles.friendPillText}>Friend</Text>
                  </View>
                )}
              </View>
            </View>
          ))}

          {/* Keep parity with original logic (hasMore + !expanded condition existed but never true inside expanded block) */}
          {hasMore && !expanded && (
            <Pressable onPress={onToggle} style={styles.moreBtnGhost}>
              <Text style={[styles.textSm, styles.fontBold, colorStyles.text]}>
                + {sortedAttendees.length - initialShow} more
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

/* ----------------------------- Cards ----------------------------- */

type InviteCardProps = {
  invite: Invite;
  onRSVP: (id: string, status: RSVPValue) => void;
  showGroup?: boolean;
  onClick?: (() => void) | null;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onGroupClick?: () => void;
  readOnly?: boolean;
};

function InviteCard({
  invite,
  onRSVP,
  showGroup = false,
  onClick,
  batchMode = false,
  isSelected = false,
  onToggleSelect,
  onGroupClick,
  readOnly = false,
}: InviteCardProps) {
  const start = new Date(invite.startAt);
  const going = invite.attendees.filter((a) => a.status === "yes").length;
  const maybe = invite.attendees.filter((a) => a.status === "maybe").length;
  const pending = invite.attendees.filter((a) => a.status === null).length;

  const handleCardPress = () => {
    if (readOnly) {
      onClick?.();
      return;
    }
    if (batchMode && !invite.rsvpStatus) {
      onToggleSelect?.();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <Pressable
      onPress={handleCardPress}
      style={[
        styles.cardBase,
        isSelected ? styles.cardSelectedBlue : styles.cardDefault,
      ]}
    >
      <View style={(!batchMode || invite.rsvpStatus) ? styles.opacityTap : undefined}>
        <View style={styles.rowBetweenStart}>
          <View style={[styles.rowGap12, styles.flex1, { paddingRight: 12 }]}>
            {batchMode && !invite.rsvpStatus && (
              <View
                style={[
                  styles.checkboxBox,
                  isSelected ? styles.checkboxSelectedBlue : styles.checkboxUnselected,
                ]}
              >
                {isSelected && <Text style={styles.checkboxCheckText}>✓</Text>}
              </View>
            )}

            <View style={styles.flex1}>
              <Text style={styles.cardTitle}>{invite.title}</Text>

              {showGroup && invite.group && onGroupClick && (
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    onGroupClick();
                  }}
                  style={styles.mt4}
                >
                  <Text style={styles.groupLink}>📚 {invite.group}</Text>
                </Pressable>
              )}

              {showGroup && invite.group && !onGroupClick && (
                <Text style={[styles.mt4, styles.groupText]}>📚 {invite.group}</Text>
              )}

              <Text style={[styles.mt4, styles.textSlate600]}>
                Organized by {invite.organizer}
              </Text>
            </View>
          </View>

          {invite.rsvpStatus && (
            <View
              style={[
                styles.rsvpPill,
                invite.rsvpStatus === "yes"
                  ? styles.bgGreen100
                  : invite.rsvpStatus === "maybe"
                  ? styles.bgYellow100
                  : styles.bgRed100,
              ]}
            >
              <Text
                style={[
                  styles.rsvpPillText,
                  invite.rsvpStatus === "yes"
                    ? styles.textGreen700
                    : invite.rsvpStatus === "maybe"
                    ? styles.textYellow700
                    : styles.textRed700,
                ]}
              >
                {invite.rsvpStatus === "yes"
                  ? "Going"
                  : invite.rsvpStatus === "maybe"
                  ? "Maybe"
                  : "Can't go"}
              </Text>
            </View>
          )}
        </View>

        <View style={[styles.mt12, styles.stackGap12]}>
          <Text style={styles.textSlate600}>📍 {invite.location}</Text>
        </View>
        <View style={[styles.mt4, styles.rowGap8]}>
            <Text style={styles.textSlate600}>
              🕒 {formatDateLong(start)} at {formatTime(start)}
            </Text>
        </View>

        <View style={[styles.mt12, styles.rowGap12]}>
          <Text style={[styles.fontSemibold, styles.textGreen700]}>✓ {going} going</Text>
          {maybe > 0 && (
            <Text style={[styles.fontSemibold, styles.textYellow700]}>? {maybe} maybe</Text>
          )}
          {pending > 0 && (
            <Text style={[styles.fontSemibold, styles.textSlate500]}>• {pending} pending</Text>
          )}
        </View>
      </View>

      {!readOnly && (!invite.rsvpStatus ? (
        <View style={[styles.mt16, styles.rowGap8]}>
          <Pressable
            onPress={() => onRSVP(invite.id, "yes")}
            style={[styles.actionBtn, styles.bgGreen600]}
          >
            <Text style={styles.actionBtnText}>✓ Going</Text>
          </Pressable>
          <Pressable
            onPress={() => onRSVP(invite.id, "maybe")}
            style={[styles.actionBtn, styles.bgYellow500]}
          >
            <Text style={styles.actionBtnText}>? Maybe</Text>
          </Pressable>
          <Pressable
            onPress={() => onRSVP(invite.id, "no")}
            style={[styles.actionBtn, styles.bgSlate300]}
          >
            <Text style={[styles.actionBtnText, styles.textSlate700]}>✗ Can't</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={() => onRSVP(invite.id, null)}
          style={[styles.mt16, styles.secondaryBtn]}
        >
          <Text style={styles.secondaryBtnText}>Change RSVP</Text>
        </Pressable>
      ))}
    </Pressable>
  );
}

type CalendarEventCardProps = {
  event: CalendarEvent;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onEditReminder: (event: CalendarEvent) => void;
  onRemove: (id: string) => void;
  showGroup?: boolean;
  isArchived?: boolean;
  onRestore?: (id: string) => void;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  onGroupClick?: () => void;
  readOnly?: boolean;
};

function CalendarEventCard({
  event,
  onAccept,
  onDecline,
  onEditReminder,
  onRemove,
  showGroup = false,
  isArchived = false,
  onRestore,
  batchMode = false,
  isSelected = false,
  onToggleSelect,
  onGroupClick,
  readOnly = false,
}: CalendarEventCardProps) {
  const start = new Date(event.startAt);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const noteText = event.notes?.trim() || "";
  const isLongNote = noteText.length > 140;

  const handleCardPress = () => {
    if (readOnly) return;
    if (batchMode && !event.acceptStatus) {
      onToggleSelect?.();
    }
  };

  const containerStyle: StyleProp<ViewStyle> = [
    styles.cardBase,
    styles.cardCalendar,
    isArchived
      ? styles.cardArchived
      : isSelected
      ? styles.cardSelectedPurple
      : batchMode && !event.acceptStatus
      ? styles.cardBatchSelectable
      : styles.cardCalendarDefault,
  ];

  return (
    <Pressable onPress={handleCardPress} style={containerStyle}>
      <View style={[styles.rowBetweenStart, styles.mb8]}>
        <View style={[styles.rowGap8, { alignItems: "center" }]}>
          {batchMode && !event.acceptStatus && (
            <View
              style={[
                styles.checkboxBox,
                isSelected ? styles.checkboxSelectedPurple : styles.checkboxUnselected,
              ]}
            >
              {isSelected && <Text style={styles.checkboxCheckText}>✓</Text>}
            </View>
          )}

          <Text style={styles.text2xl}>📅</Text>

          <View>
            <Text style={styles.cardTitle}>{event.title}</Text>

            {showGroup && event.group && onGroupClick && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onGroupClick();
                }}
                style={styles.mt2}
              >
                <Text style={styles.groupLink}>📚 {event.group}</Text>
              </Pressable>
            )}

            {showGroup && event.group && !onGroupClick && (
              <Text style={[styles.mt2, styles.groupText]}>📚 {event.group}</Text>
            )}
          </View>
        </View>

        {event.acceptStatus === "accepted" && (
          <View style={[styles.statusPill, styles.statusPillGreen]}>
            <Text style={[styles.statusPillText, styles.textGreen700]}>✓ On Calendar</Text>
          </View>
        )}

        {event.acceptStatus === "declined" &&
          (readOnly ? (
            <View style={[styles.statusPill, styles.statusPillSlate]}>
              <Text style={[styles.statusPillText, styles.textSlate600]}>Declined</Text>
            </View>
          ) : (
            <Pressable onPress={() => onAccept(event.id)} style={[styles.statusPill, styles.statusPillSlate]}>
              <Text style={[styles.statusPillText, styles.textSlate600]}>Declined</Text>
            </Pressable>
          ))}
      </View>

      <Text style={[styles.textSm, styles.textSlate600, styles.mb12]}>
        Created by {event.creator} • Sent to {event.totalSentTo}{" "}
        {event.totalSentTo === 1 ? "person" : "people"}
      </Text>

      <View style={styles.spaceY6}>
        <Text style={[styles.textSm, styles.textSlate700]}>📍 {event.location}</Text>
          <Text style={[styles.textSm, styles.textSlate700]}>
            🕒 {formatDateLong(start)} at {formatTime(start)}
          </Text>

        {!!noteText && (
          <View>
            <View style={styles.notesBox}>
              <Text
                style={[styles.textSm, styles.textSlate700]}
                numberOfLines={notesExpanded ? undefined : 3}
                ellipsizeMode="tail"
              >
                {noteText}
              </Text>
            </View>
            {isLongNote && (
              <Pressable
                onPress={() => setNotesExpanded((prev) => !prev)}
                style={styles.notesToggle}
              >
                <Text style={styles.notesToggleText}>
                  {notesExpanded ? "Show less ^" : "Show more v"}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      </View>

      {!readOnly && (isArchived ? (
        <Pressable
          onPress={() => onRestore?.(event.id)}
          style={[styles.mt12, styles.primaryBtnBlue]}
        >
          <Text style={styles.primaryBtnBlueText}>↺ Restore from Archive</Text>
        </Pressable>
      ) : !event.acceptStatus ? (
        <View style={[styles.mt12, styles.stackGap12]}>
          <Pressable onPress={() => onAccept(event.id)} style={styles.primaryBtnBlue}>
            <Text style={styles.primaryBtnBlueText}>✓ Accept & Add to Calendar</Text>
          </Pressable>
          <Pressable onPress={() => onDecline(event.id)} style={styles.secondaryBtnStrong}>
            <Text style={styles.secondaryBtnStrongText}>✗ Decline</Text>
          </Pressable>
        </View>
      ) : event.acceptStatus === "accepted" ? (
        <View style={styles.mt12}>
          {!!event.reminderSettings && (
            <View style={styles.reminderBox}>
                <Text style={[styles.textXs, styles.fontBold, styles.textSlate600]}>
                  🔔 Reminders:{" "}
                {event.reminderSettings.times.length === 0
                  ? "None"
                  : event.reminderSettings.times
                      .map((t) => {
                        const labels: Record<string, string> = {
                          "1week": "1 week before",
                          "1day": "1 day before",
                          "1hour": "1 hour before",
                          "30min": "30 min before",
                        };
                        return labels[t] || t;
                      })
                      .join(", ")}
              </Text>
            </View>
          )}

          <View style={styles.rowGap8}>
            <Pressable onPress={() => onEditReminder(event)} style={styles.editBtn}>
              <Text style={styles.editBtnText}>🔔 Edit Reminders</Text>
            </Pressable>
            <Pressable onPress={() => onRemove(event.id)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>🗑️ Remove</Text>
            </Pressable>
          </View>
        </View>
      ) : event.acceptStatus === "declined" ? (
        <View style={styles.mt12}>
          <Pressable onPress={() => onAccept(event.id)} style={styles.primaryBtnBlue}>
            <Text style={styles.primaryBtnBlueText}>Add to Calendar</Text>
          </Pressable>
        </View>
      ) : null)}
    </Pressable>
  );
}

/* ----------------------------- Swipeable Wrapper ----------------------------- */

type SwipeableInviteCardProps = {
  invite: Invite;
  onRSVP: (id: string, status: RSVPValue) => void;
  showGroup: boolean;
  onClick?: () => void;
  batchMode: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onGroupClick?: () => void;
  readOnly?: boolean;
};

function SwipeableInviteCard({
  invite,
  onRSVP,
  showGroup,
  onClick,
  batchMode,
  isSelected,
  onToggleSelect,
  onGroupClick,
  readOnly = false,
}: SwipeableInviteCardProps) {
  const minSwipeDistance = 50;
  const translateX = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => {
          if (readOnly || batchMode || invite.rsvpStatus) return false;
          return Math.abs(gesture.dx) > 5 && Math.abs(gesture.dy) < 15;
        },
        onPanResponderMove: (_, gesture) => {
          if (readOnly || batchMode || invite.rsvpStatus) return;
          if (isAnimatingRef.current) return;
          const offset = clamp(gesture.dx, -150, 150);
          translateX.setValue(offset);
        },
        onPanResponderRelease: (_, gesture) => {
          if (readOnly || batchMode || invite.rsvpStatus) return;

          const dx = gesture.dx;
          const isRightSwipe = dx > minSwipeDistance;
          const isLeftSwipe = dx < -minSwipeDistance;

          if (isRightSwipe) {
            isAnimatingRef.current = true;
            Animated.timing(translateX, {
              toValue: 300,
              duration: 300,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start(() => {
              onRSVP(invite.id, "yes");
              translateX.setValue(0);
              isAnimatingRef.current = false;
            });
          } else if (isLeftSwipe) {
            isAnimatingRef.current = true;
            Animated.timing(translateX, {
              toValue: -300,
              duration: 300,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start(() => {
              onRSVP(invite.id, "no");
              translateX.setValue(0);
              isAnimatingRef.current = false;
            });
          } else {
            Animated.timing(translateX, {
              toValue: 0,
              duration: 200,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }).start(() => {
              if (onClick && Math.abs(dx) < 10) onClick();
            });
          }
        },
      }),
    [batchMode, invite.id, invite.rsvpStatus, onClick, onRSVP, translateX, readOnly]
  );

  const goingHintOpacity = translateX.interpolate({
    inputRange: [20, 60],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const cantGoHintOpacity = translateX.interpolate({
    inputRange: [-60, -20],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.swipeWrap}>
      {!readOnly && !batchMode && !invite.rsvpStatus && (
        <>
          <Animated.View style={[styles.swipeHintLeft, { opacity: goingHintOpacity }]}>
            <View style={styles.rowGap8}>
              <Text style={[styles.text2xl, styles.textGreen600]}>✓</Text>
              <Text style={[styles.fontBold, styles.textSm, styles.textGreen600]}>Going</Text>
            </View>
          </Animated.View>

          <Animated.View style={[styles.swipeHintRight, { opacity: cantGoHintOpacity }]}>
            <View style={styles.rowGap8}>
              <Text style={[styles.fontBold, styles.textSm, styles.textRed600]}>Can't Go</Text>
              <Text style={[styles.text2xl, styles.textRed600]}>✗</Text>
            </View>
          </Animated.View>
        </>
      )}

      <Animated.View
        {...panResponder.panHandlers}
        style={{ transform: [{ translateX }] }}
      >
        <InviteCard
          invite={invite}
          onRSVP={onRSVP}
          showGroup={showGroup}
          onClick={onClick ?? null}
          batchMode={batchMode}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          onGroupClick={onGroupClick}
          readOnly={readOnly}
        />
      </Animated.View>
    </View>
  );
}

/* ----------------------------- Toast ----------------------------- */

type ToastState = { text: string; status: RSVPStatus } | null;

function RSVPToast({
  toast,
  onViewAnswered,
  onDismiss,
}: {
  toast: ToastState;
  onViewAnswered: () => void;
  onDismiss: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!toast) return;

    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => {
      anim.stopAnimation();
    };
  }, [toast, anim]);

  if (!toast) return null;

  const bg =
    toast.status === "yes"
      ? styles.bgGreen600
      : toast.status === "maybe"
      ? styles.bgYellow600
      : styles.bgSlate600;

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 0],
  });

  return (
    <View pointerEvents="box-none" style={styles.toastOverlay}>
      <Animated.View style={[{ transform: [{ translateY }], opacity: anim }, styles.toastWrap]}>
        <View style={[styles.toastPill, bg]}>
          <Text style={styles.toastText}>{toast.text}</Text>
          <Pressable onPress={onViewAnswered} style={styles.toastLinkBtn}>
            <Text style={styles.toastLinkText}>View in Edit</Text>
          </Pressable>
          <Pressable onPress={onDismiss} style={styles.toastCloseBtn}>
            <Text style={styles.toastCloseText}>×</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

/* ----------------------------- Reminder Selector ----------------------------- */

function ReminderSelector({
  eventTitle,
  onSave,
  onCancel,
  existingReminders = null,
}: {
  eventTitle: string;
  onSave: (reminderSettings: ReminderSettings) => void;
  onCancel: () => void;
  existingReminders?: ReminderSettings | null;
}) {
  const [selectedReminders, setSelectedReminders] = useState<ReminderTime[]>(
    existingReminders?.times || []
  );

  const reminderOptions: { value: ReminderTime; label: string; icon: string }[] = [
    { value: "1week", label: "1 week before", icon: "🔔" },
    { value: "1day", label: "1 day before", icon: "🔔" },
    { value: "1hour", label: "1 hour before", icon: "🔔" },
    { value: "30min", label: "30 minutes before", icon: "🔔" },
  ];

  const toggleReminder = (value: ReminderTime) => {
    setSelectedReminders((prev) =>
      prev.includes(value) ? prev.filter((r) => r !== value) : [...prev, value]
    );
  };

  return (
    <View style={styles.p24}>
      <View style={styles.eventTitleBox}>
        <Text style={styles.eventTitleBoxText}>{eventTitle}</Text>
      </View>

      <View style={[styles.spaceY8, styles.mb16]}>
        <Pressable
          onPress={() => setSelectedReminders([])}
          style={[
            styles.reminderOptionBtn,
            selectedReminders.length === 0 ? styles.reminderNoneSelected : styles.reminderNoneUnselected,
          ]}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowGap8}>
              <Text style={[styles.reminderIcon, selectedReminders.length === 0 && styles.textWhite]}>
                ⏰
              </Text>
              <Text
                style={[
                  styles.reminderOptionText,
                  selectedReminders.length === 0 && styles.textWhite,
                ]}
              >
                No reminders
              </Text>
            </View>
            {selectedReminders.length === 0 && (
              <Text style={[styles.reminderCheck, styles.textWhite]}>✓</Text>
            )}
          </View>
        </Pressable>

        {reminderOptions.map((option) => {
          const selected = selectedReminders.includes(option.value);
          return (
            <Pressable
              key={option.value}
              onPress={() => toggleReminder(option.value)}
              style={[
                styles.reminderOptionBtn,
                selected ? styles.reminderSelected : styles.reminderUnselected,
              ]}
            >
              <View style={styles.rowBetween}>
                <View style={styles.rowGap8}>
                  <Text style={styles.reminderIcon}>{option.icon}</Text>
                  <Text style={styles.reminderOptionText}>{option.label}</Text>
                </View>
                {selected && <Text style={[styles.reminderCheck, styles.textBlue700]}>✓</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>

      <Text style={[styles.textXs, styles.textSlate500, styles.mb16]}>
        {selectedReminders.length === 0
          ? "No reminders will be sent"
          : `You'll receive ${selectedReminders.length} reminder${
              selectedReminders.length > 1 ? "s" : ""
            }`}
      </Text>

      <View style={styles.reminderFooterRow}>
        <Pressable
          onPress={() => onSave({ times: selectedReminders })}
          style={[styles.primaryBtnBlue, styles.reminderFooterBtn]}
        >
          <Text style={styles.primaryBtnBlueText}>Add to Calendar</Text>
        </Pressable>

        <Pressable onPress={onCancel} style={[styles.secondaryBtnStrong, styles.reminderFooterBtn]}>
          <Text style={styles.secondaryBtnStrongText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ----------------------------- Group Details Modal ----------------------------- */

function GroupDetailsModal({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const admins = group.members.filter((m) => m.role === "admin");
  const members = group.members.filter((m) => m.role !== "admin");

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalBackdrop}>
        <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheetWide}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Group Details</Text>
            <Text style={styles.modalSubtitle}>{group.name}</Text>
          </View>

          <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyPad}>
            <View style={styles.infoCard}>
              <Text style={styles.infoCardTitle}>📚 {group.name}</Text>
              <Text style={styles.infoCardSub}>{group.totalMembers} total members</Text>
            </View>

            <Text style={styles.sectionLabel}>ADMINS</Text>
            <View style={styles.spaceY8}>
              {admins.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <Text style={styles.memberAvatar}>{m.name.charAt(0)}</Text>
                  <View style={styles.flex1}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>admin</Text>
                  </View>
                </View>
              ))}
            </View>

            <Text style={[styles.sectionLabel, styles.mt16]}>MEMBERS</Text>
            <View style={styles.spaceY8}>
              {members.map((m) => (
                <View key={m.id} style={styles.memberRow}>
                  <Text style={styles.memberAvatar}>{m.name.charAt(0)}</Text>
                  <View style={styles.flex1}>
                    <Text style={styles.memberName}>{m.name}</Text>
                    <Text style={styles.memberRole}>member</Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Pressable onPress={onClose} style={styles.primaryBtnBlue}>
              <Text style={styles.primaryBtnBlueText}>Close</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ----------------------------- Main Screen ----------------------------- */

export function SocialScreen({ modeOverride }: { modeOverride?: "history" | "answered" | "sent" } = {}) {
  const isHistory = modeOverride === "history";
  const isAnsweredRoute = modeOverride === "answered";
  const isSentRoute = modeOverride === "sent";
  const [activeTab, setActiveTab] = useState<"groups" | "friends">("groups");
  const showArchive = isAnsweredRoute;
  const [filterType, setFilterType] = useState<"all" | "social" | "calendar">("all");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedInviteIds, setSelectedInviteIds] = useState<string[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);
  const groupInvites = useAppStore((s) => s.groupInvites);
  const friendInvites = useAppStore((s) => s.friendInvites);
  const groupCalendarEvents = useAppStore((s) => s.groupCalendarEvents);
  const friendCalendarEvents = useAppStore((s) => s.friendCalendarEvents);
  const updateInviteRSVP = useAppStore((s) => s.updateInviteRSVP);
  const updateCalendarEvent = useAppStore((s) => s.updateCalendarEvent);
  const lastCreated = useAppStore((s) => s.lastCreated);
  const clearLastCreated = useAppStore((s) => s.clearLastCreated);
  const [selectedInvite, setSelectedInvite] = useState<Invite | null>(null);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<(CalendarEvent & { isGroup: boolean }) | null>(null);
  const [isEditingReminder, setIsEditingReminder] = useState(false);

  const [expandedSections, setExpandedSections] = useState({
    going: false,
    maybe: false,
    no: false,
    pending: false,
  });

  const [showGroupDetailsModal, setShowGroupDetailsModal] = useState(false);
  const [groupToView, setGroupToView] = useState<Group | null>(null);
  const [rsvpToast, setRsvpToast] = useState<ToastState>(null);
  const [rsvpChangeTarget, setRsvpChangeTarget] = useState<{ id: string; isGroup: boolean } | null>(
    null
  );

  useEffect(() => {
    if (isHistory || isAnsweredRoute || isSentRoute || !lastCreated) return;
    setFilterType(lastCreated.eventType === "social" ? "social" : "calendar");
    setActiveTab(lastCreated.sendTo === "group" ? "groups" : "friends");
    router.push("/history/social-sent");
    clearLastCreated();
  }, [isHistory, isAnsweredRoute, isSentRoute, lastCreated, clearLastCreated]);

  const handleGroupRSVP = (id: string, status: RSVPValue) => {
    if (!status) {
      setRsvpToast(null);
      setRsvpChangeTarget({ id, isGroup: true });
      return;
    }

    updateInviteRSVP(id, status, true);

    const statusText = status === "yes" ? "Going" : status === "maybe" ? "Maybe" : "Can't Go";
    const emoji = status === "yes" ? "✓" : status === "maybe" ? "?" : "✗";
    setRsvpToast({ text: `${emoji} Marked as ${statusText}`, status });
    setTimeout(() => setRsvpToast(null), 3000);
  };

  const handleFriendRSVP = (id: string, status: RSVPValue) => {
    if (!status) {
      setRsvpToast(null);
      setRsvpChangeTarget({ id, isGroup: false });
      return;
    }

    updateInviteRSVP(id, status, false);

    const statusText = status === "yes" ? "Going" : status === "maybe" ? "Maybe" : "Can't Go";
    const emoji = status === "yes" ? "✓" : status === "maybe" ? "?" : "✗";
    setRsvpToast({ text: `${emoji} Marked as ${statusText}`, status });
    setTimeout(() => setRsvpToast(null), 3000);
  };

  const toggleBatchMode = () => {
    setBatchMode((v) => !v);
    setSelectedInviteIds([]);
    setSelectedCalendarIds([]);
  };

  const toggleInviteSelection = (inviteId: string) => {
    setSelectedInviteIds((prev) =>
      prev.includes(inviteId) ? prev.filter((id) => id !== inviteId) : [...prev, inviteId]
    );
  };

  const toggleCalendarSelection = (eventId: string) => {
    setSelectedCalendarIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const handleBatchRSVP = (status: RSVPStatus) => {
    const isGroup = activeTab === "groups";

    selectedInviteIds.forEach((inviteId) => {
      if (isGroup) handleGroupRSVP(inviteId, status);
      else handleFriendRSVP(inviteId, status);
    });

    setBatchMode(false);
    const count = selectedInviteIds.length;
    setSelectedInviteIds([]);

    const statusText = status === "yes" ? "Going" : status === "maybe" ? "Maybe" : "Can't Go";
    Alert.alert("✅ Updated", `Set ${count} invite${count > 1 ? "s" : ""} to "${statusText}"`);
  };

  const handleBatchAcceptCalendar = () => {
    const isGroup = activeTab === "groups";
    selectedCalendarIds.forEach((eventId) => handleAcceptCalendarEvent(eventId, isGroup));
    setBatchMode(false);
    setSelectedCalendarIds([]);
  };

  const handleAcceptCalendarEvent = (eventId: string, isGroup: boolean) => {
    const event = isGroup
      ? groupCalendarEvents.find((e) => e.id === eventId)
      : friendCalendarEvents.find((e) => e.id === eventId);

    if (!event) return;

    setSelectedCalendarEvent({ ...event, isGroup });
    setIsEditingReminder(false);
    setShowReminderModal(true);
  };

  const handleEditReminder = (event: CalendarEvent, isGroup: boolean) => {
    setSelectedCalendarEvent({ ...event, isGroup });
    setIsEditingReminder(true);
    setShowReminderModal(true);
  };

  const handleRemoveFromCalendar = (eventId: string, isGroup: boolean) => {
    updateCalendarEvent(eventId, isGroup, { acceptStatus: "declined", reminderSettings: null });
    Alert.alert("Declined", "Event marked as declined.");
  };

  const handleDeclineCalendarEvent = (eventId: string, isGroup: boolean) => {
    updateCalendarEvent(eventId, isGroup, { acceptStatus: "declined" });
    Alert.alert("Declined", "Event marked as declined.");
  };

  const handleRestoreFromArchive = (eventId: string, isGroup: boolean) => {
    updateCalendarEvent(eventId, isGroup, { acceptStatus: null });
    Alert.alert("Restored", "Event restored! You can now accept or decline it.");
  };

  const handleSaveReminder = (reminderSettings: ReminderSettings) => {
    const selected = selectedCalendarEvent;
    if (!selected) return;

    const { isGroup, id } = selected;

    updateCalendarEvent(id, isGroup, { acceptStatus: "accepted", reminderSettings });

    setShowReminderModal(false);
    setSelectedCalendarEvent(null);
    Alert.alert("✅ Added", "Event added to your calendar!");
  };

  const pendingGroupInvites = groupInvites.filter((inv) => !inv.rsvpStatus);
  const pendingFriendInvites = friendInvites.filter((inv) => !inv.rsvpStatus);
  const pendingGroupCalendar = groupCalendarEvents.filter((evt) => !evt.acceptStatus);
  const pendingFriendCalendar = friendCalendarEvents.filter((evt) => !evt.acceptStatus);

  const answeredGroupInvites = groupInvites.filter((inv) => !!inv.rsvpStatus);
  const answeredFriendInvites = friendInvites.filter((inv) => !!inv.rsvpStatus);
  const answeredGroupCalendar = groupCalendarEvents.filter((evt) => !!evt.acceptStatus);
  const answeredFriendCalendar = friendCalendarEvents.filter((evt) => !!evt.acceptStatus);

  const sentGroupInvites = groupInvites.filter((inv) => inv.organizer === "You");
  const sentFriendInvites = friendInvites.filter((inv) => inv.organizer === "You");
  const sentGroupCalendar = groupCalendarEvents.filter((evt) => evt.creator === "You");
  const sentFriendCalendar = friendCalendarEvents.filter((evt) => evt.creator === "You");
  const sentInvites = [...sentGroupInvites, ...sentFriendInvites];

  const now = new Date();
  const isExpired = (iso: string) => new Date(iso).getTime() < now.getTime();

  const expiredGroupInvites = groupInvites.filter((inv) => isExpired(inv.endAt));
  const expiredFriendInvites = friendInvites.filter((inv) => isExpired(inv.endAt));
  const expiredGroupCalendar = groupCalendarEvents.filter((evt) => isExpired(evt.endAt));
  const expiredFriendCalendar = friendCalendarEvents.filter((evt) => isExpired(evt.endAt));

  const groupSocialCount = isHistory
    ? expiredGroupInvites.length
    : isSentRoute
    ? sentGroupInvites.length
    : showArchive
    ? answeredGroupInvites.length
    : pendingGroupInvites.length;
  const groupCalendarCount = isHistory
    ? expiredGroupCalendar.length
    : isSentRoute
    ? sentGroupCalendar.length
    : showArchive
    ? answeredGroupCalendar.length
    : pendingGroupCalendar.length;
  const friendSocialCount = isHistory
    ? expiredFriendInvites.length
    : isSentRoute
    ? sentFriendInvites.length
    : showArchive
    ? answeredFriendInvites.length
    : pendingFriendInvites.length;
  const friendCalendarCount = isHistory
    ? expiredFriendCalendar.length
    : isSentRoute
    ? sentFriendCalendar.length
    : showArchive
    ? answeredFriendCalendar.length
    : pendingFriendCalendar.length;

  const activeSocialCount = activeTab === "groups" ? groupSocialCount : friendSocialCount;
  const activeCalendarCount = activeTab === "groups" ? groupCalendarCount : friendCalendarCount;
  const activeTotalCount = activeSocialCount + activeCalendarCount;
  const groupTabCount = groupSocialCount + groupCalendarCount;
  const friendTabCount = friendSocialCount + friendCalendarCount;

  const groupInvitesToShow = isHistory
    ? expiredGroupInvites
    : isSentRoute
    ? sentGroupInvites
    : showArchive
    ? answeredGroupInvites
    : pendingGroupInvites;
  const friendInvitesToShow = isHistory
    ? expiredFriendInvites
    : isSentRoute
    ? sentFriendInvites
    : showArchive
    ? answeredFriendInvites
    : pendingFriendInvites;
  const groupCalendarToShow = isHistory
    ? expiredGroupCalendar
    : isSentRoute
    ? sentGroupCalendar
    : showArchive
    ? answeredGroupCalendar
    : pendingGroupCalendar;
  const friendCalendarToShow = isHistory
    ? expiredFriendCalendar
    : isSentRoute
    ? sentFriendCalendar
    : showArchive
    ? answeredFriendCalendar
    : pendingFriendCalendar;

  const pendingTotal =
    activeTab === "groups"
      ? pendingGroupInvites.length + pendingGroupCalendar.length
      : pendingFriendInvites.length + pendingFriendCalendar.length;
  const pendingSocialCount =
    activeTab === "groups" ? pendingGroupInvites.length : pendingFriendInvites.length;
  const pendingCalendarCount =
    activeTab === "groups" ? pendingGroupCalendar.length : pendingFriendCalendar.length;

  const canSelectBatch =
    !isHistory &&
    !isSentRoute &&
    !showArchive &&
    (filterType === "all"
      ? pendingTotal > 0
      : filterType === "social"
      ? pendingSocialCount > 0
      : pendingCalendarCount > 0);

  const rsvpChangeInvite = rsvpChangeTarget
    ? (rsvpChangeTarget.isGroup ? groupInvites : friendInvites).find(
        (inv) => inv.id === rsvpChangeTarget.id
      ) ?? null
    : null;

  const applyRSVPChange = (status: RSVPStatus) => {
    if (!rsvpChangeTarget) return;
    if (rsvpChangeTarget.isGroup) {
      handleGroupRSVP(rsvpChangeTarget.id, status);
    } else {
      handleFriendRSVP(rsvpChangeTarget.id, status);
    }
    setRsvpChangeTarget(null);
  };

  const historyTotal =
    expiredGroupInvites.length +
    expiredFriendInvites.length +
    expiredGroupCalendar.length +
    expiredFriendCalendar.length;
  const sentTotal = sentInvites.length;

  const countText = isHistory
    ? `${historyTotal} expired invitations`
    : isSentRoute
    ? `${sentTotal} sent invitations`
    : showArchive
    ? `${answeredGroupInvites.length + answeredFriendInvites.length + answeredGroupCalendar.length + answeredFriendCalendar.length
      } responses`
    : `${pendingGroupInvites.length + pendingFriendInvites.length + pendingGroupCalendar.length + pendingFriendCalendar.length
      } pending invitations`;

  const socialEmptyTitle = isHistory
    ? "No expired invites"
    : isSentRoute
    ? "No sent invites"
    : showArchive
    ? "No responses yet"
    : "No pending invites";
  const socialEmptyDesc = isHistory
    ? "Expired invites will appear here."
    : isSentRoute
    ? "Invites you send will appear here."
    : showArchive
    ? "Responses will appear here."
    : "You're all caught up! Check edit for past RSVPs.";
  const socialEmptyEmoji = isHistory ? "🕘" : isSentRoute ? "📤" : showArchive ? "✅" : "📚";

  const calendarEmptyTitle = isHistory
    ? "No expired events"
    : isSentRoute
    ? "No sent events"
    : showArchive
    ? "No responses yet"
    : "No pending events";
  const calendarEmptyDesc = isHistory
    ? "Expired events will appear here."
    : isSentRoute
    ? "Events you send will appear here."
    : showArchive
    ? "Responses will appear here."
    : "You're all caught up!";
  const calendarEmptyEmoji = isHistory ? "🕘" : isSentRoute ? "📤" : showArchive ? "✅" : "📅";
  const statusLabel = isHistory ? "expired" : isSentRoute ? "sent" : showArchive ? "responses" : "pending";
  const selectedInviteStats = selectedInvite
    ? (() => {
        const totalInvited = selectedInvite.totalInvited;
        const going = selectedInvite.attendees.filter((a) => a.status === "yes").length;
        const maybe = selectedInvite.attendees.filter((a) => a.status === "maybe").length;
        const no = selectedInvite.attendees.filter((a) => a.status === "no").length;
        const responded = going + maybe + no;
        const pending = Math.max(totalInvited - responded, 0);
        const responseRate = totalInvited ? Math.round((responded / totalInvited) * 100) : 0;
        const friendCount = selectedInvite.attendees.filter((a) => a.isFriend).length;
        const knownCount = selectedInvite.attendees.length;
        const friendRate = knownCount ? Math.round((friendCount / knownCount) * 100) : 0;
        const startAt = new Date(selectedInvite.startAt);
        const daysToStart = Math.ceil((startAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const daysLabel =
          daysToStart <= 0 ? "Today" : `${daysToStart} day${daysToStart === 1 ? "" : "s"}`;
        const momentum = responseRate >= 70 ? "Hot" : responseRate >= 40 ? "Building" : "Early";
        const estimatedTurnout = going + Math.round(maybe * 0.6);

        return {
          totalInvited,
          going,
          maybe,
          no,
          responded,
          pending,
          responseRate,
          friendCount,
          friendRate,
          daysLabel,
          startAt,
          momentum,
          estimatedTurnout,
        };
      })()
    : null;

  useEffect(() => {
    if (showArchive || !canSelectBatch) {
      setBatchMode(false);
      setSelectedInviteIds([]);
      setSelectedCalendarIds([]);
    }
  }, [showArchive, canSelectBatch]);

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.flex1}>
            <Text style={styles.h1}>
              {isHistory ? "History" : isSentRoute ? "Sent" : "Invites"}
            </Text>
            <Text style={styles.headerSubtitle}>{countText}</Text>
          </View>

          <View style={styles.rowGap8}>
            {!isHistory && !isAnsweredRoute && !isSentRoute && (
              <Pressable
                onPress={() => router.push("/history/social-answered")}
                style={[styles.pillBtn, styles.pillInactive]}
              >
                <Text style={[styles.pillBtnText, styles.textSlate700]}>Edit</Text>
              </Pressable>
            )}

            {!isHistory && !isAnsweredRoute && !isSentRoute && (
              <Pressable
                onPress={() => router.push("/history/social-sent")}
                style={[styles.pillBtn, styles.pillInactive]}
              >
                <Text style={[styles.pillBtnText, styles.textSlate700]}>Sent</Text>
              </Pressable>
            )}

            {!isHistory && !isAnsweredRoute && !isSentRoute && (
              <Pressable onPress={() => router.push("/modal/social-create")} style={[styles.pillBtn, styles.pillDark]}>
                <Text style={[styles.pillBtnText, styles.textWhite]}>+ Invite</Text>
              </Pressable>
            )}
          </View>
        </View>

        {isSentRoute ? (
          <View style={[styles.mt16, styles.flex1MinHeight0]}>
            <ScrollView style={styles.flex1MinHeight0} contentContainerStyle={styles.pb40}>
              <View style={styles.mb24}>
                <Text style={styles.sectionHeader}>
                  Sent Invites {sentInvites.length > 0 ? `(${sentInvites.length})` : ""}
                </Text>

                {sentInvites.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyEmoji}>{socialEmptyEmoji}</Text>
                    <Text style={styles.emptyTitle}>{socialEmptyTitle}</Text>
                    <Text style={styles.emptyDesc}>{socialEmptyDesc}</Text>
                  </View>
                ) : (
                  sentInvites.map((invite) => (
                    <InviteCard
                      key={invite.id}
                      invite={invite}
                      onRSVP={invite.group ? handleGroupRSVP : handleFriendRSVP}
                      showGroup={!!invite.group}
                      readOnly
                      onClick={() => {
                        setSelectedInvite(invite);
                        setExpandedSections({
                          going: Platform.OS === "ios",
                          maybe: Platform.OS === "ios",
                          no: Platform.OS === "ios",
                          pending: Platform.OS === "ios",
                        });
                      }}
                      onGroupClick={() => {
                        if (!invite.group) return;
                        const group = GROUPS.find((g) => g.name === invite.group);
                        if (group) {
                          setGroupToView(group);
                          setShowGroupDetailsModal(true);
                        }
                      }}
                    />
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        ) : (
          <>
            {/* Tabs */}
            <View style={[styles.mt16, styles.rowGap8]}>
          <Pressable
            onPress={() => setActiveTab("groups")}
            style={[styles.tabBtn, activeTab === "groups" ? styles.tabActive : styles.tabInactive]}
          >
              <Text style={[styles.tabText, activeTab === "groups" ? styles.textWhite : styles.textSlate900]}>
                📚 Group Invites{" "}
              {groupTabCount > 0 ? `(${groupTabCount})` : ""}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setActiveTab("friends")}
            style={[styles.tabBtn, activeTab === "friends" ? styles.tabActive : styles.tabInactive]}
          >
              <Text style={[styles.tabText, activeTab === "friends" ? styles.textWhite : styles.textSlate900]}>
                👥 Friend Invites{" "}
              {friendTabCount > 0 ? `(${friendTabCount})` : ""}
            </Text>
          </Pressable>
        </View>

        {/* Filter + Select */}
        <View style={[styles.mt16, styles.flex1MinHeight0]}>
          <View style={styles.filterStack}>
            <View style={styles.filterRow}>
              <Pressable
                onPress={() => setFilterType("all")}
                style={[styles.filterBtn, filterType === "all" ? styles.filterActive : styles.filterInactive]}
              >
              <Text style={[styles.filterText, filterType === "all" ? styles.textWhite : styles.textSlate700]}>
                All ({activeTotalCount})
              </Text>
            </Pressable>

              <Pressable
                onPress={() => setFilterType("social")}
                style={[styles.filterBtn, filterType === "social" ? styles.filterActive : styles.filterInactive]}
              >
              <Text style={[styles.filterText, filterType === "social" ? styles.textWhite : styles.textSlate700]}>
                🎉 Social ({activeSocialCount})
              </Text>
            </Pressable>

              <Pressable
                onPress={() => setFilterType("calendar")}
                style={[styles.filterBtn, filterType === "calendar" ? styles.filterActive : styles.filterInactive]}
              >
              <Text style={[styles.filterText, filterType === "calendar" ? styles.textWhite : styles.textSlate700]}>
                📅 Calendar ({activeCalendarCount})
              </Text>
            </Pressable>

              {!isHistory && !isAnsweredRoute && !isSentRoute && (
                <Pressable
                  onPress={() => router.push("/history/social-expired")}
                  style={[styles.filterBtn, styles.filterInactive]}
                >
                  <Text style={[styles.filterText, styles.textSlate700]}>History</Text>
                </Pressable>
              )}

              {isHistory && (
                <Pressable
                  onPress={() => router.push("/history/social-sent")}
                  style={[styles.filterBtn, styles.filterInactive]}
                >
                  <Text style={[styles.filterText, styles.textSlate700]}>Sent</Text>
                </Pressable>
              )}
            </View>

            {canSelectBatch && (
              <View style={styles.selectRow}>
                <Pressable
                  onPress={toggleBatchMode}
                  style={[styles.selectBtn, batchMode ? styles.selectActive : styles.selectInactive]}
                >
                <Text style={[styles.selectText, batchMode ? styles.textWhite : styles.textBlue700]}>
                  {batchMode ? "✓ Done" : "Select"}
                </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Batch Bars */}
          {batchMode && selectedInviteIds.length > 0 && (
            <View style={styles.batchBar}>
              <View style={[styles.rowBetween, styles.mb8]}>
                <Text style={styles.batchBarText}>
                  {selectedInviteIds.length} invite{selectedInviteIds.length > 1 ? "s" : ""} selected
                </Text>
              </View>

              <View style={styles.rowGap8}>
                <Pressable onPress={() => handleBatchRSVP("yes")} style={[styles.batchBtn, styles.bgGreen500]}>
                  <Text style={styles.batchBtnText}>✓ Going</Text>
                </Pressable>
                <Pressable onPress={() => handleBatchRSVP("maybe")} style={[styles.batchBtn, styles.bgYellow500]}>
                  <Text style={styles.batchBtnText}>? Maybe</Text>
                </Pressable>
                <Pressable onPress={() => handleBatchRSVP("no")} style={[styles.batchBtn, styles.bgSlate400]}>
                  <Text style={styles.batchBtnText}>✗ Can't</Text>
                </Pressable>
              </View>
            </View>
          )}

          {batchMode && selectedCalendarIds.length > 0 && (
            <View style={styles.batchBarPurple}>
              <View style={[styles.rowBetween, styles.mb8]}>
                <Text style={styles.batchBarText}>
                  {selectedCalendarIds.length} event{selectedCalendarIds.length > 1 ? "s" : ""} selected
                </Text>
              </View>

              <Pressable onPress={handleBatchAcceptCalendar} style={[styles.batchBtnFull, styles.bgBlue500]}>
                <Text style={styles.batchBtnText}>✓ Accept All & Add to Calendar</Text>
              </Pressable>
            </View>
          )}

          {/* Content */}
          <ScrollView style={[styles.mt16, styles.flex1MinHeight0]} contentContainerStyle={styles.pb40}>
            {activeTab === "groups" ? (
              <>
                {(filterType === "all" || filterType === "social") && (
                  <View style={styles.mb24}>
                    <Text style={styles.sectionHeader}>
                      🎉 Social Invites{" "}
                      {groupSocialCount > 0 ? `(${groupSocialCount} ${statusLabel})` : ""}
                    </Text>

                    {groupInvitesToShow.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyEmoji}>{socialEmptyEmoji}</Text>
                        <Text style={styles.emptyTitle}>{socialEmptyTitle}</Text>
                        <Text style={styles.emptyDesc}>{socialEmptyDesc}</Text>
                      </View>
                    ) : (
                      groupInvitesToShow.map((invite) => (
                        <SwipeableInviteCard
                          key={invite.id}
                          invite={invite}
                          onRSVP={handleGroupRSVP}
                          showGroup={true}
                          readOnly={isHistory || isSentRoute}
                          onClick={() => {
                            setSelectedInvite(invite);
                            setExpandedSections({
                              going: Platform.OS === "ios",
                              maybe: Platform.OS === "ios",
                              no: Platform.OS === "ios",
                              pending: Platform.OS === "ios",
                            });
                          }}
                          batchMode={batchMode}
                          isSelected={selectedInviteIds.includes(invite.id)}
                          onToggleSelect={() => toggleInviteSelection(invite.id)}
                          onGroupClick={() => {
                            const group = GROUPS.find((g) => g.name === invite.group);
                            if (group) {
                              setGroupToView(group);
                              setShowGroupDetailsModal(true);
                            }
                          }}
                        />
                      ))
                    )}
                  </View>
                )}

                {(filterType === "all" || filterType === "calendar") && (
                  <View>
                    <Text style={styles.sectionHeader}>
                      📅 Calendar Events{" "}
                      {groupCalendarCount > 0 ? `(${groupCalendarCount} ${statusLabel})` : ""}
                    </Text>

                    {groupCalendarToShow.length === 0 ? (
                      <View style={styles.emptyCardBlue}>
                        <Text style={styles.emptyEmoji}>{calendarEmptyEmoji}</Text>
                        <Text style={styles.emptyTitle}>{calendarEmptyTitle}</Text>
                        <Text style={styles.emptyDesc}>{calendarEmptyDesc}</Text>
                      </View>
                    ) : (
                      groupCalendarToShow.map((event) => (
                        <CalendarEventCard
                          key={event.id}
                          event={event}
                          onAccept={(id) => handleAcceptCalendarEvent(id, true)}
                          onDecline={(id) => handleDeclineCalendarEvent(id, true)}
                          onEditReminder={(evt) => handleEditReminder(evt, true)}
                          onRemove={(id) => handleRemoveFromCalendar(id, true)}
                          showGroup={true}
                          readOnly={isHistory || isSentRoute}
                          batchMode={batchMode}
                          isSelected={selectedCalendarIds.includes(event.id)}
                          onToggleSelect={() => toggleCalendarSelection(event.id)}
                          onGroupClick={() => {
                            const group = GROUPS.find((g) => g.name === event.group);
                            if (group) {
                              setGroupToView(group);
                              setShowGroupDetailsModal(true);
                            }
                          }}
                        />
                      ))
                    )}
                  </View>
                )}
              </>
            ) : (
              <>
                {(filterType === "all" || filterType === "social") && (
                  <View style={styles.mb24}>
                    <Text style={styles.sectionHeader}>
                      🎉 Social Invites{" "}
                      {friendSocialCount > 0 ? `(${friendSocialCount} ${statusLabel})` : ""}
                    </Text>

                    {friendInvitesToShow.length === 0 ? (
                      <View style={styles.emptyCard}>
                        <Text style={styles.emptyEmoji}>{socialEmptyEmoji}</Text>
                        <Text style={styles.emptyTitle}>{socialEmptyTitle}</Text>
                        <Text style={styles.emptyDesc}>{socialEmptyDesc}</Text>
                      </View>
                    ) : (
                      friendInvitesToShow.map((invite) => (
                        <SwipeableInviteCard
                          key={invite.id}
                          invite={invite}
                          onRSVP={handleFriendRSVP}
                          showGroup={false}
                          readOnly={isHistory || isSentRoute}
                          onClick={() => {
                            setSelectedInvite(invite);
                            setExpandedSections({
                              going: Platform.OS === "ios",
                              maybe: Platform.OS === "ios",
                              no: Platform.OS === "ios",
                              pending: Platform.OS === "ios",
                            });
                          }}
                          batchMode={batchMode}
                          isSelected={selectedInviteIds.includes(invite.id)}
                          onToggleSelect={() => toggleInviteSelection(invite.id)}
                        />
                      ))
                    )}
                  </View>
                )}

                {(filterType === "all" || filterType === "calendar") && (
                  <View>
                    <Text style={styles.sectionHeader}>
                      📅 Calendar Events{" "}
                      {friendCalendarCount > 0 ? `(${friendCalendarCount} ${statusLabel})` : ""}
                    </Text>

                    {friendCalendarToShow.length === 0 ? (
                      <View style={styles.emptyCardBlue}>
                        <Text style={styles.emptyEmoji}>{calendarEmptyEmoji}</Text>
                        <Text style={styles.emptyTitle}>{calendarEmptyTitle}</Text>
                        <Text style={styles.emptyDesc}>{calendarEmptyDesc}</Text>
                      </View>
                    ) : (
                      friendCalendarToShow.map((event) => (
                        <CalendarEventCard
                          key={event.id}
                          event={event}
                          onAccept={(id) => handleAcceptCalendarEvent(id, false)}
                          onDecline={(id) => handleDeclineCalendarEvent(id, false)}
                          onEditReminder={(evt) => handleEditReminder(evt, false)}
                          onRemove={(id) => handleRemoveFromCalendar(id, false)}
                          showGroup={false}
                          readOnly={isHistory || isSentRoute}
                          batchMode={batchMode}
                          isSelected={selectedCalendarIds.includes(event.id)}
                          onToggleSelect={() => toggleCalendarSelection(event.id)}
                        />
                      ))
                    )}
                  </View>
                )}
              </>
            )}

            {!isHistory && !isAnsweredRoute && !isSentRoute && (
              <Pressable
                onPress={() => router.push("/history/social-expired")}
                style={styles.historyCard}
              >
                <Text style={styles.historyTitle}>History</Text>
                <Text style={styles.historySub}>
                  Expired invites and events{historyTotal > 0 ? ` (${historyTotal})` : ""}
                </Text>
              </Pressable>
            )}
          </ScrollView>
        </View>
        </>
      )}

        {/* Invite Detail Modal (selectedInvite) */}
        {selectedInvite && (
          <Modal transparent animationType="fade" visible onRequestClose={() => setSelectedInvite(null)}>
            <View style={styles.modalBackdrop}>
              <Pressable
                onPress={() => setSelectedInvite(null)}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.detailSheet}>
                {/* Sticky Header */}
                <View style={styles.detailHeader}>
                  <View style={styles.flex1Min0}>
                    <Text numberOfLines={1} style={styles.detailTitle}>
                      {selectedInvite.title}
                    </Text>

                    <View style={styles.detailMeta}>
                      {!!selectedInvite.group && (
                        <Text numberOfLines={1} style={styles.detailMetaText}>
                          📚 {selectedInvite.group}
                        </Text>
                      )}
                      <Text numberOfLines={1} style={styles.detailMetaText}>
                        👤 {selectedInvite.organizer}
                      </Text>
                      <Text numberOfLines={1} style={styles.detailMetaText}>
                        📍 {selectedInvite.location}
                      </Text>
                      <Text numberOfLines={1} style={styles.detailMetaText}>
                        🕒 {formatDateLong(new Date(selectedInvite.startAt))} •{" "}
                        {formatTime(new Date(selectedInvite.startAt))}
                      </Text>
                    </View>
                  </View>

                  <Pressable onPress={() => setSelectedInvite(null)} style={styles.closeBtnCircle}>
                    <Text style={styles.closeBtnCircleText}>×</Text>
                  </Pressable>
                </View>

                <ScrollView style={styles.detailBody} contentContainerStyle={styles.p20}>
                  {isSentRoute && selectedInviteStats && (
                    <View style={[styles.sentCard, styles.mb16]}>
                      <View style={styles.sentHeaderRow}>
                        <Text style={styles.sentTitle}>Sent Dashboard</Text>
                        <View style={styles.sentBadge}>
                          <Text style={styles.sentBadgeText}>{selectedInviteStats.responseRate}% responded</Text>
                        </View>
                      </View>
                      <View style={styles.sentBarTrack}>
                        <View
                          style={[styles.sentBarFill, { width: `${selectedInviteStats.responseRate}%` }]}
                        />
                      </View>

                      <View style={styles.sentInsightRow}>
                        <View style={styles.sentInsightCard}>
                          <Text style={styles.sentInsightLabel}>Estimated turnout</Text>
                          <Text style={styles.sentInsightValue}>{selectedInviteStats.estimatedTurnout}</Text>
                          <Text style={styles.sentInsightSub}>
                            {selectedInviteStats.going} going + {selectedInviteStats.maybe} maybe
                          </Text>
                        </View>
                        <View style={styles.sentInsightCard}>
                          <Text style={styles.sentInsightLabel}>Momentum</Text>
                          <Text style={styles.sentInsightValue}>{selectedInviteStats.momentum}</Text>
                          <Text style={styles.sentInsightSub}>
                            {selectedInviteStats.responded} of {selectedInviteStats.totalInvited} responded
                          </Text>
                        </View>
                      </View>

                      <View style={styles.sentInsightRow}>
                        <View style={styles.sentInsightCard}>
                          <Text style={styles.sentInsightLabel}>Friend mix</Text>
                          <Text style={styles.sentInsightValue}>{selectedInviteStats.friendRate}%</Text>
                          <Text style={styles.sentInsightSub}>
                            {selectedInviteStats.friendCount} friends listed
                          </Text>
                        </View>
                        <View style={styles.sentInsightCard}>
                          <Text style={styles.sentInsightLabel}>Starts in</Text>
                          <Text style={styles.sentInsightValue}>{selectedInviteStats.daysLabel}</Text>
                          <Text style={styles.sentInsightSub}>{formatDateLong(selectedInviteStats.startAt)}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* Quick Stats Pills */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mb16}>
                    <View style={styles.rowGap8}>
                      <View style={[styles.statPill, styles.bgGreen100]}>
                        <View style={[styles.statCountCircle, styles.bgGreen500]}>
                          <Text style={styles.statCountText}>
                            {selectedInvite.attendees.filter((a) => a.status === "yes").length}
                          </Text>
                        </View>
                        <Text style={[styles.statPillText, styles.textGreen700]}>Going</Text>
                      </View>

                      <View style={[styles.statPill, styles.bgYellow100]}>
                        <View style={[styles.statCountCircle, styles.bgYellow500]}>
                          <Text style={styles.statCountText}>
                            {selectedInvite.attendees.filter((a) => a.status === "maybe").length}
                          </Text>
                        </View>
                        <Text style={[styles.statPillText, styles.textYellow700]}>Maybe</Text>
                      </View>

                      <View style={[styles.statPill, styles.bgRed100]}>
                        <View style={[styles.statCountCircle, styles.bgRed500]}>
                          <Text style={styles.statCountText}>
                            {selectedInvite.attendees.filter((a) => a.status === "no").length}
                          </Text>
                        </View>
                        <Text style={[styles.statPillText, styles.textRed700]}>Can't Go</Text>
                      </View>

                      <View style={[styles.statPill, styles.bgSlate100]}>
                        <View style={[styles.statCountCircle, styles.bgSlate400]}>
                          <Text style={styles.statCountText}>
                            {selectedInvite.attendees.filter((a) => a.status === null).length}
                          </Text>
                        </View>
                        <Text style={[styles.statPillText, styles.textSlate600]}>Pending</Text>
                      </View>
                    </View>
                  </ScrollView>

                  <Text style={styles.upperLabel}>
                    {selectedInvite.attendees.length} of {selectedInvite.totalInvited} people invited
                  </Text>

                  <View style={styles.spaceY12}>
                    <CompactAttendeeList
                      title="Going"
                      icon="✓"
                      color="green"
                      attendees={selectedInvite.attendees.filter((a) => a.status === "yes")}
                      expanded={expandedSections.going}
                      onToggle={() => setExpandedSections((p) => ({ ...p, going: !p.going }))}
                    />

                    <CompactAttendeeList
                      title="Maybe"
                      icon="?"
                      color="yellow"
                      attendees={selectedInvite.attendees.filter((a) => a.status === "maybe")}
                      expanded={expandedSections.maybe}
                      onToggle={() => setExpandedSections((p) => ({ ...p, maybe: !p.maybe }))}
                    />

                    <CompactAttendeeList
                      title="Can't Go"
                      icon="✗"
                      color="red"
                      attendees={selectedInvite.attendees.filter((a) => a.status === "no")}
                      expanded={expandedSections.no}
                      onToggle={() => setExpandedSections((p) => ({ ...p, no: !p.no }))}
                    />

                    <CompactAttendeeList
                      title="Pending"
                      icon="•"
                      color="gray"
                      attendees={selectedInvite.attendees.filter((a) => a.status === null)}
                      expanded={expandedSections.pending}
                      onToggle={() => setExpandedSections((p) => ({ ...p, pending: !p.pending }))}
                    />
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}

        {/* Reminder Modal */}
        {showReminderModal && selectedCalendarEvent && (
          <Modal
            transparent
            animationType="fade"
            visible
            onRequestClose={() => {
              setShowReminderModal(false);
              setSelectedCalendarEvent(null);
            }}
          >
            <Pressable
              onPress={() => {
                setShowReminderModal(false);
                setSelectedCalendarEvent(null);
              }}
              style={styles.modalBackdrop}
            >
              <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
                <View style={styles.modalHeaderRow}>
                  <Text style={styles.modalTitle}>Set Reminders</Text>
                  <Text style={styles.modalSubtitleSmall}>
                    When should we remind you about this event?
                  </Text>
                </View>

                <ReminderSelector
                  eventTitle={selectedCalendarEvent.title}
                  onSave={handleSaveReminder}
                  onCancel={() => {
                    setShowReminderModal(false);
                    setSelectedCalendarEvent(null);
                  }}
                  existingReminders={isEditingReminder ? selectedCalendarEvent.reminderSettings : null}
                />
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* Group Details Modal */}
        {showGroupDetailsModal && groupToView && (
          <GroupDetailsModal
            group={groupToView}
            onClose={() => {
              setShowGroupDetailsModal(false);
              setGroupToView(null);
            }}
          />
        )}

        {/* RSVP Change Modal */}
        {rsvpChangeTarget && (
          <Modal
            transparent
            animationType="fade"
            visible
            onRequestClose={() => setRsvpChangeTarget(null)}
          >
            <Pressable onPress={() => setRsvpChangeTarget(null)} style={styles.modalBackdrop}>
              <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalSheet}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Change RSVP</Text>
                  {rsvpChangeInvite && (
                    <Text style={styles.modalSubtitleSmall}>{rsvpChangeInvite.title}</Text>
                  )}
                </View>

                <View style={styles.modalBodyPad}>
                  <View style={styles.spaceY8}>
                    <Pressable
                      onPress={() => applyRSVPChange("yes")}
                      style={[styles.modalOptionBtn, styles.bgGreen600]}
                    >
                      <Text style={styles.actionBtnText}>Going</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => applyRSVPChange("maybe")}
                      style={[styles.modalOptionBtn, styles.bgYellow500]}
                    >
                      <Text style={styles.actionBtnText}>Maybe</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => applyRSVPChange("no")}
                      style={[styles.modalOptionBtn, styles.bgSlate300]}
                    >
                      <Text style={[styles.actionBtnText, styles.textSlate700]}>Can't Go</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.modalFooter}>
                  <Pressable onPress={() => setRsvpChangeTarget(null)} style={styles.secondaryBtn}>
                    <Text style={styles.secondaryBtnText}>Cancel</Text>
                  </Pressable>
                </View>
              </Pressable>
            </Pressable>
          </Modal>
        )}

        {/* RSVP Toast */}
        <RSVPToast
          toast={rsvpToast}
          onViewAnswered={() => router.push("/history/social-answered")}
          onDismiss={() => setRsvpToast(null)}
        />
      </View>
    </View>
  );
}

export default function SocialTab() {
  return <SocialScreen />;
}

/* ----------------------------- Styles ----------------------------- */

const IOS_SCALE = Platform.OS === "ios" ? 0.92 : 1;
const SCALE_SKIP_KEYS = new Set(["flex", "opacity", "zIndex", "elevation", "transform"]);

const scaleStyleValue = (key: string, value: unknown) => {
  if (typeof value !== "number") return value;
  if (SCALE_SKIP_KEYS.has(key)) return value;
  return Math.round(value * IOS_SCALE * 1000) / 1000;
};

const scaleStyleObject = (style: Record<string, unknown>): Record<string, unknown> => {
  const next: Record<string, unknown> = {};
  Object.entries(style).forEach(([key, value]) => {
    if (key === "transform") {
      next[key] = value;
      return;
    }
    if (Array.isArray(value)) {
      next[key] = value.map((item) =>
        item && typeof item === "object" && !Array.isArray(item)
          ? scaleStyleObject(item as Record<string, unknown>)
          : scaleStyleValue(key, item)
      );
      return;
    }

    if (value && typeof value === "object") {
      next[key] = scaleStyleObject(value as Record<string, unknown>);
      return;
    }

    next[key] = scaleStyleValue(key, value);
  });
  return next;
};

const createScaledStyles = <T extends StyleSheet.NamedStyles<T>>(styleMap: T): T =>
  StyleSheet.create(scaleStyleObject(styleMap) as T);

const styles = createScaledStyles({
  screen: { flex: 1, backgroundColor: "#f8fafc" }, // slate-50
  container: { flex: 1, maxWidth: 720, alignSelf: "center", width: "100%", padding: 16, paddingBottom: 24 },

  /* layout helpers */
  flex1: { flex: 1 },
  flex1MinHeight0: { flex: 1, minHeight: 0 },
  flex1Min0: { flex: 1, minWidth: 0 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowBetweenStart: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  rowGap2: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowGap8: { flexDirection: "row", alignItems: "center", gap: 8 },
  rowGap12: { flexDirection: "row", alignItems: "center", gap: 12 },
  stackGap12: { gap: 12 },

  mt2: { marginTop: 2 },
  mt4: { marginTop: 4 },
  mt12: { marginTop: 12 },
  mt16: { marginTop: 16 },
  mb8: { marginBottom: 8 },
  mb12: { marginBottom: 12 },
  mb16: { marginBottom: 16 },
  mb24: { marginBottom: 24 },
  pb40: { paddingBottom: 120 },
  p20: { padding: 20 },
  p24: { padding: 24 },

  spaceY6: { marginTop: 8, gap: 6 },
  spaceY8: { marginTop: 8, gap: 8 },
  spaceY12: { marginTop: 8, gap: 12 },

  /* text */
  h1: { fontSize: 24, fontWeight: "800", color: "#0f172a" },
  headerSubtitle: { marginTop: 4, fontWeight: "600", color: "#64748b" },
  textSm: { fontSize: 14 },
  textXs: { fontSize: 12 },
  textXl: { fontSize: 20 },
  text2xl: { fontSize: 22 },
  text3xl: { fontSize: 28 },
  text4xl: { fontSize: 36 },
  fontBold: { fontWeight: "700" },
  fontSemibold: { fontWeight: "600" },
  fontExtraBold: { fontWeight: "800" },
  textWhite: { color: "#ffffff" },
  textSlate900: { color: "#0f172a" },
  textSlate700: { color: "#334155" },
  textSlate600: { color: "#475569" },
  textSlate500: { color: "#64748b" },
  textSlate400: { color: "#94a3b8" },
  textGreen700: { color: "#15803d" },
  textGreen600: { color: "#16a34a" },
  textYellow700: { color: "#a16207" },
  textRed700: { color: "#b91c1c" },
  textRed600: { color: "#dc2626" },
  textBlue700: { color: "#1d4ed8" },
  opacity70: { opacity: 0.7 },

  /* colors */
  bgGreen50: { backgroundColor: "#f0fdf4" },
  bgGreen100: { backgroundColor: "#dcfce7" },
  bgGreen500: { backgroundColor: "#22c55e" },
  bgGreen600: { backgroundColor: "#16a34a" },
  bgYellow50: { backgroundColor: "#fffbeb" },
  bgYellow100: { backgroundColor: "#fef9c3" },
  bgYellow500: { backgroundColor: "#eab308" },
  bgYellow600: { backgroundColor: "#ca8a04" },
  bgRed50: { backgroundColor: "#fef2f2" },
  bgRed100: { backgroundColor: "#fee2e2" },
  bgRed500: { backgroundColor: "#ef4444" },
  bgSlate50: { backgroundColor: "#f8fafc" },
  bgSlate100: { backgroundColor: "#f1f5f9" },
  bgSlate200: { backgroundColor: "#e2e8f0" },
  bgSlate300: { backgroundColor: "#cbd5e1" },
  bgSlate400: { backgroundColor: "#94a3b8" },
  bgSlate600: { backgroundColor: "#475569" },
  bgBlue500: { backgroundColor: "#3b82f6" },
  bgBlue600: { backgroundColor: "#2563eb" },

  borderGreen200: { borderColor: "#bbf7d0" },
  borderYellow200: { borderColor: "#fde68a" },
  borderRed200: { borderColor: "#fecaca" },
  borderSlate200: { borderColor: "#e2e8f0" },

  /* header */
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 12 },

  pillBtn: { borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10 },
  pillBtnText: { fontWeight: "800" },
  pillActiveBlue: { backgroundColor: "#2563eb" },
  pillInactive: { borderWidth: 2, borderColor: "#cbd5e1", backgroundColor: "#ffffff" },
  pillDark: { backgroundColor: "#0f172a" },

  /* tabs */
  tabBtn: { flex: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  tabActive: { backgroundColor: "#0f172a" },
  tabInactive: { borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff" },
  tabText: { fontWeight: "800" },

  /* filters */
  filterStack: { gap: 8 },
  filterRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  filterBtn: { flex: 1, minWidth: 120, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10 },
  filterActive: { backgroundColor: "#0f172a" },
  filterInactive: { backgroundColor: "#f1f5f9" },
  filterText: { fontSize: 12, fontWeight: "700" },
  selectText: { fontSize: 13, fontWeight: "700" },
  selectRow: { flexDirection: "row", justifyContent: "flex-end" },
  selectBtn: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, minWidth: 120, alignItems: "center", justifyContent: "center" },
  selectActive: { backgroundColor: "#2563eb" },
  selectInactive: { backgroundColor: "#dbeafe" }, // blue-100ish

  /* batch bars */
  batchBar: { marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#2563eb" },
  batchBarPurple: { marginTop: 12, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#7c3aed" },
  batchBarText: { fontWeight: "700", color: "#ffffff" },
  batchBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  batchBtnFull: { borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  batchBtnText: { fontWeight: "800", color: "#ffffff" },

  /* section headers */
  sectionHeader: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", color: "#64748b", marginBottom: 10 },

  /* empty cards */
  emptyCard: { borderWidth: 1, borderStyle: "dashed", borderColor: "#cbd5e1", backgroundColor: "#ffffff", borderRadius: 18, padding: 18, alignItems: "center" },
  emptyCardBlue: { borderWidth: 1, borderStyle: "dashed", borderColor: "#93c5fd", backgroundColor: "#eff6ff", borderRadius: 18, padding: 18, alignItems: "center" },
  emptyEmoji: { fontSize: 30, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  emptyDesc: { marginTop: 6, textAlign: "center", fontSize: 14, color: "#475569" },
  historyCard: { borderRadius: 18, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff", padding: 16, alignItems: "center", marginTop: 12 },
  historyTitle: { fontSize: 14, fontWeight: "800", color: "#0f172a" },
  historySub: { marginTop: 4, fontSize: 12, color: "#64748b" },

  /* sent dashboard */
  sentCard: { borderRadius: 18, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff", padding: 16 },
  sentHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  sentTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  sentSubtitle: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  sentBadge: { borderRadius: 999, backgroundColor: "#e0f2fe", paddingHorizontal: 10, paddingVertical: 4 },
  sentBadgeText: { color: "#0369a1", fontSize: 12, fontWeight: "800" },
  sentBarTrack: { height: 8, borderRadius: 999, backgroundColor: "#e2e8f0", overflow: "hidden", marginTop: 10 },
  sentBarFill: { height: "100%", backgroundColor: "#2563eb" },
  sentStatRow: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", gap: 10 },
  sentStatBlock: { flex: 1, alignItems: "center" },
  sentStatValue: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  sentStatLabel: { marginTop: 4, fontSize: 11, fontWeight: "700", color: "#64748b", textAlign: "center" },
  sentPillRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sentPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  sentPillText: { fontSize: 12, fontWeight: "800" },
  sentInsightRow: { marginTop: 12, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  sentInsightCard: {
    flex: 1,
    minWidth: 140,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    padding: 12,
  },
  sentInsightLabel: { fontSize: 11, fontWeight: "800", color: "#64748b", textTransform: "uppercase" },
  sentInsightValue: { marginTop: 6, fontSize: 18, fontWeight: "900", color: "#0f172a" },
  sentInsightSub: { marginTop: 4, fontSize: 11, fontWeight: "600", color: "#475569" },

  /* card base */
  cardBase: { borderRadius: 18, borderWidth: 2, padding: 16, marginBottom: 12 },
  cardDefault: { borderColor: "#e2e8f0", backgroundColor: "#ffffff" },
  cardSelectedBlue: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  opacityTap: {},

  /* checkbox */
  checkboxBox: { height: 24, width: 24, borderRadius: 8, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  checkboxUnselected: { backgroundColor: "#ffffff", borderColor: "#cbd5e1" },
  checkboxSelectedBlue: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkboxSelectedPurple: { backgroundColor: "#7c3aed", borderColor: "#7c3aed" },
  checkboxCheckText: { color: "#ffffff", fontSize: 16, fontWeight: "900" },

  /* card text */
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  groupLink: { fontSize: 14, fontWeight: "600", color: "#2563eb", textDecorationLine: "underline" },
  groupText: { fontSize: 14, fontWeight: "600", color: "#2563eb" },

  /* RSVP pill */
  rsvpPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  rsvpPillText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },

  /* action buttons */
  actionBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  actionBtnText: { fontWeight: "800", color: "#ffffff" },
  modalOptionBtn: { borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  secondaryBtn: { borderRadius: 14, borderWidth: 1, borderColor: "#cbd5e1", backgroundColor: "#ffffff", paddingVertical: 12, alignItems: "center" },
  secondaryBtnText: { fontWeight: "800", color: "#334155" },

  /* calendar card variants */
  cardCalendar: {},
  cardArchived: { borderColor: "#cbd5e1", backgroundColor: "#f1f5f9" },
  cardSelectedPurple: { borderColor: "#7c3aed", backgroundColor: "#f5f3ff" },
  cardBatchSelectable: { borderColor: "#bfdbfe", backgroundColor: "#eff6ff" },
  cardCalendarDefault: { borderColor: "#bfdbfe", backgroundColor: "#eff6ff" },

  statusPill: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1 },
  statusPillGreen: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  statusPillSlate: { backgroundColor: "#e2e8f0", borderColor: "#cbd5e1" },
  statusPillText: { fontSize: 12, fontWeight: "800", textTransform: "uppercase" },

  notesBox: { marginTop: 10, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "#bfdbfe", padding: 10 },
  notesToggle: { marginTop: 6, alignSelf: "flex-end" },
  notesToggleText: { fontSize: 12, fontWeight: "800", color: "#2563eb" },

  primaryBtnBlue: { borderRadius: 14, backgroundColor: "#2563eb", paddingVertical: 12, alignItems: "center" },
  primaryBtnBlueText: { fontWeight: "800", color: "#ffffff" },

  secondaryBtnStrong: { borderRadius: 14, borderWidth: 2, borderColor: "#cbd5e1", backgroundColor: "#ffffff", paddingVertical: 12, alignItems: "center" },
  secondaryBtnStrongText: { fontWeight: "800", color: "#334155" },

  reminderBox: { borderRadius: 10, backgroundColor: "rgba(255,255,255,0.7)", borderWidth: 1, borderColor: "#bfdbfe", padding: 12, marginBottom: 10 },
  editBtn: { flex: 1, borderRadius: 12, borderWidth: 2, borderColor: "#93c5fd", backgroundColor: "#ffffff", paddingVertical: 10, alignItems: "center" },
  editBtnText: { fontSize: 12, fontWeight: "800", color: "#1d4ed8" },
  removeBtn: { flex: 1, borderRadius: 12, borderWidth: 2, borderColor: "#fca5a5", backgroundColor: "#ffffff", paddingVertical: 10, alignItems: "center" },
  removeBtnText: { fontSize: 12, fontWeight: "800", color: "#b91c1c" },

  /* swipe wrapper */
  swipeWrap: { position: "relative", overflow: "hidden", borderRadius: 18, marginBottom: 12 },
  swipeHintLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: 110, justifyContent: "center", paddingLeft: 16, zIndex: 0 },
  swipeHintRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: 130, justifyContent: "center", alignItems: "flex-end", paddingRight: 16, zIndex: 0 },

  /* attendee */
  compactHeaderBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  iconCircleSm: { height: 28, width: 28, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  iconCircleSmText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },

  attendeeRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#f1f5f9" },
  avatarSm: { height: 32, width: 32, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  avatarSmText: { color: "#ffffff", fontWeight: "800" },
  friendPill: { marginTop: 4, alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#3b82f6", paddingHorizontal: 8, paddingVertical: 2 },
  friendPillText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },

  moreBtnGhost: { paddingVertical: 8, alignItems: "center" },

  /* toast */
  toastOverlay: { position: "absolute", left: 0, right: 0, bottom: 12, alignItems: "center", zIndex: 100 },
  toastWrap: { maxWidth: 520, width: "92%" },
  toastPill: { borderRadius: 999, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10 },
  toastText: { color: "#ffffff", fontWeight: "700", flex: 1 },
  toastLinkBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  toastLinkText: { color: "#ffffff", fontSize: 12, textDecorationLine: "underline", opacity: 0.95, fontWeight: "700" },
  toastCloseBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  toastCloseText: { color: "#ffffff", fontSize: 20, fontWeight: "800" },

  /* modals */
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", padding: 16, justifyContent: "center" },
  modalSheet: { backgroundColor: "#ffffff", borderRadius: 16, overflow: "hidden", width: "100%", maxWidth: 420, alignSelf: "center" },
  modalSheetWide: { backgroundColor: "#ffffff", borderRadius: 18, overflow: "hidden", width: "100%", maxWidth: 640, alignSelf: "center", maxHeight: 640, height: "80%" },
  modalHeaderRow: { paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#e2e8f0" },
  modalHeader: { paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderColor: "#e2e8f0" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  modalSubtitle: { marginTop: 6, fontSize: 14, color: "#475569", fontWeight: "600" },
  modalSubtitleSmall: { marginTop: 6, fontSize: 14, color: "#475569" },
  modalBody: { flex: 1, minHeight: 0 },
  modalBodyPad: { padding: 16 },
  modalFooter: { padding: 16, borderTopWidth: 1, borderColor: "#e2e8f0" },

  infoCard: { borderRadius: 14, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", padding: 14, marginBottom: 14 },
  infoCardTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  infoCardSub: { marginTop: 6, color: "#475569", fontWeight: "600" },

  sectionLabel: { fontSize: 12, fontWeight: "800", color: "#64748b", marginBottom: 8, marginTop: 8 },

  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff" },
  memberAvatar: { height: 34, width: 34, borderRadius: 999, backgroundColor: "#0f172a", color: "#ffffff", textAlign: "center", textAlignVertical: "center", fontWeight: "800", overflow: "hidden", paddingTop: Platform.OS === "android" ? 6 : 8 },
  memberName: { fontWeight: "800", color: "#0f172a" },
  memberRole: { marginTop: 2, fontSize: 12, color: "#64748b" },

  /* reminder selector */
  eventTitleBox: { marginBottom: 14, borderRadius: 10, backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", padding: 12 },
  eventTitleBoxText: { fontSize: 14, fontWeight: "800", color: "#1e3a8a" },
  reminderOptionBtn: { borderRadius: 12, borderWidth: 2, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#ffffff" },
  reminderNoneSelected: { borderColor: "#0f172a", backgroundColor: "#0f172a" },
  reminderNoneUnselected: { borderColor: "#cbd5e1", backgroundColor: "#ffffff" },
  reminderSelected: { borderColor: "#93c5fd", backgroundColor: "#eff6ff" },
  reminderUnselected: { borderColor: "#cbd5e1", backgroundColor: "#ffffff" },
  reminderIcon: { fontSize: 16 },
  reminderOptionText: { fontWeight: "800", color: "#0f172a" },
  reminderCheck: { fontSize: 16, fontWeight: "900" },
  reminderFooterRow: { flexDirection: "row", gap: 12 },
  reminderFooterBtn: { flex: 1 },

  /* detail modal */
  detailSheet: { backgroundColor: "#ffffff", borderRadius: 22, overflow: "hidden", width: "100%", maxWidth: 720, alignSelf: "center", maxHeight: 680, height: "80%" },
  detailHeader: { backgroundColor: "#4f46e5", paddingHorizontal: 18, paddingVertical: 16, flexDirection: "row", gap: 12, alignItems: "flex-start" },
  detailTitle: { color: "#ffffff", fontSize: 18, fontWeight: "800" },
  detailMeta: { marginTop: 10, gap: 4 },
  detailMetaText: { color: "#ffffff", opacity: 0.95, fontSize: 13 },
  closeBtnCircle: { backgroundColor: "rgba(255,255,255,0.2)", height: 34, width: 34, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  closeBtnCircleText: { color: "#ffffff", fontSize: 22, fontWeight: "800", marginTop: -2 },
  detailBody: { flex: 1 },

  statPill: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 10, marginRight: 10 },
  statCountCircle: { height: 24, width: 24, borderRadius: 999, alignItems: "center", justifyContent: "center" },
  statCountText: { color: "#ffffff", fontSize: 12, fontWeight: "800" },
  statPillText: { fontSize: 14, fontWeight: "700" },
  upperLabel: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", color: "#64748b", marginBottom: 12 },

  /* create modal */
  createModalSheet: { backgroundColor: "#ffffff", borderRadius: 18, overflow: "hidden", width: "100%", maxWidth: 640, alignSelf: "center", maxHeight: 760 },
  createModalHeader: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: "#e2e8f0", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  createModalTitle: { fontSize: 18, fontWeight: "900", color: "#0f172a" },
  closeXBtn: { padding: 6 },
  closeXText: { fontSize: 26, fontWeight: "800", color: "#0f172a" },

  stepDotsRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  stepDot: { height: 8, flex: 1, borderRadius: 999 },
  stepDotActive: { backgroundColor: "#2563eb" },
  stepDotDone: { backgroundColor: "#93c5fd" },
  stepDotIdle: { backgroundColor: "#e2e8f0" },

  centerHeader: { alignItems: "center", marginBottom: 10 },
  bigHeader: { fontSize: 22, fontWeight: "900", color: "#0f172a", textAlign: "center" },
  subHeader: { marginTop: 8, fontSize: 13, color: "#64748b", textAlign: "center" },

  choiceCard: { borderRadius: 18, borderWidth: 2, padding: 16, backgroundColor: "#ffffff" },
  choiceUnselected: { borderColor: "#e2e8f0" },
  choiceSelectedBlue: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  choiceSelectedPurple: { borderColor: "#7c3aed", backgroundColor: "#f5f3ff" },
  choiceSelectedGreen: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  choiceTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a" },
  choiceDesc: { marginTop: 6, color: "#475569" },
  choiceCheckBlue: { fontSize: 22, fontWeight: "900", color: "#2563eb" },
  choiceCheckPurple: { fontSize: 22, fontWeight: "900", color: "#7c3aed" },
  choiceCheckGreen: { fontSize: 22, fontWeight: "900", color: "#16a34a" },

  listBox: { maxHeight: 420, gap: 10 },
  listItem: { borderRadius: 18, borderWidth: 2, padding: 14, backgroundColor: "#ffffff" },
  listItemUnselected: { borderColor: "#e2e8f0" },
  listItemSelectedBlue: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  listItemSelectedGreen: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  listItemTitle: { fontWeight: "900", color: "#0f172a" },
  listItemSub: { marginTop: 4, color: "#64748b" },

  formField: { gap: 8 },
  formRow: { flexDirection: "row", gap: 12 },
  label: { fontSize: 12, fontWeight: "800", color: "#334155", textTransform: "uppercase" },
  input: { borderWidth: 2, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#ffffff", color: "#0f172a", fontWeight: "700" },
  textArea: { height: 110, textAlignVertical: "top" },

  infoHint: { borderRadius: 12, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0", padding: 12 },
  infoHintText: { color: "#475569" },

  createModalFooter: { borderTopWidth: 1, borderColor: "#e2e8f0", padding: 14 },
  footerBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  footerBtnPrimary: { backgroundColor: "#0f172a" },
  footerBtnSecondary: { backgroundColor: "#ffffff", borderWidth: 2, borderColor: "#e2e8f0" },
  footerBtnDisabled: { backgroundColor: "#e2e8f0" },
  footerBtnText: { fontWeight: "900" },
  footerBtnTextPrimary: { fontWeight: "900", color: "#ffffff" },
});



