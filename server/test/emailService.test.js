// Tests for Brevo HTTPS email integration
const { test, afterEach } = require('node:test');
const assert = require('node:assert');
const https = require('https');
const emailService = require('../src/services/emailService');

let originalRequest;

afterEach(() => {
  if (originalRequest) {
    https.request = originalRequest;
    originalRequest = null;
  }
  delete process.env.BREVO_API_KEY;
});

function mockRequest({ statusCode = 200, responseBody = '{}', emitError = null, timeout = false }) {
  originalRequest = https.request;
  https.request = (options, cb) => {
    const res = new (require('stream').Readable)({ read() {} });
    res.statusCode = statusCode;
    // simulate async response
    process.nextTick(() => {
      cb(res);
      if (emitError) {
        // connection error before response
        req.emit('error', emitError);
        return;
      }
      if (timeout) {
        // trigger timeout handler
        if (req._timeoutHandler) req._timeoutHandler();
        return;
      }
      res.emit('data', Buffer.from(responseBody));
      res.emit('end');
    });
    const req = {
      setTimeout: (ms, handler) => { req._timeoutHandler = handler; },
      on: (ev, fn) => { if (ev === 'error') req._errorHandler = fn; },
      write: () => {},
      end: () => {},
      destroy: (err) => { if (req._errorHandler) req._errorHandler(err); },
      emit: (ev, data) => { if (ev === 'error' && req._errorHandler) req._errorHandler(data); }
    };
    return req;
  };
}

test('Brevo API success', async () => {
  mockRequest({ statusCode: 202, responseBody: '{"message":"queued"}' });
  process.env.BREVO_API_KEY = 'dummy';
  await emailService.sendPasswordResetEmail({
    toEmail: 'test@example.com',
    userName: 'User',
    resetUrl: 'http://example.com/reset',
    expiresInMinutes: 10
  });
});

test('Brevo API HTTP failure returns sanitized error', async () => {
  mockRequest({ statusCode: 400, responseBody: '{"code":"invalid"}' });
  process.env.BREVO_API_KEY = 'dummy';
  await assert.rejects(
    emailService.sendPasswordResetEmail({
      toEmail: 'test@example.com',
      userName: 'User',
      resetUrl: 'http://example.com/reset',
      expiresInMinutes: 10
    }),
    (err) => {
      assert.match(err.message, /Brevo API error 400/);
      assert.match(err.message, /invalid/);
      // ensure no raw message field leaked
      assert.doesNotMatch(err.message, /message/);
      return true;
    }
  );
});

test('Brevo API connection failure propagates', async () => {
  const connError = new Error('ECONNREFUSED');
  mockRequest({ emitError: connError });
  process.env.BREVO_API_KEY = 'dummy';
  await assert.rejects(
    emailService.sendPasswordResetEmail({
      toEmail: 'test@example.com',
      userName: 'User',
      resetUrl: 'http://example.com/reset',
      expiresInMinutes: 10
    }),
    (err) => err.message === 'ECONNREFUSED'
  );
});

test('Brevo API timeout propagates as timeout error', async () => {
  mockRequest({ timeout: true });
  process.env.BREVO_API_KEY = 'dummy';
  await assert.rejects(
    emailService.sendPasswordResetEmail({
      toEmail: 'test@example.com',
      userName: 'User',
      resetUrl: 'http://example.com/reset',
      expiresInMinutes: 10
    }),
    (err) => err.message === 'Brevo request timeout'
  );
});

test('SMTP fallback when API key absent', async () => {
  // Ensure SMTP env vars are not set, so getTransporter returns null and function throws
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.SMTP_FROM;
  await assert.rejects(
    emailService.sendPasswordResetEmail({
      toEmail: 'test@example.com',
      userName: 'User',
      resetUrl: 'http://example.com/reset',
      expiresInMinutes: 10
    }),
    (err) => err.message.includes('SMTP credentials missing')
  );
});
