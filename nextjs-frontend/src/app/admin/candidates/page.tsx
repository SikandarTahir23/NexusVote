import { CandidatesShell } from "./candidates-shell";
import { PageTransition } from "@/components/page-transition";

/**
 * /admin/candidates — server boundary for the candidate-management page.
 * Like the dashboard, all the real UI is a client component (CRUD modals,
 * search, filters, route guard). Same max-w-6xl container so the table
 * lines up with the dashboard layout.
 */
export default function AdminCandidatesPage() {
  return (
    <PageTransition className="max-w-6xl mx-auto">
      <CandidatesShell />
    </PageTransition>
  );
}
