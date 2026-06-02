import { VerifyForm } from "./verify-form";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";

export default function VerifyPage() {
  return (
    <PageTransition className="max-w-xl mx-auto">
      <StepIndicator current={3} />
      <VerifyForm />
    </PageTransition>
  );
}
