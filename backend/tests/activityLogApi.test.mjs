import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';
import ActivityLog from '../models/ActivityLog.js';
import controllerModule from '../controllers/activityLogController.js';
import authModule from '../middleware/authMiddleware.js';
import P from '../roles/permissions.js';
import AdminRole from '../roles/AdminRole.js';
import DeveloperRole from '../roles/DeveloperRole.js';
import ReporterRole from '../roles/ReporterRole.js';

const { getActivityLog } = controllerModule;
const { requireAuth } = authModule;

const mockRes = () => ({ status: sinon.stub().returnsThis(), json: sinon.spy() });

const queryChain = (result) => {
  const query = {};
  ['populate', 'sort', 'skip', 'limit'].forEach((m) => { query[m] = sinon.stub().returns(query); });
  query.lean = sinon.stub().resolves(result);
  return query;
};

const setup = (entries = [], total = entries.length) => {
  const query = queryChain(entries);
  const findStub = sinon.stub(ActivityLog, 'find').returns(query);
  const countStub = sinon.stub(ActivityLog, 'countDocuments').resolves(total);
  return { query, findStub, countStub };
};

describe('GetActivityLog Function Test (FR-05)', () => {
  afterEach(() => sinon.restore());

  it('should return entries newest first with default pagination', async () => {
    const entries = [{ _id: 1 }, { _id: 2 }];
    const { query, findStub } = setup(entries, 2);
    const res = mockRes();

    await getActivityLog({ query: {} }, res);

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.json.firstCall.args[0]).to.deep.equal({
      entries, page: 1, limit: 20, total: 2, totalPages: 1,
    });
    expect(findStub.firstCall.args[0]).to.deep.equal({});
    expect(query.sort.calledWith({ timestamp: -1, _id: -1 })).to.be.true;
    expect(query.skip.calledWith(0)).to.be.true;
    expect(query.limit.calledWith(20)).to.be.true;
  });

  it('should return only the actor name, never other user fields', async () => {
    const { query } = setup();
    await getActivityLog({ query: {} }, mockRes());
    expect(query.populate.calledWith('actor', 'name')).to.be.true;
  });

  it('should filter by actor', async () => {
    const actor = new mongoose.Types.ObjectId().toString();
    const { findStub } = setup();

    await getActivityLog({ query: { actor } }, mockRes());

    expect(findStub.firstCall.args[0]).to.deep.equal({ actor });
  });

  it('should filter by action type, ignoring case', async () => {
    const { findStub } = setup();

    await getActivityLog({ query: { actionType: 'assign' } }, mockRes());

    expect(findStub.firstCall.args[0]).to.deep.equal({ actionType: 'ASSIGN' });
  });

  it('should filter by an inclusive UTC date range', async () => {
    const { findStub } = setup();

    await getActivityLog({ query: { dateFrom: '2026-10-01', dateTo: '2026-10-31' } }, mockRes());

    expect(findStub.firstCall.args[0].timestamp).to.deep.equal({
      $gte: new Date('2026-10-01T00:00:00.000Z'),
      $lte: new Date('2026-10-31T23:59:59.999Z'),
    });
  });

  it('should combine actor, action and date filters', async () => {
    const actor = new mongoose.Types.ObjectId().toString();
    const { findStub } = setup();

    await getActivityLog(
      { query: { actor, actionType: 'RESOLVE', dateFrom: '2026-10-01' } }, mockRes()
    );

    const filter = findStub.firstCall.args[0];
    expect(filter.actor).to.equal(actor);
    expect(filter.actionType).to.equal('RESOLVE');
    expect(filter.timestamp.$gte).to.deep.equal(new Date('2026-10-01T00:00:00.000Z'));
  });

  it('should paginate with page and limit', async () => {
    const { query } = setup([], 45);
    const res = mockRes();

    await getActivityLog({ query: { page: '3', limit: '10' } }, res);

    expect(query.skip.calledWith(20)).to.be.true;
    expect(query.limit.calledWith(10)).to.be.true;
    expect(res.json.firstCall.args[0].totalPages).to.equal(5);
  });

  it('should cap the page size at 100', async () => {
    const { query } = setup();
    const res = mockRes();

    await getActivityLog({ query: { limit: '500' } }, res);

    expect(query.limit.calledWith(100)).to.be.true;
    expect(res.json.firstCall.args[0].limit).to.equal(100);
  });

  it('should return 200 with an empty list when nothing matches', async () => {
    setup([], 0);
    const res = mockRes();

    await getActivityLog({ query: { actionType: 'DELETE' } }, res);

    expect(res.status.calledWith(200)).to.be.true;
    expect(res.json.firstCall.args[0]).to.deep.equal({
      entries: [], page: 1, limit: 20, total: 0, totalPages: 0,
    });
  });

  const invalid = {
    'an invalid actor id': { actor: 'not-an-id' },
    'an unknown action type': { actionType: 'HACK' },
    'a malformed dateFrom': { dateFrom: 'bad' },
    'an impossible dateTo': { dateTo: '2026-13-45' },
    'dateFrom after dateTo': { dateFrom: '2026-10-31', dateTo: '2026-10-01' },
    'page 0': { page: '0' },
    'a non-numeric limit': { limit: 'abc' },
  };

  Object.entries(invalid).forEach(([name, query]) => {
    it(`should return 400 for ${name}`, async () => {
      const { findStub } = setup();
      const res = mockRes();

      await getActivityLog({ query }, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWithMatch({ message: sinon.match.string })).to.be.true;
      expect(findStub.called).to.be.false;
    });
  });

  it('should return 500 if the database fails', async () => {
    sinon.stub(ActivityLog, 'find').throws(new Error('DB Error'));
    const res = mockRes();

    await getActivityLog({ query: {} }, res);

    expect(res.status.calledWith(500)).to.be.true;
    expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
  });
});

describe('ActivityLog Access Control Test (FR-05)', () => {
  it('should return 401 when there is no token', async () => {
    const res = mockRes();
    const next = sinon.spy();

    await requireAuth({ headers: {} }, res, next);

    expect(res.status.calledWith(401)).to.be.true;
    expect(res.json.calledWith({ message: 'Not authorized, no token' })).to.be.true;
    expect(next.called).to.be.false;
  });

  it('should grant the activity log permission to admin only', () => {
    expect(P.ACTIVITY_LOG_VIEW).to.equal('activity-log:view');
    expect(new AdminRole().hasPermission(P.ACTIVITY_LOG_VIEW)).to.be.true;
    expect(new DeveloperRole().hasPermission(P.ACTIVITY_LOG_VIEW)).to.be.false;
    expect(new ReporterRole().hasPermission(P.ACTIVITY_LOG_VIEW)).to.be.false;
  });
});