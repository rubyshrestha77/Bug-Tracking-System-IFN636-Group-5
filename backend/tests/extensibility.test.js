const { expect } = require('chai');
const sinon = require('sinon');
const RoleFactory = require('../roles/RoleFactory');
const AuditorRole = require('../roles/examples/AuditorRole');
const requirePermission = require('../middleware/requirePermission');
const P = require('../roles/permissions');
const { mockRes } = require('./helpers/testUtils');

// Runs the real middleware with a fake request/response and returns the spies
const callGuard = (permission, role) => {
  const res = mockRes();
  const next = sinon.spy();
  requirePermission(permission)({ user: { role, isActive: true } }, res, next);
  return { res, next };
};

describe('BTSG-9: extensibility', () => {

  before(() => RoleFactory.register('auditor', AuditorRole));
  after(() => RoleFactory.unregister('auditor'));

  it('should make a new role usable after one registration line, with unchanged middleware', () => {
    const { next } = callGuard(P.USERS_VIEW, 'auditor');

    expect(next.calledOnce).to.be.true;
  });

  it('should deny the new role what it was not granted', () => {
    expect(callGuard(P.USERS_MANAGE, 'auditor').res.status.calledWith(403)).to.be.true;
    expect(callGuard(P.BUG_DELETE, 'auditor').res.status.calledWith(403)).to.be.true;
  });

  it('should not make the new role self-registrable', () => {
    expect(RoleFactory.selfRegistrableNames()).to.not.include('auditor');
  });

  it('should stop recognising the role once it is unregistered', () => {
    RoleFactory.unregister('auditor');

    expect(callGuard(P.USERS_VIEW, 'auditor').res.status.calledWith(403)).to.be.true;

    RoleFactory.register('auditor', AuditorRole); // restore for the after() hook
  });
});
