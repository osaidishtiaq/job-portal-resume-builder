// Resume Controller Tests
// Verifies behavior of getMyResume and saveMyResume
// Uses simple mocks for Mongoose Resume model methods

const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const Resume = require('../src/models/Resume');
const { getMyResume, saveMyResume } = require('../src/controllers/resumeController');

// Helper to create a mock response object similar to other test suites
function createMockRes() {
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
}

const mockUserId = new mongoose.Types.ObjectId().toString();

describe('Resume Controller – GET /api/resumes/my', () => {
  it('returns the resume when it exists', async () => {
    const mockResume = { _id: 'resumeId', user: mockUserId, personalDetails: { fullName: 'John Doe' } };
    const originalFindOne = Resume.findOne;
    Resume.findOne = async (filter) => {
      assert.deepStrictEqual(filter, { user: mockUserId });
      return mockResume;
    };
    const req = { userId: mockUserId };
    const res = createMockRes();
    await getMyResume(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.deepStrictEqual(res.jsonData.data.resume, mockResume);
    Resume.findOne = originalFindOne;
  });

  it('returns resume: null when none exists', async () => {
    const originalFindOne = Resume.findOne;
    Resume.findOne = async () => null;
    const req = { userId: mockUserId };
    const res = createMockRes();
    await getMyResume(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.data.resume, null);
    Resume.findOne = originalFindOne;
  });

  it('passes errors to next middleware', async () => {
    const error = new Error('DB failure');
    const originalFindOne = Resume.findOne;
    Resume.findOne = async () => { throw error; };
    const req = { userId: mockUserId };
    let capturedErr = null;
    await getMyResume(req, createMockRes(), (err) => { capturedErr = err; });
    assert.strictEqual(capturedErr, error);
    Resume.findOne = originalFindOne;
  });
});

describe('Resume Controller – PUT /api/resumes/my', () => {
  // Helper to reset all Resume mock modifications
  function resetResumeMocks() {
    delete Resume.findOne;
    delete Resume.prototype.save;
  }

  it('rejects non‑object request bodies', async () => {
    const req = { userId: mockUserId, body: 'not-an-object' };
    const res = createMockRes();
    await saveMyResume(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.strictEqual(res.jsonData.status, 'fail');
  });

  it('rejects unknown top‑level fields', async () => {
    const req = { userId: mockUserId, body: { unknown: true, personalDetails: {} } };
    const res = createMockRes();
    await saveMyResume(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.jsonData.message.includes('Unknown or disallowed field'));
  });

  it('rejects missing personalDetails object', async () => {
    const req = { userId: mockUserId, body: {} };
    const res = createMockRes();
    await saveMyResume(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.jsonData.message.includes('personalDetails'));
  });

  it('rejects invalid fullName (too long)', async () => {
    const longName = 'A'.repeat(81);
    const req = { userId: mockUserId, body: { personalDetails: { fullName: longName, email: 'a@b.c' } } };
    const res = createMockRes();
    await saveMyResume(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.ok(res.jsonData.message.includes('cannot exceed 80 characters'));
  });

  it('handles duplicate‑key error with 409', async () => {
    const validPayload = {
      personalDetails: { fullName: 'John Doe', email: 'john@example.com' }
    };
    const req = { userId: mockUserId, body: validPayload };
    const originalFindOne = Resume.findOne;
    Resume.findOne = async () => null;
    const originalConstructor = Resume;
    function MockResume(data) {
      this.data = data;
    }
    MockResume.prototype.save = async function () { const err = new Error('duplicate'); err.code = 11000; throw err; };
    const module = require.cache[require.resolve('../src/models/Resume')];
    module.exports = MockResume;
    const { saveMyResume: mockedSave } = require('../src/controllers/resumeController');
    const res = createMockRes();
    await mockedSave(req, res, () => {});
    assert.strictEqual(res.statusCode, 409);
    assert.ok(res.jsonData.message.includes('already exists'));
    Resume.findOne = originalFindOne;
    module.exports = originalConstructor;
  });

  it('creates a new resume when none exists', async () => {
    const payload = {
      personalDetails: { fullName: 'Jane Doe', email: 'jane@example.com' },
      skills: ['JavaScript', 'Node.js'],
      education: [],
      experience: []
    };
    const req = { userId: mockUserId, body: payload };
    const originalFindOne = Resume.findOne;
    Resume.findOne = async () => null;
    const originalConstructor = Resume;
    function MockResume(data) {
      Object.assign(this, data);
      this.saved = false;
    }
    MockResume.prototype.save = async function () { this.saved = true; return this; };
    const module = require.cache[require.resolve('../src/models/Resume')];
    module.exports = MockResume;
    const { saveMyResume: mockedSave } = require('../src/controllers/resumeController');
    const res = createMockRes();
    await mockedSave(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.jsonData.success, true);
    assert.strictEqual(res.jsonData.message, 'Resume saved successfully');
    assert.strictEqual(res.jsonData.data.resume.saved, true);
    assert.strictEqual(res.jsonData.data.resume.user.toString(), mockUserId);
    Resume.findOne = originalFindOne;
    module.exports = originalConstructor;
  });

  it('updates an existing resume', async () => {
    const existing = {
      user: mockUserId,
      personalDetails: { fullName: 'Old Name', email: 'old@example.com' },
      saveCalled: false,
      async save() { this.saveCalled = true; return this; }
    };
    const payload = {
      personalDetails: { fullName: 'New Name', email: 'new@example.com' },
      skills: [],
      education: [],
      experience: []
    };
    const req = { userId: mockUserId, body: payload };
    const originalFindOne = Resume.findOne;
    Resume.findOne = async () => existing;
    const res = createMockRes();
    await saveMyResume(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(existing.saveCalled, true);
    assert.strictEqual(existing.personalDetails.fullName, 'New Name');
    assert.strictEqual(existing.personalDetails.email, 'new@example.com');
    Resume.findOne = originalFindOne;
  });
});
