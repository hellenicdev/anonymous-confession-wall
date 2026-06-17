const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const {
  getConfession,
  searchConfessions,
  getReports,
  getConfessionReports,
  getReportStats,
  toggleHide,
  deleteConfession
} = require('../controllers/adminController');
const { generalLimiter } = require('../middleware/rateLimiter');

const adminLimiter = generalLimiter;

router.use(adminAuth);
router.use(adminLimiter);

router.get('/confessions/search', searchConfessions);
router.get('/confessions/:id', getConfession);
router.patch('/confessions/:id/hide', toggleHide);
router.delete('/confessions/:id', deleteConfession);

router.get('/reports', getReports);
router.get('/reports/stats', getReportStats);
router.get('/reports/:confessionId', getConfessionReports);

module.exports = router;
