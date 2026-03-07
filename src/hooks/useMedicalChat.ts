import { useState, useCallback, useRef } from "react";
import { streamMedicalChat } from "@/lib/medical-chat";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  imageUrl?: string;
};

export function useMedicalChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { language } = useLanguage();
  const abortRef = useRef(false);

  const sendMessage = useCallback(async (content: string, imageUrl?: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
      imageUrl,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);
    abortRef.current = false;

    let assistantSoFar = "";
    const assistantId = crypto.randomUUID();

    const apiMessages = [...messages, userMsg].map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.imageUrl
        ? [
            { type: "text" as const, text: m.content },
            { type: "image_url" as const, image_url: { url: m.imageUrl } },
          ]
        : m.content,
    }));

    await streamMedicalChat({
      messages: apiMessages as any,
      language,
      onDelta: (chunk) => {
        if (abortRef.current) return;
        assistantSoFar += chunk;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.id === assistantId) {
            return prev.map((m) =>
              m.id === assistantId ? { ...m, content: assistantSoFar } : m
            );
          }
          return [
            ...prev,
            {
              id: assistantId,
              role: "assistant" as const,
              content: assistantSoFar,
              timestamp: new Date(),
            },
          ];
        });
      },
      onDone: () => setIsLoading(false),
      onError: (error) => {
        setIsLoading(false);
        toast({ title: "AI Error", description: error, variant: "destructive" });
      },
    });
  }, [messages, language]);

  const clearChat = useCallback(() => {
    abortRef.current = true;
    setMessages([]);
    setIsLoading(false);
  }, []);

  return { messages, isLoading, sendMessage, clearChat };
}
