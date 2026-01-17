#!/usr/bin/env python3
"""
Test different Deepgram TTS configurations to find what works
"""
import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from livekit.plugins import deepgram

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def test_config(model, **kwargs):
    """Test a specific TTS configuration"""
    print(f"\n{'='*60}")
    print(f"Testing: model={model}, kwargs={kwargs}")
    print('='*60)
    
    try:
        tts = deepgram.TTS(model=model, **kwargs)
        print("✓ TTS initialized")
        
        stream = tts.synthesize("Hello, testing Deepgram.")
        print("✓ Stream created")
        
        count = 0
        async for chunk in stream:
            count += 1
            print(f"✓ Chunk {count}: {len(chunk.frame.data)} bytes")
            if count >= 2:
                break
        
        if count > 0:
            print(f"✅ SUCCESS with model={model}")
            return True
        else:
            print(f"❌ No audio received")
            return False
            
    except Exception as e:
        print(f"❌ FAILED: {e}")
        return False

async def main():
    print("Testing multiple Deepgram configurations...")
    
    configs = [
        {"model": "aura-asteria-en"},
        {"model": "aura-helios-en"},
        {"model": "aura-luna-en"},
        {"model": "aura-stella-en"},
        {"model": "aura-athena-en"},
        {"model": "aura-hera-en"},
        {"model": "aura-orion-en"},
        {"model": "aura-arcas-en"},
        {"model": "aura-perseus-en"},
        {"model": "aura-angus-en"},
    ]
    
    for config in configs:
        result = await test_config(**config)
        if result:
            print(f"\n🎉 FOUND WORKING CONFIG: {config}")
            return config
        await asyncio.sleep(0.5)
    
    print("\n❌ No working configuration found")
    return None

if __name__ == "__main__":
    working_config = asyncio.run(main())
    if working_config:
        print(f"\n✅ Use this in agent.py: deepgram.TTS({working_config})")
        exit(0)
    else:
        exit(1)
