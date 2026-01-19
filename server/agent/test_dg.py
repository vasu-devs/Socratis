import asyncio
import aiohttp
import os
from dotenv import load_dotenv

async def test_deepgram():
    load_dotenv()
    api_key = os.environ.get("DEEPGRAM_API_KEY")
    url = f"https://api.deepgram.com/v1/speak?model=aura-helios-en&encoding=linear16&sample_rate=24000"
    
    async with aiohttp.ClientSession() as session:
        async with session.post(
            url,
            json={"text": "Hello world"},
            headers={"Authorization": f"Token {api_key}", "Content-Type": "application/json"}
        ) as resp:
            print(f"Status: {resp.status}")
            if resp.status == 200:
                data = await resp.read()
                print(f"Got {len(data)} bytes of audio")
            else:
                print(f"Error: {await resp.text()}")

if __name__ == "__main__":
    asyncio.run(test_deepgram())
