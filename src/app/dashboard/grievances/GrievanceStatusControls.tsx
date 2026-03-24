"use client";

	import { useState, type ChangeEvent } from "react";
	import { useRouter } from "next/navigation";
	import { STATUSES, type GrievanceStatus } from "./statuses";

interface Props {
	id: string;
	status: string;
	outcome?: string | null;
}

export function GrievanceStatusControls({ id, status, outcome }: Props) {
	const router = useRouter();
	const [current, setCurrent] = useState<GrievanceStatus>(
		STATUSES.includes(status as GrievanceStatus)
			? (status as GrievanceStatus)
			: "Step 1",
	);
	const [outcomeValue, setOutcomeValue] = useState(outcome ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function save(nextStatus: GrievanceStatus, nextOutcome: string) {
		setError(null);
		setSaving(true);

		try {
			const response = await fetch(`/api/grievances/${id}`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					status: nextStatus,
					outcome: nextOutcome.trim(),
				}),
			});

			if (!response.ok) {
				let message = "Unable to update grievance.";
				try {
					const data = await response.json();
					if (data?.error) message = data.error;
				} catch {
					// ignore JSON parse errors
				}
				setError(message);
				return;
			}

			setCurrent(nextStatus);
			setOutcomeValue(nextOutcome);
			router.refresh();
		} finally {
			setSaving(false);
		}
	}

	async function handleChange(event: ChangeEvent<HTMLSelectElement>) {
		const next = event.target.value as GrievanceStatus;
		await save(next, outcomeValue);
	}

	async function handleOutcomeSave() {
		await save(current, outcomeValue);
	}

	return (
		<div className="space-y-1">
			<label className="text-[11px] text-slate-400" htmlFor={`status-${id}`}>
				Status
			</label>
			<div className="flex items-center gap-2">
				<select
					id={`status-${id}`}
					className="h-7 rounded-md border border-slate-700 bg-slate-900 px-2 text-[11px] text-slate-100 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
					value={current}
					onChange={handleChange}
					disabled={saving}
				>
					{STATUSES.map((s) => (
						<option key={s} value={s}>
							{s}
						</option>
					))}
				</select>
				{saving && (
					<span className="text-[10px] text-slate-500">Saving…</span>
				)}
			</div>
			<label className="mt-2 block text-[11px] text-slate-400" htmlFor={`outcome-${id}`}>
				Outcome / notes
			</label>
			<textarea
				id={`outcome-${id}`}
				rows={2}
				value={outcomeValue}
				onChange={(event) => setOutcomeValue(event.target.value)}
				className="w-full resize-y rounded-md border border-slate-700 bg-slate-900 px-2 py-1.5 text-[11px] text-slate-100 shadow-sm outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
				placeholder="Add a brief outcome or next-step note."
			/>
			<div className="mt-1 flex items-center justify-between">
				<button
					type="button"
					onClick={handleOutcomeSave}
					disabled={saving}
					className="inline-flex items-center rounded-md bg-slate-800 px-2 py-1 text-[10px] font-medium text-slate-100 shadow-sm hover:bg-slate-700 disabled:cursor-progress disabled:opacity-70"
				>
					Save outcome
				</button>
				{error && (
					<p className="text-[10px] text-red-300">{error}</p>
				)}
			</div>
		</div>
	);
}
