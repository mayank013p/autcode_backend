const db = require('../db');

class ProblemModel {
    /**
     * Find a problem by its slug
     * @param {string} slug 
     * @returns {Promise<object|null>}
     */
    static async findBySlug(slug) {
        const result = await db.query('SELECT * FROM "Problem" WHERE slug = $1', [slug]);
        return result.rows[0] || null;
    }

    /**
     * Create a new problem
     * @param {object} data { title, slug, platform, url, difficulty, tags }
     * @returns {Promise<object>}
     */
    static async create(data) {
        const { title, slug, platform, url, difficulty, tags } = data;
        const result = await db.query(
            `INSERT INTO "Problem" (title, slug, platform, url, difficulty, tags) 
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [title, slug, platform || 'unknown', url || '', difficulty || 'Unknown', tags || []]
        );
        return result.rows[0];
    }
    /**
     * Update problem metadata (Difficulty and Tags/Topic)
     */
    static async updateMetadata(id, { difficulty, tags }) {
        await db.query(
            'UPDATE "Problem" SET difficulty = $1, tags = $2, "updatedAt" = NOW() WHERE id = $3',
            [difficulty, tags, id]
        );
    }

    /**
     * Get a problem by its ID
     * @param {string} id 
     * @returns {Promise<object|null>}
     */
    static async findById(id) {
        const result = await db.query('SELECT * FROM "Problem" WHERE id = $1', [id]);
        return result.rows[0] || null;
    }
}


module.exports = ProblemModel;
