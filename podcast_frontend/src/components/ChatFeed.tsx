import React from "react";
import Markdown from "react-markdown";
import type { ChatMessage } from "../types";
import "./chat.css";

interface ChatFeedProps {
  history: ChatMessage[];
  chatEndRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatFeed: React.FC<ChatFeedProps> = ({ history, chatEndRef }) => (
  <section className="chat-feed">
    {history.length === 0 ? (
      <div className="empty-state">
        <h1>START A PODCAST</h1>
      </div>
    ) : (
      history.map((msg, idx) => (
        <div
          key={idx}
          className={`message-wrapper ${
            msg.speaker === "ALEX" ? "alex-turn" : ""
          }`}
        >
          <div className="message-content">
            <div
              className={`avatar ${msg.speaker === "ALEX" ? "alex" : "jamie"}`}
            >
              {msg.speaker[0]}
            </div>
            <div className="message-text">
              <div className="speaker-name">{msg.speaker}</div>
              <Markdown>{msg.text}</Markdown>
            </div>
          </div>
        </div>
      ))
    )}
    <div ref={chatEndRef} />
  </section>
);
