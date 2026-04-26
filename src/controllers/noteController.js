const NoteModel = require('../models/NoteModel');

class NoteController {
    // List all notes for the user
    static async getNotes(req, res) {
        const userId = req.user.id;
        const { topic, difficulty, search } = req.query;

        try {
            console.log(`[NOTES] Fetching notes for user ${userId} with filters:`, { topic, difficulty, search });
            const notes = await NoteModel.findAll({ userId, topic, difficulty, search });
            res.json(notes);
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }

    // Get single note details
    static async getNoteDetails(req, res) {
        const userId = req.user.id;
        const { id } = req.params;

        try {
            const note = await NoteModel.findById(id, userId);
            if (!note) return res.status(404).send('Note not found');
            res.json(note);
        } catch (err) {
            console.error(err);
            res.status(500).send('Server Error');
        }
    }
}

module.exports = NoteController;
