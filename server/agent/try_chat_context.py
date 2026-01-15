from livekit.agents import llm
print(dir(llm.ChatContext))
try:
    c = llm.ChatContext()
    c.append(role="system", text="test")
    print("Append worked")
except Exception as e:
    print(f"Append failed: {e}")

try:
    c = llm.ChatContext()
    c.messages.append(llm.ChatMessage(role="system", content="test"))
    print("Messages append worked")
except Exception as e:
    print(f"Messages append failed: {e}")
