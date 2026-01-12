 # LiveKit Setup Guide

This guide explains how to get your LiveKit credentials and set up the infrastructure for the Socratis AI Interviewer.

## 1. Get LiveKit Credentials (LiveKit Cloud)

LiveKit Cloud is the easiest way to host your WebRTC infrastructure.

1.  **Register**: Go to [cloud.livekit.io](https://cloud.livekit.io/) and sign up.
2.  **Create Project**: Create a new project named `Socratis`.
3.  **Get Keys**:
    *   In the sidebar, go to **Settings > Keys**.
    *   Click **Create Key**.
    *   Copy the **API Key** and **API Secret**. 
    > [!IMPORTANT]
    > Save the API Secret immediately; it will not be shown again.
4.  **Get URL**:
    *   On your project dashboard, copy the **WebSocket URL** (it starts with `wss://`).

## 2. Server Configuration

Update your `server/.env` file with the values you just obtained:

```env
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
```

## 3. Setting up the AI Interviewer (LiveKit Agent)

Since we replaced Vapi, you now need a LiveKit Agent to act as the AI.

### Recommended Approach: LiveKit Agents Framework
LiveKit provides a specialized framework for building AI voice agents.

1.  **Framework Documentation**: [LiveKit Agents Documentation](https://docs.livekit.io/agents/)
2.  **Voice Agent Template**: [AI Voice Agent (Python)](https://github.com/livekit/agents-python/blob/main/examples/voice-assistant/minimal_assistant.py)
    *   This template shows how to connect LLMs (like GPT-4 or Llama) and TTS (like ElevenLabs or Cartesia) to a LiveKit room.

### How it Works
1.  When a user starts an interview, the frontend creates a room (named after the `sessionId`).
2.  Your **LiveKit Agent** should be running in the background.
3.  The agent should listen for "participant joined" events and join the room to start the conversation.
4.  The agent sends transcriptions via the **Data Channel**, which the frontend is already configured to display.

## Useful Links
- [LiveKit Components (React)](https://docs.livekit.io/components/react/)
- [LiveKit Server SDK (Node.js)](https://github.com/livekit/node-sdks)
- [LiveKit CLI](https://docs.livekit.io/cli/) (Useful for testing rooms and tokens manually)
