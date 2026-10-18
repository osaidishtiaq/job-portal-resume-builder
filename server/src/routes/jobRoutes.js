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

// Route-level middleware for employer-only operations
const requireEmployer = [protect, authorize('employer')];

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

module.exports = router;
