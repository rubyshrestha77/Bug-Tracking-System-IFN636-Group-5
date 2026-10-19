const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const { getActivityLog } = require('../controllers/activityLogController');
const { mockRes, fakeQuery } = require('./helpers/testUtils');

describe('ActivityLogController', () => {
  let findStub;
  let query;
  let countStub;

  beforeEach(() => {
    query = fakeQuery([{ actionType: 'ASSIGN' }]);
    findStub = sinon.stub(ActivityLog, 'find').returns(query);
    countStub = sinon.stub(ActivityLog, 'countDocuments').resolves(45);
  });

  afterEach(() => sinon.restore());

  describe('getActivityLog - success', () => {
    it('should return the first page of 20 entries by default, newest first', async () => {
      const res = mockRes();

      await getActivityLog({ query: {} }, res);

      expect(findStub.calledOnceWith({})).to.be.true;
      expect(query.sort.calledWith({ timestamp: -1, _id: -1 })).to.be.true;
      expect(query.skip.calledWith(0)).to.be.true;
      expect(query.limit.calledWith(20)).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({
        entries: [{ actionType: 'ASSIGN' }], page: 1, limit: 20, total: 45, totalPages: 3,
      })).to.be.true;
    });

    it('should skip the right number of entries for page 3 with limit 10', async () => {
      const res = mockRes();

      await getActivityLog({ query: { page: '3', limit: '10' } }, res);

      expect(query.skip.calledWith(20)).to.be.true;
      expect(query.limit.calledWith(10)).to.be.true;
    });

    it('should cap the limit at 100', async () => {
      const res = mockRes();

      await getActivityLog({ query: { limit: '500' } }, res);

      expect(query.limit.calledWith(100)).to.be.true;
      expect(res.json.firstCall.args[0].limit).to.equal(100);
    });

    it('should filter by actor, upper-cased actionType and date range', async () => {
      const actor = new mongoose.Types.ObjectId().toString();
      const res = mockRes();

      await getActivityLog({
        query: { actor, actionType: 'assign', dateFrom: '2026-10-01', dateTo: '2026-10-31' },
      }, res);

      const filter = findStub.firstCall.args[0];
      expect(filter.actor).to.equal(actor);
      expect(filter.actionType).to.equal('ASSIGN');
      expect(filter.timestamp.$gte).to.deep.equal(new Date('2026-10-01T00:00:00.000Z'));
      expect(filter.timestamp.$lte).to.deep.equal(new Date('2026-10-31T23:59:59.999Z'));
      expect(countStub.calledOnceWith(filter)).to.be.true;
    });
  });

  describe('getActivityLog - validation (400)', () => {
    const expect400 = async (queryString, messagePart) => {
      const res = mockRes();
      await getActivityLog({ query: queryString }, res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.firstCall.args[0].message).to.contain(messagePart);
      expect(findStub.called).to.be.false; // bad input never reaches the database
    };

    it('should reject an invalid actor id', () => expect400({ actor: 'abc' }, 'actor must be a valid user id'));
    it('should reject an unknown actionType', () => expect400({ actionType: 'EXPLODE' }, 'actionType must be one of'));
    it('should reject a malformed dateFrom', () => expect400({ dateFrom: '01/10/2026' }, 'dateFrom must be a date'));
    it('should reject an impossible dateTo', () => expect400({ dateTo: '2026-13-45' }, 'dateTo must be a date'));
    it('should reject dateFrom after dateTo', () =>
      expect400({ dateFrom: '2026-11-01', dateTo: '2026-10-01' }, 'dateFrom must not be after dateTo'));
    it('should reject page 0', () => expect400({ page: '0' }, 'page must be a positive integer'));
    it('should reject a non-numeric limit', () => expect400({ limit: 'many' }, 'limit must be a positive integer'));
  });

  describe('getActivityLog - errors', () => {
    it('should return 500 if the database throws', async () => {
      findStub.throws(new Error('DB Error'));
      const res = mockRes();

      await getActivityLog({ query: {} }, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
  });
});
