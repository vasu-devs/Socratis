#!/usr/bin/env python3
"""
Isolated test for LiveKit Agent audio synthesis
Tests the complete TTS flow without needing a live room
"""
import asyncio
import os
from dotenv import load_dotenv
from livekit.plugins import deepgram
from pathlib import Path

# Load environment
env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def test_deepgram_tts_detailed():
    """Test Deepgram TTS with detailed logging"""
    print("="*70)
    print("🎤 TESTING DEEPGRAM TTS (Detailed)")
    print("="*70)
    
    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        print("❌ No DEEPGRAM_API_KEY found in environment")
        return False
    
    print(f"✅ API Key loaded: {api_key[:10]}...{api_key[-5:]}")
    print()
    
    # Test 1: Initialize TTS
    print("📝 STEP 1: Initializing Deepgram TTS...")
    try:
        tts = deepgram.TTS(
            api_key=api_key,
            model="aura-helios-en"
        )
        print("   ✅ TTS initialized successfully")
    except Exception as e:
        print(f"   ❌ Failed to initialize TTS: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 2: Synthesize audio
    print("\n📝 STEP 2: Synthesizing test audio...")
    test_text = "Hello! I'm Socratis, your interviewer for today."
    print(f"   Text: '{test_text}'")
    print(f"   Length: {len(test_text)} characters")
    
    try:
        print("   Calling TTS synthesize()...")
        stream = tts.synthesize(test_text)
        print("   ✅ Synthesize call succeeded, stream created")
    except Exception as e:
        print(f"   ❌ Failed to create synthesis stream: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 3: Receive audio chunks
    print("\n📝 STEP 3: Receiving audio chunks...")
    total_bytes = 0
    chunk_count = 0
    
    try:
        async for audio_chunk in stream:
            chunk_count += 1
            chunk_bytes = len(audio_chunk.data.tobytes())
            total_bytes += chunk_bytes
            print(f"   ✅ Chunk {chunk_count}: {chunk_bytes} bytes (Total: {total_bytes} bytes)")
            
            # Limit output for testing
            if chunk_count >= 5:
                print(f"   ... (truncating after 5 chunks)")
                break
        
        if chunk_count > 0:
            print(f"\n✅ SUCCESS: Received {chunk_count} audio chunks, {total_bytes} total bytes")
            return True
        else:
            print(f"\n❌ FAILURE: No audio chunks received from Deepgram")
            return False
            
    except Exception as e:
        print(f"\n❌ Error while receiving audio: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_groq_llm():
    """Test Groq LLM with a simple completion"""
    print("\n" + "="*70)
    print("🤖 TESTING GROQ LLM")
    print("="*70)
    
    from livekit.plugins import openai
    from livekit.agents import llm
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("❌ No GROQ_API_KEY found")
        return False
    
    print(f"✅ API Key loaded: {api_key[:10]}...{api_key[-5:]}")
    
    try:
        print("\n📝 Initializing Groq LLM...")
        groq_llm = openai.LLM(
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key,
            model="llama-3.1-8b-instant",
        )
        print("   ✅ LLM initialized")
        
        print("\n📝 Sending test prompt...")
        test_prompt = llm.ChatContext()
        test_prompt.append(role="user", text="Say 'hello' in one word.")
        
        response = groq_llm.chat(chat_ctx=test_prompt)
        
        print("   Receiving response...")
        async for chunk in response:
            print(f"   ✅ Received: '{chunk.choices[0].delta.content}'")
            break  # Just test first chunk
        
        print("✅ Groq LLM working!")
        return True
        
    except Exception as e:
        print(f"❌ Groq LLM test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    print("\n🚀 Starting comprehensive agent component tests...\n")
    
    results = {}
    
    # Test Deepgram TTS
    results['deepgram_tts'] = await test_deepgram_tts_detailed()
    
    # Test Groq LLM
    results['groq_llm'] = await test_groq_llm()
    
    # Summary
    print("\n" + "="*70)
    print("📊 TEST SUMMARY")
    print("="*70)
    
    all_passed = True
    for component, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status} - {component}")
        if not passed:
            all_passed = False
    
    print()
    if all_passed:
        print("🎉 ALL TESTS PASSED - Agent components are working!")
        print("✅ You can now run the full LiveKit agent")
    else:
        print("⚠️  Some components failed - check errors above")
    
    return all_passed

if __name__ == "__main__":
    asyncio.run(main())
