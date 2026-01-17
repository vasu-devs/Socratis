#!/usr/bin/env python3
import asyncio
import os
import sys
import traceback
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def test():
    from custom_deepgram_tts import CustomDeepgramTTS
    
    print("Initializing TTS...")
    tts = CustomDeepgramTTS(model="aura-helios-en")
    print("OK")
    
    print("Synthesizing...")
    try:
        stream = tts.synthesize("Hello world")
        print("Stream created")
        
        frame_count = 0
        async for frame in stream:
            frame_count += 1
            print(f"Frame {frame_count}: {len(frame.frame.data)} samples")
        
        print(f"SUCCESS! Got {frame_count} frames")
        await tts.aclose()
        return True
        
    except Exception as e:
        print(f"ERROR: {e}")
        traceback.print_exc()
        try:
            await tts.aclose()
        except:
            pass
        return False

if __name__ == "__main__":
    try:
        result = asyncio.run(test())
        sys.exit(0 if result else 1)
    except KeyboardInterrupt:
        print("\nInterrupted")
        sys.exit(1)
