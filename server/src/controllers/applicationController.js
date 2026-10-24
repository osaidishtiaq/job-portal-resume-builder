const mongoose = require('mongoose');
const Application = require('../models/Application');
const emailService = require('../services/emailService');
const Job = require('../models/Job');
const User = require('../models/User');

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
    // 6. Notify employer via email (non-blocking, errors logged but do not affect response)
    try {
      if (process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM && job.employer) {
        const employer = await User.findById(job.employer);
        const candidate = req.userId ? await User.findById(req.userId) : null;
        if (employer && employer.email) {
          const candidateName = candidate && candidate.name ? candidate.name : 'A candidate';
          await emailService.sendApplicationNotification({
            employerEmail: employer.email,
            employerName: employer.name,
            jobTitle: job.title,
            candidateName,
            applicationId: application._id.toString()
          });
        }
      }
    } catch (emailErr) {
      console.error('Failed to send application notification email:', emailErr);
    }
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

/**
 * @desc    Get all applications for a job owned by the authenticated employer
 * @route   GET /api/applications/job/:jobId
 * @access  Private (Employers only)
 */
const getJobApplications = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    // 1. Validate job ID format
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid job ID format'
      });
    }

    // 2. Strict positive-integer pagination parsing and validation
    const { page, limit } = req.query;
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

    // 3. Validate skip does not overflow safe integer range
    const skip = (pageNum - 1) * limitNum;
    if (!Number.isSafeInteger(skip)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Page must be a positive integer'
      });
    }

    // 4. Verify job existence and employer ownership (allows active and closed jobs)
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        status: 'fail',
        message: 'Job not found'
      });
    }

    // Security: Derive employer identity strictly from req.userId
    if (job.employer.toString() !== req.userId.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to view applications for this job'
      });
    }

    // 5. Query execution: deterministic newest-first sorting with tie-breaker and populated candidate fields
    const query = { job: jobId };
    const [applications, total] = await Promise.all([
      Application.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limitNum)
        .populate('candidate', 'name email')
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

/**
 * @desc    Update an application's status
 * @route   PATCH /api/applications/:applicationId/status
 * @access  Private (Employers only)
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    // 1. Validate application ID format
    if (!mongoose.Types.ObjectId.isValid(applicationId)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid application ID format'
      });
    }

    // 2. Validate request body and status value
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Request body is required'
      });
    }

    const { status } = req.body;
    const ALLOWED_STATUSES = ['reviewing', 'accepted', 'rejected'];

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        status: 'fail',
        message: 'Application status is required and must be a string'
      });
    }

    const trimmedStatus = status.trim();
    if (!ALLOWED_STATUSES.includes(trimmedStatus)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid status: '${status}'. Allowed values: ${ALLOWED_STATUSES.join(', ')}`
      });
    }

    // 3. Find existing application
    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        status: 'fail',
        message: 'Application not found'
      });
    }

    // 4. Verify associated job existence and employer ownership
    const job = await Job.findById(application.job);
    if (!job) {
      return res.status(404).json({
        status: 'fail',
        message: 'Associated job not found'
      });
    }

    // Security: Derive employer identity strictly from req.userId
    if (job.employer.toString() !== req.userId.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to update this application'
      });
    }

    // 5. Update only status (ignore candidate, job, coverLetter, or any extra fields)
    application.status = trimmedStatus;
    await application.save();

    // Populate candidate details with only name and email for response
    await application.populate('candidate', 'name email');

    return res.status(200).json({
      status: 'success',
      message: 'Application status updated successfully',
      data: {
        application
      }
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }
    next(error);
  }
};

module.exports = {
  applyToJob,
  getMyApplications,
  getJobApplications,
  updateApplicationStatus
};
