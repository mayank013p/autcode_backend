const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Routes
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.post('/github', AuthController.githubAuth);


module.exports = router;
