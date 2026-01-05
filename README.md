# Interview Practice Platform - "Socratis"

## 🏗 System Architecture

The project is architected as a **Local-First Monorepo** composed of two main services: a Next.js Frontend and an Express Backend, communicating via REST APIs.

### 1. High-Level Data Flow
1.  **User Initiates Session**: Frontend requests a new session from Backend.
2.  **Session Creation**: Backend generates a unique `sessionId`, selects a problem, and initializes a document in MongoDB.
3.  **Context Injection**: Frontend receives the problem details. When the user starts the Voice AI, these details (description, constraints) are injected into the Vapi Vapi instance.
4.  **Real-time Interaction**:
    *   **Voice**: Direct WebRTC connection between Client and Vapi.ai Servers.
    *   **Code**: State managed locally in Monaco Editor.
5.  **Submission**: Code is sent to Backend, stored in MongoDB, and (placeholder) evaluated by an LLM.

---

## 🛠 Tech Stack Details

### Backend (`server/`)
*   **Runtime**: Node.js with TypeScript.
*   **Framework**: Express.js for lightweight REST handling.
*   **Database**: MongoDB (via Mongoose). Chosen for flexible schema evolution (e.g., storing varied transcript formats).
*   **Key Components**:
    *   **`Session` Model**: The single source of truth. Stores the question, current code, transcript, and feedback.
    *   **`interview` Routes**:
        *   `POST /start`: Factory for ephemeral sessions.
        *   `POST /submit`: Evaluation trigger.

### Frontend (`client/`)
*   **Framework**: Next.js 14 (App Router).
*   **Styling**: Tailwind CSS + ShadCN UI (via `lucide-react` icons and utility classes).
*   **State Management**: React `useState` / `useEffect` for local session management.
*   **Key Components**:
    *   **`InterviewRoom`**: The orchestrator. Manages layout using `react-resizable-panels`.
    *   **`VoiceComponent`**: Wrapper around `@vapi-ai/web`. Handles call lifecycle (connect/disconnect) and event listening (speech-start, transcript-final).
    *   **`CodeEditor`**: Wrapper around `@monaco-editor/react`. Configured for JavaScript with VS Code-like experience.

### AI Integration (Vapi)
*   **Context Awareness**: The critical challenge "The Context Gap" was solved by injecting the `question.description` into the Vapi Assistant's `variableValues` (specifically `question_context`) upon call start.
*   **System Prompt**: The Assistant is configured to act as a "Technical Interviewer", reading the injected context to guide the user without solving the problem for them.

---

## 📂 Project Structure

```
Socratis/
├── client/                 # Next.js Frontend
│   ├── app/                # App Router Pages
│   ├── components/         # UI Components (InterviewRoom, Voice, Editor)
│   ├── hooks/              # Custom Hooks (useVapiInterview)
│   └── lib/                # Utilities
├── server/                 # Express Backend
│   ├── src/
│   │   ├── models/         # Mongoose Schemas (Session.ts)
│   │   ├── routes/         # API Route definitions
│   │   └── app.ts          # Server Entry point
│   └── package.json
└── README.md
```

## 🚀 Running the Project

1.  **Start Database**: Ensure MongoDB is running locally.
2.  **Start Backend**: `cd server && npm start` (Runs on port 4000)
3.  **Start Frontend**: `cd client && npm start` (Runs on port 3000)
4.  **Configure Vapi**: Add `NEXT_PUBLIC_VAPI_PUBLIC_KEY` and `NEXT_PUBLIC_VAPI_ASSISTANT_ID` to `client/.env.local`.
