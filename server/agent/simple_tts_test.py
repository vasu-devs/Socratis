#!/usr/bin/env python3
import asyncio
import os
from dotenv import load_dotenv
from livekit.plugins import deepgram
from pathlib import Path

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def test():
    print("Testing Deepgram TTS...")
    
    try:
        tts = deepgram.TTS(model="aura-helios-en")
        print("TTS initialized")
        
        print("Synthesizing...")
        stream = tts.synthesize("Hello world")
        
        count = 0
        async for chunk in stream:
            count += 1
            print(f"Chunk {count}: {len(chunk.data.tobytes())} bytes")
            if count >= 3:
                break
        
        if count > 0:
            print("SUCCESS!")
        else:
            print("NO AUDIO RECEIVED")
            
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test())
