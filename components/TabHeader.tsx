import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";

interface TabHeaderProps {
	title: string;
	showProfileButton?: boolean;
}

export function TabHeader({ title, showProfileButton = true }: TabHeaderProps) {
	return (
		<View className="flex-row items-center justify-between px-4 pt-3 pb-2 bg-white border-b border-slate-200">
			<Text className="text-2xl font-extrabold text-slate-900">{title}</Text>
			{showProfileButton && (
				<Pressable
					onPress={() => router.push("/profile")}
					className="h-10 w-10 rounded-full bg-slate-900 items-center justify-center"
					style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
				>
					<Text className="text-lg">👤</Text>
				</Pressable>
			)}
		</View>
	);
}
