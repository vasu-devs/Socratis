import asyncio
import logging
import os
import json
import aiohttp
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

# ============================================================================
# SOCRATIC INTERVIEWER PROMPT
# ============================================================================

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

# ============================================================================
# FORENSIC REPORT GENERATOR (SINGLE AGENT MODE)
# ============================================================================

async def generate_assessment_report(llm: LLM, session_id: str, problem_title: str, final_code: str, chat_messages):
    """
    Generates a FORENSIC, HYPER-CRITICAL evaluation of the session and submits it to the backend.
    """
    logger.info("[REPORT] Starting forensic analysis (Single Agent)...")
    
    # 1. Prepare transcript
    transcript = ""
    for msg in chat_messages.items:
        role = "CANDIDATE" if msg.role == ChatRole.USER else "SOCRATIS"
        transcript += f"{role}: {msg.content}\n"

    # 2. Build the Forensic System Prompt
    system_prompt = """
# 🎯 SOCRATIS REPORT AGENT - IDENTITY

You are the **Socratis Report Agent**, an elite, hyper-critical technical interview evaluator for top-tier tech companies (Google, Netflix, HFT firms).
The interview has concluded. Your job is to provide a **Forensic, Deep-Dive Analysis**.
The user explicitly wants to know:
1. **Every single mistake** in their code (syntax, logic, edge cases, complexity, style, naming).
2. **Every single flaw** in their verbal communication (rambling, imprecision, missing concepts, ignoring hints).
3. **Specific, actionable corrections** for each issue.

## YOUR CHARACTERISTICS:
- **Ruthlessly Detailed**: Do not glaze over minor errors. Address everything. If the code works but is ugly, say it.
- **Pinpoint Specificity**: Never say "improve error handling". Say "Line 45 catches a generic Exception which masks the specific internal error."
- **Direct & Professional**: Use clear, high-impact language.
- **Evidence-Based**: You MUST cite specific line numbers, variable names, and exact transcript quotes for every claim.
- **No Filler**: Never praise "Attendance" or "Politeness". Only praise technical or communication *skills*. If there are no strengths, state "None".

# 🚨 MANDATORY OUTPUT REQUIREMENTS

## RULE 1: DEEP CODE AUDIT (The "Issues List")
- **IF CODE IS EMPTY**: You MUST generate a `code_issue` at Line 1 with severity "error" and issue "Missing Implementation".
- **IF CODE EXISTS**: List EVERY issue found. Do not limit yourself.
- **Syntactical**: Typos, missing semicolons, wrong strict types.
- **Logical**: Infinite loops, off-by-one errors, unnecessary computations.
- **Best Practices**: Variable naming (e.g., 'x' vs 'userIndex'), lack of comments, magic numbers.

## RULE 2: TRANSCRIPT FORENSICS (The "Verbal Audit")
- **IF TRANSCRIPT IS SHORT/EMPTY**: You MUST generate a `transcript_issue` with severity "error" stating "Lack of Communication" or "Failure to Explain Approach".
- You must identify SPECIFIC issues in the spoken responses.
- **Precision**: Did they say "Hashtable" when they meant "HashSet"?
- **Clarity**: Did they ramble?
- **Responsiveness**: Did they ignore a hint from the interviewer?

## RULE 3: Structure
- The `code_issues` array MUST NOT be empty if there are any flaws.
- The `transcript_issues` array MUST NOT be empty if there are any flaws.
- Your markdown feedback MUST follow the "What Went Well" / "Areas to Improve" structure.
- **"Areas to Improve" must be the DOMINANT section.**

---

# 📝 REQUIRED OUTPUT STRUCTURE (JSON ONLY)

Your response MUST be valid JSON with this exact structure:

```json
{
  "overall_score": <number 1-10>,
  "correctness": <boolean>,
  "dimension_scores": {
    "problem_solving": <1-10>,
    "algorithmic_thinking": <1-10>,
    "code_implementation": <1-10>,
    "testing": <1-10>,
    "time_management": <1-10>,
    "communication": <1-10>
  },
  "code_issues": [
    {
      "line_number": <number>,
      "code_snippet": "<exact code or 'N/A'>",
      "issue": "<what is wrong>",
      "suggestion": "<how to fix>",
      "severity": "error" | "warning" | "info"
    }
  ],
  "transcript_issues": [
    {
      "quote": "<exact quote or 'Silence'>",
      "issue": "<critique>",
      "what_should_have_been_said": "<better phrasing>",
      "category": "communication" | "technical" | "behavior"
    }
  ],
  "feedback_markdown": "<full markdown report - see format below>"
}
```

# 📄 FEEDBACK_MARKDOWN FORMAT

The `feedback_markdown` string MUST use these EXACT headers (###).
Do NOT use bolding like **Verdict** inside the header lines.

### Summary
**Verdict:** [Strong No / No / Weak Yes / Strong Yes]
[Executive brief]

### Strengths
- **[Strength 1]:** [Specific evidence]
[If none, state "No significant strengths observed."]

### Areas for Improvement
- **[Weakness 1]:** [Specific evidence]
- **[Weakness 2]:** [Specific evidence]

### Code Review
[Detailed critique of the code quality]
"""

    user_content = f"""
# INTERVIEW ARTIFACTS TO ANALYZE

## 📋 PROBLEM CONTEXT
**Problem:** {problem_title}

## 💻 CANDIDATE'S FINAL CODE
```javascript
{final_code}
```

## 🎙️ INTERVIEW TRANSCRIPT
{transcript}

---

# YOUR TASK
Generate the JSON evaluation. Do not output any text before or after the JSON.
"""

    try:
        chat_ctx = ChatContext(
            messages=[
                ChatMessage(role=ChatRole.SYSTEM, content=system_prompt),
                ChatMessage(role=ChatRole.USER, content=user_content),
            ]
        )
        
        # Call LLM
        logger.info("[REPORT] Querying LLM for analysis...")
        response = await llm.chat(chat_ctx=chat_ctx)
        content_str = response.choices[0].message.content
        
        # Clean potential markdown fences
        content_str = content_str.replace("```json", "").replace("```", "").strip()
        
        # Parse JSON to ensure validity
        analysis_json = json.loads(content_str)
        logger.info(f"[REPORT] Analysis generated. Score: {analysis_json.get('overall_score')}")

        # 3. Submit to Backend
        backend_url = "http://localhost:4000/api/save-analysis"
        payload = {
            "sessionId": session_id,
            "analysis": analysis_json
        }
        
        async with aiohttp.ClientSession() as http_session:
            async with http_session.post(backend_url, json=payload) as resp:
                if resp.status == 200:
                    logger.info("[REPORT] Successfully saved analysis to backend.")
                else:
                    logger.error(f"[REPORT] Backend returned error: {resp.status} - {await resp.text()}")

    except Exception as e:
        logger.error(f"[REPORT] Failed to generate/save report: {e}")


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

    # 4. Handle Data Interactions
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        try:
            payload = json.loads(data_packet.data.decode('utf-8'))
            msg_type = payload.get("type")
            
            # Log ONLY the type to avoid huge logs
            logger.info(f"[DATA] Received packet type: {msg_type}")
            
            if msg_type == "problem":
                title = payload.get('title', 'Unknown')
                logger.info(f"[CONTEXT] Problem context received: {title}")
                interview_state["problem_title"] = title
                interview_state["problem_desc"] = payload.get("description", "")
                problem_context_received.set()
                
                # Handshake: Acknowledge receipt so frontend stops spamming
                confirmation = json.dumps({"type": "problem_ack", "title": interview_state["problem_title"]})
                # Ensure we use the current participant to send
                if ctx.room.local_participant:
                     asyncio.create_task(ctx.room.local_participant.publish_data(confirmation, reliable=True))
                     logger.info("[DATA] Sent problem_ack to frontend")
            
            elif msg_type == "code":
                interview_state["latest_code"] = payload.get("content", "// No code")
            
            # CRITICAL: Dynamic Injection - Update agent instructions in real-time
            # Only update if we actually have context
            if interview_state["problem_title"] != "the coding task":
                asyncio.create_task(logic_agent.update_instructions(
                    build_interview_instructions(
                        interview_state["problem_title"],
                        interview_state["problem_desc"],
                        interview_state["latest_code"]
                    )
                ))
            
        except Exception as e:
            logger.error(f"[DATA] Error processing packet: {e}")

    # 5. Connect and Start
    try:
        logger.info("[STEP 5] Calling session.start...")
        await session.start(agent=logic_agent, room=ctx.room)
        logger.info("[STEP 5] Session started successfully")

        # 6. Send Greeting
        # 6. Send Greeting
        # Wait for context (with long safety timeout)
        logger.info("[STEP 5.5] Waiting for problem context...")
        try:
            # Wait up to 30 seconds for context
            await asyncio.wait_for(problem_context_received.wait(), timeout=30.0)
            logger.info(f"[STEP 5.5] Context received: {interview_state['problem_title']}")
            
            # Stabilization delay: Give the frontend a moment to subscribe to the audio track
            # This prevents the greeting from being cut off or lost during connection stabilization
            await asyncio.sleep(1.0)

            greeting_text = f"Hello! I'm Socratis. I see we're working on '{interview_state['problem_title']}'. Walk me through your approach before we start coding."
            logger.info(f"[STEP 6] Sending greeting: {greeting_text}")
            await session.say(greeting_text, allow_interruptions=False)

        except asyncio.TimeoutError:
            logger.error("[STEP 5.5] CRITICAL: Timed out waiting for context!")
            # Fallback: Just ask the user to describe it, don't hallucinate.
            fallback_text = "Hello! I'm ready to start. Could you tell me which problem we are working on today?"
            logger.info(f"[STEP 6] Sending FALLBACK greeting: {fallback_text}")
            await session.say(fallback_text, allow_interruptions=False)
        
        # Run until participant disconnects
        while ctx.room.is_connected:
            await asyncio.sleep(1)

    except Exception as e:
        logger.error(f"[ENTRYPOINT] Crash: {e}")
    finally:
        # 7. Generate Post-Interview Report (SINGLE AGENT)
        try:
            # Check if agent and chat_ctx exist and yield messages
            # Note: logic_agent.chat_ctx might be read-only or structured differently in some versions
            if logic_agent and hasattr(logic_agent, 'chat_ctx'):
                 # Inspect keys or attributes safely
                 messages = getattr(logic_agent.chat_ctx, 'messages', None)
                 
                 if messages:
                    logger.info("[ENTRYPOINT] Session ended. Triggering analysis...")
                    
                    # Assuming Room Name is the sessionId (from interview.ts logic)
                    session_id = ctx.room.name 
                    
                    await generate_assessment_report(
                        groq_llm, 
                        session_id,
                        interview_state["problem_title"], 
                        interview_state["latest_code"],
                        messages
                    )
        except Exception as report_err:
            logger.error(f"[ENTRYPOINT] Report generation failed (non-fatal): {report_err}")
        else:
            logger.warning("[ENTRYPOINT] No messages found, skipping report generation.")
            
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
