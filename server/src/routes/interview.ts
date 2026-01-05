import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Session from '../models/Session';

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
    // Logic to fetch transcript from Vapi would go here
    // Logic to trigger LLM evaluation would go here

    // Stub evaluation
    session.feedback = {
      correctness: true, // Placeholder
      score: 8, // Placeholder
      feedback_markdown: "## Evaluation\n\nGood job on the implementation! This is a stub feedback."
    };

    await session.save();

    res.json({
      feedback: session.feedback
    });
  } catch (error) {
    console.error('Error submitting session:', error);
    res.status(500).json({ error: 'Failed to submit session' });
  }
});

export default router;
