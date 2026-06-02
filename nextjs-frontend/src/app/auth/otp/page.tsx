import { Suspense } from "react";
import { OtpForm } from "./otp-form";
import { StepIndicator } from "@/components/step-indicator";
import { PageTransition } from "@/components/page-transition";

export default function OtpPage() {
  return (
    <PageTransition className="max-w-xl mx-auto">
      <StepIndicator current={2} />
      <Suspense fallback={null}>
        <OtpForm />
      </Suspense>
    </PageTransition>
  );
}
