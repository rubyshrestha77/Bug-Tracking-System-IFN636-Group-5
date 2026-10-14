import { expect } from 'chai';
import RoleFactory from '../roles/RoleFactory.js';
import AuditorRole from '../roles/examples/AuditorRole.js';
import requirePermission from '../middleware/requirePermission.js';
import P from '../roles/permissions.js';

const callGuard = (permission, role) => {
    let status = null;
    let passed = false;
    const res = { status(c) { status = c; return this; }, json() { return this; } };
    requirePermission(permission)({ user: { role, isActive: true } }, res, () => { passed = true; });
    return { status, passed };
};

describe('BTSG-9: extensibility', () => {
    before(() => RoleFactory.register('auditor', AuditorRole));
    after(() => RoleFactory.unregister('auditor'));

    it('new role is usable after one registration line, with unchanged middleware', () => {
        expect(callGuard(P.USERS_VIEW, 'auditor').passed).to.equal(true);
    });
    it('new role is denied what it was not granted', () => {
        expect(callGuard(P.USERS_MANAGE, 'auditor').status).to.equal(403);
        expect(callGuard(P.BUG_DELETE, 'auditor').status).to.equal(403);
    });
    it('new role is not self-registrable', () => {
        expect(RoleFactory.selfRegistrableNames()).to.not.include('auditor');
    });
});
