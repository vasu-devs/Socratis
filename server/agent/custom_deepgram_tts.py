"""
FINAL Working Custom Deepgram TTS
Properly handles streaming attribute
"""
import aiohttp
import asyncio
import numpy as np
from livekit import rtc
from livekit.agents import tts
from livekit.agents.types import APIConnectOptions
import logging
import os

logger = logging.getLogger(__name__)

class CustomDeepgramTTS(tts.TTS):
    """Custom Deepgram TTS with proper streaming support"""
    
    def __init__(self, *, model: str = "aura-helios-en", sample_rate: int = 24000):
        # Set streaming=True in capabilities to avoid _streaming attribute error
        super().__init__(
            capabilities=tts.TTSCapabilities(streaming=True),  # Changed to True!
            sample_rate=sample_rate,
            num_channels=1,
        )
        
        self._api_key = os.environ.get("DEEPGRAM_API_KEY")
        if not self._api_key:
            raise ValueError("DEEPGRAM_API_KEY required")
        
        self._model = model
        self._sample_rate = sample_rate
        logger.info(f"[CustomDGTTS] Init: model={model}")
    
    def synthesize(self, text: str, *, conn_options: APIConnectOptions = APIConnectOptions()):
        return WorkingStream(tts=self, input_text=text, conn_options=conn_options)


class WorkingStream(tts.ChunkedStream):
    """Stream that properly implements _run with audio emission"""
    
    def __init__(self, tts: CustomDeepgramTTS, input_text: str, conn_options: APIConnectOptions):
        self._tts_inst = tts
        self._text = input_text
        super().__init__(tts=tts, input_text=input_text, conn_options=conn_options)
    
    async def _run(self, output_emitter):
        """Core synthesis with proper audio emission"""
        
        logger.info(f"[CustomDGTTS] Synthesizing: '{self._text[:40]}...'")
        
        session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30))
        
        try:
            url = f"https://api.deepgram.com/v1/speak?model={self._tts_inst._model}&encoding=linear16&sample_rate={self._tts_inst._sample_rate}"
            
            async with session.post(
                url,
                json={"text": self._text},
                headers={
                    "Authorization": f"Token {self._tts_inst._api_key}",
                    "Content-Type": "application/json"
                }
            ) as resp:
                if resp.status != 200:
                    raise Exception(f"Deepgram error {resp.status}: {await resp.text()}")
                
                # Read audio
                audio_bytes = await resp.read()
                samples = np.frombuffer(audio_bytes, dtype=np.int16)
                
                logger.info(f"[CustomDGTTS] Got {len(samples)} samples ({len(samples)/self._tts_inst._sample_rate:.2f}s)")
                
                # Create frame
                frame = rtc.AudioFrame(
                    data=samples.tobytes(),
                    sample_rate=self._tts_inst._sample_rate,
                    num_channels=1,
                    samples_per_channel=len(samples),
                )
                
                # Emit with proper sequence
                output_emitter.start_segment(segment_id="main")
                output_emitter.push(frame)
                output_emitter.flush()
                output_emitter.end_segment()
                
                logger.info(f"[CustomDGTTS] ✓ Audio emitted successfully!")
                
        except Exception as e:
            logger.error(f"[CustomDGTTS] Error: {e}")
            raise
        finally:
            await session.close()
