const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const {
  registerUser,
  loginUser,
  getProfile,
  updateUserProfile,
} = require('../controllers/authController');
const { mockRes } = require('./helpers/testUtils');

describe('AuthController', () => {
  const OLD_SECRET = process.env.JWT_SECRET;

  before(() => { process.env.JWT_SECRET = 'unit_test_secret'; });
  after(() => { process.env.JWT_SECRET = OLD_SECRET; });
  afterEach(() => sinon.restore());

  describe('registerUser', () => {
    const validBody = {
      name: 'Sam', email: 'sam@test.com', role: 'reporter', password: 'password123',
    };

    it('should return 400 if a field is missing', async () => {
      const req = { body: { ...validBody, email: undefined } };
      const res = mockRes();

      await registerUser(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'All fields are required' })).to.be.true;
    });

    it('should return 400 if role is not self-registrable (admin)', async () => {
      const req = { body: { ...validBody, role: 'admin' } };
      const res = mockRes();

      await registerUser(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.firstCall.args[0].message).to.match(/Role must be one of/);
    });

    it('should return 400 if password is shorter than 8 characters', async () => {
      const req = { body: { ...validBody, password: 'short' } };
      const res = mockRes();

      await registerUser(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'Password must be at least 8 characters' })).to.be.true;
    });

    it('should return 400 if the user already exists', async () => {
      sinon.stub(User, 'findOne').resolves({ _id: 'existing' });
      const createStub = sinon.stub(User, 'create');
      const res = mockRes();

      await registerUser({ body: validBody }, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'User already exists' })).to.be.true;
      expect(createStub.called).to.be.false;
    });

    it('should create a user and return 201 without the password', async () => {
      sinon.stub(User, 'findOne').resolves(null);
      const createStub = sinon.stub(User, 'create').resolves({
        id: 'u1', name: 'Sam', email: 'sam@test.com', role: 'reporter', password: 'HASHED',
      });
      const res = mockRes();

      await registerUser({ body: validBody }, res);

      expect(createStub.calledOnceWith(validBody)).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith({
        id: 'u1', name: 'Sam', email: 'sam@test.com', role: 'reporter',
      })).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(User, 'findOne').throws(new Error('DB Error'));
      const res = mockRes();

      await registerUser({ body: validBody }, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
  });

  describe('loginUser', () => {
    const req = () => ({ body: { email: 'sam@test.com', password: 'password123' } });
    const dbUser = {
      id: 'u1', name: 'Sam', email: 'sam@test.com', role: 'developer',
      password: 'HASHED', isActive: true,
    };

    it('should log in and return a valid JWT for correct credentials', async () => {
      sinon.stub(User, 'findOne').resolves(dbUser);
      sinon.stub(bcrypt, 'compare').resolves(true);
      const res = mockRes();

      await loginUser(req(), res);

      expect(res.status.called).to.be.false;
      const body = res.json.firstCall.args[0];
      expect(body).to.include({ id: 'u1', name: 'Sam', email: 'sam@test.com', role: 'developer' });
      expect(body).to.not.have.property('password');
      expect(jwt.verify(body.token, process.env.JWT_SECRET).id).to.equal('u1');
    });

    it('should return 401 for a wrong password', async () => {
      sinon.stub(User, 'findOne').resolves(dbUser);
      sinon.stub(bcrypt, 'compare').resolves(false);
      const res = mockRes();

      await loginUser(req(), res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledWith({ message: 'Invalid email or password' })).to.be.true;
    });

    it('should return 401 if the email is not registered', async () => {
      sinon.stub(User, 'findOne').resolves(null);
      const compareStub = sinon.stub(bcrypt, 'compare');
      const res = mockRes();

      await loginUser(req(), res);

      expect(res.status.calledWith(401)).to.be.true;
      expect(compareStub.called).to.be.false;
    });

    it('should return 403 for a deactivated account', async () => {
      sinon.stub(User, 'findOne').resolves({ ...dbUser, isActive: false });
      sinon.stub(bcrypt, 'compare').resolves(true);
      const res = mockRes();

      await loginUser(req(), res);

      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.firstCall.args[0].message).to.match(/deactivated/i);
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(User, 'findOne').throws(new Error('DB Error'));
      const res = mockRes();

      await loginUser(req(), res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
  });

  describe('getProfile', () => {
    it('should return the name, email and role of the logged-in user', async () => {
      sinon.stub(User, 'findById').resolves({
        name: 'Sam', email: 'sam@test.com', role: 'reporter', password: 'HASHED',
      });
      const res = mockRes();

      await getProfile({ user: { id: 'u1' } }, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ name: 'Sam', email: 'sam@test.com', role: 'reporter' })).to.be.true;
    });

    it('should return 404 if the user does not exist', async () => {
      sinon.stub(User, 'findById').resolves(null);
      const res = mockRes();

      await getProfile({ user: { id: 'u1' } }, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: 'User not found' })).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(User, 'findById').throws(new Error('DB Error'));
      const res = mockRes();

      await getProfile({ user: { id: 'u1' } }, res);

      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  describe('updateUserProfile', () => {
    it('should update only the fields that were sent and save', async () => {
      const user = {
        id: 'u1', name: 'Old', email: 'old@test.com',
        save: sinon.stub().resolvesThis(),
      };
      sinon.stub(User, 'findById').resolves(user);
      const res = mockRes();

      await updateUserProfile({ user: { id: 'u1' }, body: { name: 'New Name' } }, res);

      expect(user.name).to.equal('New Name');
      expect(user.email).to.equal('old@test.com'); // unchanged
      expect(user.save.calledOnce).to.be.true;
      const body = res.json.firstCall.args[0];
      expect(body).to.include({ id: 'u1', name: 'New Name', email: 'old@test.com' });
      expect(body.token).to.be.a('string');
    });

    it('should return 404 if the user does not exist', async () => {
      sinon.stub(User, 'findById').resolves(null);
      const res = mockRes();

      await updateUserProfile({ user: { id: 'u1' }, body: {} }, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: 'User not found' })).to.be.true;
    });

    it('should return 500 if saving fails', async () => {
      sinon.stub(User, 'findById').resolves({
        name: 'Old', email: 'old@test.com', save: sinon.stub().rejects(new Error('DB Error')),
      });
      const res = mockRes();

      await updateUserProfile({ user: { id: 'u1' }, body: { name: 'X' } }, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
  });
});
