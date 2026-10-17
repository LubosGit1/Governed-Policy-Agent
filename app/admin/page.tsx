import { cookies } from "next/headers";
import { AdminDashboard } from "./admin-dashboard";
import { AdminLogin } from "./admin-login";
import { isAdminSecretConfigured, isAdminToken, ADMIN_COOKIE_NAME } from "@/lib/api/security";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authenticated = isAdminToken(cookieStore.get(ADMIN_COOKIE_NAME)?.value);

  return (
    <main className="admin-page">
      {authenticated
        ? <AdminDashboard />
        : <AdminLogin configured={isAdminSecretConfigured()} />}
    </main>
  );
}
