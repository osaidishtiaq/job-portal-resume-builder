const jwt = require('jsonwebtoken');

/**
 * Middleware to protect routes and verify JWT tokens
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // 1. Verify Authorization header existence and format
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'fail',
      message: 'Authentication required. No token provided.'
    });
  }

  // 2. Extract token string
  const token = authHeader.split(' ')[1];
  if (!token || !token.trim()) {
    return res.status(401).json({
      status: 'fail',
      message: 'Authentication required. Malformed token.'
    });
  }

  // 3. Verify token with secret
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[JWT Error] JWT_SECRET is not defined in environment variables.');
      return res.status(500).json({
        status: 'error',
        message: 'Authentication configuration error.'
      });
    }

    const decoded = jwt.verify(token, secret);

    // Ensure subject (user ID) exists
    const userId = decoded.sub || decoded.id;
    if (!userId) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token payload.'
      });
    }

    // Attach verified user details to request
    req.userId = userId;
    req.user = {
      id: userId,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'Token has expired. Please log in again.'
      });
    }

    return res.status(401).json({
      status: 'fail',
      message: 'Invalid authentication token.'
    });
  }
};

module.exports = { protect };
