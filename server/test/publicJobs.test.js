const { describe, it } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const Job = require('../src/models/Job');
const { getJobs, getJobById } = require('../src/controllers/jobController');
const jobRouter = require('../src/routes/jobRoutes');
const { protect } = require('../src/middleware/authMiddleware');

describe('Day 9: Public Job Search and Job Details API', () => {
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

  describe('GET /api/jobs (Public Job Listing)', () => {
    it('returns active jobs with default pagination and no authentication', async () => {
      const mockJobs = [
        { _id: new mongoose.Types.ObjectId(), title: 'Backend Dev', status: 'active' },
        { _id: new mongoose.Types.ObjectId(), title: 'Frontend Dev', status: 'active' }
      ];

      const capturedQuery = {};
      const originalFind = Job.find;
      const originalCount = Job.countDocuments;

      Job.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery(mockJobs, capturedQuery);
      };

      Job.countDocuments = async (filter) => {
        capturedQuery.countFilter = filter;
        return 2;
      };

      try {
        const req = { query: {} }; // No req.userId, no req.user (public access)
        const res = createMockRes();

        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.strictEqual(res.jsonData.status, 'success');
        assert.deepStrictEqual(res.jsonData.data, mockJobs);
        assert.strictEqual(res.jsonData.pagination.page, 1);
        assert.strictEqual(res.jsonData.pagination.limit, 10);
        assert.strictEqual(res.jsonData.pagination.total, 2);
        assert.strictEqual(res.jsonData.pagination.totalPages, 1);

        // Verify filter enforces active status and default sort / pagination
        assert.strictEqual(capturedQuery.findFilter.status, 'active');
        assert.strictEqual(capturedQuery.countFilter.status, 'active');
        assert.deepStrictEqual(capturedQuery.sort, { createdAt: -1 });
        assert.strictEqual(capturedQuery.skip, 0);
        assert.strictEqual(capturedQuery.limit, 10);
        assert.strictEqual(capturedQuery.select, '-__v');
      } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
      }
    });

    it('filters by keyword search across title, company, location, and description', async () => {
      const capturedQuery = {};
      const originalFind = Job.find;
      const originalCount = Job.countDocuments;

      Job.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Job.countDocuments = async (filter) => {
        capturedQuery.countFilter = filter;
        return 0;
      };

      try {
        const req = { query: { search: 'Senior Engineer' } };
        const res = createMockRes();

        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.ok(capturedQuery.findFilter.$or);
        assert.strictEqual(capturedQuery.findFilter.$or.length, 4);

        const regex = capturedQuery.findFilter.$or[0].title;
        assert.ok(regex instanceof RegExp);
        assert.ok(regex.test('Senior Engineer'));
        assert.ok(regex.test('senior engineer')); // case-insensitive
        assert.strictEqual(capturedQuery.findFilter.status, 'active');
      } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
      }
    });

    it('safely escapes special regex characters in search and location', async () => {
      const capturedQuery = {};
      const originalFind = Job.find;
      const originalCount = Job.countDocuments;

      Job.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Job.countDocuments = async (filter) => {
        capturedQuery.countFilter = filter;
        return 0;
      };

      try {
        const req = {
          query: {
            search: 'C++ / Node.js (v18+) [Remote?]',
            location: 'New York (Metro area) + Remote'
          }
        };
        const res = createMockRes();

        // Must not throw Invalid Regular Expression error
        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.ok(capturedQuery.findFilter.$or[0].title instanceof RegExp);
        assert.ok(capturedQuery.findFilter.location instanceof RegExp);

        // Verify literal match rather than regex special semantics
        assert.ok(capturedQuery.findFilter.$or[0].title.test('Need C++ / Node.js (v18+) [Remote?] specialist'));
        assert.ok(capturedQuery.findFilter.location.test('Office in New York (Metro area) + Remote'));
      } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
      }
    });

    it('filters by valid jobType and workplaceMode enums', async () => {
      const capturedQuery = {};
      const originalFind = Job.find;
      const originalCount = Job.countDocuments;

      Job.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Job.countDocuments = async (filter) => {
        capturedQuery.countFilter = filter;
        return 0;
      };

      try {
        const req = {
          query: {
            jobType: 'contract',
            workplaceMode: 'remote'
          }
        };
        const res = createMockRes();

        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(capturedQuery.findFilter.status, 'active');
        assert.strictEqual(capturedQuery.findFilter.jobType, 'contract');
        assert.strictEqual(capturedQuery.findFilter.workplaceMode, 'remote');
      } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
      }
    });

    it('combines search, location, jobType, workplaceMode and pagination', async () => {
      const capturedQuery = {};
      const originalFind = Job.find;
      const originalCount = Job.countDocuments;

      Job.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Job.countDocuments = async (filter) => {
        capturedQuery.countFilter = filter;
        return 45;
      };

      try {
        const req = {
          query: {
            search: 'Engineer',
            location: 'Austin',
            jobType: 'full-time',
            workplaceMode: 'hybrid',
            page: '2',
            limit: '20'
          }
        };
        const res = createMockRes();

        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(capturedQuery.findFilter.status, 'active');
        assert.ok(capturedQuery.findFilter.$or);
        assert.ok(capturedQuery.findFilter.location instanceof RegExp);
        assert.strictEqual(capturedQuery.findFilter.jobType, 'full-time');
        assert.strictEqual(capturedQuery.findFilter.workplaceMode, 'hybrid');
        assert.strictEqual(capturedQuery.skip, 20); // (page 2 - 1) * 20
        assert.strictEqual(capturedQuery.limit, 20);
        assert.strictEqual(res.jsonData.pagination.page, 2);
        assert.strictEqual(res.jsonData.pagination.limit, 20);
        assert.strictEqual(res.jsonData.pagination.total, 45);
        assert.strictEqual(res.jsonData.pagination.totalPages, 3);
      } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
      }
    });

    it('caps limit at 50 if requested limit is greater than 50', async () => {
      const capturedQuery = {};
      const originalFind = Job.find;
      const originalCount = Job.countDocuments;

      Job.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Job.countDocuments = async () => 100;

      try {
        const req = { query: { page: '1', limit: '100' } };
        const res = createMockRes();

        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(capturedQuery.limit, 50);
        assert.strictEqual(res.jsonData.pagination.limit, 50);
        assert.strictEqual(res.jsonData.pagination.totalPages, 2);
      } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
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
        const req = { query: { page: invalidPage } };
        const res = createMockRes();

        await getJobs(req, res, () => {});

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
        const req = { query: { limit: invalidLimit } };
        const res = createMockRes();

        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 400, `Expected 400 for limit='${JSON.stringify(invalidLimit)}'`);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Limit must be a positive integer');
      }
    });

    it('accepts valid positive integer strings with whitespace trimming for page and limit', async () => {
      const capturedQuery = {};
      const originalFind = Job.find;
      const originalCount = Job.countDocuments;

      Job.find = (filter) => {
        capturedQuery.findFilter = filter;
        return createMockChainableQuery([], capturedQuery);
      };
      Job.countDocuments = async () => 30;

      try {
        const req = { query: { page: ' 3 ', limit: ' 15 ' } };
        const res = createMockRes();

        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(capturedQuery.skip, 30); // (3 - 1) * 15
        assert.strictEqual(capturedQuery.limit, 15);
        assert.strictEqual(res.jsonData.pagination.page, 3);
        assert.strictEqual(res.jsonData.pagination.limit, 15);
      } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
      }
    });

    it('rejects invalid jobType filter with 400', async () => {
      const req = { query: { jobType: 'temporary' } };
      const res = createMockRes();

      await getJobs(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.ok(res.jsonData.message.includes("Invalid jobType filter: 'temporary'"));
    });

    it('rejects invalid workplaceMode filter with 400', async () => {
      const req = { query: { workplaceMode: 'space' } };
      const res = createMockRes();

      await getJobs(req, res, () => {});

      assert.strictEqual(res.statusCode, 400);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.ok(res.jsonData.message.includes("Invalid workplaceMode filter: 'space'"));
    });

    it('handles empty results correctly with totalPages: 0 and data: []', async () => {
      const originalFind = Job.find;
      const originalCount = Job.countDocuments;

      Job.find = () => createMockChainableQuery([], {});
      Job.countDocuments = async () => 0;

      try {
        const req = { query: { search: 'nonexistent-query-12345' } };
        const res = createMockRes();

        await getJobs(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.deepStrictEqual(res.jsonData.data, []);
        assert.strictEqual(res.jsonData.pagination.total, 0);
        assert.strictEqual(res.jsonData.pagination.totalPages, 0);
      } finally {
        Job.find = originalFind;
        Job.countDocuments = originalCount;
      }
    });
  });

  describe('GET /api/jobs/:id (Public Job Details)', () => {
    it('returns active job details for a valid ObjectId', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const mockJob = {
        _id: validId,
        title: 'Full Stack Engineer',
        company: 'Innovate Labs',
        location: 'Remote',
        status: 'active'
      };

      let capturedFilter = null;
      let capturedSelect = null;
      const originalFindOne = Job.findOne;

      Job.findOne = (filter) => {
        capturedFilter = filter;
        return {
          select(arg) {
            capturedSelect = arg;
            return Promise.resolve(mockJob);
          }
        };
      };

      try {
        const req = { params: { id: validId } };
        const res = createMockRes();

        await getJobById(req, res, () => {});

        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.jsonData.success, true);
        assert.strictEqual(res.jsonData.status, 'success');
        assert.deepStrictEqual(res.jsonData.data.job, mockJob);
        assert.deepStrictEqual(capturedFilter, { _id: validId, status: 'active' });
        assert.strictEqual(capturedSelect, '-__v');
      } finally {
        Job.findOne = originalFindOne;
      }
    });

    it('returns 404 for a malformed ObjectId', async () => {
      const req = { params: { id: 'invalid-id-format' } };
      const res = createMockRes();

      await getJobById(req, res, () => {});

      assert.strictEqual(res.statusCode, 404);
      assert.strictEqual(res.jsonData.status, 'fail');
      assert.strictEqual(res.jsonData.message, 'Job not found');
    });

    it('returns 404 when job does not exist in the database', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const originalFindOne = Job.findOne;

      Job.findOne = () => ({
        select() {
          return Promise.resolve(null);
        }
      });

      try {
        const req = { params: { id: validId } };
        const res = createMockRes();

        await getJobById(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Job not found');
      } finally {
        Job.findOne = originalFindOne;
      }
    });

    it('returns 404 when job exists but has closed status', async () => {
      const validId = new mongoose.Types.ObjectId().toString();
      const originalFindOne = Job.findOne;

      // Because findOne queries { _id, status: 'active' }, a closed job returns null
      Job.findOne = (filter) => {
        assert.strictEqual(filter.status, 'active');
        return {
          select() {
            return Promise.resolve(null);
          }
        };
      };

      try {
        const req = { params: { id: validId } };
        const res = createMockRes();

        await getJobById(req, res, () => {});

        assert.strictEqual(res.statusCode, 404);
        assert.strictEqual(res.jsonData.status, 'fail');
        assert.strictEqual(res.jsonData.message, 'Job not found');
      } finally {
        Job.findOne = originalFindOne;
      }
    });
  });

  describe('Route Security and Registration Order', () => {
    it('registers GET /my before GET /:id so /my is not shadowed', () => {
      const routes = jobRouter.stack
        .filter((layer) => layer.route)
        .map((layer) => ({
          path: layer.route.path,
          method: Object.keys(layer.route.methods)[0].toUpperCase()
        }));

      const getMyIndex = routes.findIndex((r) => r.path === '/my' && r.method === 'GET');
      const getByIdIndex = routes.findIndex((r) => r.path === '/:id' && r.method === 'GET');

      assert.ok(getMyIndex !== -1, 'GET /my must be registered');
      assert.ok(getByIdIndex !== -1, 'GET /:id must be registered');
      assert.ok(
        getMyIndex < getByIdIndex,
        `GET /my (index ${getMyIndex}) must precede GET /:id (index ${getByIdIndex}) to avoid route shadowing`
      );
    });

    it('ensures GET / and GET /:id are public without auth middleware', () => {
      const publicGetRoutes = jobRouter.stack.filter(
        (layer) => layer.route && layer.route.methods.get && (layer.route.path === '/' || layer.route.path === '/:id')
      );

      assert.strictEqual(publicGetRoutes.length, 2);

      for (const layer of publicGetRoutes) {
        const handlerNames = layer.route.stack.map((s) => s.name);
        assert.ok(!handlerNames.includes('protect'), `Route ${layer.route.path} should not include protect middleware`);
        assert.ok(!handlerNames.includes('authorize'), `Route ${layer.route.path} should not include authorize middleware`);
      }
    });

    it('ensures POST /, GET /my, PUT /:id, and DELETE /:id require protect and authorize', () => {
      const employerRoutes = [
        { path: '/', method: 'post' },
        { path: '/my', method: 'get' },
        { path: '/:id', method: 'put' },
        { path: '/:id', method: 'delete' }
      ];

      for (const expected of employerRoutes) {
        const layer = jobRouter.stack.find(
          (l) => l.route && l.route.path === expected.path && l.route.methods[expected.method]
        );

        assert.ok(layer, `Route ${expected.method.toUpperCase()} ${expected.path} must exist`);
        // The middleware stack must include protect and authorize handlers
        assert.ok(
          layer.route.stack.length >= 3,
          `Route ${expected.method.toUpperCase()} ${expected.path} must have protect, authorize, and controller`
        );
      }
    });
  });
});
