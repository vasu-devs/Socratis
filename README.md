# 🎙️ Socratis - AI-Powered Technical Interview Platform

<div align="center">

[![Visualize in MapMyRepo](https://mapmyrepo.vasudev.live/badge.svg)](https://mapmyrepo.vasudev.live/?user=VASU-DEVS&repo=Socratis)

![Socratis](https://img.shields.io/badge/Socratis-AI%20Interviewer-blue?style=for-the-badge)
![LiveKit](https://img.shields.io/badge/LiveKit-Real--time%20Voice-green?style=for-the-badge)
![Next.js](https://img.shields.io/badge/Next.js%2014-Frontend-black?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-Backend-blue?style=for-the-badge)

**A real-time AI interviewer that conducts live coding interviews with voice interaction, intelligent feedback, and performance-based assessment.**

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [API Reference](#-api-reference)

</div>

---

## ✨ Features

### 🎯 Core Capabilities
- **Real-time Voice Interview**: Natural conversation with AI interviewer using WebRTC
- **Live Code Editor**: Monaco Editor with syntax highlighting and real-time code snapshots
- **Intelligent Feedback**: AI provides contextual hints without giving away solutions
- **Performance Assessment**: Agent evaluates and decides interview progression

### 🧠 AI-Powered Intelligence (V2)
- **Live Code Awareness**: Agent receives code snapshots every 2 seconds
- **Selective Feedback**: Only speaks when detecting bugs, approach changes, or when candidate is stuck
- **Agent-Driven Flow**: Agent decides whether to proceed to additional questions based on performance
- **Socratic Method**: Guides candidates through hints rather than giving answers

### 📊 Evaluation & Reports
- **Multi-dimensional Analysis**: Logic, Algorithm, Code Quality, Speed, Voice Communication
- **Detailed Feedback**: Strengths, growth areas, and actionable next steps
- **Visual Score Radar**: Professional result page with dimensional mapping

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SOCRATIS PLATFORM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     WebSocket      ┌──────────────┐                       │
│  │   Frontend   │◄──────────────────►│   Backend    │                       │
│  │  (Next.js)   │    REST API        │  (Express)   │                       │
│  │  Port 3000   │                    │  Port 4000   │                       │
│  └──────┬───────┘                    └──────┬───────┘                       │
│         │                                   │                                │
│         │ WebRTC                            │ MongoDB                        │
│         │ (Voice)                           ▼                                │
│         │                            ┌──────────────┐                       │
│         ▼                            │   Database   │                       │
│  ┌──────────────┐                    │   MongoDB    │                       │
│  │   LiveKit    │                    └──────────────┘                       │
│  │    Cloud     │                                                           │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         │ LiveKit Protocol                                                   │
│         ▼                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                    PYTHON VOICE AGENT                         │          │
│  ├──────────────────────────────────────────────────────────────┤          │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐ │          │
│  │  │  VAD    │  │   STT   │  │   LLM   │  │      TTS        │ │          │
│  │  │ Silero  │  │Deepgram │  │  Groq   │  │    Deepgram     │ │          │
│  │  └─────────┘  └─────────┘  │Llama3.1 │  │  aura-helios    │ │          │
│  │                            └─────────┘  └─────────────────┘ │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Frontend** | Next.js 14, React, TailwindCSS | Interview UI, Code Editor, Voice Controls |
| **Backend** | Express.js, TypeScript, MongoDB | Session Management, Evaluation API |
| **Voice Agent** | Python, LiveKit Agents SDK | Real-time voice conversation |
| **STT** | Deepgram | Real-time speech-to-text |
| **TTS** | Deepgram (aura-helios-en) | Natural voice synthesis |
| **LLM** | Groq (Llama 3.1 8B Instant) | Fast inference for interviewer logic |
| **VAD** | Silero | Voice activity detection |

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ 
- **Python** 3.8+
- **MongoDB** running locally or connection string
- **API Keys**: LiveKit, Groq, Deepgram

### 1. Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-username/socratis.git
cd socratis

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install

# Install Python agent dependencies
cd ../server/agent && pip install -r requirements.txt
```

### 2. Configure Environment

**Server `.env`** (`server/.env`):
```env
MONGODB_URI=mongodb://localhost:27017/socratis
GROQ_API_KEY=your_groq_api_key
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud
```

**Agent `.env`** (`server/agent/.env`):
```env
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
DEEPGRAM_API_KEY=your_deepgram_api_key
GROQ_API_KEY=your_groq_api_key
```

**Client `.env.local`** (`client/.env.local`):
```env
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
```

### 3. Start Everything (One Command)

```bash
# From root directory - starts ALL services
python start.py
```

This single command starts:
- ✅ Backend Server (Port 4000)
- ✅ Frontend (Port 3000)
- ✅ Voice Agent (LiveKit)

Press `Ctrl+C` to stop all services.

### 4. Open the App

Navigate to **http://localhost:3000** to access the dashboard and start your interview!

---

## 📁 Project Structure

```
socratis/
├── client/                    # Next.js Frontend
│   ├── app/                   # App Router pages
│   │   ├── interview/[id]/    # Interview room & results
│   │   └── page.tsx           # Landing page
│   ├── components/            # React components
│   │   ├── interview/         # Interview-specific components
│   │   │   ├── InterviewRoom.tsx
│   │   │   ├── CodeEditor.tsx
│   │   │   └── VoiceComponent.tsx
│   │   └── CustomIcons.tsx    # SVG icons & score donut
│   └── hooks/                 # Custom React hooks
│
├── server/                    # Express.js Backend
│   ├── src/
│   │   ├── routes/
│   │   │   └── interview.ts   # Interview API endpoints
│   │   ├── models/
│   │   │   └── Session.ts     # MongoDB schema
│   │   └── services/
│   │       └── evaluation.ts  # LLM evaluation logic
│   └── agent/                 # Python Voice Agent
│       ├── agent.py           # Main agent entrypoint
│       ├── deepgram_patch.py  # TTS compatibility fix
│       └── requirements.txt
│
└── README.md
```

---

## 🔌 API Reference

### Session Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/start` | POST | Create new interview session |
| `/api/session/:id` | GET | Get session details |
| `/api/submit` | POST | Submit code for final evaluation |
| `/api/submit-question` | POST | Submit current question, advance to next |
| `/api/advance-question` | POST | Agent-triggered question advancement |
| `/api/token` | GET | Get LiveKit access token |

### Request/Response Examples

**Start Session:**
```json
POST /api/start
Response: {
  "sessionId": "socratis-interview",
  "question": { "title": "Two Sum", "description": "...", "examples": [...] },
  "totalQuestions": 1,
  "currentQuestionIndex": 0
}
```

**Submit for Evaluation:**
```json
POST /api/submit
Body: { "sessionId": "...", "code": "...", "transcript": [...] }
Response: {
  "feedback": {
    "overallScore": 7,
    "dimensionScores": {...},
    "strengths": [...],
    "improvements": [...]
  }
}
```

---

## 🧪 Agent Behavior

### Interview Protocol

The AI agent follows a structured interview approach:

1. **Greeting**: Introduces itself and the problem
2. **Clarification**: Ensures candidate understands requirements
3. **Approach Discussion**: Asks about planned algorithm & complexity
4. **Code Review**: Watches for bugs and approach changes
5. **Completion**: Reviews solution, asks follow-up questions

### Feedback Triggers

| Condition | Agent Action |
|-----------|--------------|
| **Bug Detected** | Asks guiding question about the issue |
| **Approach Change** | Acknowledges and asks about reasoning |
| **60s Silent** | Offers gentle hint |
| **Code Complete** | Asks about complexity & edge cases |

### Performance Assessment

Based on candidate performance, the agent decides:

- **Strong Performance** → Ends interview, no second question needed
- **Mixed Performance** → Advances to second question for fuller picture
- **Weak Performance** → Gives another chance with different problem

---

## 🔑 Getting API Keys

### LiveKit Cloud
1. Go to [cloud.livekit.io](https://cloud.livekit.io/)
2. Create a new project
3. Copy `API Key`, `API Secret`, and `WebSocket URL`

### Groq
1. Go to [console.groq.com](https://console.groq.com/)
2. Generate an API key
3. Free tier includes generous limits

### Deepgram
1. Go to [console.deepgram.com](https://console.deepgram.com/)
2. Create a new API key
3. Free tier includes $200 credit

---

## 🎨 UI Features

- **Brivio Light Theme**: Clean, professional design with cobalt blue accents
- **Responsive Layout**: Resizable panels for problem description and code editor
- **Real-time Indicators**: Speaking/listening status, question progress
- **Score Visualization**: Radar chart for multi-dimensional performance view

---

## 🛠 Development

### Running Tests
```bash
# Backend tests
cd server && npm test

# Frontend tests
cd client && npm test
```

### Building for Production
```bash
# Build frontend
cd client && npm run build

# Build backend
cd server && npm run build
```

---

## 📜 License

MIT License - See [LICENSE](LICENSE) for details.

---

## 👥 Contributors

Built with ❤️ by Vasu-devs

---

<div align="center">

**[⬆ Back to Top](#-socratis---ai-powered-technical-interview-platform)**

</div>
