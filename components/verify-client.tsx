"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";

export function VerifyClient() {
  const params = useSearchParams();
  const router = useRouter();
  const started = useRef(false);
  const token = params.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "Verifying your email…" : "This verification link is incomplete.");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!token) return;

    fetch("/api/auth/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        const body = await response.json() as { error?: string };
        if (!response.ok) throw new Error(body.error || "Verification failed.");
        setStatus("success");
        setMessage("Email verified. Opening your workspace…");
        window.setTimeout(() => {
          router.replace("/app");
          router.refresh();
        }, 900);
      })
      .catch((error: unknown) => {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Verification failed.");
      });
  }, [token, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        {status === "loading" && <Loader2 className="mx-auto h-11 w-11 animate-spin text-red-700" />}
        {status === "success" && <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-600" />}
        {status === "error" && <TriangleAlert className="mx-auto h-11 w-11 text-amber-600" />}
        <h1 className="mt-5 text-xl font-bold text-slate-950">{message}</h1>
        {status === "error" && (
          <Link href="/login" className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 font-medium text-white">
            Return to sign in
          </Link>
        )}
      </section>
    </main>
  );
}
