from livekit.agents import voice
print(dir(voice))
for x in dir(voice):
    if not x.startswith("_"):
        print(f"{x}: {getattr(voice, x)}")
