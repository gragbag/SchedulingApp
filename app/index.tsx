import { Redirect } from "expo-router";
import React from "react";
import { useAppStore } from "../lib/store";

export default function Index() {
	const isLoggedIn = useAppStore((s) => s.isLoggedIn);
	return <Redirect href={isLoggedIn ? "/(tabs)" : "/auth"} />;
}
