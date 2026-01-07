import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Event, EventType } from "../../lib/types";

const TYPE_LABEL: Record<EventType, string> = {
  study: "Study",
  meetup: "Meetup",
  class: "Class",
};

function parseDateInput(dateStr: string) {
  const parts = dateStr.split("-").map((p) => Number(p));
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  return { year, month, day };
}

function buildDateTime(dateStr: string, timeStr: string) {
  const dateParts = parseDateInput(dateStr);
  if (!dateParts) return null;
  const [hour, minute] = timeStr.split(":").map((p) => Number(p));
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const result = new Date(dateParts.year, dateParts.month - 1, dateParts.day, hour, minute);
  if (
    result.getFullYear() !== dateParts.year ||
    result.getMonth() !== dateParts.month - 1 ||
    result.getDate() !== dateParts.day
  ) {
    return null;
  }
  return result;
}

function formatTimeValue(date: Date) {
  const pad = (val: number) => String(val).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDateValue(date: Date) {
  const pad = (val: number) => String(val).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateLabel(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeLabel(date: Date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function alignTimeToDate(date: Date, time: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    time.getHours(),
    time.getMinutes()
  );
}

function buildTimeFromDate(date: Date, timeStr: string) {
  const [hour, minute] = timeStr.split(":").map((p) => Number(p));
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour || 0, minute || 0);
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (e: Omit<Event, "id">) => void;
  initialDate?: Date;
};

export default function CreateEventModal({ isOpen, onClose, onSave, initialDate }: Props) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<EventType>("meetup");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState(formatDateValue(new Date()));
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const isIOS = Platform.OS === "ios";

  const [dateValue, setDateValue] = useState<Date>(() => new Date());
  const [startTimeValue, setStartTimeValue] = useState<Date>(() => buildTimeFromDate(new Date(), "09:00"));
  const [endTimeValue, setEndTimeValue] = useState<Date>(() => buildTimeFromDate(new Date(), "10:00"));
  const [tempDateValue, setTempDateValue] = useState<Date>(() => new Date());
  const [tempStartTimeValue, setTempStartTimeValue] = useState<Date>(() => buildTimeFromDate(new Date(), "09:00"));
  const [tempEndTimeValue, setTempEndTimeValue] = useState<Date>(() => buildTimeFromDate(new Date(), "10:00"));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialDate) return;
    const base = new Date(initialDate);
    const defaultStart = buildTimeFromDate(base, "09:00");
    const defaultEnd = buildTimeFromDate(base, "10:00");
    setDate(formatDateValue(base));
    setDateValue(base);
    setStartTime(formatTimeValue(defaultStart));
    setStartTimeValue(defaultStart);
    setEndTime(formatTimeValue(defaultEnd));
    setEndTimeValue(defaultEnd);
    setTempDateValue(base);
    setTempStartTimeValue(defaultStart);
    setTempEndTimeValue(defaultEnd);
  }, [initialDate, isOpen]);

  const dateParts = useMemo(() => parseDateInput(date), [date]);
  const startDateTime = useMemo(() => buildDateTime(date, startTime), [date, startTime]);
  const endDateTime = useMemo(() => buildDateTime(date, endTime), [date, endTime]);
  const isDateValid = !!dateParts;
  const isTimeValid = !!startDateTime && !!endDateTime && endDateTime.getTime() > startDateTime.getTime();
  const canSave = title.trim().length > 0 && isDateValid && isTimeValid;

  const progressCount = [title.trim().length > 0, isDateValid, isTimeValid].filter(Boolean).length;
  const progressText =
    progressCount === 0
      ? "Start with a title. You are one step from planning."
      : progressCount === 1
      ? "Nice start. Pick a date and time to lock it in."
      : progressCount === 2
      ? "Almost there. Set a clean time window."
      : "All set. Tap save and you are done.";

  const applyDate = (selected: Date) => {
    setDateValue(selected);
    setDate(formatDateValue(selected));
    setStartTimeValue((prev) => alignTimeToDate(selected, prev));
    setEndTimeValue((prev) => alignTimeToDate(selected, prev));
  };

  const applyStartTime = (selected: Date) => {
    const nextValue = alignTimeToDate(dateValue, selected);
    setStartTimeValue(nextValue);
    setStartTime(formatTimeValue(nextValue));

    const nextStart = buildDateTime(date, formatTimeValue(nextValue));
    const currentEnd = buildDateTime(date, endTime);
    if (nextStart && currentEnd && currentEnd.getTime() <= nextStart.getTime()) {
      const bumped = new Date(nextStart.getTime() + 60 * 60 * 1000);
      setEndTime(formatTimeValue(bumped));
      setEndTimeValue(alignTimeToDate(dateValue, bumped));
    }
  };

  const applyEndTime = (selected: Date) => {
    const nextValue = alignTimeToDate(dateValue, selected);
    setEndTimeValue(nextValue);
    setEndTime(formatTimeValue(nextValue));
  };

  const openDatePicker = () => {
    setTempDateValue(dateValue);
    setShowDatePicker(true);
  };

  const openStartPicker = () => {
    setTempStartTimeValue(startTimeValue);
    setShowStartPicker(true);
  };

  const openEndPicker = () => {
    setTempEndTimeValue(endTimeValue);
    setShowEndPicker(true);
  };

  const handleDateChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (isIOS) {
      setTempDateValue(selected);
    } else {
      setShowDatePicker(false);
      applyDate(selected);
    }
  };

  const handleStartTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (isIOS) {
      setTempStartTimeValue(selected);
    } else {
      setShowStartPicker(false);
      applyStartTime(selected);
    }
  };

  const handleEndTimeChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (!selected) return;
    if (isIOS) {
      setTempEndTimeValue(selected);
    } else {
      setShowEndPicker(false);
      applyEndTime(selected);
    }
  };

  const resetForm = () => {
    const now = new Date();
    const defaultStart = buildTimeFromDate(now, "09:00");
    const defaultEnd = buildTimeFromDate(now, "10:00");
    setTitle("");
    setType("meetup");
    setLocation("");
    setDate(formatDateValue(now));
    setStartTime(formatTimeValue(defaultStart));
    setEndTime(formatTimeValue(defaultEnd));
    setDateValue(now);
    setStartTimeValue(defaultStart);
    setEndTimeValue(defaultEnd);
    setTempDateValue(now);
    setTempStartTimeValue(defaultStart);
    setTempEndTimeValue(defaultEnd);
    setShowDatePicker(false);
    setShowStartPicker(false);
    setShowEndPicker(false);
  };

  const handleSave = () => {
    if (!canSave || !startDateTime || !endDateTime) {
      Alert.alert("Add the missing details to save.");
      return;
    }

    const event: Omit<Event, "id"> = {
      title: title.trim(),
      type,
      location: location.trim(),
      notes: "",
      startAt: startDateTime.toISOString(),
      endAt: endDateTime.toISOString(),
    };

    onSave(event);
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlayCenter}>
        <View style={styles.modalCard}>
          <View style={styles.modalTopBar}>
            <Pressable onPress={onClose}>
              <Text style={styles.modalTopTextMuted}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTopTitle}>New Event</Text>
            <Pressable onPress={handleSave} disabled={!canSave}>
              <Text style={[styles.modalTopTextBold, !canSave && styles.modalTopTextDisabled]}>
                Save
              </Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={styles.progressCard}>
              <Text style={styles.progressTitle}>Quick setup</Text>
              <Text style={styles.progressText}>{progressText}</Text>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${(progressCount / 3) * 100}%` }]} />
              </View>
              <Text style={styles.progressHint}>{progressCount}/3 done</Text>
            </View>

            <View>
              <Text style={styles.inputLabel}>
                Title <Text style={styles.requiredStar}>*</Text>
              </Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
            </View>

            <View>
              <Text style={styles.inputLabel}>Type</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(Object.entries(TYPE_LABEL) as Array<[EventType, string]>).map(([key, label]) => (
                  <Pressable
                    key={key}
                    onPress={() => setType(key)}
                    style={[
                      styles.typePick,
                      type === key ? styles.typePickActive : styles.typePickInactive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePickText,
                        type === key ? { color: "#fff" } : { color: "#0f172a" },
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>
                Date <Text style={styles.requiredStar}>*</Text>
              </Text>
              <Pressable onPress={openDatePicker} style={styles.pickerField}>
                <Text style={styles.pickerValueText}>{formatDateLabel(dateValue)}</Text>
                {!isIOS && (
                  <Text style={styles.pickerChevron}>{showDatePicker ? "^" : "v"}</Text>
                )}
              </Pressable>
              {showDatePicker && !isIOS && (
                <View style={styles.pickerWrap}>
                  <DateTimePicker
                    value={dateValue}
                    mode="date"
                    display={isIOS ? "spinner" : "default"}
                    onChange={handleDateChange}
                    style={styles.pickerWheel}
                  />
                </View>
              )}
            </View>

            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>
                  Start <Text style={styles.requiredStar}>*</Text>
                </Text>
                <Pressable onPress={openStartPicker} style={styles.pickerField}>
                  <Text style={styles.pickerValueText}>{formatTimeLabel(startTimeValue)}</Text>
                  {!isIOS && (
                    <Text style={styles.pickerChevron}>{showStartPicker ? "^" : "v"}</Text>
                  )}
                </Pressable>
                {showStartPicker && !isIOS && (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={startTimeValue}
                      mode="time"
                      display={isIOS ? "spinner" : "default"}
                      onChange={handleStartTimeChange}
                      style={styles.pickerWheel}
                    />
                  </View>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.inputLabel}>
                  End <Text style={styles.requiredStar}>*</Text>
                </Text>
                <Pressable onPress={openEndPicker} style={styles.pickerField}>
                  <Text style={styles.pickerValueText}>{formatTimeLabel(endTimeValue)}</Text>
                  {!isIOS && (
                    <Text style={styles.pickerChevron}>{showEndPicker ? "^" : "v"}</Text>
                  )}
                </Pressable>
                {showEndPicker && !isIOS && (
                  <View style={styles.pickerWrap}>
                    <DateTimePicker
                      value={endTimeValue}
                      mode="time"
                      display={isIOS ? "spinner" : "default"}
                      onChange={handleEndTimeChange}
                      style={styles.pickerWheel}
                    />
                  </View>
                )}
              </View>
            </View>

            <View>
              <Text style={styles.inputLabel}>Location</Text>
              <TextInput
                value={location}
                onChangeText={setLocation}
                placeholder="Add location (optional)"
                placeholderTextColor="#94a3b8"
                style={styles.input}
              />
            </View>

            {!isTimeValid && (
              <Text style={styles.helperText}>End time must be after start time.</Text>
            )}
          </ScrollView>

          {isIOS && showDatePicker && (
            <Modal transparent animationType="fade" visible onRequestClose={() => setShowDatePicker(false)}>
              <Pressable style={styles.pickerModalBackdrop} onPress={() => setShowDatePicker(false)}>
                <Pressable style={styles.pickerModalSheet} onPress={(e) => e.stopPropagation()}>
                  <Text style={styles.pickerModalTitle}>Select Date</Text>
                  <DateTimePicker
                    value={tempDateValue}
                    mode="date"
                    display="spinner"
                    onChange={handleDateChange}
                    style={styles.pickerWheel}
                  />
                  <View style={styles.pickerModalFooter}>
                    <Pressable onPress={() => setShowDatePicker(false)} style={styles.pickerModalBtnSecondary}>
                      <Text style={styles.pickerModalBtnTextSecondary}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        applyDate(tempDateValue);
                        setShowDatePicker(false);
                      }}
                      style={styles.pickerModalBtnPrimary}
                    >
                      <Text style={styles.pickerModalBtnTextPrimary}>Done</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          )}

          {isIOS && showStartPicker && (
            <Modal transparent animationType="fade" visible onRequestClose={() => setShowStartPicker(false)}>
              <Pressable style={styles.pickerModalBackdrop} onPress={() => setShowStartPicker(false)}>
                <Pressable style={styles.pickerModalSheet} onPress={(e) => e.stopPropagation()}>
                  <Text style={styles.pickerModalTitle}>Select Start Time</Text>
                  <DateTimePicker
                    value={tempStartTimeValue}
                    mode="time"
                    display="spinner"
                    onChange={handleStartTimeChange}
                    style={styles.pickerWheel}
                  />
                  <View style={styles.pickerModalFooter}>
                    <Pressable onPress={() => setShowStartPicker(false)} style={styles.pickerModalBtnSecondary}>
                      <Text style={styles.pickerModalBtnTextSecondary}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        applyStartTime(tempStartTimeValue);
                        setShowStartPicker(false);
                      }}
                      style={styles.pickerModalBtnPrimary}
                    >
                      <Text style={styles.pickerModalBtnTextPrimary}>Done</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          )}

          {isIOS && showEndPicker && (
            <Modal transparent animationType="fade" visible onRequestClose={() => setShowEndPicker(false)}>
              <Pressable style={styles.pickerModalBackdrop} onPress={() => setShowEndPicker(false)}>
                <Pressable style={styles.pickerModalSheet} onPress={(e) => e.stopPropagation()}>
                  <Text style={styles.pickerModalTitle}>Select End Time</Text>
                  <DateTimePicker
                    value={tempEndTimeValue}
                    mode="time"
                    display="spinner"
                    onChange={handleEndTimeChange}
                    style={styles.pickerWheel}
                  />
                  <View style={styles.pickerModalFooter}>
                    <Pressable onPress={() => setShowEndPicker(false)} style={styles.pickerModalBtnSecondary}>
                      <Text style={styles.pickerModalBtnTextSecondary}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        applyEndTime(tempEndTimeValue);
                        setShowEndPicker(false);
                      }}
                      style={styles.pickerModalBtnPrimary}
                    >
                      <Text style={styles.pickerModalBtnTextPrimary}>Done</Text>
                    </Pressable>
                  </View>
                </Pressable>
              </Pressable>
            </Modal>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
  pickerWheel: { height: 180 },
  helperText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
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
});
