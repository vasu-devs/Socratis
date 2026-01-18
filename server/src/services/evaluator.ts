import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Lazy init to prevent crash on startup if key is missing
let groq: Groq | null = null;

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
  code_issues: CodeIssue[]; // NEW: Specific line-by-line issues
  transcript_issues: TranscriptIssue[]; // NEW: Specific wrong statements
  feedback_markdown: string; // Detailed feedback
}

export async function evaluateSession(
  question: { title: string; description: string; examples: string[] },
  code: string,
  transcript: Array<{ role: 'ai' | 'user'; content: string }>
): Promise<EvaluationResult> {

  if (!process.env.GROQ_API_KEY) {
    console.warn("GROQ_API_KEY missing. Returning stub evaluation.");
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
      code_issues: [],
      transcript_issues: [],
      feedback_markdown: "## Error\n\nEvaluation service is not configured (missing API Key)."
    };
  }

  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  const systemPrompt = `You are a Senior Technical Interviewer at a FAANG company conducting a rigorous technical evaluation.

**Problem Context:**
- Question: ${question.title}
- Description: ${question.description}
- Examples: ${question.examples.join('\n')}

**Your Task:**
Analyze the candidate's performance across 6 dimensions using BOTH their code and conversation transcript.
CRITICALLY: You MUST identify SPECIFIC errors with exact line numbers and exact quotes.

**6-Dimensional Evaluation Framework:**

1. **Problem-Solving Approach (1-10)**
   - Did they clarify requirements before coding?
   - Did they discuss multiple approaches?
   - Did they break down the problem logically?

2. **Algorithmic Thinking (1-10)**
   - Did they identify optimal time/space complexity?
   - Did they discuss trade-offs?
   - Pattern recognition and data structure selection?

3. **Code Implementation (1-10)**
   - Clean, readable, well-structured code?
   - Proper variable naming and organization?
   - Bug-free or minimal syntax errors?

4. **Testing & Edge Cases (1-10)**
   - Did they dry-run their solution?
   - Did they identify edge cases (empty input, negatives, duplicates)?
   - Did they test their logic?

5. **Time Management (1-10)**
   - Efficient use of interview time?
   - Didn't get stuck too long on one approach?
   - Balanced planning vs. coding?

6. **Communication (1-10)**
   - Clear explanations of their thinking?
   - Responsive to interviewer questions/hints?
   - Collaborative and professional tone?

**Output Requirements:**
Return STRICT JSON with this exact structure:
{
  "overall_score": number, // 1-10 (weighted average or holistic assessment)
  "correctness": boolean, // Does the code solve the problem?
  "dimension_scores": {
    "problem_solving": number,
    "algorithmic_thinking": number,
    "code_implementation": number,
    "testing": number,
    "time_management": number,
    "communication": number
  },
  "code_issues": [
    {
      "line_number": number,
      "code_snippet": "the exact code on that line",
      "issue": "what's wrong",
      "suggestion": "how to fix it",
      "severity": "error" | "warning" | "info"
    }
  ],
  "transcript_issues": [
    {
      "quote": "exact quote from candidate",
      "issue": "what was wrong with this statement",
      "what_should_have_been_said": "correct answer",
      "category": "concept" | "complexity" | "approach" | "communication"
    }
  ],
  "feedback_markdown": "string"
}

**CRITICAL REQUIREMENTS FOR code_issues:**
- You MUST include at least 1 issue if there are ANY bugs, syntax errors, or suboptimal choices
- Line numbers must be 1-indexed (first line = 1)
- Include the EXACT code snippet from that line
- Severity levels:
  - "error": Bug that would cause wrong output or crash
  - "warning": Suboptimal but works (e.g., O(n²) when O(n) possible)
  - "info": Style issues, naming, etc.

**CRITICAL REQUIREMENTS FOR transcript_issues:**
- Identify ANY statements that show misunderstanding
- Include the EXACT quote from the candidate
- Categories:
  - "concept": Misunderstood a programming concept
  - "complexity": Wrong about time/space complexity
  - "approach": Chose suboptimal approach
  - "communication": Unclear or incomplete explanation

**Feedback Markdown Structure:**
The feedback_markdown MUST include these sections (use ### for headers):

### Executive Summary
Brief 2-3 sentence overview of performance with hire/no-hire leaning.

### Specific Code Issues
For EACH issue in code_issues, explain:
- Line X: [issue] - [suggestion]

### Specific Communication Gaps
For EACH issue in transcript_issues, explain:
- When you said "[quote]" - [what was wrong] - Should have said: [correct]

### Strengths
What did they do particularly well? Be specific.

### Areas for Improvement
Constructive, actionable feedback on weaknesses.

### Edge Cases Missed
List specific edge cases they didn't consider.

### Recommended Next Steps
2-3 specific, actionable items for interview preparation.

**Important Guidelines:**
- If code is empty/minimal, still identify what was attempted
- If transcript is empty, note lack of verbal communication in both dimensions and transcript_issues
- Be constructive but honest - this is a real interview
- Reference specific lines and quotes - vague feedback is not acceptable`;

  const userMessage = `
**Candidate's Final Code (with line numbers):**
\`\`\`
${code ? code.split('\n').map((line, i) => `${i + 1}: ${line}`).join('\n') : '// No code submitted'}
\`\`\`

**Interview Transcript:**
${transcript && transcript.length > 0
      ? transcript.map((t, i) => `[${i + 1}] ${t.role === 'ai' ? 'INTERVIEWER' : 'CANDIDATE'}: ${t.content}`).join('\n')
      : '(No transcript available - candidate did not speak)'}

**Your Evaluation:**
Provide comprehensive JSON evaluation with specific code_issues and transcript_issues. Do NOT leave these arrays empty if there are any issues.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.2, // Slightly higher for nuanced feedback
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) throw new Error("Received empty response from LLM");

    const result = JSON.parse(content) as EvaluationResult;

    // Validate structure and provide defaults for new fields
    if (!result.dimension_scores) {
      throw new Error("Invalid response structure - missing dimension_scores");
    }

    // Ensure new fields have defaults
    result.code_issues = result.code_issues || [];
    result.transcript_issues = result.transcript_issues || [];

    return result;

  } catch (error) {
    console.error("Evaluation failed:", error);
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
      code_issues: [],
      transcript_issues: [],
      feedback_markdown: "## Evaluation Failed\n\nAn error occurred while generating the report. Please try again later.\n\n**Error Details:**\n" + (error instanceof Error ? error.message : String(error))
    };
  }
}
