require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
    console.log("Using API Key:", process.env.GEMINI_API_KEY ? "FOUND" : "MISSING");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = "Say hello in JSON format: { 'message': 'hello' }";
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("Response text:", response.text());
    } catch (err) {
        console.error("Gemini Error:", err.message);
    }
}

testGemini();
