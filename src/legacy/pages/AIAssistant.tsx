import { useState, useRef, useEffect } from "react";
import { 
  Send, Mic, MicOff, Image, Trash2, Bot, User, Loader2, Volume2, 
  Languages, Sparkles
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

const AIAssistant = () => {
  const { messages, isLoading, sendMessage, clearChat } = useMedicalChat();
  const { language, setLanguage } = useLanguage();
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone Error", description: "Could not access microphone.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  const transcribeAudio = async (blob: Blob) => {
    try {
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/speech-to-text`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );

      if (!resp.ok) throw new Error("Transcription failed");
      const data = await resp.json();
      if (data.text) {
        sendMessage(data.text);
      }
    } catch {
      toast({ title: "Transcription Error", description: "Could not transcribe audio.", variant: "destructive" });
    }
  };

  const speakText = async (text: string) => {
    setIsSpeaking(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/text-to-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: text.slice(0, 4000) }),
        }
      );
      if (!resp.ok) throw new Error("TTS failed");
      const audioBlob = await resp.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.onended = () => setIsSpeaking(false);
      await audio.play();
    } catch {
      setIsSpeaking(false);
      toast({ title: "Voice Error", description: "Could not play audio.", variant: "destructive" });
    }
  };

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
              onClick={() => speakText(msg.content)}
              disabled={isSpeaking}
            >
              <Volume2 className="w-3 h-3 mr-1" />
              {isSpeaking ? "Speaking..." : "Listen"}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-lg font-bold">AI Medical Assistant</h1>
              <p className="text-xs text-muted-foreground">Multimodal • Multilingual</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(v: any) => setLanguage(v)}>
              <SelectTrigger className="w-[120px] h-8 text-xs">
                <Languages className="w-3 h-3 mr-1" />
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
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearChat} className="h-8 w-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold">How can I help you today?</h2>
              <p className="text-muted-foreground max-w-md mx-auto text-sm">
                Ask me health questions, describe symptoms, or upload a medical image for analysis. 
                I support text, voice, and image input.
              </p>
              <div className="grid grid-cols-2 gap-2 max-w-md mx-auto pt-4">
                {[
                  "I have a headache and fever",
                  "What does my blood test result mean?",
                  "Symptoms of malaria vs typhoid",
                  "Help me prepare for a doctor visit",
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left p-3 rounded-xl bg-card border border-border text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

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

      {/* Input */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t border-border p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="w-5 h-5" />
            </Button>

            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Describe your symptoms or ask a health question..."
                rows={1}
                className="w-full resize-none rounded-2xl bg-card border border-border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
              />
            </div>

            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={isRecording ? stopRecording : startRecording}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>

            <Button
              size="icon"
              className="shrink-0 h-10 w-10 bg-primary hover:bg-primary/90"
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
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
};

export default AIAssistant;
