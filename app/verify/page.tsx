import { Suspense } from "react";
import { VerifyClient } from "@/components/verify-client";

export default function VerifyPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-950" />}>
      <VerifyClient />
    </Suspense>
  );
}
