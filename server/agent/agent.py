import logging
from dotenv import load_dotenv

from livekit import agents, rtc
from livekit.agents import AgentServer, AgentSession, Agent, room_io
from livekit.plugins import deepgram, groq, silero
from livekit.plugins.turn_detector.multilingual import MultilingualModel

load_dotenv()
logger = logging.getLogger("voice-agent")
logging.basicConfig(level=logging.INFO)

class SocratisAssistant(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions="""You are Socratis, a world-class Technical Interviewer.
            Your goal is to guide the candidate through a coding problem.
            - Speak concisely.
            - Do not provide code solutions.
            - Be encouraging but firm.
            - Start by introducing yourself locally.""",
        )

server = AgentServer()

@server.rtc_session()
async def entrypoint(ctx: agents.JobContext):
    logger.info(f"connecting to room {ctx.room.name}")
    # Quickstart doesn't explicitly `await ctx.connect()` usually, but for reliability on some servers we keep it or rely on valid defaults.
    # The SDK 1.3 `JobContext` usually connects automatically or upon `ctx.connect()`.
    await ctx.connect(auto_subscribe=agents.AutoSubscribe.AUDIO_ONLY) 
    
    # Wait for participant - highly recommended for successful audio mapping
    participant = await ctx.wait_for_participant()
    logger.info(f"participant joined: {participant.identity}")

    session = AgentSession(
        stt=deepgram.STT(),
        llm=groq.LLM(model="llama-3.3-70b-versatile"),
        tts=deepgram.TTS(),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    session.on("user_speech_committed", lambda msg: logger.info(f"User speech: {msg.content}"))
    session.on("agent_speech_committed", lambda msg: logger.info(f"Agent speech: {msg.content}"))

    logger.info("starting session")
    await session.start(room=ctx.room, agent=SocratisAssistant(), participant=participant)
    
    logger.info("generating warm greeting")
    await session.generate_reply(instructions="Say: 'Hey, I am Socratis. I am here to interview you. Can you hear me?'")

if __name__ == "__main__":
    agents.cli.run_app(server)

