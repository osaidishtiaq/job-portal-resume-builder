const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  updateMe,
  forgotPassword,
  resetPassword,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// POST /api/auth/register (Public)
router.post('/register', register);

// POST /api/auth/login (Public)
router.post('/login', login);

// POST /api/auth/forgot-password (Public)
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password (Public)
router.post('/reset-password', resetPassword);

// POST /api/auth/change-password (Protected)
router.post('/change-password', protect, changePassword);

// GET & PATCH /api/auth/me (Protected)
router.get('/me', protect, getMe);
router.patch('/me', protect, updateMe);

module.exports = router;
