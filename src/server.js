const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });


const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());



// Custom Logging Middleware for Readability
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const status = res.statusCode;
        const color = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
        const method = req.method;
        const url = req.originalUrl;
        const reset = '\x1b[0m';
        
        console.log(`[${new Date().toLocaleTimeString()}] ${color}${method}${reset} ${url} - ${color}${status}${reset} (${duration}ms)`);
    });
    next();
});

// Database Connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});



// Test DB Connection
pool.connect((err, client, release) => {
    if (err) {
        return console.error('Error acquiring client', err.stack);
    }
    console.log('Connected to PostgreSQL database');
    release();
});

// Routes
const authRoutes = require('./routes/auth');
const sessionRoutes = require('./routes/session');

const analyticsRoutes = require('./routes/analytics');
const noteRoutes = require('./routes/notes');

app.use('/api/auth', authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/notes', noteRoutes);





// Test Route for Extension
const db = require('./db');

// Test Route for Extension (Ingestion Logic)
app.post('/test', async (req, res) => {
    console.log('Received from Extension:', req.body);
    const { title, language, code } = req.body;

    // HARDCODED USER ID FOR DEMO
    const USER_ID = 'aa7499e0-d07a-416b-b8b1-019ab3e66c47';

    try {
        // 1. Find or Create Problem
        let problemId;
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const existingProblem = await db.query('SELECT id FROM "Problem" WHERE slug = $1', [slug]);
        if (existingProblem.rows.length > 0) {
            problemId = existingProblem.rows[0].id;
        } else {
            const newProblem = await db.query(
                'INSERT INTO "Problem" (title, slug, platform, difficulty) VALUES ($1, $2, $3, $4) RETURNING id',
                [title, slug, 'vscode-local', 'Unknown']
            );
            problemId = newProblem.rows[0].id;
        }

        // 2. Create Completed Session
        const newSession = await db.query(
            'INSERT INTO "CodingSession" ("userId", "problemId", "startTime", "endTime", "status") VALUES ($1, $2, NOW(), NOW(), $3) RETURNING id',
            [USER_ID, problemId, 'completed']
        );
        const sessionId = newSession.rows[0].id;

        // 3. Save Snapshot
        await db.query(
            'INSERT INTO "Snapshot" ("sessionId", "code", "language", "trigger") VALUES ($1, $2, $3, $4)',
            [sessionId, code, language, 'manual-send']
        );

        // 4. (Simulated) Trigger AI
        console.log(`[AI] Generating notes for session ${sessionId}...`);

        res.json({ message: "Code saved successfully! AI Note generation queued." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to save data" });
    }
});

app.get('/', (req, res) => {
    res.send('AutoCodeNotes Backend is Running');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
