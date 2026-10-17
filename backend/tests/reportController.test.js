const { expect } = require('chai');
const sinon = require('sinon');
const Bug = require('../models/Bug');
const { generateReport } = require('../controllers/reportController');
const { mockRes, fakeQuery } = require('./helpers/testUtils');

// One valid bug, shaped like the populated documents the controller receives
const sampleBug = (overrides = {}) => ({
  _id: 'bug-1',
  title: 'Example bug',
  description: 'Example description',
  stepsToReproduce: 'Click Save',
  severity: 'Major',
  priority: 'High',
  status: 'Resolved',
  reporter: { name: 'Reporter' },
  assignee: { name: 'Assignee' },
  ...overrides,
});

describe('BTSG-19: report controller', () => {
  let req;
  let res;
  let findStub;

  beforeEach(() => {
    req = { query: {}, user: { id: 'test-user-123' } };
    res = mockRes();
    findStub = sinon.stub(Bug, 'find');
  });

  afterEach(() => sinon.restore());

  it('should return 400 for an unsupported format', async () => {
    req.query.format = 'pdf';

    await generateReport(req, res);

    expect(res.status.calledWith(400)).to.be.true;
    expect(res.json.calledWith({ message: 'Invalid report format. Use csv or json.' })).to.be.true;
    expect(findStub.called).to.be.false; // never touches the database
  });

  it('should return 400 when no format is given', async () => {
    await generateReport(req, res);

    expect(res.status.calledWith(400)).to.be.true;
    expect(findStub.called).to.be.false;
  });

  it('should set CSV download headers and return CSV content', async () => {
    req.query.format = 'csv';
    findStub.returns(fakeQuery([sampleBug()]));

    await generateReport(req, res);

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.setHeader.calledWith('Content-Type', 'text/csv; charset=utf-8')).to.be.true;
    expect(res.setHeader.calledWith(
      'Content-Disposition', 'attachment; filename="bugs-report.csv"'
    )).to.be.true;
    expect(res.send.firstCall.args[0]).to.include('Example bug');
  });

  it('should set JSON download headers and return valid JSON', async () => {
    req.query.format = 'json';
    findStub.returns(fakeQuery([sampleBug({ assignee: null })]));

    await generateReport(req, res);

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.setHeader.calledWith('Content-Type', 'application/json; charset=utf-8')).to.be.true;
    expect(res.setHeader.calledWith(
      'Content-Disposition', 'attachment; filename="bugs-report.json"'
    )).to.be.true;

    const parsed = JSON.parse(res.send.firstCall.args[0]);
    expect(parsed).to.have.lengthOf(1);
    expect(parsed[0].title).to.equal('Example bug');
  });

  it('should accept the format in upper case', async () => {
    req.query.format = 'CSV';
    findStub.returns(fakeQuery([]));

    await generateReport(req, res);

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.setHeader.calledWith('Content-Type', 'text/csv; charset=utf-8')).to.be.true;
  });

  it('should return a valid empty CSV (header only)', async () => {
    req.query.format = 'csv';
    findStub.returns(fakeQuery([]));

    await generateReport(req, res);

    const body = res.send.firstCall.args[0];
    expect(body.split('\r\n')).to.have.lengthOf(1);
    expect(body).to.include('title');
  });

  it('should return a valid empty JSON report', async () => {
    req.query.format = 'json';
    findStub.returns(fakeQuery([]));

    await generateReport(req, res);

    expect(JSON.parse(res.send.firstCall.args[0])).to.deep.equal([]);
  });

  it('should apply the query filters and the logged-in user to the database search', async () => {
    req.query = { format: 'json', status: 'New', assignedToMe: 'true' };
    findStub.returns(fakeQuery([]));

    await generateReport(req, res);

    expect(findStub.calledOnceWith({ status: 'New', assignee: 'test-user-123' })).to.be.true;
  });

  it('should return 500 if the database throws', async () => {
    req.query.format = 'csv';
    findStub.throws(new Error('DB Error'));
    sinon.stub(console, 'error'); // keep the test output clean

    await generateReport(req, res);

    expect(res.status.calledWith(500)).to.be.true;
    expect(res.json.calledWith({ message: 'Failed to generate report' })).to.be.true;
  });
});
