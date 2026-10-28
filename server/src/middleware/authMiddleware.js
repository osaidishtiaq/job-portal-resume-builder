const jwt = require('jsonwebtoken');

// Registry of user ID -> minimum valid token issuance timestamp (in integer seconds)
const userRevocationRegistry = new Map();

/**
 * Revoke existing JWT sessions for a user issued before the specified timestamp.
 * Server-side enforcement is applied in protect middleware.
 */
function revokeUserSessions(userId, timestamp = Date.now()) {
  if (!userId) return;
  const iatSeconds = Math.floor(timestamp / 1000);
  userRevocationRegistry.set(String(userId), iatSeconds);
}

/**
 * Clear the revocation registry (primarily for testing purposes)
 */
function clearRevocationRegistry() {
  userRevocationRegistry.clear();
}

/**
 * Middleware to protect routes and verify JWT tokens
 */
const protect = async (req, res, next) => {
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

    // Load persisted authVersion and passwordChangedAt for robust revocation
    const user = await require('../models/User')
      .findById(userId)
      .select('+authVersion +passwordChangedAt');

    if (!user) {
      return res.status(401).json({
        status: 'fail',
        message: 'Invalid token – user not found.'
      });
    }
    // Verify token authVersion matches persisted version (token must be >= current)
    if ((decoded.authVersion ?? 0) < user.authVersion) {
      return res.status(401).json({
        status: 'fail',
        message: 'User credentials have changed. Please log in again.'
      });
    }

    // Legacy passwordChangedAt revocation check (<= to reject same‑second tokens)
    const persistedRevokedAt = user.passwordChangedAt
      ? Math.floor(user.passwordChangedAt.getTime() / 1000)
      : null;
    if (persistedRevokedAt && decoded.iat && decoded.iat <= persistedRevokedAt) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password. Please log in again.'
      });
    }

    // In‑memory map revocation (retained for other use‑cases)
    const mapRevokedAt = userRevocationRegistry.get(String(userId));
    if (mapRevokedAt && decoded.iat && decoded.iat < mapRevokedAt) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password. Please log in again.'
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

module.exports = { protect, revokeUserSessions, clearRevocationRegistry };
