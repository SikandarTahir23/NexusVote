import { EmailForm } from "./email-form";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";

export default function EmailAuthPage() {
  return (
    <PageTransition className="max-w-xl mx-auto">
      <StepIndicator current={1} />
      <EmailForm />
    </PageTransition>
  );
}
