const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Job = require('../src/models/Job');
const { createJob, updateJob, deleteJob } = require('../src/controllers/jobController');

describe('jobController - Employer Job Endpoints', () => {
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

  const validEmployerId = new mongoose.Types.ObjectId().toString();

  describe('createJob input validation', () => {
    const validBody = {
      title: 'Full Stack Engineer',
      company: 'Acme Corp',
      location: 'New York, NY',
      jobType: 'full-time',
      workplaceMode: 'hybrid',
      salaryMin: 90000,
      salaryMax: 130000,
      description: 'Join our growing engineering team building modern web applications.',
      requirements: ['3+ years Node.js', 'React experience']
    };

    it('rejects job creation with missing title (400)', async () => {
      const req = { body: { ...validBody, title: '' }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Job title is required');
    });

    it('rejects job creation with missing company (400)', async () => {
      const req = { body: { ...validBody, company: ' ' }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Company name is required');
    });

    it('rejects job creation with missing location (400)', async () => {
      const req = { body: { ...validBody, location: '' }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Location is required');
    });

    it('rejects job creation with missing description (400)', async () => {
      const req = { body: { ...validBody, description: '' }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Job description is required');
    });

    it('rejects job creation with invalid jobType enum (400)', async () => {
      const req = { body: { ...validBody, jobType: 'volunteer' }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.ok(res.jsonData.message.includes('Invalid job type'));
    });

    it('rejects job creation with invalid workplaceMode enum (400)', async () => {
      const req = { body: { ...validBody, workplaceMode: 'everywhere' }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.ok(res.jsonData.message.includes('Invalid workplace mode'));
    });

    it('rejects job creation with negative salary (400)', async () => {
      const req = { body: { ...validBody, salaryMin: -500 }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Minimum salary must be a non-negative number');
    });

    it('rejects job creation when salaryMin exceeds salaryMax (400)', async () => {
      const req = { body: { ...validBody, salaryMin: 150000, salaryMax: 100000 }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Minimum salary cannot exceed maximum salary');
    });

    it('rejects job creation when requirements is not an array (400)', async () => {
      const req = { body: { ...validBody, requirements: 'JavaScript' }, userId: validEmployerId };
      const res = createMockRes();

      await createJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Requirements must be an array of strings');
    });
  });

  describe('updateJob validation and ownership enforcement', () => {
    it('rejects update when ID format is invalid (400)', async () => {
      const req = { params: { id: 'invalid-id-123' }, body: {}, userId: validEmployerId };
      const res = createMockRes();

      await updateJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Invalid job ID format');
    });

    it('rejects update when job does not exist (404)', async () => {
      const originalFindById = Job.findById;
      Job.findById = async () => null;

      try {
        const req = {
          params: { id: new mongoose.Types.ObjectId().toString() },
          body: { title: 'Updated Title' },
          userId: validEmployerId
        };
        const res = createMockRes();

        await updateJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.message, 'Job not found');
      } finally {
        Job.findById = originalFindById;
      }
    });

    it('rejects update when employer does not own the job (403)', async () => {
      const differentEmployerId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: new mongoose.Types.ObjectId(),
        employer: differentEmployerId,
        title: 'Original Title'
      };

      const originalFindById = Job.findById;
      Job.findById = async () => mockJob;

      try {
        const req = {
          params: { id: mockJob._id.toString() },
          body: { title: 'New Title' },
          userId: validEmployerId
        };
        const res = createMockRes();

        await updateJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.ok(res.jsonData.message.includes('Forbidden'));
      } finally {
        Job.findById = originalFindById;
      }
    });

    it('allows updating allowed fields and rejects changing employer reference', async () => {
      const mockJob = {
        _id: new mongoose.Types.ObjectId(),
        employer: validEmployerId,
        title: 'Original Title',
        company: 'Old Corp',
        salaryMin: 50000,
        salaryMax: 80000,
        save: async function () {
          return this;
        }
      };

      const originalFindById = Job.findById;
      Job.findById = async () => mockJob;

      try {
        const hackerAttemptEmployerId = new mongoose.Types.ObjectId().toString();
        const req = {
          params: { id: mockJob._id.toString() },
          body: {
            title: 'Updated Software Architect',
            employer: hackerAttemptEmployerId // should be ignored!
          },
          userId: validEmployerId
        };
        const res = createMockRes();

        await updateJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(mockJob.title, 'Updated Software Architect');
        assert.strictEqual(mockJob.employer, validEmployerId); // NOT overridden
      } finally {
        Job.findById = originalFindById;
      }
    });
  });

  describe('deleteJob soft-close and ownership enforcement', () => {
    it('rejects delete when ID format is invalid (400)', async () => {
      const req = { params: { id: 'bad-id' }, userId: validEmployerId };
      const res = createMockRes();

      await deleteJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.message, 'Invalid job ID format');
    });

    it('rejects delete when job does not exist (404)', async () => {
      const originalFindById = Job.findById;
      Job.findById = async () => null;

      try {
        const req = {
          params: { id: new mongoose.Types.ObjectId().toString() },
          userId: validEmployerId
        };
        const res = createMockRes();

        await deleteJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.message, 'Job not found');
      } finally {
        Job.findById = originalFindById;
      }
    });

    it('rejects delete when employer does not own the job (403)', async () => {
      const otherEmployerId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: new mongoose.Types.ObjectId(),
        employer: otherEmployerId,
        status: 'active'
      };

      const originalFindById = Job.findById;
      Job.findById = async () => mockJob;

      try {
        const req = {
          params: { id: mockJob._id.toString() },
          userId: validEmployerId
        };
        const res = createMockRes();

        await deleteJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.ok(res.jsonData.message.includes('Forbidden'));
      } finally {
        Job.findById = originalFindById;
      }
    });

    it('soft-closes job by setting status to closed when owned by employer (200)', async () => {
      const mockJob = {
        _id: new mongoose.Types.ObjectId(),
        employer: validEmployerId,
        status: 'active',
        save: async function () {
          return this;
        }
      };

      const originalFindById = Job.findById;
      Job.findById = async () => mockJob;

      try {
        const req = {
          params: { id: mockJob._id.toString() },
          userId: validEmployerId
        };
        const res = createMockRes();

        await deleteJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(mockJob.status, 'closed');
        assert.strictEqual(res.jsonData.message, 'Job closed successfully');
      } finally {
        Job.findById = originalFindById;
      }
    });
  });
});
