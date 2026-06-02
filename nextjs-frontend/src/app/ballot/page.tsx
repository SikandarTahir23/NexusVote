import { BallotForm } from "./ballot-form";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";

export default function BallotPage() {
  return (
    <PageTransition className="max-w-5xl mx-auto">
      <StepIndicator current={5} />
      <BallotForm />
    </PageTransition>
  );
}
