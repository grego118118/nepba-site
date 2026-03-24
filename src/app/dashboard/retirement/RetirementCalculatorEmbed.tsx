"use client";

import { useState } from "react";
import Link from "next/link";

const CALCULATOR_URL =
  "http://localhost:3001/embed/calculator?group=1&partner=NEPBA-Local-190";

export function RetirementCalculatorEmbed() {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-200 md:max-w-lg">
        <p className="font-medium">Calculator temporarily unavailable</p>
        <p className="mt-1 text-slate-400">
          If this tool does not load inside the portal, you can try opening the
          Massachusetts pension calculator in a separate window.
        </p>
        <Link
          href={CALCULATOR_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex text-[11px] font-semibold text-blue-300 hover:text-blue-200"
        >
          Open calculator in new tab
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md md:max-w-lg">
      <iframe
        src={CALCULATOR_URL}
        width="400"
        height="550"
        className="h-[550px] w-full rounded-lg shadow-md shadow-black/30"
        style={{
          border: "none",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        }}
        frameBorder={0}
        title="Massachusetts Pension Calculator"
        loading="lazy"
        onError={() => setHasError(true)}
      />
    </div>
  );
}

