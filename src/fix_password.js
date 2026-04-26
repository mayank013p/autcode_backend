const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function fixPassword() {
    try {
        const password = 'default';
        const hash = await bcrypt.hash(password, 10);

        console.log(`Generated Hash for '${password}': ${hash}`);

        const res = await pool.query(
            'UPDATE "User" SET "passwordHash" = $1 WHERE email = $2',
            [hash, 'default@user.com']
        );

        console.log(`Updated ${res.rowCount} user(s).`);
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

fixPassword();
