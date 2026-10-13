import { expect } from 'chai';
import requirePermission from '../middleware/requirePermission.js';
import userFields from '../models/userFields.js';
import P from '../roles/permissions.js';

const callGuard = (role) => {
    let status = null;
    let passed = false;
    const res = { status(c) { status = c; return this; }, json() { return this; } };
    requirePermission(P.USERS_VIEW)({ user: { role, isActive: true } }, res, () => { passed = true; });
    return { status, passed };
};

describe('BTSG-6: user list access', () => {
    it('reporter gets 403 and no data', () => {
        expect(callGuard('reporter')).to.deep.equal({ status: 403, passed: false });
    });
    it('developer gets 403 and no data', () => {
        expect(callGuard('developer')).to.deep.equal({ status: 403, passed: false });
    });
    it('admin passes through to the handler', () => {
        expect(callGuard('admin').passed).to.equal(true);
    });
    it('projection never includes a password or hash field', () => {
        expect(userFields.PUBLIC_USER_FIELDS).to.not.match(/password|hash/i);
    });
});
