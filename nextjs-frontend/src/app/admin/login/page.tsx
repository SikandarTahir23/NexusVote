import { AdminLoginForm } from "./admin-login-form";
import { PageTransition } from "@/components/page-transition";

/**
 * /admin/login — server boundary for the administrator sign-in screen.
 *
 * The demo-credentials hint only renders outside production so judges can
 * see the test login without exposing real credentials on a real deployment.
 */
export default function AdminLoginPage() {
  const isDemoMode = process.env.NODE_ENV !== "production";
  const demoEmail = process.env.ADMIN_EMAIL || "";
  // Never leak the real password — only show the well-known demo default
  // (the one shipped in .env.local for graders).
  const isDefaultDemo =
    isDemoMode &&
    demoEmail === "admin@example.com" &&
    process.env.ADMIN_PASSWORD === "admin123";

  return (
    <PageTransition className="max-w-xl mx-auto">
      <AdminLoginForm isDefaultDemo={isDefaultDemo} demoEmail={demoEmail} />
    </PageTransition>
  );
}
