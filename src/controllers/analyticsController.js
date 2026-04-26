const db = require('../db');

class AnalyticsController {

    // GET /api/analytics/summary
    static async getSummary(req, res) {
        const userId = req.user.id;

        try {
            // 1. Problems Solved (Unique problems with a completed session)
            const solvedResult = await db.query(
                'SELECT COUNT(DISTINCT "problemId") FROM "CodingSession" WHERE "userId" = $1 AND status = $2',
                [userId, 'completed']
            );
            const totalSolved = parseInt(solvedResult.rows[0].count);

            // 2. Solved this week
            const weeklySolvedResult = await db.query(
                `SELECT COUNT(DISTINCT "problemId") FROM "CodingSession" 
                 WHERE "userId" = $1 AND status = $2 AND "startTime" > NOW() - INTERVAL '7 days'`,
                [userId, 'completed']
            );
            const weeklySolved = parseInt(weeklySolvedResult.rows[0].count);

            // 3. Accuracy (Assuming Solved / Unique Attempted)
            const attemptedResult = await db.query(
                'SELECT COUNT(DISTINCT "problemId") FROM "CodingSession" WHERE "userId" = $1',
                [userId]
            );
            const totalAttempted = parseInt(attemptedResult.rows[0].count);
            const accuracy = totalAttempted > 0 ? (totalSolved / totalAttempted * 100).toFixed(1) : 0;

            // 4. Time Spent (Sum of activeTime across all sessions)
            const timeResult = await db.query(
                'SELECT SUM("activeTime") as total_seconds FROM "CodingSession" WHERE "userId" = $1',
                [userId]
            );
            const totalSeconds = parseInt(timeResult.rows[0].total_seconds || 0);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const timeSpentStr = `${hours}h ${minutes}m`;

            // 5. Current Streak (Postgres window function for island/gaps)
            const streakResult = await db.query(
                `WITH dates AS (
                    SELECT DISTINCT DATE_TRUNC('day', "startTime") as day
                    FROM "CodingSession"
                    WHERE "userId" = $1
                ),
                groups AS (
                    SELECT day,
                    day - (ROW_NUMBER() OVER (ORDER BY day) * INTERVAL '1 day') as grp
                    FROM dates
                )
                SELECT COUNT(*) as streak
                FROM groups
                GROUP BY grp
                ORDER BY MAX(day) DESC
                LIMIT 1`,
                [userId]
            );
            const currentStreak = streakResult.rows.length > 0 ? parseInt(streakResult.rows[0].streak) : 0;

            res.json({
                totalSolved,
                weeklySolved,
                accuracy: `${accuracy}%`,
                timeSpent: timeSpentStr,
                currentStreak
            });

        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }

    // GET /api/analytics/activity (7-day chart)
    static async getActivity(req, res) {
        const userId = req.user.id;
        try {
            const result = await db.query(
                `SELECT 
                    TO_CHAR(d.day, 'Dy') as label,
                    COUNT(DISTINCT CASE WHEN s.status = 'completed' THEN s."problemId" END) as solved,
                    COUNT(DISTINCT s."problemId") as attempted
                FROM (
                    SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day'::interval) as day
                ) d
                LEFT JOIN "CodingSession" s ON DATE_TRUNC('day', s."startTime") = d.day AND s."userId" = $1
                GROUP BY d.day
                ORDER BY d.day ASC`,
                [userId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }

    // GET /api/analytics/topics (Pie Chart)
    static async getTopics(req, res) {
        const userId = req.user.id;
        try {
            const result = await db.query(
                `SELECT unnest(p.tags) as topic, COUNT(DISTINCT s."problemId") as count
                 FROM "CodingSession" s
                 JOIN "Problem" p ON s."problemId" = p.id
                 WHERE s."userId" = $1 AND s.status = 'completed'
                 GROUP BY topic
                 ORDER BY count DESC`,
                [userId]
            );
            res.json(result.rows);
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }
    // GET /api/analytics/insights (The Tactical Advisor)
    static async getInsights(req, res) {
        const userId = req.user.id;
        try {
            // 1. Get Topic Stats (Attempts vs Success)
            const topicStats = await db.query(
                `SELECT 
                    unnest(p.tags) as topic, 
                    COUNT(s.id) as attempts,
                    COUNT(s.id) FILTER (WHERE s.status = 'completed') as solved
                 FROM "CodingSession" s
                 JOIN "Problem" p ON s."problemId" = p.id
                 WHERE s."userId" = $1
                 GROUP BY topic`,
                [userId]
            );

            // 2. Get Difficulty Stats (Avg Time)
            const diffStats = await db.query(
                `SELECT difficulty, AVG("activeTime") as avg_time
                 FROM "CodingSession" s
                 JOIN "Problem" p ON s."problemId" = p.id
                 WHERE s."userId" = $1 AND s.status = 'completed'
                 GROUP BY difficulty`,
                [userId]
            );

            console.log(`[INSIGHTS] Generating report for user ${userId}`);
            console.log(`[INSIGHTS] Raw Topic Stats:`, topicStats.rows);
            console.log(`[INSIGHTS] Raw Difficulty Stats:`, diffStats.rows);

            // 3. Generate Advice via Hugging Face (Llama 3.1)
            const { HfInference } = require('@huggingface/inference');
            const hf = new HfInference(process.env.HF_TOKEN);
            const MODEL_NAME = "meta-llama/Meta-Llama-3-8B-Instruct";

            const aiPrompt = `
            Analyze these coding stats and provide a JSON report. 
            NOTE: "avg_time" is provided in SECONDS. Convert to minutes in your captions if needed.
            
            Topic Performance: ${JSON.stringify(topicStats.rows)}
            Avg Time by Difficulty (in seconds): ${JSON.stringify(diffStats.rows)}

            Respond ONLY with a JSON object:
            {
                "mainInsight": { "strong": "TopicName", "weak": "TopicName", "text": "Short caption" },
                "focusAreas": [
                    { "topic": "Name", "attempts": number, "accuracy": number, "advice": "One sentence tip" }
                ],
                "nudges": [
                    { "type": "WARN" | "INFO" | "CRITICAL", "title": "Title", "message": "Short body" }
                ]
            }`;

            const response = await hf.chatCompletion({
                model: MODEL_NAME,
                messages: [
                    { role: "system", content: "You are a Tactical Coding Advisor. Respond ONLY with JSON." },
                    { role: "user", content: aiPrompt }
                ],
                max_tokens: 1000,
                temperature: 0.1,
            });

            const text = response.choices[0].message.content;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            const insights = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

            res.json(insights);

        } catch (err) {
            console.error('[INSIGHTS ERROR]', err.message);
            res.status(500).send('Server Error');
        }
    }
}


module.exports = AnalyticsController;
