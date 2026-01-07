export function toISO(d: Date) {
	return d.toISOString();
}

export function parseISO(iso: string) {
	// If the ISO string doesn't have a timezone (no 'Z' or '+'/'-' offset),
	// treat it as local time to avoid date shifting issues
	if (!iso.includes('Z') && !iso.includes('+') && !iso.includes('-', 10)) {
		// Parse as local time by using the Date constructor with individual components
		const [datePart, timePart] = iso.split('T');
		const [year, month, day] = datePart.split('-').map(Number);

		if (timePart) {
			const [hour, minute, second] = timePart.split(':').map(Number);
			return new Date(year, month - 1, day, hour, minute, second || 0);
		}

		return new Date(year, month - 1, day);
	}

	// If it has a timezone, parse normally
	return new Date(iso);
}

// YYYY-MM-DD in *local time* (good for grouping events by local day)
export function dayKeyLocal(d: Date) {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export function startOfMonth(d: Date) {
	return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
	return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addMonths(d: Date, delta: number) {
	return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

export function isSameDay(a: Date, b: Date) {
	return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatTime(d: Date) {
	return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatDateLong(d: Date) {
	return d.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
}

export function monthTitle(d: Date) {
	return d.toLocaleDateString([], { month: "long", year: "numeric" });
}
