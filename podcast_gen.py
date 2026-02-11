import re
import random
import base64
import httpx
from typing import TypedDict, List, Annotated, Optional

# LangGraph & LangChain
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage, AIMessage


async def generate_wav_chunk(text: str, speaker: str, should_generate: bool, api_key: str) -> str:
    """Fetches wav from Speechmatics and returns a Base64 encoded wav string."""
    if not should_generate or not text:
        return ""
    
    voice_id = "sarah" if speaker in ["JAMIE", "JAMIE_OUTRO"] else "theo"
    # Using pcm_16000 for seamless concatenation/streaming
    url = f"https://preview.tts.speechmatics.com/generate/{voice_id}?output_format=wav_16000"
    headers = {"Authorization": f"Bearer {api_key}"}
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(url, headers=headers, json={"text": text}, timeout=30)
            if response.status_code == 200:
                return base64.b64encode(response.content).decode("utf-8")
        except Exception as e:
            print(f"❌ TTS Error for {speaker}: {e}")
    return ""

# ─────────────────────────────────────────────────────────────
# UTILS & STATE
# ─────────────────────────────────────────────────────────────

def strip_think_tags(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE).strip()

class PodcastState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    turn_count: int
    max_turns: int
    text_context: Optional[str]
    image_data: Optional[str]
    briefing: dict
    is_confused: bool
    wants_nerdy: bool

class PodcastGen:
    def __init__(self, num_turns, producer_llm, jamie_llm, alex_llm, generate_audio=False, text_content=""):
        self.generate_audio = generate_audio
        self.text_content = text_content
        self.num_turns = min(max(num_turns, 1), 16)
        self.producer_llm = producer_llm
        self.jamie_llm = jamie_llm
        self.alex_llm = alex_llm

    async def producer_node(self, state: PodcastState):
        topic = state.get("text_context") or "General Knowledge"
        image_b64 = state.get("image_data")
        
        prompt_text = f"""
        You are a PRODUCER. Analyze the topic: {topic}.
        Return ONLY:
        TITLE: title of the podcast.
        HOOK: One vivid sentence.
        FACT_1, FACT_2, FACT_3: Technical mechanisms.
        WILDCARD: A strange philosophical angle.
        """
        content = [{"type": "text", "text": prompt_text}]

        if image_b64:
            content.append({"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}})

        response = await self.producer_llm.ainvoke([HumanMessage(content=content)])
        return {
            "briefing": {"content": strip_think_tags(response.content)},
            "image_data": None 
        }

    async def jamie_node(self, state: PodcastState):
        is_first_turn = len(state["messages"]) == 0
        is_confused = state.get("is_confused", False)
        wants_nerdy = state.get("wants_nerdy", False)
        briefing = state["briefing"]["content"]

        if is_first_turn:
            jamie_sys = ("You are JAMIE, the expert co-host. Speak naturally, no lists. "
                         "This is the START of the show. Welcome the listeners to the 'Alex and Jamie Podcast'. "
                         "Introduce the topic using the HOOK from the briefing. Do NOT explain facts yet. "
                         "End by inviting Alex to react to the intro. "
                         "NEVER mention the words 'FACT', 'HOOK', or 'WILD CARD' in your dialogue.\n")
        else:
            jamie_sys = ("You are JAMIE, the expert co-host. Speak naturally, no lists. "
                         "Answer Alex's questions if any. Do not introduce more than ONE new FACT per turn. "
                         "NEVER mention the words 'FACT', 'HOOK', or 'WILD CARD' in your dialogue.\n")
            if is_confused: jamie_sys += " Alex is lost. Explain this again using a SIMPLER, different metaphor."
            elif wants_nerdy: jamie_sys += " Alex wants a deep dive. Provide a more technical, detailed version."
        
        response = await self.jamie_llm.ainvoke([SystemMessage(content=jamie_sys)] + state["messages"] + [HumanMessage(content=f"Briefing: {briefing}")])
        content = strip_think_tags(response.content)
        
        return {
            "messages": [AIMessage(content=content, name="JAMIE")],
            "is_confused": False,
            "wants_nerdy": False
        }

    async def alex_node(self, state: PodcastState):
        last_message_content = state["messages"][-1].content
        chance = random.random()
        is_confused, wants_nerdy = False, False

        if state.get("turn_count") == 0:
            mood_instruction = "This is the start of the show! Greet Jamie back warmly react to the intro hook without being a sycophant. Ask a broad opening question."
        else:
            if chance < 0.15: mood_instruction, is_confused = "You didn't really get that. Ask Jamie to dumb it down.", True
            elif chance < 0.35: mood_instruction, is_confused = "You kind of understand, but ask for a simpler analogy.", True
            elif chance < 0.55: mood_instruction = "You just had a 'lightbulb moment.' Synthesize what Jamie said in a high-energy way."
            elif chance < 0.85: mood_instruction = "You follow Jamie. Ask a specific 'How' or 'Why' question."
            else: mood_instruction, wants_nerdy = "You are fascinated. Ask for the detailed explanation.", True

        alex_sys = f"You are ALEX, a casual co-host. Natural, max 2-3 sentences. You dont say your internal thoughts like (laughs). MOOD: {mood_instruction}"
        response = await self.alex_llm.ainvoke([SystemMessage(content=alex_sys), HumanMessage(content=last_message_content)])
        content = strip_think_tags(response.content)

        return {
            "messages": [AIMessage(content=content, name="ALEX")],
            "turn_count": state["turn_count"] + 1,
            "is_confused": is_confused,
            "wants_nerdy": wants_nerdy
        }

    async def conclusion_node(self, state: PodcastState):
        outro_sys = "You are JAMIE. Tell Alex his question will be answered in the next episode. Wrap up and say goodbye. No headers or bullets."
        response = await self.jamie_llm.ainvoke(state["messages"] + [SystemMessage(content=outro_sys)])
        return {"messages": [AIMessage(content=strip_think_tags(response.content), name="JAMIE_OUTRO")]}

    def should_continue(self, state: PodcastState):
        return "conclusion" if state["turn_count"] >= state["max_turns"] else "jamie"
    
    def compile_graph(self):
        workflow = StateGraph(PodcastState)
        workflow.add_node("producer", self.producer_node)
        workflow.add_node("jamie", self.jamie_node)
        workflow.add_node("alex", self.alex_node)
        workflow.add_node("conclusion", self.conclusion_node)

        workflow.set_entry_point("producer")
        workflow.add_edge("producer", "jamie")
        workflow.add_edge("jamie", "alex")
        workflow.add_conditional_edges("alex", self.should_continue, {"conclusion": "conclusion", "jamie": "jamie"})
        workflow.add_edge("conclusion", END)
        return workflow.compile()