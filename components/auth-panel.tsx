"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, LockKeyhole, Mail, PartyPopper } from "lucide-react";
import Image from "next/image";
import { Button, Field, inputClass } from "./ui";

type Mode = "login" | "register" | "forgot" | "reset";

function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const isError = tone === "error";
  const Icon = isError ? AlertCircle : CheckCircle2;
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm ${
        isError ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
      }`}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

export function AuthPanel({ initialMode = "login" }: { initialMode?: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registered, setRegistered] = useState(false);
  const [verified, setVerified] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = mode === "forgot" || mode === "reset" ? mode : mode;
      if (mode === "reset" && password !== confirmPassword) {
        throw new Error("The new passwords do not match.");
      }
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "forgot" ? { email } : mode === "reset" ? { email, code, password } : { email, password }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Something went wrong. Please try again.");
      if (mode === "register") {
        setRegistered(true);
      } else if (mode === "forgot") {
        setMode("reset");
        setSuccess("If that verified account exists, a reset code has been sent to its email.");
      } else if (mode === "reset") {
        setMode("login");
        setCode("");
        setPassword("");
        setConfirmPassword("");
        setSuccess("Password updated. Sign in with your new password.");
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

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Verification failed. Please try again.");
      setVerified(true);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Could not send a new code.");
      setSuccess("A new verification code was sent.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send a new code.");
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

          {verified ? (
            <div className="relative overflow-hidden px-6 py-12 text-center">
              <div className="celebration-confetti" aria-hidden="true">
                {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
              </div>
              <div className="mx-auto flex h-20 w-20 animate-[welcome-pop_.6s_ease-out_both] items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-[0_0_0_12px_rgba(209,250,229,.45)]">
                <PartyPopper className="h-9 w-9" />
              </div>
              <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Email verified</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Congratulations!</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-600">
                Your account is ready. Continue to your DWS workspace and start building your schedule.
              </p>
              <Button
                type="button"
                variant="primary"
                className="mt-7 h-11 w-full"
                onClick={() => {
                  router.replace("/app");
                  router.refresh();
                }}
              >
                Start building my schedule
              </Button>
            </div>
          ) : registered ? (
            <div className="px-6 py-10 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h2 className="mt-4 text-xl font-bold text-slate-950">Enter your verification code</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                We sent a six-digit code to <strong>{email}</strong>. It expires in 15 minutes.
              </p>
              <form onSubmit={verifyCode} className="mt-6 space-y-4">
                <Field label="Verification code">
                  <input
                    className={`${inputClass} text-center text-lg font-bold tracking-[0.35em]`}
                    value={code}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    aria-label="Six-digit verification code"
                  />
                </Field>
                {error && <Notice tone="error">{error}</Notice>}
                {!error && success && <Notice tone="success">{success}</Notice>}
                <Button type="submit" variant="primary" className="h-11 w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify and open workspace"}
                </Button>
              </form>
              <div className="mt-4 flex items-center justify-center gap-3 text-sm">
                <button type="button" className="font-medium text-blue-700 hover:text-blue-800" disabled={busy} onClick={resendCode}>
                  Send a new code
                </button>
                <span className="text-slate-300">•</span>
                <button type="button" className="font-medium text-slate-500 hover:text-slate-700" onClick={() => { setRegistered(false); setCode(""); setError(""); }}>
                  Use another email
                </button>
              </div>
            </div>
          ) : mode === "login" || mode === "register" ? (
            <div className="p-6">
              <div className="mb-6 grid grid-cols-2 rounded-lg bg-slate-100 p-1">
                <button
                  type="button"
                  className={`h-9 rounded-md text-sm font-semibold ${mode === "login" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`h-9 rounded-md text-sm font-semibold ${mode === "register" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}
                  onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
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

                {mode === "login" && (
                  <div className="-mt-1 text-right">
                    <button
                      type="button"
                      className="text-sm font-medium text-blue-700 hover:text-blue-800"
                      onClick={() => { setMode("forgot"); setPassword(""); setError(""); setSuccess(""); }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {error && <Notice tone="error">{error}</Notice>}
                {!error && success && <Notice tone="success">{success}</Notice>}

                <Button type="submit" variant="primary" className="h-11 w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "register" ? "Create verified account" : "Sign in"}
                </Button>
                <p className="text-center text-xs leading-5 text-slate-500">
                  Your schedule is private and saved securely to your account.
                </p>
              </form>
            </div>
          ) : (
            <div className="p-6">
              <button
                type="button"
                className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
                onClick={() => { setMode("login"); setError(""); setSuccess(""); setCode(""); }}
              >
                <ArrowLeft className="h-4 w-4" /> Back to sign in
              </button>
              <div className="mb-5">
                <h2 className="text-xl font-bold text-slate-950">{mode === "forgot" ? "Reset your password" : "Choose a new password"}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {mode === "forgot"
                    ? "Enter the verified email on your account. We will send a six-digit reset code."
                    : `Enter the reset code sent to ${email} and create a new password.`}
                </p>
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
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={mode === "reset"}
                    />
                  </div>
                </Field>
                {mode === "reset" && (
                  <>
                    <Field label="Six-digit reset code">
                      <input
                        className={`${inputClass} text-center text-lg font-bold tracking-[0.35em]`}
                        value={code}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                        placeholder="000000"
                      />
                    </Field>
                    <Field label="New password">
                      <input
                        className={inputClass}
                        type="password"
                        autoComplete="new-password"
                        minLength={10}
                        maxLength={128}
                        required
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="At least 10 characters"
                      />
                    </Field>
                    <Field label="Confirm new password">
                      <input
                        className={inputClass}
                        type="password"
                        autoComplete="new-password"
                        minLength={10}
                        maxLength={128}
                        required
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        placeholder="Enter the new password again"
                      />
                    </Field>
                  </>
                )}
                {error && <Notice tone="error">{error}</Notice>}
                {!error && success && <Notice tone="success">{success}</Notice>}
                <Button type="submit" variant="primary" className="h-11 w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "forgot" ? "Send reset code" : "Update password"}
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
