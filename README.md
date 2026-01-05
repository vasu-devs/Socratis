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
*   **Voice**: Vapi.ai SDK integration for low-latency voice interaction.

---

## 🚀 Running the Project

1.  **Start Databases**: 
    *   Ensure **MongoDB** is running (`localhost:27017`).
    *   Ensure **Redis** is running (`localhost:6379`).
2.  **Start Backend**: 
    ```bash
    cd server
    npm install
    npm run dev
    ```
    (Runs on port 4000)
3.  **Start Frontend**:
    ```bash
    cd client
    npm install
    npm run dev
    ```
    (Runs on port 3000)

## 🔑 Environment Variables

### Root / Server `.env`
```env
GROQ_API_KEY=your_groq_key
MONGODB_URI=mongodb://localhost:27017/socratis
REDIS_URL=redis://localhost:6379
PORT=4000
```

### Client `.env.local`
```env
NEXT_PUBLIC_VAPI_PUBLIC_KEY=your_vapi_key
NEXT_PUBLIC_VAPI_ASSISTANT_ID=your_vapi_assistant_id
```

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
