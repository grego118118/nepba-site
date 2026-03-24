"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { AuditIcon } from "./AuditIcon";
import type { AuditConfig, Totals } from "./types";

interface ConfigSidebarProps {
	config: AuditConfig;
	setConfig: Dispatch<SetStateAction<AuditConfig>>;
	totals: Totals;
}

function ConfigSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
	const [isOpen, setIsOpen] = useState(defaultOpen);
	return (
		<div className="border-b border-slate-700/50">
			<button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-400 hover:bg-slate-800/50">
				{title}
				<AuditIcon name={isOpen ? "chevron-up" : "chevron-down"} size={14} />
			</button>
			{isOpen && <div className="space-y-2 px-3 pb-3">{children}</div>}
		</div>
	);
}

function NumberInput({ label, value, onChange, step = 0.01, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
	return (
		<div className="flex items-center justify-between gap-2">
			<label className="text-xs text-slate-300">{label}</label>
			<input type="number" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} step={step} min={min}
				className="w-20 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-right text-xs text-slate-100 focus:border-blue-500 focus:outline-none" />
		</div>
	);
}

function Toggle({ label, checked, onChange, subValue, onSubChange, subLabel }: { label: string; checked: boolean; onChange: (v: boolean) => void; subValue?: number; onSubChange?: (v: number) => void; subLabel?: string }) {
	return (
		<div className="space-y-1">
			<label className="flex cursor-pointer items-center gap-2">
				<input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900" />
				<span className="text-xs text-slate-300">{label}</span>
			</label>
			{checked && subValue !== undefined && onSubChange && (
				<div className="ml-5 flex items-center gap-2">
					<span className="text-xs text-slate-400">{subLabel || "Rate:"}</span>
					<input type="number" value={subValue} onChange={(e) => onSubChange(parseFloat(e.target.value) || 0)} step={0.01}
						className="w-16 rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-right text-xs text-slate-100 focus:border-blue-500 focus:outline-none" />
				</div>
			)}
		</div>
	);
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
	return (
		<div className="flex items-center justify-between gap-2">
			<label className="text-xs text-slate-300">{label}</label>
			<select value={value} onChange={(e) => onChange(e.target.value)}
				className="w-24 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-blue-500 focus:outline-none">
				{options.map((opt) => (
					<option key={opt} value={opt}>{opt}</option>
				))}
			</select>
		</div>
	);
}

export function ConfigSidebar({ config, setConfig, totals }: ConfigSidebarProps) {
	const update = <K extends keyof AuditConfig>(key: K, value: AuditConfig[K]) => setConfig((prev) => ({ ...prev, [key]: value }));

	return (
		<aside className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-slate-800 bg-slate-900/50">
			{/* Summary Stats */}
			<div className="border-b border-slate-700 bg-slate-900 p-3">
				<div className="grid grid-cols-2 gap-2 text-center">
					<div className="rounded bg-slate-800 p-2">
						<div className="text-lg font-bold text-slate-100">{totals.count}</div>
						<div className="text-[10px] uppercase tracking-wider text-slate-400">Records</div>
					</div>
					<div className="rounded bg-slate-800 p-2">
						<div className="text-lg font-bold text-slate-100">{totals.hours.toFixed(1)}</div>
						<div className="text-[10px] uppercase tracking-wider text-slate-400">Hours</div>
					</div>
				</div>
			</div>

			{/* Config Sections */}
			<div className="flex-1 overflow-y-auto">
				<ConfigSection title="Schedule Rotation">
					<div className="flex flex-col gap-2">
						<div className="space-y-1">
							<label className="text-xs text-slate-300">Regular Shift</label>
							<Select label="" value={config.regularShiftType} onChange={(v) => update("regularShiftType", v)} options={["Day", "Eve", "Night"]} />
							<p className="text-[10px] text-slate-500">Determines if base diffs apply on reg days.</p>
						</div>
						<div className="space-y-1">
							<label className="text-xs text-slate-300">Day 1 of 4-on/2-off</label>
							<input
								type="date"
								value={config.squadAnchor}
								onChange={(e) => update("squadAnchor", e.target.value)}
								className="w-full rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-100 focus:border-blue-500 focus:outline-none"
							/>
						</div>
						<Toggle label="Auto-Calc Reg Diffs" checked={config.enableSquadLogic} onChange={(v) => update("enableSquadLogic", v)} />
					</div>
				</ConfigSection>

				<ConfigSection title="Base Rates">
					<NumberInput label="Hourly Rate ($)" value={config.baseRate} onChange={(v) => update("baseRate", v)} />
					<NumberInput label="OT Multiplier" value={config.multiplier} onChange={(v) => update("multiplier", v)} step={0.1} />
				</ConfigSection>

				<ConfigSection title="Shift Differentials">
					<NumberInput label="Evening ($)" value={config.eveningDiff} onChange={(v) => update("eveningDiff", v)} />
					<NumberInput label="Night ($)" value={config.nightDiff} onChange={(v) => update("nightDiff", v)} />
					<NumberInput label="Weekend ($)" value={config.weekendDiff} onChange={(v) => update("weekendDiff", v)} />
				</ConfigSection>

				<ConfigSection title="FLSA Add-ons" defaultOpen={false}>
					<Toggle label="Wellness Incentive" checked={config.includeWellness} onChange={(v) => update("includeWellness", v)} subValue={config.wellnessRate} onSubChange={(v) => update("wellnessRate", v)} />
					<Toggle label="Incident Pay" checked={config.includeIncident} onChange={(v) => update("includeIncident", v)} subValue={config.incidentRate} onSubChange={(v) => update("incidentRate", v)} />
					<Toggle label="On-Call Stipend" checked={config.includeOnCall} onChange={(v) => update("includeOnCall", v)} subValue={config.onCallAnnual} onSubChange={(v) => update("onCallAnnual", v)} subLabel="Annual $:" />
					<Toggle label="Wellness Add-on 1 (7/1/24)" checked={config.includeWellnessAddon1} onChange={(v) => update("includeWellnessAddon1", v)} subValue={config.wellnessAddon1Annual} onSubChange={(v) => update("wellnessAddon1Annual", v)} subLabel="Annual $:" />
					<Toggle label="Wellness Add-on 2 (7/1/25)" checked={config.includeWellnessAddon2} onChange={(v) => update("includeWellnessAddon2", v)} subValue={config.wellnessAddon2Annual} onSubChange={(v) => update("wellnessAddon2Annual", v)} subLabel="Annual $:" />
				</ConfigSection>

				<ConfigSection title="Detail Premium">
					<NumberInput label="Vendor %" value={config.vendorDetailPrem} onChange={(v) => update("vendorDetailPrem", v)} min={0} step={1} />
					<NumberInput label="Mullins %" value={config.mullinsDetailPrem} onChange={(v) => update("mullinsDetailPrem", v)} min={0} step={0.5} />
				</ConfigSection>
			</div>

			{/* Footer */}
			<div className="border-t border-slate-700 bg-slate-900 p-3">
				<div className="flex items-center gap-2 text-xs text-slate-400">
					<AuditIcon name="info" size={14} />
					<span>Calculations update in real-time</span>
				</div>
			</div>
		</aside>
	);
}

