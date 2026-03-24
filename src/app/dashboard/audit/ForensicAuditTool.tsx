"use client";

import { useState, useEffect, useCallback, type DragEvent, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { AuditIcon } from "./AuditIcon";
import { ConfigSidebar } from "./ConfigSidebar";
import { AuditTable } from "./AuditTable";
import type { AuditConfig, RawDataRow, ProcessedRow, GroupedData, Totals } from "./types";
import { parseDate, calculateDuration, formatTimeDisplay, parseTimeDecimal, getPayPeriod, getPayPeriodObject, calculateSquadDiffs } from "./utils";
import { extractTablesFromPdf } from "./pdfParser";

const SAMPLE_DATA: RawDataRow[] = [
	{ Date: 44686, Weekday: "Thursday", Shift: "7a - 3p", Name: "Oravec, Gregory", Rank: "Police Officer", Start: 0.291666, End: 0.604166, Attendance: "Dept OT (1.5)", Duty: "Training", Unit: "Range #125", Post: "" },
	{ Date: 44695, Weekday: "Saturday", Shift: "11p - 7a", Name: "Oravec, Gregory", Rank: "Police Officer", Start: 0.958333, End: 0.291666, Attendance: "Dept OT (1.5)", Duty: "Patrol", Unit: "Job# 22-309-DO Outside Detail", Post: "Sector 1" },
	{ Date: 45983, Weekday: "Saturday", Shift: "3p - 11p", Name: "Oravec, Gregory", Rank: "Police Officer", Start: 0.729166, End: 0.916666, Attendance: "Dept OT (1.5)", Duty: "Patrol", Unit: "Job# 25-617-DO Outside Detail", Post: "" },
	{ Date: 45985, Weekday: "Monday", Shift: "7a - 3p", Name: "Oravec, Gregory", Rank: "Police Officer", Start: 0.291666, End: 0.625, Attendance: "Detail OT", Duty: "Patrol", Unit: "Job# 25-359-DE Vendor ID: YCON", Post: "" },
];

const DEFAULT_CONFIG: AuditConfig = {
	baseRate: 41.03, eveningDiff: 1.0, nightDiff: 1.5, weekendDiff: 1.25,
	multiplier: 1.5, includeWellness: true, wellnessRate: 0.38, includeIncident: true,
	incidentRate: 0.5, includeOnCall: true, onCallAnnual: 2080,
	vendorDetailPrem: 15, mullinsDetailPrem: 7.5,
	enableSquadLogic: true, squadAnchor: "2025-06-15", regularShiftType: "Day",
	groupByPayPeriod: true,
	includeWellnessAddon1: true, wellnessAddon1Annual: 500, wellnessAddon1EffectiveDate: "2024-07-01",
	includeWellnessAddon2: true, wellnessAddon2Annual: 200, wellnessAddon2EffectiveDate: "2025-07-01",
};

export function ForensicAuditTool() {
	const [config, setConfig] = useState<AuditConfig>(DEFAULT_CONFIG);
	const [rawData, setRawData] = useState<RawDataRow[]>(SAMPLE_DATA);
	const [processedData, setProcessedData] = useState<ProcessedRow[]>([]);
	const [groupedData, setGroupedData] = useState<GroupedData>({});
	const [totals, setTotals] = useState<Totals>({ owed: 0, hours: 0, count: 0, mgmtPaid: 0, flsaPaid: 0 });
	const [isDragging, setIsDragging] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [parseError, setParseError] = useState<string | null>(null);

	useEffect(() => {
		let totalLoss = 0, totalHours = 0, totalMgmtPaid = 0, totalFlsaPaid = 0;
		const onCallHourly = config.includeOnCall ? config.onCallAnnual / 2080 : 0;

		const updated: ProcessedRow[] = rawData.map((row, idx) => {
			const rawDate = row.Date || row.date;
			const dateStr = parseDate(rawDate);

			const day = row.Weekday || row.Day || row.day || "";
			const startRaw = row.Start || row.start;
			const endRaw = row.End || row.end;
			const hours = calculateDuration(startRaw, endRaw);
			const sVal = parseTimeDecimal(startRaw);

			// Pay Period
			const pp = getPayPeriod(dateStr);


			const unitStr = (row.Unit || "").toString().toUpperCase();
			const postStr = (row.Post || "").toString().toUpperCase();
			const dutyStr = (row.Duty || "").toString().toUpperCase();
			const descStr = unitStr + " " + postStr + " " + dutyStr;

			let detailType = "Institutional";
			let typeColor = "blue";
			let premiumPct = 0;

			if (descStr.includes("MULLINS")) {
				detailType = "Mullins Ctr";
				typeColor = "pink";
				premiumPct = config.mullinsDetailPrem;
			} else if (descStr.includes("-DE") || descStr.includes("VENDOR")) {
				detailType = "Vendor Detail (DE)";
				typeColor = "amber";
				premiumPct = config.vendorDetailPrem;
			} else if (descStr.includes("-DO") || descStr.includes("OUTSIDE")) {
				detailType = "Outside Detail (DO)";
				typeColor = "yellow";
				premiumPct = 0;
			}

			const activeDiffs: string[] = [];
			const visualDiffs: string[] = [];
			let diffRate = 0;

			// Weekend
			if (day && (day.toLowerCase().includes("sat") || day.toLowerCase().includes("sun"))) {
				activeDiffs.push("Weekend");
				visualDiffs.push("Wknd");
				diffRate += config.weekendDiff;
			}

			// Eve/Night
			if (sVal >= 15 && sVal < 23) {
				activeDiffs.push("Eve");
				visualDiffs.push("Eve");
				diffRate += config.eveningDiff;
			} else if (sVal >= 23 || sVal < 7) {
				activeDiffs.push("Night");
				visualDiffs.push("Night");
				diffRate += config.nightDiff;
			}

			// FLSA
			let flsaAddons = 0;
			if (config.includeWellness) { flsaAddons += config.wellnessRate; activeDiffs.push("Well"); }
			if (config.includeIncident) { flsaAddons += config.incidentRate; activeDiffs.push("Inc"); }
			if (config.includeOnCall) { flsaAddons += onCallHourly; activeDiffs.push("OnCall"); }

			// Date-based wellness add-ons
			const shiftDate = new Date(dateStr);
			if (!isNaN(shiftDate.getTime())) {
				if (config.includeWellnessAddon1) {
					const effectiveDate1 = new Date(config.wellnessAddon1EffectiveDate);
					if (shiftDate >= effectiveDate1) {
						const addon1Hourly = config.wellnessAddon1Annual / 2080;
						flsaAddons += addon1Hourly;
						activeDiffs.push("WA1");
						visualDiffs.push("WA1");
					}
				}
				if (config.includeWellnessAddon2) {
					const effectiveDate2 = new Date(config.wellnessAddon2EffectiveDate);
					if (shiftDate >= effectiveDate2) {
						const addon2Hourly = config.wellnessAddon2Annual / 2080;
						flsaAddons += addon2Hourly;
						activeDiffs.push("WA2");
						visualDiffs.push("WA2");
					}
				}
			}

			// Squad / Regular Diff Logic
			let squadAdder = 0;
			const ppObj = getPayPeriodObject(dateStr);
			if (config.enableSquadLogic && ppObj) {
				const shiftConf = {
					type: config.regularShiftType,
					eveRate: config.eveningDiff,
					nightRate: config.nightDiff,
					wkndRate: config.weekendDiff
				};
				const totalEarnedDiffs = calculateSquadDiffs(ppObj.start, config.squadAnchor, shiftConf);
				squadAdder = totalEarnedDiffs / 80;
				if (squadAdder > 0.005) {
					activeDiffs.push(`RegDiff($${squadAdder.toFixed(2)})`);
				}
			}

			const mgmtBaseOT = config.baseRate * config.multiplier;
			const finalMgmtRate = mgmtBaseOT * (1 + (premiumPct / 100));
			const mgmtTotal = hours * finalMgmtRate;

			const unionRegRate = config.baseRate + diffRate + flsaAddons + squadAdder;
			const unionOTRate = unionRegRate * config.multiplier;
			const finalUnionRate = unionOTRate * (1 + (premiumPct / 100));
			const unionTotal = hours * finalUnionRate;

			const loss = unionTotal - mgmtTotal;
			const gapPerHr = finalUnionRate - finalMgmtRate;

			if (!isNaN(loss)) totalLoss += loss;
			if (!isNaN(hours)) totalHours += hours;
			if (!isNaN(mgmtTotal)) totalMgmtPaid += mgmtTotal;
			if (!isNaN(unionTotal)) totalFlsaPaid += unionTotal;

			// Job display logic
			const jobMatch = (row.Unit || "").match(/(Job\s*#?\s*[\d-]+(?:-[A-Z]+)?)/i);
			const jobDisplay = jobMatch ? jobMatch[1] : undefined;
			const cleanUnit = (row.Unit || "").replace(/(Job\s*#?\s*[\d-]+(?:-[A-Z]+)?)/i, "").trim();

			return {
				...row, _formattedDate: dateStr, _formattedStart: formatTimeDisplay(startRaw),
				_formattedEnd: formatTimeDisplay(endRaw), _payPeriod: pp, _hours: hours,
				_detailType: detailType, _typeColor: typeColor, _premiumPct: premiumPct,
				_visualDiffs: visualDiffs.join("/") || "-", _mgmtRate: finalMgmtRate,
				_unionRate: finalUnionRate, _gapPerHr: gapPerHr, _mgmtTotal: mgmtTotal,
				_unionTotal: unionTotal, _loss: loss, _id: idx, _jobDisplay: jobDisplay,
				_cleanUnit: cleanUnit,
				// Populate old fields for type safety/legacy logic if needed
				_diffLabels: activeDiffs, _diffRate: diffRate + flsaAddons
			};
		});

		const grouped = updated.reduce<GroupedData>((acc, row) => { const pp = row._payPeriod; if (!acc[pp]) acc[pp] = []; acc[pp].push(row); return acc; }, {});
		const sortedKeys = Object.keys(grouped).sort((a, b) => new Date(b.split(" - ")[0]).getTime() - new Date(a.split(" - ")[0]).getTime());
		const sortedGrouped: GroupedData = {}; sortedKeys.forEach((k) => (sortedGrouped[k] = grouped[k]));

		setProcessedData(updated); setGroupedData(sortedGrouped);
		setTotals({ owed: totalLoss, hours: totalHours, count: updated.length, mgmtPaid: totalMgmtPaid, flsaPaid: totalFlsaPaid });
	}, [config, rawData]);

	const processFile = useCallback(async (file: File) => {
		if (!file) return;
		setParseError(null);
		const fileName = file.name.toLowerCase();
		const isPdf = fileName.endsWith(".pdf");

		if (isPdf) {
			setIsLoading(true);
			console.log("🔄 Starting PDF upload to server...");
			console.log("📁 File:", file.name, `(${(file.size / 1024).toFixed(2)} KB)`);

			try {
				const formData = new FormData();
				formData.append("file", file);

				const response = await fetch("/api/parse-pdf", {
					method: "POST",
					body: formData,
				});

				const result = await response.json();

				console.log(`✅ PDF parsing complete on server: ${result.count || 0} rows extracted`);

				if (response.ok && result.success) {
					// Map the backend structure to the frontend structure if needed
					const mappedRows = result.records.map((r: any) => ({
						date: r.date,
						day: r.day,
						shift: r.shift,
						start: r.startTime || r.start_time,
						end: r.endTime || r.end_time,
						attendance: r.attendance,
						duty: r.duty,
						Unit: r.comment, // Map comment to Unit for grievance visualization matching
						Post: "", // Or split comment if needed
					}));

					if (mappedRows.length === 0) {
						setParseError(
							"No tabular data found in PDF. " +
							"The PDF may not contain recognizable payroll tables. " +
							"Try exporting to Excel/CSV from your payroll system for best results."
						);
					} else {
						console.log("📊 Sample of parsed data:", mappedRows.slice(0, 3));
						setRawData(mappedRows);
						setParseError(null);
						alert(`Successfully parsed and saved ${result.count} records to Postgres!`);
					}
				} else {
					setParseError(result.error || "Failed to parse PDF on the server.");
				}
			} catch (err) {
				console.error("❌ PDF parsing error:", err);
				setParseError(
					`Failed to parse PDF: ${err instanceof Error ? err.message : "Unknown error"}. ` +
					`Check the browser console (F12) for details. Try converting to Excel/CSV format.`
				);
			} finally {
				setIsLoading(false);
			}
		} else {
			// Excel/CSV handling
			const reader = new FileReader();
			reader.onload = (evt) => {
				try {
					const bstr = evt.target?.result;
					const wb = XLSX.read(bstr, { type: "binary" });
					const parsed = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: true }) as RawDataRow[];
					console.log(`✅ Excel/CSV parsed: ${parsed.length} rows`);
					setRawData(parsed);
					setParseError(null);
				} catch (err) {
					console.error("Excel/CSV parsing error:", err);
					setParseError(`Failed to parse file: ${err instanceof Error ? err.message : "Unknown error"}`);
				}
			};
			reader.readAsBinaryString(file);
		}
	}, []);
	const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); processFile(e.dataTransfer.files[0]); }, [processFile]);
	const handleFileUpload = useCallback((e: ChangeEvent<HTMLInputElement>) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }, [processFile]);
	const exportToExcel = useCallback(() => {
		const exportData = processedData.map((row) => ({
			"Pay Period": row._payPeriod,
			Date: row._formattedDate,
			Day: row.Weekday || row.Day || row.day,
			Shift: row.Shift || row.shift,
			Name: row.Name || row.name,
			Rank: row.Rank || row.rank,
			Start: row._formattedStart,
			End: row._formattedEnd,
			"Calc Hours": row._hours.toFixed(2),
			"Shift Diffs": row._visualDiffs,
			"All Add-ons": (row._diffLabels || []).join("+"),
			"Added to Base": (row._diffRate || 0).toFixed(2),
			"Mgmt Paid": row._mgmtTotal.toFixed(2),
			"FLSA Paid": row._unionTotal.toFixed(2),
			Variance: row._loss.toFixed(2)
		}));
		const ws = XLSX.utils.json_to_sheet(exportData);
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, "Forensic Audit");
		XLSX.writeFile(wb, "NEPBA_Forensic_Audit.xlsx");
	}, [processedData]);

	return (
		<div className="flex flex-1 overflow-hidden" onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}>
			{/* Drag overlay */}
			{isDragging && (
				<div className="absolute inset-0 z-50 m-4 flex items-center justify-center rounded-xl border-4 border-dashed border-blue-500 bg-blue-500/20 backdrop-blur-sm">
					<div className="rounded-xl bg-slate-900 p-8 text-center shadow-2xl">
						<AuditIcon name="upload" size={48} className="mx-auto mb-4 text-blue-400" />
						<h2 className="text-2xl font-bold text-slate-100">Drop File Here</h2>
						<p className="text-slate-400">Excel, CSV, or PDF supported</p>
					</div>
				</div>
			)}
			{/* Loading overlay */}
			{isLoading && (
				<div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
					<div className="rounded-xl bg-slate-800 p-8 text-center shadow-2xl">
						<div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-blue-500" />
						<h2 className="text-xl font-bold text-slate-100">Parsing PDF...</h2>
						<p className="text-sm text-slate-400">Extracting tabular data</p>
					</div>
				</div>
			)}
			<div className="flex w-full flex-col">
				<div className="flex shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
					<div className="flex items-center gap-3">
						<div className="rounded bg-yellow-500 p-2 text-slate-900"><AuditIcon name="gavel" size={20} /></div>
						<div>
							<h2 className="text-sm font-bold leading-tight text-slate-100">Shift Differential Grievance Audit</h2>
							<div className="flex gap-2 text-xs text-slate-400"><span>NEPBA 190</span><span>•</span><span>UMass PD</span></div>
						</div>
					</div>
					<div className="flex items-center gap-4">
						<div className="hidden text-right md:block">
							<div className="text-xs uppercase tracking-wider text-slate-400">Total Wage Theft ID&apos;d</div>
							<div className="font-mono text-2xl font-bold text-red-400">${totals.owed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
						</div>
						<label className="flex cursor-pointer items-center gap-2 rounded border border-slate-700 bg-slate-800 px-4 py-2 transition-all hover:bg-slate-700">
							<AuditIcon name="upload" size={16} className="text-blue-400" />
							<span className="text-sm font-medium text-slate-100">Load Data</span>
							<input type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={handleFileUpload} className="hidden" />
						</label>
						<button onClick={exportToExcel} className="flex items-center gap-2 rounded bg-yellow-600 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-yellow-900/20 transition-all hover:bg-yellow-500">
							<AuditIcon name="download" size={16} /><span>Export Report</span>
						</button>
					</div>
				</div>
				{/* Error/Warning banner */}
				{parseError && (
					<div className="flex items-start gap-3 border-b border-yellow-800 bg-yellow-950/50 px-4 py-3">
						<AuditIcon name="info" size={16} className="mt-0.5 shrink-0 text-yellow-400" />
						<div className="flex-1">
							<p className="text-sm font-medium text-yellow-300">PDF Parsing Issue</p>
							<p className="text-xs text-yellow-400/90 leading-relaxed">{parseError}</p>
							<details className="mt-2">
								<summary className="cursor-pointer text-xs text-yellow-500 hover:text-yellow-400">
									Troubleshooting tips
								</summary>
								<ul className="mt-2 space-y-1 text-xs text-yellow-400/80 list-disc list-inside">
									<li>Open browser console (F12) to see detailed parsing logs</li>
									<li>Ensure your PDF contains a clear table with headers like: Date, Name, Shift, Start, End</li>
									<li>For best results, export directly to Excel/CSV from your payroll system</li>
									<li>Some PDF formats (scanned images, complex layouts) cannot be parsed</li>
								</ul>
							</details>
						</div>
						<button onClick={() => setParseError(null)} className="text-xs text-yellow-400 hover:text-yellow-300">Dismiss</button>
					</div>
				)}
				<div className="flex flex-1 overflow-hidden">
					<ConfigSidebar config={config} setConfig={setConfig} totals={totals} />
					<AuditTable groupedData={groupedData} />
				</div>
			</div>
		</div>
	);
}

