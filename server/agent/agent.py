import asyncio
import logging
import os
import json
from dotenv import load_dotenv

from livekit.agents import (
    cli,
    WorkerOptions,
    JobContext,
    AgentSession,
    ChatContext,
    ChatMessage,
    ChatRole,
)
from livekit.agents.llm import LLM
from livekit.plugins import deepgram, openai, silero
import livekit.agents.voice as voice

# --- Deepgram/TTS fix ---
from deepgram_patch import patch_deepgram_tts
patch_deepgram_tts()

load_dotenv()

logger = logging.getLogger("socratis-agent")
logger.setLevel(logging.INFO)

def build_interview_instructions(problem_title="the coding task", problem_desc="the problem description", current_code="// No code yet") -> str:
    """
    Constructs the Socratic instructions with real-time context injected.
    """
    return f"""# ROLE: SOCRATIS - Senior Technical Interviewer

You are Socratis, a calm, professional Senior Software Engineer.
You are currently evaluating the candidate one-on-one.

## LIVE CONTEXT (THE ONLY SOURCE OF TRUTH)
1. **[CURRENT PROBLEM]**: {problem_title}
   - Description: {problem_desc}
   - **IMPORTANT**: If they ask "What is the problem?", briefly remind them of the title. BUT DO NOT ask them "What is the problem?". YOU SEE IT.
2. **[CANDIDATE CODE]**: 
```javascript
{current_code}
```

## INTERVIEW STAGES
1. **Approach Review**: BEFORE they code, ask them to explain their plan.
2. **Silent Observation**: While they type, STAY SILENT. If they pause for >30s, comment on a SPECIFIC line of their code.
3. **Socratic Inquiry**: If they make a mistake, do not give the answer. Instead, ask: "I'm looking at line X... how would that handle [edge case]?"

## GUARDRAILS
- **No Direct Answers**: Never write code for them.
- **Concise**: Keep responses under 2 sentences.
- **Stay in Context**: Use the [CANDIDATE CODE] above to make your questions specific. Avoid generic feedback.
"""

async def generate_assessment_report(llm, problem_title, final_code, chat_messages):
    """
    Generates a detailed markdown report after the interview ends.
    """
    logger.info("[REPORT] Generating detailed assessment report...")
    
    # 1. Prepare transcript from messages
    transcript = ""
    for msg in chat_messages.items:
        role = "CANDIDATE" if msg.role == ChatRole.USER else "SOCRATIS"
        transcript += f"{role}: {msg.content}\n"

    system_prompt = """You are a Lead Hiring Manager. 
    Review the following technical interview data and generate a structured "Hiring Assessment Report".
    
    Structure the report exactly like this:
    
    ## 1. Executive Summary
    - **Pass/Fail Recommendation**: [Strong No / No / Weak Yes / Strong Yes]
    - **One-Line Verdict**: Why this result?
    
    ## 2. Code Quality Analysis
    - **Correctness**: Did they solve the problem?
    - **Bugs/Issues**: List specific errors.
    - **Complexity**: Time/Space Analysis.
    
    ## 3. Communication
    - Did they explain their approach?
    - How did they handle Socratic hints?
    """

    user_content = f"""
    CONTEXT DATA:
    -------------
    PROBLEM TITLE: {problem_title}
    
    FINAL CODE STATE:
    ```javascript
    {final_code}
    ```
    
    INTERVIEW TRANSCRIPT:
    {transcript}
    """

    try:
        chat_ctx = ChatContext(
            messages=[
                ChatMessage(role=ChatRole.SYSTEM, content=system_prompt),
                ChatMessage(role=ChatRole.USER, content=user_content),
            ]
        )
        
        # Use simple non-streaming call for report
        response = await llm.chat(chat_ctx=chat_ctx)
        report_text = response.choices[0].message.content
        
        logger.info("\n" + "="*50 + "\nFINAL HIRING ASSESSMENT REPORT\n" + "="*50 + "\n" + report_text + "\n" + "="*50)
        return report_text
    except Exception as e:
        logger.error(f"[REPORT] Failed to generate report: {e}")
        return None

