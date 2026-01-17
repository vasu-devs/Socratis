import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Lazy init to prevent crash on startup if key is missing
let groq: Groq | null = null;

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
Analyze the candidate's performance across 6 critical dimensions using BOTH their code and conversation transcript.

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
  "feedback_markdown": "string"
}

**Feedback Markdown Structure:**
The feedback_markdown MUST include these sections (use ### for headers):

### Summary
Brief 2-3 sentence overview of performance.

### Problem-Solving Approach
Analysis of how they approached the problem based on transcript.

### Code Quality & Implementation
Detailed code review (readability, structure, correctness).

### Algorithmic Efficiency
Time/Space complexity analysis. Was it optimal?

### Communication & Collaboration
How well did they explain? Did they respond to hints?

### Strengths
What did they do particularly well?

### Areas for Improvement
Constructive feedback on weaknesses.

### Missing Edge Cases
Specific edge cases they didn't consider.

### Recommended Next Steps
Actionable advice for interview preparation.

**Important Guidelines:**
- If code is empty/minimal, score low but still provide all sections
- If transcript is empty, note lack of verbal communication in Communication score
- Be constructive but honest
- Reference specific lines of code or conversation when possible
- Provide actionable feedback`;

  const userMessage = `
**Candidate's Final Code:**
\`\`\`javascript
${code || '// No code submitted'}
\`\`\`

**Interview Transcript:**
${transcript && transcript.length > 0
      ? transcript.map(t => `${t.role === 'ai' ? 'INTERVIEWER' : 'CANDIDATE'}: ${t.content}`).join('\n')
      : '(No transcript available - candidate may not have spoken or feature was not enabled)'}

**Your Evaluation:**`;

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

    // Validate structure
    if (!result.dimension_scores) {
      throw new Error("Invalid response structure - missing dimension_scores");
    }

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
      feedback_markdown: "## Evaluation Failed\n\nAn error occurred while generating the report. Please try again later.\n\n**Error Details:**\n" + (error instanceof Error ? error.message : String(error))
    };
  }
}
