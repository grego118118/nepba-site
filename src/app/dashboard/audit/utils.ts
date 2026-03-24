export function parseDate(raw: number | string | undefined): string {
	if (!raw) return "";
	if (typeof raw === "number") {
		// Excel serial date
		const excelEpoch = new Date(1899, 11, 30);
		const date = new Date(excelEpoch.getTime() + raw * 86400000);
		return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	}
	const d = new Date(raw);
	if (!isNaN(d.getTime())) {
		return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	}
	return String(raw);
}

export function parseTimeDecimal(raw: number | string | undefined): number {
	if (raw === undefined || raw === null) return 0;
	if (typeof raw === "number") {
		// Excel time fraction (0-1 = 24 hours)
		return raw * 24;
	}
	// Try parsing time string like "7:00 AM" or "15:00"
	const str = String(raw).trim().toUpperCase();
	const match12 = str.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)?$/);
	if (match12) {
		let hours = parseInt(match12[1], 10);
		const mins = parseInt(match12[2] || "0", 10);
		const period = match12[3];
		if (period === "PM" && hours !== 12) hours += 12;
		if (period === "AM" && hours === 12) hours = 0;
		return hours + mins / 60;
	}
	return parseFloat(raw as string) || 0;
}

export function formatTimeDisplay(raw: number | string | undefined): string {
	const hours = parseTimeDecimal(raw);
	const h = Math.floor(hours);
	const m = Math.round((hours - h) * 60);
	const period = h >= 12 ? "PM" : "AM";
	const displayH = h % 12 || 12;
	return `${displayH}:${m.toString().padStart(2, "0")} ${period}`;
}

export function calculateDuration(start: number | string | undefined, end: number | string | undefined): number {
	const startHours = parseTimeDecimal(start);
	let endHours = parseTimeDecimal(end);
	// Handle overnight shifts
	if (endHours < startHours) {
		endHours += 24;
	}
	return endHours - startHours;
}

export type PayPeriod = { start: Date; end: Date };

export function getPayPeriodObject(dateStr: string): PayPeriod | null {
	if (!dateStr || dateStr === "Invalid") return null;
	const d = new Date(dateStr);
	if (isNaN(d.getTime())) return null;

	// Anchor from user code: 2025-06-15T00:00:00 (Sunday)
	const anchor = new Date("2025-06-15T00:00:00");
	const msPerDay = 86400000;

	// Check diff from anchor
	const diffTime = d.getTime() - anchor.getTime();
	const diffDays = Math.floor(diffTime / msPerDay);

	const periodsSince = Math.floor(diffDays / 14);
	const periodStart = new Date(anchor.getTime() + (periodsSince * 14 * msPerDay));
	const periodEnd = new Date(periodStart.getTime() + (13 * msPerDay));

	return { start: periodStart, end: periodEnd };
}

export function getPayPeriod(dateStr: string): string {
	const pp = getPayPeriodObject(dateStr);
	if (!pp) return "Unknown";

	const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
	return `${formatDate(pp.start)} - ${formatDate(pp.end)}`;
}

export interface ShiftConfig {
	type: string;
	eveRate: number;
	nightRate: number;
	wkndRate: number;
}

export function calculateSquadDiffs(periodStart: Date | null, anchorDateStr: string, shiftConfig: ShiftConfig): number {
	if (!anchorDateStr || !periodStart) return 0;
	// Use noon to avoid timezone issues when just counting days
	const anchor = new Date(anchorDateStr);
	anchor.setHours(12, 0, 0, 0);
	if (isNaN(anchor.getTime())) return 0;

	let totalDiffDollars = 0;
	const msPerDay = 86400000;
	const shiftType = shiftConfig.type || "Day";
	const eveRate = shiftConfig.eveRate || 0;
	const nightRate = shiftConfig.nightRate || 0;
	const wkndRate = shiftConfig.wkndRate || 0;

	// Iterate 14 days of pay period
	// We need to iterate starting from periodStart
	const startP = new Date(periodStart);
	startP.setHours(12, 0, 0, 0);

	for (let i = 0; i < 14; i++) {
		const currentDay = new Date(startP.getTime() + (i * msPerDay));

		// 4 on, 2 off logic
		const diffTime = currentDay.getTime() - anchor.getTime();
		const dayDiff = Math.floor(diffTime / msPerDay);

		const cyclePos = ((dayDiff % 6) + 6) % 6; // 0-3 Work, 4-5 Off
		const isWorkDay = cyclePos < 4;

		if (isWorkDay) {
			const dow = currentDay.getDay(); // 0 is Sunday
			const isWeekend = (dow === 0 || dow === 6);
			const shiftHours = 8;

			if (shiftType === "Eve") totalDiffDollars += shiftHours * eveRate;
			if (shiftType === "Night") totalDiffDollars += shiftHours * nightRate;
			// Note: User code applies weekend diff on ALL weekends if working, regardless of "shift type" usually,
			// but here they check isWorkDay. If you work a weekend day, you get the diff.
			if (isWeekend) totalDiffDollars += shiftHours * wkndRate;
		}
	}
	return totalDiffDollars;
}

