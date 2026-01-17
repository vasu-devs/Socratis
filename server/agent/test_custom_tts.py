#!/usr/bin/env python3
"""
Test the custom Deepgram TTS implementation
"""
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from custom_deepgram_tts import CustomDeepgramTTS

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def test_custom_tts():
    print("="*70)
    print("Testing Custom Deepgram TTS Implementation")
    print("="*70)
    
    try:
        print("\n1. Initializing Custom TTS...")
        tts = CustomDeepgramTTS(
            model="aura-helios-en",
            sample_rate=24000,
            encoding="linear16"
        )
        print("   SUCCESS: TTS initialized")
        
        print("\n2. Synthesizing test phrase...")
        test_text = "Hello! I am Socratis, your interviewer for today."
        stream = tts.synthesize(test_text)
        
        print("\n3. Receiving audio frames...")
        frame_count = 0
        total_samples = 0
        
        async for audio in stream:
            frame_count += 1
            samples = len(audio.frame.data)
            total_samples += samples
            duration = samples / audio.frame.sample_rate
            print(f"   Frame {frame_count}: {samples} samples ({duration:.2f}s)")
        
        print(f"\n4. Synthesis complete!")
        print(f"   Total frames: {frame_count}")
        print(f"   Total samples: {total_samples}")
        print(f"   Total duration: {total_samples / 24000:.2f}s")
        
        print("\n" + "="*70)
        print("SUCCESS: Custom TTS is working perfectly!")
        print("="*70)
        
        await tts.aclose()
        return True
        
    except Exception as e:
        print(f"\nFAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    result = asyncio.run(test_custom_tts())
    exit(0 if result else 1)
