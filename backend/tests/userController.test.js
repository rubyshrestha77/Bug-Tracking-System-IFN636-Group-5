const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const User = require('../models/User');
const { PUBLIC_USER_FIELDS } = require('../models/userFields');
const { listUsers, setUserStatus } = require('../controllers/userController');
const { mockRes, fakeQuery } = require('./helpers/testUtils');

describe('UserController', () => {
  afterEach(() => sinon.restore());

  describe('listUsers', () => {
    it('should return all users using only the public fields', async () => {
      const users = [{ name: 'A', role: 'admin' }, { name: 'B', role: 'reporter' }];
      const query = fakeQuery(users);
      sinon.stub(User, 'find').returns(query);
      const res = mockRes();

      await listUsers({}, res);

      expect(query.select.calledWith(PUBLIC_USER_FIELDS)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(users)).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(User, 'find').throws(new Error('DB Error'));
      const res = mockRes();

      await listUsers({}, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
  });

  describe('setUserStatus', () => {
    const targetId = new mongoose.Types.ObjectId().toString();
    const adminId = new mongoose.Types.ObjectId().toString();
    const req = (body, id = targetId) => ({
      params: { id }, body, user: { id: adminId },
    });

    it('should return 400 for an invalid user id', async () => {
      const res = mockRes();
      await setUserStatus(req({ isActive: false }, 'abc'), res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'Invalid user id' })).to.be.true;
    });

    it('should return 400 if isActive is not a boolean', async () => {
      const res = mockRes();
      await setUserStatus(req({ isActive: 'no' }), res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'isActive must be true or false' })).to.be.true;
    });

    it('should stop an admin deactivating their own account', async () => {
      const findStub = sinon.stub(User, 'findById');
      const res = mockRes();

      await setUserStatus(req({ isActive: false }, adminId), res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'You cannot deactivate your own account' })).to.be.true;
      expect(findStub.called).to.be.false;
    });

    it('should return 404 if the target user does not exist', async () => {
      sinon.stub(User, 'findById').resolves(null);
      const res = mockRes();

      await setUserStatus(req({ isActive: false }), res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: 'User not found' })).to.be.true;
    });

    it('should return 409 when deactivating the last active admin', async () => {
      sinon.stub(User, 'findById').resolves({ role: 'admin', isActive: true });
      sinon.stub(User, 'countDocuments').resolves(1);
      const updateStub = sinon.stub(User, 'findByIdAndUpdate');
      const res = mockRes();

      await setUserStatus(req({ isActive: false }), res);

      expect(res.status.calledWith(409)).to.be.true;
      expect(res.json.calledWith({ message: 'Cannot deactivate the last active admin' })).to.be.true;
      expect(updateStub.called).to.be.false;
    });

    it('should deactivate an admin when another active admin exists', async () => {
      sinon.stub(User, 'findById').resolves({ role: 'admin', isActive: true });
      sinon.stub(User, 'countDocuments').resolves(2);
      const updated = { name: 'B', isActive: false };
      const updateStub = sinon.stub(User, 'findByIdAndUpdate').returns(fakeQuery(updated));
      const res = mockRes();

      await setUserStatus(req({ isActive: false }), res);

      expect(updateStub.calledOnceWith(targetId, { isActive: false })).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(updated)).to.be.true;
    });

    it('should reactivate a user even when only one admin is active', async () => {
      sinon.stub(User, 'findById').resolves({ role: 'reporter', isActive: false });
      sinon.stub(User, 'countDocuments').resolves(1);
      const updated = { name: 'C', isActive: true };
      sinon.stub(User, 'findByIdAndUpdate').returns(fakeQuery(updated));
      const res = mockRes();

      await setUserStatus(req({ isActive: true }), res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(updated)).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(User, 'findById').throws(new Error('DB Error'));
      const res = mockRes();

      await setUserStatus(req({ isActive: true }), res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
  });
});
