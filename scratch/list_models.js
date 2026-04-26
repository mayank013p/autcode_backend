require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There isn't a direct listModels in the simple SDK, usually you just try them.
    // Let's try 'gemini-1.5-flash-latest'
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Trying gemini-1.5-flash...");
    try {
        const result = await model.generateContent("test");
        console.log("Success!");
    } catch (err) {
        console.log("Error:", err.message);
    }
}
listModels();
