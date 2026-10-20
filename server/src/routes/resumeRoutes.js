const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getMyResume,
  saveMyResume
} = require('../controllers/resumeController');

// Route-level middleware for candidate-only operations
const requireCandidate = [protect, authorize('candidate')];

// 1. Candidate-only: Get authenticated candidate's own resume
router.get('/my', ...requireCandidate, getMyResume);

// 2. Candidate-only: Create or update authenticated candidate's own resume
router.put('/my', ...requireCandidate, saveMyResume);

module.exports = router;
