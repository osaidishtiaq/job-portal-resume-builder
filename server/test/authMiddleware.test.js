const { describe, it } = require('node:test');
const assert = require('node:assert');
const jwt = require('jsonwebtoken');
const { protect } = require('../src/middleware/authMiddleware');

describe('authMiddleware - protect', () => {
  const TEST_SECRET = 'test_jwt_secret_key_123456';
  process.env.JWT_SECRET = TEST_SECRET;

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

  it('rejects request when Authorization header is missing', async () => {
    const req = { headers: {} };
    const res = createMockRes();
    let nextCalled = false;

    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.status, 'fail');
    assert.strictEqual(res.jsonData.message, 'Authentication required. No token provided.');
    assert.strictEqual(nextCalled, false);
  });

  it('rejects request when Authorization header does not start with Bearer', async () => {
    const req = { headers: { authorization: 'Basic somebase64credentials' } };
    const res = createMockRes();
    let nextCalled = false;

    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.status, 'fail');
    assert.strictEqual(res.jsonData.message, 'Authentication required. No token provided.');
    assert.strictEqual(nextCalled, false);
  });

  it('rejects request when Bearer token is empty or whitespace', async () => {
    const req = { headers: { authorization: 'Bearer ' } };
    const res = createMockRes();
    let nextCalled = false;

    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.status, 'fail');
    assert.strictEqual(res.jsonData.message, 'Authentication required. Malformed token.');
    assert.strictEqual(nextCalled, false);
  });

  it('rejects request when token is invalid or signed with wrong secret', async () => {
    const fakeToken = jwt.sign({ sub: 'user123', role: 'candidate' }, 'wrong_secret');
    const req = { headers: { authorization: `Bearer ${fakeToken}` } };
    const res = createMockRes();
    let nextCalled = false;

    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.status, 'fail');
    assert.strictEqual(res.jsonData.message, 'Invalid authentication token.');
    assert.strictEqual(nextCalled, false);
  });

  it('rejects request when token is expired', async () => {
    const expiredToken = jwt.sign(
      { sub: 'user123', role: 'candidate' },
      TEST_SECRET,
      { expiresIn: '-1s' }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = createMockRes();
    let nextCalled = false;

    await protect(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.status, 'fail');
    assert.strictEqual(res.jsonData.message, 'Token has expired. Please log in again.');
    assert.strictEqual(nextCalled, false);
  });

  it('accepts valid JWT, sets req.userId and req.user, and calls next()', async () => {
    const validToken = jwt.sign(
      { sub: '507f1f77bcf86cd799439011', role: 'employer', authVersion: 0 },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
    const req = { headers: { authorization: `Bearer ${validToken}` } };
    const res = createMockRes();
    let nextCalled = false;

    // Mock User.findById to return a user
    const User = require('../src/models/User');
    const originalFindById = User.findById;
    User.findById = (id) => ({
      select: () => Promise.resolve({ authVersion: 0, passwordChangedAt: null })
    });

    await protect(req, res, () => {
      nextCalled = true;
    });

    // Restore original method
    User.findById = originalFindById;

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(req.userId, '507f1f77bcf86cd799439011');
    assert.deepStrictEqual(req.user, {
      id: '507f1f77bcf86cd799439011',
      role: 'employer'
    });
    assert.strictEqual(res.statusCode, null);
  });
});
