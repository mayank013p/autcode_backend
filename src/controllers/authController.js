const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');
const db = require('../db');


const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkeychangeinprod';

class AuthController {

    // Register User
    static async register(req, res) {
        const { email, password, name } = req.body;
        if (!email || !password) return res.status(400).send('Email and password required');

        console.log(`[AUTH] Registering user: ${email}`);
        try {

            const existingUser = await UserModel.findByEmail(email);
            if (existingUser) return res.status(400).send('User already exists');

            const hash = await bcrypt.hash(password, 10);
            const user = await UserModel.create(email, hash, name);

            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

            console.log(`[AUTH] Registration successful for ${email}, token issued.`);
            res.status(201).json({ token, user });

        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    }

    // Login User
    static async login(req, res) {
        const { email, password } = req.body;

        console.log(`[AUTH] Login attempt: ${email}`);
        try {

            const user = await UserModel.findByEmail(email);
            if (!user) return res.status(400).send('Invalid credentials');

            const isMatch = await bcrypt.compare(password, user.passwordHash);
            if (!isMatch) return res.status(400).send('Invalid credentials');

            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

            console.log(`[AUTH] Login successful for ${email}`);
            // Don't send password hash back
            delete user.passwordHash;
            res.json({ token, user });

        } catch (err) {
            console.error(err);
            res.status(500).send('Server error');
        }
    }

    // GitHub Login (for Extension & Web)
    static async githubAuth(req, res) {
        let { accessToken, code } = req.body;
        
        try {
            const axios = require('axios');

            // 1. If we have a code (web flow), exchange it for an accessToken
            if (code && !accessToken) {
                console.log(`[AUTH] Exchanging GitHub code for token...`);
                const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
                    client_id: process.env.GITHUB_CLIENT_ID,
                    client_secret: process.env.GITHUB_CLIENT_SECRET,
                    code: code
                }, {
                    headers: { Accept: 'application/json' }
                });

                accessToken = tokenRes.data.access_token;
                if (!accessToken) {
                    return res.status(400).json({ message: 'Invalid GitHub code' });
                }
            }

            if (!accessToken) return res.status(400).send('Access Token or Code required');

            // 2. Get user profile from GitHub
            const ghRes = await axios.get('https://api.github.com/user', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });

            const { id: githubId, email, name, login } = ghRes.data;

            // 3. Find or Create User
            let user = await UserModel.findByGithubId(githubId.toString());
            
            if (!user && email) {
                user = await UserModel.findByEmail(email);
                // If found by email, link the GitHub ID
                if (user) {
                    await db.query('UPDATE \"User\" SET \"githubId\" = $1 WHERE id = $2', [githubId.toString(), user.id]);
                }
            }

            if (!user) {
                user = await UserModel.create(email || `${login}@github.com`, null, name || login, githubId.toString());
            }

            // 4. Issue JWT
            const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
            
            console.log(`[AUTH] GitHub Login successful for ${user.email}`);
            res.json({ token, user });

        } catch (err) {
            console.error('[GITHUB AUTH ERROR]', err.response?.data || err.message);
            res.status(500).send('GitHub Authentication failed');
        }
    }
}


module.exports = AuthController;
