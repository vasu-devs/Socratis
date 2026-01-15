import os
import asyncio
# Mock keys to pass plugin init
os.environ["DEEPGRAM_API_KEY"] = "fake_key"
os.environ["GROQ_API_KEY"] = "fake_key"
os.environ["LIVEKIT_API_KEY"] = "fake_key"
os.environ["LIVEKIT_API_SECRET"] = "fake_key"
os.environ["LIVEKIT_URL"] = "fake_url"

from livekit.agents.voice import Agent
from livekit.plugins import deepgram, openai, silero
from livekit.agents import llm

async def main():
    try:
        print("Initializing plugins...")
        # Mocking or loading real plugins (assuming imports work)
        vad = silero.VAD.load()
        stt = deepgram.STT()
        tts = deepgram.TTS()
        # llm = openai.LLM() 

        print("Creating Agent...")
        agent = Agent(
            vad=vad,
            stt=stt,
            llm=None, # pass None to see if it complains about type
            tts=tts,
        )
        print("Agent created successfully!")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
