const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Application = require('../src/models/Application');

describe('Application Model Schema', () => {
  const validApplicationData = {
    candidate: new mongoose.Types.ObjectId(),
    job: new mongoose.Types.ObjectId(),
    coverLetter: 'I am excited to apply for this engineering role and bring my full-stack skills.',
    status: 'pending'
  };

  it('validates a complete and correct application document', () => {
    const application = new Application(validApplicationData);
    const error = application.validateSync();

    assert.strictEqual(error, undefined);
    assert.strictEqual(application.status, 'pending');
    assert.strictEqual(application.coverLetter, validApplicationData.coverLetter);
  });

  it('defaults status to pending when omitted', () => {
    const application = new Application({
      candidate: new mongoose.Types.ObjectId(),
      job: new mongoose.Types.ObjectId()
    });
    const error = application.validateSync();

    assert.strictEqual(error, undefined);
    assert.strictEqual(application.status, 'pending');
  });

  it('requires candidate and job references', () => {
    const application = new Application({});
    const error = application.validateSync();

    assert.ok(error, 'Expected validation error for missing fields');
    assert.ok(error.errors.candidate, 'Candidate is required');
    assert.ok(error.errors.job, 'Job is required');
  });

  it('accepts all valid status enum values and rejects invalid ones', () => {
    const validStatuses = ['pending', 'reviewing', 'accepted', 'rejected'];

    for (const status of validStatuses) {
      const application = new Application({
        ...validApplicationData,
        status
      });
      const error = application.validateSync();
      assert.strictEqual(error, undefined, `Status '${status}' should be valid`);
      assert.strictEqual(application.status, status);
    }

    const invalidApplication = new Application({
      ...validApplicationData,
      status: 'hired'
    });
    const error = invalidApplication.validateSync();

    assert.ok(error);
    assert.ok(error.errors.status);
    assert.ok(error.errors.status.message.includes('is not a valid application status'));
  });

  it('rejects coverLetter exceeding 2000 characters', () => {
    const longCoverLetter = 'A'.repeat(2001);
    const application = new Application({
      ...validApplicationData,
      coverLetter: longCoverLetter
    });
    const error = application.validateSync();

    assert.ok(error);
    assert.ok(error.errors.coverLetter);
    assert.ok(error.errors.coverLetter.message.includes('Cover letter cannot exceed 2000 characters'));
  });

  it('accepts application without coverLetter (optional)', () => {
    const application = new Application({
      candidate: new mongoose.Types.ObjectId(),
      job: new mongoose.Types.ObjectId()
    });
    const error = application.validateSync();

    assert.strictEqual(error, undefined);
    assert.strictEqual(application.coverLetter, undefined);
  });

  it('defines a compound unique index on { candidate: 1, job: 1 }', () => {
    const indexes = Application.schema.indexes();
    const compoundIndex = indexes.find(
      ([fields, options]) =>
        fields.candidate === 1 && fields.job === 1 && options && options.unique === true
    );

    assert.ok(
      compoundIndex,
      'Expected unique compound index on { candidate: 1, job: 1 } to prevent duplicate applications'
    );
  });

  it('defines a compound index on { candidate: 1, createdAt: -1, _id: -1 } for listing applications', () => {
    const indexes = Application.schema.indexes();
    const listIndex = indexes.find(
      ([fields]) =>
        fields.candidate === 1 && fields.createdAt === -1 && fields._id === -1
    );

    assert.ok(
      listIndex,
      'Expected compound index on { candidate: 1, createdAt: -1, _id: -1 } for efficient sorting'
    );
  });

  it('defines a compound index on { job: 1, createdAt: -1, _id: -1 } for employer listing', () => {
    const indexes = Application.schema.indexes();
    const jobIndex = indexes.find(
      ([fields]) =>
        fields.job === 1 && fields.createdAt === -1 && fields._id === -1
    );

    assert.ok(
      jobIndex,
      'Expected compound index on { job: 1, createdAt: -1, _id: -1 } for efficient employer listing'
    );
  });
});
