/**
 * Role authorization middleware
 * Ensures the authenticated user possesses one of the allowed roles.
 * Must be mounted AFTER protect middleware which attaches req.user.
 *
 * @param  {...string} allowedRoles - Permitted roles (e.g. 'employer', 'candidate')
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // 1. Verify that user was authenticated by protect middleware
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        status: 'fail',
        message: 'Authentication required. User role could not be verified.'
      });
    }

    // 2. Verify that user's role is in the allowedRoles list
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: `Forbidden: role '${req.user.role}' is not authorized to access this resource`
      });
    }

    next();
  };
};

module.exports = { authorize };
