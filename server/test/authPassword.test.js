// server/test/authPassword.test.js
// Tests for Forgot Password, Reset Password, Change Password, and Session Invalidation

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const User = require('../src/models/User');
const emailService = require('../src/services/emailService');
const {
  forgotPassword,
  resetPassword,
  changePassword,
  clearResetRateLimitTracker
} = require('../src/controllers/authController');
const {
  protect,
  revokeUserSessions,
  clearRevocationRegistry
} = require('../src/middleware/authMiddleware');

function createMockRes() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

describe('Password Recovery & Security Suite', () => {
  const TEST_SECRET = 'test_password_recovery_jwt_secret';
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.CLIENT_URL = 'http://localhost:5173';

  beforeEach(() => {
    clearResetRateLimitTracker();
    clearRevocationRegistry();
  });

  // ==================== FORGOT PASSWORD ====================
  describe('POST /api/auth/forgot-password', () => {
    it('rejects missing or empty email with 400', async () => {
      const req = { body: {} };
      const res = createMockRes();
      await forgotPassword(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.strictEqual(res.jsonData.message, 'Email is required');
    });

    it('rejects invalid email format with 400', async () => {
      const req = { body: { email: 'not-an-email' } };
      const res = createMockRes();
      await forgotPassword(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.strictEqual(res.jsonData.message, 'Please provide a valid email address');
    });

    it('returns generic success response for nonexistent user without sending email', async () => {
      const originalFindOne = User.findOne;
      let emailSent = false;
      const originalSendReset = emailService.sendPasswordResetEmail;
      emailService.sendPasswordResetEmail = async () => { emailSent = true; };

      User.findOne = async () => null;

      const req = { body: { email: 'nonexistent@example.com' } };
      const res = createMockRes();
      await forgotPassword(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonData.status, 'success');
      assert.strictEqual(
        res.jsonData.message,
        'If an account with that email exists, a password reset link has been sent.'
      );
      assert.strictEqual(emailSent, false);

      User.findOne = originalFindOne;
      emailService.sendPasswordResetEmail = originalSendReset;
    });

    it('generates hashed token, future expiry, dispatches reset email, and returns generic 200 for existing user', async () => {
      let savedToken = null;
      let savedExpire = null;
      let emailDispatchedParams = null;

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Jane Doe',
        email: 'jane@example.com',
        resetPasswordToken: null,
        resetPasswordExpire: null,
        save: async () => {
          savedToken = mockUser.resetPasswordToken;
          savedExpire = mockUser.resetPasswordExpire;
        }
      };

      const originalFindOne = User.findOne;
      User.findOne = async (query) => {
        if (query.email === 'jane@example.com') return mockUser;
        return null;
      };

      const originalSendReset = emailService.sendPasswordResetEmail;
      emailService.sendPasswordResetEmail = async (params) => {
        emailDispatchedParams = params;
      };

      const req = { body: { email: '  Jane@Example.COM  ' } };
      const res = createMockRes();
      await forgotPassword(req, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonData.status, 'success');
      assert.ok(savedToken, 'Reset token hash must be saved');
      assert.ok(savedExpire > new Date(), 'Expiry must be in the future');

      // Email dispatch verification
      assert.ok(emailDispatchedParams);
      assert.strictEqual(emailDispatchedParams.toEmail, 'jane@example.com');
      assert.strictEqual(emailDispatchedParams.userName, 'Jane Doe');
      assert.ok(emailDispatchedParams.resetUrl.includes('#reset-password?token='));

      // Verify that raw token hashed matches savedToken
      const urlToken = emailDispatchedParams.resetUrl.split('token=')[1];
      const computedHash = crypto.createHash('sha256').update(urlToken).digest('hex');
      assert.strictEqual(computedHash, savedToken);

      User.findOne = originalFindOne;
      emailService.sendPasswordResetEmail = originalSendReset;
    });

    it('returns 500 and clears token if email delivery fails or SMTP is unconfigured', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        name: 'Jane Doe',
        email: 'jane@example.com',
        resetPasswordToken: null,
        resetPasswordExpire: null,
        save: async () => {}
      };

      const originalFindOne = User.findOne;
      User.findOne = async () => mockUser;

      const originalSendReset = emailService.sendPasswordResetEmail;
      emailService.sendPasswordResetEmail = async () => {
        throw new Error('SMTP connection timed out');
      };

      const req = { body: { email: 'jane@example.com' } };
      const res = createMockRes();
      await forgotPassword(req, res, () => {});

      assert.strictEqual(res.statusCode, 500);
      assert.strictEqual(res.jsonData.status, 'error');
      assert.strictEqual(mockUser.resetPasswordToken, undefined);
      assert.strictEqual(mockUser.resetPasswordExpire, undefined);

      User.findOne = originalFindOne;
      emailService.sendPasswordResetEmail = originalSendReset;
    });

    it('enforces rate limiting on repeated reset requests', async () => {
      const originalFindOne = User.findOne;
      User.findOne = async () => null;

      const req = { body: { email: 'rate.limit@example.com' } };

      // 1st, 2nd, 3rd requests succeed
      for (let i = 0; i < 3; i++) {
        const res = createMockRes();
        await forgotPassword(req, res, () => {});
        assert.strictEqual(res.statusCode, 200);
      }

      // 4th request must be rejected with 429
      const res4 = createMockRes();
      await forgotPassword(req, res4, () => {});
      assert.strictEqual(res4.statusCode, 429);
      assert.strictEqual(res4.jsonData.status, 'fail');
      assert.ok(res4.jsonData.message.includes('Too many password reset requests'));

      User.findOne = originalFindOne;
    });
  });

  // ==================== RESET PASSWORD ====================
  describe('POST /api/auth/reset-password', () => {
    it('rejects missing token or password with 400', async () => {
      const res1 = createMockRes();
      await resetPassword({ body: { password: 'ValidPass123' } }, res1, () => {});
      assert.strictEqual(res1.statusCode, 400);
      assert.strictEqual(res1.jsonData.message, 'Reset token is required');

      const res2 = createMockRes();
      await resetPassword({ body: { token: 'some_token' } }, res2, () => {});
      assert.strictEqual(res2.statusCode, 400);
      assert.strictEqual(res2.jsonData.message, 'Password is required');
    });

    it('rejects password shorter than 6 characters with 400', async () => {
      const res = createMockRes();
      await resetPassword({ body: { token: 'some_token', password: '123' } }, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Password must be at least 6 characters long');
    });

    it('rejects invalid or expired token with 400', async () => {
      const originalFindOneAndUpdate = User.findOneAndUpdate;
      User.findOneAndUpdate = () => ({
        select: async () => null
      });

      const res = createMockRes();
      await resetPassword({ body: { token: 'invalid_token', password: 'NewValidPassword123' } }, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Password reset link is invalid or has expired.');

      User.findOneAndUpdate = originalFindOneAndUpdate;
    });

    it('rejects new password if it is identical to previous password', async () => {
      const previousHash = await bcrypt.hash('SameOldPassword123', 10);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        password: previousHash
      };

      const originalFindOneAndUpdate = User.findOneAndUpdate;
      User.findOneAndUpdate = () => ({
        select: async () => mockUser
      });

      const res = createMockRes();
      await resetPassword({ body: { token: 'valid_token', password: 'SameOldPassword123' } }, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'New password cannot be the same as the previous password');

      User.findOneAndUpdate = originalFindOneAndUpdate;
    });

    it('successfully resets password, updates hash, clears token, and invalidates sessions', async () => {
      const oldHash = await bcrypt.hash('OldSecret123', 10);
      let updatedFields = null;

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        password: oldHash
      };

      const originalFindOneAndUpdate = User.findOneAndUpdate;
      User.findOneAndUpdate = (query, update) => {
        assert.ok(update.$unset.resetPasswordToken);
        assert.ok(update.$unset.resetPasswordExpire);
        return {
          select: async () => mockUser
        };
      };

      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = async (id, fields) => {
        assert.strictEqual(id, mockUser._id);
        updatedFields = fields;
        return mockUser;
      };

      const res = createMockRes();
      await resetPassword({ body: { token: 'fresh_token_123', password: 'BrandNewPassword456' } }, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonData.status, 'success');
      assert.ok(updatedFields.password);
      assert.notStrictEqual(updatedFields.password, oldHash);
      assert.ok(await bcrypt.compare('BrandNewPassword456', updatedFields.password));
      assert.ok(updatedFields.passwordChangedAt);

      User.findOneAndUpdate = originalFindOneAndUpdate;
      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });

    it('enforces single-use token by rejecting concurrent / second attempt with same token', async () => {
      let tokenConsumed = false;

      const originalFindOneAndUpdate = User.findOneAndUpdate;
      User.findOneAndUpdate = () => ({
        select: async () => {
          if (tokenConsumed) return null; // Second attempt finds no document!
          tokenConsumed = true;
          return {
            _id: '507f1f77bcf86cd799439011',
            password: await bcrypt.hash('OldPassword1', 10)
          };
        }
      });

      const originalFindByIdAndUpdate = User.findByIdAndUpdate;
      User.findByIdAndUpdate = async () => {};

      // 1st attempt with token succeeds
      const res1 = createMockRes();
      await resetPassword({ body: { token: 'one_time_token', password: 'FirstReset123' } }, res1, () => {});
      assert.strictEqual(res1.statusCode, 200);

      // 2nd concurrent attempt with identical token fails
      const res2 = createMockRes();
      await resetPassword({ body: { token: 'one_time_token', password: 'SecondReset456' } }, res2, () => {});
      assert.strictEqual(res2.statusCode, 400);
      assert.strictEqual(res2.jsonData.message, 'Password reset link is invalid or has expired.');

      User.findOneAndUpdate = originalFindOneAndUpdate;
      User.findByIdAndUpdate = originalFindByIdAndUpdate;
    });
  });

  // ==================== CHANGE PASSWORD ====================
  describe('POST /api/auth/change-password', () => {
    it('rejects request with missing current password or new password', async () => {
      const res1 = createMockRes();
      await changePassword({ body: { newPassword: 'NewPass123' }, userId: 'user1' }, res1, () => {});
      assert.strictEqual(res1.statusCode, 400);
      assert.strictEqual(res1.jsonData.message, 'Current password is required');

      const res2 = createMockRes();
      await changePassword({ body: { currentPassword: 'OldPass123' }, userId: 'user1' }, res2, () => {});
      assert.strictEqual(res2.statusCode, 400);
      assert.strictEqual(res2.jsonData.message, 'New password is required');
    });

    it('rejects new password shorter than 6 characters', async () => {
      const res = createMockRes();
      await changePassword({
        body: { currentPassword: 'OldPassword123', newPassword: 'abc' },
        userId: 'user1'
      }, res, () => {});
      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'New password must be at least 6 characters long');
    });

    it('rejects incorrect current password with 400', async () => {
      const existingHash = await bcrypt.hash('CorrectCurrentPassword123', 10);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        password: existingHash
      };

      const originalFindById = User.findById;
      User.findById = () => ({
        select: async () => mockUser
      });

      const res = createMockRes();
      await changePassword({
        body: { currentPassword: 'WrongPassword', newPassword: 'BrandNewPassword123' },
        userId: mockUser._id
      }, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Current password is incorrect');

      User.findById = originalFindById;
    });

    it('rejects new password identical to current password with 400', async () => {
      const existingHash = await bcrypt.hash('SamePassword123', 10);
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        password: existingHash
      };

      const originalFindById = User.findById;
      User.findById = () => ({
        select: async () => mockUser
      });

      const res = createMockRes();
      await changePassword({
        body: { currentPassword: 'SamePassword123', newPassword: 'SamePassword123' },
        userId: mockUser._id
      }, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'New password cannot be the same as the current password');

      User.findById = originalFindById;
    });

    it('successfully changes password for candidate role and updates hash', async () => {
      const existingHash = await bcrypt.hash('OldCandidatePwd123', 10);
      let saved = false;

      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        role: 'candidate',
        password: existingHash,
        passwordChangedAt: null,
        save: async () => { saved = true; }
      };

      const originalFindById = User.findById;
      User.findById = () => ({
        select: async () => mockUser
      });

      const res = createMockRes();
      await changePassword({
        body: { currentPassword: 'OldCandidatePwd123', newPassword: 'NewCandidatePwd456' },
        userId: mockUser._id
      }, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonData.status, 'success');
      assert.strictEqual(saved, true);
      assert.ok(await bcrypt.compare('NewCandidatePwd456', mockUser.password));
      assert.ok(mockUser.passwordChangedAt instanceof Date);

      User.findById = originalFindById;
    });

    it('successfully changes password for employer role and updates hash', async () => {
      const existingHash = await bcrypt.hash('OldEmployerPwd123', 10);
      let saved = false;

      const mockUser = {
        _id: '507f1f77bcf86cd799439022',
        role: 'employer',
        password: existingHash,
        passwordChangedAt: null,
        save: async () => { saved = true; }
      };

      const originalFindById = User.findById;
      User.findById = () => ({
        select: async () => mockUser
      });

      const res = createMockRes();
      await changePassword({
        body: { currentPassword: 'OldEmployerPwd123', newPassword: 'NewEmployerPwd456' },
        userId: mockUser._id
      }, res, () => {});

      assert.strictEqual(res.statusCode, 200);
      assert.strictEqual(res.jsonData.status, 'success');
      assert.strictEqual(saved, true);
      assert.ok(await bcrypt.compare('NewEmployerPwd456', mockUser.password));

      User.findById = originalFindById;
    });
  });

  // ==================== SESSION INVALIDATION ====================
  describe('Server-side Session Invalidation', () => {
    it('rejects previously issued JWT after password revocation in protect middleware', async () => {
      const userId = '507f1f77bcf86cd799439033';
      const issuedAtSeconds = Math.floor(Date.now() / 1000) - 30; // 30 seconds ago

      // Token issued prior to password change
      const oldToken = jwt.sign(
        { sub: userId, role: 'candidate', iat: issuedAtSeconds },
        TEST_SECRET
      );

      // Now user changes password
      const changeTimestamp = Date.now();
      revokeUserSessions(userId, changeTimestamp);

      // Mock User.findById to return a user with authVersion 0
      const originalFindById = User.findById;
      User.findById = () => ({
        select: () => Promise.resolve({ authVersion: 0, passwordChangedAt: null })
      });

      // Attempting to use oldToken should be rejected
      const req = { headers: { authorization: `Bearer ${oldToken}` } };
      const res = createMockRes();
      let nextCalled = false;

      await protect(req, res, () => { nextCalled = true; });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 401);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.strictEqual(res.jsonData.message, 'User recently changed password. Please log in again.');

      // Restore original findById
      User.findById = originalFindById;
    });

    });

    it('accepts new JWT issued after password change in protect middleware', async () => {


  });

  // ==================== LOGIN INTEGRATION ====================
  describe('Login Compatibility After Password Change/Reset', () => {
    it('accepts login with new password and rejects login with old password', async () => {
      const { login } = require('../src/controllers/authController');
      const newHash = await bcrypt.hash('NewSecretPassword789', 10);

      const mockUser = {
        _id: '507f1f77bcf86cd799439044',
        name: 'Auth Tester',
        email: 'tester@example.com',
        role: 'candidate',
        password: newHash,
        createdAt: new Date()
      };

      const originalFindOne = User.findOne;
      User.findOne = () => ({
        select: async () => mockUser
      });

      // 1. Attempt login with old password -> must fail with 401
      const resOld = createMockRes();
      await login(
        { body: { email: 'tester@example.com', password: 'OldPassword123' } },
        resOld,
        () => {}
      );
      assert.strictEqual(resOld.statusCode, 401);
      assert.strictEqual(resOld.jsonData.status, 'fail');
      assert.strictEqual(resOld.jsonData.message, 'Invalid email or password');

      // 2. Attempt login with new password -> must succeed with 200 and return token
      const resNew = createMockRes();
      await login(
        { body: { email: 'tester@example.com', password: 'NewSecretPassword789' } },
        resNew,
        () => {}
      );
      assert.strictEqual(resNew.statusCode, 200);
      assert.strictEqual(resNew.jsonData.status, 'success');
      assert.ok(resNew.jsonData.data.token);
      assert.strictEqual(resNew.jsonData.data.user.email, 'tester@example.com');

      User.findOne = originalFindOne;
    });
  });
});
