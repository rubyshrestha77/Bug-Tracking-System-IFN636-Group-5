const { expect } = require('chai');
const sinon = require('sinon');
const requirePermission = require('../middleware/requirePermission');
const { PUBLIC_USER_FIELDS } = require('../models/userFields');
const P = require('../roles/permissions');
const { mockRes } = require('./helpers/testUtils');

const callGuard = (role) => {
  const res = mockRes();
  const next = sinon.spy();
  requirePermission(P.USERS_VIEW)({ user: { role, isActive: true } }, res, next);
  return { res, next };
};

describe('BTSG-6: user list access', () => {

  it('should give a reporter 403 and no data', () => {
    const { res, next } = callGuard('reporter');

    expect(res.status.calledWith(403)).to.be.true;
    expect(next.called).to.be.false;
  });

  it('should give a developer 403 and no data', () => {
    const { res, next } = callGuard('developer');

    expect(res.status.calledWith(403)).to.be.true;
    expect(next.called).to.be.false;
  });

  it('should pass an admin through to the handler', () => {
    const { res, next } = callGuard('admin');

    expect(next.calledOnce).to.be.true;
    expect(res.status.called).to.be.false;
  });

  it('should never include a password or hash field in the projection', () => {
    expect(PUBLIC_USER_FIELDS).to.not.match(/password|hash/i);
  });
});
