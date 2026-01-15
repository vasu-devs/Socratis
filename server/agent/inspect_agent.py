import livekit.agents
import sys

print(f"LiveKit Agents Version: {getattr(livekit.agents, '__version__', 'Unknown')}")
print(f"Python Executable: {sys.executable}")
print("Dir of livekit.agents:", dir(livekit.agents))
try:
    from livekit.agents import pipeline
    print("Pipeline module found")
except ImportError as e:
    print(f"Pipeline module import failed: {e}")
