import React from "react";
import { RefreshCcw, Mic, MicOff, FileText, Music } from "lucide-react";
import type { ControlProps } from "../types";

import "./control.css";

export const ControlCenter: React.FC<ControlProps> = ({
  variant,
  numTurns,
  setNumTurns,
  audioOn,
  setAudioOn,
  resetState,
  chatHistory,
  audioChunks,
  downloadFile,
  handleDownloadAudio,
}) => {
  const isSidebar = variant === "sidebar";

  const exportMD = () => {
    const blob = new Blob(
      [chatHistory.map((m) => `### ${m.speaker}\n${m.text}`).join("\n\n")],
      { type: "text/markdown" }
    );
    downloadFile(blob, isSidebar ? "show_notes.md" : "notes.md");
  };

  return (
    <div className={isSidebar ? "sidebar-content" : "settings-grid"}>
      {/* 1. Reset Button (Only needed inside the mobile drawer or top of sidebar) */}
      {isSidebar && (
        <button className="new-podcast-btn" onClick={resetState}>
          <RefreshCcw size={18} /> New Podcast
        </button>
      )}

      {isSidebar && <div className="sidebar-divider" />}

      {/* 2. Podcast Length Slider */}
      <div className={isSidebar ? "sidebar-section" : "setting-item"}>
        <label className={isSidebar ? "sidebar-label" : ""}>
          Podcast Length
        </label>
        <div className="slider-container">
          <input
            type="range"
            min="2"
            max="16"
            step="1"
            value={numTurns}
            onChange={(e) => setNumTurns(parseInt(e.target.value))}
          />
          <span className={isSidebar ? "turn-count" : ""}>
            {numTurns} Turns
          </span>
        </div>
      </div>

      {/* 3. Audio Toggle */}
      <div className={isSidebar ? "sidebar-section" : "setting-item"}>
        <label className={isSidebar ? "sidebar-label" : ""}>Audio Output</label>
        <button
          className={
            isSidebar
              ? `audio-toggle-btn ${audioOn ? "active" : ""}`
              : `toggle-pill ${audioOn ? "active" : ""}`
          }
          onClick={() => setAudioOn(!audioOn)}
        >
          {audioOn ? (
            <Mic size={isSidebar ? 18 : 16} />
          ) : (
            <MicOff size={isSidebar ? 18 : 16} />
          )}
          <span>
            {audioOn
              ? isSidebar
                ? "Audio Enabled"
                : "Enabled"
              : isSidebar
              ? "Audio Muted"
              : "Muted"}
          </span>
        </button>
      </div>

      {/* 4. Export Section */}
      {chatHistory.length > 0 && (
        <div
          className={
            isSidebar ? "sidebar-section" : "setting-item export-group"
          }
        >
          <label className={isSidebar ? "sidebar-label" : ""}>Export</label>
          <div className={isSidebar ? "" : "export-btns"}>
            <button
              className={isSidebar ? "sidebar-action-btn" : "toggle-pill"}
              onClick={exportMD}
            >
              <FileText size={isSidebar ? 16 : 14} />{" "}
              {isSidebar ? "Save Show Notes (.md)" : "MD"}
            </button>
            {audioChunks.length > 0 && (
              <button
                className={isSidebar ? "sidebar-action-btn" : "toggle-pill"}
                onClick={handleDownloadAudio}
              >
                <Music size={isSidebar ? 16 : 14} />{" "}
                {isSidebar ? "Download Podcast (.wav)" : "WAV"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
