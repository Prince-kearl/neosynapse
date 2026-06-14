import { Video, Mic, Shield, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

interface PreConsultationSettingsProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  consentRecording: boolean;
  onVideoChange: (v: boolean) => void;
  onAudioChange: (v: boolean) => void;
  onConsentChange: (v: boolean) => void;
  showConsent?: boolean;
}

export function PreConsultationSettings({
  videoEnabled,
  audioEnabled,
  consentRecording,
  onVideoChange,
  onAudioChange,
  onConsentChange,
  showConsent = true,
}: PreConsultationSettingsProps) {
  return (
    <>
      <div className="bg-card rounded-2xl p-5 shadow-food-card space-y-4">
        <h3 className="font-display font-semibold">Pre-Consultation Settings</h3>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Camera</span>
          </div>
          <Switch checked={videoEnabled} onCheckedChange={onVideoChange} />
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mic className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm">Microphone</span>
          </div>
          <Switch checked={audioEnabled} onCheckedChange={onAudioChange} />
        </div>
        <Separator />
        {showConsent ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm font-semibold">
                  Do you consent to this consultation being recorded for quality assurance, medical
                  documentation, and training purposes?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Recording will only begin if you explicitly choose Allow Recording.
                </p>
              </div>
            </div>

            <RadioGroup
              value={consentRecording ? "allow" : "decline"}
              onValueChange={(value) => onConsentChange(value === "allow")}
              className="grid gap-2"
            >
              <label
                className={cn(
                  "rounded-2xl border p-4 cursor-pointer transition",
                  consentRecording
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/20",
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="allow" />
                  <div>
                    <p className="text-sm font-medium">Allow Recording</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Record this consultation for quality assurance, medical documentation, and
                      training.
                    </p>
                  </div>
                </div>
              </label>

              <label
                className={cn(
                  "rounded-2xl border p-4 cursor-pointer transition",
                  !consentRecording
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:border-primary/20",
                )}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="decline" />
                  <div>
                    <p className="text-sm font-medium">Decline Recording</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Do not record this consultation. The session will still proceed.
                    </p>
                  </div>
                </div>
              </label>
            </RadioGroup>
          </div>
        ) : null}
      </div>

      {showConsent && (
        <div className={cn(
          "rounded-2xl p-4 border",
          consentRecording ? "bg-primary/10 border-primary/20" : "bg-muted/10 border-border/60",
        )}>
          <div className="flex items-start gap-3">
            <FileText className={cn("w-5 h-5 shrink-0 mt-0.5", consentRecording ? "text-primary" : "text-muted-foreground")} />
            <div>
              <p className="text-sm font-medium">
                {consentRecording ? "Auto-Documentation Enabled" : "Recording declined"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {consentRecording
                  ? "Neo Synapse will record, transcribe, and generate an AI medical report from this consultation. The doctor will review and approve it before it's added to your records."
                  : "This consultation will proceed without recording or transcription."}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
