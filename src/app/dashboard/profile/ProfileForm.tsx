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
    };
}

export function ProfileForm({ userId, userEmail, initialData }: ProfileFormProps) {
    const router = useRouter();
    const [firstName, setFirstName] = useState(initialData.firstName);
    const [lastName, setLastName] = useState(initialData.lastName);
    const [badgeNumber, setBadgeNumber] = useState(initialData.badgeNumber ?? "");
    const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("saving");
        setErrorMessage("");

        try {
            const result = await saveProfile({
                userId,
                userEmail,
                firstName,
                lastName,
                badgeNumber,
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
                    Update your personal information and badge number.
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
