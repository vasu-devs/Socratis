import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Session from '../models/Session';
import { evaluateSession } from '../services/evaluator';

const router = express.Router();

// Hardcoded question for MVP
const QUESTIONS = [
  {
    title: "Request Throttler",
    description: "Implement a rate limiter (throttler) that restricts a function to be called at most once every `limit` milliseconds. The returned function should accept arguments and return the result of the original function if executed, or undefined if throttled.",
    examples: [
      "const throttledLog = throttle(console.log, 1000);",
      "throttledLog('hello'); // logs 'hello'",
      "throttledLog('world'); // returns undefined (throttled)"
    ],
    starterCode: `/**
 * @param {(...args: any[]) => any} func
 * @param {number} limit
 * @return {(...args: any[]) => any}
 */
function throttle(func, limit) {
  // Your code here
}`
  }
];

// POST /start
router.post('/start', async (req: Request, res: Response) => {
  try {
    const question = QUESTIONS[0]; // Logic to random pick can go here
    const sessionId = uuidv4();

    const session = new Session({
      sessionId,
      question: {
        title: question.title,
        description: question.description,
        examples: question.examples,
        starterCode: question.starterCode
      },
      status: 'active'
    });

    await session.save();

    res.json({
      sessionId,
      question: session.question
    });
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// POST /submit
router.post('/submit', async (req: Request, res: Response) => {
  const { sessionId, code } = req.body;

  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.code = code;
    session.status = 'completed';
    // Logic to fetch transcript from Vapi could go here (mocked for now)
    const transcript: Array<{ role: 'ai' | 'user'; content: string }> = [];
    // In a real scenario, we might have stored transcript state in DB via a webhook or separate endpoint during the call.

    console.log("Evaluating session...");
    const evaluation = await evaluateSession(
      session.question,
      code,
      transcript
    );

    session.feedback = evaluation;

    await session.save();

    res.json({
      feedback: session.feedback
    });
  } catch (error) {
    console.error('Error submitting session:', error);
    res.status(500).json({ error: 'Failed to submit session' });
  }
});

// GET /session/:sessionId
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export default router;
