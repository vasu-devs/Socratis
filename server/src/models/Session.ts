import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
  sessionId: string; // UUID
  status: 'active' | 'completed';
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
    score: number;
    feedback_markdown: string;
  };
  createdAt: Date;
}

const SessionSchema: Schema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  status: { type: String, enum: ['active', 'completed'], default: 'active' },
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
    score: { type: Number },
    feedback_markdown: { type: String },
  },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ISession>('Session', SessionSchema);
