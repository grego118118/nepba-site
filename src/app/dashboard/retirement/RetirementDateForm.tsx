"use client";

import { useActionState } from "react";
import { useState, useEffect } from "react";
import { saveRetirementDate } from "./actions";

interface Props {
	initialTargetDateIso: string | null;
	userId: string;
	userEmail: string;
}

export function RetirementDateForm({ initialTargetDateIso, userId, userEmail }: Props) {
	const [date, setDate] = useState(
		initialTargetDateIso ? initialTargetDateIso.slice(0, 10) : "",
	);

	// Server action wrapper that accepts FormData and includes user info
	const formAction = async (
		prevState: { success: boolean; error?: string | null },
		formData: FormData
	): Promise<{ success: boolean; error?: string | null }> => {
		const dateValue = formData.get("targetRetirementDate") as string;
		const result = await saveRetirementDate({
			targetRetirementDate: dateValue?.trim() || null,
			userId,
			userEmail,
		});
		return result;
	};

	const [state, action, isPending] = useActionState(formAction, { success: false });
	const [showSuccess, setShowSuccess] = useState(false);

	// Show success message briefly after a successful save
	useEffect(() => {
		if (state.success) {
			setShowSuccess(true);
			const timer = setTimeout(() => setShowSuccess(false), 3000);
			return () => clearTimeout(timer);
		}
	}, [state]);

	return (
		<section className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
			<h2 className="text-sm font-semibold text-slate-50">
				Your target retirement date
			</h2>
			<p className="mt-1 text-xs text-slate-400">
				Set or update an anticipated retirement date so the dashboard countdown can
				track your timeline. This does not replace an official estimate from your
				retirement board.
			</p>

			{state.error && (
				<p className="mt-3 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs text-red-200">
					{state.error}
				</p>
			)}
			{showSuccess && (
				<p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
					Retirement date saved.
				</p>
			)}

			<form action={action} className="mt-4 flex flex-col gap-3 text-xs md:flex-row md:items-end">
				<div className="flex-1 space-y-1">
					<label htmlFor="targetRetirementDate" className="font-medium text-slate-200">
						Target date
					</label>
					<input
						id="targetRetirementDate"
						name="targetRetirementDate"
						type="date"
						value={date}
						onChange={(event) => setDate(event.target.value)}
						className="block w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
					/>
					<p className="mt-1 text-[11px] text-slate-500">
						Leave blank and save to clear your target date.
					</p>
				</div>
				<button
					type="submit"
					disabled={isPending}
					className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-600 disabled:cursor-progress disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
				>
					{isPending ? "Saving..." : "Save date"}
				</button>
			</form>
		</section>
	);
}
