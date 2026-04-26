require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function test() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Try different model variants
    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-pro"];
    
    for (const m of models) {
        console.log(`Testing model: ${m}`);
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("Hello");
            const response = await result.response;
            console.log(`  Success with ${m}:`, response.text().substring(0, 20));
            break;
        } catch (err) {
            console.log(`  Failed with ${m}:`, err.message);
        }
    }
}
test();
