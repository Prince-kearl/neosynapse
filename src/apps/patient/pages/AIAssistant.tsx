import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send, Mic, MicOff, Image, FileUp, Trash2, Bot, User, Loader2, Volume2,
  Languages, Sparkles, Square
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMedicalChat, type ChatMessage } from "@/hooks/useMedicalChat";
import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** Detect best supported MIME type for MediaRecorder */
function getRecorderMimeType(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

function AIAssistant() {
  const { messages, isLoading, sendMessage, clearChat } = useMedicalChat();
  const { language, setLanguage } = useLanguage();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoVoice, setAutoVoice] = useState(false); // auto-play TTS for voice-initiated msgs
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mode, setMode] = useState(() => localStorage.getItem("ai-assistant-mode") || "text");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevMessageCountRef = useRef(0);
  // --- Suggestion chip highlight state ---
  const [highlightedChip, setHighlightedChip] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChipClick = (chipText: string, idx: number) => {
    setInput(chipText);
    setHighlightedChip(idx);
    setTimeout(() => setHighlightedChip(null), 300);
    textareaRef.current?.focus();
  };

  // Persist mode in localStorage
  useEffect(() => {
    localStorage.setItem("ai-assistant-mode", mode);
  }, [mode]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-play TTS when assistant finishes responding (voice-initiated)
  useEffect(() => {
    if (!autoVoice || isLoading) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg?.role === "assistant" &&
      messages.length > prevMessageCountRef.current &&
      lastMsg.content.length > 10
    ) {
      setAutoVoice(false);
      speakText(lastMsg.content);
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, isLoading, autoVoice]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      audioRef.current?.pause();
    };
  }, []);

  // ---- Text send ----
  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    setAutoVoice(false);
    sendMessage(trimmed);
  };

  // ---- Image upload ----
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB for images.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const prompt = input.trim() || "Please analyze this medical image and provide your assessment.";
      setInput("");
      sendMessage(prompt, base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // ---- File (report) upload ----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 10 MB.", variant: "destructive" });
      e.target.value = "";
      return;
    }
    // For images, use the image pipeline
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        sendMessage(`Please analyze this uploaded medical report image: ${file.name}`, base64);
      };
      reader.readAsDataURL(file);
    } else {
      // For text-based files, read as text
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const preview = text.slice(0, 3000);
        sendMessage(
          `I'm uploading a medical report (${file.name}). Here is the content:\n\n${preview}\n\nPlease analyze this report and summarize the key findings.`
        );
      };
      reader.readAsText(file);
    }
    e.target.value = "";
  };

  // ---- Voice recording ----
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });

      const mimeType = getRecorderMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        setRecordingDuration(0);

        const actualMime = recorder.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: actualMime });
        if (blob.size > 0) {
          transcribeAudio(blob, actualMime);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch (err: unknown) {
      const name = err instanceof Error ? err.name : "";
      if (name === "NotAllowedError") {
        toast({
          title: "Microphone Access Denied",
          description: "Please allow microphone access in your browser settings to use voice input.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // ---- Transcription (ElevenLabs with Web Speech API fallback) ----
  const transcribeAudio = async (blob: Blob, mimeType: string) => {
    setIsTranscribing(true);
    try {
      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
      const formData = new FormData();
      formData.append("audio", blob, `recording.${ext}`);

      const resp = await fetch(`${SUPABASE_URL}/functions/v1/speech-to-text`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
        body: formData,
      });

      if (!resp.ok) throw new Error("ElevenLabs STT failed");

      const data = await resp.json();
      const text = data.text?.trim();
      if (text) {
        setAutoVoice(true);
        sendMessage(text);
      } else {
        toast({ title: "No speech detected", description: "Please speak clearly and try again.", variant: "destructive" });
      }
    } catch {
      // Fallback: use browser Web Speech API for live recognition
      console.warn("ElevenLabs STT unavailable, falling back to Web Speech API");
      fallbackWebSpeechRecognition();
    } finally {
      setIsTranscribing(false);
    }
  };

  const fallbackWebSpeechRecognition = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice Not Supported", description: "Your browser doesn't support speech recognition. Please type your message instead.", variant: "destructive" });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = language === "tw" ? "ak-GH" : language === "ga" ? "gaa" : language === "ee" ? "ee-GH" : language === "ha" ? "ha-NG" : "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    toast({ title: "Listening...", description: "Speak now — using browser speech recognition as fallback." });

    recognition.onresult = (event: any) => {
      const text = event.results[0]?.[0]?.transcript?.trim();
      if (text) {
        setAutoVoice(true);
        sendMessage(text);
      }
    };
    recognition.onerror = () => {
      toast({ title: "Speech Error", description: "Could not recognize speech. Please try again or type your message.", variant: "destructive" });
    };
    recognition.start();
  };

  // ---- Text-to-Speech (ElevenLabs with browser SpeechSynthesis fallback) ----
  const speakText = async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(true);

    const cleanText = text
      .replace(/[#*_`~\[\]()>]/g, "")
      .replace(/\n{2,}/g, ". ")
      .replace(/\n/g, " ")
      .slice(0, 4000);

    try {
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/text-to-speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        body: JSON.stringify({ text: cleanText }),
      });

      if (!resp.ok) throw new Error("ElevenLabs TTS failed");

      const audioBlob = await resp.blob();
      if (audioBlob.type.includes("json")) throw new Error("TTS returned error JSON");

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); audioRef.current = null; };
      audio.onerror = () => { setIsSpeaking(false); URL.revokeObjectURL(audioUrl); audioRef.current = null; };

      await audio.play();
    } catch {
      // Fallback: browser SpeechSynthesis
      console.warn("ElevenLabs TTS unavailable, falling back to browser speech synthesis");
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleanText.slice(0, 2000));
        utterance.lang = language === "tw" ? "ak" : language === "ga" ? "en-GH" : language === "ee" ? "en-GH" : language === "ha" ? "ha" : "en-US";
        utterance.rate = 1.0;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
        toast({ title: "Voice Unavailable", description: "Text-to-speech is not available. Please read the response instead.", variant: "destructive" });
      }
    }
  };

  const stopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsSpeaking(false);
  };

  // Determine if input controls should be disabled
  const inputDisabled = isLoading || isTranscribing;

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ---- Message Bubble ----
  const MessageBubble = ({ msg }: { msg: ChatMessage }) => {
    const isUser = msg.role === "user";
    return (
      <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
          isUser ? "bg-primary/20" : "bg-accent/20"
        }`}>
          {isUser ? <User className="w-4 h-4 text-primary" /> : <Bot className="w-4 h-4 text-accent" />}
        </div>
        <div className={`max-w-[80%] rounded-2xl p-3 ${
          isUser ? "bg-primary text-primary-foreground" : "bg-card border border-border"
        }`}>
          {msg.imageUrl && (
            <img src={msg.imageUrl} alt="Uploaded" className="max-w-[200px] rounded-lg mb-2" />
          )}
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
          {!isUser && msg.content.length > 10 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => isSpeaking ? stopSpeaking() : speakText(msg.content)}
            >
              <Volume2 className="w-3 h-3 mr-1" />
              {isSpeaking ? "Stop" : "Listen"}
            </Button>
          )}
        </div>
      </div>
    );
  };
  return (
    <div className="flex-1 min-h-screen bg-background flex flex-col">
      {/* Top Bar with Mode Toggle */}
      <div className="sticky top-0 z-10 bg-primary/90 backdrop-blur p-4 flex items-center justify-between">
        <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
          <SelectTrigger className="w-[120px] h-10 text-base bg-background/80 border-none shadow-none">
            <Languages className="w-4 h-4 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUPPORTED_LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                {l.nativeName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 mx-auto">
          <Button
            variant={mode === "text" ? "default" : "outline"}
            className={`rounded-full px-4 py-2 text-base font-semibold border-primary/40 ${mode === "text" ? "bg-background/80 text-primary border-2" : "bg-background/80"}`}
            onClick={() => setMode("text")}
          >
            <Square className="w-4 h-4 mr-2" />Text Chat
          </Button>
          <Button
            variant={mode === "voice" ? "default" : "outline"}
            className={`rounded-full px-4 py-2 text-base font-semibold border-primary/40 ${mode === "voice" ? "bg-background/80 text-primary border-2" : "bg-background/80"}`}
            onClick={() => setMode("voice")}
          >
            <Mic className="w-4 h-4 mr-2" />Voice Chat
          </Button>
        </div>
        <div className="w-10" /> {/* Spacer for symmetry */}
      </div>

      {/* Main Content: Text or Voice Mode */}
      {mode === "text" ? (
        <>
          {/* Welcome & Suggestions */}
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <h2 className="text-2xl md:text-3xl font-bold text-primary mb-2 text-center mt-8">How can I help you today?</h2>
              <p className="text-base text-muted-foreground mb-6 text-center max-w-xl">
                Ask me health questions, describe symptoms, or upload a medical image for analysis. I support text, voice, and image input.
              </p>
              <div className="flex flex-wrap gap-3 w-full max-w-lg mb-8 justify-center">
                {[
                  "I have a headache and fever",
                  "What does my blood test result mean?",
                  "Symptoms of malaria vs typhoid",
                  "Help me prepare for a doctor visit",
                ].map((chip, idx) => (
                  <Button
                    key={chip}
                    variant="outline"
                    className={`rounded-xl py-3 px-4 text-base font-medium border-primary/30 bg-background/80 whitespace-normal break-words text-center h-auto leading-snug transition-colors duration-200 ${highlightedChip === idx ? 'ring-2 ring-primary/70 bg-primary/10' : ''}`}
                    style={{ wordBreak: 'break-word', whiteSpace: 'normal', width: 'auto', minWidth: 0, maxWidth: '100%' }}
                    onClick={() => handleChipClick(chip, idx)}
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.length > 0 && (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} msg={msg} />
                ))}
                {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-accent" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl p-3">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          )}
        </>
      ) : (
        // Voice Chat Mode
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="flex flex-col items-center justify-center w-full">
            {/* Animated orb/visualizer */}
            <div className="w-48 h-48 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 shadow-lg flex items-center justify-center mb-8 animate-pulse">
              {/* Optionally add SVG or canvas animation here */}
              <div className="w-40 h-40 rounded-full bg-background/80 shadow-inner" />
            </div>
            <div className="text-xl font-semibold text-primary mb-4">AI is listening</div>
            <Button
              size="icon"
              className="h-20 w-20 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center text-4xl animate-pulse"
              // onClick={...} // Hook up to start/stop recording as needed
            >
              <Mic className="w-12 h-12" />
            </Button>
          </div>
        </div>
      )}

      {/* Recording Indicator */}
      {isRecording && (
        <div className="bg-destructive/10 border-t border-destructive/30 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
              </span>
              <span className="text-sm font-medium text-destructive">
                Listening… {formatDuration(recordingDuration)}
              </span>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={stopRecording}
              className="h-8 gap-1.5"
            >
              <Square className="w-3 h-3" />
              Stop
            </Button>
          </div>
        </div>
      )}

      {/* Transcribing Indicator */}
      {isTranscribing && (
        <div className="bg-primary/5 border-t border-primary/20 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Transcribing your speech…</span>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            {/* Hidden file inputs */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.txt,.csv,.doc,.docx"
              className="hidden"
              onChange={handleFileUpload}
            />

            {/* Image upload */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={() => imageInputRef.current?.click()}
              disabled={inputDisabled}
              title="Upload image"
            >
              <Image className="w-5 h-5" />
            </Button>

            {/* File upload */}
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={() => fileInputRef.current?.click()}
              disabled={inputDisabled}
              title="Upload medical report"
            >
              <FileUp className="w-5 h-5" />
            </Button>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={isRecording ? "Listening…" : isTranscribing ? "Transcribing…" : "Describe your symptoms or ask a health question..."}
                rows={1}
                disabled={inputDisabled || isRecording}
                className="w-full resize-none rounded-2xl bg-card border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground disabled:opacity-50"
              />
            </div>

            {/* Mic button */}
            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              className={`shrink-0 h-10 w-10 ${isRecording ? "animate-pulse" : ""}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing || isLoading}
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            {/* Send button */}
            <Button
              size="icon"
              className="shrink-0 h-10 w-10 bg-primary hover:bg-primary/90"
              onClick={handleSend}
              disabled={!input.trim() || inputDisabled}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Neo Synapse provides guidance only. Always consult a healthcare professional for diagnosis.
          </p>
        </div>
      </div>
    </div>
  );
}

export default AIAssistant;
