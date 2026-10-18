const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { getMyApplications } = require('../controllers/applicationController');

// Route-level middleware for candidate-only operations
const requireCandidate = [protect, authorize('candidate')];

// GET /api/applications/my - List authenticated candidate's own job applications
router.get('/my', ...requireCandidate, getMyApplications);

module.exports = router;
