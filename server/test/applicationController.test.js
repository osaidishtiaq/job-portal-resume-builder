const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Application = require('../src/models/Application');
const Job = require('../src/models/Job');
const User = require('../src/models/User');
const { applyToJob } = require('../src/controllers/applicationController');
const jobRouter = require('../src/routes/jobRoutes');
const { protect } = require('../src/middleware/authMiddleware');
const { authorize } = require('../src/middleware/roleMiddleware');

describe('Day 10: Candidate Job Application Controller & Route Security', () => {
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

  const validCandidateId = new mongoose.Types.ObjectId().toString();
  const validJobId = new mongoose.Types.ObjectId().toString();

  describe('applyToJob - Candidate Application Submission', () => {
    let originalUserFindById;
    before(() => {
      originalUserFindById = User.findById;
      User.findById = async () => ({ email: 'employer@test.com', name: 'Employer' });
    });
    after(() => {
      User.findById = originalUserFindById;
    });
    it('submits application successfully with a valid cover letter (201)', async () => {
      const mockActiveJob = {
        _id: validJobId,
        title: 'Senior Backend Engineer',
        status: 'active'
      };

      let capturedCreatedData = null;
      const originalJobFindById = Job.findById;
      const originalAppFindOne = Application.findOne;
      const originalAppCreate = Application.create;

      Job.findById = async (id) => {
        assert.strictEqual(id, validJobId);
        return mockActiveJob;
      };

      Application.findOne = async () => null; // No existing application

      Application.create = async (doc) => {
        capturedCreatedData = doc;
        return {
          _id: new mongoose.Types.ObjectId(),
          ...doc,
          status: 'pending',
          createdAt: new Date()
        };
      };

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: {
            coverLetter: 'I am excited to apply for this backend position with 4+ years of Node.js experience.'
          }
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.jsonData.status, 'success');
        assert.strictEqual(res.jsonData.message, 'Application submitted successfully');
        assert.ok(res.jsonData.data && res.jsonData.data.application);
        assert.strictEqual(capturedCreatedData.candidate, validCandidateId);
        assert.strictEqual(capturedCreatedData.job, validJobId);
        assert.strictEqual(capturedCreatedData.coverLetter, req.body.coverLetter);
      } finally {
        Job.findById = originalJobFindById;
        Application.findOne = originalAppFindOne;
        Application.create = originalAppCreate;
      }
    });

    it('submits application successfully without cover letter (201)', async () => {
      const mockActiveJob = {
        _id: validJobId,
        title: 'Frontend Engineer',
        status: 'active'
      };

      let capturedCreatedData = null;
      const originalJobFindById = Job.findById;
      const originalAppFindOne = Application.findOne;
      const originalAppCreate = Application.create;

      Job.findById = async () => mockActiveJob;
      Application.findOne = async () => null;
      Application.create = async (doc) => {
        capturedCreatedData = doc;
        return { _id: new mongoose.Types.ObjectId(), ...doc, status: 'pending' };
      };

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: {}
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(capturedCreatedData.coverLetter, undefined);
      } finally {
        Job.findById = originalJobFindById;
        Application.findOne = originalAppFindOne;
        Application.create = originalAppCreate;
      }
    });

    it('treats empty or whitespace-only cover letter as omitted', async () => {
      const mockActiveJob = { _id: validJobId, status: 'active' };
      let capturedCreatedData = null;

      const originalJobFindById = Job.findById;
      const originalAppFindOne = Application.findOne;
      const originalAppCreate = Application.create;

      Job.findById = async () => mockActiveJob;
      Application.findOne = async () => null;
      Application.create = async (doc) => {
        capturedCreatedData = doc;
        return { _id: new mongoose.Types.ObjectId(), ...doc, status: 'pending' };
      };

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: { coverLetter: '    ' }
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(capturedCreatedData.coverLetter, undefined);
      } finally {
        Job.findById = originalJobFindById;
        Application.findOne = originalAppFindOne;
        Application.create = originalAppCreate;
      }
    });

    it('safely handles missing or null request bodies', async () => {
      const mockActiveJob = { _id: validJobId, status: 'active' };
      const originalJobFindById = Job.findById;
      const originalAppFindOne = Application.findOne;
      const originalAppCreate = Application.create;

      Job.findById = async () => mockActiveJob;
      Application.findOne = async () => null;
      Application.create = async (doc) => ({ _id: new mongoose.Types.ObjectId(), ...doc });

      try {
        // Missing req.body
        const req1 = { params: { id: validJobId }, userId: validCandidateId };
        const res1 = createMockRes();
        await applyToJob(req1, res1, () => {});
        assert.strictEqual(res1.statusCode, 201);

        // Null req.body
        const req2 = { params: { id: validJobId }, userId: validCandidateId, body: null };
        const res2 = createMockRes();
        await applyToJob(req2, res2, () => {});
        assert.strictEqual(res2.statusCode, 201);
      } finally {
        Job.findById = originalJobFindById;
        Application.findOne = originalAppFindOne;
        Application.create = originalAppCreate;
      }
    });

    it('prevents candidate identity spoofing by deriving candidate strictly from req.userId', async () => {
      const mockActiveJob = { _id: validJobId, status: 'active' };
      const hackerCandidateId = new mongoose.Types.ObjectId().toString();
      let capturedCreatedData = null;

      const originalJobFindById = Job.findById;
      const originalAppFindOne = Application.findOne;
      const originalAppCreate = Application.create;

      Job.findById = async () => mockActiveJob;
      Application.findOne = async () => null;
      Application.create = async (doc) => {
        capturedCreatedData = doc;
        return { _id: new mongoose.Types.ObjectId(), ...doc };
      };

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId, // Authenticated user ID
          body: {
            candidate: hackerCandidateId, // Hacker attempts to attribute application to another candidate
            candidateId: hackerCandidateId,
            userId: hackerCandidateId
          }
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(
          capturedCreatedData.candidate,
          validCandidateId,
          'Candidate ID must be derived exclusively from req.userId'
        );
      } finally {
        Job.findById = originalJobFindById;
        Application.findOne = originalAppFindOne;
        Application.create = originalAppCreate;
      }
    });

    it('rejects malformed job ID with 400', async () => {
      const invalidIds = ['not-a-valid-id', '123', 'undefined', 'null'];

      for (const invalidId of invalidIds) {
        const req = { params: { id: invalidId }, userId: validCandidateId, body: {} };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 400, `Expected 400 for job ID '${invalidId}'`);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Invalid job ID format');
      }
    });

    it('rejects non-string cover letter with 400', async () => {
      const invalidCoverLetters = [null, 123, true, ['letter'], { text: 'hello' }];

      for (const invalidCoverLetter of invalidCoverLetters) {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: { coverLetter: invalidCoverLetter }
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 400, `Expected 400 for non-string cover letter`);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Cover letter must be a string');
      }
    });

    it('rejects explicitly supplied null cover letter with 400', async () => {
      const req = {
        params: { id: validJobId },
        userId: validCandidateId,
        body: { coverLetter: null }
      };
      const res = createMockRes();

      await applyToJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.strictEqual(res.jsonData.message, 'Cover letter must be a string');
    });

    it('rejects cover letter exceeding 2000 characters with 400', async () => {
      const req = {
        params: { id: validJobId },
        userId: validCandidateId,
        body: { coverLetter: 'A'.repeat(2001) }
      };
      const res = createMockRes();

      await applyToJob(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.strictEqual(res.jsonData.message, 'Cover letter cannot exceed 2000 characters');
    });

    it('returns 404 when job does not exist', async () => {
      const originalJobFindById = Job.findById;
      Job.findById = async () => null;

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: {}
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Job not found or is no longer accepting applications');
      } finally {
        Job.findById = originalJobFindById;
      }
    });

    it('returns 404 when job exists but has closed status', async () => {
      const originalJobFindById = Job.findById;
      Job.findById = async () => ({
        _id: validJobId,
        title: 'Closed Position',
        status: 'closed'
      });

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: {}
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Job not found or is no longer accepting applications');
      } finally {
        Job.findById = originalJobFindById;
      }
    });

    it('returns 409 when candidate has already applied (pre-check via findOne)', async () => {
      const mockActiveJob = { _id: validJobId, status: 'active' };
      const originalJobFindById = Job.findById;
      const originalAppFindOne = Application.findOne;

      Job.findById = async () => mockActiveJob;
      Application.findOne = async () => ({
        _id: new mongoose.Types.ObjectId(),
        candidate: validCandidateId,
        job: validJobId,
        status: 'pending'
      });

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: {}
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 409);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'You have already applied for this job');
      } finally {
        Job.findById = originalJobFindById;
        Application.findOne = originalAppFindOne;
      }
    });

    it('returns 409 when race condition triggers MongoDB duplicate key error (code 11000)', async () => {
      const mockActiveJob = { _id: validJobId, status: 'active' };
      const originalJobFindById = Job.findById;
      const originalAppFindOne = Application.findOne;
      const originalAppCreate = Application.create;

      Job.findById = async () => mockActiveJob;
      Application.findOne = async () => null; // Pre-check passed concurrently
      Application.create = async () => {
        const mongoDuplicateKeyError = new Error('E11000 duplicate key error collection: applications index: candidate_1_job_1 dup key');
        mongoDuplicateKeyError.code = 11000;
        throw mongoDuplicateKeyError;
      };

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: {}
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 409);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'You have already applied for this job');
      } finally {
        Job.findById = originalJobFindById;
        Application.findOne = originalAppFindOne;
        Application.create = originalAppCreate;
      }
    });

    it('handles Mongoose ValidationError with 400', async () => {
      const mockActiveJob = { _id: validJobId, status: 'active' };
      const originalJobFindById = Job.findById;
      const originalAppFindOne = Application.findOne;
      const originalAppCreate = Application.create;

      Job.findById = async () => mockActiveJob;
      Application.findOne = async () => null;
      Application.create = async () => {
        const validationError = new Error('Application validation failed');
        validationError.name = 'ValidationError';
        throw validationError;
      };

      try {
        const req = {
          params: { id: validJobId },
          userId: validCandidateId,
          body: {}
        };
        const res = createMockRes();

        await applyToJob(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData.status, 'fail');
      } finally {
        Job.findById = originalJobFindById;
        Application.findOne = originalAppFindOne;
        Application.create = originalAppCreate;
      }
    });
  });

  describe('Route Security & Role Authorization', () => {
    it('ensures POST /:id/apply is registered with protect and authorize("candidate")', () => {
      const routeLayer = jobRouter.stack.find(
        (layer) => layer.route && layer.route.path === '/:id/apply' && layer.route.methods.post
      );

      assert.ok(routeLayer, 'Route POST /:id/apply must be registered in jobRouter');

      // Middleware stack should contain protect, authorize, and applyToJob
      assert.ok(
        routeLayer.route.stack.length >= 3,
        'POST /:id/apply route stack must contain at least 3 handlers (protect, authorize, controller)'
      );
    });

    it('rejects employer role attempting to access candidate apply endpoint (403)', () => {
      const candidateOnlyMiddleware = authorize('candidate');

      const req = {
        user: { id: 'employer-user-id', role: 'employer' }
      };
      const res = createMockRes();
      let nextCalled = false;

      candidateOnlyMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.ok(res.jsonData.message.includes("role 'employer' is not authorized"));
    });

    it('allows candidate role to pass candidate authorize middleware', () => {
      const candidateOnlyMiddleware = authorize('candidate');

      const req = {
        user: { id: validCandidateId, role: 'candidate' }
      };
      const res = createMockRes();
      let nextCalled = false;

      candidateOnlyMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(res.statusCode, null);
    });
  });
});
