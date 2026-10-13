import { expect } from 'chai';
import guard from '../services/lastAdminGuard.js';
const { assertNotLastActiveAdmin, LastAdminError } = guard;

const admin = { role: 'Admin', isActive: true };

describe('last-admin guard', () => {
  it('blocks deactivating the only active admin', () => {
    expect(() => assertNotLastActiveAdmin(admin, 1, false)).to.throw(LastAdminError);
  });
  it('allows deactivating one of two admins', () => {
    expect(() => assertNotLastActiveAdmin(admin, 2, false)).to.not.throw();
  });
  it('allows reactivating', () => {
    expect(() => assertNotLastActiveAdmin({ ...admin, isActive: false }, 1, true)).to.not.throw();
  });
  it('ignores non-admins', () => {
    expect(() => assertNotLastActiveAdmin({ role: 'Reporter', isActive: true }, 1, false)).to.not.throw();
  });
});