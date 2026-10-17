const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const connectDB = require('../config/db');

describe('Database connection (config/db.js)', () => {
  const OLD_URI = process.env.MONGO_URI;

  beforeEach(() => { process.env.MONGO_URI = 'mongodb://test-host/test-db'; });
  afterEach(() => {
    process.env.MONGO_URI = OLD_URI;
    sinon.restore();
  });

  it('should connect using the MONGO_URI from the environment', async () => {
    const connectStub = sinon.stub(mongoose, 'connect').resolves();
    sinon.stub(console, 'log');

    await connectDB();

    expect(connectStub.calledOnceWith('mongodb://test-host/test-db')).to.be.true;
  });

  it('should log a success message when connected', async () => {
    sinon.stub(mongoose, 'connect').resolves();
    const logStub = sinon.stub(console, 'log');

    await connectDB();

    expect(logStub.calledWith('MongoDB connected successfully')).to.be.true;
  });

  it('should log the error and exit with code 1 if the connection fails', async () => {
    sinon.stub(mongoose, 'connect').rejects(new Error('bad auth'));
    const errorStub = sinon.stub(console, 'error');
    const exitStub = sinon.stub(process, 'exit');

    await connectDB();

    expect(errorStub.calledWith('MongoDB connection error:', 'bad auth')).to.be.true;
    expect(exitStub.calledOnceWith(1)).to.be.true;
  });
});
