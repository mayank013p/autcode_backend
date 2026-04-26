const { Client } = require('pg');

async function setupDatabase() {
    // 1. Connect to 'postgres' to create the database
    const adminClient = new Client({
        connectionString: 'postgres://mayank@localhost:5432/postgres'
    });

    try {
        await adminClient.connect();
        
        // Check if database exists
        const res = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = 'autocodenotes_db'");
        if (res.rows.length === 0) {
            console.log('Creating database autocodenotes_db...');
            await adminClient.query('CREATE DATABASE autocodenotes_db');
        } else {
            console.log('Database autocodenotes_db already exists.');
        }
        await adminClient.end();

        // 2. Connect to the new database to create tables
        const client = new Client({
            connectionString: 'postgres://mayank@localhost:5432/autocodenotes_db'
        });

        await client.connect();
        console.log('Connected to autocodenotes_db. Initializing schema...');

        // Enable UUID extension
        await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');

        // Create tables
        const schema = `
            CREATE TABLE IF NOT EXISTS "User" (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                email TEXT UNIQUE NOT NULL,
                "passwordHash" TEXT,
                name TEXT,
                "githubId" TEXT UNIQUE,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS "Problem" (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                title TEXT NOT NULL,
                slug TEXT UNIQUE NOT NULL,
                platform TEXT DEFAULT 'unknown',
                url TEXT,
                difficulty TEXT DEFAULT 'Unknown',
                tags TEXT[] DEFAULT '{}',
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS "CodingSession" (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
                "problemId" UUID REFERENCES "Problem"(id) ON DELETE SET NULL,
                "startTime" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "endTime" TIMESTAMP WITH TIME ZONE,
                status TEXT DEFAULT 'active',
                "activeTime" INTEGER DEFAULT 0,
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS "Snapshot" (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "sessionId" UUID REFERENCES "CodingSession"(id) ON DELETE CASCADE,
                code TEXT,
                language TEXT,
                "trigger" TEXT DEFAULT 'unknown',
                "fileName" TEXT,
                framework TEXT,
                "errorCount" INTEGER DEFAULT 0,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS "Note" (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                "sessionId" UUID REFERENCES "CodingSession"(id) ON DELETE CASCADE,
                "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
                "problemId" UUID REFERENCES "Problem"(id) ON DELETE SET NULL,
                summary TEXT,
                approach TEXT,
                "solutionCode" TEXT,
                "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `;

        await client.query(schema);
        console.log('Schema initialized successfully!');

        // Optional: Create a trigger for updatedAt if desired, but simple NOW() is used in code
        
        await client.end();
        process.exit(0);
    } catch (err) {
        console.error('Error setting up database:', err.message);
        process.exit(1);
    }
}

setupDatabase();
