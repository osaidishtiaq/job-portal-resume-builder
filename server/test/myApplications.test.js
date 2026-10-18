const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Application = require('../src/models/Application');
const { getMyApplications } = require('../src/controllers/applicationController');
const applicationRouter = require('../src/routes/applicationRoutes');
const { authorize } = require('../src/middleware/roleMiddleware');

describe('Day 11: Candidate Job Applications (GET /api/applications/my)', () => {
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

  const validCandidateId = new mongoose.Types.ObjectId().toString();

  describe('getMyApplications - Listing & Population', () => {
    it('returns candidate applications with default pagination and populated job fields (200)', async () => {
      const mockJob = {
        _id: new mongoose.Types.ObjectId(),
        title: 'Full Stack Developer',
        company: 'Innovate Corp',
        location: 'Remote',
        jobType: 'full-time',
        workplaceMode: 'remote',
        status: 'active'
      };

      const mockApplications = [
        {
          _id: new mongoose.Types.ObjectId(),
          candidate: validCandidateId,
          job: mockJob,
          coverLetter: 'Strong Node.js background.',
          status: 'pending',
          createdAt: new Date()
        }
      ];

      const capturedQuery = {};
      const originalFind = Application.find;
      const originalCount = Application.countDocuments;

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
          userId: validCandidateId,
          query: {}
        };
        const res = createMockRes();

        await getMyApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.strictEqual(res.jsonData.status, 'success');
        assert.deepStrictEqual(res.jsonData.data, mockApplications);
        assert.strictEqual(res.jsonData.pagination.page, 1);
        assert.strictEqual(res.jsonData.pagination.limit, 10);
        assert.strictEqual(res.jsonData.pagination.total, 1);
        assert.strictEqual(res.jsonData.pagination.totalPages, 1);

        // Verify filter, deterministic sorting with tie-breaker, and population
        assert.deepStrictEqual(capturedQuery.findFilter, { candidate: validCandidateId });
        assert.deepStrictEqual(capturedQuery.countFilter, { candidate: validCandidateId });
        assert.deepStrictEqual(capturedQuery.sort, { createdAt: -1, _id: -1 });
        assert.strictEqual(capturedQuery.skip, 0);
        assert.strictEqual(capturedQuery.limit, 10);
        assert.strictEqual(capturedQuery.populateField, 'job');
        assert.strictEqual(
          capturedQuery.populateSelect,
          'title company location jobType workplaceMode status'
        );
        assert.strictEqual(capturedQuery.select, '-__v');
      } finally {
        Application.find = originalFind;
        Application.countDocuments = originalCount;
      }
    });

    it('safely handles applications whose populated job no longer exists (job: null)', async () => {
      const mockApplicationsWithDeletedJob = [
        {
          _id: new mongoose.Types.ObjectId(),
          candidate: validCandidateId,
          job: null, // Referenced job document was deleted from database
          coverLetter: 'Interested in this position.',
          status: 'pending',
          createdAt: new Date()
        }
      ];

      const originalFind = Application.find;
      const originalCount = Application.countDocuments;

      Application.find = () => createMockChainableQuery(mockApplicationsWithDeletedJob);
      Application.countDocuments = async () => 1;

      try {
        const req = {
          userId: validCandidateId,
          query: {}
        };
        const res = createMockRes();

        // Must execute cleanly without null pointer exceptions
        await getMyApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.strictEqual(res.jsonData.data[0].job, null);
      } finally {
        Application.find = originalFind;
        Application.countDocuments = originalCount;
      }
    });

    it('handles empty results cleanly with totalPages: 0 and data: []', async () => {
      const originalFind = Application.find;
      const originalCount = Application.countDocuments;

      Application.find = () => createMockChainableQuery([]);
      Application.countDocuments = async () => 0;

      try {
        const req = {
          userId: validCandidateId,
          query: {}
        };
        const res = createMockRes();

        await getMyApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.deepStrictEqual(res.jsonData.data, []);
        assert.strictEqual(res.jsonData.pagination.total, 0);
        assert.strictEqual(res.jsonData.pagination.totalPages, 0);
      } finally {
        Application.find = originalFind;
        Application.countDocuments = originalCount;
      }
    });
  });

  describe('Candidate Isolation & Security', () => {
    it('strictly derives candidate filter from req.userId and ignores query and body overrides', async () => {
      const maliciousCandidateId = new mongoose.Types.ObjectId().toString();
      const capturedQuery = {};
      const originalFind = Application.find;
      const originalCount = Application.countDocuments;

      Application.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Application.countDocuments = async (filter) => {
        capturedQuery.countFilter = filter;
        return 0;
      };

      try {
        const req = {
          userId: validCandidateId, // Authenticated candidate ID
          query: { candidate: maliciousCandidateId, candidateId: maliciousCandidateId },
          body: { candidate: maliciousCandidateId, userId: maliciousCandidateId }
        };
        const res = createMockRes();

        await getMyApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        // Both find and count queries MUST strictly use authenticated req.userId
        assert.deepStrictEqual(capturedQuery.findFilter, { candidate: validCandidateId });
        assert.deepStrictEqual(capturedQuery.countFilter, { candidate: validCandidateId });
        assert.notStrictEqual(capturedQuery.findFilter.candidate, maliciousCandidateId);
      } finally {
        Application.find = originalFind;
        Application.countDocuments = originalCount;
      }
    });
  });

  describe('Pagination Validation & Integer Range Protection', () => {
    it('accepts custom page and limit with whitespace trimming', async () => {
      const capturedQuery = {};
      const originalFind = Application.find;
      const originalCount = Application.countDocuments;

      Application.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Application.countDocuments = async () => 25;

      try {
        const req = {
          userId: validCandidateId,
          query: { page: ' 3 ', limit: ' 5 ' }
        };
        const res = createMockRes();

        await getMyApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(capturedQuery.skip, 10); // (3 - 1) * 5
        assert.strictEqual(capturedQuery.limit, 5);
        assert.strictEqual(res.jsonData.pagination.page, 3);
        assert.strictEqual(res.jsonData.pagination.limit, 5);
        assert.strictEqual(res.jsonData.pagination.total, 25);
        assert.strictEqual(res.jsonData.pagination.totalPages, 5);
      } finally {
        Application.find = originalFind;
        Application.countDocuments = originalCount;
      }
    });

    it('caps limit at 50 when request passes limit > 50', async () => {
      const capturedQuery = {};
      const originalFind = Application.find;
      const originalCount = Application.countDocuments;

      Application.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Application.countDocuments = async () => 100;

      try {
        const req = {
          userId: validCandidateId,
          query: { limit: '100' }
        };
        const res = createMockRes();

        await getMyApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(capturedQuery.limit, 50);
        assert.strictEqual(res.jsonData.pagination.limit, 50);
      } finally {
        Application.find = originalFind;
        Application.countDocuments = originalCount;
      }
    });

    it('rejects invalid page values with 400', async () => {
      const invalidPages = [
        '',
        '   ',
        '0',
        '-1',
        '-10',
        'abc',
        '10abc',
        '1.5',
        '2.0',
        '1e2',
        ['1'],
        {}
      ];

      for (const invalidPage of invalidPages) {
        const req = { userId: validCandidateId, query: { page: invalidPage } };
        const res = createMockRes();

        await getMyApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 400, `Expected 400 for page='${JSON.stringify(invalidPage)}'`);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Page must be a positive integer');
      }
    });

    it('rejects invalid limit values with 400', async () => {
      const invalidLimits = [
        '',
        '   ',
        '0',
        '-1',
        '-25',
        'xyz',
        '10abc',
        '5.5',
        '2.0',
        '1e2',
        ['10'],
        {}
      ];

      for (const invalidLimit of invalidLimits) {
        const req = { userId: validCandidateId, query: { limit: invalidLimit } };
        const res = createMockRes();

        await getMyApplications(req, res, () => {});

        assert.strictEqual(res.statusCode, 400, `Expected 400 for limit='${JSON.stringify(invalidLimit)}'`);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Limit must be a positive integer');
      }
    });

    it('rejects page and limit values outside safe-integer range with 400', async () => {
      const unsafeValues = [
        '9007199254740992', // Number.MAX_SAFE_INTEGER + 1
        '99999999999999999999999999999'
      ];

      for (const unsafeVal of unsafeValues) {
        // Test unsafe page
        const reqPage = { userId: validCandidateId, query: { page: unsafeVal } };
        const resPage = createMockRes();
        await getMyApplications(reqPage, resPage, () => {});
        assert.strictEqual(resPage.statusCode, 400);
        assert.strictEqual(resPage.jsonData.message, 'Page must be a positive integer');

        // Test unsafe limit
        const reqLimit = { userId: validCandidateId, query: { limit: unsafeVal } };
        const resLimit = createMockRes();
        await getMyApplications(reqLimit, resLimit, () => {});
        assert.strictEqual(resLimit.statusCode, 400);
        assert.strictEqual(resLimit.jsonData.message, 'Limit must be a positive integer');
      }
    });

    it('rejects page values whose calculated skip exceeds Number.MAX_SAFE_INTEGER with 400', async () => {
      // 9007199254740991 is MAX_SAFE_INTEGER, but (9007199254740991 - 1) * 10 overflows MAX_SAFE_INTEGER
      const req = {
        userId: validCandidateId,
        query: { page: '9007199254740991' }
      };
      const res = createMockRes();

      await getMyApplications(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.strictEqual(res.jsonData.message, 'Page must be a positive integer');
    });
  });

  describe('Route Security & Role Restrictions', () => {
    it('registers GET /my in applicationRoutes with protect and authorize("candidate")', () => {
      const routeLayer = applicationRouter.stack.find(
        (layer) => layer.route && layer.route.path === '/my' && layer.route.methods.get
      );

      assert.ok(routeLayer, 'Route GET /my must be registered in applicationRouter');
      assert.ok(
        routeLayer.route.stack.length >= 3,
        'GET /my must contain protect, authorize, and controller handlers'
      );
    });

    it('rejects employer role attempting to access GET /my (403)', () => {
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

    it('allows candidate role to access GET /my', () => {
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
