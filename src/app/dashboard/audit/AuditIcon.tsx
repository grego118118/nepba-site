import type { JSX } from "react";

interface AuditIconProps {
	name: "upload" | "download" | "gavel" | "chevron-down" | "chevron-up" | "info" | "calculator";
	size?: number;
	className?: string;
}

export function AuditIcon({ name, size = 16, className = "" }: AuditIconProps) {
	const icons: Record<string, JSX.Element> = {
		upload: (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="17 8 12 3 7 8" />
				<line x1="12" y1="3" x2="12" y2="15" />
			</svg>
		),
		download: (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
				<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
				<polyline points="7 10 12 15 17 10" />
				<line x1="12" y1="15" x2="12" y2="3" />
			</svg>
		),
		gavel: (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
				<path d="M2.25 21h19.5v1.5H2.25V21zm17.82-9.75l-3.07-3.07 1.06-1.06a2.25 2.25 0 0 0 0-3.18l-.71-.71a2.25 2.25 0 0 0-3.18 0l-1.06 1.06-1.06-1.06a.75.75 0 0 0-1.06 0L9.88 4.29a.75.75 0 0 0 0 1.06l1.06 1.06-6.72 6.72a2.25 2.25 0 0 0 0 3.18l.71.71a2.25 2.25 0 0 0 3.18 0l6.72-6.72 1.06 1.06a.75.75 0 0 0 1.06 0l1.06-1.06a.75.75 0 0 0 0-1.06l1.06-1.06 3.07 3.07 1.06-1.06-1.06-1.06z" />
			</svg>
		),
		"chevron-down": (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
				<polyline points="6 9 12 15 18 9" />
			</svg>
		),
		"chevron-up": (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
				<polyline points="18 15 12 9 6 15" />
			</svg>
		),
		info: (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="16" x2="12" y2="12" />
				<line x1="12" y1="8" x2="12.01" y2="8" />
			</svg>
		),
		calculator: (
			<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
				<rect width="16" height="20" x="4" y="2" rx="2" />
				<line x1="8" x2="16" y1="6" y2="6" />
				<line x1="16" x2="16" y1="14" y2="18" />
				<path d="M16 10h.01" />
				<path d="M12 10h.01" />
				<path d="M8 10h.01" />
				<path d="M12 14h.01" />
				<path d="M8 14h.01" />
				<path d="M12 18h.01" />
				<path d="M8 18h.01" />
			</svg>
		),
	};

	return icons[name] || null;
}

