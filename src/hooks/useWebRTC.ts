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
  // Tracks the active room ID set by startCall/joinCall regardless of whether it came
  // from the prop or an explicit argument — used for cleanup on unmount.
  const activeRoomIdRef = useRef<string | null>(null);

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

  const createPeerConnection = useCallback((stream: MediaStream | null, explicitRoomId?: string) => {
    const activeRoomId = explicitRoomId || roomId;
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
      if (event.candidate && activeRoomId) {
        await supabase.from("ice_candidates").insert({
          room_id: activeRoomId,
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

  /** Subscribe to realtime signaling events for a given room */
  const subscribeToRoom = useCallback((pc: RTCPeerConnection, explicitRoomId?: string) => {
    const activeRoomId = explicitRoomId || roomId;
    if (!activeRoomId) return;

    const channel = supabase
      .channel(`room-${activeRoomId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "consultation_rooms",
        filter: `id=eq.${activeRoomId}`,
      }, async (payload) => {
        const data = payload.new as any;
        // Caller: receive answer
        if (data.answer && pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
        // Callee: receive offer (for late-join scenarios)
        if (data.offer && pc.signalingState === "stable" && !pc.remoteDescription) {
          // This case is handled in joinCall directly
        }
      })
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ice_candidates",
        filter: `room_id=eq.${activeRoomId}`,
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
  }, [roomId, userId]);

  /** Patient/caller: create offer and wait for answer */
  const startCall = useCallback(async (video: boolean, audio: boolean, explicitRoomId?: string) => {
    const activeRoomId = explicitRoomId || roomId;
    if (!activeRoomId) return;
    activeRoomIdRef.current = activeRoomId;
    updateState("connecting");

    const stream = await getMediaStream(video, audio);
    const pc = createPeerConnection(stream, activeRoomId);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await supabase.from("consultation_rooms").update({
      offer: { type: offer.type, sdp: offer.sdp } as any,
      status: "waiting",
    }).eq("id", activeRoomId);

    subscribeToRoom(pc, activeRoomId);
  }, [roomId, getMediaStream, createPeerConnection, updateState, subscribeToRoom]);

  /** Professional/callee: read offer, create answer, subscribe to ICE */
  const joinCall = useCallback(async (video: boolean, audio: boolean, explicitRoomId?: string) => {
    const activeRoomId = explicitRoomId || roomId;
    if (!activeRoomId) return;
    activeRoomIdRef.current = activeRoomId;
    updateState("connecting");

    // 1. Get media
    const stream = await getMediaStream(video, audio);
    const pc = createPeerConnection(stream, activeRoomId);

    // 2. Read the existing offer from the room
    const { data: room, error } = await supabase
      .from("consultation_rooms")
      .select("offer, status")
      .eq("id", activeRoomId)
      .single();

    if (error || !room?.offer) {
      console.error("No offer found for room:", error);
      updateState("failed");
      return;
    }

    // 3. Set remote description (the caller's offer)
    const offer = room.offer as any;
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: offer.type,
      sdp: offer.sdp,
    }));

    // 4. Create answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    // 5. Store answer in room
    await supabase.from("consultation_rooms").update({
      answer: { type: answer.type, sdp: answer.sdp } as any,
      status: "active",
    }).eq("id", activeRoomId);

    // 6. Subscribe to Realtime BEFORE fetching the ICE batch so no candidates
    //    are missed in the window between the two operations. Any duplicates
    //    from the overlap are harmless (addIceCandidate ignores them).
    subscribeToRoom(pc, activeRoomId);

    // 7. Add ICE candidates that arrived before the subscription was active
    const { data: existingCandidates } = await supabase
      .from("ice_candidates")
      .select("*")
      .eq("room_id", activeRoomId)
      .neq("sender", userId);

    if (existingCandidates) {
      for (const c of existingCandidates) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(c.candidate as any));
        } catch {
          // Duplicate from overlap window — safe to ignore
        }
      }
    }
  }, [roomId, userId, getMediaStream, createPeerConnection, updateState, subscribeToRoom]);

  const toggleVideo = useCallback((enabled: boolean) => {
    localStream?.getVideoTracks().forEach(track => { track.enabled = enabled; });
  }, [localStream]);

  const toggleAudio = useCallback((enabled: boolean) => {
    localStream?.getAudioTracks().forEach(track => { track.enabled = enabled; });
  }, [localStream]);

  const endCall = useCallback(async () => {
    const roomToEnd = activeRoomIdRef.current || roomId;
    activeRoomIdRef.current = null;
    localStream?.getTracks().forEach(track => track.stop());
    peerConnection.current?.close();
    peerConnection.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    channelRef.current?.unsubscribe();
    channelRef.current = null;
    updateState("idle");

    if (roomToEnd) {
      await supabase.from("consultation_rooms").update({ status: "ended" }).eq("id", roomToEnd);
    }
  }, [localStream, roomId, updateState]);

  // Cleanup on unmount — also marks the room ended so the professional's
  // waiting list does not show a ghost encounter if the patient navigates away.
  useEffect(() => {
    return () => {
      localStream?.getTracks().forEach(track => track.stop());
      peerConnection.current?.close();
      channelRef.current?.unsubscribe();
      const roomToEnd = activeRoomIdRef.current;
      if (roomToEnd) {
        // Fire-and-forget: browser delivers the fetch before the page unloads.
        supabase
          .from("consultation_rooms")
          .update({ status: "ended" })
          .eq("id", roomToEnd)
          .then(() => {});
      }
    };
  }, []);

  return {
    connectionState,
    localStream,
    remoteStream,
    startCall,
    joinCall,
    endCall,
    toggleVideo,
    toggleAudio,
  };
}
