"use client";

import { useRef, useState, useTransition } from "react";

import type { Officer } from "@/lib/schema";
import {
  importCsvAction,
  toggleOfficerActiveAction,
  upsertOfficerAction,
} from "./actions";

type Draft = {
  badgeNumber: string;
  firstName: string;
  lastName: string;
  rank: string;
  email: string;
  phone: string;
};

const emptyDraft: Draft = {
  badgeNumber: "",
  firstName: "",
  lastName: "",
  rank: "",
  email: "",
  phone: "",
};

export function RosterClient({ officers }: { officers: Officer[] }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await upsertOfficerAction(draft);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setDraft(emptyDraft);
    });
  }

  function onCsvSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const csv = String(reader.result ?? "");
      startTransition(async () => {
        const res = await importCsvAction(csv);
        if (!res.ok) {
          setImportMsg(res.error);
          return;
        }
        setImportMsg(`Imported ${res.imported} officers.`);
        if (fileInput.current) fileInput.current.value = "";
      });
    };
    reader.readAsText(file);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Badge</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">Active</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {officers.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                  No officers yet. Add one or import a CSV.
                </td>
              </tr>
            ) : (
              officers.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-mono text-xs">{o.badgeNumber}</td>
                  <td className="px-4 py-3">
                    {o.lastName}, {o.firstName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{o.rank ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {o.email ?? o.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <form action={toggleOfficerActiveAction}>
                      <input type="hidden" name="id" value={o.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={String(!o.active)}
                      />
                      <button
                        className={`rounded px-2 py-1 text-xs ${
                          o.active
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                        }`}
                      >
                        {o.active ? "Active" : "Inactive"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="space-y-6">
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Add / update officer</h2>
          <p className="text-xs text-slate-500">
            Updating an existing badge replaces that officer&apos;s details.
          </p>
          <div className="mt-4 space-y-3">
            <Field label="Badge #" value={draft.badgeNumber}
              onChange={(v) => setDraft({ ...draft, badgeNumber: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="First" value={draft.firstName}
                onChange={(v) => setDraft({ ...draft, firstName: v })} />
              <Field label="Last" value={draft.lastName}
                onChange={(v) => setDraft({ ...draft, lastName: v })} />
            </div>
            <Field label="Rank" value={draft.rank}
              onChange={(v) => setDraft({ ...draft, rank: v })} />
            <Field label="Email" value={draft.email} type="email"
              onChange={(v) => setDraft({ ...draft, email: v })} />
            <Field label="Phone" value={draft.phone}
              onChange={(v) => setDraft({ ...draft, phone: v })} />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button className="btn-primary w-full" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="text-sm font-semibold text-slate-900">Import CSV</h2>
          <p className="text-xs text-slate-500">
            Columns: <code>badge,first_name,last_name,rank,email,phone</code>
          </p>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            className="mt-3 block w-full text-xs"
            onChange={onCsvSelected}
            disabled={pending}
          />
          {importMsg ? (
            <p className="mt-2 text-xs text-slate-600">{importMsg}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className="input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
