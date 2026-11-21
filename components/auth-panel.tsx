"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, Loader2, LockKeyhole, Mail } from "lucide-react";
import Image from "next/image";
import { Button, Field, inputClass } from "./ui";

type Mode = "login" | "register";

export function AuthPanel({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [registered, setRegistered] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      if (mode === "register") {
        setRegistered(true);
      } else {
        router.replace("/app");
        router.refresh();
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12">
      <Image src="/campus/pnc-main-building.jpg" alt="Pamantasan ng Cabuyao main building" fill priority className="object-cover opacity-35" sizes="100vw" />
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,23,42,.96),rgba(127,29,29,.82))]" />

      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        <section className="overflow-hidden rounded-2xl border border-white/15 bg-white shadow-2xl">
          <header className="border-b border-slate-100 px-6 py-6">
            <div className="flex items-center gap-3">
              <Image src="/form/seal.png" alt="" width={152} height={193} className="h-12 w-auto" unoptimized />
              <div>
                <h1 className="text-xl font-bold text-slate-950">DWS Maker</h1>
                <p className="text-sm text-slate-500">Faculty work-schedule workspace</p>
              </div>
            </div>
          </header>

          {registered ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Check your email</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We sent a verification link to <strong>{email}</strong>. It expires in 24 hours.
              </p>
              <Button variant="primary" className="mt-6" onClick={() => setRegistered(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <div className="p-6">
              <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  className={`h-9 rounded-md text-sm font-semibold ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  onClick={() => { setMode("login"); setError(""); }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`h-9 rounded-md text-sm font-semibold ${mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  onClick={() => { setMode("register"); setError(""); }}
                >
                  Register
                </button>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <Field label="Email address">
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      className={`${inputClass} pl-9`}
                      type="email"
                      autoComplete="email"
                      required
                      maxLength={254}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                    />
                  </div>
                </Field>
                <Field label="Password">
                  <div className="relative">
                    <LockKeyhole className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      className={`${inputClass} pl-9`}
                      type="password"
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
                      required
                      minLength={mode === "register" ? 10 : 1}
                      maxLength={128}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder={mode === "register" ? "At least 10 characters" : "Your password"}
                    />
                  </div>
                </Field>

                {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

                <Button variant="primary" className="h-11 w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "register" ? "Create verified account" : "Sign in"}
                </Button>
                <p className="text-center text-xs leading-5 text-slate-500">
                  Your schedule is private and saved securely to your account.
                </p>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
