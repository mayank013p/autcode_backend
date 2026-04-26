require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini2() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = "Analyze this code and return JSON: print('hello world')";
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("Success:", response.text());
    } catch (err) {
        console.error("Gemini 2 Error:", err.message);
    }
}

testGemini2();
