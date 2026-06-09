import { AlertCircle, LogIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AIGuestConsentModalProps {
  open: boolean;
  onClose: () => void;
}

export function AIGuestConsentModal({ open, onClose }: AIGuestConsentModalProps) {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate("/auth/sign-in");
  };

  return (
    <Dialog open={open} onOpenChange={onClose} modal={true}>
      <DialogContent className="max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-orange-600 mt-1 flex-shrink-0" />
            <div>
              <DialogTitle className="text-lg">Sign In Required</DialogTitle>
              <DialogDescription className="mt-2 text-sm">
                The AI Medical Assistant requires a registered account to use.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            To access the AI Medical Assistant, you need to create an account or sign in. This ensures:
          </p>
          <ul className="text-sm text-muted-foreground space-y-2 ml-4 list-disc">
            <li>Your medical conversations are securely stored and linked to your record</li>
            <li>The AI can access your medical history for personalized guidance</li>
            <li>We can properly track consent and data privacy</li>
          </ul>

          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
            <p className="text-xs font-semibold text-orange-900">
              ⚠️ Important: The AI assistant is not a doctor and cannot diagnose or treat medical conditions. Always consult a healthcare professional.
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-4 justify-end">
          <Button variant="outline" onClick={onClose}>
            Not Now
          </Button>
          <Button onClick={handleSignIn} className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
