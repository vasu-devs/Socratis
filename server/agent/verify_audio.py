import asyncio
import os
import logging
from livekit import rtc
from livekit.api import AccessToken
from livekit.api.access_token import VideoGrants
from dotenv import load_dotenv

# Load env variables
load_dotenv(r"E:\Recruitment\Briviio\Socratis\server\agent\.env")

API_KEY = os.getenv("LIVEKIT_API_KEY")
API_SECRET = os.getenv("LIVEKIT_API_SECRET")
URL = os.getenv("LIVEKIT_URL")
ROOM_NAME = "socratis-interview"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verifier")

async def verify_audio():
    logger.info(f"Connecting to {URL} - Room: {ROOM_NAME}")

    # Generate Token
    token = AccessToken(API_KEY, API_SECRET) \
        .with_identity("verifier_bot") \
        .with_name("Verifier") \
        .with_grants(VideoGrants(room_join=True, room=ROOM_NAME)) \
        .to_jwt()

    room = rtc.Room()
    
    audio_received = asyncio.Event()

    @room.on("track_subscribed")
    def on_track_subscribed(track, publication, participant):
        logger.info(f"Subscribed to track: {track.kind} from {participant.identity}")
        if track.kind == rtc.TrackKind.KIND_AUDIO:
            logger.info("✅ Audio track detected!")
            # In a real verify, we might want to check for audio level, 
            # but usually existence of track + subscription is enough proof of connection.
            # checks for audio level can be complex in pure python client without a frame loop.
            audio_received.set()

    try:
        await room.connect(URL, token)
        logger.info("Connected to room.")
        
        # Wait for agent to join
        logger.info("Waiting for audio track...")
        try:
            await asyncio.wait_for(audio_received.wait(), timeout=30)
            logger.info("🎉 SUCCESS: Agent audio track received!")
        except asyncio.TimeoutError:
            logger.error("❌ FAILED: Timed out waiting for audio track.")
            # Check participants
            logger.info(f"Participants in room: {[p.identity for p in room.remote_participants.values()]}")
            
    finally:
        await room.disconnect()

if __name__ == "__main__":
    asyncio.run(verify_audio())
