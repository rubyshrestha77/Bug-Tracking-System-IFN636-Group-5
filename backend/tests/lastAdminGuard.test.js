const { expect } = require('chai');
const { assertNotLastActiveAdmin, LastAdminError } = require('../services/lastAdminGuard');

const activeAdmin = { role: 'admin', isActive: true };

describe('BTSG-8: last-admin guard', () => {

  it('should block deactivating the only active admin', () => {
    expect(() => assertNotLastActiveAdmin(activeAdmin, 1, false)).to.throw(LastAdminError);
  });

  it('should report status 409 for the blocked case', () => {
    try {
      assertNotLastActiveAdmin(activeAdmin, 1, false);
      expect.fail('should have thrown');
    } catch (error) {
      expect(error.status).to.equal(409);
      expect(error.message).to.equal('Cannot deactivate the last active admin');
    }
  });

  it('should allow deactivating one of two active admins', () => {
    expect(() => assertNotLastActiveAdmin(activeAdmin, 2, false)).to.not.throw();
  });

  it('should allow reactivating an inactive admin', () => {
    expect(() => assertNotLastActiveAdmin({ role: 'admin', isActive: false }, 1, true)).to.not.throw();
  });

  it('should ignore non-admin users', () => {
    expect(() => assertNotLastActiveAdmin({ role: 'reporter', isActive: true }, 1, false)).to.not.throw();
  });

  it('should allow an admin that is already inactive to stay inactive', () => {
    expect(() => assertNotLastActiveAdmin({ role: 'admin', isActive: false }, 0, false)).to.not.throw();
  });
});
