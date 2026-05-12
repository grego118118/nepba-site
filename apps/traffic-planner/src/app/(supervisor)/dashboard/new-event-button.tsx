"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createEventAction } from "./actions";

type EventType = "commencement" | "football" | "mullins" | "other";

export function NewEventButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [eventType, setEventType] = useState<EventType>("commencement");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    if (!name || !startsAt || !endsAt) {
      setError("Fill out all fields.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createEventAction({
        name,
        eventType,
        startsAt,
        endsAt,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.push(`/plan/${res.planId}`);
    });
  }

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        New event
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="card w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-slate-900">New event</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">Name</label>
                <input
                  className="input mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Commencement 2026"
                />
              </div>
              <div>
                <label className="label">Type</label>
                <select
                  className="input mt-1"
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value as EventType)}
                >
                  <option value="commencement">Commencement</option>
                  <option value="football">Football game</option>
                  <option value="mullins">Mullins Center event</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Starts</label>
                  <input
                    type="datetime-local"
                    className="input mt-1"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Ends</label>
                  <input
                    type="datetime-local"
                    className="input mt-1"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                  />
                </div>
              </div>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={submit}
                disabled={pending}
              >
                {pending ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
