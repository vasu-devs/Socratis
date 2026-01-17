

async function submitInterview() {
    try {
        const response = await fetch('http://localhost:4000/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                sessionId: 'socratis-interview',
                code: `function twoSum(nums, target) {
    const map = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (map.has(complement)) {
            return [map.get(complement), i];
        }
        map.set(nums[i], i);
    }
    return [];
}`,
                transcript: []
            })
        });

        const data = await response.json();
        console.log('✅ Submission successful!');
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

submitInterview();