async def entrypoint(ctx: JobContext):
    logger.info(f"[ENTRYPOINT] Starting agent for room '{ctx.room.name}'")

    # Local state
    interview_state = {
        "problem_title": "the coding task",
        "problem_desc": "the problem description",
        "latest_code": "// Preparing your environment...",
    }
    
    # Event to signal when problem context is ready
    problem_context_received = asyncio.Event()

    # 1. Setup Models
    # Load VAD if missing (prewarm fallback)
    vad = ctx.proc.userdata.get("vad")
    if vad is None:
        logger.info("[ENTRYPOINT] VAD not found in userdata, loading now...")
        vad = silero.VAD.load()
        ctx.proc.userdata["vad"] = vad
    
    groq_llm = openai.LLM(
        base_url="https://api.groq.com/openai/v1",
        api_key=os.environ.get("GROQ_API_KEY"),
        model="llama-3.3-70b-versatile"
    )
    
    deepgram_stt = deepgram.STT(model="nova-2-general")
    deepgram_tts = deepgram.TTS(model="aura-helios-en")

    # 2. Define the Agent
    logic_agent = voice.Agent(
        instructions=build_interview_instructions(),
        chat_ctx=ChatContext()
    )

    # 3. Setup Session
    session = AgentSession(
        vad=vad,
        stt=deepgram_stt,
        llm=groq_llm,
        tts=deepgram_tts,
    )

    # 4. Handle Data Interactions (Sync instructions with UI)
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        try:
            payload = json.loads(data_packet.data.decode('utf-8'))
            msg_type = payload.get("type")
            
            if msg_type == "problem":
                logger.info(f"[CONTEXT] Problem context received: {payload.get('title')}")
                interview_state["problem_title"] = payload.get("title", "Updated Problem")
                interview_state["problem_desc"] = payload.get("description", "")
                problem_context_received.set()
            
            elif msg_type == "code":
                # Silently update code context
                interview_state["latest_code"] = payload.get("content", "// No code")
            
            # CRITICAL: Dynamic Injection - Update agent instructions in real-time
            asyncio.create_task(logic_agent.update_instructions(
                build_interview_instructions(
                    interview_state["problem_title"],
                    interview_state["problem_desc"],
                    interview_state["latest_code"]
                )
            ))
            
        except Exception as e:
            logger.error(f"[DATA] Error parsing packet: {e}")

    # 5. Connect and Start
    try:
        logger.info("[STEP 5] Calling session.start...")
        await session.start(agent=logic_agent, room=ctx.room)
        logger.info("[STEP 5] Session started successfully")

        # Wait for problem context to ensure correct greeting
        logger.info("[STEP 5.5] Waiting for problem context...")
        try:
            await asyncio.wait_for(problem_context_received.wait(), timeout=5.0)
            logger.info(f"[STEP 5.5] Context received: {interview_state['problem_title']}")
        except asyncio.TimeoutError:
            logger.warning("[STEP 5.5] Timed out waiting for context, proceeding with defaults")

        # 6. Send Greeting
        greeting_text = f"Hello! I'm Socratis. I see we're working on '{interview_state['problem_title']}'. Walk me through your approach before we start coding."
        logger.info(f"[STEP 6] Sending greeting: {greeting_text}")
        session.say(greeting_text, allow_interruptions=False)
        logger.info("[STEP 6] Greeting sent to session.say")
        
        # Publish transcript for greeting
        transcript_msg = json.dumps({"type": "transcript", "role": "assistant", "text": greeting_text})
        if ctx.room.local_participant:
            await ctx.room.local_participant.publish_data(transcript_msg.encode('utf-8'))

        # Run until participant disconnects
        while ctx.room.is_connected:
            await asyncio.sleep(1)

    except Exception as e:
        logger.error(f"[ENTRYPOINT] Crash: {e}")
    finally:
        # 7. Generate Post-Interview Report
        if logic_agent.chat_ctx.messages:
            await generate_assessment_report(
                groq_llm, 
                interview_state["problem_title"], 
                interview_state["latest_code"],
                logic_agent.chat_ctx.messages
            )
        logger.info("[ENTRYPOINT] Cleanup complete.")

async def prewarm(proc):
    logger.info("[PREWARM] Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("[PREWARM] VAD loaded successfully")

if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
