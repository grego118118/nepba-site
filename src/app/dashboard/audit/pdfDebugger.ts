"use client";

/**
 * PDF Debug Utility
 * 
 * This module provides debugging tools to inspect PDF structure
 * and help diagnose column detection issues.
 */

interface TextItem {
	str: string;
	transform: number[];
	width: number;
	height: number;
}

/**
 * Extract and log raw text structure from a PDF file
 * Useful for understanding how text is positioned in the PDF
 */
export async function debugPdfStructure(file: File): Promise<void> {
	if (typeof window === "undefined") {
		throw new Error("PDF debugging is only available in the browser.");
	}

	const pdfjsLib = await import("pdfjs-dist");
	(pdfjsLib as any).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

	const arrayBuffer = await file.arrayBuffer();
	const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

	console.log("=".repeat(80));
	console.log("PDF DEBUG REPORT");
	console.log("=".repeat(80));
	console.log(`File: ${file.name}`);
	console.log(`Pages: ${pdf.numPages}`);
	console.log(`Size: ${(file.size / 1024).toFixed(2)} KB`);
	console.log("=".repeat(80));

	// Only debug first page to avoid overwhelming console
	const page = await pdf.getPage(1);
	const textContent = await page.getTextContent();
	const items = textContent.items as TextItem[];

	console.log(`\nPage 1: ${items.length} text items\n`);

	// Group by Y position to show row structure
	const rowMap = new Map<number, { y: number; items: { x: number; text: string }[] }>();
	const yTolerance = 5;

	for (const item of items) {
		if (!item.str.trim()) continue;
		const y = Math.round(item.transform[5]);
		const x = item.transform[4];

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
		rowMap.get(targetY)!.items.push({ x, text: item.str });
	}

	// Sort rows top to bottom
	const sortedRows = Array.from(rowMap.values()).sort((a, b) => b.y - a.y);

	console.log("First 20 rows (showing X positions and text):\n");
	sortedRows.slice(0, 20).forEach((row, idx) => {
		row.items.sort((a, b) => a.x - b.x);
		const rowText = row.items.map(item => item.text).join(" ");
		console.log(`Row ${idx} (Y=${row.y}):`);
		console.log(`  Text: ${rowText}`);
		console.log(`  Items: ${row.items.length}`);
		console.log(`  X positions: ${row.items.map(i => Math.round(i.x)).join(", ")}`);
		console.log("");
	});

	console.log("=".repeat(80));
	console.log("END DEBUG REPORT");
	console.log("=".repeat(80));
}

/**
 * Analyze column boundaries by looking at X-position clustering
 */
export function analyzeColumnBoundaries(items: { x: number; text: string }[]): number[] {
	const xPositions = items.map(item => item.x).sort((a, b) => a - b);
	
	// Find gaps in X positions
	const gaps: { position: number; size: number }[] = [];
	for (let i = 1; i < xPositions.length; i++) {
		const gap = xPositions[i] - xPositions[i - 1];
		if (gap > 10) { // Minimum gap to consider
			gaps.push({ position: xPositions[i - 1], size: gap });
		}
	}

	// Sort by gap size and take the largest ones as column boundaries
	gaps.sort((a, b) => b.size - a.size);
	
	return gaps.slice(0, 10).map(g => g.position);
}

