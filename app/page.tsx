import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Cloud, FileCheck2, ShieldCheck } from "lucide-react";

export default function Page() {
  const workspaceHref = "/login";

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative isolate min-h-[720px] overflow-hidden bg-slate-950 text-white">
        <Image
          src="/campus/pnc-main-building.jpg"
          alt="Main building of Pamantasan ng Cabuyao"
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,.96)_0%,rgba(15,23,42,.84)_45%,rgba(15,23,42,.3)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-slate-950/25" />

        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Image src="/form/seal.png" alt="" width={152} height={193} unoptimized className="h-11 w-auto" />
            <div>
              <p className="font-bold tracking-tight">DWS Maker</p>
              <p className="text-xs text-white/65">Pamantasan ng Cabuyao</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white/85 hover:bg-white/10">Sign in</Link>
            <Link href={workspaceHref} className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-slate-100">
              Create account <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto flex max-w-7xl px-5 pb-24 pt-24 sm:px-8 sm:pt-32">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/85 backdrop-blur">
              Faculty scheduling, simplified
            </p>
            <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-[-0.04em] sm:text-7xl">
              Build your teaching schedule with confidence.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/75">
              Plan regular and overload classes, complete the official DWS, and generate teaching-assignment letters from one private workspace.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href={workspaceHref} className="inline-flex h-12 items-center gap-2 rounded-lg bg-red-700 px-5 font-bold text-white shadow-lg shadow-red-950/25 hover:bg-red-600">
                Start your DWS <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex h-12 items-center rounded-lg border border-white/25 bg-white/10 px-5 font-semibold text-white backdrop-blur hover:bg-white/15">
                See what it can do
              </a>
            </div>
          </div>
        </div>
        <p className="absolute bottom-4 right-5 z-10 text-[10px] text-white/50">
          Campus photo by Othanwiki2009 · Public domain
        </p>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.15em] text-red-700">One workspace</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">From weekly grid to ready-to-submit documents.</h2>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {[
            [CalendarDays, "Visual schedule builder", "Paint subjects and activities into a Mon–Sat grid with undo, redo, and load totals."],
            [FileCheck2, "Official document previews", "Review the DWS and separate regular/overload teaching letters before downloading."],
            [Cloud, "Saved across devices", "Verified accounts keep your latest schedule securely in Neon PostgreSQL."],
            [ShieldCheck, "Private by design", "Secure sign-in, email verification, HTTP-only sessions, and per-user data access."],
          ].map(([Icon, title, description]) => {
            const FeatureIcon = Icon as typeof CalendarDays;
            return (
              <article key={String(title)} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <FeatureIcon className="h-6 w-6 text-red-700" />
                <h3 className="mt-4 text-lg font-bold">{String(title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{String(description)}</p>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
