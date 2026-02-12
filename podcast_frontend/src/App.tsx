import React, { useState, useRef, type ChangeEvent, useEffect } from "react";
import "./App.css";
import {
  Upload,
  Send,
  Loader2,
  RefreshCcw,
  X,
  // Settings,
  // ChevronUp,
} from "lucide-react";
import { useAudioQueue } from "./hooks/useAudioQueue";
import { ChatFeed } from "./components/ChatFeed";
import { useBroadcast } from "./hooks/useBroadCast";
import { ControlCenter } from "./components/ControlCenter";

const App: React.FC = () => {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audioOn, setAudioOn] = useState<boolean>(true);
  const { audioChunks, pushAudio, clearAudio } = useAudioQueue();
  const {
    chatHistory,
    loading,
    numTurns,
    setChatHistory,
    setNumTurns,
    setText,
    startPodcast,
    status,
    text,
  } = useBroadcast(pushAudio);
  // const [showSettings, setShowSettings] = useState<boolean>(false);
  const isPlaying = useRef<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const scrollToBottom = () =>
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const resetState = () => {
    setChatHistory([]);

    setText("");
    setImage(null);
    setImagePreview(null);
    clearAudio();
    isPlaying.current = false;
    window.speechSynthesis.cancel(); // Safety for browser tts
    const audioTags = document.querySelectorAll("audio");
    audioTags.forEach((tag) => {
      tag.pause();
      tag.src = "";
    });
  };

  const handleDownloadAudio = () => {
    try {
      // 1. Convert each Base64 chunk into a byte array
      const byteArrays = audioChunks.map((chunk) => {
        const byteCharacters = atob(chunk);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        return new Uint8Array(byteNumbers);
      });

      // 2. Create a single Blob from the array of Uint8Arrays
      const audioBlob = new Blob(byteArrays, { type: "audio/wav" });

      // 3. Trigger the download using your existing utility
      downloadFile(audioBlob, "audio/wav");
    } catch (error) {
      console.error("Failed to assemble audio chunks:", error);
      alert("There was an error generating your audio file. Please try again.");
    }
  };

  const downloadFile = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  return (
    <div className="app-container">
      {/* ─────────────────────────────────────────────────────────────
          COMMAND CENTER (SIDEBAR)
      ───────────────────────────────────────────────────────────── */}

      <aside className="sidebar">
        <div className="status-header">
          <span className={`status-dot ${status}`} />
          <span className="status-text">{status.toUpperCase()}</span>
        </div>
        <ControlCenter
          variant="sidebar"
          {...{
            status,
            numTurns,
            setNumTurns,
            audioOn,
            setAudioOn,
            resetState,
            chatHistory,
            audioChunks,
            downloadFile,
            handleDownloadAudio,
          }}
        />
        <div className="sidebar-footer">MAVERICK AI</div>
      </aside>

      <header className="app-header">
        <div className="header-main">
          <div className="status-header" style={{ padding: 10 }}>
            <span className={`status-dot ${status}`} />
            <span className="brand">MAVERICK AI</span>
          </div>

          <div className="header-actions">
            <button
              className="header-btn"
              onClick={resetState}
              title="New Podcast"
            >
              <RefreshCcw size={20} />
              <span className="desktop-only">New</span>
            </button>
            {/* <button
              className="header-btn"
              onClick={() => setShowSettings(!showSettings)}
            >
              {showSettings ? <ChevronUp size={20} /> : <Settings size={20} />}
              <span className="desktop-only">Settings</span>
            </button> */}
          </div>
        </div>

        <ControlCenter
          variant="header"
          {...{
            status,
            numTurns,
            setNumTurns,
            audioOn,
            setAudioOn,
            resetState,
            chatHistory,
            audioChunks,
            downloadFile,
            handleDownloadAudio,
          }}
        />
      </header>

      <main className="main-content">
        <ChatFeed history={chatHistory} chatEndRef={chatEndRef} />

        <div className="input-area">
          <div className="input-container">
            {imagePreview && (
              <div className="image-preview-bubble">
                <img src={imagePreview} alt="upload" />
                <button
                  onClick={() => {
                    setImage(null);
                    setImagePreview(null);
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <textarea
              placeholder="Enter a topic or attach an image..."
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                !e.shiftKey &&
                (e.preventDefault(), startPodcast(audioOn, image))
              }
            />
            <div className="input-actions">
              <label className="icon-btn-label upload" title="Image">
                <Upload size={18} />
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={onFileChange}
                />
              </label>
              <button
                className="send-btn"
                onClick={() => startPodcast(audioOn, image)}
                disabled={loading || !text}
              >
                {loading ? (
                  <Loader2 className="spinning" size={18} />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
