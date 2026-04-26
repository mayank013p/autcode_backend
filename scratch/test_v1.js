require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testV1() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log("Testing with apiVersion: v1");
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
        const result = await model.generateContent("Hello");
        const response = await result.response;
        console.log("  Success with v1:", response.text().substring(0, 20));
    } catch (err) {
        console.log("  Failed with v1:", err.message);
    }
}
testV1();
