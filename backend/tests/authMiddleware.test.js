const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const P = require('../roles/permissions');
const { mockRes, fakeQuery } = require('./helpers/testUtils');

describe('Auth middleware', () => {
  const OLD_SECRET = process.env.JWT_SECRET;

  before(() => { process.env.JWT_SECRET = 'unit_test_secret'; });
  after(() => { process.env.JWT_SECRET = OLD_SECRET; });
  afterEach(() => sinon.restore());

  describe('requireAuth', () => {
    const tokenFor = (id) => jwt.sign({ id }, process.env.JWT_SECRET);

    it('should return 401 if there is no Authorization header', async () => {
      const res = mockRes();
      const next = sinon.spy();

      await requireAuth({ headers: {} }, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Not authorized, no token' })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should return 401 if the header does not start with "Bearer "', async () => {
      const res = mockRes();
      const next = sinon.spy();

      await requireAuth({ headers: { authorization: 'Token abc' } }, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should return 401 if the token is invalid', async () => {
      const res = mockRes();
      const next = sinon.spy();

      await requireAuth({ headers: { authorization: 'Bearer not.a.token' } }, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Not authorized, token failed' })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should return 401 if the user no longer exists', async () => {
      sinon.stub(User, 'findById').returns(fakeQuery(null));
      const res = mockRes();
      const next = sinon.spy();

      await requireAuth({ headers: { authorization: `Bearer ${tokenFor('u1')}` } }, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Not authorized, user not found' })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should return 401 if the account is deactivated', async () => {
      sinon.stub(User, 'findById').returns(fakeQuery({ id: 'u1', isActive: false }));
      const res = mockRes();
      const next = sinon.spy();

      await requireAuth({ headers: { authorization: `Bearer ${tokenFor('u1')}` } }, res, next);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Account deactivated' })).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should attach the user to req and call next() for a valid token', async () => {
      const user = { id: 'u1', role: 'reporter', isActive: true };
      const query = fakeQuery(user);
      sinon.stub(User, 'findById').returns(query);
      const req = { headers: { authorization: `Bearer ${tokenFor('u1')}` } };
      const res = mockRes();
      const next = sinon.spy();

      await requireAuth(req, res, next);

      expect(query.select.calledWith('-password')).to.be.true; // never load the hash
      expect(req.user).to.equal(user);
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });
  });

  describe('requirePermission', () => {
    const run = (user, permission) => {
      const res = mockRes();
      const next = sinon.spy();
      requirePermission(permission)({ user }, res, next);
      return { res, next };
    };

    it('should call next() when the role holds the permission', () => {
      const { res, next } = run({ role: 'reporter', isActive: true }, P.BUG_REPORT);
      expect(next.calledOnce).to.be.true;
      expect(res.status.called).to.be.false;
    });

    it('should return 403 when the role lacks the permission', () => {
      const { res, next } = run({ role: 'developer', isActive: true }, P.BUG_REPORT);
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.firstCall.args[0].message).to.contain(P.BUG_REPORT);
      expect(next.called).to.be.false;
    });

    it('should return 403 for an unknown role', () => {
      const { res, next } = run({ role: 'hacker', isActive: true }, P.BUG_VIEW);
      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should return 403 when there is no user on the request', () => {
      const { res, next } = run(undefined, P.BUG_VIEW);
      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });

    it('should return 403 for a deactivated user even with the right role', () => {
      const { res, next } = run({ role: 'admin', isActive: false }, P.USERS_VIEW);
      expect(res.status.calledWith(403)).to.be.true;
      expect(next.called).to.be.false;
    });
  });
});
