const { expect } = require('chai');
const RoleFactory = require('../roles/RoleFactory');
const Role = require('../roles/Role');
const P = require('../roles/permissions');

// A fake logged-in user
const user = (role, isActive = true) => ({ role, isActive });

describe('Role hierarchy (polymorphism)', () => {

  it('should let admin manage users but not resolve bugs', () => {
    const role = RoleFactory.create('admin');

    expect(role.can(user('admin'), P.USERS_MANAGE)).to.equal(true);
    expect(role.can(user('admin'), P.BUG_RESOLVE)).to.equal(false);
  });

  it('should let admin view bugs (read-only) but not report or delete them', () => {
    const role = RoleFactory.create('admin');

    expect(role.can(user('admin'), P.BUG_VIEW)).to.equal(true);
    expect(role.can(user('admin'), P.BUG_REPORT)).to.equal(false);
    expect(role.can(user('admin'), P.BUG_DELETE)).to.equal(false);
  });

  it('should let developer resolve bugs but not delete them or view users', () => {
    const role = RoleFactory.create('developer');

    expect(role.can(user('developer'), P.BUG_RESOLVE)).to.equal(true);
    expect(role.can(user('developer'), P.BUG_DELETE)).to.equal(false);
    expect(role.can(user('developer'), P.USERS_VIEW)).to.equal(false);
  });

  it('should let reporter delete bugs but not assign them', () => {
    const role = RoleFactory.create('reporter');

    expect(role.can(user('reporter'), P.BUG_DELETE)).to.equal(true);
    expect(role.can(user('reporter'), P.BUG_ASSIGN)).to.equal(false);
  });

  it('should deny an inactive account (shared step of the template method)', () => {
    expect(RoleFactory.create('admin').can(user('admin', false), P.USERS_VIEW)).to.equal(false);
  });

  it('should deny a user whose role does not match the role object', () => {
    expect(RoleFactory.create('admin').can(user('reporter'), P.USERS_VIEW)).to.equal(false);
  });

  it('should deny when there is no user at all', () => {
    expect(RoleFactory.create('admin').can(undefined, P.USERS_VIEW)).to.equal(false);
  });

  it('should return null for an unknown role', () => {
    expect(RoleFactory.create('hacker')).to.equal(null);
  });

  it('should only allow reporter and developer to self-register', () => {
    expect(RoleFactory.selfRegistrableNames()).to.have.members(['reporter', 'developer']);
  });

  it('should list all registered role names', () => {
    expect(RoleFactory.names()).to.include.members(['admin', 'reporter', 'developer']);
  });

  it('should not allow the abstract Role to be instantiated', () => {
    expect(() => new Role('x')).to.throw('Role is abstract');
  });

  it('should force subclasses to override hasPermission()', () => {
    class HalfRole extends Role {}
    expect(() => new HalfRole('half').hasPermission()).to.throw('must be overridden');
  });
});
