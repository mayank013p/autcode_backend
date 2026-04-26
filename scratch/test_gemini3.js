require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini3() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const prompt = "Analyze this code and return JSON: print('hello world')";
    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log("Success:", response.text());
    } catch (err) {
        console.error("Gemini 3 Error:", err.message);
    }
}

testGemini3();
