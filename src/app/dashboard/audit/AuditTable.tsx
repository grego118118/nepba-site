"use client";

import { useState } from "react";
import { AuditIcon } from "./AuditIcon";
import type { GroupedData, ProcessedRow } from "./types";

interface AuditTableProps {
	groupedData: GroupedData;
}

function PayPeriodGroup({ period, rows }: { period: string; rows: ProcessedRow[] }) {
	const [isOpen, setIsOpen] = useState(true);
	const periodTotal = rows.reduce((sum, r) => sum + (isNaN(r._loss) ? 0 : r._loss), 0);
	const periodHours = rows.reduce((sum, r) => sum + (isNaN(r._hours) ? 0 : r._hours), 0);

	return (
		<div className="border-b border-slate-800">
			<button onClick={() => setIsOpen(!isOpen)} className="flex w-full items-center justify-between bg-slate-800/50 px-4 py-2 text-left hover:bg-slate-800">
				<div className="flex items-center gap-3">
					<AuditIcon name={isOpen ? "chevron-up" : "chevron-down"} size={14} className="text-slate-400" />
					<span className="text-sm font-medium text-slate-200">{period}</span>
					<span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">{rows.length} entries</span>
				</div>
				<div className="flex items-center gap-4 text-xs">
					<span className="text-slate-400">{periodHours.toFixed(1)} hrs</span>
					<span className={`font-mono font-medium ${periodTotal > 0 ? "text-red-400" : "text-slate-400"}`}>
						${periodTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
					</span>
				</div>
			</button>
			{isOpen && (
				<div className="overflow-x-auto">
					<table className="w-full text-xs">
						<thead className="bg-slate-900/50 text-slate-400">
							<tr>
								<th className="px-3 py-2 text-left font-medium">Date</th>
								<th className="px-3 py-2 text-left font-medium">Day</th>
								<th className="px-3 py-2 text-left font-medium">Shift</th>
								<th className="px-3 py-2 text-left font-medium">Name</th>
								<th className="px-3 py-2 text-center font-medium">Hours</th>
								<th className="px-3 py-2 text-left font-medium">Diffs Applied</th>
								<th className="px-3 py-2 text-right font-medium">Mgmt Paid</th>
								<th className="px-3 py-2 text-right font-medium">FLSA Owed</th>
								<th className="px-3 py-2 text-right font-medium">Variance</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-800/50">
							{rows.map((row) => (
								<tr key={row._id} className="hover:bg-slate-800/30">
									<td className="whitespace-nowrap px-3 py-2 text-slate-200">{row._formattedDate}</td>
									<td className="px-3 py-2 text-slate-300">{row.Weekday || row.Day || row.day}</td>
									<td className="px-3 py-2 text-slate-300">{row.Shift || row.shift}</td>
									<td className="px-3 py-2 text-slate-200">{row.Name || row.name}</td>
									<td className="px-3 py-2 text-center font-mono text-slate-300">{row._hours.toFixed(2)}</td>
									<td className="px-3 py-2">
										{row._visualDiffs !== "-" ? (
											<div className="flex flex-wrap gap-1">
												{row._visualDiffs.split("/").map((diff, i) => (
													<span key={i} className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
														diff.includes("Weekend") ? "bg-purple-500/20 text-purple-300" :
														diff.includes("Eve") ? "bg-orange-500/20 text-orange-300" :
														diff.includes("Night") ? "bg-blue-500/20 text-blue-300" :
														diff.includes("DE") ? "bg-green-500/20 text-green-300" :
														"bg-slate-600 text-slate-300"
													}`}>
														{diff}
													</span>
												))}
											</div>
										) : (
											<span className="text-slate-500">-</span>
										)}
									</td>
									<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-slate-400">
										${row._mgmtTotal.toFixed(2)}
									</td>
									<td className="whitespace-nowrap px-3 py-2 text-right font-mono text-slate-200">
										${row._unionTotal.toFixed(2)}
									</td>
									<td className={`whitespace-nowrap px-3 py-2 text-right font-mono font-medium ${row._loss > 0 ? "text-red-400" : "text-slate-400"}`}>
										${row._loss.toFixed(2)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
}

export function AuditTable({ groupedData }: AuditTableProps) {
	const periods = Object.keys(groupedData);

	if (periods.length === 0) {
		return (
			<div className="flex flex-1 items-center justify-center bg-slate-900/30">
				<div className="text-center">
					<AuditIcon name="upload" size={48} className="mx-auto mb-4 text-slate-600" />
					<h3 className="text-lg font-medium text-slate-400">No Data Loaded</h3>
					<p className="text-sm text-slate-500">Drag and drop an Excel or CSV file to begin</p>
				</div>
			</div>
		);
	}

	return (
		<main className="flex-1 overflow-y-auto bg-slate-900/30">
			{periods.map((period) => (
				<PayPeriodGroup key={period} period={period} rows={groupedData[period]} />
			))}
		</main>
	);
}

