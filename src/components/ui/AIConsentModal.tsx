import { useState } from "react";
import { AlertCircle, CheckCircle2, Lock, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { consentService } from "@/shared/services/healthcare";
import { CONSENT_TYPES } from "@/shared/types/healthcare";
import { toast } from "@/hooks/use-toast";

interface AIConsentModalProps {
  open: boolean;
  onAccepted: () => void;
  onCancel: () => void;
}

export function AIConsentModal({ open, onAccepted, onCancel }: AIConsentModalProps) {
  const { user } = useAuth();
  const [understandsAiNotDoctor, setUnderstandsAiNotDoctor] = useState(false);
  const [agreesToDataStorage, setAgreesToDataStorage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bothChecked = understandsAiNotDoctor && agreesToDataStorage;

  const handleAccept = async () => {
    if (!user || !bothChecked) return;

    setIsSubmitting(true);
    try {
      const { error } = await consentService.create({
        patient_id: user.id,
        consent_type: CONSENT_TYPES.AI_MEDICAL_ADVICE,
        granted: true,
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to save consent. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Consent saved",
        description: "You can now use the AI Medical Assistant.",
      });

      onAccepted();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal={true}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
            <div>
              <DialogTitle className="text-xl">Important Medical Disclaimer</DialogTitle>
              <DialogDescription className="mt-2 text-sm">
                Please carefully read and accept the following before using the AI Medical Assistant.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5">
          {/* Section 1: AI is not a doctor */}
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-orange-900 mb-2">
              <AlertCircle className="h-4 w-4" />
              AI Is Not a Doctor
            </h3>
            <p className="text-sm text-orange-800 leading-relaxed">
              This AI assistant is <strong>not a qualified healthcare professional</strong>. It cannot:
            </p>
            <ul className="mt-2 text-sm text-orange-800 space-y-1 ml-4 list-disc">
              <li>Provide a medical diagnosis</li>
              <li>Replace consultation with a licensed doctor</li>
              <li>Prescribe medications or treatments</li>
              <li>Handle medical emergencies</li>
            </ul>
            <p className="mt-3 text-sm font-semibold text-orange-900">
              Always consult a qualified healthcare professional for medical concerns.
            </p>
          </div>

          {/* Section 2: Data storage */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-blue-900 mb-2">
              <Lock className="h-4 w-4" />
              Your Conversations Are Saved
            </h3>
            <p className="text-sm text-blue-800 leading-relaxed">
              All conversations with the AI assistant are stored securely on our servers for:
            </p>
            <ul className="mt-2 text-sm text-blue-800 space-y-1 ml-4 list-disc">
              <li>Quality assurance and safety monitoring</li>
              <li>Improving AI accuracy and responses</li>
              <li>Compliance and audit purposes</li>
            </ul>
            <p className="mt-3 text-sm text-blue-800">
              Your data is protected by our privacy policy and handled confidentially.
            </p>
          </div>

          {/* Section 3: Privacy assurance */}
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <h3 className="flex items-center gap-2 font-semibold text-green-900 mb-2">
              <CheckCircle2 className="h-4 w-4" />
              Your Privacy Is Protected
            </h3>
            <p className="text-sm text-green-800 leading-relaxed">
              Your medical information is encrypted and stored securely. Access is restricted and audited. For more details, please review our{" "}
              <a href="/privacy" className="underline hover:text-green-700">
                privacy policy
              </a>
              .
            </p>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-2">
            <div className="flex items-start gap-3">
              <Checkbox
                id="ai-not-doctor"
                checked={understandsAiNotDoctor}
                onCheckedChange={(checked) => setUnderstandsAiNotDoctor(checked === true)}
              />
              <Label
                htmlFor="ai-not-doctor"
                className="text-sm leading-relaxed cursor-pointer pt-0.5"
              >
                I understand this AI assistant is <strong>not a qualified doctor</strong> and cannot diagnose or treat me. I will consult a healthcare professional for medical concerns.
              </Label>
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="agree-data-storage"
                checked={agreesToDataStorage}
                onCheckedChange={(checked) => setAgreesToDataStorage(checked === true)}
              />
              <Label
                htmlFor="agree-data-storage"
                className="text-sm leading-relaxed cursor-pointer pt-0.5"
              >
                I agree that my conversations with the AI assistant will be stored securely and may be reviewed for quality, safety, and improvement purposes.
              </Label>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 justify-end">
          <Button variant="outline" disabled={isSubmitting} onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleAccept}
            disabled={!bothChecked || isSubmitting}
            className="gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "I Agree"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
