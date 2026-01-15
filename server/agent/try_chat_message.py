from livekit.agents import llm
try:
    msg = llm.ChatMessage(role=llm.ChatRole.SYSTEM, content="test")
    print("ChatMessage OK:", msg)
except Exception as e:
    print("ChatMessage Error:", e)
