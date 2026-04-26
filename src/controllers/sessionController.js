const SessionModel = require('../models/SessionModel');
const ProblemModel = require('../models/ProblemModel');

class SessionController {

    // Start a new session
    static async startSession(req, res) {
        const { source, problem } = req.body;
        const userId = req.user.id; // From Auth Middleware

        if (!problem || !problem.title || !problem.slug) {
            console.log('[SESSION] REJECTED 400 (startSession) - Missing data:', req.body);
            return res.status(400).send('Problem details required');
        }

        console.log(`[SESSION] Start request received for user ${userId} and problem ${problem.slug}`);
        try {

            // 1. Find or Create Problem
            let problemId;
            const existingProblem = await ProblemModel.findBySlug(problem.slug);

            if (existingProblem) {
                problemId = existingProblem.id;
            } else {
                const newProblem = await ProblemModel.create(problem);
                problemId = newProblem.id;
            }

            // 2. Create Session
            const newSession = await SessionModel.create(userId, problemId);
            console.log(`[SESSION] Session started: ${newSession.id}`);
            res.json({ sessionId: newSession.id, status: 'started' });


        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }

    // Pulse (Heartbeat)
    static async pulse(req, res) {
        const { sessionId, activeTimeDelta } = req.body;
        const userId = req.user.id;

        if (!sessionId || !activeTimeDelta) {
            console.log('[SESSION] REJECTED 400 (pulse) - Missing data:', req.body);
            return res.status(400).send('Missing data');
        }

        console.log(`[SESSION] Pulse received for session ${sessionId} (delta: ${activeTimeDelta}s)`);
        try {

            await SessionModel.addActiveTime(sessionId, userId, activeTimeDelta);
            res.send('Pulse received');
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }

    // End Session
    static async endSession(req, res) {
        const { sessionId, status, code, language, fileName, framework, errorCount } = req.body;
        const userId = req.user.id;

        if (!sessionId || !code) {
            console.log('[SESSION] REJECTED 400 (endSession) - Missing data:', req.body);
            return res.status(400).send('Missing data');
        }

        console.log(`[SESSION] End request for session ${sessionId}`);
        try {

            // 1. End the session
            await SessionModel.end(sessionId, userId, status || 'completed');

            // 2. Save Snapshot
            await SessionModel.saveSnapshot(
                sessionId,
                code,
                language || 'unknown',
                'submission',
                fileName || null,
                framework || null,
                errorCount || 0
            );

            // 3. Real AI Generation via Gemini
            const AIService = require('../services/aiService');
            const NoteModel = require('../models/NoteModel');
            
            const session = await SessionModel.getById(sessionId);
            const ProblemModel = require('../models/ProblemModel');
            const problemData = await ProblemModel.findById(session.problemId);
            const displayTitle = fileName || (problemData ? problemData.title : 'Unknown Problem');
            
            console.log(`[SESSION] Triggering AI for "${displayTitle}" (Session: ${sessionId})`);
            const aiResult = await AIService.generateNotes(displayTitle, code, language);

            // 4. Update Problem Metadata (Topic/Difficulty/Tags)
            const finalTags = [...new Set([aiResult.topic, ...(aiResult.tags || [])])];
            console.log(`[SESSION] Updating problem metadata: ${aiResult.difficulty}, Tags: ${finalTags.join(', ')}`);
            await ProblemModel.updateMetadata(session.problemId, {
                difficulty: aiResult.difficulty,
                tags: finalTags
            });

            // 5. Create the detailed Note
            console.log(`[SESSION] Creating note in DB for session ${sessionId}...`);
            await NoteModel.create({
                sessionId,
                userId,
                problemId: session.problemId,
                summary: aiResult.summary,
                approach: aiResult.approach,
                solutionCode: aiResult.cleanedCode
            });

            console.log(`[SESSION SUCCESS] AI Note created successfully for ${displayTitle}`);
            res.json({ status: 'ended', message: 'Session closed and AI analysis completed.' });




        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }
}

module.exports = SessionController;
