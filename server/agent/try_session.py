import os
import asyncio
# Mock keys
os.environ["DEEPGRAM_API_KEY"] = "fake_key"
os.environ["GROQ_API_KEY"] = "fake_key"
os.environ["LIVEKIT_API_KEY"] = "fake_key"
os.environ["LIVEKIT_API_SECRET"] = "fake_key"
os.environ["LIVEKIT_URL"] = "fake_url"

from livekit.agents import AgentSession
from livekit.plugins import deepgram, openai, silero

async def main():
    try:
        print("Initializing plugins...")
        vad = silero.VAD.load()
        stt = deepgram.STT()
        tts = deepgram.TTS()

        print("Creating AgentSession...")
        session = AgentSession(
            vad=vad, # Note: Inspect said 'turn_detection', maybe 'vad' is aliased or incorrect?
            stt=stt,
            llm=None,
            tts=tts,
        )
        print("AgentSession created successfully!")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
