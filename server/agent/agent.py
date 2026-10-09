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
)
from livekit.agents.llm import LLM
from livekit.plugins import deepgram, openai, silero
import livekit.agents.voice as voice




load_dotenv()

logger = logging.getLogger("socratis-agent")
logger.setLevel(logging.INFO)

# ============================================================================
# SOCRATIC INTERVIEWER PROMPT
# ============================================================================

def build_interview_instructions(problem_title="the coding task", problem_desc="the problem description", current_code="// No code yet", examples=None) -> str:
    """
    Constructs the Socratic instructions with real-time context injected.
    """
    examples_text = ""
    if examples:
        examples_text = "\n   - **Examples:**\n"
        for ex in examples:
            examples_text += f"     - {ex}\n"

    return f"""# ROLE: SOCRATIS - Senior Technical Interviewer

You are Socratis, a calm, professional Senior Software Engineer conducting a live coding interview.

## LIVE CONTEXT (THE ONLY SOURCE OF TRUTH)
1. **[CURRENT PROBLEM]**: {problem_title}
   - Description: {problem_desc}{examples_text}
   - **IMPORTANT**: You already know the problem. Never ask the candidate what it is.
2. **[CANDIDATE CODE]**: 
```javascript
{current_code}
```

## ABSOLUTE RULES (NEVER BREAK THESE)
- **MAXIMUM 30 WORDS per response.** This is a hard limit. Count your words.
- **1-2 sentences ONLY.** Never exceed this.
- **You are SPEAKING, not writing.** Be conversational and natural.
- **No bullet points, no lists, no markdown.** You are talking out loud.
- **No Direct Answers**: Never write or dictate code for them.

## INTERVIEW FLOW
1. **Approach First**: Before they code, ask them to explain their plan in ONE short question.
2. **Stay Silent While They Type**: Only speak if they pause for 30+ seconds.
3. **Socratic Questions**: If they struggle, ask about a SPECIFIC line. Example: "How would line 5 handle an empty array?"

## WHAT NEVER TO DO
- Never give long explanations
- Never list multiple points
- Never repeat the problem description
- Never say "Let me explain" or "Here's what I think"
"""

# ============================================================================
# FORENSIC REPORT GENERATOR (SINGLE AGENT MODE)
# ============================================================================

