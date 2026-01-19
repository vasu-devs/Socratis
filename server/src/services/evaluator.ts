/**
 * ============================================================================
 * SOCRATIS REPORT AGENT - Dedicated Evaluation Agent
 * ============================================================================
 * 
 * This is a SPECIALIZED AGENT whose sole purpose is generating world-class
 * technical interview reports. It is completely separate from the Interview
 * Agent that conducts the live conversation.
 * 
 * ARCHITECTURE:
 * - Interview Agent (Python/LiveKit): Real-time conversation, Socratic questioning
 * - Report Agent (This file): Post-interview forensic analysis, detailed reports
 * 
 * The Report Agent analyzes:
 * 1. The candidate's final code (line-by-line)
 * 2. The full interview transcript
 * 3. The problem context and requirements
 * 
 * It produces:
 * - Specific code issues with line numbers and suggestions
 * - Specific transcript issues with quotes and corrections
 * - Dimension scores with justifications
 * - Executive summary and hire recommendation
 */

import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Lazy init to prevent crash on startup if key is missing
let groq: Groq | null = null;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CodeIssue {
  line_number: number;
  code_snippet: string;
  issue: string;
  suggestion: string;
  severity: 'error' | 'warning' | 'info';
}

export interface TranscriptIssue {
  quote: string;
  issue: string;
  what_should_have_been_said: string;
  category: 'concept' | 'complexity' | 'approach' | 'communication';
}

export interface EvaluationResult {
  overall_score: number; // 1-10
  correctness: boolean;
  dimension_scores: {
    problem_solving: number; // 1-10
    algorithmic_thinking: number; // 1-10
    code_implementation: number; // 1-10
    testing: number; // 1-10
    time_management: number; // 1-10
    communication: number; // 1-10
  };
  code_issues: CodeIssue[];
  transcript_issues: TranscriptIssue[];
  feedback_markdown: string;
}

// ============================================================================
// REPORT AGENT SYSTEM PROMPT
// ============================================================================
// This is the "brain" of the Report Agent - a carefully crafted prompt that
// turns the LLM into a world-class technical interview evaluator

const REPORT_AGENT_IDENTITY = `
# 🎯 SOCRATIS REPORT AGENT - IDENTITY

You are the **Socratis Report Agent**, a world-class technical interview evaluator used by elite tech companies (FAANG, top startups, hedge funds) for hiring decisions.

You are NOT the interviewer. The interview has already been conducted by a separate Interview Agent.
Your SOLE PURPOSE is to analyze the interview artifacts and produce a comprehensive, actionable report.

## YOUR CHARACTERISTICS:
- **Forensic Precision**: You cite EXACT code lines and EXACT quotes from the transcript
- **Brutal Honesty**: You do NOT sugarcoat issues. Hiring managers rely on your candor.
- **Specific Actionable Feedback**: Every criticism comes with a specific suggestion for improvement
- **Evidence-Based**: Every claim is backed by specific evidence from the code or transcript
- **Structured Output**: You follow the exact reporting format required

## WHAT YOU ANALYZE:
1. **The Code**: Line-by-line analysis for bugs, style, performance, and best practices
2. **The Transcript**: What the candidate said, what they got wrong, what they understood
3. **The Gap**: Discrepancies between what the candidate CLAIMED and what their code DOES (hallucinations)
`;

