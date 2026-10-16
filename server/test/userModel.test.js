const { describe, it } = require('node:test');
const assert = require('node:assert');
const User = require('../src/models/User');

describe('User Model Schema', () => {
  it('validates a complete and correct user document', () => {
    const user = new User({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashedPassword123',
      role: 'candidate'
    });

    const error = user.validateSync();
    assert.strictEqual(error, undefined);
  });

  it('defaults role to candidate', () => {
    const user = new User({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashedPassword123'
    });

    assert.strictEqual(user.role, 'candidate');
  });

  it('accepts employer role', () => {
    const user = new User({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashedPassword123',
      role: 'employer'
    });

    const error = user.validateSync();
    assert.strictEqual(error, undefined);
    assert.strictEqual(user.role, 'employer');
  });

  it('rejects invalid role in schema', () => {
    const user = new User({
      name: 'Jane Doe',
      email: 'jane@example.com',
      password: 'hashedPassword123',
      role: 'superadmin'
    });

    const error = user.validateSync();
    assert.ok(error);
    assert.ok(error.errors.role);
  });

  it('requires name, email, and password in schema', () => {
    const user = new User({});
    const error = user.validateSync();

    assert.ok(error);
    assert.ok(error.errors.name);
    assert.ok(error.errors.email);
    assert.ok(error.errors.password);
  });

  it('configures password with select: false in schema definition', () => {
    const passwordPath = User.schema.path('password');
    assert.strictEqual(passwordPath.options.select, false);
  });
});
