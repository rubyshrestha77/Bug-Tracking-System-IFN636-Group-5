import { expect } from 'chai';
import requirePermission from '../middleware/requirePermission.js';
import userFields from '../models/userFields.js';
import P from '../roles/permissions.js';

const run = (role) => {
  let status = null, nexted = false;
  const res = { status(c) { status = c; return this; }, json() { return this; } };
  requirePermission(P.USERS_VIEW)({ user: { role, isActive: true } }, res, () => { nexted = true; });
  return { status, nexted };
};

describe('BTSG-6', () => {
  it('Reporter gets 403', () => expect(run('Reporter')).to.deep.equal({ status: 403, nexted: false }));
  it('Developer gets 403', () => expect(run('Developer')).to.deep.equal({ status: 403, nexted: false }));
  it('Admin passes', () => expect(run('Admin').nexted).to.equal(true));
  it('projection excludes password fields', () => {
    expect(userFields.PUBLIC_USER_FIELDS).to.not.match(/password|hash/i);
  });
});