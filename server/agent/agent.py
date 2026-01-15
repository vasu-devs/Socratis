import logging
import os
import asyncio
from pathlib import Path

from dotenv import load_dotenv
from livekit.agents import (
    AutoSubscribe,
    JobContext,
    JobProcess,
    WorkerOptions,
    AgentSession,
    cli,
    llm,
)
import livekit.agents.voice as voice
from livekit.plugins import deepgram, openai, silero

# Explicitly load env
env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

logger = logging.getLogger("socratis-agent")
logger.setLevel(logging.INFO)

def prewarm(proc: JobProcess):
    logger.info("[PREWARM] Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("[PREWARM] VAD loaded successfully")

async def entrypoint(ctx: JobContext):
    logger.info(f"[ENTRYPOINT] Starting agent for room '{ctx.room.name}'")
    
    # STEP 1: Connect to room FIRST
    logger.info("[STEP 1] Connecting to LiveKit room...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)
    logger.info("[STEP 1] Connected to room successfully")
    
    # STEP 2: Wait for participant
    logger.info("[STEP 2] Waiting for participant to join...")
    participant = await ctx.wait_for_participant()
    logger.info(f"[STEP 2] Participant joined - Identity: {participant.identity}")
    
    # STEP 3: Initialize plugins with aggressive error handling
    logger.info("[STEP 3] Initializing AI plugins...")
    try:
        logger.info("[STEP 3] - Initializing Deepgram TTS (model: aura-helios-en)...")
        deepgram_tts = deepgram.TTS(
            api_key=os.environ.get("DEEPGRAM_API_KEY"),
            model="aura-helios-en"
        )
        logger.info("[STEP 3] - Deepgram TTS initialized successfully")
        
        logger.info("[STEP 3] - Initializing Groq LLM (model: llama-3.1-8b-instant)...")
        groq_llm = openai.LLM(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ.get("GROQ_API_KEY"),
            model="llama-3.1-8b-instant",
        )
        logger.info("[STEP 3] - Groq LLM initialized successfully")
        
        logger.info("[STEP 3] - Initializing Groq STT (model: whisper-large-v3)...")
        groq_stt = openai.STT(
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ.get("GROQ_API_KEY"),
            model="whisper-large-v3"
        )
        logger.info("[STEP 3] - Groq STT initialized successfully")
        logger.info("[STEP 3] All plugins initialized - NO ERRORS")
        
    except Exception as e:
        logger.error(f"[STEP 3] CRITICAL FAILURE: Plugin initialization error")
        logger.error(f"[STEP 3] Error: {e}")
        logger.error(f"[STEP 3] Check your API keys in .env file:")
        logger.error(f"[STEP 3] - DEEPGRAM_API_KEY present: {bool(os.environ.get('DEEPGRAM_API_KEY'))}")
        logger.error(f"[STEP 3] - GROQ_API_KEY present: {bool(os.environ.get('GROQ_API_KEY'))}")
        return
    
    # STEP 4: Create voice.Agent with instructions
    logger.info("[STEP 4] Creating voice.Agent with instructions...")
    try:
        instructions_text = (
            "You are Socratis, a friendly and encouraging technical interviewer. "
            "You are conducting a coding interview for the 'Two Sum' problem. "
            "Be concise, supportive, and guide the candidate through their thought process. "
            "Ask clarifying questions and provide hints if they get stuck."
        )
        
        logic_agent = voice.Agent(
            instructions=instructions_text
        )
        logger.info("[STEP 4] voice.Agent created with interviewer persona")
        
    except Exception as e:
        logger.error(f"[STEP 4] FAILED: voice.Agent creation error: {e}")
        return
    
    # STEP 5: Create AgentSession orchestrator
    logger.info("[STEP 5] Creating AgentSession orchestrator...")
    try:
        session = AgentSession(
            vad=ctx.proc.userdata["vad"],
            stt=groq_stt,
            llm=groq_llm,
            tts=deepgram_tts,
        )
        logger.info("[STEP 5] AgentSession created (VAD + STT + LLM + TTS wired)")
        
    except Exception as e:
        logger.error(f"[STEP 5] FAILED: AgentSession creation error: {e}")
        return
    
    # STEP 6: Start the session (CRITICAL - must happen before say())
    logger.info("[STEP 6] Starting AgentSession with room + agent...")
    try:
        logger.info("[STEP 6] - Calling session.start(agent=logic_agent, room=ctx.room)...")
        await session.start(agent=logic_agent, room=ctx.room)
        logger.info("[STEP 6] Session started - Agent is now LIVE and listening")
        
    except Exception as e:
        logger.error(f"[STEP 6] CRITICAL FAILURE: session.start() failed")
        logger.error(f"[STEP 6] Error: {e}")
        import traceback
        logger.error(f"[STEP 6] Traceback:\n{traceback.format_exc()}")
        return
    
    # STEP 7: Wait for connection to fully stabilize
    logger.info("[STEP 7] Waiting 3 seconds for WebRTC/audio pipeline to stabilize...")
    await asyncio.sleep(3)
    logger.info("[STEP 7] Connection should be stable now")
    
    # STEP 8: Send greeting (THIS IS THE CRITICAL AUDIO TEST)
    logger.info("=" * 70)
    logger.info("[STEP 8] ATTEMPTING TO SPEAK GREETING")
    logger.info("=" * 70)
    
    greeting_text = "Hello! I'm Socratis, your AI interviewer. I'm ready to help you with the Two Sum problem. Can you hear me clearly?"
    
    try:
        logger.info(f"[STEP 8] - Greeting text: '{greeting_text}'")
        logger.info(f"[STEP 8] - Text length: {len(greeting_text)} characters")
        logger.info(f"[STEP 8] - Calling session.say()...")
        logger.info(f"[STEP 8] - This will trigger Deepgram TTS API call...")
        
        await session.say(greeting_text, allow_interruptions=True)
        
        logger.info("[STEP 8] - session.say() returned successfully!")
        logger.info("[STEP 8] - Deepgram accepted the request")
        logger.info("[STEP 8] - Audio synthesis completed")
        logger.info("[STEP 8] - Audio track should be published to LiveKit room")
        logger.info("[STEP 8] - Frontend should receive and play the audio")
        logger.info("")
        logger.info("[STEP 8] COMPLETE - GREETING SENT!")
        
    except Exception as e:
        logger.error("")
        logger.error("=" * 70)
        logger.error("[STEP 8] CATASTROPHIC FAILURE - GREETING FAILED")
        logger.error("=" * 70)
        logger.error(f"[STEP 8] Exception type: {type(e).__name__}")
        logger.error(f"[STEP 8] Exception message: {str(e)}")
        logger.error("")
        logger.error("[STEP 8] POSSIBLE CAUSES:")
        logger.error("[STEP 8] 1. Deepgram API key invalid or expired")
        logger.error("[STEP 8] 2. Deepgram quota exceeded")
        logger.error("[STEP 8] 3. Network connectivity issue")
        logger.error("[STEP 8] 4. TTS model 'aura-helios-en' unavailable")
        logger.error("")
        import traceback
        logger.error(f"[STEP 8] Full traceback:\n{traceback.format_exc()}")
        return
    
    # STEP 9: Set up code update handler
    logger.info("")
    logger.info("[STEP 9] Registering code update handler...")
    
    @ctx.room.on("data_received")
    def on_data_received(data: bytes, participant=None, kind=None):
        try:
            import json
            msg = json.loads(data.decode("utf-8"))
            
            if msg.get("type") == "code":
                code_content = msg.get("content", "")
                logger.info(f"[CODE UPDATE] Received from {participant.identity if participant else 'unknown'}")
                logger.info(f"[CODE UPDATE] Code length: {len(code_content)} characters")
                
                # Append to agent's context
                if hasattr(logic_agent, "chat_ctx"):
                    logic_agent.chat_ctx.append(
                        role="system",
                        text=f"CANDIDATE'S CURRENT CODE:\n```javascript\n{code_content}```"
                    )
                    logger.info("[CODE UPDATE] Code appended to agent's chat context")
                
        except json.JSONDecodeError as e:
            logger.error(f"[CODE UPDATE] Failed to parse data channel message: {e}")
        except Exception as e:
            logger.error(f"[CODE UPDATE] Handler error: {e}")
    
    logger.info("[STEP 9] Code update handler registered")
    
    # SUCCESS
    logger.info("")
    logger.info("=" * 70)
    logger.info("[SUCCESS] AGENT FULLY OPERATIONAL")
    logger.info("=" * 70)
    logger.info("[STATUS] Listening for user speech...")
    logger.info("[STATUS] Ready to conduct Two Sum interview")
    logger.info("[STATUS] Agent will respond when user speaks")
    logger.info("=" * 70)

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
