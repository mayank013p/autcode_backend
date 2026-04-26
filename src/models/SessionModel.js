const db = require('../db');

class SessionModel {
    /**
     * Create a new coding session
     * @param {string} userId 
     * @param {string} problemId 
     * @returns {Promise<object>}
     */
    static async create(userId, problemId) {
        const result = await db.query(
            `INSERT INTO "CodingSession" ("userId", "problemId", "startTime", "status") 
             VALUES ($1, $2, NOW(), $3) RETURNING *`,
            [userId, problemId, 'active']
        );
        return result.rows[0];
    }

    /**
     * Update active time (pulse)
     * @param {string} sessionId 
     * @param {string} userId 
     * @param {number} timeDelta 
     */
    static async addActiveTime(sessionId, userId, timeDelta) {
        await db.query(
            `UPDATE "CodingSession" 
             SET "activeTime" = "activeTime" + $1, "updatedAt" = NOW() 
             WHERE id = $2 AND "userId" = $3`,
            [timeDelta, sessionId, userId]
        );
    }

    /**
     * End a session
     * @param {string} sessionId 
     * @param {string} userId 
     * @param {string} status 
     */
    static async end(sessionId, userId, status = 'completed') {
        await db.query(
            `UPDATE "CodingSession" 
             SET "status" = $1, "endTime" = NOW(), "updatedAt" = NOW() 
             WHERE id = $2 AND "userId" = $3`,
            [status, sessionId, userId]
        );
    }

    /**
     * Save a code snapshot
     * @param {string} sessionId 
     * @param {string} code 
     * @param {string} language 
     * @param {string} trigger 
     * @param {string} fileName 
     * @param {string} framework 
     * @param {number} errorCount 
     */
    static async saveSnapshot(sessionId, code, language, trigger = 'unknown', fileName = null, framework = null, errorCount = 0) {
        await db.query(
            `INSERT INTO "Snapshot" ("sessionId", "code", "language", "trigger", "fileName", "framework", "errorCount") 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [sessionId, code, language, trigger, fileName, framework, errorCount]
        );
    }
    
    static async getById(id) {
        const result = await db.query('SELECT * FROM "CodingSession" WHERE id = $1', [id]);
        return result.rows[0];
    }
}


module.exports = SessionModel;
