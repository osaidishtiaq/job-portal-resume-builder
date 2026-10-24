const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

const Application = require('../src/models/Application');
const Job = require('../src/models/Job');
const { applyToJob } = require('../src/controllers/applicationController');
const emailService = require('../src/services/emailService');

describe('Email Notification on Application Submission', () => {
  it('should call sendApplicationNotification after successful application', async () => {
    // Arrange
    const savedEnv = { ...process.env };
    process.env.SMTP_HOST = 'smtp.example.com';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = 'user';
    process.env.SMTP_PASS = 'pass';
    process.env.SMTP_FROM = 'no-reply@example.com';

    const validCandidateId = new mongoose.Types.ObjectId().toString();
    const validJobId = new mongoose.Types.ObjectId().toString();
    const mockJob = {
      _id: validJobId,
      title: 'Full Stack Engineer',
      status: 'active',
      employer: new mongoose.Types.ObjectId()
    };

    // Mock Job.findById to return mockJob
    const originalJobFindById = Job.findById;
    Job.findById = async (id) => {
      assert.strictEqual(id, validJobId);
      return mockJob;
    };

    // Mock Application.findOne to return null (no existing)
    const originalAppFindOne = Application.findOne;
    Application.findOne = async () => null;

    // Mock Application.create to capture doc
    const originalAppCreate = Application.create;
    let createdDoc = null;
    Application.create = async (doc) => {
      createdDoc = doc;
      return { _id: new mongoose.Types.ObjectId(), ...doc };
    };

    // Mock User model for employer and candidate lookup
    const User = require('../src/models/User');
    const originalUserFindById = User.findById;
    User.findById = async (id) => {
      if (id.toString() === mockJob.employer.toString()) {
        return { email: 'employer@example.com', name: 'Employer Co' };
      }
      return { name: 'Candidate Name' };
    };

    // Spy on email service
    let emailArgs = null;
    const originalSend = emailService.sendApplicationNotification;
    emailService.sendApplicationNotification = async (args) => {
      emailArgs = args;
    };

    const req = {
      params: { id: validJobId },
      userId: validCandidateId,
      body: { coverLetter: 'Looking forward' }
    };
    const res = {
      statusCode: null,
      jsonData: null,
      status(code) { this.statusCode = code; return this; },
      json(data) { this.jsonData = data; return this; }
    };

    // Act
    await applyToJob(req, res, () => {});

    // Assert
    assert.strictEqual(res.statusCode, 201);
    assert.ok(emailArgs, 'Email service should have been called');
    assert.strictEqual(emailArgs.employerEmail, 'employer@example.com');
    assert.strictEqual(emailArgs.jobTitle, mockJob.title);
    assert.strictEqual(emailArgs.candidateName, 'Candidate Name');

    // Cleanup
    Job.findById = originalJobFindById;
    Application.findOne = originalAppFindOne;
    Application.create = originalAppCreate;
    User.findById = originalUserFindById;
    emailService.sendApplicationNotification = originalSend;
    process.env = savedEnv;
  });
});
