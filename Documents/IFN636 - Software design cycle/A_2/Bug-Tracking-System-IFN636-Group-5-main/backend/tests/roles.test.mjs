import { expect } from 'chai';
import RoleFactory from '../roles/RoleFactory.js';
import P from '../roles/permissions.js';

describe('Role polymorphism', () => {
  const u = (role, isActive = true) => ({ role, isActive });
  it('Admin can manage users, not resolve bugs', () => {
    const r = RoleFactory.create('Admin');
    expect(r.can(u('Admin'), P.USERS_MANAGE)).to.equal(true);
    expect(r.can(u('Admin'), P.BUG_RESOLVE)).to.equal(false);
  });
  it('Developer cannot view users', () => {
    expect(RoleFactory.create('Developer').can(u('Developer'), P.USERS_VIEW)).to.equal(false);
  });
  it('inactive account is denied by the shared step', () => {
    expect(RoleFactory.create('Admin').can(u('Admin', false), P.USERS_VIEW)).to.equal(false);
  });
  it('unknown role returns null', () => {
    expect(RoleFactory.create('Hacker')).to.equal(null);
  });
});