import { Video, Mic, Shield, FileText } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface PreConsultationSettingsProps {
  videoEnabled: boolean;
  audioEnabled: boolean;
  consentRecording: boolean;
  onVideoChange: (v: boolean) => void;
  onAudioChange: (v: boolean) => void;
  onConsentChange: (v: boolean) => void;
}

export function PreConsultationSettings({
  videoEnabled,
  audioEnabled,
  consentRecording,
  onVideoChange,
  onAudioChange,
  onConsentChange,
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-muted-foreground" />
            <div>
              <span className="text-sm block">Consent to Record</span>
              <span className="text-xs text-muted-foreground">
                Allow recording for AI report generation
              </span>
            </div>
          </div>
          <Switch checked={consentRecording} onCheckedChange={onConsentChange} />
        </div>
      </div>

      {consentRecording && (
        <div className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium">Auto-Documentation Enabled</p>
              <p className="text-xs text-muted-foreground mt-1">
                Neo Synapse will record, transcribe, and generate an AI medical report from this
                consultation. The doctor will review and approve it before it's added to your
                records.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
