const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Application = require('../src/models/Application');
const Job = require('../src/models/Job');
const {
  getJobApplications,
  updateApplicationStatus
} = require('../src/controllers/applicationController');
const applicationRouter = require('../src/routes/applicationRoutes');
const { authorize } = require('../src/middleware/roleMiddleware');

describe('Day 12: Employer Job Applications Management', () => {
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

  const createMockChainableQuery = (result, captured) => {
    const queryObj = {
      sort(arg) {
        if (captured) captured.sort = arg;
        return queryObj;
      },
      skip(arg) {
        if (captured) captured.skip = arg;
        return queryObj;
      },
      limit(arg) {
        if (captured) captured.limit = arg;
        return queryObj;
      },
      populate(field, select) {
        if (captured) {
          captured.populateField = field;
          captured.populateSelect = select;
        }
        return queryObj;
      },
      select(arg) {
        if (captured) captured.select = arg;
        return queryObj;
      },
      then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
      }
    };
    return queryObj;
  };

  const validEmployerId = new mongoose.Types.ObjectId().toString();
  const otherEmployerId = new mongoose.Types.ObjectId().toString();
  const validJobId = new mongoose.Types.ObjectId().toString();
  const validCandidateId = new mongoose.Types.ObjectId().toString();
  const validApplicationId = new mongoose.Types.ObjectId().toString();

  describe('GET /api/applications/job/:jobId - Listing & Population', () => {
    it('returns applications for an active job owned by authenticated employer with default pagination (200)', async () => {
      const mockJob = {
        _id: validJobId,
        employer: validEmployerId,
        title: 'Backend Engineer',
        status: 'active'
      };

      const mockApplications = [
        {
          _id: validApplicationId,
          job: validJobId,
          candidate: {
            _id: validCandidateId,
            name: 'Alex Johnson',
            email: 'alex@example.com'
          },
          coverLetter: 'Excited for this backend position.',
          status: 'pending',
          createdAt: new Date('2026-10-18T10:00:00Z')
        }
      ];

      const capturedQuery = {};
      const originalJobFindById = Job.findById;
      const originalAppFind = Application.find;
      const originalAppCount = Application.countDocuments;

      Job.findById = async (id) => {
        assert.strictEqual(id, validJobId);
        return mockJob;
      };

      Application.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery(mockApplications, capturedQuery);
      };

      Application.countDocuments = async (filter) => {
        capturedQuery.countFilter = filter;
        return 1;
      };

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: {}
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.strictEqual(res.jsonData.status, 'success');
        assert.deepStrictEqual(res.jsonData.data, mockApplications);
        assert.strictEqual(res.jsonData.pagination.page, 1);
        assert.strictEqual(res.jsonData.pagination.limit, 10);
        assert.strictEqual(res.jsonData.pagination.total, 1);
        assert.strictEqual(res.jsonData.pagination.totalPages, 1);

        // Verify query filter, deterministic sorting with tie-breaker, and candidate population
        assert.deepStrictEqual(capturedQuery.findFilter, { job: validJobId });
        assert.deepStrictEqual(capturedQuery.countFilter, { job: validJobId });
        assert.deepStrictEqual(capturedQuery.sort, { createdAt: -1, _id: -1 });
        assert.strictEqual(capturedQuery.skip, 0);
        assert.strictEqual(capturedQuery.limit, 10);
        assert.strictEqual(capturedQuery.populateField, 'candidate');
        assert.strictEqual(capturedQuery.populateSelect, 'name email');
        assert.strictEqual(capturedQuery.select, '-__v');

        // Verify privacy: candidate password or password hashes are never exposed
        const returnedCandidate = res.jsonData.data[0].candidate;
        assert.strictEqual(returnedCandidate.name, 'Alex Johnson');
        assert.strictEqual(returnedCandidate.email, 'alex@example.com');
        assert.strictEqual(returnedCandidate.password, undefined);
        assert.strictEqual(returnedCandidate.passwordHash, undefined);
      } finally {
        Job.findById = originalJobFindById;
        Application.find = originalAppFind;
        Application.countDocuments = originalAppCount;
      }
    });

    it('allows employers to view applications for closed jobs (200)', async () => {
      const mockClosedJob = {
        _id: validJobId,
        employer: validEmployerId,
        title: 'Closed Position',
        status: 'closed'
      };

      const originalJobFindById = Job.findById;
      const originalAppFind = Application.find;
      const originalAppCount = Application.countDocuments;

      Job.findById = async () => mockClosedJob;
      Application.find = () => createMockChainableQuery([]);
      Application.countDocuments = async () => 0;

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: {}
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.deepStrictEqual(res.jsonData.data, []);
      } finally {
        Job.findById = originalJobFindById;
        Application.find = originalAppFind;
        Application.countDocuments = originalAppCount;
      }
    });

    it('safely handles applications whose candidate was deleted (candidate: null)', async () => {
      const mockApplicationsWithDeletedCandidate = [
        {
          _id: validApplicationId,
          job: validJobId,
          candidate: null,
          coverLetter: 'Previous applicant.',
          status: 'pending',
          createdAt: new Date()
        }
      ];

      const originalJobFindById = Job.findById;
      const originalAppFind = Application.find;
      const originalAppCount = Application.countDocuments;

      Job.findById = async () => ({
        _id: validJobId,
        employer: validEmployerId,
        status: 'active'
      });
      Application.find = () => createMockChainableQuery(mockApplicationsWithDeletedCandidate);
      Application.countDocuments = async () => 1;

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: {}
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.strictEqual(res.jsonData.data[0].candidate, null);
      } finally {
        Job.findById = originalJobFindById;
        Application.find = originalAppFind;
        Application.countDocuments = originalAppCount;
      }
    });

    it('handles empty results cleanly with totalPages: 0 and data: []', async () => {
      const originalJobFindById = Job.findById;
      const originalAppFind = Application.find;
      const originalAppCount = Application.countDocuments;

      Job.findById = async () => ({
        _id: validJobId,
        employer: validEmployerId,
        status: 'active'
      });
      Application.find = () => createMockChainableQuery([]);
      Application.countDocuments = async () => 0;

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: {}
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.deepStrictEqual(res.jsonData.data, []);
        assert.strictEqual(res.jsonData.pagination.total, 0);
        assert.strictEqual(res.jsonData.pagination.totalPages, 0);
      } finally {
        Job.findById = originalJobFindById;
        Application.find = originalAppFind;
        Application.countDocuments = originalAppCount;
      }
    });
  });

  describe('GET /api/applications/job/:jobId - Ownership Isolation & Security', () => {
    it('returns 403 Forbidden when job belongs to another employer', async () => {
      const mockJob = {
        _id: validJobId,
        employer: otherEmployerId, // Belongs to different employer
        status: 'active'
      };

      const originalJobFindById = Job.findById;
      Job.findById = async () => mockJob;

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId, // Authenticated employer does not own this job
          query: {}
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.ok(res.jsonData.message.includes('Forbidden'));
      } finally {
        Job.findById = originalJobFindById;
      }
    });

    it('ignores employer or employerId overrides in query or body parameters', async () => {
      const mockJob = {
        _id: validJobId,
        employer: validEmployerId,
        status: 'active'
      };

      const capturedQuery = {};
      const originalJobFindById = Job.findById;
      const originalAppFind = Application.find;
      const originalAppCount = Application.countDocuments;

      Job.findById = async () => mockJob;
      Application.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Application.countDocuments = async () => 0;

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: { employer: otherEmployerId, employerId: otherEmployerId },
          body: { employer: otherEmployerId, employerId: otherEmployerId }
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        // Application query filter is strictly { job: jobId }, never tainted by query/body employer parameters
        assert.deepStrictEqual(capturedQuery.findFilter, { job: validJobId });
      } finally {
        Job.findById = originalJobFindById;
        Application.find = originalAppFind;
        Application.countDocuments = originalAppCount;
      }
    });
  });

  describe('GET /api/applications/job/:jobId - Validation & Error Handling', () => {
    it('returns 400 for malformed jobId', async () => {
      const invalidJobIds = ['123', 'invalid-id', '507f1f77bcf86cd79943901z', ''];

      for (const invalidId of invalidJobIds) {
        const req = {
          params: { jobId: invalidId },
          userId: validEmployerId,
          query: {}
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Invalid job ID format');
      }
    });

    it('returns 404 when job does not exist in database', async () => {
      const originalJobFindById = Job.findById;
      Job.findById = async () => null;

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: {}
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Job not found');
      } finally {
        Job.findById = originalJobFindById;
      }
    });
  });

  describe('GET /api/applications/job/:jobId - Pagination Validation', () => {
    it('accepts custom page and limit with whitespace trimming', async () => {
      const capturedQuery = {};
      const originalJobFindById = Job.findById;
      const originalAppFind = Application.find;
      const originalAppCount = Application.countDocuments;

      Job.findById = async () => ({
        _id: validJobId,
        employer: validEmployerId,
        status: 'active'
      });
      Application.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Application.countDocuments = async () => 30;

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: { page: ' 2 ', limit: ' 5 ' }
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(capturedQuery.skip, 5); // (2 - 1) * 5
        assert.strictEqual(capturedQuery.limit, 5);
        assert.strictEqual(res.jsonData.pagination.page, 2);
        assert.strictEqual(res.jsonData.pagination.limit, 5);
        assert.strictEqual(res.jsonData.pagination.total, 30);
        assert.strictEqual(res.jsonData.pagination.totalPages, 6);
      } finally {
        Job.findById = originalJobFindById;
        Application.find = originalAppFind;
        Application.countDocuments = originalAppCount;
      }
    });

    it('caps limit at 50 when request passes limit > 50', async () => {
      const capturedQuery = {};
      const originalJobFindById = Job.findById;
      const originalAppFind = Application.find;
      const originalAppCount = Application.countDocuments;

      Job.findById = async () => ({
        _id: validJobId,
        employer: validEmployerId,
        status: 'active'
      });
      Application.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Application.countDocuments = async () => 100;

      try {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: { limit: '100' }
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(capturedQuery.limit, 50);
        assert.strictEqual(res.jsonData.pagination.limit, 50);
      } finally {
        Job.findById = originalJobFindById;
        Application.find = originalAppFind;
        Application.countDocuments = originalAppCount;
      }
    });

    it('rejects invalid page values with 400', async () => {
      const invalidPages = ['', '   ', '0', '-1', '-10', 'abc', '10abc', '1.5', '2.0', '1e2', ['1'], {}];

      for (const invalidPage of invalidPages) {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: { page: invalidPage }
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 400, `Expected 400 for page='${JSON.stringify(invalidPage)}'`);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Page must be a positive integer');
      }
    });

    it('rejects invalid limit values with 400', async () => {
      const invalidLimits = ['', '   ', '0', '-1', '-25', 'xyz', '10abc', '5.5', '2.0', '1e2', ['10'], {}];

      for (const invalidLimit of invalidLimits) {
        const req = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: { limit: invalidLimit }
        };
        const res = createMockRes();

        await getJobApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 400, `Expected 400 for limit='${JSON.stringify(invalidLimit)}'`);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Limit must be a positive integer');
      }
    });

    it('rejects unsafe-integer page and limit values with 400', async () => {
      const unsafeValues = ['9007199254740992', '99999999999999999999999999999'];

      for (const unsafeVal of unsafeValues) {
        const reqPage = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: { page: unsafeVal }
        };
        const resPage = createMockRes();
        await getJobApplications(reqPage, resPage, () => {});
        assert.strictEqual(resPage.statusCode, 400);
        assert.strictEqual(resPage.jsonData.message, 'Page must be a positive integer');

        const reqLimit = {
          params: { jobId: validJobId },
          userId: validEmployerId,
          query: { limit: unsafeVal }
        };
        const resLimit = createMockRes();
        await getJobApplications(reqLimit, resLimit, () => {});
        assert.strictEqual(resLimit.statusCode, 400);
        assert.strictEqual(resLimit.jsonData.message, 'Limit must be a positive integer');
      }
    });

    it('rejects page values whose calculated skip exceeds Number.MAX_SAFE_INTEGER with 400', async () => {
      const req = {
        params: { jobId: validJobId },
        userId: validEmployerId,
        query: { page: '9007199254740991' }
      };
      const res = createMockRes();

      await getJobApplications(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.strictEqual(res.jsonData.message, 'Page must be a positive integer');
    });
  });

  describe('PATCH /api/applications/:applicationId/status - Status Updates', () => {
    const createMockApplicationDoc = (initialStatus = 'pending') => {
      const doc = {
        _id: validApplicationId,
        candidate: validCandidateId,
        job: validJobId,
        coverLetter: 'Original cover letter',
        status: initialStatus,
        saveCalled: false,
        async save() {
          this.saveCalled = true;
          return this;
        },
        async populate(field, select) {
          if (field === 'candidate' && select === 'name email') {
            this.candidate = {
              _id: validCandidateId,
              name: 'John Candidate',
              email: 'candidate@example.com'
            };
          }
          return this;
        }
      };
      return doc;
    };

    it('successfully updates status to "reviewing" (200)', async () => {
      const mockApp = createMockApplicationDoc('pending');
      const mockJob = { _id: validJobId, employer: validEmployerId, status: 'active' };

      const originalAppFindById = Application.findById;
      const originalJobFindById = Job.findById;

      Application.findById = async (id) => {
        assert.strictEqual(id, validApplicationId);
        return mockApp;
      };
      Job.findById = async (id) => {
        assert.strictEqual(id, validJobId);
        return mockJob;
      };

      try {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: { status: 'reviewing' }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.status, 'success');
        assert.strictEqual(res.jsonData.message, 'Application status updated successfully');
        assert.strictEqual(mockApp.status, 'reviewing');
        assert.strictEqual(mockApp.saveCalled, true);
        assert.strictEqual(res.jsonData.data.application.status, 'reviewing');
        assert.strictEqual(res.jsonData.data.application.candidate.name, 'John Candidate');
        assert.strictEqual(res.jsonData.data.application.candidate.email, 'candidate@example.com');
      } finally {
        Application.findById = originalAppFindById;
        Job.findById = originalJobFindById;
      }
    });

    it('successfully updates status to "accepted" (200)', async () => {
      const mockApp = createMockApplicationDoc('reviewing');
      const mockJob = { _id: validJobId, employer: validEmployerId, status: 'active' };

      const originalAppFindById = Application.findById;
      const originalJobFindById = Job.findById;

      Application.findById = async () => mockApp;
      Job.findById = async () => mockJob;

      try {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: { status: 'accepted' }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(mockApp.status, 'accepted');
        assert.strictEqual(res.jsonData.data.application.status, 'accepted');
      } finally {
        Application.findById = originalAppFindById;
        Job.findById = originalJobFindById;
      }
    });

    it('successfully updates status to "rejected" (200)', async () => {
      const mockApp = createMockApplicationDoc('reviewing');
      const mockJob = { _id: validJobId, employer: validEmployerId, status: 'active' };

      const originalAppFindById = Application.findById;
      const originalJobFindById = Job.findById;

      Application.findById = async () => mockApp;
      Job.findById = async () => mockJob;

      try {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: { status: 'rejected' }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(mockApp.status, 'rejected');
        assert.strictEqual(res.jsonData.data.application.status, 'rejected');
      } finally {
        Application.findById = originalAppFindById;
        Job.findById = originalJobFindById;
      }
    });

    it('allows updating status for applications on closed jobs (200)', async () => {
      const mockApp = createMockApplicationDoc('pending');
      const mockClosedJob = { _id: validJobId, employer: validEmployerId, status: 'closed' };

      const originalAppFindById = Application.findById;
      const originalJobFindById = Job.findById;

      Application.findById = async () => mockApp;
      Job.findById = async () => mockClosedJob;

      try {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: { status: 'accepted' }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(mockApp.status, 'accepted');
      } finally {
        Application.findById = originalAppFindById;
        Job.findById = originalJobFindById;
      }
    });

    it('strictly updates only status and ignores extra fields (candidate, job, coverLetter)', async () => {
      const mockApp = createMockApplicationDoc('pending');
      const mockJob = { _id: validJobId, employer: validEmployerId, status: 'active' };
      const maliciousCandidateId = new mongoose.Types.ObjectId().toString();
      const maliciousJobId = new mongoose.Types.ObjectId().toString();

      const originalAppFindById = Application.findById;
      const originalJobFindById = Job.findById;

      Application.findById = async () => mockApp;
      Job.findById = async () => mockJob;

      try {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: {
            status: 'accepted',
            candidate: maliciousCandidateId,
            job: maliciousJobId,
            coverLetter: 'Malicious altered cover letter',
            _id: new mongoose.Types.ObjectId().toString(),
            createdAt: new Date('2020-01-01')
          }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(mockApp.status, 'accepted');
        // Critical: candidate, job, coverLetter must remain untouched
        assert.strictEqual(mockApp.job, validJobId);
        assert.strictEqual(mockApp.coverLetter, 'Original cover letter');
      } finally {
        Application.findById = originalAppFindById;
        Job.findById = originalJobFindById;
      }
    });
  });

  describe('PATCH /api/applications/:applicationId/status - Validation & Error Handling', () => {
    it('returns 400 for malformed applicationId', async () => {
      const invalidAppIds = ['123', 'invalid-id', 'not-a-mongo-id', ''];

      for (const invalidId of invalidAppIds) {
        const req = {
          params: { applicationId: invalidId },
          userId: validEmployerId,
          body: { status: 'reviewing' }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Invalid application ID format');
      }
    });

    it('rejects missing or null request body with 400', async () => {
      const invalidBodies = [null, undefined, '', 'status=reviewing', [1, 2, 3]];

      for (const body of invalidBodies) {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Request body is required');
      }
    });

    it('rejects missing or non-string status with 400', async () => {
      const invalidStatuses = [undefined, null, 123, true, false, {}, ['reviewing']];

      for (const status of invalidStatuses) {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: { status }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(
          res.jsonData.message,
          'Application status is required and must be a string'
        );
      }
    });

    it('rejects invalid or unauthorized status strings (including "pending") with 400', async () => {
      const disallowedStatuses = ['pending', 'hired', 'interviewing', 'rejected_offer', 'invalid', '   '];

      for (const status of disallowedStatuses) {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: { status }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 400);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.ok(
          res.jsonData.message.includes('Allowed values: reviewing, accepted, rejected'),
          `Expected message to list allowed values for status='${status}'`
        );
      }
    });

    it('returns 404 when application does not exist in database', async () => {
      const originalAppFindById = Application.findById;
      Application.findById = async () => null;

      try {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: { status: 'reviewing' }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Application not found');
      } finally {
        Application.findById = originalAppFindById;
      }
    });

    it('returns 404 when associated job does not exist in database', async () => {
      const mockApp = {
        _id: validApplicationId,
        job: validJobId,
        status: 'pending'
      };

      const originalAppFindById = Application.findById;
      const originalJobFindById = Job.findById;

      Application.findById = async () => mockApp;
      Job.findById = async () => null; // Job deleted or missing

      try {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId,
          body: { status: 'reviewing' }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Associated job not found');
      } finally {
        Application.findById = originalAppFindById;
        Job.findById = originalJobFindById;
      }
    });

    it('returns 403 Forbidden when associated job belongs to another employer', async () => {
      const mockApp = {
        _id: validApplicationId,
        job: validJobId,
        status: 'pending'
      };
      const mockJob = {
        _id: validJobId,
        employer: otherEmployerId // Different employer
      };

      const originalAppFindById = Application.findById;
      const originalJobFindById = Job.findById;

      Application.findById = async () => mockApp;
      Job.findById = async () => mockJob;

      try {
        const req = {
          params: { applicationId: validApplicationId },
          userId: validEmployerId, // Current authenticated employer
          body: { status: 'reviewing' }
        };
        const res = createMockRes();

        await updateApplicationStatus(req, res, () => {});

        assert.strictEqual(res.statusCode, 403);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.ok(res.jsonData.message.includes('Forbidden'));
      } finally {
        Application.findById = originalAppFindById;
        Job.findById = originalJobFindById;
      }
    });
  });

  describe('Route Security & Role Restrictions', () => {
    it('registers GET /job/:jobId with protect and authorize("employer")', () => {
      const routeLayer = applicationRouter.stack.find(
        (layer) => layer.route && layer.route.path === '/job/:jobId' && layer.route.methods.get
      );

      assert.ok(routeLayer, 'Route GET /job/:jobId must be registered in applicationRouter');
      assert.ok(
        routeLayer.route.stack.length >= 3,
        'GET /job/:jobId must contain protect, authorize, and controller handlers'
      );
    });

    it('registers PATCH /:applicationId/status with protect and authorize("employer")', () => {
      const routeLayer = applicationRouter.stack.find(
        (layer) =>
          layer.route &&
          layer.route.path === '/:applicationId/status' &&
          layer.route.methods.patch
      );

      assert.ok(
        routeLayer,
        'Route PATCH /:applicationId/status must be registered in applicationRouter'
      );
      assert.ok(
        routeLayer.route.stack.length >= 3,
        'PATCH /:applicationId/status must contain protect, authorize, and controller handlers'
      );
    });

    it('rejects candidate role attempting to access employer application routes (403)', () => {
      const employerOnlyMiddleware = authorize('employer');

      const req = {
        user: { id: validCandidateId, role: 'candidate' }
      };
      const res = createMockRes();
      let nextCalled = false;

      employerOnlyMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, false);
      assert.strictEqual(res.statusCode, 403);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.ok(res.jsonData.message.includes("role 'candidate' is not authorized"));
    });

    it('allows employer role to pass authorize("employer") and calls next()', () => {
      const employerOnlyMiddleware = authorize('employer');

      const req = {
        user: { id: validEmployerId, role: 'employer' }
      };
      const res = createMockRes();
      let nextCalled = false;

      employerOnlyMiddleware(req, res, () => {
        nextCalled = true;
      });

      assert.strictEqual(nextCalled, true);
      assert.strictEqual(res.statusCode, null);
    });
  });
});
