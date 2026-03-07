import { useRef, useEffect } from "react";
import { VideoOff, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConnectionState } from "@/hooks/useWebRTC";

interface VideoDisplayProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  videoEnabled: boolean;
  connectionState: ConnectionState;
  doctorName: string;
  consentRecording: boolean;
}

export function VideoDisplay({
  localStream,
  remoteStream,
  videoEnabled,
  connectionState,
  doctorName,
  consentRecording,
}: VideoDisplayProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const hasRemoteVideo = remoteStream && remoteStream.getVideoTracks().length > 0;

  return (
    <div className="flex-1 relative bg-card rounded-2xl m-4 overflow-hidden">
      {/* Remote video (main view) */}
      {hasRemoteVideo ? (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-24 h-24 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
              <Users className="w-12 h-12 text-primary" />
            </div>
            <p className="font-display font-semibold text-lg">{doctorName}</p>
            <Badge
              className={
                connectionState === "connected"
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : connectionState === "connecting"
                  ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                  : "bg-muted text-muted-foreground"
              }
            >
              {connectionState === "connected"
                ? "Connected"
                : connectionState === "connecting"
                ? "Connecting..."
                : "Waiting"}
            </Badge>
            {consentRecording && (
              <div className="flex items-center gap-2 justify-center text-xs text-destructive">
                <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                Recording with consent
              </div>
            )}
          </div>
        </div>
      )}

      {/* Local video (self view - picture-in-picture) */}
      <div className="absolute bottom-4 right-4 w-36 h-28 bg-muted rounded-xl overflow-hidden border border-border shadow-lg">
        {localStream && videoEnabled ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <VideoOff className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}
