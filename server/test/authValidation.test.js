const { describe, it } = require('node:test');
const assert = require('node:assert');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { register, login } = require('../src/controllers/authController');

describe('authController - validation logic', () => {
  const createMockRes = () => {
    const res = {
      statusCode: null,
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
  };

  describe('register validation', () => {
    it('rejects registration with missing name', async () => {
      const req = { body: { email: 'user@example.com', password: 'password123' } };
      const res = createMockRes();

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Name is required');
    });

    it('rejects registration with name shorter than 2 characters', async () => {
      const req = { body: { name: 'A', email: 'user@example.com', password: 'password123' } };
      const res = createMockRes();

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Name must be between 2 and 50 characters');
    });

    it('rejects registration with name longer than 50 characters', async () => {
      const req = { body: { name: 'A'.repeat(51), email: 'user@example.com', password: 'password123' } };
      const res = createMockRes();

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Name must be between 2 and 50 characters');
    });

    it('rejects registration with missing email', async () => {
      const req = { body: { name: 'Alex', password: 'password123' } };
      const res = createMockRes();

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Email is required');
    });

    it('rejects registration with invalid email format', async () => {
      const req = { body: { name: 'Alex', email: 'not-an-email', password: 'password123' } };
      const res = createMockRes();

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Please provide a valid email address');
    });

    it('rejects registration with password shorter than 6 characters', async () => {
      const req = { body: { name: 'Alex', email: 'user@example.com', password: '123' } };
      const res = createMockRes();

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Password must be at least 6 characters long');
    });

    it('rejects registration with invalid role', async () => {
      const req = { body: { name: 'Alex', email: 'user@example.com', password: 'password123', role: 'admin' } };
      const res = createMockRes();

      await register(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Role must be either "candidate" or "employer"');
    });
  });

  describe('login validation', () => {
    it('rejects login with missing email', async () => {
      const req = { body: { password: 'password123' } };
      const res = createMockRes();

      await login(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Email is required');
    });

    it('rejects login with invalid email format', async () => {
      const req = { body: { email: 'bademail', password: 'password123' } };
      const res = createMockRes();

      await login(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Please provide a valid email address');
    });

    it('rejects login with missing password', async () => {
      const req = { body: { email: 'user@example.com' } };
      const res = createMockRes();

      await login(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Password is required');
    });
  });

  describe('cryptography and token verification', () => {
    it('hashes passwords and validates with bcrypt correctly', async () => {
      const plainPassword = 'securePassword123!';
      const hash = await bcrypt.hash(plainPassword, 10);

      assert.notStrictEqual(plainPassword, hash);
      assert.strictEqual(hash.startsWith('$2'), true);

      const isMatch = await bcrypt.compare(plainPassword, hash);
      assert.strictEqual(isMatch, true);

      const isWrong = await bcrypt.compare('wrongPassword', hash);
      assert.strictEqual(isWrong, false);
    });

    it('signs and verifies JWT tokens containing subject (sub) and role', () => {
      const secret = 'unit_test_secret_key_889900';
      const userId = '64f8a123bc45de6789012345';
      const userRole = 'candidate';

      const token = jwt.sign(
        { sub: userId, role: userRole },
        secret,
        { expiresIn: '1h' }
      );

      const decoded = jwt.verify(token, secret);
      assert.strictEqual(decoded.sub, userId);
      assert.strictEqual(decoded.role, userRole);
      assert.ok(decoded.exp);
    });
  });
});
