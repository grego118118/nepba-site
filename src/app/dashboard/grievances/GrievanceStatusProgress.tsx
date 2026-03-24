"use client";

import { useState } from "react";
import { STATUSES, type GrievanceStatus } from "./statuses";

const STATUS_DESCRIPTIONS: Record<GrievanceStatus, string> = {
	"Step 1": "Initial grievance filing and immediate supervisor review.",
	"Step 2": "Department head or division manager reviews the grievance.",
	"Step 3": "Upper management or HR reviews and prepares a response.",
	Mediation: "Neutral third-party mediation process to try to resolve the dispute.",
	Arbitration: "Formal arbitration hearing with a binding decision.",
	Resolved: "Grievance concluded and final outcome documented.",
};

const NEXT_STEP_HINTS: Record<GrievanceStatus, string> = {
	"Step 1": "Your Local will review the filing and may request clarifications.",
	"Step 2": "Management is reviewing the issue; your rep may follow up with you.",
	"Step 3": "Leadership/HR is preparing a determination; expect a formal response.",
	Mediation: "The parties will work with a mediator to seek a voluntary resolution.",
	Arbitration: "An arbitrator will hear the case and issue a binding decision.",
	Resolved: "No further action is expected unless new information arises.",
};

interface Props {
	status: string;
}

export function GrievanceStatusProgress({ status }: Props) {
	const isKnownStatus = STATUSES.includes(status as GrievanceStatus);
	const currentIndex = isKnownStatus
		? STATUSES.indexOf(status as GrievanceStatus)
		: 0;
	const [activeIndex, setActiveIndex] = useState<number | null>(null);

	const currentStatus =
		isKnownStatus ? (status as GrievanceStatus) : STATUSES[0];
	const currentDescription = STATUS_DESCRIPTIONS[currentStatus];
	const nextStepHint = NEXT_STEP_HINTS[currentStatus];

	return (
		<div className="mb-2">
			<div className="mb-1 flex flex-wrap items-center justify-between gap-2">
				<div className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/80 px-2 py-[2px] text-[10px] font-medium text-slate-100">
					<span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-400" aria-hidden="true" />
					<span>Current stage:</span>
					<span className="text-blue-300">{currentStatus}</span>
				</div>
				<p className="text-[10px] text-slate-400">
					{nextStepHint}
				</p>
			</div>
			<div className="flex items-center gap-1">
				{STATUSES.map((label, index) => {
					const isCompleted = index < currentIndex;
					const isCurrent = index === currentIndex;
					const isUpcoming = index > currentIndex;

					const circleClasses = [
						"flex h-4 w-4 items-center justify-center rounded-full border text-[9px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
						isCompleted && "border-blue-400 bg-blue-500 text-slate-950",
						isCurrent &&
							"border-blue-300 bg-blue-600 text-slate-50 shadow-md shadow-blue-500/40 animate-pulse",
						isUpcoming && "border-slate-700 bg-slate-900 text-slate-500",
					]
						.filter(Boolean)
						.join(" ");

					const lineClasses = [
						"h-[2px] flex-1 rounded-full",
						index < currentIndex ? "bg-blue-500" : "bg-slate-800",
					].join(" ");

					const description =
						STATUS_DESCRIPTIONS[label as GrievanceStatus] ?? label;

					return (
						<div
							key={label}
							className="relative flex flex-1 flex-col items-center gap-1"
						>
							<button
								type="button"
								className={circleClasses}
								onMouseEnter={() => setActiveIndex(index)}
								onMouseLeave={() =>
									setActiveIndex((current) =>
										current === index ? null : current,
									)
								}
								onFocus={() => setActiveIndex(index)}
								onBlur={() =>
									setActiveIndex((current) =>
										current === index ? null : current,
									)
								}
								aria-label={description}
								title={description}
							>
								{isCompleted ? "✓" : index + 1}
							</button>
							{activeIndex === index && (
								<div className="pointer-events-none absolute -top-8 left-1/2 z-20 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-[10px] text-slate-100 shadow-lg ring-1 ring-slate-700">
									{description}
								</div>
							)}
							{index < STATUSES.length - 1 && (
								<div className={lineClasses} aria-hidden="true" />
							)}
						</div>
					);
				})}
			</div>
			<div className="mt-1 flex justify-between gap-1 text-[9px] text-slate-400">
				{STATUSES.map((label) => (
					<span
						key={label}
						className="truncate text-[9px] md:text-[10px]"
						title={label}
					>
						{label}
					</span>
				))}
			</div>
		</div>
	);
}

