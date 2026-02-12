import { useState } from "react";
import type { ChatMessage, PodcastEvent } from "../types";

export const useBroadcast = (pushAudio: (chunk: string) => void) => {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"connected" | "streaming">("connected");
  const [numTurns, setNumTurns] = useState(4);

  const startPodcast = async (audioOn: boolean, image: File | null) => {
    if (!text || loading) return;
    setLoading(true);
    setStatus("streaming");
    setChatHistory([]);

    const body = new FormData();
    body.append("text", text);
    body.append("num_turns", String(numTurns));
    body.append("generate_audio", String(audioOn));
    if (image) body.append("image", image);

    try {
      const resp = await fetch("https://aryan-api.771727.xyz/podcast-gen/generate", {
        method: "POST",
        body,
      });
      if (!resp.body) return;
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf("\n\n");

        while (boundary !== -1) {
          const fullEvent = buffer.slice(0, boundary).trim();
          buffer = buffer.slice(boundary + 2);
          if (fullEvent.startsWith("data: ")) {
            try {
              const data: PodcastEvent = JSON.parse(
                fullEvent.replace("data: ", "")
              );
              if (data.text) {
                setChatHistory((prev) => {
                  const lastMsg = prev[prev.length - 1];
                  if (lastMsg && lastMsg.speaker === data.speaker) {
                    const updated = [...prev];
                    updated[updated.length - 1].text += ` ${data.text}`;
                    return updated;
                  }
                  return [...prev, { speaker: data.speaker, text: data.text }];
                });
              }
              if (data.audio) pushAudio(data.audio);
            } catch (e) {
              console.error("Parse Error");
            }
          }
          boundary = buffer.indexOf("\n\n");
        }
      }
    } finally {
      setLoading(false);
      setStatus("connected");
    }
  };

  return {
    text,
    setText,
    loading,
    status,
    chatHistory,
    setChatHistory,
    numTurns,
    setNumTurns,
    startPodcast,
  };
};
