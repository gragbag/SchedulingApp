import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions } from "react-native";
import { useAppStore } from "../lib/store";

type Mode = "login" | "signup";
type SlideKey = "home" | "social" | "calendar";

const SLIDES: Array<{
	key: SlideKey;
	title: string;
	subtitle: string;
	tag: string;
}> = [
	{
		key: "home",
		title: "Your day, already organized",
		subtitle: "See what matters now and what to prep next without digging.",
		tag: "Home",
	},
	{
		key: "social",
		title: "Invites that feel effortless",
		subtitle: "Track RSVP momentum and keep everyone in the loop fast.",
		tag: "Social",
	},
	{
		key: "calendar",
		title: "Focus time stays protected",
		subtitle: "Block deep work and keep calendar invites synced in one place.",
		tag: "Calendar",
	},
];

const PREVIEW_HEIGHT = Platform.OS === "ios" ? 168 : 176;
const PREVIEW_PADDING = Platform.OS === "ios" ? 12 : 16;
const PREVIEW_GAP = Platform.OS === "ios" ? 8 : 12;
const PREVIEW_DAY_SIZE = Platform.OS === "ios" ? 22 : 28;

function SlidePreview({ variant }: { variant: SlideKey }) {
	if (variant === "home") {
		return (
			<View style={{ height: PREVIEW_HEIGHT, padding: PREVIEW_PADDING }} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
				<View className="flex-1 justify-between">
					<View>
						<View className="flex-row items-center justify-between">
							<Text className="text-sm font-extrabold text-slate-900">Your Schedule</Text>
							<Text className="text-xs font-semibold text-slate-400">Today</Text>
						</View>
						<View style={{ marginTop: PREVIEW_GAP }} className="flex-row gap-2">
							<View className="flex-1 rounded-xl bg-blue-50 px-3 py-2">
								<Text className="text-xs font-semibold text-blue-600">2 Today</Text>
							</View>
							<View className="flex-1 rounded-xl bg-violet-50 px-3 py-2">
								<Text className="text-xs font-semibold text-violet-600">4 This week</Text>
							</View>
							<View className="flex-1 rounded-xl bg-emerald-50 px-3 py-2">
								<Text className="text-xs font-semibold text-emerald-600">0 Conflicts</Text>
							</View>
						</View>
					</View>
					<View className="rounded-2xl bg-slate-900 px-4 py-3">
						<Text className="text-xs font-semibold text-slate-300">Next up</Text>
						<Text className="text-sm font-extrabold text-white">Study session at 2:00 PM</Text>
					</View>
				</View>
			</View>
		);
	}

	if (variant === "social") {
		return (
			<View style={{ height: PREVIEW_HEIGHT, padding: PREVIEW_PADDING }} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
				<View className="flex-1 justify-between">
					<View>
						<View className="flex-row items-center justify-between">
							<Text className="text-sm font-extrabold text-slate-900">Invites</Text>
							<View className="rounded-full bg-slate-100 px-3 py-1">
								<Text className="text-xs font-semibold text-slate-600">3 pending</Text>
							</View>
						</View>
						<View style={{ marginTop: PREVIEW_GAP }} className="flex-row gap-2">
							<View className="rounded-full bg-emerald-50 px-3 py-1">
								<Text className="text-xs font-semibold text-emerald-600">12 going</Text>
							</View>
							<View className="rounded-full bg-amber-50 px-3 py-1">
								<Text className="text-xs font-semibold text-amber-600">4 maybe</Text>
							</View>
							<View className="rounded-full bg-rose-50 px-3 py-1">
								<Text className="text-xs font-semibold text-rose-500">1 declined</Text>
							</View>
						</View>
						<View style={{ marginTop: PREVIEW_GAP }} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
							<Text className="text-sm font-extrabold text-slate-900">Group study hall</Text>
							<Text className="text-xs font-semibold text-slate-500">You have not replied</Text>
						</View>
					</View>
					<View className="flex-row items-center justify-between">
						<Text className="text-xs font-semibold text-slate-400">Tap to RSVP</Text>
						<View className="h-6 w-6 items-center justify-center rounded-full bg-slate-900">
							<Text className="text-xs font-extrabold text-white">+</Text>
						</View>
					</View>
				</View>
			</View>
		);
	}

	return (
		<View style={{ height: PREVIEW_HEIGHT, padding: PREVIEW_PADDING }} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
			<View className="flex-1 justify-between">
				<View>
					<View className="flex-row items-center justify-between">
						<Text className="text-sm font-extrabold text-slate-900">Calendar</Text>
						<Text className="text-xs font-semibold text-slate-400">Wed</Text>
					</View>
					<View style={{ marginTop: PREVIEW_GAP }} className="flex-row justify-between">
						{["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
							<View
								key={`${day}-${index}`}
								style={{ width: PREVIEW_DAY_SIZE, height: PREVIEW_DAY_SIZE }}
								className="items-center justify-center rounded-full bg-slate-100"
							>
								<Text className="text-[10px] font-semibold text-slate-500">{day}</Text>
							</View>
						))}
					</View>
				</View>
				<View className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-3">
					<Text className="text-xs font-semibold text-violet-700">Focus block</Text>
					<Text className="text-sm font-extrabold text-slate-900">10:00 AM - 12:00 PM</Text>
				</View>
			</View>
		</View>
	);
}