function buildReportAgentPrompt(
  question: { title: string; description: string; examples: string[] }
): string {
  return `${REPORT_AGENT_IDENTITY}

---

# 📋 PROBLEM CONTEXT

**Problem Title:** ${question.title}

**Problem Description:**
${question.description}

**Examples:**
${question.examples.join('\n')}

---

# 🚨 MANDATORY OUTPUT REQUIREMENTS

## RULE 1: code_issues MUST contain 3-5 items
Even if the code is "correct", find:
- **Style issues**: Variable naming, formatting, unnecessary complexity
- **Performance issues**: Suboptimal algorithms, redundant operations
- **Best practice violations**: Missing error handling, no input validation
- **Improvement opportunities**: Cleaner alternatives, more readable approaches
- **Edge case gaps**: Cases not explicitly handled
- If you cannot find 3 issues, you are not looking hard enough

## RULE 2: transcript_issues MUST contain 3-5 items
Even if communication was "good", find:
- **Incomplete explanations**: Where they could have explained more
- **Vague language**: "I think maybe..." instead of confident statements
- **Missing context**: Didn't explain WHY they made a choice
- **Technical inaccuracies**: Wrong complexity, wrong terminology
- **Missed opportunities**: Could have mentioned trade-offs, alternatives
- If the transcript is empty: Create one issue noting "Candidate did not verbalize their thought process"

## RULE 3: Direct Quotes Only
- For transcript_issues, the "quote" field MUST be an EXACT quote from the transcript
- Do NOT paraphrase or summarize
- If you cannot find a direct quote, use the closest statement

## RULE 4: Line Numbers are 1-indexed
- Code line numbers start at 1, not 0

---

# 📝 REQUIRED OUTPUT STRUCTURE

Your response MUST be valid JSON with this exact structure:

\`\`\`json
{
  "overall_score": <number 1-10>,
  "correctness": <boolean - does the code solve the problem?>,
  "dimension_scores": {
    "problem_solving": <1-10>,
    "algorithmic_thinking": <1-10>,
    "code_implementation": <1-10>,
    "testing": <1-10>,
    "time_management": <1-10>,
    "communication": <1-10>
  },
  "code_issues": [
    {
      "line_number": <number>,
      "code_snippet": "<exact code from that line>",
      "issue": "<specific problem description>",
      "suggestion": "<concrete fix or improvement>",
      "severity": "error" | "warning" | "info"
    }
  ],
  "transcript_issues": [
    {
      "quote": "<exact quote from candidate>",
      "issue": "<why this was problematic or could be improved>",
      "what_should_have_been_said": "<better phrasing or explanation>",
      "category": "concept" | "complexity" | "approach" | "communication"
    }
  ],
  "feedback_markdown": "<full markdown report - see format below>"
}
\`\`\`

---

# 📄 FEEDBACK_MARKDOWN FORMAT

The feedback_markdown field MUST contain ALL of these sections with EXACT headers:

## ⚡ Approach & Complexity
- **Algorithm Used:** [Name: brute force, hash map, two-pointer, sliding window, etc.]
- **Time Complexity:** O(?) with 1-sentence justification
- **Space Complexity:** O(?) with 1-sentence justification
- **Optimal?:** Yes/No. If No, state what optimal would be.

## 🐛 Code Review
List 3-5 specific issues:
- **[Line X]** \`code snippet\` → **Issue:** [description] → **Fix:** [suggestion]

## 🗣️ Communication Review
Quote at least 2 specific statements:
- ✅ **Strength:** "When you said '[quote]' - this showed [positive trait]"
- ⚠️ **Improvement:** "When you said '[quote]' - this was [issue]. Better: [suggestion]"
- **Pre-coding explanation?**: Did they discuss approach before coding? (Yes/No with evidence)

## 🚨 Hallucination Check
Check for discrepancies between claims and code:
- ✅ **No hallucinations detected** OR
- ⚠️ **Found:** "[quote claiming X]" but code actually does [Y]

Common hallucinations:
- "This is O(n)" when actually O(n²)
- "Handles empty arrays" but no check exists
- "Returns indices" but returns values

## 📊 Dimension Breakdown
| Dimension | Score | Justification |
|-----------|-------|---------------|
| Problem-Solving | X/10 | [1-sentence reason] |
| Algorithmic Thinking | X/10 | [1-sentence reason] |
| Code Implementation | X/10 | [1-sentence reason] |
| Testing | X/10 | [1-sentence reason] |
| Time Management | X/10 | [1-sentence reason] |
| Communication | X/10 | [1-sentence reason] |

## 📋 Verdict
**Overall Score: X/10**
**Recommendation:** Strong Hire / Hire / Lean No Hire / No Hire
**Summary:** [2-3 sentences with specific evidence]

---

Now analyze the following interview artifacts:
`;
}

// ============================================================================
// REPORT AGENT EXECUTION
// ============================================================================

