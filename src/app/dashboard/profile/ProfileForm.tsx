"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveProfile } from "./actions";

interface ProfileFormProps {
    userId: string;
    userEmail: string;
    initialData: {
        firstName: string;
        lastName: string;
        badgeNumber: string | null;
        retirementGroup: string | null;
        hireDate: string | null;
        averageSalary: number | null;
    };
}

export function ProfileForm({ userId, userEmail, initialData }: ProfileFormProps) {
    const router = useRouter();
    const [firstName, setFirstName] = useState(initialData.firstName);
    const [lastName, setLastName] = useState(initialData.lastName);
    const [badgeNumber, setBadgeNumber] = useState(initialData.badgeNumber ?? "");
    const [retirementGroup, setRetirementGroup] = useState(
        initialData.retirementGroup ?? "2",
    );
    const [hireDate, setHireDate] = useState(initialData.hireDate ?? "");
    const [averageSalary, setAverageSalary] = useState<string>(
        initialData.averageSalary != null ? String(initialData.averageSalary) : "",
    );
    const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("saving");
        setErrorMessage("");

        try {
            const parsedSalary = averageSalary.trim() === ""
                ? null
                : Number(averageSalary);
            const result = await saveProfile({
                userId,
                userEmail,
                firstName,
                lastName,
                badgeNumber,
                retirementGroup: retirementGroup || null,
                hireDate: hireDate || null,
                averageSalary:
                    parsedSalary != null && Number.isFinite(parsedSalary)
                        ? parsedSalary
                        : null,
            });

            if (result.success) {
                setStatus("success");
                router.refresh();
                setTimeout(() => setStatus("idle"), 2000);
            } else {
                setStatus("error");
                setErrorMessage(result.error || "Failed to update profile");
            }
        } catch (err) {
            console.error(err);
            setStatus("error");
            setErrorMessage("An unexpected error occurred");
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="space-y-6 rounded-xl border border-slate-800 bg-slate-950/70 p-6 shadow-sm"
        >
            <div className="space-y-1">
                <h2 className="text-lg font-semibold text-slate-50">Details</h2>
                <p className="text-sm text-slate-400">
                    Personal info plus the retirement details that pre-fill your
                    pension estimator.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                    <label htmlFor="firstName" className="text-xs font-semibold uppercase text-slate-500">
                        First Name
                    </label>
                    <input
                        id="firstName"
                        type="text"
                        required
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="lastName" className="text-xs font-semibold uppercase text-slate-500">
                        Last Name
                    </label>
                    <input
                        id="lastName"
                        type="text"
                        required
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="badgeNumber" className="text-xs font-semibold uppercase text-slate-500">
                        Badge Number
                    </label>
                    <input
                        id="badgeNumber"
                        type="text"
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={badgeNumber}
                        onChange={(e) => setBadgeNumber(e.target.value)}
                        placeholder="e.g. 1234"
                    />
                </div>

                <div className="space-y-2">
                    <label htmlFor="retirementGroup" className="text-xs font-semibold uppercase text-slate-500">
                        Retirement Group
                    </label>
                    <select
                        id="retirementGroup"
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={retirementGroup}
                        onChange={(e) => setRetirementGroup(e.target.value)}
                    >
                        <option value="1">Group 1 — General</option>
                        <option value="2">Group 2 — Hazardous (Local 190)</option>
                        <option value="3">Group 3 — State Police</option>
                        <option value="4">Group 4 — Police / Fire / Corrections</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <label htmlFor="hireDate" className="text-xs font-semibold uppercase text-slate-500">
                        Hire Date
                    </label>
                    <input
                        id="hireDate"
                        type="date"
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={hireDate}
                        onChange={(e) => setHireDate(e.target.value)}
                    />
                    <p className="text-[11px] text-slate-500">
                        Used to determine the pre- or post-Apr 2, 2012 pension formula.
                    </p>
                </div>

                <div className="space-y-2">
                    <label htmlFor="averageSalary" className="text-xs font-semibold uppercase text-slate-500">
                        Average salary (optional)
                    </label>
                    <input
                        id="averageSalary"
                        type="number"
                        min={0}
                        step={1000}
                        className="w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        value={averageSalary}
                        onChange={(e) => setAverageSalary(e.target.value)}
                        placeholder="e.g. 95000"
                    />
                    <p className="text-[11px] text-slate-500">
                        Average of your highest 3 (pre-2012) or 5 (post-2012) consecutive years.
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
                {status === "success" && (
                    <span className="text-sm font-medium text-emerald-400">Saved successfully!</span>
                )}
                {status === "error" && (
                    <span className="text-sm font-medium text-red-400">{errorMessage}</span>
                )}
                <button
                    type="submit"
                    disabled={status === "saving"}
                    className="inline-flex items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50"
                >
                    {status === "saving" ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </form>
    );
}
