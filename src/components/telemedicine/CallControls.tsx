import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallControlsProps {
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  onOpenChat?: () => void;
  onOpenNotes?: () => void;
}

export function CallControls({
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onEndCall,
  onOpenChat,
  onOpenNotes,
}: CallControlsProps) {
  return (
    <div className="p-4">
      <div className="max-w-md mx-auto flex items-center justify-center gap-4">
        <Button
          variant={audioEnabled ? "outline" : "destructive"}
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={onToggleAudio}
        >
          {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </Button>
        <Button
          variant={videoEnabled ? "outline" : "destructive"}
          size="icon"
          className="rounded-full w-12 h-12"
          onClick={onToggleVideo}
        >
          {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="rounded-full w-14 h-14"
          onClick={onEndCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full w-12 h-12" onClick={onOpenChat}>
          <MessageSquare className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-full w-12 h-12" onClick={onOpenNotes}>
          <FileText className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
