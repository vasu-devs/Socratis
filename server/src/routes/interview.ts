import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Session from '../models/Session';
// import { evaluateSession } from '../services/evaluator'; // Moved to Agent
import { AccessToken } from 'livekit-server-sdk';

const router = express.Router();

import redis from '../lib/redis';

// Hardcoded questions for variety
const QUESTIONS = [
  {
    title: "Two Sum",
    description: "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`. You may assume that each input would have exactly one solution, and you may not use the same element twice.",
    examples: [
      "Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1]."
    ],
    starterCode: `/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Your code here
}`
  },
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
  },
  {
    title: "LRU Cache",
    description: "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement the `LRUCache` class with `get(key)` and `put(key, value)` methods. When the cache reaches its capacity, it should invalidate the least recently used item before inserting a new item.",
    examples: [
      "Input: ['LRUCache', 'put', 'put', 'get', 'put', 'get', 'put', 'get', 'get', 'get']\n[[2], [1, 1], [2, 2], [1], [3, 3], [2], [4, 4], [1], [3], [4]]\nOutput: [null, null, null, 1, null, -1, null, -1, 3, 4]"
    ],
    starterCode: `class LRUCache {
  /**
   * @param {number} capacity
   */
  constructor(capacity) {
    // Your code here
  }

  /**
   * @param {number} key
   * @return {number}
   */
  get(key) {
    // Your code here
  }

  /**
   * @param {number} key
   * @param {number} value
   * @return {void}
   */
  put(key, value) {
    // Your code here
  }
}`
  },
  {
    title: "Next Permutation",
    description: "Implement next permutation, which rearranges numbers into the lexicographically next greater permutation of numbers. If such an arrangement is not possible, it must rearrange it as the lowest possible order (i.e., sorted in ascending order). The replacement must be in place and use only constant extra memory.",
    examples: [
      "Input: nums = [1,2,3]\nOutput: [1,3,2]",
      "Input: nums = [3,2,1]\nOutput: [1,2,3]"
    ],
    starterCode: `/**
 * @param {number[]} nums
 * @return {void} Do not return anything, modify nums in-place instead.
 */
function nextPermutation(nums) {
  // Your code here
}`
  }
];

// ============================================================================
// DYNAMIC QUESTION SELECTION - Randomizes question order for each session
// ============================================================================

/**
 * Fisher-Yates shuffle algorithm for randomizing question order
 * @param array - Array to shuffle (creates a new shuffled array, doesn't mutate)
 * @returns Shuffled copy of the array
 */
function shuffleQuestions<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Select a random subset of questions from the pool
 * @param pool - Full question pool
 * @param count - Number of questions to select (default: 2)
 * @returns Randomly selected and shuffled questions
 */
function selectRandomQuestions(pool: typeof QUESTIONS, count: number = 2): typeof QUESTIONS {
  const shuffled = shuffleQuestions(pool);
  return shuffled.slice(0, Math.min(count, pool.length));
}

// In-memory cache for sessions
const sessionCache = new Map<string, any>();

// POST /livekit/token
router.post('/livekit/token', async (req: Request, res: Response) => {
  const { sessionId, participantName } = req.body;

  if (!sessionId || !participantName) {
    return res.status(400).json({ error: 'sessionId and participantName are required' });
  }

  try {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const wsUrl = process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !wsUrl) {
      return res.status(500).json({ error: 'LiveKit configuration is missing' });
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: sessionId,
      canPublish: true,
      canSubscribe: true,
    });

    const token = await at.toJwt();
    console.log(`[Token] Generated for Room: ${sessionId}, Participant: ${participantName}`);
    console.log(`[Token] Using LiveKit URL: ${wsUrl}`);

    res.json({
      token,
      url: wsUrl,
    });
  } catch (error) {
    console.error('Error generating LiveKit token:', error);
    res.status(500).json({ error: 'Failed to generate token' });
  }
});
// POST /save-analysis - Called by Python Agent to save the final report
router.post('/save-analysis', async (req: Request, res: Response) => {
  const { sessionId, analysis } = req.body;

  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.feedback = analysis;
    // Mark as completed if not already
    session.status = 'completed';

    await session.save();
    sessionCache.set(sessionId, session.toObject());

    console.log(`[Analysis] Report saved for session ${sessionId} (from Agent)`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving analysis:', error);
    res.status(500).json({ error: 'Failed to save analysis' });
  }
});

