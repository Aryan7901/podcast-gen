import asyncio
import base64
import json
from typing import Optional
from fastapi import FastAPI, Form, UploadFile, File
import os
from langchain_groq import ChatGroq

# FastAPI & Rate Limiting
from fastapi import FastAPI, Form, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from podcast_gen import PodcastGen, generate_wav_chunk
from fastapi.middleware.cors import CORSMiddleware


podcast_semaphore = asyncio.Semaphore(10)

app = FastAPI()

FRONTEND_URL=os.getenv("FRONTEND_URL")

origins = [
    "http://localhost:5174", 
    "http://localhost:3000",
     FRONTEND_URL,
    "http://100.92.163.84:5174"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            
    allow_credentials=True,
    allow_methods=["*"],              
    allow_headers=["*"],              
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─────────────────────────────────────────────────────────────
# 🚀 THE FASTAPI ENDPOINT
# ─────────────────────────────────────────────────────────────
SPEECHMATICS_API_KEY=os.getenv("SPEECHMATICS_API_KEY")

producer_llm = ChatGroq(model="meta-llama/llama-4-scout-17b-16e-instruct", temperature=0.1)
jamie_llm = ChatGroq(model="openai/gpt-oss-120b", temperature=0.7) 
alex_llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.8)
@app.post("/generate")
@limiter.limit("3/minute")
async def generate_podcast_stream(
    request: Request,
    text: str = Form(...),
    num_turns: int = Form(4),
    generate_audio: bool = Form(False),
    image: Optional[UploadFile] = File(None)
):
    async def event_generator():
        async with podcast_semaphore:
            # 1. Image Pre-processing (Convert to B64 once)
            image_b64 = None
            if image:
                img_bytes = await image.read()
                image_b64 = base64.b64encode(img_bytes).decode("utf-8")

            # 2. Setup Generator
            generator = PodcastGen(num_turns, producer_llm, jamie_llm, alex_llm, generate_audio, text)
            graph = generator.compile_graph()
            
            initial_state = {
                "messages": [],
                "turn_count": 0,
                "max_turns": num_turns,
                "text_context": text,
                "image_data": image_b64,
                "is_confused": False,
                "wants_nerdy": False
            }

            # 3. Stream the Graph Updates
            async for event in graph.astream(initial_state, stream_mode="updates"):
                for node, data in event.items():
                    if "messages" in data:
                        msg = data["messages"][-1]
                        speaker=node.upper()
                        
                        # Generate Audio on-the-fly for this turn
                        audio_b64 = ""
                        if generate_audio:
                            audio_b64 = await generate_wav_chunk(msg.content, speaker, True, SPEECHMATICS_API_KEY)
                        
                        # Yield JSON SSE (Server-Sent Event)
                        yield f"data: {json.dumps({'speaker': speaker, 'text': msg.content, 'audio': audio_b64})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)