async def generate_assessment_report(llm: LLM, session_id: str, problem_title: str, problem_desc: str, final_code: str, chat_messages):
    """
    Generates a FORENSIC, HYPER-CRITICAL evaluation of the session and submits it to the backend.
    """
    logger.info("[REPORT] Starting forensic analysis (Single Agent)...")
    
    # 1. Prepare transcript from chat items
    transcript = ""
    for msg in chat_messages:
        role = "CANDIDATE" if msg.role == "user" else "SOCRATIS"
        text = msg.text_content or ""
        if text.strip():
            transcript += f"{role}: {text}\n"

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
**Description:** {problem_desc}

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
        chat_ctx = ChatContext()
        chat_ctx.add_message(role="system", content=system_prompt)
        chat_ctx.add_message(role="user", content=user_content)
        
        # Call LLM — returns an LLMStream, must iterate to collect response
        logger.info("[REPORT] Querying LLM for analysis...")
        llm_stream = llm.chat(chat_ctx=chat_ctx)
        content_parts = []
        async for part in llm_stream.to_str_iterable():
            content_parts.append(part)
        await llm_stream.aclose()
        content_str = "".join(content_parts)
        
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
        "examples": [],
        "latest_code": "// Preparing your environment...",
    }

    # 1. Fetch question context directly from backend API (room name = session ID)
    session_id = ctx.room.name
    logger.info(f"[CONTEXT] Fetching session context from backend for '{session_id}'...")
    try:
        async with aiohttp.ClientSession() as http_session:
            async with http_session.get(f"http://localhost:4000/api/session/{session_id}") as resp:
                if resp.status == 200:
                    session_data = await resp.json()
                    q = session_data.get("question", {})
                    interview_state["problem_title"] = q.get("title", "the coding task")
                    interview_state["problem_desc"] = q.get("description", "the problem description")
                    interview_state["examples"] = q.get("examples", [])
                    interview_state["latest_code"] = q.get("starterCode", "// No code yet")
                    logger.info(f"[CONTEXT] Loaded context from API: '{interview_state['problem_title']}'")
                else:
                    logger.error(f"[CONTEXT] Backend returned {resp.status}, using fallback context")
    except Exception as e:
        logger.error(f"[CONTEXT] Failed to fetch from API: {e}, using fallback context")

    # 2. Setup Models
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
    
    # CRITICAL: The native Deepgram plugin's _ensure_session() calls
    # http_context.http_session() which fails outside the worker's HTTP context.
    # We must provide our own aiohttp session to make TTS work.
    http_session = aiohttp.ClientSession()
    deepgram_tts = deepgram.TTS(model="aura-helios-en", http_session=http_session)

    # 3. Define the Agent WITH CONTEXT ALREADY LOADED
    logic_agent = voice.Agent(
        instructions=build_interview_instructions(
            interview_state["problem_title"],
            interview_state["problem_desc"],
            interview_state["latest_code"],
            interview_state["examples"]
        ),
        chat_ctx=ChatContext()
    )

    # 4. Setup Session
    session = AgentSession(
        vad=vad,
        stt=deepgram_stt,
        llm=groq_llm,
        tts=deepgram_tts,
    )

    # 5. Handle Data Interactions (code updates only — context already loaded from API)
    @ctx.room.on("data_received")
    def on_data_received(data_packet):
        try:
            payload = json.loads(data_packet.data.decode('utf-8'))
            msg_type = payload.get("type")
            
            if msg_type == "code":
                interview_state["latest_code"] = payload.get("content", "// No code")
                # Update agent instructions with latest code
                asyncio.create_task(logic_agent.update_instructions(
                    build_interview_instructions(
                        interview_state["problem_title"],
                        interview_state["problem_desc"],
                        interview_state["latest_code"],
                        interview_state["examples"]
                    )
                ))
            elif msg_type == "problem":
                # Handle question advancement (Q2) if frontend sends new context
                title = payload.get('title', '')
                if title and title != interview_state["problem_title"]:
                    logger.info(f"[CONTEXT] Question advanced to: {title}")
                    interview_state["problem_title"] = title
                    interview_state["problem_desc"] = payload.get("description", "")
                    interview_state["examples"] = payload.get("examples", [])
                    asyncio.create_task(logic_agent.update_instructions(
                        build_interview_instructions(
                            interview_state["problem_title"],
                            interview_state["problem_desc"],
                            interview_state["latest_code"],
                            interview_state["examples"]
                        )
                    ))
            
        except Exception as e:
            logger.error(f"[DATA] Error processing packet: {e}")

    # 6. Connect and Start
    try:
        logger.info("[STEP 6] Calling session.start...")
        await session.start(agent=logic_agent, room=ctx.room)
        logger.info("[STEP 6] Session started successfully")

        # Use generate_reply instead of session.say() — it goes through the
        # normal agent pipeline with built-in connection retry handling.
        # session.say() blocks and loses audio during WebRTC instability.
        if interview_state["problem_title"] != "the coding task":
            greeting_instruction = f"Greet the candidate briefly. Mention you see the problem '{interview_state['problem_title']}' and ask them to walk you through their approach. Keep it under 20 words."
        else:
            greeting_instruction = "Greet the candidate and ask which problem they're working on. Keep it under 15 words."
        
        logger.info(f"[STEP 7] Triggering greeting via generate_reply")
        session.generate_reply(instructions=greeting_instruction)
        
        # Run until participant disconnects
        while ctx.room.isconnected():
            await asyncio.sleep(1)

    except Exception as e:
        logger.error(f"[ENTRYPOINT] Crash: {e}")
    finally:
        # 8. Generate Post-Interview Report
        try:
            chat_items = session.chat_ctx.items if session else []
            if chat_items and len(chat_items) > 1:
                logger.info(f"[ENTRYPOINT] Session ended. {len(chat_items)} messages. Triggering analysis...")
                await generate_assessment_report(
                    groq_llm, 
                    session_id,
                    interview_state["problem_title"],
                    interview_state["problem_desc"],
                    interview_state["latest_code"],
                    chat_items
                )
            else:
                logger.warning("[ENTRYPOINT] No chat messages found, skipping report generation.")
        except Exception as report_err:
            logger.error(f"[ENTRYPOINT] Report generation failed (non-fatal): {report_err}")
        
        # Close the aiohttp session we created for TTS
        try:
            await http_session.close()
        except Exception:
            pass
            
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
