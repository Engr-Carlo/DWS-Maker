"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, CheckCircle2, Clock3, Database, Loader2, RefreshCw, ShieldCheck, Users, X } from "lucide-react";
import { Button } from "./ui";

interface AdminUser {
  id: string;
  email: string;
  verified: boolean;
  approved: boolean;
  createdAt: string;
  scheduleUpdatedAt: string | null;
  hasSchedule: boolean;
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Users; tone: string }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-slate-950">{value}</p>
      <p className="mt-1 text-sm font-medium text-slate-500">{label}</p>
    </article>
  );
}

export function AdminDashboard() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const body = await response.json() as { users?: AdminUser[]; error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to load users.");
      setUsers(body.users ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch("/api/admin/users", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json() as { users?: AdminUser[]; error?: string };
        if (!response.ok) throw new Error(body.error || "Unable to load users.");
        setUsers(body.users ?? []);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : "Unable to load users.");
      })
      .finally(() => setLoading(false));
  }, []);

  async function approve(userId: string, approved: boolean) {
    setBusyId(userId);
    setError("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, approved }),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "Unable to update approval.");
      setUsers((current) => current.map((user) => user.id === userId ? { ...user, approved } : user));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update approval.");
    } finally {
      setBusyId(null);
    }
  }

  const stats = useMemo(() => ({
    total: users.length,
    verified: users.filter((user) => user.verified).length,
    approved: users.filter((user) => user.approved).length,
    pending: users.filter((user) => user.verified && !user.approved).length,
    saved: users.filter((user) => user.hasSchedule).length,
  }), [users]);

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-700">Administrator</p>
            <h1 className="text-2xl font-black text-slate-950">DWS Maker dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app" className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Open workspace
            </Link>
            <Button size="sm" variant="secondary" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total accounts" value={stats.total} icon={Users} tone="bg-blue-50 text-blue-700" />
          <StatCard label="Verified emails" value={stats.verified} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
          <StatCard label="Approved users" value={stats.approved} icon={ShieldCheck} tone="bg-violet-50 text-violet-700" />
          <StatCard label="Awaiting approval" value={stats.pending} icon={Clock3} tone="bg-amber-50 text-amber-700" />
          <StatCard label="Saved schedules" value={stats.saved} icon={Database} tone="bg-rose-50 text-rose-700" />
        </div>

        {error && <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</p>}

        <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-bold text-slate-950">User approvals</h2>
            <p className="mt-0.5 text-sm text-slate-500">Only approved users can print or download generated work.</p>
          </div>
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">User</th>
                    <th className="px-4 py-3 font-semibold">Registered</th>
                    <th className="px-4 py-3 font-semibold">Verification</th>
                    <th className="px-4 py-3 font-semibold">Schedule</th>
                    <th className="px-4 py-3 font-semibold">Download access</th>
                    <th className="px-5 py-3 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-5 py-4 font-medium text-slate-900">{user.email}</td>
                      <td className="px-4 py-4 text-slate-600">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.verified ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {user.verified ? "Verified" : "Unverified"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{user.hasSchedule ? "Saved" : "Not started"}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${user.approved ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                          {user.approved ? "Approved" : "Preview only"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant={user.approved ? "secondary" : "primary"}
                          disabled={!user.verified || busyId === user.id}
                          onClick={() => approve(user.id, !user.approved)}
                        >
                          {busyId === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : user.approved ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                          {user.approved ? "Revoke" : "Approve"}
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!users.length && (
                    <tr><td colSpan={6} className="px-5 py-12 text-center text-slate-500">No registered users yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
