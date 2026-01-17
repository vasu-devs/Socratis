#!/usr/bin/env python3
"""
Quick test to verify Deepgram TTS is working independently of LiveKit
"""
import asyncio
from livekit.plugins import deepgram
import os
from dotenv import load_dotenv

load_dotenv()

async def test_tts():
    print("🎤 Testing Deepgram TTS...")
    
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("❌ No DEEPGRAM_API_KEY in .env")
        return
    
    print(f"✅ API Key found: {api_key[:10]}...")
    
    try:
        tts = deepgram.TTS(model="aura-helios-en")
        print("✅ Deepgram TTS initialized")
        
        # Try to synthesize
        print("🔊 Synthesizing text...")
        stream = tts.synthesize("Hello! I'm Socratis, your interviewer for today.")
        
        audio_received = False
        async for audio in stream:
            print(f"✅ Received audio chunk: {len(audio.data.tobytes())} bytes")
            audio_received = True
            break  # Just check first chunk
        
        if audio_received:
            print("✅ DEEPGRAM TTS WORKING!")
        else:
            print("❌ No audio received from Deepgram")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_tts())
