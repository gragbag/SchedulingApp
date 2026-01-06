import { router } from "expo-router";
import { Image, Platform, Pressable, Text } from "react-native";
import { useAppStore } from "../lib/store";

const DEFAULT_AVATAR = require("../assets/images/default-avatar.png");

export function ProfileHeaderButton() {
	const profilePicture = useAppStore((s) => s.userProfile.profilePicture);
	const hasCustomAvatar = Boolean(profilePicture);

	return (
		<Pressable
			onPress={() => router.push("/profile")}
			className="h-10 w-10 rounded-full bg-slate-900 items-center justify-center mr-3 overflow-hidden"
			style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
		>
			{hasCustomAvatar ? (
				<Text className="text-lg" style={{ marginTop: Platform.OS === "ios" ? -2 : 0 }}>
					{profilePicture}
				</Text>
			) : (
				<Image source={DEFAULT_AVATAR} style={{ width: 32, height: 32 }} resizeMode="cover" />
			)}
		</Pressable>
	);
}
