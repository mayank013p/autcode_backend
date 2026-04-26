const db = require('../db');

class UserModel {
    /**
     * Find user by email
     * @param {string} email 
     * @returns {Promise<object|null>}
     */
    static async findByEmail(email) {
        const result = await db.query('SELECT * FROM "User" WHERE email = $1', [email]);
        return result.rows[0] || null;
    }

    static async findByGithubId(githubId) {
        const result = await db.query('SELECT * FROM "User" WHERE "githubId" = $1', [githubId]);
        return result.rows[0] || null;
    }

    /**
     * Create a new user
     * @param {string} email 
     * @param {string} passwordHash 
     * @param {string} name 
     * @param {string} githubId
     * @returns {Promise<object>}
     */
    static async create(email, passwordHash, name, githubId = null) {
        const result = await db.query(
            'INSERT INTO "User" (email, "passwordHash", name, "githubId") VALUES ($1, $2, $3, $4) RETURNING id, email, name',
            [email, passwordHash, name, githubId]
        );
        return result.rows[0];
    }
}


module.exports = UserModel;
