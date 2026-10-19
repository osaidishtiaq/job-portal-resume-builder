const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getMyApplications,
  getJobApplications,
  updateApplicationStatus
} = require('../controllers/applicationController');

// Route-level middleware for role-protected operations
const requireCandidate = [protect, authorize('candidate')];
const requireEmployer = [protect, authorize('employer')];

// 1. Candidate-only: List authenticated candidate's own job applications
router.get('/my', ...requireCandidate, getMyApplications);

// 2. Employer-only: List applications for a job owned by the authenticated employer
router.get('/job/:jobId', ...requireEmployer, getJobApplications);

// 3. Employer-only: Update the status of an application
router.patch('/:applicationId/status', ...requireEmployer, updateApplicationStatus);

module.exports = router;