export async function evaluateSession(
  question: { title: string; description: string; examples: string[] },
  code: string,
  transcript: Array<{ role: 'ai' | 'user'; content: string }>
): Promise<EvaluationResult> {

  console.log('[REPORT AGENT] Starting evaluation...');
  console.log(`[REPORT AGENT] Problem: ${question.title}`);
  console.log(`[REPORT AGENT] Code length: ${code?.length || 0} chars`);
  console.log(`[REPORT AGENT] Transcript entries: ${transcript?.length || 0}`);

  if (!process.env.GROQ_API_KEY) {
    console.warn("[REPORT AGENT] GROQ_API_KEY missing. Returning stub evaluation.");
    return {
      overall_score: 1,
      correctness: false,
      dimension_scores: {
        problem_solving: 1,
        algorithmic_thinking: 1,
        code_implementation: 1,
        testing: 1,
        time_management: 1,
        communication: 1
      },
      code_issues: [{
        line_number: 1,
        code_snippet: "// No code",
        issue: "Evaluation service is not configured",
        suggestion: "Please configure GROQ_API_KEY in environment variables",
        severity: "error"
      }],
      transcript_issues: [{
        quote: "N/A",
        issue: "Evaluation service is not configured (missing API Key)",
        what_should_have_been_said: "N/A",
        category: "communication"
      }],
      feedback_markdown: "## ⚠️ Evaluation Error\n\nThe Report Agent could not be initialized.\n\n**Reason:** Missing GROQ_API_KEY environment variable."
    };
  }

  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('[REPORT AGENT] Groq client initialized');
  }

  // Build the system prompt
  const systemPrompt = buildReportAgentPrompt(question);

  // Build the user message with artifacts
  const numberedCode = code
    ? code.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n')
    : '// No code submitted';

  const formattedTranscript = transcript && transcript.length > 0
    ? transcript.map((t, i) => {
      const role = t.role === 'ai' ? '🤖 INTERVIEWER' : '👤 CANDIDATE';
      return `[${String(i + 1).padStart(2, '0')}] ${role}: ${t.content}`;
    }).join('\n\n')
    : '(No transcript available - candidate did not verbalize their thought process)';

  const userMessage = `
# INTERVIEW ARTIFACTS TO ANALYZE

## 💻 CANDIDATE'S FINAL CODE
\`\`\`
${numberedCode}
\`\`\`

## 🎙️ INTERVIEW TRANSCRIPT
${formattedTranscript}

---

# YOUR TASK
Generate a comprehensive JSON evaluation following the exact structure specified.
Remember:
- code_issues MUST have 3-5 items
- transcript_issues MUST have 3-5 items
- Use EXACT quotes and line numbers
- Be specific, actionable, and evidence-based
`;

  try {
    console.log('[REPORT AGENT] Sending request to Groq...');

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      model: 'llama-3.3-70b-versatile', // Using the most capable model for best analysis
      temperature: 0.3, // Low temperature for consistent, focused analysis
      max_tokens: 4096, // Ensure we have room for detailed response
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Received empty response from Report Agent");
    }

    console.log('[REPORT AGENT] Response received, parsing...');
    const result = JSON.parse(content) as EvaluationResult;

    // Validate required fields
    if (!result.dimension_scores) {
      throw new Error("Invalid response structure - missing dimension_scores");
    }

    // Ensure arrays have defaults (shouldn't be needed with new prompt, but safety)
    result.code_issues = result.code_issues || [];
    result.transcript_issues = result.transcript_issues || [];

    console.log(`[REPORT AGENT] Evaluation complete:`);
    console.log(`[REPORT AGENT] - Overall score: ${result.overall_score}/10`);
    console.log(`[REPORT AGENT] - Code issues found: ${result.code_issues.length}`);
    console.log(`[REPORT AGENT] - Transcript issues found: ${result.transcript_issues.length}`);
    console.log(`[REPORT AGENT] - Correctness: ${result.correctness}`);

    return result;

  } catch (error) {
    console.error("[REPORT AGENT] Evaluation failed:", error);
    return {
      overall_score: 0,
      correctness: false,
      dimension_scores: {
        problem_solving: 0,
        algorithmic_thinking: 0,
        code_implementation: 0,
        testing: 0,
        time_management: 0,
        communication: 0
      },
      code_issues: [{
        line_number: 1,
        code_snippet: "// Error during evaluation",
        issue: "Report Agent encountered an error",
        suggestion: "Please try submitting again",
        severity: "error"
      }],
      transcript_issues: [{
        quote: "N/A",
        issue: "Report Agent could not complete analysis",
        what_should_have_been_said: "N/A",
        category: "communication"
      }],
      feedback_markdown: `## ⚠️ Evaluation Error

The Report Agent encountered an error while analyzing your interview.

**Error Details:**
${error instanceof Error ? error.message : String(error)}

Please try submitting your interview again. If the problem persists, contact support.`
    };
  }
}
