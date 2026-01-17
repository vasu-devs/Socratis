#!/usr/bin/env python3
"""
Test raw Deepgram TTS API directly with HTTP requests
Bypasses LiveKit plugin to isolate the issue
"""
import asyncio
import aiohttp
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")
load_dotenv(dotenv_path=env_path)

async def test_raw_deepgram():
    api_key = os.getenv("DEEPGRAM_API_KEY")
    
    print("Testing RAW Deepgram TTS API...")
    print(f"API Key: {api_key[:10]}...{api_key[-5:]}")
    
    url = "https://api.deepgram.com/v1/speak?model=aura-helios-en"
    headers = {
        "Authorization": f"Token {api_key}",
        "Content-Type": "application/json"
    }
    payload = {
        "text": "Hello! I am Socratis, your interviewer for today."
    }
    
    try:
        print("Making HTTP POST request...")
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(url, json=payload, headers=headers) as response:
                print(f"Status: {response.status}")
                print(f"Headers: {dict(response.headers)}")
                
                if response.status == 200:
                    content_length = 0
                    async for chunk in response.content.iter_chunked(1024):
                        content_length += len(chunk)
                        print(f"Received {len(chunk)} bytes (total: {content_length})")
                        if content_length > 10000:  # Just test first 10KB
                            break
                    
                    print(f"\nSUCCESS! Received {content_length} bytes of audio")
                    return True
                else:
                    error_text = await response.text()
                    print(f"ERROR {response.status}: {error_text}")
                    return False
                    
    except asyncio.TimeoutError:
        print("ERROR: Request timed out after 30 seconds")
        return False
    except Exception as e:
        print(f"ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_raw_deepgram())
