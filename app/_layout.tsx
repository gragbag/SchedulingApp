import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
	const colorScheme = useColorScheme();

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Screen
					name="(tabs)"
					options={{
						headerShown: false,
					}}
				/>
				{/* Event detail (normal push) */}
				<Stack.Screen name="meeting/[id]" options={{ title: "Event", headerBackTitle: "Back" }} />

				{/* Create screen as a modal */}
				<Stack.Screen name="modal/create" options={{ presentation: "modal", title: "New Event" }} />
			</Stack>

			<StatusBar style="auto" />
		</ThemeProvider>
	);
}
