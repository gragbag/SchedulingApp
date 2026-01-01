import { Pressable, Text, TextInput, View } from "react-native";

export default function ProfileScreen() {
	return (
		<View className="flex-1 bg-slate-50 px-4 pt-6">
			{/* Header
			<View className="flex-row items-center mb-6">
				<Pressable onPress={() => router.back()} className="mr-3">
					<Text className="text-lg">←</Text>
				</Pressable>
				<Text className="text-xl font-extrabold text-slate-900">Profile</Text>
			</View> */}

			{/* Avatar */}
			<View className="items-center mb-6">
				<View className="h-24 w-24 rounded-full bg-slate-200 items-center justify-center">
					<Text className="text-4xl">🙂</Text>
				</View>

				<Pressable className="mt-2">
					<Text className="text-sm font-bold text-slate-600">Change photo</Text>
				</Pressable>
			</View>

			{/* Name */}
			<View className="mb-4">
				<Text className="text-xs font-extrabold uppercase text-slate-500 mb-1">Name</Text>
				<TextInput defaultValue="Your Name" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base" />
			</View>

			{/* About Me */}
			<View className="mb-6">
				<Text className="text-xs font-extrabold uppercase text-slate-500 mb-1">About Me</Text>
				<TextInput multiline defaultValue="Tell people a bit about yourself…" className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-base h-28" />
			</View>

			{/* Save button */}
			<Pressable className="rounded-xl bg-slate-900 py-3 items-center">
				<Text className="text-white font-extrabold text-base">Save Profile</Text>
			</Pressable>
		</View>
	);
}
