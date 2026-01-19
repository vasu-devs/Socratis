import logging
import os
import asyncio
from pathlib import Path
from typing import Optional, Dict, Any

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
from livekit.agents.llm import ChatMessage, ChatRole
import livekit.agents.voice as voice
from livekit.plugins import deepgram, openai, silero

# Load env from script directory (cross-platform compatible)
env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# CRITICAL: Apply Deepgram TTS monkey-patch BEFORE using the plugin
from deepgram_patch import patch_deepgram_tts
patch_deepgram_tts()

logger = logging.getLogger("socratis-agent")
logger.setLevel(logging.INFO)

# ============================================================================
# GLOBAL INTERVIEW STATE - Shared across the session for real-time code sync
# ============================================================================
interview_state: Dict[str, Any] = {
    "current_code": "",
    "current_problem": {
        "title": "Coding Problem",
        "description": "",
        "examples": []
    },
    "last_code_update_time": 0,
    "last_feedback_time": 0,
    "update_count": 0,
    "feedback_cooldown": 30,
}

def prewarm(proc: JobProcess):
    logger.info("[PREWARM] Loading VAD model...")
    proc.userdata["vad"] = silero.VAD.load()
    logger.info("[PREWARM] VAD loaded successfully")


def build_dynamic_instructions(problem_title: str, problem_description: str = "") -> str:
    """Build interview instructions dynamically based on current problem."""
    
    # Handle missing problem context - agent should ask what problem candidate is working on
    if not problem_description or problem_description.strip() == "":
        problem_context = f"""=== PROBLEM CONTEXT ===
Title: {problem_title}
NOTE: No detailed problem description has been loaded yet.
Your FIRST task is to ask the candidate: "What coding problem are you working on today? Please describe it briefly so I can help you."
Once they describe it, proceed with the interview based on their description."""
    else:
        problem_context = f"""=== CURRENT PROBLEM ===
Title: {problem_title}
Description: {problem_description}"""
    
    return f"""You are Socratis, a Senior Technical Interviewer at a top-tier tech company. 
You are conducting a live coding interview with a candidate via VOICE.

{problem_context}

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
- Level 2 (Specific): "What if you tracked values you've already seen?"
- Level 3 (Direct): "Try using a hash map to store complements."
*Only advance to the next level if the candidate fails to grasp the previous hint.*

=== CRITICAL: CODE AWARENESS ===
You will receive CODE_SNAPSHOT messages with the candidate's ACTUAL current code.
ALWAYS reference this code when asked about it. NEVER make up or hallucinate code.
If the code is about a palindrome function, talk about palindrome - NOT about the problem title.
If asked to review code, describe ONLY what you see in the most recent CODE_SNAPSHOT.

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
- Completion: "Nice work. Before we wrap up, can you trace through with a sample input?"

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
  → Say: "Excellent work on this problem. Your solution is efficient and well-explained. I'm confident in your abilities - we can wrap up here. Do you have any questions for me?"
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
"""


