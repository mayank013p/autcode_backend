const express = require('express');
const router = express.Router();
const SessionController = require('../controllers/sessionController');

const auth = require('../middleware/auth');

// MOCK AUTH REMOVED


// Routes
router.post('/start', auth, SessionController.startSession);
router.post('/pulse', auth, SessionController.pulse);
router.post('/end', auth, SessionController.endSession);

module.exports = router;
