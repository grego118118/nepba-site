// Earnings code dictionary mapping PeopleSoft / municipal payroll line items
// to FLSA-relevant categories. Order: exact match → regex heuristic → unknown.
//
// To extend: add to PEOPLESOFT_CODES (exact descriptions) or HEURISTICS (patterns).

export type PaystubCategory =
    | "regular"
    | "overtime"
    | "detail"
    | "shiftDiff"
    | "leave"
    | "compUsed"
    | "compEarned"
    | "lumpSum"
    | "other"
    | "unknown";

export interface CategoryMapping {
    category: PaystubCategory;
    /** Hours that count toward FLSA "hours worked" (the divisor). */
    isHoursWorked: boolean;
    /** Should this earnings line pull up the FLSA regular rate? */
    inFlsaPot: "yes" | "no" | "configurable";
}

const PEOPLESOFT_CODES: Record<string, CategoryMapping> = {
    "Regular": { category: "regular", isHoursWorked: true, inFlsaPot: "yes" },
    "Overtime Premium Pay": { category: "overtime", isHoursWorked: false, inFlsaPot: "no" },
    "Outside Detail Ovt Straight": { category: "detail", isHoursWorked: true, inFlsaPot: "configurable" },
    "Outside Detail Ovt Premium": { category: "detail", isHoursWorked: true, inFlsaPot: "configurable" },
    "Outside Detail": { category: "detail", isHoursWorked: true, inFlsaPot: "configurable" },
    "Shift Retirement Elig": { category: "shiftDiff", isHoursWorked: false, inFlsaPot: "configurable" },
    "Shift Differential": { category: "shiftDiff", isHoursWorked: false, inFlsaPot: "configurable" },
    "Sick Time": { category: "leave", isHoursWorked: false, inFlsaPot: "no" },
    "Personal Time": { category: "leave", isHoursWorked: false, inFlsaPot: "no" },
    "Vacation": { category: "leave", isHoursWorked: false, inFlsaPot: "no" },
    "Holiday Paid Straight Ret Elig": { category: "leave", isHoursWorked: false, inFlsaPot: "no" },
    "Holiday Paid Straight": { category: "leave", isHoursWorked: false, inFlsaPot: "no" },
    "Holiday Paid": { category: "leave", isHoursWorked: false, inFlsaPot: "no" },
    "Comp Time Used": { category: "compUsed", isHoursWorked: false, inFlsaPot: "no" },
    "Comp Time Earned Premium": { category: "compEarned", isHoursWorked: true, inFlsaPot: "no" },
    "Comp Time Earned Straight": { category: "compEarned", isHoursWorked: true, inFlsaPot: "no" },
    "Grievance Settlement": { category: "lumpSum", isHoursWorked: false, inFlsaPot: "configurable" },
    "Lump Sum Payment": { category: "lumpSum", isHoursWorked: false, inFlsaPot: "configurable" },
    "Retro Pay": { category: "lumpSum", isHoursWorked: false, inFlsaPot: "configurable" },
};

const HEURISTICS: { test: RegExp; mapping: CategoryMapping }[] = [
    { test: /^regular$/i, mapping: { category: "regular", isHoursWorked: true, inFlsaPot: "yes" } },
    { test: /overtime.*(premium|prem)/i, mapping: { category: "overtime", isHoursWorked: false, inFlsaPot: "no" } },
    { test: /detail/i, mapping: { category: "detail", isHoursWorked: true, inFlsaPot: "configurable" } },
    { test: /\b(sick|vacation|personal|holiday|jury|bereavement|funeral)\b/i, mapping: { category: "leave", isHoursWorked: false, inFlsaPot: "no" } },
    { test: /comp\s*time\s*used/i, mapping: { category: "compUsed", isHoursWorked: false, inFlsaPot: "no" } },
    { test: /comp\s*time\s*earned/i, mapping: { category: "compEarned", isHoursWorked: true, inFlsaPot: "no" } },
    { test: /(shift|night|evening|weekend)\s*(diff|differential|retirement|premium|elig)/i, mapping: { category: "shiftDiff", isHoursWorked: false, inFlsaPot: "configurable" } },
    { test: /(lump\s*sum|settlement|retro|grievance|stipend|bonus)/i, mapping: { category: "lumpSum", isHoursWorked: false, inFlsaPot: "configurable" } },
];

export function mapEarningsCode(description: string): CategoryMapping {
    const cleaned = description.trim();
    const exact = PEOPLESOFT_CODES[cleaned];
    if (exact) return exact;
    for (const { test, mapping } of HEURISTICS) {
        if (test.test(cleaned)) return mapping;
    }
    return { category: "unknown", isHoursWorked: false, inFlsaPot: "no" };
}

export const CATEGORY_LABELS: Record<PaystubCategory, string> = {
    regular: "Regular",
    overtime: "Overtime",
    detail: "Detail",
    shiftDiff: "Shift Diff",
    leave: "Paid Leave",
    compUsed: "Comp Used",
    compEarned: "Comp Earned",
    lumpSum: "Lump Sum",
    other: "Other",
    unknown: "Unknown",
};

export const CATEGORY_COLORS: Record<PaystubCategory, string> = {
    regular: "bg-slate-400",
    overtime: "bg-blue-500",
    detail: "bg-yellow-500",
    shiftDiff: "bg-emerald-500",
    leave: "bg-purple-400",
    compUsed: "bg-orange-300",
    compEarned: "bg-orange-400",
    lumpSum: "bg-pink-400",
    other: "bg-slate-300",
    unknown: "bg-red-300",
};
