const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Job = require('../src/models/Job');

describe('Job Model Schema', () => {
  const validJobData = {
    title: 'Senior Full Stack Engineer',
    company: 'Tech Corp',
    location: 'Remote, US',
    jobType: 'full-time',
    workplaceMode: 'remote',
    salaryMin: 120000,
    salaryMax: 160000,
    description: 'We are seeking an experienced full-stack developer with Node.js and React expertise.',
    requirements: ['5+ years JavaScript/TypeScript experience', 'Strong React and Node.js skills'],
    employer: new mongoose.Types.ObjectId()
  };

  it('validates a complete and correct job document', () => {
    const job = new Job(validJobData);
    const error = job.validateSync();
    assert.strictEqual(error, undefined);
    assert.strictEqual(job.status, 'active');
  });

  it('requires title, company, location, jobType, workplaceMode, description, and employer', () => {
    const job = new Job({});
    const error = job.validateSync();

    assert.ok(error);
    assert.ok(error.errors.title);
    assert.ok(error.errors.company);
    assert.ok(error.errors.location);
    assert.ok(error.errors.jobType);
    assert.ok(error.errors.workplaceMode);
    assert.ok(error.errors.description);
    assert.ok(error.errors.employer);
  });

  it('rejects title shorter than 3 characters or longer than 100 characters', () => {
    const shortJob = new Job({ ...validJobData, title: 'JS' });
    const shortError = shortJob.validateSync();
    assert.ok(shortError && shortError.errors.title);

    const longJob = new Job({ ...validJobData, title: 'A'.repeat(101) });
    const longError = longJob.validateSync();
    assert.ok(longError && longError.errors.title);
  });

  it('accepts all valid jobType enum values and rejects invalid ones', () => {
    const validTypes = ['full-time', 'part-time', 'contract', 'internship'];
    for (const type of validTypes) {
      const job = new Job({ ...validJobData, jobType: type });
      const error = job.validateSync();
      assert.strictEqual(error, undefined);
    }

    const invalidJob = new Job({ ...validJobData, jobType: 'freelance' });
    const error = invalidJob.validateSync();
    assert.ok(error && error.errors.jobType);
  });

  it('accepts all valid workplaceMode enum values and rejects invalid ones', () => {
    const validModes = ['onsite', 'hybrid', 'remote'];
    for (const mode of validModes) {
      const job = new Job({ ...validJobData, workplaceMode: mode });
      const error = job.validateSync();
      assert.strictEqual(error, undefined);
    }

    const invalidJob = new Job({ ...validJobData, workplaceMode: 'telecommute' });
    const error = invalidJob.validateSync();
    assert.ok(error && error.errors.workplaceMode);
  });

  it('accepts valid status enum values (active, closed) and rejects invalid ones', () => {
    const activeJob = new Job({ ...validJobData, status: 'active' });
    assert.strictEqual(activeJob.validateSync(), undefined);

    const closedJob = new Job({ ...validJobData, status: 'closed' });
    assert.strictEqual(closedJob.validateSync(), undefined);

    const invalidJob = new Job({ ...validJobData, status: 'archived' });
    const error = invalidJob.validateSync();
    assert.ok(error && error.errors.status);
  });

  it('rejects negative salaryMin or negative salaryMax', () => {
    const negativeMinJob = new Job({ ...validJobData, salaryMin: -1000, salaryMax: 50000 });
    const minError = negativeMinJob.validateSync();
    assert.ok(minError && minError.errors.salaryMin);

    const negativeMaxJob = new Job({ ...validJobData, salaryMin: 50000, salaryMax: -1000 });
    const maxError = negativeMaxJob.validateSync();
    assert.ok(maxError && maxError.errors.salaryMax);
  });

  it('rejects salaryMin greater than salaryMax when both are provided', () => {
    const invertedSalaryJob = new Job({ ...validJobData, salaryMin: 150000, salaryMax: 100000 });
    const error = invertedSalaryJob.validateSync();
    assert.ok(error);
    assert.ok(error.errors.salaryMin);
    assert.strictEqual(error.errors.salaryMin.message, 'Minimum salary cannot exceed maximum salary');
  });

  it('accepts job without salary fields (salaries are optional)', () => {
    const noSalaryJob = new Job({
      ...validJobData,
      salaryMin: undefined,
      salaryMax: undefined
    });
    const error = noSalaryJob.validateSync();
    assert.strictEqual(error, undefined);
  });

  it('accepts job with only salaryMin or only salaryMax', () => {
    const onlyMinJob = new Job({ ...validJobData, salaryMin: 60000, salaryMax: undefined });
    assert.strictEqual(onlyMinJob.validateSync(), undefined);

    const onlyMaxJob = new Job({ ...validJobData, salaryMin: undefined, salaryMax: 90000 });
    assert.strictEqual(onlyMaxJob.validateSync(), undefined);
  });

  it('rejects requirement items exceeding 200 characters', () => {
    const longReqJob = new Job({
      ...validJobData,
      requirements: ['Valid item', 'X'.repeat(201)]
    });
    const error = longReqJob.validateSync();
    assert.ok(error);
    assert.ok(error.errors['requirements.1']);
  });

  it('rejects requirements array exceeding 50 items', () => {
    const manyReqs = Array.from({ length: 51 }, (_, i) => `Skill requirement ${i}`);
    const tooManyJob = new Job({
      ...validJobData,
      requirements: manyReqs
    });
    const error = tooManyJob.validateSync();
    assert.ok(error);
    assert.ok(error.errors.requirements);
  });
});
