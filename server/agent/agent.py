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

# CRITICAL: Apply Deepgram TTS monkey-patch BEFORE using the plugin
from deepgram_patch import patch_deepgram_tts
patch_deepgram_tts()

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
    
    # STEP 4: Create voice.Agent with professional interviewer instructions
    logger.info("[STEP 4] Creating voice.Agent with instructions...")
    try:
        instructions_text = """You are Socratis, a Senior Technical Interviewer at a top-tier tech company. 
You are conducting a live coding interview with a candidate via VOICE.

Your Goal: Assess the candidate's problem-solving skills, code quality, and communication.
Your Constraints: You are speaking via Text-to-Speech. You must be CONCISE.

CORE BEHAVIORS:
1. BREVITY IS KING: Keep responses short (1-2 sentences). Do not lecture.
2. NO CODE DICTATION: Do not read code syntax out loud (e.g., do not say "curly brace", "semicolon"). Instead, refer to "your loop" or "line 5".
3. SOCRATIC METHOD: Never give the answer. Ask guiding questions.
   - Bad: "You should use a HashMap here."
   - Good: "How would you optimize the lookup time?"
4. LISTEN FIRST: If the user is thinking or typing, offer brief encouragement or stay silent. Do not interrupt their thought process unnecessarily.

INTERVIEW STAGES:
1. CLARIFICATION: Ensure the user understands the problem. If they jump to coding immediately, stop them and ask for their plan.
2. APPROACH: Discuss the algorithm *before* they code. Ask about Time/Space complexity.
3. CODING: Watch them code (you have access to their code snapshots). 
   - If they make a syntax error, let them find it unless they are stuck.
   - If they make a logic error, ask: "Walk me through your logic for that specific loop."
4. REVIEW: Once done, ask them to dry-run a test case. Ask about edge cases (empty inputs, negative numbers).

HINTING STRATEGY (Use only if candidate is stuck):
- Level 1 (Vague): "Is there a data structure that offers faster lookups?"
- Level 2 (Specific): "Since the array is sorted, could we use a binary search approach?"
- Level 3 (Direct): "Try using a Two-Pointer approach starting from both ends."
*Only advance to the next level if the candidate fails to grasp the previous hint.*

CODE REVIEW PROTOCOL:
You will receive CODE_SNAPSHOT system messages with the candidate's current code.
Do NOT comment on every change. Be selective and intelligent about when to speak.

SPEAK UP ONLY WHEN:
a) You spot a likely BUG (off-by-one error, wrong variable, infinite loop risk, missing return statement).
b) The candidate's APPROACH fundamentally changed (e.g., switched from brute force to optimized).
c) The candidate has been SILENT for 60+ seconds and appears stuck - offer ONE gentle hint.
d) The candidate ASKS for feedback or says "I think I'm done" or "Can you check this?".
e) The code is COMPLETE and correct - acknowledge briefly: "That looks good. Can you walk me through your time complexity?"

STAY SILENT WHEN:
- The candidate is actively typing (let them code).
- They just made a minor change (variable rename, formatting).
- Less than 30 seconds since your last unsolicited comment.
- The code is work-in-progress and they haven't asked for help.

FEEDBACK EXAMPLES:
- Bug detected: "I noticed something in your loop condition. What happens when the index equals the array length?"
- Approach shift: "Interesting, you're now using a hash map. What prompted that change?"
- Stuck pattern: "You've been on this section for a bit. Would you like a hint, or do you want to keep exploring?"
- Completion: "Nice work. Before we wrap up, can you trace through with the example [2,7,11,15] target=9?"

TONE: Professional, encouraging, but rigorous. You are a peer, not a teacher.

=== PERFORMANCE ASSESSMENT & QUESTION PROGRESSION ===
You are authorized to decide whether the candidate needs a second question or if the interview can end.

ASSESSMENT CRITERIA (track mentally throughout the interview):
- Problem Understanding: Did they ask clarifying questions or jump in blindly?
- Algorithm Thinking: Did they discuss approach before coding? Time/Space complexity?
- Code Quality: Clean code, proper variable names, no obvious bugs?
- Communication: Did they explain their thinking? Did they respond well to hints?
- Speed: Did they solve it in reasonable time without excessive hints?

DECISION LOGIC:
IF the candidate demonstrates STRONG performance (all criteria met):
  → Say: "Excellent work on the Two Sum problem. Your solution is efficient and well-explained. I'm confident in your abilities - we can wrap up here. Do you have any questions for me?"
  → DO NOT move to a second question.

IF the candidate shows MIXED performance (solved but struggled or needed hints):
  → Say: "Good job solving that! I'd like to see you tackle one more problem to get a fuller picture. Let's move to the next question."
  → The system will advance to the next question.

IF the candidate shows WEAK performance (couldn't solve, gave up, or significant issues):
  → Be encouraging but honest. Say: "I appreciate your effort on this problem. Let's see how you approach a different challenge - it might play to your strengths."
  → Advance to the second question to give them another chance.

TRIGGER PHRASES (when candidate says they're done):
- "I'm done" / "I think this works" / "Can you check this?" / "Finished" / "That's my solution"
→ Review their code, ask follow-up questions about complexity/edge cases, then make your assessment.

CURRENT CONTEXT:
The candidate is solving a coding problem. You have visibility into their code editor via system messages. 
Make your progression decision based on overall performance, not just whether the code compiles.
"""
        
        logic_agent = voice.Agent(
            instructions=instructions_text
        )
        logger.info("[STEP 4] voice.Agent created with enhanced code-aware interviewer persona")
        
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
    
    
    # STEP 7: Wait for participant to be FULLY ready to receive audio
    logger.info("[STEP 7] Waiting for participant audio track to be ready...")
    
    # Wait for remote participant to join
    max_wait = 10  # seconds
    elapsed = 0
    while len(ctx.room.remote_participants) == 0 and elapsed < max_wait:
        await asyncio.sleep(0.5)
        elapsed += 0.5
    
    if len(ctx.room.remote_participants) > 0:
        logger.info(f"[STEP 7] Participant detected! Waiting 3s for audio pipeline to fully stabilize...")
        await asyncio.sleep(3)  # Increased from 1.5s - ensures audio receiver is FULLY ready
        logger.info("[STEP 7] Audio pipeline ready - proceeding with greeting")
    else:
        logger.warning("[STEP 7] No participant detected after 10s, proceeding anyway...")
    
    
    # STEP 8: Send greeting and publish to transcript
    logger.info("=" * 70)
    logger.info("[STEP 8] ATTEMPTING TO SPEAK GREETING")
    logger.info("=" * 70)
    
    greeting_text = "Hello! I'm Socratis, your interviewer for today. Let's start by discussing your approach to the Two Sum problem. What's your initial plan?"
    
    try:
        logger.info(f"[STEP 8] - Greeting text: '{greeting_text}'")
        logger.info(f"[STEP 8] - Text length: {len(greeting_text)} characters")
        logger.info(f"[STEP 8] - Calling session.say()...")
        logger.info(f"[STEP 8] - This will trigger Deepgram TTS API call...")
        
        await session.say(greeting_text, allow_interruptions=True)
        
        # Publish greeting to transcript via data channel
        import json
        transcript_msg = json.dumps({"type": "transcript", "role": "assistant", "text": greeting_text})
        ctx.room.local_participant.publish_data(transcript_msg.encode('utf-8'))
        logger.info("[STEP 8] - Published greeting to transcript")
        
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
    
    # STEP 9: Set up transcript publishing and code update handlers
    logger.info("")
    logger.info("[STEP 9] Registering event handlers for transcript and code updates...")
    
    # State tracking for intelligent feedback
    code_state = {
        "previous_code": "",
        "last_feedback_time": 0,
        "last_code_update_time": 0,
        "update_count": 0,
        "feedback_cooldown": 30,  # Minimum seconds between unsolicited feedback
    }
    
    # Handler to publish user speech transcriptions to transcript
    def publish_user_transcript(text: str):
        try:
            import json
            transcript_msg = json.dumps({"type": "transcript", "role": "user", "text": text})
            ctx.room.local_participant.publish_data(transcript_msg.encode('utf-8'))
            logger.info(f"[TRANSCRIPT] Published user message: '{text[:50]}...'")
        except Exception as e:
            logger.error(f"[TRANSCRIPT] Failed to publish user transcript: {e}")
    
    # Handler to publish agent responses to transcript
    def publish_agent_transcript(text: str):
        try:
            import json
            transcript_msg = json.dumps({"type": "transcript", "role": "assistant", "text": text})
            ctx.room.local_participant.publish_data(transcript_msg.encode('utf-8'))
            logger.info(f"[TRANSCRIPT] Published agent response: '{text[:50]}...'")
        except Exception as e:
            logger.error(f"[TRANSCRIPT] Failed to publish agent transcript: {e}")
    
    def analyze_code_change(old_code: str, new_code: str) -> dict:
        """Analyze the difference between code snapshots to detect significant changes."""
        analysis = {
            "is_significant": False,
            "change_type": "minor",
            "details": ""
        }
        
        if not old_code:
            return analysis
            
        old_lines = set(old_code.strip().split('\n'))
        new_lines = set(new_code.strip().split('\n'))
        
        added_lines = new_lines - old_lines
        removed_lines = old_lines - new_lines
        
        # Check for significant structural changes
        keywords_approach = ['Map', 'HashMap', 'Set', 'for', 'while', 'forEach', 'reduce', 'sort', 'indexOf', 'includes']
        
        for line in added_lines:
            for keyword in keywords_approach:
                if keyword.lower() in line.lower():
                    analysis["is_significant"] = True
                    analysis["change_type"] = "approach_shift"
                    analysis["details"] = f"Added {keyword}-based approach"
                    break
        
        # Check for potential bugs
        bug_patterns = [
            ("<=", "length", "potential off-by-one error"),
            ("== undefined", "", "loose equality check"),
            ("= =", "", "possible typo in comparison"),
            ("i++", "i++", "infinite loop risk if missing increment logic"),
        ]
        
        for pattern, ctx_pattern, bug_desc in bug_patterns:
            for line in added_lines:
                if pattern in line:
                    analysis["is_significant"] = True
                    analysis["change_type"] = "potential_bug"
                    analysis["details"] = bug_desc
                    break
        
        # Size change check (major addition)
        if len(new_code) - len(old_code) > 100:
            analysis["is_significant"] = True
            analysis["change_type"] = "major_addition"
            analysis["details"] = f"Added {len(new_code) - len(old_code)} characters"
        
        return analysis
    
    @ctx.room.on("data_received")
    def on_data_received(data: bytes, participant=None, kind=None):
        import time
        try:
            import json
            msg = json.loads(data.decode("utf-8"))
            
            if msg.get("type") == "code":
                code_content = msg.get("content", "")
                current_time = time.time()
                
                logger.info(f"[CODE UPDATE] Received from {participant.identity if participant else 'unknown'}")
                logger.info(f"[CODE UPDATE] Code length: {len(code_content)} characters")
                
                # Analyze the code change
                analysis = analyze_code_change(code_state["previous_code"], code_content)
                
                # Update state
                code_state["previous_code"] = code_content
                code_state["last_code_update_time"] = current_time
                code_state["update_count"] += 1
                
                # Determine if we should inject context for proactive feedback
                time_since_last_feedback = current_time - code_state["last_feedback_time"]
                should_prompt_feedback = (
                    analysis["is_significant"] and 
                    time_since_last_feedback >= code_state["feedback_cooldown"]
                )
                
                # Build context message for the agent
                if should_prompt_feedback:
                    context_msg = f"""CODE_SNAPSHOT (Update #{code_state['update_count']}):
```javascript
{code_content}
```

ANALYSIS: {analysis['change_type'].upper()} - {analysis['details']}
INSTRUCTION: Since this is a significant change, consider providing brief feedback if appropriate.
Remember: Be concise. Ask a guiding question rather than giving the answer."""
                    code_state["last_feedback_time"] = current_time
                    logger.info(f"[CODE UPDATE] Significant change detected: {analysis['change_type']}")
                else:
                    context_msg = f"""CODE_SNAPSHOT (Update #{code_state['update_count']}):
```javascript
{code_content}
```
INSTRUCTION: Code update received. Stay silent unless the candidate asks for feedback or you spot a critical bug."""
                
                # Inject into agent's context
                if hasattr(logic_agent, "chat_ctx"):
                    logic_agent.chat_ctx.append(
                        role="system",
                        text=context_msg
                    )
                    logger.info("[CODE UPDATE] Context injected to agent")
                
        except json.JSONDecodeError as e:
            logger.error(f"[CODE UPDATE] Failed to parse data channel message: {e}")
        except Exception as e:
            logger.error(f"[CODE UPDATE] Handler error: {e}")
    
    logger.info("[STEP 9] Event handlers registered with intelligent code analysis")
    
    # SUCCESS
    logger.info("")
    logger.info("=" * 70)
    logger.info("[SUCCESS] AGENT FULLY OPERATIONAL WITH CODE AWARENESS")
    logger.info("=" * 70)
    logger.info("[STATUS] Listening for user speech...")
    logger.info("[STATUS] Ready to conduct interview with real-time code feedback")
    logger.info("[STATUS] Agent will respond when user speaks or when significant code changes occur")
    logger.info("=" * 70)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
