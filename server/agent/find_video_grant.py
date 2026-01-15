import inspect
import livekit.api
import livekit

print(f"livekit.api contains: {dir(livekit.api)}")
try:
    from livekit import protocol
    print("livekit.protocol found")
except:
    print("livekit.protocol NOT found")

def find_video_grant(module, prefix=""):
    for name, obj in inspect.getmembers(module):
        if name == "VideoGrant":
            print(f"FOUND VideoGrant in {prefix}{name}")
            return

find_video_grant(livekit.api, "livekit.api.")
