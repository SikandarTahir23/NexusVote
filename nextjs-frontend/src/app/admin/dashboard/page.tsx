import { DashboardShell } from "./dashboard-shell";
import { PageTransition } from "@/components/page-transition";

/**
 * /admin/dashboard — server boundary. The actual UI is a client component
 * because everything on this page is reactive (live polling, search,
 * filters, route guards). We use the `max-w-6xl` container so the voter
 * table has room to breathe on wide displays.
 */
export default function AdminDashboardPage() {
  return (
    <PageTransition className="max-w-6xl mx-auto">
      <DashboardShell />
    </PageTransition>
  );
}