export default function AuthScreen() {
	const { width, height } = useWindowDimensions();
	const [activeIndex, setActiveIndex] = useState(0);
	const [mode, setMode] = useState<Mode>("login");
	const [fullName, setFullName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const setLoggedIn = useAppStore((s) => s.setLoggedIn);

	const isSignup = mode === "signup";
	const sliderHeight = useMemo(() => {
		if (Platform.OS === "ios") return Math.min(height * 0.42, 320);
		return Math.min(height * 0.55, 420);
	}, [height]);
	const sliderTopPadding = Platform.OS === "ios" ? 6 : 0;
	const slideTopPadding = Platform.OS === "ios" ? 0 : 24;
	const topOffset = Platform.OS === "ios" ? Math.round(height * 0.04 + 60) : 0;
	const dotsBottomSpacing = Platform.OS === "ios" ? 12 : 16;

	return (
		<View className="flex-1 bg-slate-50">
			<ScrollView contentContainerClassName="pb-8" contentContainerStyle={{ paddingTop: topOffset }}>
				<View style={{ height: sliderHeight, paddingTop: sliderTopPadding }}>
					<ScrollView
						horizontal
						pagingEnabled
						showsHorizontalScrollIndicator={false}
						onMomentumScrollEnd={(event) => {
							const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
							setActiveIndex(nextIndex);
						}}
					>
						{SLIDES.map((slide) => (
							<View key={slide.key} style={{ width, paddingTop: slideTopPadding }} className="px-5">
								<View className="rounded-3xl bg-slate-900 p-5">
									<View className="flex-row items-center justify-between">
										<Text className="text-xs font-semibold text-slate-300">{slide.tag}</Text>
										<View className="rounded-full bg-slate-800 px-3 py-1">
											<Text className="text-[10px] font-semibold text-slate-300">Preview</Text>
										</View>
									</View>
									<Text className="mt-2 text-xl font-extrabold text-white">{slide.title}</Text>
									<Text className="mt-2 text-sm font-semibold text-slate-400">{slide.subtitle}</Text>

									<View className="mt-4">
										<SlidePreview variant={slide.key} />
									</View>
								</View>
							</View>
						))}
					</ScrollView>

					<View className="mt-2 flex-row items-center justify-center gap-2">
						{SLIDES.map((slide, index) => (
							<View
								key={slide.key}
								className={[
									"h-2 w-2 rounded-full",
									index === activeIndex ? "bg-slate-900" : "bg-slate-300",
								].join(" ")}
							/>
						))}
					</View>
				</View>

				<View className="px-5" style={{ marginTop: dotsBottomSpacing }}>
					<View className="rounded-3xl border border-slate-200 bg-white p-5">
						<View className="flex-row rounded-full bg-slate-100 p-1">
							<Pressable
								onPress={() => setMode("login")}
								className={[
									"flex-1 items-center rounded-full py-2",
									!isSignup ? "bg-white" : "",
								].join(" ")}
							>
								<Text className={["text-xs font-extrabold", !isSignup ? "text-slate-900" : "text-slate-500"].join(" ")}>
									Log in
								</Text>
							</Pressable>
							<Pressable
								onPress={() => setMode("signup")}
								className={[
									"flex-1 items-center rounded-full py-2",
									isSignup ? "bg-white" : "",
								].join(" ")}
							>
								<Text className={["text-xs font-extrabold", isSignup ? "text-slate-900" : "text-slate-500"].join(" ")}>
									Sign up
								</Text>
							</Pressable>
						</View>

						<View className="mt-4 gap-3">
							{isSignup ? (
								<View>
									<Text className="text-xs font-bold text-slate-500">Full name</Text>
									<TextInput
										value={fullName}
										onChangeText={setFullName}
										placeholder="Your name"
										placeholderTextColor="#94a3b8"
										className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-900"
									/>
								</View>
							) : null}

							<View>
								<Text className="text-xs font-bold text-slate-500">Email</Text>
								<TextInput
									value={email}
									onChangeText={setEmail}
									placeholder="you@example.com"
									placeholderTextColor="#94a3b8"
									autoCapitalize="none"
									keyboardType="email-address"
									className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-900"
								/>
							</View>

							<View>
								<Text className="text-xs font-bold text-slate-500">Password</Text>
								<TextInput
									value={password}
									onChangeText={setPassword}
									placeholder="Minimum 8 characters"
									placeholderTextColor="#94a3b8"
									secureTextEntry
									className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-base text-slate-900"
								/>
							</View>

							{!isSignup ? (
								<Pressable onPress={() => {}} className="items-end">
									<Text className="text-xs font-semibold text-slate-400">Forgot password</Text>
								</Pressable>
							) : null}
						</View>

						<Pressable
							onPress={() => {
								setLoggedIn(true);
								router.replace("/");
							}}
							className="mt-5 rounded-xl bg-slate-900 px-4 py-3"
						>
							<Text className="text-center text-sm font-extrabold text-white">
								{isSignup ? "Create account" : "Log in"}
							</Text>
						</Pressable>

						<Pressable
							onPress={() => {
								setLoggedIn(true);
								router.replace("/");
							}}
							className="mt-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
						>
							<Text className="text-center text-sm font-extrabold text-slate-900">Continue as guest</Text>
						</Pressable>

						<Text className="mt-3 text-center text-xs font-semibold text-slate-400">
							By continuing you agree to the Terms and Privacy Policy.
						</Text>
					</View>
				</View>
			</ScrollView>
		</View>
	);
}
