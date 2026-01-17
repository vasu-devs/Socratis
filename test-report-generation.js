/**
 * Mock Test for Interview Report Generation - Enhanced Version
 * Outputs results in JSON format for easier parsing
 */

const fs = require('fs');
const API_BASE = 'http://localhost:4000/api';

// Mock interview data
const MOCK_CODE = `function twoSum(nums, target) {
  const map = new Map();
  
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    
    map.set(nums[i], i);
  }
  
  return [];
}`;

const MOCK_TRANSCRIPT = [
    {
        role: 'ai',
        content: 'Hello! Welcome to your technical interview. Today, we\'ll be working on the Two Sum problem. Can you start by explaining your initial thoughts on how to approach this?',
        timestamp: new Date('2026-01-17T08:30:00Z')
    },
    {
        role: 'user',
        content: 'Sure! So the problem asks us to find two numbers that add up to a target. My first thought is to use a hash map to store numbers we\'ve seen, so we can check if the complement exists in O(1) time.',
        timestamp: new Date('2026-01-17T08:30:30Z')
    },
    {
        role: 'ai',
        content: 'Excellent! That sounds like an optimal approach. What would be the time and space complexity of your solution?',
        timestamp: new Date('2026-01-17T08:31:00Z')
    },
    {
        role: 'user',
        content: 'The time complexity would be O(n) since we iterate through the array once, and space complexity is also O(n) for the hash map in the worst case.',
        timestamp: new Date('2026-01-17T08:31:30Z')
    },
    {
        role: 'ai',
        content: 'Perfect analysis. Go ahead and implement your solution. Remember to consider edge cases.',
        timestamp: new Date('2026-01-17T08:32:00Z')
    },
    {
        role: 'user',
        content: 'Okay, I\'ll start coding. I\'m creating a Map to store the numbers and their indices. For each number, I calculate the complement and check if it exists in the map.',
        timestamp: new Date('2026-01-17T08:35:00Z')
    },
    {
        role: 'ai',
        content: 'Great! I see you\'re implementing it. Can you walk me through how you handle the edge case where no solution exists?',
        timestamp: new Date('2026-01-17T08:36:00Z')
    },
    {
        role: 'user',
        content: 'Yes, I return an empty array if we complete the loop without finding a pair. Though the problem statement guarantees a solution exists, it\'s good practice.',
        timestamp: new Date('2026-01-17T08:36:30Z')
    }
];

async function runTest() {
    const results = {
        testStartTime: new Date().toISOString(),
        steps: [],
        finalResult: null,
        errors: []
    };

    try {
        // Step 1: Create Session
        results.steps.push({ step: 1, name: 'Creating Session', status: 'started' });
        const startResponse = await fetch(`${API_BASE}/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!startResponse.ok) {
            throw new Error(`Failed to start session: ${startResponse.statusText}`);
        }

        const sessionData = await startResponse.json();
        results.steps[0].status = 'completed';
        results.steps[0].sessionId = sessionData.sessionId;
        results.steps[0].question = sessionData.question.title;

        // Step 2: Submit Code and Transcript
        results.steps.push({ step: 2, name: 'Submitting Code and Transcript', status: 'started' });
        const submitResponse = await fetch(`${API_BASE}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: sessionData.sessionId,
                code: MOCK_CODE,
                transcript: MOCK_TRANSCRIPT
            })
        });

        if (!submitResponse.ok) {
            throw new Error(`Failed to submit: ${submitResponse.statusText}`);
        }

        const result = await submitResponse.json();
        results.steps[1].status = 'completed';

        // Step 3: Verify Report Structure
        results.steps.push({ step: 3, name: 'Verifying Report Structure', status: 'started' });

        const feedback = result.feedback;

        if (!feedback) {
            throw new Error('No feedback object returned');
        }

        // Check required fields
        const structureChecks = {
            hasOverallScore: 'overall_score' in feedback,
            hasCorrectness: 'correctness' in feedback,
            hasDimensionScores: 'dimension_scores' in feedback,
            hasFeedbackMarkdown: 'feedback_markdown' in feedback
        };

        // Check dimensions
        const dimensionChecks = {
            problem_solving: 'problem_solving' in (feedback.dimension_scores || {}),
            algorithmic_thinking: 'algorithmic_thinking' in (feedback.dimension_scores || {}),
            code_implementation: 'code_implementation' in (feedback.dimension_scores || {}),
            testing: 'testing' in (feedback.dimension_scores || {}),
            time_management: 'time_management' in (feedback.dimension_scores || {}),
            communication: 'communication' in (feedback.dimension_scores || {})
        };

        // Check markdown sections
        const markdown = feedback.feedback_markdown || '';
        const sectionChecks = {
            hasSummary: markdown.includes('### Summary'),
            hasProblemSolving: markdown.includes('### Problem-Solving') || markdown.includes('### Problem Solving'),
            hasCodeQuality: markdown.includes('### Code Quality'),
            hasAlgorithmic: markdown.includes('### Algorithmic'),
            hasCommunication: markdown.includes('### Communication'),
            hasStrengths: markdown.includes('### Strengths'),
            hasImprovements: markdown.includes('### Areas for Improvement'),
            hasNextSteps: markdown.includes('### Recommended Next Steps')
        };

        results.steps[2].status = 'completed';
        results.steps[2].checks = {
            structure: structureChecks,
            dimensions: dimensionChecks,
            sections: sectionChecks
        };

        // Step 4: Fetch Session
        results.steps.push({ step: 4, name: 'Retrieving Session Data', status: 'started' });
        const sessionResponse = await fetch(`${API_BASE}/session/${sessionData.sessionId}`);

        if (!sessionResponse.ok) {
            throw new Error(`Failed to fetch session: ${sessionResponse.statusText}`);
        }

        const savedSession = await sessionResponse.json();
        results.steps[3].status = 'completed';
        results.steps[3].sessionStatus = savedSession.status;
        results.steps[3].codeLength = savedSession.code.length;
        results.steps[3].transcriptLength = savedSession.transcript.length;

        // Final Result
        results.finalResult = {
            success: true,
            sessionId: sessionData.sessionId,
            overallScore: feedback.overall_score,
            correctness: feedback.correctness,
            dimensionScores: feedback.dimension_scores,
            feedbackPreview: markdown.substring(0, 500),
            fullFeedbackLength: markdown.length,
            reportUrl: `http://localhost:3000/interview/${sessionData.sessionId}/result`
        };

    } catch (error) {
        results.finalResult = {
            success: false,
            error: error.message
        };
        results.errors.push({
            message: error.message,
            stack: error.stack
        });
    }

    results.testEndTime = new Date().toISOString();

    // Write results to file
    fs.writeFileSync('test-results.json', JSON.stringify(results, null, 2));

    // Also output summary to console
    console.log(JSON.stringify({
        success: results.finalResult?.success || false,
        sessionId: results.finalResult?.sessionId,
        overallScore: results.finalResult?.overallScore,
        error: results.finalResult?.error
    }, null, 2));

    return results;
}

runTest().catch(err => {
    console.error(JSON.stringify({ success: false, error: err.message }));
    process.exit(1);
});
