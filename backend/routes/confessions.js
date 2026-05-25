const express = require('express');
const router = express.Router();
const {
  getConfessions,
  createConfession,
  reactToConfession,
  reportConfession,
  analyzeConfession,
  getTrending,
  getDailyTrending
} = require('../controllers/confessionController');
const { createPostLimiter } = require('../middleware/rateLimiter');
const profanityFilter = require('../middleware/profanityFilter');
const { sanitizeInput } = require('../middleware/sanitizer');

router.get('/', getConfessions);
router.post('/', createPostLimiter, sanitizeInput, profanityFilter, createConfession);
router.post('/:id/react', reactToConfession);
router.post('/:id/report', reportConfession);
router.post('/:id/analyze', analyzeConfession);
router.get('/trending', getTrending);
router.get('/daily-trending', getDailyTrending);

module.exports = router;
