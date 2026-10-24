const { describe, it, before, after } = require('node:test');
const User = require('../src/models/User');
const originalUserFindById = User.findById;
// Default stub to avoid DB hits in tests that don't set a specific mock
before(() => { User.findById = async () => ({ email: 'default@example.com', name: 'Default' }); });
after(() => { User.findById = originalUserFindById; });
const assert = require('node:assert');
const mongoose = require('mongoose');

const Application = require('../src/models/Application');
const Job = require('../src/models/Job');
const { applyToJob } = require('../src/controllers/applicationController');
const emailService = require('../src/services/emailService');

function restoreAll(originals) {
  for (const [obj, prop, original] of originals) {
    obj[prop] = original;
  }
}

describe('Email Notification Edge Cases', () => {
  it('does not send email when SMTP config missing', async () => {
    const savedEnv = { ...process.env };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_PORT;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
    delete process.env.SMTP_FROM;

    const validCandidateId = new mongoose.Types.ObjectId().toString();
    const validJobId = new mongoose.Types.ObjectId().toString();
    const mockJob = { _id: validJobId, title: 'Test Job', status: 'active', employer: new mongoose.Types.ObjectId() };

    const originals = [];
    const origJobFind = Job.findById;
    Job.findById = async () => mockJob;
    originals.push([Job, 'findById', origJobFind]);

    const origAppFind = Application.findOne;
    Application.findOne = async () => null;
    originals.push([Application, 'findOne', origAppFind]);

    const origAppCreate = Application.create;
    Application.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
    originals.push([Application, 'create', origAppCreate]);

    const User = require('../src/models/User');
    const origUserFind = User.findById;
    User.findById = async () => ({ email: 'employer@example.com', name: 'Employer' });
    originals.push([User, 'findById', origUserFind]);

    const origSend = emailService.sendApplicationNotification;
    let called = false;
    emailService.sendApplicationNotification = async () => { called = true; };
    originals.push([emailService, 'sendApplicationNotification', origSend]);

    const req = { params: { id: validJobId }, userId: validCandidateId, body: { coverLetter: 'Hi' } };
    const res = { statusCode: null, jsonData: null, status(c) { this.statusCode = c; return this; }, json(d) { this.jsonData = d; return this; } };

    await applyToJob(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(called, false);

    restoreAll(originals);
    process.env = savedEnv;
  });

  it('catches transporter.sendMail rejection', async () => {
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_FROM = 'no-reply@test.com';

    const validCandidateId = new mongoose.Types.ObjectId().toString();
    const validJobId = new mongoose.Types.ObjectId().toString();
    const mockJob = { _id: validJobId, title: 'Job', status: 'active', employer: new mongoose.Types.ObjectId() };

    const originals = [];
    const origJobFind = Job.findById;
    Job.findById = async () => mockJob;
    originals.push([Job, 'findById', origJobFind]);

    const origAppFind = Application.findOne;
    Application.findOne = async () => null;
    originals.push([Application, 'findOne', origAppFind]);

    const origAppCreate = Application.create;
    Application.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
    originals.push([Application, 'create', origAppCreate]);

    const User = require('../src/models/User');
    const origUserFind = User.findById;
    User.findById = async () => ({ email: 'employer@test.com', name: 'Emp' });
    originals.push([User, 'findById', origUserFind]);

    const origSend = emailService.sendApplicationNotification;
    emailService.sendApplicationNotification = async () => { throw new Error('SMTP error'); };
    originals.push([emailService, 'sendApplicationNotification', origSend]);

    const req = { params: { id: validJobId }, userId: validCandidateId, body: { coverLetter: 'Hello' } };
    const res = { statusCode: null, jsonData: null, status(c) { this.statusCode = c; return this; }, json(d) { this.jsonData = d; return this; } };

    await applyToJob(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);

    restoreAll(originals);
  });

  it('does not send email when employer lookup fails', async () => {
    const savedEnv = { ...process.env };
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_FROM = 'no-reply@test.com';

    const validCandidateId = new mongoose.Types.ObjectId().toString();
    const validJobId = new mongoose.Types.ObjectId().toString();
    const mockJob = { _id: validJobId, title: 'Job', status: 'active', employer: new mongoose.Types.ObjectId() };

    const originals = [];
    const origJobFind = Job.findById;
    Job.findById = async () => mockJob;
    originals.push([Job, 'findById', origJobFind]);

    const origAppFind = Application.findOne;
    Application.findOne = async () => null;
    originals.push([Application, 'findOne', origAppFind]);

    const origAppCreate = Application.create;
    Application.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
    originals.push([Application, 'create', origAppCreate]);

    const User = require('../src/models/User');
    const origUserFind = User.findById;
    User.findById = async (id) => {
      if (id.toString() === mockJob.employer.toString()) return null; // employer missing
      return { name: 'Candidate', email: 'cand@test.com' };
    };
    originals.push([User, 'findById', origUserFind]);

    const origSend = emailService.sendApplicationNotification;
    let called = false;
    emailService.sendApplicationNotification = async () => { called = true; };
    originals.push([emailService, 'sendApplicationNotification', origSend]);

    const req = { params: { id: validJobId }, userId: validCandidateId, body: { coverLetter: 'Hi' } };
    const res = { statusCode: null, jsonData: null, status(c) { this.statusCode = c; return this; }, json(d) { this.jsonData = d; return this; } };

    await applyToJob(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(called, false);

    restoreAll(originals);
    process.env = savedEnv;
  });

  it('does not send email when candidate lookup fails (email still attempted) and uses fallback name', async () => {
    const savedEnv = { ...process.env };
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_FROM = 'no-reply@test.com';

    const validCandidateId = new mongoose.Types.ObjectId().toString();
    const validJobId = new mongoose.Types.ObjectId().toString();
    const mockJob = { _id: validJobId, title: 'Job', status: 'active', employer: new mongoose.Types.ObjectId() };

    const originals = [];
    const origJobFind = Job.findById;
    Job.findById = async () => mockJob;
    originals.push([Job, 'findById', origJobFind]);

    const origAppFind = Application.findOne;
    Application.findOne = async () => null;
    originals.push([Application, 'findOne', origAppFind]);

    const origAppCreate = Application.create;
    Application.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });
    originals.push([Application, 'create', origAppCreate]);

    const User = require('../src/models/User');
    const origUserFind = User.findById;
    User.findById = async (id) => {
      if (id.toString() === mockJob.employer.toString()) return { email: 'emp@test.com', name: 'Emp' };
      return null; // candidate missing
    };
    originals.push([User, 'findById', origUserFind]);

    const origSend = emailService.sendApplicationNotification;
    let called = false;
    let capturedArgs = null;
      emailService.sendApplicationNotification = async (args) => { called = true; capturedArgs = args; };
    originals.push([emailService, 'sendApplicationNotification', origSend]);

    const req = { params: { id: validJobId }, userId: validCandidateId, body: { coverLetter: 'Hello' } };
    const res = { statusCode: null, jsonData: null, status(c) { this.statusCode = c; return this; }, json(d) { this.jsonData = d; return this; } };

    await applyToJob(req, res, () => {});
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(called, true);

    restoreAll(originals);
    process.env = savedEnv;
  });

  it('does not trigger email on duplicate application', async () => {
    const savedEnv = { ...process.env };
    process.env.SMTP_HOST = 'smtp.test';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_FROM = 'no-reply@test.com';

    const validCandidateId = new mongoose.Types.ObjectId().toString();
    const validJobId = new mongoose.Types.ObjectId().toString();
    const mockJob = { _id: validJobId, title: 'Job', status: 'active', employer: new mongoose.Types.ObjectId() };

    const originals = [];
    const origJobFind = Job.findById;
    Job.findById = async () => mockJob;
    originals.push([Job, 'findById', origJobFind]);

    const origAppFind = Application.findOne;
    Application.findOne = async () => ({ _id: new mongoose.Types.ObjectId() }); // duplicate exists
    originals.push([Application, 'findOne', origAppFind]);

    const origSend = emailService.sendApplicationNotification;
    let called = false;
    emailService.sendApplicationNotification = async () => { called = true; };
    originals.push([emailService, 'sendApplicationNotification', origSend]);

    const req = { params: { id: validJobId }, userId: validCandidateId, body: { coverLetter: 'Hi' } };
    const res = { statusCode: null, jsonData: null, status(c) { this.statusCode = c; return this; }, json(d) { this.jsonData = d; return this; } };

    await applyToJob(req, res, () => {});
    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(called, false);

    restoreAll(originals);
    process.env = savedEnv;
  });
});
