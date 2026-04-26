const { Client } = require('pg');

async function checkDatabases() {
    // Try to connect to 'postgres' database which usually exists
    const client = new Client({
        connectionString: 'postgres://mayank@localhost:5432/postgres'
    });

    try {
        await client.connect();
        const res = await client.query('SELECT datname FROM pg_database');
        console.log('Available databases:');
        res.rows.forEach(row => console.log(`- ${row.datname}`));
        await client.end();
    } catch (err) {
        console.error('Error connecting to postgres default db:', err.message);
        process.exit(1);
    }
}

checkDatabases();
