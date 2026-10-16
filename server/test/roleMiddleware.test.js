const { describe, it } = require('node:test');
const assert = require('node:assert');
const { authorize } = require('../src/middleware/roleMiddleware');

describe('roleMiddleware - authorize', () => {
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

  it('rejects request when req.user is missing (401)', () => {
    const req = {};
    const res = createMockRes();
    let nextCalled = false;

    const middleware = authorize('employer');
    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.status, 'fail');
    assert.strictEqual(res.jsonData.message, 'Authentication required. User role could not be verified.');
    assert.strictEqual(nextCalled, false);
  });

  it('rejects request when req.user has no role (401)', () => {
    const req = { user: { id: '123' } };
    const res = createMockRes();
    let nextCalled = false;

    const middleware = authorize('employer');
    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 401);
    assert.strictEqual(res.jsonData.status, 'fail');
    assert.strictEqual(nextCalled, false);
  });

  it('rejects candidate user attempting to access employer route (403)', () => {
    const req = { user: { id: 'user_candidate_1', role: 'candidate' } };
    const res = createMockRes();
    let nextCalled = false;

    const middleware = authorize('employer');
    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(res.statusCode, 403);
    assert.strictEqual(res.jsonData.status, 'fail');
    assert.strictEqual(
      res.jsonData.message,
      "Forbidden: role 'candidate' is not authorized to access this resource"
    );
    assert.strictEqual(nextCalled, false);
  });

  it('allows employer user to access employer route and calls next()', () => {
    const req = { user: { id: 'user_employer_1', role: 'employer' } };
    const res = createMockRes();
    let nextCalled = false;

    const middleware = authorize('employer');
    middleware(req, res, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(res.statusCode, null);
  });

  it('supports multiple allowed roles (candidate or employer)', () => {
    const middleware = authorize('candidate', 'employer');

    const reqCandidate = { user: { id: 'c1', role: 'candidate' } };
    const res1 = createMockRes();
    let next1 = false;
    middleware(reqCandidate, res1, () => {
      next1 = true;
    });
    assert.strictEqual(next1, true);

    const reqEmployer = { user: { id: 'e1', role: 'employer' } };
    const res2 = createMockRes();
    let next2 = false;
    middleware(reqEmployer, res2, () => {
      next2 = true;
    });
    assert.strictEqual(next2, true);

    const reqAdmin = { user: { id: 'a1', role: 'guest' } };
    const res3 = createMockRes();
    let next3 = false;
    middleware(reqAdmin, res3, () => {
      next3 = true;
    });
    assert.strictEqual(next3, false);
    assert.strictEqual(res3.statusCode, 403);
  });
});
