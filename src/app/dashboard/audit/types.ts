export interface AuditConfig {
	baseRate: number;
	eveningDiff: number;
	nightDiff: number;
	weekendDiff: number;
	multiplier: number;
	includeWellness: boolean;
	wellnessRate: number;
	includeIncident: boolean;
	incidentRate: number;
	includeOnCall: boolean;
	onCallAnnual: number;
	vendorDetailPrem: number;
	mullinsDetailPrem: number;
	enableSquadLogic: boolean;
	squadAnchor: string;
	regularShiftType: string;
	groupByPayPeriod: boolean;
	// Date-based wellness add-ons
	includeWellnessAddon1: boolean;
	wellnessAddon1Annual: number;
	wellnessAddon1EffectiveDate: string;
	includeWellnessAddon2: boolean;
	wellnessAddon2Annual: number;
	wellnessAddon2EffectiveDate: string;
	// Deprecated but kept for type safety if needed temporarily
	baseShiftDiff?: number;
	rotationStartDate?: string;
	includeDEPremium?: boolean;
	dePremiumPercent?: number;
}

export interface RawDataRow {
	Date?: number | string;
	date?: number | string;
	Weekday?: string;
	Day?: string;
	day?: string;
	Shift?: string;
	shift?: string;
	Name?: string;
	name?: string;
	Rank?: string;
	rank?: string;
	Start?: number | string;
	start?: number | string;
	End?: number | string;
	end?: number | string;
	Attendance?: string;
	Duty?: string;
	Unit?: string;
	Post?: string;
}

export interface ProcessedRow extends RawDataRow {
	_formattedDate: string;
	_formattedStart: string;
	_formattedEnd: string;
	_payPeriod: string;
	_hours: number;
	_detailType: string;
	_typeColor: string;
	_premiumPct: number;
	_visualDiffs: string;
	_mgmtRate: number;
	_unionRate: number;
	_gapPerHr: number;
	_mgmtTotal: number;
	_unionTotal: number;
	_loss: number;
	_jobDisplay?: string;
	_cleanUnit?: string;
	_id: number;
	// Backward compat
	_diffLabels?: string[];
	_diffRate?: number;
}

export interface GroupedData {
	[payPeriod: string]: ProcessedRow[];
}

export interface Totals {
	owed: number;
	hours: number;
	count: number;
	mgmtPaid: number;
	flsaPaid: number;
}

