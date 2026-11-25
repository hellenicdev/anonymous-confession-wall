const express = require('express');
const router = express.Router();
const {
  getConfessions,
  createConfession,
  reactToConfession,
  reportConfession,
  getTrending,
  getDailyTrending
} = require('../controllers/confessionController');
const { createPostLimiter, interactionLimiter } = require('../middleware/rateLimiter');
const profanityFilter = require('../middleware/profanityFilter');
const { sanitizeInput } = require('../middleware/sanitizer');

router.get('/', getConfessions);
router.post('/', createPostLimiter, sanitizeInput, profanityFilter, createConfession);
router.post('/:id/react', interactionLimiter, reactToConfession);
router.post('/:id/report', interactionLimiter, reportConfession);
router.get('/trending', getTrending);
router.get('/daily-trending', getDailyTrending);

module.exports = router;
