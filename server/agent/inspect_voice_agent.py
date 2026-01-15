import livekit.agents.voice as voice
import inspect

print("Voice module dir:", dir(voice))
if hasattr(voice, "Agent"):
    print("voice.Agent found")
    print("voice.Agent init:", inspect.signature(voice.Agent.__init__))
    print("voice.Agent start:", inspect.signature(voice.Agent.start))

if hasattr(voice, "VoicePipelineAgent"):
    print("VoicePipelineAgent found")
