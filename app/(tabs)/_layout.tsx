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
					headerShown: true,
					headerRight: () => <ProfileHeaderButton />,
				}}
			/>
			<Tabs.Screen
				name="calendar"
				options={{
					title: "Calendar",
					headerRight: () => <ProfileHeaderButton />,
				}}
			/>
			<Tabs.Screen
				name="social"
				options={{
					title: "Social",
					headerRight: () => <ProfileHeaderButton />,
				}}
			/>
		</Tabs>
	);
}
