import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Platform, Pressable, SafeAreaView, ScrollView, Text, TextInput, View } from "react-native";
import { useAppStore } from "../lib/store";

const DEFAULT_AVATAR = require("../assets/images/default-avatar.png");
const AVATAR_CHOICES = ["🙂", "😄", "😎", "🥳", "🤓", "🤠", "😇", "🤖", "🦊", "🐼"];

export default function ProfileScreen() {
	const userProfile = useAppStore((s) => s.userProfile);
	const updateProfile = useAppStore((s) => s.updateProfile);

	const [profilePicture, setProfilePicture] = useState(userProfile.profilePicture);
	const [username, setUsername] = useState(userProfile.username);
	const [name, setName] = useState(userProfile.name);
	const [aboutMe, setAboutMe] = useState(userProfile.aboutMe);

	useEffect(() => {
		setProfilePicture(userProfile.profilePicture);
		setUsername(userProfile.username);
		setName(userProfile.name);
		setAboutMe(userProfile.aboutMe);
	}, [userProfile.aboutMe, userProfile.name, userProfile.profilePicture, userProfile.username]);

	const handleEmojiSelect = (emoji: string) => {
		setProfilePicture(emoji);
		updateProfile({ profilePicture: emoji });
	};

	const handleUsernameChange = (value: string) => {
		setUsername(value);
		updateProfile({ username: value });
	};

	const handleNameChange = (value: string) => {
		setName(value);
		updateProfile({ name: value });
	};

	const handleAboutChange = (value: string) => {
		setAboutMe(value);
		updateProfile({ aboutMe: value });
	};

	const hasCustomAvatar = Boolean(profilePicture);

	return (
		<SafeAreaView className="flex-1 bg-white">
			<ScrollView contentContainerClassName="px-4 pb-10">
				<View className="flex-row items-center py-4">
					<Pressable
						onPress={() => router.back()}
						className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
						style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
					>
						<Text className="text-lg font-bold text-slate-900">&lt;</Text>
					</Pressable>
				</View>

				<View className="items-center">
					<View className="h-32 w-32 rounded-full bg-slate-100 items-center justify-center overflow-hidden">
						{hasCustomAvatar ? (
							<Text className="text-7xl" style={{ marginTop: Platform.OS === "ios" ? -4 : 0 }}>
								{profilePicture}
							</Text>
						) : (
							<Image source={DEFAULT_AVATAR} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
						)}
					</View>

					<Text className="mt-4 text-xs font-bold text-slate-500">Username</Text>
					<TextInput
						value={username}
						onChangeText={handleUsernameChange}
						autoCapitalize="none"
						autoCorrect={false}
						placeholder="@yourusername"
						className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
					/>

					<Text className="mt-4 text-xs font-bold text-slate-500">Name</Text>
					<TextInput
						value={name}
						onChangeText={handleNameChange}
						placeholder="Your Name"
						className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
					/>

					<Text className="mt-4 text-xs font-bold text-slate-500">About me</Text>
					<TextInput
						value={aboutMe}
						onChangeText={handleAboutChange}
						placeholder="Tell people a bit about yourself..."
						maxLength={200}
						multiline
						textAlignVertical="top"
						className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-900"
						style={{ minHeight: 120 }}
					/>
					<View className="w-full items-end">
						<Text className="mt-1 text-xs font-semibold text-slate-400">{aboutMe.length}/200</Text>
					</View>

					<Text className="mt-6 text-sm font-bold text-slate-600">Choose your avatar</Text>
					<View className="mt-3 flex-row flex-wrap justify-center gap-4">
						{AVATAR_CHOICES.map((emoji) => (
							<Pressable
								key={emoji}
								onPress={() => handleEmojiSelect(emoji)}
								className={`h-16 w-16 rounded-full items-center justify-center ${
									profilePicture === emoji ? "bg-slate-900" : "bg-slate-100"
								}`}
								style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
							>
								<Text className="text-3xl" style={{ marginTop: Platform.OS === "ios" ? -2 : 0 }}>
									{emoji}
								</Text>
							</Pressable>
						))}
					</View>
				</View>
			</ScrollView>
		</SafeAreaView>
	);
}
