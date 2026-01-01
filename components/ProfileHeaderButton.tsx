import { router } from "expo-router";
import { Pressable, Text } from "react-native";

export function ProfileHeaderButton() {
	return (
		<Pressable onPress={() => router.push("/profile")} style={{ marginRight: 12 }}>
			<Text style={{ fontSize: 18 }}>👤</Text>
		</Pressable>
	);
}
