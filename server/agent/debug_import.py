import livekit.agents
print(f"VERSION: {getattr(livekit.agents, '__version__', 'unknown')}")
for x in dir(livekit.agents):
    print(x)
