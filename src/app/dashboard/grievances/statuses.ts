export const STATUSES = [
  "Step 1",
  "Step 2",
  "Step 3",
  "Mediation",
  "Arbitration",
  "Resolved",
] as const;

export type GrievanceStatus = (typeof STATUSES)[number];

