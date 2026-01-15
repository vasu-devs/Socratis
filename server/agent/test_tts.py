import os
import asyncio
from dotenv import load_dotenv
from livekit.plugins import deepgram
from pathlib import Path

# Load env
env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def main():
    try:
        print(f"Testing Deepgram TTS with Key: {os.environ.get('DEEPGRAM_API_KEY')[:5]}...")
        tts = deepgram.TTS()
        print("Synthesizing text...")
        async for audio in tts.synthesize("Hello, this is a test of the Deepgram voice system."):
            print(f"Received audio chunk: {len(audio.data.tobytes())} bytes")
            break # Just need one chunk to confirm it works
        print("TTS Success!")
    except Exception as e:
        print(f"TTS FAILED: {e}")

if __name__ == "__main__":
    asyncio.run(main())
