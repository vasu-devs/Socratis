import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Session from '../models/Session';
import { evaluateSession } from '../services/evaluator';

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

// In-memory cache for sessions
const sessionCache = new Map<string, any>();

// POST /start
router.post('/start', async (req: Request, res: Response) => {
  try {
    // FORCE "Two Sum" (Index 0) as per user request to remove randomness
    const question = QUESTIONS[0]; 
    const sessionId = uuidv4();

    const sessionData = {
      sessionId,
      question: {
        title: question.title,
        description: question.description,
        examples: question.examples,
        starterCode: question.starterCode
      },
      status: 'active'
    };

    const session = new Session(sessionData);
    await session.save();

    // Cache in memory (expires in 1 hour handling not strictly needed for Map but could clear on interval if needed)
    sessionCache.set(sessionId, sessionData);
    console.log(`[Cache] Session ${sessionId} cached.`);

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
    const { sessionId, code, transcript = [] } = req.body;

    try {
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      session.code = code;
      session.transcript = transcript;
      session.status = 'completed';

      console.log("Evaluating session...");
      const evaluation = await evaluateSession(
        session.question,
        code,
        transcript
      );

      session.feedback = evaluation;
      await session.save();

      // Update cache
      sessionCache.set(sessionId, session.toObject());

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
    // Try Map cache first
    const cachedSession = sessionCache.get(sessionId);
    if (cachedSession) {
      console.log(`[Cache] Serving session ${sessionId} from memory`);
      return res.json(cachedSession);
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Cache it for future lookups
    sessionCache.set(sessionId, session.toObject());

    res.json(session);
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

export default router;
