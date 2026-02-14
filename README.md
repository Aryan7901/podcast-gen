# 🎙️ ObsidianFM — AI Podcast Generator

> Built by [Aryan Shetty](https://github.com/Aryan7901)

> Live Link: [https://podcast-gen-gray.vercel.app](https://podcast-gen-gray.vercel.app)

An AI-powered podcast generator that turns any topic or image into a full two-host conversation, complete with streaming audio. Just type a topic, hit send, and get a real podcast with two distinct voices — **Jamie** (the expert) and **Alex** (the curious one).

---

## ✨ Features

- **AI Podcast Generation** — Paste any topic or upload an image; a producer LLM creates a briefing, then Jamie and Alex have a dynamic multi-turn conversation around it
- **Streaming Output** — Responses stream turn-by-turn via SSE so you hear/read the podcast as it's being generated
- **Text-to-Speech** — Each speaker gets a distinct voice via the Speechmatics TTS API (`sarah` → Jamie, `theo` → Alex)
- **Adjustable Length** — Slider to set 2–16 conversation turns
- **Export** — Download the full transcript as `.md` or the audio as `.wav`
- **Image Input** — Attach an image and the producer node will analyse it as context
- **Mobile Responsive** — Full mobile UI with a collapsible settings drawer
- **Docker File** — The Dockerfile can be used to create an image to deploy on your server.
---

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│              React Frontend             │
│  ChatFeed · ControlCenter · App.tsx     │
└──────────────────┬──────────────────────┘
                   │  SSE Stream (POST /generate)
┌──────────────────▼──────────────────────┐
│           FastAPI Backend               │
│               app.py                    │
└──────────────────┬──────────────────────┘
                   │
┌──────────────────▼──────────────────────┐
│        LangGraph Podcast Pipeline       │
│                                         │
│  producer → jamie → alex → jamie → ...  │
│                         └─ conclusion   │
└──────────────────┬──────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
┌──────▼──────┐       ┌────────▼────────┐
│  Groq LLMs  │       │ Speechmatics TTS│
│  (3 models) │       │  sarah / theo   │
└─────────────┘       └─────────────────┘
```

### LangGraph Node Roles

| Node | Model | Role |
|------|-------|------|
| `producer` | `llama-4-scout-17b` | Analyses topic/image, generates briefing with hook, facts, wildcard |
| `jamie` | `gpt-oss-120b` | Expert co-host — presents facts, adapts to Alex's mood |
| `alex` | `llama-3.1-8b` | Casual co-host — random mood each turn (confused / curious / nerdy) |
| `conclusion` | `gpt-oss-120b` | Jamie wraps up, teases next episode |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.12
- A [Groq](https://console.groq.com) API key
- A [Speechmatics](https://portal.speechmatics.com) API key (for audio)

### Backend

```bash
pip install -r requirements.txt

# Set environment variables
export GROQ_API_KEY=your_key_here
export SPEECHMATICS_API_KEY=your_key_here
export FRONTEND_URL=http://localhost:5174

python server.py
# Runs on http://0.0.0.0:8000
```

### Frontend

```bash
frontend
npm install
npm run dev
# Runs on http://localhost:5174
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GROQ_API_KEY` | ✅ | Groq API key for all LLM calls |
| `SPEECHMATICS_API_KEY` | Optional | Required only if audio output is enabled |
| `FRONTEND_URL` | ✅ | Frontend origin for CORS (e.g. `http://localhost:5174`) |

---

## 📡 API

### `POST /generate`

Streams a podcast as Server-Sent Events.

**Form fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `text` | `string` | required | Topic or prompt |
| `num_turns` | `int` | `4` | Number of back-and-forth turns (2–16) |
| `generate_audio` | `bool` | `false` | Whether to generate TTS audio per turn |
| `image` | `file` | optional | Image for the producer to analyse |

You can use other providers as well by changing the code in app.py.

**SSE Event shape:**

```json
{
  "speaker": "JAMIE",
  "text": "Welcome to the Alex and Jamie Podcast...",
  "audio": "<base64-encoded-wav or empty string>"
}
```

---

## 🗂️ Project Structure

```
├
│── app.py          # FastAPI app, SSE endpoint, rate limiting
│── podcast_gen.py     # LangGraph graph, all AI nodes, TTS helper
│
└── frontend/
    ├── src/
    │   ├── App.tsx                    # Root layout, input, state
    │   ├── components/
    │   │   ├── ChatFeed.tsx           # Message list with markdown rendering
    │   │   └── ControlCenter.tsx      # Settings panel (sidebar + mobile drawer)
    │   ├── hooks/
    │   │   ├── useBroadcast.ts        # SSE streaming, chat history state
    │   │   └── useAudioQueue.ts       # Audio chunk queue + playback
    │   └── types/                     # Shared TypeScript types
    └── public/
```

---

## 🎨 Tech Stack

**Frontend:** React · TypeScript · Vite · `react-markdown` · Lucide icons

**Backend:** FastAPI · LangGraph · LangChain · Groq · Speechmatics TTS · slowapi

---

## 📝 License

MIT — built by Aryan Shetty
