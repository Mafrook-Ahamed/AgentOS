import { requireAdmin } from "@/lib/auth/admin";
import DashboardClient from "@/components/dashboard-client";
export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  await requireAdmin();
  return <DashboardClient />;
}
