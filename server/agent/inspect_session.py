import livekit.agents
import inspect

try:
    print("Signature of livekit.agents.AgentSession:")
    print(inspect.signature(livekit.agents.AgentSession))
except Exception as e:
    print(f"Error: {e}")
