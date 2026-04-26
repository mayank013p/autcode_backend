const db = require('../db');

class NoteModel {
    /**
     * Get all notes with optional filtering and search
     */
    static async findAll({ userId, topic, difficulty, search }) {
        let query = `
            SELECT DISTINCT ON (n."problemId") n.*, p.title, p.difficulty, p.tags, p.platform
            FROM "Note" n
            JOIN "Problem" p ON n."problemId" = p.id
            WHERE n."userId" = $1
        `;
        const params = [userId];

        if (topic && topic !== 'all') {
            params.push(topic);
            query += ` AND $${params.length} = ANY(p.tags)`;
        }

        if (difficulty && difficulty !== 'all') {
            params.push(difficulty);
            query += ` AND p.difficulty = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.title ILIKE $${params.length} OR n.summary ILIKE $${params.length})`;
        }

        query += ` ORDER BY n."problemId", n."createdAt" DESC`;

        const result = await db.query(query, params);
        return result.rows;
    }

    /**
     * Get a specific note by ID
     */
    static async findById(id, userId) {
        const result = await db.query(
            `SELECT n.*, p.title, p.difficulty, p.tags, p.platform
             FROM "Note" n
             JOIN "Problem" p ON n."problemId" = p.id
             WHERE n.id = $1 AND n."userId" = $2`,
            [id, userId]
        );
        return result.rows[0];
    }

    /**
     * Create or Update a note
     */
    static async create(data) {
        const { sessionId, userId, problemId, summary, approach, solutionCode } = data;
        
        // 1. Check if a note already exists for this EXACT session
        const existingSessionNote = await db.query('SELECT id FROM "Note" WHERE "sessionId" = $1', [sessionId]);
        if (existingSessionNote.rows.length > 0) {
            console.log(`[NOTE] Updating existing note for session ${sessionId}`);
            const result = await db.query(
                `UPDATE "Note" SET summary = $1, approach = $2, "solutionCode" = $3, "updatedAt" = NOW()
                 WHERE "sessionId" = $4 RETURNING *`,
                [summary, approach, solutionCode, sessionId]
            );
            return result.rows[0];
        }

        // 2. Check if a note already exists for this problem (to prevent duplicates in the list)
        // If it exists, we update the existing one so the user only sees one "master" note per file
        const existingProblemNote = await db.query(
            'SELECT id FROM "Note" WHERE "userId" = $1 AND "problemId" = $2', 
            [userId, problemId]
        );

        if (existingProblemNote.rows.length > 0) {
            console.log(`[NOTE] Updating master note for problem ${problemId}`);
            const result = await db.query(
                `UPDATE "Note" SET summary = $1, approach = $2, "solutionCode" = $3, "sessionId" = $4, "updatedAt" = NOW()
                 WHERE id = $5 RETURNING *`,
                [summary, approach, solutionCode, sessionId, existingProblemNote.rows[0].id]
            );
            return result.rows[0];
        }

        // 3. Otherwise, create a brand new note
        const result = await db.query(
            `INSERT INTO "Note" ("sessionId", "userId", "problemId", summary, approach, "solutionCode")
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [sessionId, userId, problemId, summary, approach, solutionCode]
        );
        return result.rows[0];
    }
}

module.exports = NoteModel;