// POST /start
router.post('/start', async (req: Request, res: Response) => {
  try {
    // DYNAMIC QUESTION SELECTION: Randomly select 2 questions from the full pool
    // This ensures each session gets a different set of questions
    const allQuestions = selectRandomQuestions(QUESTIONS, 2);
    const numQuestionsToShow = 1; // Start with just 1 question, agent decides if more are needed

    // DEBUG MODE: Fixed Session ID to match Agent Room
    const sessionId = "socratis-interview"; // uuidv4();

    const firstQuestion = allQuestions[0];

    console.log(`[Dynamic Questions] Selected questions: ${allQuestions.map(q => q.title).join(', ')}`);
    console.log(`[Dynamic Questions] Starting with: "${firstQuestion.title}"`);

    const sessionData = {
      sessionId,
      questions: allQuestions, // Store randomly selected questions
      currentQuestionIndex: 0,
      submissions: [],
      question: {
        title: firstQuestion.title,
        description: firstQuestion.description,
        examples: firstQuestion.examples,
        starterCode: firstQuestion.starterCode
      },
      code: firstQuestion.starterCode,
      transcript: [],
      status: 'active'
    };

    const session = await Session.findOneAndUpdate(
      { sessionId },
      sessionData,
      { new: true, upsert: true }
    );

    // Cache in memory
    sessionCache.set(sessionId, sessionData);
    console.log(`[Cache] Session ${sessionId} cached. Agent will decide if second question is needed.`);

    const response = {
      sessionId,
      question: session.question,
      totalQuestions: numQuestionsToShow, // Show 1, agent can add more
      currentQuestionIndex: 0
    };
    console.log(`[API /start] Sending response:`, JSON.stringify(response, null, 2));

    res.json(response);
  } catch (error) {
    console.error('Error starting session:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});


// POST /submit-question - Submit current question and advance to next
router.post('/submit-question', async (req: Request, res: Response) => {
  const { sessionId, code, transcript = [] } = req.body;

  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentIndex = session.currentQuestionIndex;
    const totalQuestions = session.questions.length;

    // Save current submission
    session.submissions.push({
      questionIndex: currentIndex,
      code: code,
      transcript: transcript,
      submittedAt: new Date()
    });

    // Check if there are more questions
    if (currentIndex + 1 < totalQuestions) {
      // Advance to next question
      const nextQuestion = session.questions[currentIndex + 1];
      session.currentQuestionIndex = currentIndex + 1;
      session.question = nextQuestion;
      session.code = nextQuestion.starterCode;
      session.transcript = []; // Reset transcript for new question

      await session.save();
      sessionCache.set(sessionId, session.toObject());

      console.log(`[Session] Advanced to question ${currentIndex + 2}/${totalQuestions}`);

      res.json({
        status: 'next_question',
        question: nextQuestion,
        currentQuestionIndex: currentIndex + 1,
        totalQuestions: totalQuestions,
        message: `Moving to question ${currentIndex + 2} of ${totalQuestions}`
      });
    } else {
      // All questions completed - trigger final evaluation
      session.code = code;
      session.transcript = transcript;
      session.status = 'completed';

      console.log("Session completed. Waiting for Agent analysis...");
      // DO NOT EVALUATE HERE. The Python Agent will generate the report and call /save-analysis

      session.status = 'completed';
      await session.save();
      sessionCache.set(sessionId, session.toObject());

      res.json({
        status: 'completed',
        message: 'Interview completed! Generating report...'
      });
    }
  } catch (error) {
    console.error('Error submitting question:', error);
    res.status(500).json({ error: 'Failed to submit question' });
  }
});

// POST /advance-question - Agent calls this when it decides candidate needs a second question
// This is different from submit-question as it doesn't save code, just advances the question
router.post('/advance-question', async (req: Request, res: Response) => {
  const { sessionId } = req.body;

  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const currentIndex = session.currentQuestionIndex;
    const totalQuestions = session.questions.length;

    // Check if there are more questions available
    if (currentIndex + 1 < totalQuestions) {
      const nextQuestion = session.questions[currentIndex + 1];
      session.currentQuestionIndex = currentIndex + 1;
      session.question = nextQuestion;
      session.code = nextQuestion.starterCode;
      // Don't reset transcript - keep conversation flowing

      await session.save();
      sessionCache.set(sessionId, session.toObject());

      console.log(`[Agent Decision] Advanced to question ${currentIndex + 2}/${totalQuestions}`);

      res.json({
        status: 'advanced',
        question: nextQuestion,
        currentQuestionIndex: currentIndex + 1,
        totalQuestions: totalQuestions,
        message: `Agent advanced to question ${currentIndex + 2}`
      });
    } else {
      res.json({
        status: 'no_more_questions',
        message: 'No more questions available'
      });
    }
  } catch (error) {
    console.error('Error advancing question:', error);
    res.status(500).json({ error: 'Failed to advance question' });
  }
});


// POST /submit
router.post('/submit', async (req: Request, res: Response) => {
  const { sessionId, code, transcript = [] } = req.body;

  try {
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    session.code = code;
    session.transcript = transcript;
    session.status = 'completed';

    // DO NOT EVALUATE HERE. Agent handles it.
    await session.save();

    console.log("Session submitted. Waiting for Agent analysis...");

    // Update cache
    sessionCache.set(sessionId, session.toObject());

    res.json({
      status: 'completed',
      message: 'Session submitted. Analysis pending.'
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
    // Try Map cache first
    const cachedSession = sessionCache.get(sessionId);
    if (cachedSession) {
      console.log(`[Cache] Serving session ${sessionId} from memory`);
      // Ensure multi-question fields are included
      const response = {
        ...cachedSession,
        totalQuestions: cachedSession.questions?.length || 1,
        currentQuestionIndex: cachedSession.currentQuestionIndex || 0
      };
      return res.json(response);
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Cache it for future lookups
    const sessionObj = session.toObject();
    sessionCache.set(sessionId, sessionObj);

    // Include multi-question fields in response
    res.json({
      ...sessionObj,
      totalQuestions: session.questions?.length || 1,
      currentQuestionIndex: session.currentQuestionIndex || 0
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export default router;
