# Socratis - AI-Powered Interview Practice Platform

Socratis is a high-fidelity coding interview simulation platform. It pairs a voice-based AI interviewer with a professional code editor to provide a collaborative, real-world interview experience.

## 🏗 System Architecture

The project is a **Local-First Monorepo** using Next.js for the frontend and Express.js for the backend.

### 1. High-Level Data Flow
1.  **User Initiates Session**: Frontend requests a new session from Backend.
2.  **Session Creation**: Backend generates a unique `sessionId`, selects a random problem, and initializes a document in MongoDB and a cache entry in Redis.
3.  **Context Injection**: Frontend receives the problem details. When the user starts the Voice AI, these details (description, constraints) are injected into the Vapi instance.
4.  **Real-time Interaction**:
    *   **Voice**: Direct WebRTC connection between Client and Vapi.ai Servers.
    *   **Code**: State managed locally in Monaco Editor.
5.  **Submission**: Code and transcript are sent to Backend, stored in MongoDB, cached in Redis, and evaluated by Groq LLM (Llama 3.3).

---

## 🛠 Tech Stack Details

### Backend (`server/`)
*   **Runtime**: Node.js with TypeScript.
*   **Framework**: Express.js.
*   **Database**: MongoDB (via Mongoose) for persistent storage.
*   **Cache**: Redis (via ioredis) for session performance.
*   **LLM**: Groq (Llama 3.3 Versatile) for high-speed technical evaluation.

### Frontend (`client/`)
*   **Framework**: Next.js 14 (App Router).
*   **Styling**: Tailwind CSS + ShadCN UI.
*   **Components**: Monaco Editor, Unified Layout Sidebar.
*   **Voice**: LiveKit Client SDK for real-time voice interaction with AI agent.

### AI Agent (`server/agent/`)
*   **Framework**: LiveKit Agents (Python)
*   **LLM**: Groq (Llama 3.3 70B Speculative Decoding)
*   **Speech-to-Text**: Deepgram
*   **Text-to-Speech**: Deepgram
*   **VAD**: Silero Voice Activity Detection

---

## 🚀 Running the Project

### Prerequisites
1. **Python 3.8+** installed and available in PATH
2. **MongoDB** running on `localhost:27017`
3. **Redis** running on `localhost:6379`
4. **API Keys** configured in `.env` file (see below)

### 1. Environment Setup
Copy `.env.example` to `.env` and fill in your API keys:
```bash
cp .env.example .env
```

Required API keys:
- **LiveKit**: Get from [cloud.livekit.io](https://cloud.livekit.io/) (see `livekit.md` for detailed instructions)
- **Groq**: Get from [console.groq.com](https://console.groq.com/)
- **Deepgram**: Get from [console.deepgram.com](https://console.deepgram.com/)

### 2. Install Dependencies

**Python Agent**:
```bash
cd server/agent
pip install -r requirements.txt
```

**Backend**:
```bash
cd server
npm install
```

**Frontend**:
```bash
cd client
npm install
```

### 3. Start Services (in order)

**Terminal 1 - LiveKit Agent**:
```bash
# Option A: Use the startup script (Windows)
start-agent.bat

# Option B: Manual start
cd server/agent
python agent.py dev
```

**Terminal 2 - Backend Server**:
```bash
cd server
npm run dev
```
(Runs on port 4000)

**Terminal 3 - Frontend**:
```bash
cd client
npm run dev
```
(Runs on port 3000)

### 4. Access the Application
Navigate to `http://localhost:3000` and start your interview!



## 🔑 Environment Variables

### Root `.env`
```env
# LiveKit Configuration
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=wss://your-project.livekit.cloud

# AI Services
GROQ_API_KEY=your_groq_key
DEEPGRAM_API_KEY=your_deepgram_key

# Database
MONGODB_URI=mongodb://localhost:27017/socratis
REDIS_URL=redis://localhost:6379

# Server
PORT=4000
```

See `.env.example` for a complete template.


## ✨ Key Features Implemented
- **Unified Interview Layout**: Problem description and AI interviewer sidebar are visible simultaneously.
- **Smart Interviewer Persona**: AI auto-explains the problem, listens actively, and provides hints without giving solutions.
- **Micro-animations**: Speaking/Listening indicators and smooth transitions.
- **Detailed Evaluation**: LLM generated report with sections for:
  - What was done well
  - What could be improved
  - Missing edge cases
  - Next steps for preparation
- **Voice Controls**: Mute/Unmute and auto-scrolling conversation transcript.
