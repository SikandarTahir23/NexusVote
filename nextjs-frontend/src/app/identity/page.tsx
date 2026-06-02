import { IdentityForm } from "./identity-form";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";

export default function IdentityPage() {
  return (
    <PageTransition className="max-w-xl mx-auto">
      <StepIndicator current={4} />
      <IdentityForm />
    </PageTransition>
  );
}
