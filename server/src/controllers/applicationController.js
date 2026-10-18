const mongoose = require('mongoose');
const Application = require('../models/Application');
const Job = require('../models/Job');

/**
 * @desc    Submit a job application for an active job
 * @route   POST /api/jobs/:id/apply
 * @access  Private (Candidates only)
 */
const applyToJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate job ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid job ID format'
      });
    }

    // 2. Validate cover letter input safely handling missing or null request bodies
    const body = req.body || {};
    let coverLetterToSave = undefined;

    if (body.coverLetter !== undefined) {
      if (typeof body.coverLetter !== 'string') {
        return res.status(400).json({
          status: 'fail',
          message: 'Cover letter must be a string'
        });
      }

      const trimmedCoverLetter = body.coverLetter.trim();
      if (trimmedCoverLetter.length > 2000) {
        return res.status(400).json({
          status: 'fail',
          message: 'Cover letter cannot exceed 2000 characters'
        });
      }

      // Treat empty or whitespace-only cover letter as omitted
      if (trimmedCoverLetter.length > 0) {
        coverLetterToSave = trimmedCoverLetter;
      }
    }

    // 3. Allow applications only to existing active jobs
    const job = await Job.findById(id);
    if (!job || job.status !== 'active') {
      return res.status(404).json({
        status: 'fail',
        message: 'Job not found or is no longer accepting applications'
      });
    }

    // 4. Pre-check for duplicate application by authenticated candidate
    const existingApplication = await Application.findOne({
      candidate: req.userId,
      job: id
    });

    if (existingApplication) {
      return res.status(409).json({
        status: 'fail',
        message: 'You have already applied for this job'
      });
    }

    // 5. Create application linking authenticated candidate (never trust body identity)
    const application = await Application.create({
      candidate: req.userId,
      job: id,
      coverLetter: coverLetterToSave
    });

    return res.status(201).json({
      status: 'success',
      message: 'Application submitted successfully',
      data: {
        application
      }
    });
  } catch (error) {
    // 6. Handle MongoDB duplicate-key errors (code 11000) for concurrent race-condition submissions
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'fail',
        message: 'You have already applied for this job'
      });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }

    next(error);
  }
};

/**
 * @desc    Get all job applications submitted by the authenticated candidate
 * @route   GET /api/applications/my
 * @access  Private (Candidates only)
 */
const getMyApplications = async (req, res, next) => {
  try {
    const { page, limit } = req.query;

    // 1. Pagination parsing and strict positive-integer validation
    const isPositiveIntegerString = (val) =>
      typeof val === 'string' && /^[1-9]\d*$/.test(val.trim());

    let pageNum = 1;
    if (page !== undefined) {
      if (!isPositiveIntegerString(page)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Page must be a positive integer'
        });
      }
      const parsedPage = Number(page.trim());
      if (!Number.isSafeInteger(parsedPage)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Page must be a positive integer'
        });
      }
      pageNum = parsedPage;
    }

    let limitNum = 10;
    if (limit !== undefined) {
      if (!isPositiveIntegerString(limit)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Limit must be a positive integer'
        });
      }
      const parsedLimit = Number(limit.trim());
      if (!Number.isSafeInteger(parsedLimit)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Limit must be a positive integer'
        });
      }
      limitNum = parsedLimit;
      if (limitNum > 50) {
        limitNum = 50; // Maximum limit capped at 50
      }
    }

    // 2. Validate skip does not overflow safe integer range
    const skip = (pageNum - 1) * limitNum;
    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Page must be a positive integer'
      });
    }

    // 3. Candidate isolation: derive candidate filter exclusively from req.userId
    const query = { candidate: req.userId };

    // 4. Query execution: deterministic newest-first sorting with tie-breaker and populated job fields
    const [applications, total] = await Promise.all([
      Application.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('job', 'title company location jobType workplaceMode status')
        .select('-__v'),
      Application.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 0;

    return res.status(200).json({
      success: true,
      status: 'success',
      data: applications,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyToJob,
  getMyApplications
};
