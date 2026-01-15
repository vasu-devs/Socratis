"""
Standalone test to verify Deepgram TTS is working
"""
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from livekit.plugins import deepgram

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def test_tts():
    print(f"Testing Deepgram TTS...")
    print(f"API Key present: {bool(os.environ.get('DEEPGRAM_API_KEY'))}")
    
    try:
        tts = deepgram.TTS(
            api_key=os.environ.get("DEEPGRAM_API_KEY"),
            model="aura-helios-en"
        )
        print("✓ TTS instance created")
        
        # Try to synthesize
        stream = tts.stream()
        await stream.awrite("Hello! This is a test.")
        await stream.aclose()
        
        print("✓ TTS synthesis completed without error")
        print("SUCCESS: Deepgram TTS is functional")
        
    except Exception as e:
        print(f"✗ TTS FAILED: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_tts())
