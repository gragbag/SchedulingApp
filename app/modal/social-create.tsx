import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CreateInvitePayload, FRIENDS, GROUPS, buildLocalDateTime } from "../../lib/social";
import { useAppStore } from "../../lib/store";

type SendTo = "group" | "friends";
type InviteKind = "social" | "calendar";

type FormState = {
	sendTo: SendTo | null;
	selectedGroup: string | null;
	selectedFriends: string[];
	type: InviteKind;
	title: string;
	location: string;
	date: string;
	startTime: string;
	endTime: string;
	notes: string;
};

const pad2 = (value: number) => value.toString().padStart(2, "0");
const formatDateValue = (date: Date) =>
	`${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
const formatTimeValue = (date: Date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;

const makeInitialForm = (date: Date, startTime: Date, endTime: Date): FormState => ({
	sendTo: null,
	selectedGroup: null,
	selectedFriends: [],
	type: "social",
	title: "",
	location: "",
	date: formatDateValue(date),
	startTime: formatTimeValue(startTime),
	endTime: formatTimeValue(endTime),
	notes: "",
});

export default function SocialCreateModal() {
	const createInvite = useAppStore((s) => s.createInvite);

	const groups = useMemo(
		() =>
			GROUPS.map((g) => ({
				id: g.id,
				name: g.name,
				members: g.totalMembers,
				icon: "📚",
			})),
		[]
	);

	const friends = useMemo(
		() =>
			FRIENDS.map((f) => ({
				id: f.id,
				name: f.name,
				icon: "👤",
			})),
		[]
	);

	const initialDateState = useMemo(() => {
		const now = new Date();
		const start = new Date(now);
		const end = new Date(now);
		end.setHours(end.getHours() + 1);
		return { date: now, start, end };
	}, []);

	const [step, setStep] = useState(1);
	const [dateValue, setDateValue] = useState<Date>(initialDateState.date);
	const [startTimeValue, setStartTimeValue] = useState<Date>(initialDateState.start);
	const [endTimeValue, setEndTimeValue] = useState<Date>(initialDateState.end);
	const [tempDateValue, setTempDateValue] = useState<Date>(initialDateState.date);
	const [tempStartTimeValue, setTempStartTimeValue] = useState<Date>(initialDateState.start);
	const [tempEndTimeValue, setTempEndTimeValue] = useState<Date>(initialDateState.end);
	const [showDatePicker, setShowDatePicker] = useState(false);
	const [showStartPicker, setShowStartPicker] = useState(false);
	const [showEndPicker, setShowEndPicker] = useState(false);
	const [formData, setFormData] = useState<FormState>(() =>
		makeInitialForm(initialDateState.date, initialDateState.start, initialDateState.end)
	);
	const isIOS = Platform.OS === "ios";

	const toggleFriend = (friendId: string) => {
		setFormData((prev) => ({
			...prev,
			selectedFriends: prev.selectedFriends.includes(friendId)
				? prev.selectedFriends.filter((id) => id !== friendId)
				: [...prev.selectedFriends, friendId],
		}));
	};

	const formatDateLabel = (date: Date) =>
		date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

	const formatTimeLabel = (date: Date) =>
		date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

	const applyDate = (selected: Date) => {
		setDateValue(selected);
		setFormData((prev) => ({ ...prev, date: formatDateValue(selected) }));
	};

	const applyStartTime = (selected: Date) => {
		setStartTimeValue(selected);
		setFormData((prev) => ({ ...prev, startTime: formatTimeValue(selected) }));
	};

	const applyEndTime = (selected: Date) => {
		setEndTimeValue(selected);
		setFormData((prev) => ({ ...prev, endTime: formatTimeValue(selected) }));
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

	const canGoNext = () => {
		if (step === 1) return !!formData.type;
		if (step === 2) return !!formData.sendTo;
		if (step === 3) {
			if (formData.sendTo === "group") return !!formData.selectedGroup;
			if (formData.sendTo === "friends") return formData.selectedFriends.length > 0;
			return false;
		}
		if (step === 4) {
			const start = buildLocalDateTime(formData.date, formData.startTime);
			const end = buildLocalDateTime(formData.date, formData.endTime);
			return (
				!!formData.title.trim() &&
				!!formData.location.trim() &&
				!!formData.date.trim() &&
				!!formData.startTime.trim() &&
				!!formData.endTime.trim() &&
				!!start &&
				!!end &&
				end.getTime() >= start.getTime()
			);
		}
		return false;
	};

	const goNext = () => {
		if (!canGoNext()) return;
		setStep((s) => Math.min(4, s + 1));
	};

	const goBack = () => setStep((s) => Math.max(1, s - 1));

	const handleCreate = () => {
		if (!canGoNext() || !formData.sendTo) return;

		const payload: CreateInvitePayload = {
			eventType: formData.type,
			sendTo: formData.sendTo,
			selectedGroupId: formData.selectedGroup,
			selectedFriendIds: formData.selectedFriends,
			title: formData.title,
			location: formData.location,
			date: formData.date,
			startTime: formData.startTime,
			endTime: formData.endTime,
			notes: formData.notes,
		};

		const ok = createInvite(payload);
		if (!ok) return;

		Alert.alert("✅ Invite created successfully!");
		router.back();
	};

	return (
		<Pressable style={styles.modalBackdrop} onPress={() => router.back()}>
			<Pressable onPress={(e) => e.stopPropagation()} style={styles.createModalSheet}>
				<View style={styles.createModalHeader}>
					<Text style={styles.createModalTitle}>Create Invite</Text>
					<Pressable onPress={() => router.back()} style={styles.closeXBtn}>
						<Text style={styles.closeXText}>×</Text>
					</Pressable>
				</View>

				<View style={styles.stepDotsRow}>
					{[1, 2, 3, 4].map((n) => (
						<View
							key={n}
							style={[
								styles.stepDot,
								step === n ? styles.stepDotActive : step > n ? styles.stepDotDone : styles.stepDotIdle,
							]}
						/>
					))}
				</View>

				<ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyPad}>
					{step === 1 && (
						<View style={styles.spaceY12}>
							<View style={styles.centerHeader}>
								<Text style={styles.bigHeader}>What are you creating?</Text>
								<Text style={styles.subHeader}>Choose Social invite or Calendar event</Text>
							</View>

							<Pressable
								onPress={() => setFormData((p) => ({ ...p, type: "social" }))}
								style={[
									styles.choiceCard,
									formData.type === "social" ? styles.choiceSelectedPurple : styles.choiceUnselected,
								]}
							>
								<View style={styles.rowGap12}>
									<Text style={styles.text4xl}>🎉</Text>
									<View style={styles.flex1}>
										<Text style={styles.choiceTitle}>Social Invite</Text>
										<Text style={styles.choiceDesc}>RSVPs, going/maybe/can&apos;t</Text>
									</View>
									{formData.type === "social" && <Text style={styles.choiceCheckPurple}>✓</Text>}
								</View>
							</Pressable>

							<Pressable
								onPress={() => setFormData((p) => ({ ...p, type: "calendar" }))}
								style={[
									styles.choiceCard,
									formData.type === "calendar" ? styles.choiceSelectedBlue : styles.choiceUnselected,
								]}
							>
								<View style={styles.rowGap12}>
									<Text style={styles.text4xl}>📅</Text>
									<View style={styles.flex1}>
										<Text style={styles.choiceTitle}>Calendar Event</Text>
										<Text style={styles.choiceDesc}>Accept/decline + reminders</Text>
									</View>
									{formData.type === "calendar" && <Text style={styles.choiceCheckBlue}>✓</Text>}
								</View>
							</Pressable>
						</View>
					)}

					{step === 2 && (
						<View style={styles.spaceY12}>
							<View style={styles.centerHeader}>
								<Text style={styles.bigHeader}>Who are you sending to?</Text>
								<Text style={styles.subHeader}>Choose group or friends</Text>
							</View>

							<Pressable
								onPress={() => setFormData((p) => ({ ...p, sendTo: "group" }))}
								style={[
									styles.choiceCard,
									formData.sendTo === "group" ? styles.choiceSelectedBlue : styles.choiceUnselected,
								]}
							>
								<View style={styles.rowGap12}>
									<Text style={styles.text4xl}>📚</Text>
									<View style={styles.flex1}>
										<Text style={styles.choiceTitle}>Send to a Group</Text>
										<Text style={styles.choiceDesc}>Share with everyone in a group</Text>
									</View>
									{formData.sendTo === "group" && <Text style={styles.choiceCheckBlue}>✓</Text>}
								</View>
							</Pressable>

							<Pressable
								onPress={() => setFormData((p) => ({ ...p, sendTo: "friends" }))}
								style={[
									styles.choiceCard,
									formData.sendTo === "friends" ? styles.choiceSelectedGreen : styles.choiceUnselected,
								]}
							>
								<View style={styles.rowGap12}>
									<Text style={styles.text4xl}>👤</Text>
									<View style={styles.flex1}>
										<Text style={styles.choiceTitle}>Send to Friends</Text>
										<Text style={styles.choiceDesc}>Pick specific friends</Text>
									</View>
									{formData.sendTo === "friends" && <Text style={styles.choiceCheckGreen}>✓</Text>}
								</View>
							</Pressable>
						</View>
					)}

					{step === 3 && formData.sendTo === "group" && (
						<View style={styles.spaceY12}>
							<View style={styles.centerHeader}>
								<Text style={styles.bigHeader}>Select a group</Text>
								<Text style={styles.subHeader}>Pick the group to invite</Text>
							</View>

							<ScrollView
								style={styles.listBox}
								contentContainerStyle={styles.listBoxContent}
								showsVerticalScrollIndicator={false}
								nestedScrollEnabled
							>
								{groups.map((g) => {
									const selected = g.id === formData.selectedGroup;
									return (
										<Pressable
											key={g.id}
											onPress={() => setFormData((p) => ({ ...p, selectedGroup: g.id }))}
											style={[
												styles.listItem,
												selected ? styles.listItemSelectedBlue : styles.listItemUnselected,
											]}
										>
											<View style={styles.rowGap12}>
												<Text style={styles.text4xl}>{g.icon}</Text>
												<View style={styles.flex1}>
													<Text style={styles.listItemTitle}>{g.name}</Text>
													<Text style={styles.listItemSub}>{g.members} members</Text>
												</View>
												{selected && <Text style={styles.choiceCheckBlue}>✓</Text>}
											</View>
										</Pressable>
									);
								})}
							</ScrollView>
						</View>
					)}

					{step === 3 && formData.sendTo === "friends" && (
						<View style={styles.spaceY12}>
							<View style={styles.centerHeader}>
								<Text style={styles.bigHeader}>Select friends</Text>
								<Text style={styles.subHeader}>
									{formData.selectedFriends.length > 0
										? `${formData.selectedFriends.length} selected`
										: "Tap to select friends"}
								</Text>
							</View>

							<ScrollView
								style={styles.listBox}
								contentContainerStyle={styles.listBoxContent}
								showsVerticalScrollIndicator={false}
								nestedScrollEnabled
							>
								{friends.map((f) => {
									const selected = formData.selectedFriends.includes(f.id);
									return (
										<Pressable
											key={f.id}
											onPress={() => toggleFriend(f.id)}
											style={[
												styles.listItem,
												selected ? styles.listItemSelectedGreen : styles.listItemUnselected,
											]}
										>
											<View style={styles.rowGap12}>
												<Text style={styles.text4xl}>{f.icon}</Text>
												<View style={styles.flex1}>
													<Text style={styles.listItemTitle}>{f.name}</Text>
												</View>
												{selected && <Text style={styles.choiceCheckGreen}>✓</Text>}
											</View>
										</Pressable>
									);
								})}
							</ScrollView>
						</View>
					)}

					{step === 4 && (
						<View style={styles.spaceY12}>
							<View style={styles.centerHeader}>
								<Text style={styles.bigHeader}>Event details</Text>
								<Text style={styles.subHeader}>Fill in the info below</Text>
							</View>

							<View style={styles.formField}>
								<View style={styles.labelRow}>
									<Text style={styles.label}>Title</Text>
									<Text style={styles.requiredAsterisk}>*</Text>
								</View>
								<TextInput
									placeholder="e.g., Study Session"
									value={formData.title}
									onChangeText={(t) => setFormData((p) => ({ ...p, title: t }))}
									style={styles.input}
								/>
							</View>

							<View style={styles.formField}>
								<View style={styles.labelRow}>
									<Text style={styles.label}>Location</Text>
									<Text style={styles.requiredAsterisk}>*</Text>
								</View>
								<TextInput
									placeholder="e.g., Library Room 304"
									value={formData.location}
									onChangeText={(t) => setFormData((p) => ({ ...p, location: t }))}
									style={styles.input}
								/>
							</View>

							<View style={styles.formField}>
								<View style={styles.labelRow}>
									<Text style={styles.label}>Date</Text>
									<Text style={styles.requiredAsterisk}>*</Text>
								</View>
								<Pressable
									onPress={openDatePicker}
									style={styles.pickerField}
								>
									<Text style={styles.pickerValueText}>{formatDateLabel(dateValue)}</Text>
									{!isIOS && (
										<Text style={styles.pickerChevron}>{showDatePicker ? "▲" : "▼"}</Text>
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

							<View style={styles.spaceY12}>
								<View style={styles.formField}>
									<View style={styles.labelRow}>
										<Text style={styles.label}>Start time</Text>
										<Text style={styles.requiredAsterisk}>*</Text>
									</View>
									<Pressable
										onPress={openStartPicker}
										style={styles.pickerField}
									>
										<Text style={styles.pickerValueText}>{formatTimeLabel(startTimeValue)}</Text>
										{!isIOS && (
											<Text style={styles.pickerChevron}>{showStartPicker ? "▲" : "▼"}</Text>
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

								<View style={styles.formField}>
									<View style={styles.labelRow}>
										<Text style={styles.label}>End time</Text>
										<Text style={styles.requiredAsterisk}>*</Text>
									</View>
									<Pressable
										onPress={openEndPicker}
										style={styles.pickerField}
									>
										<Text style={styles.pickerValueText}>{formatTimeLabel(endTimeValue)}</Text>
										{!isIOS && (
											<Text style={styles.pickerChevron}>{showEndPicker ? "▲" : "▼"}</Text>
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

							<View style={styles.formField}>
								<Text style={styles.label}>Notes (optional)</Text>
								<TextInput
									placeholder="Add extra details..."
									value={formData.notes}
									onChangeText={(t) => setFormData((p) => ({ ...p, notes: t }))}
									style={[styles.input, styles.textArea]}
									multiline
								/>
							</View>
						</View>
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
									<Pressable onPress={() => setShowDatePicker(false)} style={styles.secondaryBtnStrong}>
										<Text style={styles.secondaryBtnStrongText}>Cancel</Text>
									</Pressable>
									<Pressable
										onPress={() => {
											applyDate(tempDateValue);
											setShowDatePicker(false);
										}}
										style={styles.primaryBtnBlue}
									>
										<Text style={styles.primaryBtnBlueText}>Done</Text>
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
									<Pressable onPress={() => setShowStartPicker(false)} style={styles.secondaryBtnStrong}>
										<Text style={styles.secondaryBtnStrongText}>Cancel</Text>
									</Pressable>
									<Pressable
										onPress={() => {
											applyStartTime(tempStartTimeValue);
											setShowStartPicker(false);
										}}
										style={styles.primaryBtnBlue}
									>
										<Text style={styles.primaryBtnBlueText}>Done</Text>
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
									<Pressable onPress={() => setShowEndPicker(false)} style={styles.secondaryBtnStrong}>
										<Text style={styles.secondaryBtnStrongText}>Cancel</Text>
									</Pressable>
									<Pressable
										onPress={() => {
											applyEndTime(tempEndTimeValue);
											setShowEndPicker(false);
										}}
										style={styles.primaryBtnBlue}
									>
										<Text style={styles.primaryBtnBlueText}>Done</Text>
									</Pressable>
								</View>
							</Pressable>
						</Pressable>
					</Modal>
				)}

				<View style={styles.createModalFooter}>
					<View style={styles.formRow}>
						<Pressable onPress={step > 1 ? goBack : () => router.back()} style={[styles.footerBtn, styles.footerBtnSecondary]}>
							<Text style={styles.footerBtnTextSecondary}>{step > 1 ? "Back" : "Cancel"}</Text>
						</Pressable>
						{step < 4 ? (
							<Pressable
								onPress={goNext}
								disabled={!canGoNext()}
								style={[styles.footerBtn, !canGoNext() ? styles.footerBtnDisabled : styles.footerBtnPrimary]}
							>
								<Text style={styles.footerBtnTextPrimary}>Next</Text>
							</Pressable>
						) : (
							<Pressable
								onPress={handleCreate}
								disabled={!canGoNext()}
								style={[styles.footerBtn, !canGoNext() ? styles.footerBtnDisabled : styles.footerBtnPrimary]}
							>
								<Text style={styles.footerBtnTextPrimary}>Create</Text>
							</Pressable>
						)}
					</View>
				</View>
			</Pressable>
		</Pressable>
	);
}

const styles = StyleSheet.create({
	flex1: { flex: 1 },
	rowGap12: { flexDirection: "row", alignItems: "center", gap: 12 },
	spaceY12: { marginTop: 8, gap: 12 },
	text4xl: { fontSize: 36 },

	modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", padding: 16, justifyContent: "center" },
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

	modalBody: { flexGrow: 0 },
	modalBodyPad: { padding: 16 },

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

	listBox: { maxHeight: 420 },
	listBoxContent: { gap: 10 },
	listItem: { borderRadius: 18, borderWidth: 2, padding: 14, backgroundColor: "#ffffff" },
	listItemUnselected: { borderColor: "#e2e8f0" },
	listItemSelectedBlue: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
	listItemSelectedGreen: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
	listItemTitle: { fontWeight: "900", color: "#0f172a" },
	listItemSub: { marginTop: 4, color: "#64748b" },

	formField: { gap: 8 },
	labelRow: { flexDirection: "row", alignItems: "center" },
	formRow: { flexDirection: "row", gap: 12 },
	label: { fontSize: 12, fontWeight: "800", color: "#334155", textTransform: "uppercase" },
	requiredAsterisk: { color: "#dc2626", fontWeight: "900", fontSize: 14, marginLeft: 4 },
	input: { borderWidth: 2, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#ffffff", color: "#0f172a", fontWeight: "700" },
	textArea: { height: 110, textAlignVertical: "top" },

	pickerField: { borderWidth: 2, borderColor: "#e2e8f0", borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#ffffff", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
	pickerValueText: { fontWeight: "800", color: "#0f172a" },
	pickerChevron: { fontSize: 12, color: "#64748b" },
	pickerWrap: { marginTop: 8, borderWidth: 2, borderColor: "#e2e8f0", borderRadius: 14, backgroundColor: "#ffffff", overflow: "hidden", minHeight: 180 },
	pickerWheel: { height: 180 },
	pickerModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 16 },
	pickerModalSheet: { backgroundColor: "#ffffff", borderRadius: 18, padding: 16 },
	pickerModalTitle: { fontSize: 16, fontWeight: "900", color: "#0f172a", marginBottom: 8 },
	pickerModalFooter: { flexDirection: "row", gap: 12, marginTop: 12 },

	createModalFooter: { borderTopWidth: 1, borderColor: "#e2e8f0", padding: 14 },
	footerBtn: { flex: 1, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
	footerBtnPrimary: { backgroundColor: "#0f172a" },
	footerBtnSecondary: { backgroundColor: "#ffffff", borderWidth: 2, borderColor: "#e2e8f0" },
	footerBtnDisabled: { backgroundColor: "#e2e8f0" },
	footerBtnTextPrimary: { fontWeight: "900", color: "#ffffff" },
	footerBtnTextSecondary: { fontWeight: "900", color: "#0f172a" },
});
