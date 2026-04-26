const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.get('/summary', auth, AnalyticsController.getSummary);
router.get('/activity', auth, AnalyticsController.getActivity);
router.get('/topics', auth, AnalyticsController.getTopics);
router.get('/insights', auth, AnalyticsController.getInsights);


module.exports = router;
