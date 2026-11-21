import { redirect } from "next/navigation";
import DwsApp from "@/components/dws-app";
import { getAuthenticatedUser } from "@/lib/auth";

export const instant = false;

export default async function WorkspacePage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  return <DwsApp userEmail={user.email} />;
}
