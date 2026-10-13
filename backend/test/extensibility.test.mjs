import { expect } from 'chai';
import RoleFactory from '../roles/RoleFactory.js';
import AuditorRole from '../roles/examples/AuditorRole.js';
import requirePermission from '../middleware/requirePermission.js';
import P from '../roles/permissions.js';

const call = (perm, role) => {
  let nexted = false, status = null;
  const res = { status(c) { status = c; return this; }, json() { return this; } };
  requirePermission(perm)({ user: { role, isActive: true } }, res, () => { nexted = true; });
  return { nexted, status };
};

describe('extensibility', () => {
  before(() => RoleFactory.register('Auditor', AuditorRole));
  after(() => RoleFactory.unregister('Auditor'));

  it('new role works with unchanged middleware', () => {
    expect(call(P.USERS_VIEW, 'Auditor').nexted).to.equal(true);
    expect(call(P.USERS_MANAGE, 'Auditor').status).to.equal(403);
  });
});