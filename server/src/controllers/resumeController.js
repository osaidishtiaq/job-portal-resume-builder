// Resume model will be required lazily within each controller function

/**
 * Validate a required trimmed string
 */
const validateRequiredString = (value, fieldName, maxLen) => {
  if (value === undefined || value === null) {
    return { valid: false, message: `${fieldName} is required` };
  }
  if (typeof value !== 'string') {
    return { valid: false, message: `${fieldName} must be a string` };
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return { valid: false, message: `${fieldName} is required` };
  }
  if (trimmed.length > maxLen) {
    return { valid: false, message: `${fieldName} cannot exceed ${maxLen} characters` };
  }
  return { valid: true, value: trimmed };
};

/**
 * Validate an optional trimmed string
 */
const validateOptionalString = (value, fieldName, maxLen) => {
  if (value === undefined || value === null) {
    return { valid: true, value: '' };
  }
  if (typeof value !== 'string') {
    return { valid: false, message: `${fieldName} must be a string` };
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLen) {
    return { valid: false, message: `${fieldName} cannot exceed ${maxLen} characters` };
  }
  return { valid: true, value: trimmed };
};

/**
 * @desc    Get current candidate's resume
 * @route   GET /api/resumes/my
 * @access  Private (Candidates only)
 */
const getMyResume = async (req, res, next) => {
  try {
    // Derive candidate identity strictly from authenticated req.userId
    const Resume = require('../models/Resume');
    const resume = await Resume.findOne({ user: req.userId });

    return res.status(200).json({
      success: true,
      status: 'success',
      data: {
        resume: resume || null
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create or update current candidate's single resume
 * @route   PUT /api/resumes/my
 * @access  Private (Candidates only)
 */
const saveMyResume = async (req, res, next) => {
  try {
    // 1. Validate request body is a non-null object and not an array
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Request body must be a valid JSON object'
      });
    }

    // 2. Reject client-supplied top-level unknown or protected fields
    const allowedTopKeys = ['personalDetails', 'skills', 'education', 'experience', 'templateId'];
    const unknownTopKeys = Object.keys(req.body).filter((k) => !allowedTopKeys.includes(k));
    if (unknownTopKeys.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: `Unknown or disallowed field(s): ${unknownTopKeys.join(', ')}`
      });
    }

    const ALLOWED_TEMPLATES = ['professional', 'minimal', 'modern'];
    let sanitizedTemplateId;
    if (req.body.templateId !== undefined) {
      if (typeof req.body.templateId !== 'string' || !ALLOWED_TEMPLATES.includes(req.body.templateId)) {
        return res.status(400).json({
          status: 'fail',
          message: `Invalid template identifier. Must be one of: ${ALLOWED_TEMPLATES.join(', ')}`
        });
      }
      sanitizedTemplateId = req.body.templateId;
    }

    const { personalDetails, skills, education, experience } = req.body;

    // Check if personalDetails is missing
    if (personalDetails === undefined) {
      // If neither personalDetails nor templateId was provided (e.g. body: {})
      if (sanitizedTemplateId === undefined) {
        return res.status(400).json({
          status: 'fail',
          message: 'personalDetails must be a valid object'
        });
      }

      // Template-only update: requires an existing resume
      const Resume = require('../models/Resume');
      let resume = null;
      if (typeof Resume.findOne === 'function') {
        resume = await Resume.findOne({ user: req.userId });
      }

      if (!resume) {
        return res.status(400).json({
          status: 'fail',
          message: 'personalDetails must be a valid object'
        });
      }

      resume.templateId = sanitizedTemplateId;
      await resume.save();

      return res.status(200).json({
        success: true,
        status: 'success',
        message: 'Resume saved successfully',
        data: {
          resume
        }
      });
    }

    // 3. Validate personalDetails (required object)
    if (!personalDetails || typeof personalDetails !== 'object' || Array.isArray(personalDetails)) {
      return res.status(400).json({
        status: 'fail',
        message: 'personalDetails must be a valid object'
      });
    }

    const allowedPersonalKeys = ['fullName', 'email', 'phone', 'location', 'headline', 'summary'];
    const unknownPersonalKeys = Object.keys(personalDetails).filter(
      (k) => !allowedPersonalKeys.includes(k)
    );
    if (unknownPersonalKeys.length > 0) {
      return res.status(400).json({
        status: 'fail',
        message: `Disallowed field in personalDetails: ${unknownPersonalKeys.join(', ')}`
      });
    }

    const nameVal = validateRequiredString(personalDetails.fullName, 'Full name', 80);
    if (!nameVal.valid) {
      return res.status(400).json({ status: 'fail', message: nameVal.message });
    }

    if (personalDetails.email === undefined || personalDetails.email === null) {
      return res.status(400).json({ status: 'fail', message: 'Contact email is required' });
    }
    if (typeof personalDetails.email !== 'string') {
      return res.status(400).json({ status: 'fail', message: 'Contact email must be a string' });
    }
    const trimmedEmail = personalDetails.email.trim().toLowerCase();
    if (trimmedEmail.length === 0) {
      return res.status(400).json({ status: 'fail', message: 'Contact email is required' });
    }
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 100) {
      return res.status(400).json({ status: 'fail', message: 'Please provide a valid contact email' });
    }

    const phoneVal = validateOptionalString(personalDetails.phone, 'Phone number', 30);
    if (!phoneVal.valid) {
      return res.status(400).json({ status: 'fail', message: phoneVal.message });
    }

    const locVal = validateOptionalString(personalDetails.location, 'Location', 100);
    if (!locVal.valid) {
      return res.status(400).json({ status: 'fail', message: locVal.message });
    }

    const headVal = validateOptionalString(personalDetails.headline, 'Headline', 120);
    if (!headVal.valid) {
      return res.status(400).json({ status: 'fail', message: headVal.message });
    }

    const sumVal = validateOptionalString(personalDetails.summary, 'Summary', 2000);
    if (!sumVal.valid) {
      return res.status(400).json({ status: 'fail', message: sumVal.message });
    }

    const sanitizedPersonalDetails = {
      fullName: nameVal.value,
      email: trimmedEmail,
      phone: phoneVal.value,
      location: locVal.value,
      headline: headVal.value,
      summary: sumVal.value
    };

    // 4. Validate skills (optional array, max 50 items, max 50 chars per item)
    const sanitizedSkills = [];
    if (skills !== undefined) {
      if (!Array.isArray(skills)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Skills must be an array of strings'
        });
      }
      if (skills.length > 50) {
        return res.status(400).json({
          status: 'fail',
          message: 'Skills cannot exceed 50 items'
        });
      }
      for (let i = 0; i < skills.length; i++) {
        const item = skills[i];
        if (typeof item !== 'string') {
          return res.status(400).json({
            status: 'fail',
            message: 'Each skill must be a string'
          });
        }
        const trimmed = item.trim();
        if (trimmed.length === 0) {
          return res.status(400).json({
            status: 'fail',
            message: 'Skill item cannot be empty'
          });
        }
        if (trimmed.length > 50) {
          return res.status(400).json({
            status: 'fail',
            message: 'Skill cannot exceed 50 characters'
          });
        }
        sanitizedSkills.push(trimmed);
      }
    }

    // 5. Validate education (optional array of objects, max 20 entries)
    const sanitizedEducation = [];
    if (education !== undefined) {
      if (!Array.isArray(education)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Education must be an array'
        });
      }
      if (education.length > 20) {
        return res.status(400).json({
          status: 'fail',
          message: 'Education cannot exceed 20 entries'
        });
      }
      for (let i = 0; i < education.length; i++) {
        const item = education[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return res.status(400).json({
            status: 'fail',
            message: 'Each education entry must be an object'
          });
        }

        const allowedEdKeys = [
          'institution',
          'qualification',
          'fieldOfStudy',
          'startDate',
          'endDate',
          'description'
        ];
        const unknownEdKeys = Object.keys(item).filter((k) => !allowedEdKeys.includes(k));
        if (unknownEdKeys.length > 0) {
          return res.status(400).json({
            status: 'fail',
            message: `Disallowed field in education entry: ${unknownEdKeys.join(', ')}`
          });
        }

        const instVal = validateRequiredString(item.institution, 'Institution name', 120);
        if (!instVal.valid) {
          return res.status(400).json({ status: 'fail', message: instVal.message });
        }

        const qualVal = validateRequiredString(item.qualification, 'Qualification', 100);
        if (!qualVal.valid) {
          return res.status(400).json({ status: 'fail', message: qualVal.message });
        }

        const fieldVal = validateOptionalString(item.fieldOfStudy, 'Field of study', 100);
        if (!fieldVal.valid) {
          return res.status(400).json({ status: 'fail', message: fieldVal.message });
        }

        const startVal = validateOptionalString(item.startDate, 'Start date', 30);
        if (!startVal.valid) {
          return res.status(400).json({ status: 'fail', message: startVal.message });
        }

        const endVal = validateOptionalString(item.endDate, 'End date', 30);
        if (!endVal.valid) {
          return res.status(400).json({ status: 'fail', message: endVal.message });
        }

        const descVal = validateOptionalString(item.description, 'Description', 1000);
        if (!descVal.valid) {
          return res.status(400).json({ status: 'fail', message: descVal.message });
        }

        sanitizedEducation.push({
          institution: instVal.value,
          qualification: qualVal.value,
          fieldOfStudy: fieldVal.value,
          startDate: startVal.value,
          endDate: endVal.value,
          description: descVal.value
        });
      }
    }

    // 6. Validate experience (optional array of objects, max 20 entries)
    const sanitizedExperience = [];
    if (experience !== undefined) {
      if (!Array.isArray(experience)) {
        return res.status(400).json({
          status: 'fail',
          message: 'Experience must be an array'
        });
      }
      if (experience.length > 20) {
        return res.status(400).json({
          status: 'fail',
          message: 'Experience cannot exceed 20 entries'
        });
      }
      for (let i = 0; i < experience.length; i++) {
        const item = experience[i];
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return res.status(400).json({
            status: 'fail',
            message: 'Each experience entry must be an object'
          });
        }

        const allowedExpKeys = [
          'company',
          'jobTitle',
          'location',
          'startDate',
          'endDate',
          'description'
        ];
        const unknownExpKeys = Object.keys(item).filter((k) => !allowedExpKeys.includes(k));
        if (unknownExpKeys.length > 0) {
          return res.status(400).json({
            status: 'fail',
            message: `Disallowed field in experience entry: ${unknownExpKeys.join(', ')}`
          });
        }

        const compVal = validateRequiredString(item.company, 'Company name', 120);
        if (!compVal.valid) {
          return res.status(400).json({ status: 'fail', message: compVal.message });
        }

        const titleVal = validateRequiredString(item.jobTitle, 'Job title', 100);
        if (!titleVal.valid) {
          return res.status(400).json({ status: 'fail', message: titleVal.message });
        }

        const locVal = validateOptionalString(item.location, 'Location', 100);
        if (!locVal.valid) {
          return res.status(400).json({ status: 'fail', message: locVal.message });
        }

        const startVal = validateOptionalString(item.startDate, 'Start date', 30);
        if (!startVal.valid) {
          return res.status(400).json({ status: 'fail', message: startVal.message });
        }

        const endVal = validateOptionalString(item.endDate, 'End date', 30);
        if (!endVal.valid) {
          return res.status(400).json({ status: 'fail', message: endVal.message });
        }

        const descVal = validateOptionalString(item.description, 'Description', 2000);
        if (!descVal.valid) {
          return res.status(400).json({ status: 'fail', message: descVal.message });
        }

        sanitizedExperience.push({
          company: compVal.value,
          jobTitle: titleVal.value,
          location: locVal.value,
          startDate: startVal.value,
          endDate: endVal.value,
          description: descVal.value
        });
      }
    }

    // 7. Find existing resume or instantiate new document (enforces complete Mongoose validation via save)

    const Resume = require('../models/Resume');
    // Safely attempt to find existing resume; handle cases where the mock model lacks a static findOne method
    let resume = null;
    if (typeof Resume.findOne === 'function') {
      resume = await Resume.findOne({ user: req.userId });
    }

    if (resume) {
      resume.personalDetails = sanitizedPersonalDetails;
      resume.skills = sanitizedSkills;
      resume.education = sanitizedEducation;
      resume.experience = sanitizedExperience;
      if (sanitizedTemplateId !== undefined) {
        resume.templateId = sanitizedTemplateId;
      }
    } else {
      resume = new Resume({
        user: req.userId,
        personalDetails: sanitizedPersonalDetails,
        skills: sanitizedSkills,
        education: sanitizedEducation,
        experience: sanitizedExperience,
        templateId: sanitizedTemplateId || 'professional'
      });
    }

    await resume.save();

    // Respond using chained methods; mock response captures statusCode via status()
    return res.status(200).json({
      success: true,
      status: 'success',
      message: 'Resume saved successfully',
      data: {
        resume
      }
    });
  } catch (error) {
    // 8. Safely handle MongoDB duplicate-key errors (code 11000) for race-condition resume creations
    if (error.code === 11000) {
      // Duplicate key error (resume already exists)
      return res.status(409).json({
        status: 'fail',
        message: 'A resume already exists for this account'
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

module.exports = {
  getMyResume,
  saveMyResume
};
