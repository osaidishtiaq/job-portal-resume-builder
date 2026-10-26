const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * @desc    Register a new user (candidate or employer)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // 1. Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Name is required'
      });
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email is required'
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        status: 'fail',
        message: 'Password is required'
      });
    }

    // 2. Sanitize and normalize inputs
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Validate name length
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      return res.status(400).json({
        status: 'fail',
        message: 'Name must be between 2 and 50 characters'
      });
    }

    // 4. Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 100) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid email address'
      });
    }

    // 5. Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password must be at least 6 characters long'
      });
    }

    // 6. Validate and assign role (only 'candidate' or 'employer', default 'candidate')
    let assignedRole = 'candidate';
    if (role !== undefined && role !== null) {
      if (typeof role !== 'string' || !['candidate', 'employer'].includes(role.toLowerCase())) {
        return res.status(400).json({
          status: 'fail',
          message: 'Role must be either "candidate" or "employer"'
        });
      }
      assignedRole = role.toLowerCase();
    }

    // 7. Check for existing email to prevent duplicate accounts
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email is already registered'
      });
    }

    // 8. Hash password using bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 9. Save new user to database
    const newUser = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: hashedPassword,
      role: assignedRole
    });

    // 10. Return success response (never return password or hash)
    return res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt
        }
      }
    });
  } catch (error) {
    // Handle concurrent duplicate key errors from MongoDB unique index
    if (error.code === 11000) {
      return res.status(409).json({
        status: 'fail',
        message: 'Email is already registered'
      });
    }

    // Handle Mongoose schema validation errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        status: 'fail',
        message: error.message
      });
    }

    // Pass unexpected errors to global error handler
    next(error);
  }
};

/**
 * @desc    Authenticate user and login
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 1. Validate required fields
    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        status: 'fail',
        message: 'Email is required'
      });
    }

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        status: 'fail',
        message: 'Password is required'
      });
    }

    // 2. Normalize email and validate format
    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(normalizedEmail) || normalizedEmail.length > 100) {
      return res.status(400).json({
        status: 'fail',
        message: 'Please provide a valid email address'
      });
    }

    // 3. Find user and explicitly select password field
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    // 4. Return generic 401 if user does not exist
    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    // 5. Compare submitted password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid email or password'
      });
    }

    // 6. Sign JWT with user ID as subject (sub claim)
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[JWT Error] JWT_SECRET is not configured.');
      return res.status(500).json({
        status: 'error',
        message: 'Authentication configuration error.'
      });
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        role: user.role
      },
      secret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    );

    // 7. Return safe user data with token (never return password or hash)
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get currently authenticated user's profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// 6. Update profile endpoint
const updateMe = async (req, res, next) => {
  try {
    // 0. Ensure request body is a plain object
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Request body must be a JSON object'
      });
    }

    const payloadKeys = Object.keys(req.body);
    if (payloadKeys.length === 0) {
      return res.status(400).json({
        status: 'fail',
        message: 'No fields provided for update'
      });
    }

    // 1. Reject any password fields outright (presence check)
    if (Object.prototype.hasOwnProperty.call(req.body, 'password') ||
        Object.prototype.hasOwnProperty.call(req.body, 'passwordConfirm')) {
      return res.status(400).json({
        status: 'fail',
        message: 'Password updates are not allowed via this endpoint'
      });
    }

    // 2. Determine allowed fields based on role
    const role = req.user.role;
    const shared = ['name', 'phone', 'location'];
    const candidateOnly = ['headline'];
    const employerOnly = ['companyName', 'companyWebsite', 'companyDescription'];
    let allowed = [...shared];
    if (role === 'candidate') allowed = allowed.concat(candidateOnly);
    if (role === 'employer') allowed = allowed.concat(employerOnly);

    // 3. Detect forbidden fields (including opposite‑role fields)
    const forbidden = payloadKeys.filter(k => !allowed.includes(k));
    if (forbidden.length) {
      return res.status(400).json({
        status: 'fail',
        message: `Invalid field(s): ${forbidden.join(', ')}`
      });
    }

    // 4. Validate and sanitize each allowed field
    const sanitized = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        const raw = req.body[key];
        if (raw !== undefined && raw !== null && typeof raw !== 'string') {
          return res.status(400).json({
            status: 'fail',
            message: `${key} must be a string`
          });
        }
        const value = raw == null ? '' : raw.trim();

        switch (key) {
          case 'name':
            if (value.length < 2 || value.length > 50) {
              return res.status(400).json({
                status: 'fail',
                message: 'Name must be between 2 and 50 characters'
              });
            }
            sanitized.name = value;
            break;
          case 'phone':
            if (value.length > 30) {
              return res.status(400).json({
                status: 'fail',
                message: 'Phone must be 30 characters or fewer'
              });
            }
            sanitized.phone = value;
            break;
          case 'location':
            if (value.length > 120) {
              return res.status(400).json({
                status: 'fail',
                message: 'Location must be 120 characters or fewer'
              });
            }
            sanitized.location = value;
            break;
          case 'headline':
            if (value.length > 160) {
              return res.status(400).json({
                status: 'fail',
                message: 'Headline must be 160 characters or fewer'
              });
            }
            sanitized.headline = value;
            break;
          case 'companyName':
            if (value.length > 120) {
              return res.status(400).json({
                status: 'fail',
                message: 'Company name must be 120 characters or fewer'
              });
            }
            sanitized.companyName = value;
            break;
          case 'companyWebsite':
            if (value.length > 200) {
              return res.status(400).json({
                status: 'fail',
                message: 'Company website must be 200 characters or fewer'
              });
            }
            if (value) {
              const urlPattern = /^(https?:\/\/)[\w.-]+(?:\.[\w.-]+)+[\w\-._~:\/?#\[\]@!$&'()*+,;=.]*$/i;
              if (!urlPattern.test(value)) {
                return res.status(400).json({
                  status: 'fail',
                  message: 'Company website must be a valid http:// or https:// URL'
                });
              }
            }
            sanitized.companyWebsite = value;
            break;
          case 'companyDescription':
            if (value.length > 2000) {
              return res.status(400).json({
                status: 'fail',
                message: 'Company description must be 2000 characters or fewer'
              });
            }
            sanitized.companyDescription = value;
            break;
          default:
            // never reached
        }
      }
    }

    // 5. Perform the update – preserve omitted fields
    const updatedUser = await User.findByIdAndUpdate(req.userId, sanitized, {
      new: true,
      runValidators: true
    });

    if (!updatedUser) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    // 6. Serialize safe response (same shape as GET /me)
    const responseUser = {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      createdAt: updatedUser.createdAt
    };
    if (updatedUser.phone) responseUser.phone = updatedUser.phone;
    if (updatedUser.location) responseUser.location = updatedUser.location;
    if (updatedUser.headline) responseUser.headline = updatedUser.headline;
    if (updatedUser.companyName) responseUser.companyName = updatedUser.companyName;
    if (updatedUser.companyWebsite) responseUser.companyWebsite = updatedUser.companyWebsite;
    if (updatedUser.companyDescription) responseUser.companyDescription = updatedUser.companyDescription;

    return res.status(200).json({
      status: 'success',
      data: { user: responseUser }
    });
  } catch (error) {
    next(error);
  }
};

// Export controllers
module.exports = { register, login, getMe, updateMe };
