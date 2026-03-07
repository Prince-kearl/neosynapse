import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export type ConnectionState = "idle" | "connecting" | "connected" | "disconnected" | "failed";

interface UseWebRTCOptions {
  roomId: string | null;
  userId: string;
  onRemoteStream?: (stream: MediaStream) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

export function useWebRTC({ roomId, userId, onRemoteStream, onConnectionStateChange }: UseWebRTCOptions) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("idle");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const updateState = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    onConnectionStateChange?.(state);
  }, [onConnectionStateChange]);

  const getMediaStream = useCallback(async (video: boolean, audio: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Failed to get media devices:", err);
      // Fallback: try audio only
      if (video) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ video: false, audio });
          setLocalStream(audioStream);
          return audioStream;
        } catch {
          console.error("Failed to get audio device");
        }
      }
      return null;
    }
  }, []);

  const createPeerConnection = useCallback((stream: MediaStream | null) => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const remote = new MediaStream();
    setRemoteStream(remote);

    if (stream) {
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
    }

    pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => {
        remote.addTrack(track);
      });
      onRemoteStream?.(remote);
    };

    pc.onicecandidate = async (event) => {
      if (event.candidate && roomId) {
        await supabase.from("ice_candidates").insert({
          room_id: roomId,
          sender: userId,
          candidate: event.candidate.toJSON() as any,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      switch (pc.connectionState) {
        case "connected": updateState("connected"); break;
        case "disconnected": updateState("disconnected"); break;
        case "failed": updateState("failed"); break;
      }
    };

    peerConnection.current = pc;
    return pc;
  }, [roomId, userId, onRemoteStream, updateState]);

  const startCall = useCallback(async (video: boolean, audio: boolean) => {
    if (!roomId) return;
    updateState("connecting");

    const stream = await getMediaStream(video, audio);
    const pc = createPeerConnection(stream);

    // Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Store offer in room
    await supabase.from("consultation_rooms").update({
      offer: { type: offer.type, sdp: offer.sdp } as any,
      status: "waiting",
    }).eq("id", roomId);

    // Listen for answer via realtime
    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "consultation_rooms",
        filter: `id=eq.${roomId}`,
      }, async (payload) => {
        const data = payload.new as any;
        if (data.answer && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ice_candidates",
        filter: `room_id=eq.${roomId}`,
      }, async (payload) => {
        const data = payload.new as any;
        if (data.sender !== userId && data.candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            console.error("Error adding ICE candidate:", err);
          }
        }
      })
      .subscribe();

    channelRef.current = channel;
  }, [roomId, userId, getMediaStream, createPeerConnection, updateState]);

  const toggleVideo = useCallback((enabled: boolean) => {
    localStream?.getVideoTracks().forEach(track => { track.enabled = enabled; });
  }, [localStream]);

  const toggleAudio = useCallback((enabled: boolean) => {
    localStream?.getAudioTracks().forEach(track => { track.enabled = enabled; });
  }, [localStream]);

  const endCall = useCallback(async () => {
    localStream?.getTracks().forEach(track => track.stop());
    peerConnection.current?.close();
    peerConnection.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    updateState("idle");

    if (roomId) {
      await supabase.from("consultation_rooms").update({ status: "ended" }).eq("id", roomId);
    }
  }, [localStream, roomId, updateState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
      channelRef.current?.unsubscribe();
    };
  }, []);

  return {
    connectionState,
    localStream,
    remoteStream,
    startCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}
