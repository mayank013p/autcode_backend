const { HfInference } = require('@huggingface/inference');

const hf = new HfInference(process.env.HF_TOKEN);
const PRIMARY_MODEL = "meta-llama/Meta-Llama-3-8B-Instruct";
const BACKUP_MODEL = "mistralai/Mistral-7B-Instruct-v0.3";

class AIService {
    /**
     * Generate code notes based on problem title and code content
     */
    static async generateNotes(title, code, language) {
        const aiPrompt = `
        System: You are a technical documenter. Analyze the code and respond ONLY with a JSON object.
        JSON Structure:
        {
            "summary": "one sentence",
            "approach": "2-3 sentences",
            "tags": ["tag1", "tag2"],
            "difficulty": "Easy" | "Medium" | "Hard",
            "topic": "Category",
            "cleanedCode": "code with concise comments"
        }

        User:
        Problem: ${title}
        Language: ${language}
        Code:
        ${code}
        `;

        try {
            console.log(`[AI] Requesting analysis for: ${title} (${language})`);
            
            let response;
            try {
                response = await hf.chatCompletion({
                    model: PRIMARY_MODEL,
                    messages: [{ role: "user", content: aiPrompt }],
                    max_tokens: 2500, // Increased to prevent truncation
                    temperature: 0.1,
                });
            } catch (err) {
                console.warn(`[AI] Primary model failed, trying backup...`);
                response = await hf.chatCompletion({
                    model: BACKUP_MODEL,
                    messages: [{ role: "user", content: aiPrompt }],
                    max_tokens: 2500,
                    temperature: 0.1,
                });
            }

            let text = response.choices[0].message.content.trim();
            console.log(`[AI] Response received (length: ${text.length})`);

            // Extract JSON block
            const jsonStart = text.indexOf('{');
            let jsonEnd = text.lastIndexOf('}');
            
            if (jsonStart === -1) throw new Error("No JSON start found");
            
            // If the JSON is cut off (missing closing brace), try to append it
            if (jsonEnd === -1 || jsonEnd < jsonStart) {
                console.warn("[AI] JSON seems truncated, attempting repair...");
                text += '\n"}'; // Attempt to close potential open string and object
                jsonEnd = text.lastIndexOf('}');
            }

            const jsonString = text.substring(jsonStart, jsonEnd + 1);
            const parsed = JSON.parse(jsonString);
            
            return {
                summary: parsed.summary || `Analysis of ${title}`,
                approach: parsed.approach || "Algorithm implementation.",
                tags: parsed.tags || [language, "algorithm"],
                difficulty: parsed.difficulty || "Medium",
                topic: parsed.topic || "General",
                cleanedCode: parsed.cleanedCode || code
            };

        } catch (error) {
            console.error("[AI ERROR]", error.message);
            return {
                summary: `Note for ${title}.`,
                approach: "Analysis was partially completed but hit a parsing limit.",
                tags: [language || "coding", "algorithm"],
                difficulty: "Medium",
                topic: "General",
                cleanedCode: code
            };
        }
    }
}

module.exports = AIService;
