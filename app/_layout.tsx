import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

import { useColorScheme } from "@/hooks/use-color-scheme";

export default function RootLayout() {
	const colorScheme = useColorScheme();

	return (
		<ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
			<Stack>
				<Stack.Screen name="auth" options={{ headerShown: false }} />
				<Stack.Screen
					name="(tabs)"
					options={{
						headerShown: false,
					}}
				/>
				{/* Profile screen */}
				<Stack.Screen name="profile" options={{ headerShown: false }} />

				{/* Event detail (normal push) */}
				<Stack.Screen name="meeting/[id]" options={{ title: "Event", headerBackTitle: "Back" }} />
				<Stack.Screen name="history/social-expired" options={{ title: "History", headerBackTitle: "Back" }} />
				<Stack.Screen name="history/social-answered" options={{ title: "Edit", headerBackTitle: "Back" }} />
				<Stack.Screen name="history/social-sent" options={{ title: "Sent", headerBackTitle: "Back" }} />

				{/* Create screen as a modal */}
				<Stack.Screen name="modal/create" options={{ presentation: "modal", title: "New Event" }} />
				<Stack.Screen name="modal/social-create" options={{ presentation: "transparentModal", headerShown: false }} />
			</Stack>

			<StatusBar style="auto" />
		</ThemeProvider>
	);
}
