#!/usr/bin/env python3
"""
Test OpenAI TTS as alternative to broken Deepgram plugin
"""
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from livekit.plugins import openai

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def test_openai_tts():
    print("="*70)
    print("Testing OpenAI TTS")
    print("="*70)
    
    # Check for API key
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        print("WARNING: No OPENAI_API_KEY found")
        print("OpenAI TTS requires a proper OpenAI API key")
        print("Groq API key won't work for TTS")
        return False
    
    print(f"API Key: {api_key[:10]}...{api_key[-5:]}")
    
    try:
        print("\n1. Initializing OpenAI TTS...")
        tts = openai.TTS(model="tts-1", voice="alloy")
        print("   OK - TTS initialized")
        
        print("\n2. Synthesizing test phrase...")
        text = "Hello! I am Socratis, your interviewer for today."
        stream = tts.synthesize(text)
        
        print("\n3. Receiving audio...")
        frame_count = 0
        async for frame in stream:
            frame_count += 1
            print(f"   Frame {frame_count}: {len(frame.frame.data)} bytes")
            if frame_count >= 3:
                break
        
        print(f"\n SUCCESS! OpenAI TTS works perfectly!")
        return True
        
    except Exception as e:
        print(f"\nFAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_openai_tts())
    exit(0 if result else 1)
