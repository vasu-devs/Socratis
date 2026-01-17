#!/usr/bin/env python3
"""Test the monkey-patched Deepgram TTS"""
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

# Apply patch BEFORE importing deepgram
from deepgram_patch import patch_deepgram_tts
patch_deepgram_tts()

from livekit.plugins import deepgram

async def test():
    print("Testing PATCHED Deepgram TTS...")
    
    tts = deepgram.TTS(model="aura-helios-en")
    print("✓ TTS initialized")
    
    stream = tts.synthesize("Hello! I am Socratis, your interviewer for today.")
    print("✓ Stream created")
    
    count = 0
    async for audio in stream:
        count += 1
        print(f"✓ Frame {count}: {len(audio.frame.data)} bytes")
        break  # Just test one frame
    
    if count > 0:
        print(f"\n🎉 SUCCESS! Patched TTS works!")
        return True
    else:
        print(f"\n❌ No audio received")
        return False

if __name__ == "__main__":
    result = asyncio.run(test())
    exit(0 if result else 1)
