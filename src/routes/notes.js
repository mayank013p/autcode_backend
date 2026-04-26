const express = require('express');
const router = express.Router();
const NoteController = require('../controllers/noteController');
const auth = require('../middleware/auth');

router.get('/', auth, NoteController.getNotes);
router.get('/:id', auth, NoteController.getNoteDetails);

module.exports = router;