async def entrypoint(ctx: JobContext):
    global interview_state
    
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
        
        # USING DEEPGRAM STT for real-time streaming (Groq Whisper doesn't support streaming)
        logger.info("[STEP 3] - Initializing Deepgram STT for real-time transcription...")
        deepgram_stt = deepgram.STT()
        logger.info("[STEP 3] - Deepgram STT initialized successfully")
        logger.info("[STEP 3] All plugins initialized - NO ERRORS")
        
    except Exception as e:
        logger.error(f"[STEP 3] CRITICAL FAILURE: Plugin initialization error")
        logger.error(f"[STEP 3] Error: {e}")
        logger.error(f"[STEP 3] Check your API keys in .env file:")
        logger.error(f"[STEP 3] - DEEPGRAM_API_KEY present: {bool(os.environ.get('DEEPGRAM_API_KEY'))}")
        logger.error(f"[STEP 3] - GROQ_API_KEY present: {bool(os.environ.get('GROQ_API_KEY'))}")
        return
    
    # STEP 4: Create voice.Agent with dynamic instructions
    logger.info("[STEP 4] Creating voice.Agent with dynamic instructions...")
    try:
        # Initial instructions - will be updated when we receive problem context
        initial_instructions = build_dynamic_instructions(
            interview_state["current_problem"]["title"],
            interview_state["current_problem"]["description"]
        )
        
        logic_agent = voice.Agent(
            instructions=initial_instructions
        )
        logger.info("[STEP 4] voice.Agent created with dynamic interviewer persona")
        
    except Exception as e:
        logger.error(f"[STEP 4] FAILED: voice.Agent creation error: {e}")
        return

    
    # STEP 5: Create AgentSession orchestrator
    logger.info("[STEP 5] Creating AgentSession orchestrator...")
    try:
        session = AgentSession(
            vad=ctx.proc.userdata["vad"],
            stt=deepgram_stt,
            llm=groq_llm,
            tts=deepgram_tts,
        )
        logger.info("[STEP 5] AgentSession created (VAD + Deepgram STT + Groq LLM + Deepgram TTS)")
        
    except Exception as e:
        logger.error(f"[STEP 5] FAILED: AgentSession creation error: {e}")
        return
    
    # STEP 6: Start the session (CRITICAL - must happen before say())
    logger.info("[STEP 6] Starting AgentSession with room + agent...")
    try:
        logger.info(f"[STEP 6] - Participant state: {len(ctx.room.remote_participants)} remote participants")
        logger.info("[STEP 6] - Calling session.start(agent=logic_agent, room=ctx.room)...")
        await session.start(agent=logic_agent, room=ctx.room)
        logger.info("[STEP 6] Session started - Agent is now LIVE and listening")
        
    except Exception as e:
        logger.error(f"[STEP 6] CRITICAL FAILURE: session.start() failed: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return
    
    # STEP 7: Wait for participant
    logger.info("[STEP 7] Waiting for participant audio track...")
    
    # Wait for remote participant to join (if they haven't already appeared in ctx.room)
    max_wait = 15
    elapsed = 0
    while len(ctx.room.remote_participants) == 0 and elapsed < max_wait:
        await asyncio.sleep(1.0)
        elapsed += 1.0
        logger.info(f"[STEP 7] Still waiting for participant... ({elapsed}s)")
    
    if len(ctx.room.remote_participants) > 0:
        participant_id = list(ctx.room.remote_participants.keys())[0]
        logger.info(f"[STEP 7] Participant '{participant_id}' ready. Waiting 2s for audio pipeline stabilization...")
        await asyncio.sleep(2)
        logger.info("[STEP 7] Audio pipeline ready - proceeding with greeting")
    
    # STEP 8: Send DYNAMIC greeting
    logger.info("=" * 70)
    logger.info("[STEP 8] ATTEMPTING TO SPEAK GREETING")
    
    problem_title = interview_state["current_problem"]["title"]
    greeting_text = f"Hello! I'm Socratis, your interviewer for today. Let's start with the {problem_title}. Before you dive into coding, can you walk me through your initial approach?"
    
    try:
        logger.info(f"[STEP 8] - Greeting: '{greeting_text}'")
        
        # SPEAK - IMPORTANT: allow_interruptions=False for the initial greeting
        await session.say(greeting_text, allow_interruptions=False)
        
        # Publish to transcript
        import json
        transcript_msg = json.dumps({"type": "transcript", "role": "assistant", "text": greeting_text})
        await ctx.room.local_participant.publish_data(transcript_msg.encode('utf-8'))
        
        logger.info("[STEP 8] COMPLETE - GREETING SENT!")
        logger.info("=" * 70)
        
    except Exception as e:
        logger.error(f"[STEP 8] GREETING FAILED: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return
    
    # STEP 9: Set up handlers
    logger.info("[STEP 9] Registering event handlers...")
    
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
        keywords_approach = ['Map', 'HashMap', 'Set', 'for', 'while', 'forEach', 'reduce', 'sort', 'indexOf', 'includes', 'def ', 'function ', 'class ']
        
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
        import json
        global interview_state
        
        try:
            msg = json.loads(data.decode("utf-8"))
            
            # Handle PROBLEM context from client
            if msg.get("type") == "problem":
                problem_title = msg.get("title", "Coding Problem")
                problem_description = msg.get("description", "")
                problem_examples = msg.get("examples", [])
                
                interview_state["current_problem"] = {
                    "title": problem_title,
                    "description": problem_description,
                    "examples": problem_examples
                }
                
                logger.info(f"[PROBLEM UPDATE] Received problem context: {problem_title}")
                logger.info(f"[PROBLEM UPDATE] Description: {problem_description[:100]}...")
                
                # Update agent instructions with new problem context
                new_instructions = build_dynamic_instructions(problem_title, problem_description)
                logic_agent._instructions = new_instructions
                logger.info("[PROBLEM UPDATE] Agent instructions updated with new problem context")
            
            # Handle CODE updates from client
            elif msg.get("type") == "code":
                code_content = msg.get("content", "")
                current_time = time.time()
                
                logger.info(f"[CODE UPDATE] Received from {participant.identity if participant else 'unknown'}")
                logger.info(f"[CODE UPDATE] Code length: {len(code_content)} characters")
                logger.info(f"[CODE UPDATE] Code preview: {code_content[:100]}...")  # Log first 100 chars
                
                # Store previous code for analysis
                previous_code = interview_state["current_code"]
                
                # Update global state with CURRENT code
                interview_state["current_code"] = code_content
                interview_state["last_code_update_time"] = current_time
                interview_state["update_count"] += 1
                
                # Analyze the code change
                analysis = analyze_code_change(previous_code, code_content)
                
                # Determine if we should inject context for proactive feedback
                time_since_last_feedback = current_time - interview_state["last_feedback_time"]
                should_prompt_feedback = (
                    analysis["is_significant"] and 
                    time_since_last_feedback >= interview_state["feedback_cooldown"]
                )
                
                # ============================================================
                # CRITICAL FIX: Chat Context Injection using ChatMessage
                # This ensures the LLM explicitly "sees" the code update
                # ============================================================
                
                # Build context message with ACTUAL code
                if should_prompt_feedback:
                    context_content = f"""SYSTEM UPDATE: The candidate has modified their code (Snapshot #{interview_state['update_count']}).

=== NEW CODE SNAPSHOT ===
{code_content}
=== END CODE SNAPSHOT ===

ANALYSIS: {analysis['change_type'].upper()} - {analysis['details']}
INSTRUCTION: This is a significant change. Review this code specifically. Consider providing brief feedback if the candidate asks or if you spot a bug."""
                    interview_state["last_feedback_time"] = current_time
                    logger.info(f"[CODE UPDATE] Significant change detected: {analysis['change_type']}")
                else:
                    context_content = f"""SYSTEM UPDATE: The candidate has modified their code (Snapshot #{interview_state['update_count']}).

=== NEW CODE SNAPSHOT ===
{code_content}
=== END CODE SNAPSHOT ===

INSTRUCTION: Code update received. This is what the candidate is working on RIGHT NOW. Reference this EXACT code if asked about it. NEVER hallucinate or make up code."""
                
                # Create a proper ChatMessage for injection
                code_snapshot_message = ChatMessage(
                    role=ChatRole.SYSTEM,
                    content=context_content
                )
                
                # Inject context via session's chat context using asyncio
                async def inject_context():
                    try:
                        # Method 1: Try session.chat_ctx.messages (preferred)
                        if hasattr(session, 'chat_ctx') and session.chat_ctx is not None:
                            if hasattr(session.chat_ctx, 'messages'):
                                session.chat_ctx.messages.append(code_snapshot_message)
                                logger.info("[CODE UPDATE] ✅ Context injected via session.chat_ctx.messages")
                            elif hasattr(session.chat_ctx, 'append'):
                                session.chat_ctx.append(code_snapshot_message)
                                logger.info("[CODE UPDATE] ✅ Context injected via session.chat_ctx.append")
                            else:
                                logger.warning("[CODE UPDATE] chat_ctx exists but no append method")
                        # Method 2: Try agent's internal context
                        elif hasattr(logic_agent, 'chat_ctx') and logic_agent.chat_ctx is not None:
                            if hasattr(logic_agent.chat_ctx, 'messages'):
                                logic_agent.chat_ctx.messages.append(code_snapshot_message)
                                logger.info("[CODE UPDATE] ✅ Context injected via agent.chat_ctx.messages")
                            else:
                                logger.warning("[CODE UPDATE] agent.chat_ctx exists but no messages")
                        # Method 3: Fallback - store in state (agent reads from state)
                        else:
                            logger.warning("[CODE UPDATE] No direct context injection available, code stored in interview_state")
                    except Exception as e:
                        logger.error(f"[CODE UPDATE] Context injection error: {e}")
                        import traceback
                        logger.error(traceback.format_exc())
                
                asyncio.create_task(inject_context())
                
        except json.JSONDecodeError as e:
            logger.error(f"[DATA] Failed to parse data channel message: {e}")
        except Exception as e:
            logger.error(f"[DATA] Handler error: {e}")
            import traceback
            logger.error(traceback.format_exc())
    
    # =========================================================================
    # CRITICAL: Register user speech handler to include code context in LLM calls
    # =========================================================================
    @session.on("user_input_received")
    def on_user_speech_handler(user_input):
        """Intercept user speech and inject code context."""
        async def on_user_speech():
            global interview_state
            
            user_text = user_input.text if hasattr(user_input, 'text') else str(user_input)
            logger.info(f"[USER SPEECH] Received: {user_text}")
            
            # Check if user is asking about their code
            code_keywords = ["check", "review", "look", "code", "correct", "wrong", "bug", "error", "fix", "help"]
            is_code_question = any(kw in user_text.lower() for kw in code_keywords)
            
            if is_code_question and interview_state["current_code"]:
                # Inject current code context using ChatMessage
                code_context_content = f"""URGENT CODE CONTEXT: The candidate just asked about their code.

=== CURRENT CODE IN EDITOR ===
{interview_state['current_code']}
=== END CURRENT CODE ===

CRITICAL: Respond based on THIS code ONLY. Do NOT hallucinate or assume code that isn't shown above."""
                
                code_context_message = ChatMessage(
                    role=ChatRole.SYSTEM,
                    content=code_context_content
                )
                
                logger.info("[USER SPEECH] Code question detected, injecting code context")
                
                # Try to inject into session context before response is generated
                try:
                    if hasattr(session, 'chat_ctx') and session.chat_ctx is not None:
                        if hasattr(session.chat_ctx, 'messages'):
                            session.chat_ctx.messages.append(code_context_message)
                            logger.info("[USER SPEECH] ✅ Code context injected via messages.append")
                        elif hasattr(session.chat_ctx, 'append'):
                            session.chat_ctx.append(code_context_message)
                            logger.info("[USER SPEECH] ✅ Code context injected via append")
                except Exception as e:
                    logger.error(f"[USER SPEECH] Failed to inject code context: {e}")
        
        asyncio.create_task(on_user_speech())
    
    logger.info("[STEP 9] Event handlers registered with intelligent code analysis")
    
    # SUCCESS
    logger.info("")
    logger.info("=" * 70)
    logger.info("[SUCCESS] AGENT FULLY OPERATIONAL WITH REAL-TIME CODE AWARENESS")
    logger.info("=" * 70)
    logger.info("[STATUS] Listening for user speech...")
    logger.info("[STATUS] Ready to conduct interview with real-time code feedback")
    logger.info("[STATUS] Agent will respond when user speaks or when significant code changes occur")
    logger.info("[STATUS] Current code in state will be used for all responses")
    logger.info("=" * 70)


if __name__ == "__main__":
    cli.run_app(
        WorkerOptions(
            entrypoint_fnc=entrypoint,
            prewarm_fnc=prewarm,
        ),
    )
