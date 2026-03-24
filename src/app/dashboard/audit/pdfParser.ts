"use client";

import type { RawDataRow } from "./types";

// Lazy-loaded pdf.js instance for client-side use only
let pdfjsPromise: Promise<any> | null = null;

async function getPdfJs(): Promise<any> {
	if (typeof window === "undefined") {
		// Guard against server-side execution (SSR)
		throw new Error("PDF parsing is only available in the browser.");
	}

	if (!pdfjsPromise) {
		pdfjsPromise = import("pdfjs-dist").then((pdfjsLib) => {
			try {
				// Use local worker file served from /public to avoid CORS issues
				(pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
			} catch {
				// Ignore worker configuration errors; pdf.js may fall back to default behavior
			}
			return pdfjsLib;
		});
	}

	return pdfjsPromise;
}

interface TextItem {
	str: string;
	transform: number[];
	width: number;
	height: number;
}

interface ExtractedRow {
	y: number;
	items: { x: number; text: string; width: number }[];
}

// Known column headers to look for (case-insensitive, more flexible patterns)
const HEADER_PATTERNS: Record<string, RegExp> = {
	date: /^(date|dt|work\s*date|day|date\s*worked)$/i,
	weekday: /^(day|weekday|dow|day\s*of\s*week)$/i,
	shift: /^(shift|schedule|sched|shift\s*code|shift\s*type)$/i,
	name: /^(name|employee|emp\s*name|officer|full\s*name|last\s*name)$/i,
	rank: /^(rank|title|position|job\s*title|classification)$/i,
	start: /^(start|in|time\s*in|clock\s*in|begin|start\s*time)$/i,
	end: /^(end|out|time\s*out|clock\s*out|finish|stop|end\s*time)$/i,
	attendance: /^(attendance|type|att\s*type|pay\s*type|code|status)$/i,
	duty: /^(duty|assignment|work\s*type|detail)$/i,
	unit: /^(unit|dept|department|job|job\s*#|division)$/i,
	post: /^(post|location|loc|sector|assignment)$/i,
	hours: /^(hours|hrs|total\s*hours|worked|time|duration)$/i,
};

// Heuristic date detector used when the header doesn't explicitly label a
// date column (common in some payroll exports).
function isDateLike(text: string | undefined): boolean {
	if (!text) return false;
	const trimmed = text.trim();
	if (!trimmed) return false;
	// Formats like 01/02/2026, 1-2-26, etc.
	if (/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(trimmed)) return true;
	const d = new Date(trimmed);
	return !isNaN(d.getTime());
}

// Helper: try to match header text against patterns, including compound headers
function detectHeaderKeys(text: string): string[] {
	const keys: string[] = [];
	const trimmed = text.trim();
	if (!trimmed) return keys;

	// 1) Try full-text match first
	for (const [key, pattern] of Object.entries(HEADER_PATTERNS)) {
		if (pattern.test(trimmed)) {
			keys.push(key);
		}
	}
	if (keys.length > 0) return keys;

	// 2) Fall back to token-level matching for compound headers,
	// e.g. "Start End Attendance" or "Unit Post".
	const tokens = trimmed.split(/[\s/|]+/).filter(Boolean);
	for (const token of tokens) {
		for (const [key, pattern] of Object.entries(HEADER_PATTERNS)) {
			if (pattern.test(token) && !keys.includes(key)) {
				keys.push(key);
			}
		}
	}
	return keys;
}

function detectColumnMapping(headerRow: string[], debug = false): Record<string, number> {
	const mapping: Record<string, number> = {};

	if (debug) {
		console.log("🔍 Attempting to detect columns from header row:", headerRow);
	}

	headerRow.forEach((header, idx) => {
		const trimmed = header.trim();
		if (!trimmed) return;

		const keys = detectHeaderKeys(trimmed);
		if (keys.length > 0) {
			for (const key of keys) {
				// Allow multiple logical fields (e.g. start/end/attendance) to
				// originate from the same physical column index.
				if (mapping[key] === undefined) {
					mapping[key] = idx;
				}
			}
			if (debug) {
				console.log(`  ✓ Matched column ${idx}: "${trimmed}" → [${keys.join(", ")}]`);
			}
		} else if (debug) {
			console.log(`  ✗ No match for column ${idx}: "${trimmed}"`);
		}
	});

	if (debug) {
		console.log("📊 Final column mapping:", mapping);
	}

	return mapping;
}

// Helper: for compound "Start End Attendance" columns, extract pieces
function splitStartEndAttendanceCell(cell: string): { start?: string; end?: string; attendance?: string } {
	const value = cell.trim();
	if (!value) return {};

	// Break into tokens, also splitting time ranges like "23:00-07:00".
	const rawTokens = value.split(/\s+/).filter(Boolean);
	const tokens: string[] = [];
	for (const t of rawTokens) {
		if (/\d.*[-–]\d/.test(t)) {
			const parts = t.split(/[-–]/).filter(Boolean);
			tokens.push(...parts);
		} else {
			tokens.push(t);
		}
	}

	const timeTokens: string[] = [];
	const otherTokens: string[] = [];
	for (const token of tokens) {
		// Consider something that looks like a clock time as a time token.
		// This keeps parsing logic here simple – detailed time parsing is
		// handled downstream in utils.ts.
		if (/^\d{1,2}:?\d{0,2}(?:[AP]M)?$/i.test(token) && timeTokens.length < 2) {
			timeTokens.push(token);
		} else {
			otherTokens.push(token);
		}
	}

	const [start, end] = timeTokens;
	const attendance = otherTokens.join(" ") || undefined;
	return { start, end, attendance };
}

function parseRowToData(row: string[], mapping: Record<string, number>): RawDataRow {
	const get = (key: string) => (mapping[key] !== undefined ? row[mapping[key]]?.trim() || "" : "");

	let startVal = get("start");
	let endVal = get("end");
	let attendanceVal = get("attendance");

	// If start/end/attendance all originate from the same physical column,
	// treat it as a compound "Start End Attendance" cell and split it.
	const startIdx = mapping["start"];
	const endIdx = mapping["end"];
	const attIdx = mapping["attendance"];
	if (
		startIdx !== undefined &&
		endIdx !== undefined &&
		attIdx !== undefined &&
		startIdx === endIdx &&
		startIdx === attIdx
	) {
		const combined = row[startIdx] ?? "";
		const parts = splitStartEndAttendanceCell(combined);
		if (parts.start) startVal = parts.start;
		if (parts.end) endVal = parts.end;
		if (parts.attendance) attendanceVal = parts.attendance;
	}

	return {
		Date: get("date"),
		Weekday: get("weekday"),
		Shift: get("shift"),
		Name: get("name"),
		Rank: get("rank"),
		Start: startVal,
		End: endVal,
		Attendance: attendanceVal,
		Duty: get("duty"),
		Unit: get("unit"),
		Post: get("post"),
	};
}

export async function extractTablesFromPdf(file: File, debug = true): Promise<RawDataRow[]> {
	if (typeof window === "undefined") {
		// Extra safety: should never run on the server
		throw new Error("PDF parsing is only available in the browser.");
	}

	const pdfjsLib = await getPdfJs();
	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

	if (debug) {
		console.log(`📄 PDF loaded: ${pdf.numPages} page(s)`);
	}

	const allRows: RawDataRow[] = [];
	let columnMapping: Record<string, number> = {};
	let headerFound = false;

	for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
		if (debug) {
			console.log(`\n📖 Processing page ${pageNum}/${pdf.numPages}`);
		}

		const page = await pdf.getPage(pageNum);
		const textContent = await page.getTextContent();
		const items = textContent.items as TextItem[];

		if (debug) {
			console.log(`  Found ${items.length} text items on page ${pageNum}`);
		}

		// Group text items by Y position (rows)
		const rowMap = new Map<number, ExtractedRow>();
		const yTolerance = 5; // Increased tolerance for better row grouping

		for (const item of items) {
			if (!item.str.trim()) continue;
			const y = Math.round(item.transform[5]);
			const x = item.transform[4];

			// Find existing row within tolerance
			let matchedY: number | null = null;
			for (const existingY of rowMap.keys()) {
				if (Math.abs(existingY - y) <= yTolerance) {
					matchedY = existingY;
					break;
				}
			}

			const targetY = matchedY ?? y;
			if (!rowMap.has(targetY)) {
				rowMap.set(targetY, { y: targetY, items: [] });
			}
			rowMap.get(targetY)!.items.push({ x, text: item.str, width: item.width });
		}

		// Sort rows by Y (top to bottom = descending Y in PDF coords)
		const sortedRows = Array.from(rowMap.values()).sort((a, b) => b.y - a.y);

		if (debug) {
			console.log(`  Grouped into ${sortedRows.length} rows`);
		}

		let rowIndex = 0;
		for (const row of sortedRows) {
			// Sort items in row by X position (left to right)
			row.items.sort((a, b) => a.x - b.x);

			// Analyze X positions to determine column boundaries dynamically
			const xPositions = row.items.map((item) => item.x);
			const gaps: number[] = [];
			for (let i = 1; i < xPositions.length; i++) {
				gaps.push(xPositions[i] - xPositions[i - 1]);
			}

			// Use median gap as primary threshold (more robust than fixed threshold)
			const sortedGaps = [...gaps].sort((a, b) => a - b);
			const medianGap = sortedGaps.length > 0 ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 10;
			// Start with a slightly more aggressive dynamic threshold and a lower minimum
			const dynamicThreshold = Math.max(medianGap * 1.1, 6);
			const initialThreshold = Math.min(dynamicThreshold, 40);

			const splitWithThreshold = (threshold: number): string[] => {
				const cols: string[] = [];
				let current = "";
				let lastXPos = -Infinity;

				for (const item of row.items) {
					if (item.x - lastXPos > threshold && current) {
						cols.push(current.trim());
						current = item.text;
					} else {
						current += (current ? " " : "") + item.text;
					}
					lastXPos = item.x + item.width;
				}
				if (current) cols.push(current.trim());
				return cols;
			};

			let colGapThreshold = initialThreshold;
			let columns: string[] = splitWithThreshold(colGapThreshold);

			// Extra debugging: log detailed positions for first few rows on page 1
			if (debug && pageNum === 1 && rowIndex < 5) {
				console.log(
					`  🔎 Row ${rowIndex} raw items (x → text):`,
					row.items.map((i) => ({ x: i.x.toFixed(1), text: i.text })),
				);
				console.log(
					`  📏 Row ${rowIndex} X positions:`,
					xPositions.map((x) => x.toFixed(1)),
				);
				console.log(
					`  📏 Row ${rowIndex} gaps:`,
					gaps.map((g) => g.toFixed(1)),
				);
				console.log(
					`  📐 Row ${rowIndex} medianGap=${medianGap.toFixed(1)}, initialThreshold=${initialThreshold.toFixed(
						1,
					)}, columns=${columns.length}`,
				);
			}

			// Fallback strategy: if we still see a single column, try a set of fixed thresholds
			if (columns.length <= 1 && gaps.length > 0) {
				const fallbackThresholds = [10, 8, 6, 5, 15, 20, 30].filter(
					(t, index, arr) => t !== colGapThreshold && arr.indexOf(t) === index,
				);

				for (const threshold of fallbackThresholds) {
					const candidate = splitWithThreshold(threshold);
					if (debug && pageNum === 1 && rowIndex < 5) {
						console.log(
							`  🔁 Fallback threshold ${threshold} → ${candidate.length} cols`,
							candidate,
						);
					}

					// Prefer a reasonable number of columns
					if (candidate.length >= 3 && candidate.length <= 20) {
						colGapThreshold = threshold;
						columns = candidate;
						break;
					}
				}
			}

			if (debug && pageNum === 1 && rowIndex < 5) {
				console.log(
					`  ✅ Row ${rowIndex} final threshold=${colGapThreshold.toFixed(1)}, columns=${columns.length}`,
				);
			}

			if (columns.length < 3) {
				if (debug && rowIndex < 5) {
					console.log(`  ⏭️  Row ${rowIndex}: Skipped (only ${columns.length} columns):`, columns);
				}
				rowIndex++;
				continue;
			}

			// Try to detect header row
			if (!headerFound) {
				if (debug) {
					console.log(`  🔎 Row ${rowIndex}: Testing as potential header (${columns.length} columns):`, columns);
				}

				const potentialMapping = detectColumnMapping(columns, debug);
				const matchKeys = Object.keys(potentialMapping);
				const hasName = "name" in potentialMapping;
				const hasTime =
					"start" in potentialMapping ||
					"end" in potentialMapping ||
					"attendance" in potentialMapping ||
					"hours" in potentialMapping;
				const strongHeader = matchKeys.length >= 3 || (hasName && hasTime);
				if (strongHeader) {
					columnMapping = potentialMapping;
					headerFound = true;
					if (debug) {
						console.log(
							`  ✅ Header row detected! Mapped ${matchKeys.length} columns (name=${hasName}, timeField=${hasTime})`,
						);
					}
					rowIndex++;
					continue; // Skip header row itself
				} else if (debug) {
					console.log(`  ❌ Not a header (only ${matchKeys.length} matches)`);
				}
			}

			// Parse data row if we have a mapping
			if (headerFound && Object.keys(columnMapping).length > 0) {
				// Opportunistically infer date column position from data rows when
				// the header itself doesn't expose an explicit date label. This
				// handles layouts where the "Date" label lives on a separate row.
				if (columnMapping["date"] === undefined) {
					for (let i = 0; i < columns.length; i++) {
						if (isDateLike(columns[i])) {
							columnMapping["date"] = i;
							if (debug) {
								console.log(
									`  📅 Inferred date column at index ${i} from row ${rowIndex}:`,
									columns[i],
								);
							}
							break;
						}
					}
				}

				const dataRow = parseRowToData(columns, columnMapping);

				if (debug && rowIndex < 10) {
					console.log(`  📝 Row ${rowIndex} (${columns.length} cols):`, columns);
					console.log(`     → Parsed:`, dataRow);
				}

				// More lenient acceptance criteria
				if (dataRow.Date || dataRow.Name || dataRow.Shift || dataRow.Start) {
					allRows.push(dataRow);
				} else if (debug && rowIndex < 10) {
					console.log(`     ⚠️  Skipped (no key fields)`);
				}
			}

			rowIndex++;
		}
	}

	if (debug) {
		console.log(`\n✅ Extraction complete: ${allRows.length} rows parsed`);
		if (allRows.length > 0) {
			console.log("First row sample:", allRows[0]);
			console.log("Last row sample:", allRows[allRows.length - 1]);
		}
	}

	return allRows;
}

