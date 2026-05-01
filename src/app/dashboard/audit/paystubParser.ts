"use client";

import { mapEarningsCode, type PaystubCategory } from "./paystubCodes";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfJs() {
    if (typeof window === "undefined") {
        throw new Error("PDF parsing is only available in the browser.");
    }
    if (!pdfjsPromise) {
        pdfjsPromise = import("pdfjs-dist").then((pdfjsLib) => {
            try {
                (pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
            } catch {
                // ignore
            }
            return pdfjsLib;
        });
    }
    return pdfjsPromise;
}

interface PositionedText {
    str: string;
    x: number;
    y: number;
    width: number;
}

interface RowGroup {
    y: number;
    items: PositionedText[];
}

export interface ParsedEarningsRow {
    description: string;
    rate: number | null;
    currentHours: number | null;
    currentEarnings: number | null;
    ytdHours: number | null;
    ytdEarnings: number | null;
    category: PaystubCategory;
    isHoursWorked: boolean;
    inFlsaPot: "yes" | "no" | "configurable";
}

export interface ParsedPaystub {
    payBeginDate: string | null;
    payEndDate: string | null;
    advice: string | null;
    employer: string | null;
    baseRate: number | null;
    earnings: ParsedEarningsRow[];
    totalGross: number | null;
    netPay: number | null;
    unrecognizedDescriptions: string[];
    warnings: string[];
}

const NUMERIC_RE = /^-?[\d,]+(\.\d+)?$/;

function parseNum(s: string): number | null {
    if (!s) return null;
    const cleaned = s.replace(/,/g, "").trim();
    if (!NUMERIC_RE.test(s.trim())) return null;
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : null;
}

function parseDate(s: string): string | null {
    const m = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return null;
    const [, mm, dd, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function groupByRow(items: PositionedText[], yTol = 3): RowGroup[] {
    const map = new Map<number, RowGroup>();
    for (const item of items) {
        if (!item.str.trim()) continue;
        let matchedY: number | null = null;
        for (const y of map.keys()) {
            if (Math.abs(y - item.y) <= yTol) {
                matchedY = y;
                break;
            }
        }
        const targetY = matchedY ?? item.y;
        if (!map.has(targetY)) map.set(targetY, { y: targetY, items: [] });
        map.get(targetY)!.items.push(item);
    }
    return Array.from(map.values())
        .map((r) => ({ ...r, items: r.items.sort((a, b) => a.x - b.x) }))
        .sort((a, b) => b.y - a.y);
}

function findClosestNumeric(
    xPos: number,
    candidates: PositionedText[],
    used: Set<PositionedText>,
    maxDist = 90,
): { item: PositionedText; value: number } | null {
    let best: PositionedText | null = null;
    let bestDist = Infinity;
    for (const item of candidates) {
        if (used.has(item)) continue;
        if (parseNum(item.str) === null) continue;
        const d = Math.abs(item.x - xPos);
        if (d < bestDist) {
            best = item;
            bestDist = d;
        }
    }
    if (!best || bestDist > maxDist) return null;
    return { item: best, value: parseNum(best.str)! };
}

export async function parsePaystubPdf(file: File): Promise<ParsedPaystub> {
    const pdfjsLib = await getPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const allItems: PositionedText[] = [];
    for (let p = 1; p <= pdf.numPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();
        for (const rawItem of textContent.items as Array<{ str: string; transform: number[]; width: number }>) {
            allItems.push({
                str: rawItem.str,
                x: rawItem.transform[4],
                y: rawItem.transform[5],
                width: rawItem.width,
            });
        }
    }

    const rows = groupByRow(allItems);

    const result: ParsedPaystub = {
        payBeginDate: null,
        payEndDate: null,
        advice: null,
        employer: null,
        baseRate: null,
        earnings: [],
        totalGross: null,
        netPay: null,
        unrecognizedDescriptions: [],
        warnings: [],
    };

    // Pass 1: metadata
    for (const row of rows) {
        const text = row.items.map((i) => i.str).join(" ");
        const mBegin = text.match(/Pay Begin Date:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (mBegin && !result.payBeginDate) result.payBeginDate = parseDate(mBegin[1]);
        const mEnd = text.match(/Pay End Date:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
        if (mEnd && !result.payEndDate) result.payEndDate = parseDate(mEnd[1]);
        const mAdvice = text.match(/Advice\s*#?:?\s*(\d{6,})/i);
        if (mAdvice && !result.advice) result.advice = mAdvice[1];
        if (!result.employer && /University of Massachusetts/i.test(text)) {
            result.employer = "University of Massachusetts";
        }
    }

    // Pass 2: locate HOURS AND EARNINGS section + column header positions
    let inEarnings = false;
    let foundColumns = false;
    const columnX: { rate?: number; currentHours?: number; currentEarnings?: number; ytdHours?: number; ytdEarnings?: number } = {};

    for (const row of rows) {
        const text = row.items.map((i) => i.str.trim()).filter(Boolean).join(" ");

        if (/HOURS AND EARNINGS/i.test(text)) {
            inEarnings = true;
            continue;
        }

        if (inEarnings && /^(TAXES|BEFORE-?TAX DEDUCTIONS|AFTER-?TAX DEDUCTIONS|EMPLOYER PAID BENEFITS|TOTAL\s*:|TOTAL GROSS)/i.test(text)) {
            inEarnings = false;
            continue;
        }

        if (!inEarnings) continue;

        if (!foundColumns) {
            const labels = row.items.map((i) => ({ label: i.str.trim().toLowerCase(), x: i.x }));
            const hasDescription = labels.some((l) => l.label === "description");
            const hasRate = labels.some((l) => l.label === "rate");
            const hoursPositions = labels.filter((l) => l.label === "hours").map((l) => l.x);
            const earningsPositions = labels.filter((l) => l.label === "earnings").map((l) => l.x);
            if (hasDescription || (hasRate && hoursPositions.length >= 1 && earningsPositions.length >= 1)) {
                const ratePos = labels.find((l) => l.label === "rate")?.x;
                if (ratePos !== undefined) columnX.rate = ratePos;
                if (hoursPositions[0] !== undefined) columnX.currentHours = hoursPositions[0];
                if (earningsPositions[0] !== undefined) columnX.currentEarnings = earningsPositions[0];
                if (hoursPositions[1] !== undefined) columnX.ytdHours = hoursPositions[1];
                if (earningsPositions[1] !== undefined) columnX.ytdEarnings = earningsPositions[1];
                foundColumns = true;
                continue;
            }
        }

        if (!foundColumns) continue;

        const numericItems = row.items.filter((i) => parseNum(i.str) !== null);
        const textItems = row.items.filter((i) => parseNum(i.str) === null);

        if (numericItems.length === 0) continue;

        const description = textItems
            .map((i) => i.str)
            .join(" ")
            .replace(/\s+/g, " ")
            .trim();
        if (!description) continue;

        const used = new Set<PositionedText>();
        const tryColumn = (xPos: number | undefined): number | null => {
            if (xPos === undefined) return null;
            const match = findClosestNumeric(xPos, numericItems, used);
            if (!match) return null;
            used.add(match.item);
            return match.value;
        };

        const rate = tryColumn(columnX.rate);
        const currentHours = tryColumn(columnX.currentHours);
        const currentEarnings = tryColumn(columnX.currentEarnings);
        const ytdHours = tryColumn(columnX.ytdHours);
        const ytdEarnings = tryColumn(columnX.ytdEarnings);

        const mapping = mapEarningsCode(description);

        result.earnings.push({
            description,
            rate,
            currentHours,
            currentEarnings,
            ytdHours,
            ytdEarnings,
            category: mapping.category,
            isHoursWorked: mapping.isHoursWorked,
            inFlsaPot: mapping.inFlsaPot,
        });

        if (mapping.category === "unknown") {
            result.unrecognizedDescriptions.push(description);
        }
    }

    // Base rate from "Regular" row
    const reg = result.earnings.find((e) => e.category === "regular");
    if (reg && reg.rate) result.baseRate = reg.rate;

    // Total gross / net pay — extracted from the summary block at the bottom
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const text = row.items.map((it) => it.str).join(" ");
        const mGross = text.match(/Current[\s\S]{0,40}?([\d,]+\.\d{2})/);
        if (mGross && !result.totalGross && /TOTAL GROSS/i.test(rows[Math.max(0, i - 1)]?.items.map((it) => it.str).join(" ") ?? "")) {
            const n = parseNum(mGross[1]);
            if (n) result.totalGross = n;
        }
    }
    if (!result.totalGross) {
        // Fallback: scan whole doc for "TOTAL GROSS … <number>"
        const fullText = rows.map((r) => r.items.map((i) => i.str).join(" ")).join("\n");
        const m = fullText.match(/TOTAL GROSS[\s\S]{0,80}?(\d{1,3}(?:,\d{3})*\.\d{2})/);
        if (m) {
            const n = parseNum(m[1]);
            if (n) result.totalGross = n;
        }
    }

    // Sanity warnings
    if (result.earnings.length === 0) {
        result.warnings.push("No earnings rows extracted. The paystub format may not be supported.");
    }
    if (result.totalGross && result.earnings.length > 0) {
        const sumCurrent = result.earnings.reduce((s, e) => s + (e.currentEarnings ?? 0), 0);
        if (Math.abs(sumCurrent - result.totalGross) > 0.5) {
            result.warnings.push(
                `Sum of current earnings ($${sumCurrent.toFixed(2)}) does not match Total Gross ($${result.totalGross.toFixed(2)}). Some rows may have been mis-parsed.`,
            );
        }
    }
    if (result.unrecognizedDescriptions.length > 0) {
        result.warnings.push(
            `${result.unrecognizedDescriptions.length} line item(s) not recognized — please assign categories before applying.`,
        );
    }

    return result;
}
