"""
WORKING Deepgram TTS Monkey-Patch
Replaces broken synthesize method with working HTTP-based synthesis
"""
import aiohttp
import asyncio
import numpy as np
from livekit import rtc
from livekit.agents import tts
import logging
import os

logger = logging.getLogger(__name__)

async def direct_deepgram_synthesize(text: str, api_key: str, model: str = "aura-helios-en", sample_rate: int = 24000):
    """
    Direct Deepgram synthesis bypassing broken plugin
    Returns audio frame directly
    """
    print(f"[DirectDG] Synthesizing: '{text[:50]}...'")
    logger.info(f"[DirectDG] Synthesizing: '{text[:50]}...'")
    
    session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30))
    
    try:
        url = f"https://api.deepgram.com/v1/speak?model={model}&encoding=linear16&sample_rate={sample_rate}"
        
        async with session.post(
            url,
            json={"text": text},
            headers={
                "Authorization": f"Token {api_key}",
                "Content-Type": "application/json"
            }
        ) as resp:
            if resp.status != 200:
                error = await resp.text()
                raise Exception(f"Deepgram API error {resp.status}: {error}")
            
            audio_bytes = await resp.read()
            samples = np.frombuffer(audio_bytes, dtype=np.int16)
            
            print(f"[DirectDG] Got {len(samples)} samples ({len(samples)/sample_rate:.2f}s)")
            logger.info(f"[DirectDG] Got {len(samples)} samples ({len(samples)/sample_rate:.2f}s)")
            
            frame = rtc.AudioFrame(
                data=samples.tobytes(),
                sample_rate=sample_rate,
                num_channels=1,
                samples_per_channel=len(samples),
            )
            
            return frame
            
    except Exception as e:
        print(f"[DirectDG] Error: {e}")
        logger.error(f"[DirectDG] Error: {e}")
        raise
    finally:
        await session.close()


def patch_deepgram_tts():
    """
    Monkey-patch the LiveKit Deepgram TTS to use working HTTP synthesis
    Call this before running your agent
    """
    from livekit.plugins import deepgram
    
    print(f"[PATCH] Applying Deepgram TTS monkey-patch...")
    logger.info("[PATCH] Applying Deepgram TTS monkey-patch...")
    
    # Store original synthesize
    original_synthesize = deepgram.TTS.synthesize
    
    def patched_synthesize(self, text: str, **kwargs):
        """Patched synthesize that uses working HTTP approach"""
        print(f"[PATCH] Patched synthesis called for {len(text)} chars: {text[:30]}...")
        
        # Get API key from instance or env
        api_key = getattr(self, '_api_key', None) or getattr(self, '_opts', None)
        if hasattr(api_key, 'api_key'):
            api_key = api_key.api_key
        if not api_key:
            api_key = os.environ.get("DEEPGRAM_API_KEY")
        
        # Get model
        model = getattr(self, '_model', "aura-helios-en")
        sample_rate = getattr(self, '_sample_rate', 24000)
        
        # Return a simple async generator that yields the audio
        async def _generate():
            frame = await direct_deepgram_synthesize(text, api_key, model, sample_rate)
            yield tts.SynthesizedAudio(request_id="", frame=frame)
        
        # Create a simple wrapper that looks like ChunkedStream
        class SimpleStream:
            def __init__(self):
                self._gen = _generate()
            
            def __aiter__(self):
                return self._gen.__aiter__()
            
            async def __anext__(self):
                return await self._gen.__anext__()
            
            async def aclose(self):
                pass
        
        return SimpleStream()
    
    # Apply patch
    deepgram.TTS.synthesize = patched_synthesize
    
    print(f"[PATCH] Deepgram TTS patched successfully!")
    logger.info("[PATCH] Deepgram TTS patched successfully!")
