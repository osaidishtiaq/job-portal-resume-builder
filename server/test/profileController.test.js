// server/test/profileController.test.js
// Tests for GET /api/auth/me and PATCH /api/auth/me (profile management)

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('../src/models/User');
const { getMe, updateMe } = require('../src/controllers/authController');
const { protect } = require('../src/middleware/authMiddleware');

let mongoServer;
function createMockRes() {
  const res = {
    statusCode: null,
    jsonData: null,
    status(code) { this.statusCode = code; return this; },
    json(data) { this.jsonData = data; return this; }
  };
  return res;
}

function authReq(user) {
  const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'test_secret', { expiresIn: '1h' });
  return { headers: { authorization: `Bearer ${token}` } };
}

before(async () => {
  const { MongoMemoryServer } = require('mongodb-memory-server');
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
});

after(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Profile Controller', () => {
  let candidateUser, employerUser;

  before(async () => {
    candidateUser = await User.create({
      name: 'Candidate One',
      email: 'candidate@example.com',
      password: await require('bcrypt').hash('pwd12345', 10),
      role: 'candidate'
    });
    employerUser = await User.create({
      name: 'Employer Inc',
      email: 'employer@example.com',
      password: await require('bcrypt').hash('pwd12345', 10),
      role: 'employer'
    });
  });

  // GET tests
  it('candidate GET profile returns base fields only', async () => {
    const req = { userId: candidateUser._id };
    const res = createMockRes();
    await getMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    const user = res.jsonData.data.user;
    assert.strictEqual(user.id.toString(), candidateUser._id.toString());
    assert.strictEqual(user.role, 'candidate');
    assert.strictEqual(user.email, candidateUser.email);
    assert.strictEqual(user.name, candidateUser.name);
    assert.ok(user.phone === undefined);
    assert.ok(user.headline === undefined);
  });

  it('employer GET profile returns base fields only', async () => {
    const req = { userId: employerUser._id };
    const res = createMockRes();
    await getMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    const user = res.jsonData.data.user;
    assert.strictEqual(user.role, 'employer');
    assert.ok(user.companyName === undefined);
  });

  // PATCH success
  it('candidate PATCH updates allowed fields', async () => {
    const req = {
      userId: candidateUser._id,
      user: { role: 'candidate' },
      body: { name: '  New Name  ', phone: '  1234567890  ', location: '  City  ', headline: '  My Headline  ' }
    };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    const upd = res.jsonData.data.user;
    assert.strictEqual(upd.name, 'New Name');
    assert.strictEqual(upd.phone, '1234567890');
    assert.strictEqual(upd.location, 'City');
    assert.strictEqual(upd.headline, 'My Headline');
  });

  it('employer PATCH updates allowed fields', async () => {
    const req = {
      userId: employerUser._id,
      user: { role: 'employer' },
      body: {
        name: 'Employer Co',
        phone: '555-1111',
        location: 'HQ',
        companyName: 'Acme Corp',
        companyWebsite: 'https://acme.example.com',
        companyDescription: 'Best products.'
      }
    };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    const u = res.jsonData.data.user;
    assert.strictEqual(u.name, 'Employer Co');
    assert.strictEqual(u.phone, '555-1111');
    assert.strictEqual(u.location, 'HQ');
    assert.strictEqual(u.companyName, 'Acme Corp');
    assert.strictEqual(u.companyWebsite, 'https://acme.example.com');
    assert.strictEqual(u.companyDescription, 'Best products.');
  });

  it('partial update preserves other fields', async () => {
    const original = await User.findById(candidateUser._id);
    const req = { userId: candidateUser._id, user: { role: 'candidate' }, body: { phone: '999-9999' } };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 200);
    const updated = await User.findById(candidateUser._id);
    assert.strictEqual(updated.name, original.name);
    assert.strictEqual(updated.phone, '999-9999');
  });

  // Validation failures
  it('rejects non‑string field types', async () => {
    const req = { userId: candidateUser._id, user: { role: 'candidate' }, body: { name: 12345 } };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /name must be a string/i);
  });

  it('rejects invalid companyWebsite URL for employer', async () => {
    const req = { userId: employerUser._id, user: { role: 'employer' }, body: { companyWebsite: 'not-a-url' } };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /valid http:\/\/ or https:\/\//i);
  });

  it('rejects forbidden fields (email, password, role)', async () => {
    const req = { userId: candidateUser._id, user: { role: 'candidate' }, body: { email: 'new@email.com' } };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /Invalid field\(s\): email/i);
  });

  it('rejects opposite‑role fields', async () => {
    const req = { userId: candidateUser._id, user: { role: 'candidate' }, body: { companyName: 'Foo' } };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /Invalid field\(s\): companyName/i);
  });

  it('rejects unknown fields', async () => {
    const req = { userId: candidateUser._id, user: { role: 'candidate' }, body: { unknownField: 'value' } };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /Invalid field\(s\): unknownField/i);
  });

  it('rejects empty request body', async () => {
    const req = { userId: candidateUser._id, user: { role: 'candidate' }, body: {} };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.jsonData.message, /No fields provided/i);
  });

  it('returns 404 when user does not exist', async () => {
    const nonId = new mongoose.Types.ObjectId();
    const req = { userId: nonId, user: { role: 'candidate' }, body: { name: 'Name' } };
    const res = createMockRes();
    await updateMe(req, res, () => {});
    assert.strictEqual(res.statusCode, 404);
    assert.match(res.jsonData.message, /User not found/i);
  });
});
