import Groq from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

// Lazy init to prevent crash on startup if key is missing
let groq: Groq | null = null;

export interface EvaluationResult {
  score: number; // 1-10
  correctness: boolean; // Did code pass edge cases?
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
      score: 1,
      correctness: false,
      feedback_markdown: "## Error\n\nEvaluation service is not configured (missing API Key)."
    };
  }

  if (!groq) {
    groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }

  const systemPrompt = `You are a Senior Technical Interviewer in a coding interview.
Your goal is to evaluate the candidate's solution and their communication based on the provided inputs.

**Data Provided:**
1. **Question:** ${question.title} - ${question.description}
2. **Examples:** ${question.examples.join('\n')}
3. **Candidate Code:** The final code submitted.
4. **Transcript:** The conversation history.

**Evaluation Criteria:**
- **Correctness:** Does the code solve the problem? Does it handle edge cases?
- **Optimality:** Is the time/space complexity roughly optimal?
- **Code Quality:** Naming, structure, readability.

**Output:**
You must return a STRICT JSON object in the following format:
{
  "score": number, // 1-10 integer
  "correctness": boolean,
  "feedback_markdown": "string" // A helpful, constructive review containing code snippets if needed, formatted in Markdown.
}
  
If the code is empty or nonsensical, mark correctness as false and score low.`;

  const userMessage = `
**Candidate Code:**
\`\`\`javascript
${code}
\`\`\`

**Transcript:**
${transcript.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n')}
`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      model: 'llama3-70b-8192',
      temperature: 0.1, // Low temperature for consistent evaluation
      response_format: { type: 'json_object' }
    });

    const content = chatCompletion.choices[0]?.message?.content;
    if (!content) throw new Error("Received empty response from LLM");

    return JSON.parse(content) as EvaluationResult;

  } catch (error) {
    console.error("Evaluation failed:", error);
    return {
      score: 0,
      correctness: false,
      feedback_markdown: "## Evaluation Failed\n\nAn error occurred while generating the report. Please try again later."
    };
  }
}
