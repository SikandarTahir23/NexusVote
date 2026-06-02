import { Suspense } from "react";
import { SuccessScreen } from "./success-screen";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";

export default function SuccessPage() {
  return (
    <PageTransition className="max-w-2xl mx-auto">
      <StepIndicator current={6} />
      <Suspense fallback={null}>
        <SuccessScreen />
      </Suspense>
    </PageTransition>
  );
}
