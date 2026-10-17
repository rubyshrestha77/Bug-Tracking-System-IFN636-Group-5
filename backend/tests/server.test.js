const chai = require('chai');
const chaiHttp = require('chai-http');
const sinon = require('sinon');
const mongoose = require('mongoose');
const app = require('../server');
const User = require('../models/User');
const { expect } = chai;

chai.use(chaiHttp);

describe('Server (Express app)', () => {

  afterEach(() => sinon.restore());

  it('should load without connecting to a real database', () => {
    // 0 = disconnected: server.js only connects when run directly (node server.js)
    expect(mongoose.connection.readyState).to.equal(0);
  });

  it('should be running and answer unknown routes with 404', async () => {
    const res = await chai.request(app).get('/api/does-not-exist');

    expect(res).to.have.status(404);
  });

  it('should be running and protect bug routes (401 without a token)', async () => {
    const res = await chai.request(app).get('/api/bugs');

    expect(res).to.have.status(401);
    expect(res.body.message).to.equal('Not authorized, no token');
  });

  it('should protect user routes (401 without a token)', async () => {
    const res = await chai.request(app).get('/api/users');

    expect(res).to.have.status(401);
  });

  it('should protect notification, report and activity-log routes', async () => {
    for (const path of ['/api/notifications', '/api/reports?format=csv', '/api/activity-log']) {
      const res = await chai.request(app).get(path);
      expect(res, path).to.have.status(401);
    }
  });

  it('should parse JSON bodies and validate registration (400, no database needed)', async () => {
    const res = await chai.request(app).post('/api/auth/register').send({ name: 'Sam' });

    expect(res).to.have.status(400);
    expect(res.body.message).to.equal('All fields are required');
  });

  it('should return 401 for an unknown email, using a stubbed database lookup', async () => {
    const findStub = sinon.stub(User, 'findOne').resolves(null);

    const res = await chai.request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@test.com', password: 'password123' });

    expect(findStub.calledOnceWith({ email: 'nobody@test.com' })).to.be.true;
    expect(res).to.have.status(401);
    expect(res.body.message).to.equal('Invalid email or password');
  });

  it('should return 500 when the database fails during login', async () => {
    sinon.stub(User, 'findOne').throws(new Error('DB Error'));

    const res = await chai.request(app)
      .post('/api/auth/login')
      .send({ email: 'sam@test.com', password: 'password123' });

    expect(res).to.have.status(500);
    expect(res.body.message).to.equal('DB Error');
  });
});
