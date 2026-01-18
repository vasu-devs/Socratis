import mongoose, { Schema, Document } from 'mongoose';

// Individual submission for each question in a multi-question session
interface ISubmission {
  questionIndex: number;
  code: string;
  transcript: Array<{
    role: 'ai' | 'user';
    content: string;
    timestamp: Date;
  }>;
  submittedAt: Date;
}

export interface ISession extends Document {
  sessionId: string; // UUID
  status: 'active' | 'completed';
  // Multi-question support
  questions: Array<{
    title: string;
    description: string;
    examples: string[];
    starterCode: string;
  }>;
  currentQuestionIndex: number;
  submissions: ISubmission[];
  // Current working state (for active question)
  question: {
    title: string;
    description: string;
    examples: string[];
    starterCode: string;
  };
  code: string;
  language: string;
  transcript: Array<{
    role: 'ai' | 'user';
    content: string;
    timestamp: Date;
  }>;
  feedback?: {
    correctness: boolean;
    overall_score: number;
    dimension_scores?: {
      problem_solving: number;
      algorithmic_thinking: number;
      code_implementation: number;
      testing: number;
      time_management: number;
      communication: number;
    };
    feedback_markdown: string;
    // Legacy field for backwards compatibility
    score?: number;
  };
  createdAt: Date;
}

const SessionSchema: Schema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
  // Multi-question support
  questions: [{
    title: { type: String, required: true },
    description: { type: String, required: true },
    examples: { type: [String], default: [] },
    starterCode: { type: String, default: '' },
  }],
  currentQuestionIndex: { type: Number, default: 0 },
  submissions: [{
    questionIndex: { type: Number, required: true },
    code: { type: String, default: '' },
    transcript: [{
      role: { type: String, enum: ['ai', 'user'], required: true },
      content: { type: String, required: true },
      timestamp: { type: Date, default: Date.now },
    }],
    submittedAt: { type: Date, default: Date.now },
  }],
  // Current working state
  question: {
    title: { type: String, required: true },
    description: { type: String, required: true },
    examples: { type: [String], default: [] },
    starterCode: { type: String, default: '' },
  },
  code: { type: String, default: '' },
  language: { type: String, default: 'javascript' },
  transcript: [{
    role: { type: String, enum: ['ai', 'user'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  }],
  feedback: {
    correctness: { type: Boolean },
    overall_score: { type: Number },
    dimension_scores: {
      problem_solving: { type: Number },
      algorithmic_thinking: { type: Number },
      code_implementation: { type: Number },
      testing: { type: Number },
      time_management: { type: Number },
      communication: { type: Number }
    },
    feedback_markdown: { type: String },
    score: { type: Number }, // Legacy field
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISession>('Session', SessionSchema);

