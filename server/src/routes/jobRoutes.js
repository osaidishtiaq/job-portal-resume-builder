const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  getJobs,
  getJobById,
  createJob,
  getMyJobs,
  updateJob,
  deleteJob
} = require('../controllers/jobController');
const { applyToJob } = require('../controllers/applicationController');

// Route-level middleware for role-protected operations
const requireEmployer = [protect, authorize('employer')];
const requireCandidate = [protect, authorize('candidate')];

// 1. Public job listing (No authentication required)
router.get('/', getJobs);

// 2. Employer-only: list employer's own jobs (MUST precede /:id to prevent shadowing)
router.get('/my', ...requireEmployer, getMyJobs);

// 3. Employer-only: create a new job posting
router.post('/', ...requireEmployer, createJob);

// 4. Public job details (No authentication required; MUST follow /my)
router.get('/:id', getJobById);

// 5. Employer-only: update a job posting
router.put('/:id', ...requireEmployer, updateJob);

// 6. Employer-only: soft-close a job posting
router.delete('/:id', ...requireEmployer, deleteJob);

// 7. Candidate-only: submit job application
router.post('/:id/apply', ...requireCandidate, applyToJob);

module.exports = router;
