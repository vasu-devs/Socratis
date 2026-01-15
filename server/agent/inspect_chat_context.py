from livekit.agents import llm
import inspect

ctx = llm.ChatContext()
print("Instance dir:", dir(ctx))
print("Instance dict:", ctx.__dict__)
print("Init signature:", inspect.signature(llm.ChatContext.__init__))
