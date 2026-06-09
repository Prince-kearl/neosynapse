import { useState } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AIDisclaimer() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="border-b border-orange-200 bg-orange-50/80 backdrop-blur px-3 py-2.5 sm:px-4 sm:py-3 lg:px-6">
      <div className="mx-auto max-w-3xl flex items-start gap-2.5 sm:gap-3">
        <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-orange-900 leading-snug">
            <strong>⚠️ Medical Disclaimer:</strong> This AI assistant is not a doctor. AI guidance is not medical advice.{" "}
            <strong>Always consult a qualified healthcare professional</strong> for diagnosis, treatment, and medical decisions.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 flex-shrink-0 hover:bg-orange-100"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss disclaimer"
        >
          <X className="h-4 w-4 text-orange-600" />
        </Button>
      </div>
    </div>
  );
}
