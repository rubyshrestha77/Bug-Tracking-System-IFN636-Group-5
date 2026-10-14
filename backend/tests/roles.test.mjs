import { expect } from 'chai';
import RoleFactory from '../roles/RoleFactory.js';
import P from '../roles/permissions.js';

const u = (role, isActive = true) => ({ role, isActive });

describe('Role hierarchy (polymorphism)', () => {
    it('admin can manage users but not resolve bugs', () => {
        const r = RoleFactory.create('admin');
        expect(r.can(u('admin'), P.USERS_MANAGE)).to.equal(true);
        expect(r.can(u('admin'), P.BUG_RESOLVE)).to.equal(false);
    });

    it('admin can view bugs (read-only) but not report or delete them', () => {
        const r = RoleFactory.create('admin');
        expect(r.can(u('admin'), P.BUG_VIEW)).to.equal(true);
        expect(r.can(u('admin'), P.BUG_REPORT)).to.equal(false);
        expect(r.can(u('admin'), P.BUG_DELETE)).to.equal(false);
    });

    it('developer can resolve bugs but not delete them or view users', () => {
        const r = RoleFactory.create('developer');
        expect(r.can(u('developer'), P.BUG_RESOLVE)).to.equal(true);
        expect(r.can(u('developer'), P.BUG_DELETE)).to.equal(false);
        expect(r.can(u('developer'), P.USERS_VIEW)).to.equal(false);
    });

    it('reporter can delete bugs but not assign them', () => {
        const r = RoleFactory.create('reporter');
        expect(r.can(u('reporter'), P.BUG_DELETE)).to.equal(true);
        expect(r.can(u('reporter'), P.BUG_ASSIGN)).to.equal(false);
    });

    it('shared step denies an inactive account for every role', () => {
        expect(RoleFactory.create('admin').can(u('admin', false), P.USERS_VIEW)).to.equal(false);
    });

    it('shared step denies a user whose role does not match', () => {
        expect(RoleFactory.create('admin').can(u('reporter'), P.USERS_VIEW)).to.equal(false);
    });

    it('unknown role returns null', () => {
        expect(RoleFactory.create('hacker')).to.equal(null);
    });

    it('only reporter and developer are self-registrable', () => {
        expect(RoleFactory.selfRegistrableNames()).to.deep.equal(['reporter', 'developer']);
    });
});
