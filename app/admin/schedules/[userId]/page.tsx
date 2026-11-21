import { redirect } from "next/navigation";
import { AdminScheduleViewer } from "@/components/admin-schedule-viewer";
import { getAuthenticatedUser } from "@/lib/auth";

export const instant = false;

export default async function AdminSchedulePage({ params }: { params: Promise<{ userId: string }> }) {
  const admin = await getAuthenticatedUser();
  if (!admin) redirect("/login");
  if (!admin.isAdmin) redirect("/app");
  const { userId } = await params;
  return <AdminScheduleViewer userId={userId} />;
}
