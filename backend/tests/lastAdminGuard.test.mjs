import { expect } from 'chai';
import guard from '../services/lastAdminGuard.js';

const { assertNotLastActiveAdmin, LastAdminError } = guard;
const admin = { role: 'admin', isActive: true };

describe('BTSG-8: last-admin guard', () => {
    it('blocks deactivating the only active admin', () => {
        expect(() => assertNotLastActiveAdmin(admin, 1, false)).to.throw(LastAdminError);
    });
    it('reports status 409 for the blocked case', () => {
        try {
            assertNotLastActiveAdmin(admin, 1, false);
            expect.fail('should have thrown');
        } catch (e) {
            expect(e.status).to.equal(409);
        }
    });
    it('allows deactivating one of two active admins', () => {
        expect(() => assertNotLastActiveAdmin(admin, 2, false)).to.not.throw();
    });
    it('allows reactivating an inactive admin', () => {
        expect(() => assertNotLastActiveAdmin({ role: 'admin', isActive: false }, 1, true)).to.not.throw();
    });
    it('ignores non-admin users', () => {
        expect(() => assertNotLastActiveAdmin({ role: 'reporter', isActive: true }, 1, false)).to.not.throw();
    });
});
