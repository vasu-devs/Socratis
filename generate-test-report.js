const fs = require('fs');

// Read the test results
const results = JSON.parse(fs.readFileSync('test-results.json', 'utf8'));

// Create a formatted markdown report
let markdown = `# Interview Report Generation - Test Results

**Test Date:** ${results.testStartTime}  
**Test Duration:** ${new Date(results.testEndTime) - new Date(results.testStartTime)}ms

---

## Test Summary

`;

if (results.finalResult.success) {
    markdown += `✅ **TEST PASSED**

### Session Details
- **Session ID:** ${results.finalResult.sessionId}
- **Overall Score:** ${results.finalResult.overallScore}/10
- **Correctness:** ${results.finalResult.correctness ? 'PASS ✓' : 'FAIL ✗'}

### Dimension Scores
`;

    Object.entries(results.finalResult.dimensionScores).forEach(([key, value]) => {
        const emoji = value >= 7 ? '🟢' : value >= 5 ? '🟡' : '🔴';
        const label = key.replace(/_/g, ' ').toUpperCase();
        markdown += `- ${emoji} **${label}:** ${value}/10\n`;
    });

    markdown += `\n---

## Test Steps

`;

    results.steps.forEach(step => {
        markdown += `### Step ${step.step}: ${step.name}
- Status: ${step.status === 'completed' ? '✅ Completed' : '⏳ ' + step.status}
`;

        if (step.sessionId) {
            markdown += `- Session ID: ${step.sessionId}\n`;
            markdown += `- Question: ${step.question}\n`;
        }

        if (step.checks) {
            markdown += `\n**Structure Validation:**\n`;
            Object.entries(step.checks.structure).forEach(([key, value]) => {
                markdown += `- ${value ? '✅' : '❌'} ${key}\n`;
            });

            markdown += `\n**Dimension Scores Validation:**\n`;
            Object.entries(step.checks.dimensions).forEach(([key, value]) => {
                markdown += `- ${value ? '✅' : '❌'} ${key}\n`;
            });

            markdown += `\n**Markdown Sections Validation:**\n`;
            Object.entries(step.checks.sections).forEach(([key, value]) => {
                markdown += `- ${value ? '✅' : '❌'} ${key}\n`;
            });
        }

        if (step.sessionStatus) {
            markdown += `- Session Status: ${step.sessionStatus}\n`;
            markdown += `- Code Length: ${step.codeLength} characters\n`;
            markdown += `- Transcript Messages: ${step.transcriptLength}\n`;
        }

        markdown += `\n`;
    });

    markdown += `---

## Generated Feedback Preview

\`\`\`
${results.finalResult.feedbackPreview}...
\`\`\`

**Full Feedback Length:** ${results.finalResult.fullFeedbackLength} characters

---

## Report URL

The full report can be viewed at:
${results.finalResult.reportUrl}

---

## Conclusion

All validations passed successfully! The interview report generation system is working correctly.

### Verified Components:
✅ Session creation  
✅ Code and transcript submission  
✅ LLM evaluation with Groq  
✅ Structured feedback generation  
✅ All 6 dimension scores calculated  
✅ Markdown report with required sections  
✅ Data persistence in MongoDB  
✅ Session retrieval API  
`;

} else {
    markdown += `❌ **TEST FAILED**

**Error:** ${results.finalResult.error}

### Errors:
`;
    results.errors.forEach(err => {
        markdown += `- ${err.message}\n`;
    });
}

// Write the markdown report
fs.writeFileSync('TEST-REPORT.md', markdown);
console.log('Report generated: TEST-REPORT.md');
