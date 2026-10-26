const mongoose = require('mongoose');
const Job = require('../models/Job');

// Allowed enum constants
const VALID_JOB_TYPES = ['full-time', 'part-time', 'contract', 'internship'];
const VALID_WORKPLACE_MODES = ['onsite', 'hybrid', 'remote'];
const VALID_STATUSES = ['active', 'closed'];

// Allowed fields for PUT updates
const ALLOWED_UPDATE_FIELDS = [
  'title',
  'company',
  'location',
  'jobType',
  'workplaceMode',
  'salaryMin',
  'salaryMax',
  'description',
  'requirements',
  'status'
];

/**
 * @desc    Create a new job posting
 * @route   POST /api/jobs
 * @access  Private (Employers only)
 */
const createJob = async (req, res, next) => {
  try {
    const {
      title,
      company,
      location,
      jobType,
      workplaceMode,
      salaryMin,
      salaryMax,
      description,
      requirements
    } = req.body;

    // 1. Validate required string fields
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Job title is required'
      });
    }

    if (!company || typeof company !== 'string' || !company.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Company name is required'
      });
    }

    if (!location || typeof location !== 'string' || !location.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Location is required'
      });
    }

    if (!description || typeof description !== 'string' || !description.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Job description is required'
      });
    }

    // 2. Validate lengths
    const trimmedTitle = title.trim();
    const trimmedCompany = company.trim();
    const trimmedLocation = location.trim();
    const trimmedDescription = description.trim();

    if (trimmedTitle.length < 3 || trimmedTitle.length > 100) {
      return res.status(400).json({
        status: 'fail',
        message: 'Job title must be between 3 and 100 characters'
      });
    }

    if (trimmedCompany.length < 2 || trimmedCompany.length > 100) {
      return res.status(400).json({
        status: 'fail',
        message: 'Company name must be between 2 and 100 characters'
      });
    }

    if (trimmedLocation.length < 2 || trimmedLocation.length > 100) {
      return res.status(400).json({
        status: 'fail',
        message: 'Location must be between 2 and 100 characters'
      });
    }

    if (trimmedDescription.length < 10 || trimmedDescription.length > 5000) {
      return res.status(400).json({
        status: 'fail',
        message: 'Job description must be between 10 and 5000 characters'
      });
    }

    // 3. Validate enums
    if (!jobType || !VALID_JOB_TYPES.includes(jobType)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid job type. Allowed: ${VALID_JOB_TYPES.join(', ')}`
      });
    }

    if (!workplaceMode || !VALID_WORKPLACE_MODES.includes(workplaceMode)) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid workplace mode. Allowed: ${VALID_WORKPLACE_MODES.join(', ')}`
      });
    }

    // 4. Validate salary constraints
    let parsedSalaryMin;
    let parsedSalaryMax;

    if (salaryMin !== undefined && salaryMin !== null && salaryMin !== '') {
      parsedSalaryMin = Number(salaryMin);
      if (Number.isNaN(parsedSalaryMin) || parsedSalaryMin < 0) {
        return res.status(400).json({
          status: 'fail',
          message: 'Minimum salary must be a non-negative number'
        });
      }
    }

    if (salaryMax !== undefined && salaryMax !== null && salaryMax !== '') {
      parsedSalaryMax = Number(salaryMax);
      if (Number.isNaN(parsedSalaryMax) || parsedSalaryMax < 0) {
        return res.status(400).json({
          status: 'fail',
          message: 'Maximum salary must be a non-negative number'
        });
      }
    }

    if (parsedSalaryMin !== undefined && parsedSalaryMax !== undefined && parsedSalaryMin > parsedSalaryMax) {
      return res.status(400).json({
        status: 'fail',
        message: 'Minimum salary cannot exceed maximum salary'
      });
    }

    // 5. Sanitize and validate requirements array
    let sanitizedRequirements = [];
    if (requirements !== undefined && requirements !== null) {
      if (!Array.isArray(requirements)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Requirements must be an array of strings'
        });
      }

      if (requirements.length > 50) {
        return res.status(400).json({
          status: 'fail',
          message: 'Requirements cannot exceed 50 items'
        });
      }

      for (const item of requirements) {
        if (typeof item !== 'string') {
          return res.status(400).json({
            status: 'fail',
            message: 'Each requirement must be a string'
          });
        }
        const trimmedItem = item.trim();
        if (trimmedItem) {
          if (trimmedItem.length > 200) {
            return res.status(400).json({
              status: 'fail',
              message: 'Each requirement item cannot exceed 200 characters'
            });
          }
          sanitizedRequirements.push(trimmedItem);
        }
      }
    }

    // 6. Security: Always assign employer from authenticated identity, never from body input
    const newJob = await Job.create({
      title: trimmedTitle,
      company: trimmedCompany,
      location: trimmedLocation,
      jobType,
      workplaceMode,
      salaryMin: parsedSalaryMin,
      salaryMax: parsedSalaryMax,
      description: trimmedDescription,
      requirements: sanitizedRequirements,
      status: 'active',
      employer: req.userId
    });

    return res.status(201).json({
      status: 'success',
      message: 'Job posted successfully',
      data: {
        job: newJob
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

/**
 * @desc    Get all jobs posted by the authenticated employer
 * @route   GET /api/jobs/my
 * @access  Private (Employers only)
 */
const getMyJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({ employer: req.userId }).sort({ createdAt: -1 });

    return res.status(200).json({
      status: 'success',
      results: jobs.length,
      data: {
        jobs
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update a job posting (allowlisted fields only, ownership verified)
 * @route   PUT /api/jobs/:id
 * @access  Private (Employers only)
 */
const updateJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate ID format to prevent CastError
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid job ID format'
      });
    }

    // 2. Find existing job
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        status: 'fail',
        message: 'Job not found'
      });
    }

    // 3. Security: Verify ownership
    if (job.employer.toString() !== req.userId.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to update this job'
      });
    }

    // 4. Validate allowed fields in payload
    const updates = {};
    const body = req.body || {};

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return res.status(400).json({ status: 'fail', message: 'Job title cannot be empty' });
      }
      const trimmed = body.title.trim();
      if (trimmed.length < 3 || trimmed.length > 100) {
        return res.status(400).json({ status: 'fail', message: 'Job title must be between 3 and 100 characters' });
      }
      updates.title = trimmed;
    }

    if (body.company !== undefined) {
      if (typeof body.company !== 'string' || !body.company.trim()) {
        return res.status(400).json({ status: 'fail', message: 'Company name cannot be empty' });
      }
      const trimmed = body.company.trim();
      if (trimmed.length < 2 || trimmed.length > 100) {
        return res.status(400).json({ status: 'fail', message: 'Company name must be between 2 and 100 characters' });
      }
      updates.company = trimmed;
    }

    if (body.location !== undefined) {
      if (typeof body.location !== 'string' || !body.location.trim()) {
        return res.status(400).json({ status: 'fail', message: 'Location cannot be empty' });
      }
      const trimmed = body.location.trim();
      if (trimmed.length < 2 || trimmed.length > 100) {
        return res.status(400).json({ status: 'fail', message: 'Location must be between 2 and 100 characters' });
      }
      updates.location = trimmed;
    }

    if (body.description !== undefined) {
      if (typeof body.description !== 'string' || !body.description.trim()) {
        return res.status(400).json({ status: 'fail', message: 'Job description cannot be empty' });
      }
      const trimmed = body.description.trim();
      if (trimmed.length < 10 || trimmed.length > 5000) {
        return res.status(400).json({ status: 'fail', message: 'Job description must be between 10 and 5000 characters' });
      }
      updates.description = trimmed;
    }

    if (body.jobType !== undefined) {
      if (!VALID_JOB_TYPES.includes(body.jobType)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid job type. Allowed: ${VALID_JOB_TYPES.join(', ')}`
        });
      }
      updates.jobType = body.jobType;
    }

    if (body.workplaceMode !== undefined) {
      if (!VALID_WORKPLACE_MODES.includes(body.workplaceMode)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid workplace mode. Allowed: ${VALID_WORKPLACE_MODES.join(', ')}`
        });
      }
      updates.workplaceMode = body.workplaceMode;
    }

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}`
        });
      }
      updates.status = body.status;
    }

    // Salary validation on update
    let prospectiveSalaryMin = body.salaryMin !== undefined
      ? (body.salaryMin === null || body.salaryMin === '' ? undefined : Number(body.salaryMin))
      : job.salaryMin;

    let prospectiveSalaryMax = body.salaryMax !== undefined
      ? (body.salaryMax === null || body.salaryMax === '' ? undefined : Number(body.salaryMax))
      : job.salaryMax;

    if (body.salaryMin !== undefined) {
      if (body.salaryMin !== null && body.salaryMin !== '') {
        const num = Number(body.salaryMin);
        if (Number.isNaN(num) || num < 0) {
          return res.status(400).json({ status: 'fail', message: 'Minimum salary must be a non-negative number' });
        }
        updates.salaryMin = num;
      } else {
        updates.salaryMin = undefined;
      }
    }

    if (body.salaryMax !== undefined) {
      if (body.salaryMax !== null && body.salaryMax !== '') {
        const num = Number(body.salaryMax);
        if (Number.isNaN(num) || num < 0) {
          return res.status(400).json({ status: 'fail', message: 'Maximum salary must be a non-negative number' });
        }
        updates.salaryMax = num;
      } else {
        updates.salaryMax = undefined;
      }
    }

    if (prospectiveSalaryMin !== undefined && prospectiveSalaryMax !== undefined && prospectiveSalaryMin > prospectiveSalaryMax) {
      return res.status(400).json({
        status: 'fail',
        message: 'Minimum salary cannot exceed maximum salary'
      });
    }

    // Requirements validation on update
    if (body.requirements !== undefined) {
      if (!Array.isArray(body.requirements)) {
        return res.status(400).json({ status: 'fail', message: 'Requirements must be an array of strings' });
      }
      if (body.requirements.length > 50) {
        return res.status(400).json({ status: 'fail', message: 'Requirements cannot exceed 50 items' });
      }
      const sanitized = [];
      for (const item of body.requirements) {
        if (typeof item !== 'string') {
          return res.status(400).json({ status: 'fail', message: 'Each requirement must be a string' });
        }
        const trimmed = item.trim();
        if (trimmed) {
          if (trimmed.length > 200) {
            return res.status(400).json({ status: 'fail', message: 'Each requirement item cannot exceed 200 characters' });
          }
          sanitized.push(trimmed);
        }
      }
      updates.requirements = sanitized;
    }

    // 5. Apply allowlisted fields only
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (updates[field] !== undefined) {
        job[field] = updates[field];
      }
    }

    await job.save();

    return res.status(200).json({
      status: 'success',
      message: 'Job updated successfully',
      data: {
        job
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

/**
 * @desc    Soft-close a job posting (sets status to 'closed', ownership verified)
 * @route   DELETE /api/jobs/:id
 * @access  Private (Employers only)
 */
const deleteJob = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid job ID format'
      });
    }

    // 2. Find existing job
    const job = await Job.findById(id);
    if (!job) {
      return res.status(404).json({
        status: 'fail',
        message: 'Job not found'
      });
    }

    // 3. Security: Verify ownership
    if (job.employer.toString() !== req.userId.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'Forbidden: You do not have permission to close this job'
      });
    }

    // 4. Soft-close: mark status as 'closed'
    job.status = 'closed';
    await job.save();

    return res.status(200).json({
      status: 'success',
      message: 'Job closed successfully',
      data: {
        job
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all active jobs with search, filtering, and database pagination
 * @route   GET /api/jobs
 * @access  Public
 */
const getJobs = async (req, res, next) => {
  try {
    const {
      search,
      location,
      jobType,
      workplaceMode,
      salaryMin,
      salaryMax,
      page,
      limit
    } = req.query;

    // 1. Pagination parsing and validation
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
      pageNum = Number(page.trim());
    }

    let limitNum = 10;
    if (limit !== undefined) {
      if (!isPositiveIntegerString(limit)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Limit must be a positive integer'
        });
      }
      limitNum = Number(limit.trim());
      if (limitNum > 50) {
        limitNum = 50; // Capped at 50 as required
      }
    }

    // 2. Salary filter parsing and validation
    const isValidSalaryString = (val) =>
      typeof val === 'string' &&
      /^\d+(\.\d+)?$/.test(val.trim()) &&
      Number.isFinite(Number(val.trim())) &&
      Number(val.trim()) >= 0;

    let parsedSalaryMin;
    if (salaryMin !== undefined) {
      if (!isValidSalaryString(salaryMin)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Minimum salary must be a non-negative number'
        });
      }
      parsedSalaryMin = Number(salaryMin.trim());
    }

    let parsedSalaryMax;
    if (salaryMax !== undefined) {
      if (!isValidSalaryString(salaryMax)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Maximum salary must be a non-negative number'
        });
      }
      parsedSalaryMax = Number(salaryMax.trim());
    }

    if (parsedSalaryMin !== undefined && parsedSalaryMax !== undefined && parsedSalaryMin > parsedSalaryMax) {
      return res.status(400).json({
        status: 'fail',
        message: 'Minimum salary cannot exceed maximum salary'
      });
    }

    // 3. Query filter - only active jobs
    const query = { status: 'active' };

    // 4. Keyword search across title, company, location, description
    if (search && typeof search === 'string' && search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escapedSearch, 'i');
      query.$or = [
        { title: searchRegex },
        { company: searchRegex },
        { location: searchRegex },
        { description: searchRegex }
      ];
    }

    // 5. Location filter
    if (location && typeof location === 'string' && location.trim()) {
      const escapedLocation = location.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.location = new RegExp(escapedLocation, 'i');
    }

    // 6. Job type exact match filter
    if (jobType !== undefined && jobType !== null && String(jobType).trim() !== '') {
      const trimmedJobType = String(jobType).trim();
      if (!VALID_JOB_TYPES.includes(trimmedJobType)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid jobType filter: '${jobType}'. Allowed: ${VALID_JOB_TYPES.join(', ')}`
        });
      }
      query.jobType = trimmedJobType;
    }

    // 7. Workplace mode exact match filter
    if (workplaceMode !== undefined && workplaceMode !== null && String(workplaceMode).trim() !== '') {
      const trimmedMode = String(workplaceMode).trim();
      if (!VALID_WORKPLACE_MODES.includes(trimmedMode)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid workplaceMode filter: '${workplaceMode}'. Allowed: ${VALID_WORKPLACE_MODES.join(', ')}`
        });
      }
      query.workplaceMode = trimmedMode;
    }

    // 8. Salary range overlap filter
    const salaryConditions = [];
    if (parsedSalaryMin !== undefined) {
      salaryConditions.push({
        $or: [
          { salaryMax: { $gte: parsedSalaryMin } },
          { salaryMax: null, salaryMin: { $ne: null } }
        ]
      });
    }
    if (parsedSalaryMax !== undefined) {
      salaryConditions.push({
        $or: [
          { salaryMin: { $lte: parsedSalaryMax } },
          { salaryMin: null, salaryMax: { $ne: null } }
        ]
      });
    }

    if (salaryConditions.length > 0) {
      query.$and = salaryConditions;
    }

    // 7. Database pagination execution
    const skip = (pageNum - 1) * limitNum;

    const [jobs, total] = await Promise.all([
      Job.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-__v'),
      Job.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum) || 0;

    return res.status(200).json({
      success: true,
      status: 'success',
      data: jobs,
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
 * @desc    Get single active job details
 * @route   GET /api/jobs/:id
 * @access  Public
 */
const getJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Validate ObjectId format; return 404 for malformed ID per specification
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({
        status: 'fail',
        message: 'Job not found'
      });
    }

    // 2. Query only active jobs (closed or missing jobs return 404)
    const job = await Job.findOne({ _id: id, status: 'active' }).select('-__v');

    if (!job) {
      return res.status(404).json({
        status: 'fail',
        message: 'Job not found'
      });
    }

    return res.status(200).json({
      success: true,
      status: 'success',
      data: {
        job
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getJobs,
  getJobById,
  createJob,
  getMyJobs,
  updateJob,
  deleteJob
};
