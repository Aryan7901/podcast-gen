import { useRef, useState } from "react";

export const useAudioQueue = () => {
  const audioQueue = useRef<string[]>([]);
  const isPlaying = useRef<boolean>(false);
  const [audioChunks, setAudioChunks] = useState<string[]>([]);

  const playAudio = () => {
    if (audioQueue.current.length === 0 || isPlaying.current) return;
    isPlaying.current = true;
    const nextChunk = audioQueue.current.shift();
    if (nextChunk) {
      const audio = new Audio(`data:audio/wav;base64,${nextChunk}`);
      audio.onended = () => {
        isPlaying.current = false;
        playAudio();
      };
      audio.play().catch(() => {
        isPlaying.current = false;
        playAudio();
      });
    }
  };

  const pushAudio = (chunk: string) => {
    setAudioChunks((prev) => [...prev, chunk]);
    audioQueue.current.push(chunk);
    playAudio();
  };

  const clearAudio = () => {
    audioQueue.current = [];
    isPlaying.current = false;
    setAudioChunks([]);
  };

  return { audioChunks, pushAudio, clearAudio };
};
