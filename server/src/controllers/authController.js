const bcrypt = require('bcrypt');
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

    // 6. Return safe user data without password or hash
    return res.status(200).json({
      status: 'success',
      message: 'Login successful',
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

module.exports = { register, login };
