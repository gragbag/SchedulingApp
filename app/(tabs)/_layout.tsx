import { Tabs } from "expo-router";
import React from "react";

export default function TabsLayout() {
	return (
		<Tabs screenOptions={{ headerTitleStyle: { fontWeight: "700" } }}>
			<Tabs.Screen name="index" options={{ title: "Home" }} />
			<Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
		</Tabs>
	);
}
