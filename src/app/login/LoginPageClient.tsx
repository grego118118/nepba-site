"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export function LoginPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setLoading(false);

    if (!result || result.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push(result.url ?? callbackUrl);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4 text-slate-100 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/10 blur-[120px] animate-float delay-1000" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-600/10 blur-[120px] animate-float" />
      </div>

      <div className="w-full max-w-md space-y-8 rounded-2xl glass-card p-8 shadow-2xl relative z-10 animate-slide-up">
        <header className="space-y-4 text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-slate-800/50 border border-slate-700/50 shadow-inner mb-2 animate-pulse-glow">
            <span className="text-3xl">🛡️</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400 mb-1">
              NEPBA Local 190
            </p>
            <h1 className="text-2xl font-bold text-white tracking-tight">Member Portal</h1>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            Please sign in to access secure union resources, contracts, and grievance tools.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 animate-fade-in flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-400 ml-1"
            >
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="input-glow block w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 shadow-inner outline-none placeholder:text-slate-600 focus:bg-slate-900 transition-colors"
              placeholder="officer@plugin.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wide text-slate-400 ml-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-glow block w-full rounded-lg border border-slate-700 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 shadow-inner outline-none placeholder:text-slate-600 focus:bg-slate-900 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-glow w-full inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all hover:bg-blue-500 hover:-translate-y-0.5 disabled:cursor-progress disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In to Portal"
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-slate-800/50">
          <p className="text-center text-xs text-slate-500 leading-relaxed">
            Having trouble accessing your account? <br />
            Contact your Local 190 representative.
          </p>

          <div className="text-center mt-6">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-400 hover:text-blue-400 transition-colors inline-flex items-center gap-1 group"
            >
              <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to public site
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
