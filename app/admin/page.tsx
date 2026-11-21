import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin-dashboard";
import { getAuthenticatedUser } from "@/lib/auth";

export const instant = false;

export default async function AdminPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!user.isAdmin) redirect("/app");
  return <AdminDashboard />;
}
