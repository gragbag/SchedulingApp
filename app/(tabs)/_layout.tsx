import { Tabs } from "expo-router";
import React from "react";
import { ProfileHeaderButton } from "../../components/ProfileHeaderButton";

export default function TabsLayout() {
	return (
		<Tabs screenOptions={{ headerTitleStyle: { fontWeight: "700" } }}>
			<Tabs.Screen
				name="index"
				options={{
					title: "Home",
					headerRight: () => <ProfileHeaderButton />,
				}}
			/>
			<Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
		</Tabs>
	);
}
