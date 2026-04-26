const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HF_TOKEN);
const MODEL_NAME = "meta-llama/Meta-Llama-3-8B-Instruct";

class AIService {
    /**
     * Generate code notes based on problem title and code content
     */
    static async generateNotes(title, code, language) {
        try {
            console.log(`[HF AI] Requesting analysis for: ${title} (${language})`);
            
            const response = await hf.chatCompletion({
                model: MODEL_NAME,
                messages: [
                    {
                        role: "system",
                        content: `You are a technical documenter for a coding dashboard. 
                        Analyze the code provided by the user. 
                        Provide a response in strictly valid JSON format with the following keys:
                        1. "summary": A one-sentence summary.
                        2. "approach": A brief technical explanation.
                        3. "tags": An array of technical tags.
                        4. "difficulty": "Easy", "Medium", or "Hard".
                        5. "topic": The primary category.
                        6. "cleanedCode": A well-commented version of the code.
                        Respond ONLY with JSON.`
                    },
                    {
                        role: "user",
                        content: `Problem: ${title}\nLanguage: ${language}\nCode:\n${code}`
                    }
                ],
                max_tokens: 1000,
                temperature: 0.1,
            });

            const text = response.choices[0].message.content;
            console.log(`[HF AI] Raw response received (length: ${text.length})`);

            // Extract JSON from the response
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn("[HF AI] Failed to find JSON in response:", text);
                throw new Error("Failed to parse JSON from Hugging Face response");
            }

            const parsed = JSON.parse(jsonMatch[0]);
            console.log("[HF AI] Successfully parsed analysis JSON");
            return parsed;
        } catch (error) {
            console.error("[HF AI ERROR]", error.message);
            // Fallback content if AI fails
            return {
                summary: `Analysis of ${title || 'code'}.`,
                approach: "Algorithm implementation focused on core logic.",
                tags: [language || "coding", "algorithm"],
                difficulty: "Medium",
                topic: "General",
                cleanedCode: code
            };
        }
    }
}

module.exports = AIService;
