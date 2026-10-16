const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const {
  createJob,
  getMyJobs,
  updateJob,
  deleteJob
} = require('../controllers/jobController');

// All Day 8 job routes require authentication and employer role
router.use(protect);
router.use(authorize('employer'));

// POST /api/jobs - Post a new job
router.post('/', createJob);

// GET /api/jobs/my - List employer's own jobs (Must be defined before /:id to prevent shadowing)
router.get('/my', getMyJobs);

// PUT /api/jobs/:id - Update own job posting
router.put('/:id', updateJob);

// DELETE /api/jobs/:id - Soft-close own job posting
router.delete('/:id', deleteJob);

module.exports = router;
