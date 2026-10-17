const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const Bug = require('../models/Bug');
const { publisher, EVENTS } = require('../domain/events/BugEventPublisher');
const {
  createBug, getBugs, getBugById, assignBug, startWork,
  resolveBug, verifyBug, reopenBug, deleteBug, buildBugFilter,
} = require('../controllers/bugController');
const { mockRes, fakeQuery } = require('./helpers/testUtils');

const oid = () => new mongoose.Types.ObjectId();

// A fake Bug document. save()/deleteOne() are stubs so no database is touched.
const makeBug = (overrides = {}) => ({
  _id: oid(),
  title: 'Login fails',
  status: 'New',
  reporter: oid(),
  assignee: null,
  save: sinon.stub().resolves(),
  deleteOne: sinon.stub().resolves(),
  ...overrides,
});

// Bug.findById is called twice by the transition handlers:
// 1st call loads the bug, 2nd call re-loads it with populate().
const stubFindByIdTwice = (bug, updated = { populated: true }) => {
  const stub = sinon.stub(Bug, 'findById');
  stub.onFirstCall().resolves(bug);
  stub.onSecondCall().returns(fakeQuery(updated));
  return stub;
};

describe('BugController', () => {
  let publishStub;

  beforeEach(() => { publishStub = sinon.stub(publisher, 'publish').resolves(); });
  afterEach(() => sinon.restore());

  // createBug
  describe('createBug', () => {
    const validBody = {
      title: 'Crash on save', description: 'App crashes', stepsToReproduce: '1. Click save', severity: 'Major',
    };

    ['title', 'description', 'stepsToReproduce'].forEach((field) => {
      it(`should return 400 if ${field} is missing`, async () => {
        const req = { user: { id: oid() }, body: { ...validBody, [field]: '   ' } };
        const res = mockRes();

        await createBug(req, res);

        expect(res.status.calledWith(400)).to.be.true;
      });
    });

    it('should return 400 for an invalid severity', async () => {
      const req = { user: { id: oid() }, body: { ...validBody, severity: 'Huge' } };
      const res = mockRes();

      await createBug(req, res);

      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'Valid severity is required' })).to.be.true;
    });

    it('should create a bug with the logged-in user as reporter', async () => {
      const req = { user: { id: oid() }, body: validBody };
      const created = { _id: oid(), ...validBody, reporter: req.user.id };
      const createStub = sinon.stub(Bug, 'create').resolves(created);
      const res = mockRes();

      await createBug(req, res);

      expect(createStub.calledOnceWith({ ...validBody, reporter: req.user.id })).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledWith(created)).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(Bug, 'create').throws(new Error('DB Error'));
      const res = mockRes();

      await createBug({ user: { id: oid() }, body: validBody }, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
  });

  //  buildBugFilter
  describe('buildBugFilter', () => {
    it('should return an empty filter when no query is given', () => {
      expect(buildBugFilter({}, 'u1')).to.deep.equal({});
    });

    it('should copy status, severity and priority', () => {
      const filter = buildBugFilter({ status: 'New', severity: 'Critical', priority: 'High' }, 'u1');
      expect(filter).to.deep.equal({ status: 'New', severity: 'Critical', priority: 'High' });
    });

    it('should filter by assignee only when assignedToMe is "true"', () => {
      expect(buildBugFilter({ assignedToMe: 'true' }, 'u1')).to.deep.equal({ assignee: 'u1' });
      expect(buildBugFilter({ assignedToMe: 'false' }, 'u1')).to.deep.equal({});
    });
  });

  //  getBugs
  describe('getBugs', () => {
    it('should return bugs using the filter built from the query', async () => {
      const bugs = [{ title: 'A' }, { title: 'B' }];
      const query = fakeQuery(bugs);
      const findStub = sinon.stub(Bug, 'find').returns(query);
      const req = { user: { id: 'u1' }, query: { status: 'New' } };
      const res = mockRes();

      await getBugs(req, res);

      expect(findStub.calledOnceWith({ status: 'New' })).to.be.true;
      expect(query.sort.calledWith({ createdAt: -1 })).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(bugs)).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(Bug, 'find').throws(new Error('DB Error'));
      const res = mockRes();

      await getBugs({ user: { id: 'u1' }, query: {} }, res);

      expect(res.status.calledWith(500)).to.be.true;
      expect(res.json.calledWithMatch({ message: 'DB Error' })).to.be.true;
    });
  });

  //  getBugById
  describe('getBugById', () => {
    it('should return the bug when found', async () => {
      const bug = { title: 'A' };
      sinon.stub(Bug, 'findById').returns(fakeQuery(bug));
      const res = mockRes();

      await getBugById({ params: { id: 'x' } }, res);

      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(bug)).to.be.true;
    });

    it('should return 404 if the bug is not found', async () => {
      sinon.stub(Bug, 'findById').returns(fakeQuery(null));
      const res = mockRes();

      await getBugById({ params: { id: 'x' } }, res);

      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledWith({ message: 'Bug not found' })).to.be.true;
    });

    it('should return 404 on a malformed id (CastError)', async () => {
      const err = Object.assign(new Error('Cast failed'), { name: 'CastError' });
      sinon.stub(Bug, 'findById').returns(fakeQuery(null, err));
      const res = mockRes();

      await getBugById({ params: { id: 'not-an-id' } }, res);

      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 500 on any other error', async () => {
      sinon.stub(Bug, 'findById').returns(fakeQuery(null, new Error('DB Error')));
      const res = mockRes();

      await getBugById({ params: { id: 'x' } }, res);

      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  //  assignBug
  describe('assignBug', () => {
    const dev = () => ({ id: oid(), role: 'developer' });

    it('should return 400 if priority is invalid', async () => {
      const res = mockRes();
      await assignBug({ params: { id: 'x' }, body: { priority: 'Urgent' }, user: dev() }, res);
      expect(res.status.calledWith(400)).to.be.true;
    });

    it('should return 404 if the bug does not exist', async () => {
      sinon.stub(Bug, 'findById').resolves(null);
      const res = mockRes();
      await assignBug({ params: { id: 'x' }, body: { priority: 'High' }, user: dev() }, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 422 if the bug is not in the New state', async () => {
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'Assigned' }));
      const res = mockRes();
      await assignBug({ params: { id: 'x' }, body: { priority: 'High' }, user: dev() }, res);
      expect(res.status.calledWith(422)).to.be.true;
    });

    it('should return 403 if the user is not a developer', async () => {
      sinon.stub(Bug, 'findById').resolves(makeBug());
      const res = mockRes();
      const user = { id: oid(), role: 'reporter' };
      await assignBug({ params: { id: 'x' }, body: { priority: 'High' }, user }, res);
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledWith({ message: 'Only a developer can assign this bug' })).to.be.true;
    });

    it('should assign the bug to the developer, set priority and publish ASSIGN', async () => {
      const bug = makeBug();
      const updated = { populated: true };
      stubFindByIdTwice(bug, updated);
      const req = { params: { id: 'x' }, body: { priority: 'High' }, user: dev() };
      const res = mockRes();

      await assignBug(req, res);

      expect(bug.status).to.equal('Assigned');
      expect(bug.priority).to.equal('High');
      expect(bug.assignee).to.equal(req.user.id);
      expect(bug.save.calledOnce).to.be.true;
      expect(publishStub.calledOnce).to.be.true;
      expect(publishStub.firstCall.args[0]).to.equal(EVENTS.ASSIGN);
      expect(publishStub.firstCall.args[1]).to.include({ previousStatus: 'New', newStatus: 'Assigned' });
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith(updated)).to.be.true;
    });

    it('should return 500 if saving fails', async () => {
      sinon.stub(Bug, 'findById').resolves(makeBug({ save: sinon.stub().rejects(new Error('DB Error')) }));
      const res = mockRes();
      await assignBug({ params: { id: 'x' }, body: { priority: 'Low' }, user: dev() }, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });

  //  startWork
  describe('startWork', () => {
    it('should return 404 if the bug does not exist', async () => {
      sinon.stub(Bug, 'findById').resolves(null);
      const res = mockRes();
      await startWork({ params: { id: 'x' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 403 if the user is not the assigned developer', async () => {
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'Assigned', assignee: oid() }));
      const res = mockRes();
      await startWork({ params: { id: 'x' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(403)).to.be.true;
    });

    it('should return 422 if the bug has not been assigned yet', async () => {
      const me = oid();
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'New', assignee: me }));
      const res = mockRes();
      await startWork({ params: { id: 'x' }, user: { id: me } }, res);
      expect(res.status.calledWith(422)).to.be.true;
    });

    it('should move Assigned -> In Progress and publish START', async () => {
      const me = oid();
      const bug = makeBug({ status: 'Assigned', assignee: me });
      stubFindByIdTwice(bug);
      const res = mockRes();

      await startWork({ params: { id: 'x' }, user: { id: me } }, res);

      expect(bug.status).to.equal('In Progress');
      expect(bug.save.calledOnce).to.be.true;
      expect(publishStub.firstCall.args[0]).to.equal(EVENTS.START);
      expect(res.status.calledWith(200)).to.be.true;
    });
  });

  //  resolveBug
  describe('resolveBug', () => {
    it('should return 400 if the resolution note is empty', async () => {
      const res = mockRes();
      await resolveBug({ params: { id: 'x' }, body: { resolutionNote: '  ' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'Resolution note is required' })).to.be.true;
    });

    it('should return 404 if the bug does not exist', async () => {
      sinon.stub(Bug, 'findById').resolves(null);
      const res = mockRes();
      await resolveBug({ params: { id: 'x' }, body: { resolutionNote: 'Fixed' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 403 if the user is not the assignee', async () => {
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'In Progress', assignee: oid() }));
      const res = mockRes();
      await resolveBug({ params: { id: 'x' }, body: { resolutionNote: 'Fixed' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(403)).to.be.true;
    });

    it('should return 422 if work has not started', async () => {
      const me = oid();
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'Assigned', assignee: me }));
      const res = mockRes();
      await resolveBug({ params: { id: 'x' }, body: { resolutionNote: 'Fixed' }, user: { id: me } }, res);
      expect(res.status.calledWith(422)).to.be.true;
    });

    it('should move In Progress -> Resolved, store the note and publish RESOLVE', async () => {
      const me = oid();
      const bug = makeBug({ status: 'In Progress', assignee: me });
      stubFindByIdTwice(bug);
      const res = mockRes();

      await resolveBug({ params: { id: 'x' }, body: { resolutionNote: 'Null check added' }, user: { id: me } }, res);

      expect(bug.status).to.equal('Resolved');
      expect(bug.resolutionNote).to.equal('Null check added');
      expect(bug.resolvedAt).to.be.instanceOf(Date);
      expect(publishStub.firstCall.args[0]).to.equal(EVENTS.RESOLVE);
      expect(res.status.calledWith(200)).to.be.true;
    });
  });

  //  verifyBug
  describe('verifyBug', () => {
    it('should return 404 if the bug does not exist', async () => {
      sinon.stub(Bug, 'findById').resolves(null);
      const res = mockRes();
      await verifyBug({ params: { id: 'x' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 403 if the user is not the reporter', async () => {
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'Resolved' }));
      const res = mockRes();
      await verifyBug({ params: { id: 'x' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(403)).to.be.true;
    });

    it('should return 422 if the bug is not Resolved', async () => {
      const me = oid();
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'In Progress', reporter: me }));
      const res = mockRes();
      await verifyBug({ params: { id: 'x' }, user: { id: me } }, res);
      expect(res.status.calledWith(422)).to.be.true;
    });

    it('should move Resolved -> Closed and publish VERIFY', async () => {
      const me = oid();
      const bug = makeBug({ status: 'Resolved', reporter: me });
      stubFindByIdTwice(bug);
      const res = mockRes();

      await verifyBug({ params: { id: 'x' }, user: { id: me } }, res);

      expect(bug.status).to.equal('Closed');
      expect(bug.verifiedAt).to.be.instanceOf(Date);
      expect(publishStub.firstCall.args[0]).to.equal(EVENTS.VERIFY);
      expect(res.status.calledWith(200)).to.be.true;
    });
  });

  //  reopenBug
  describe('reopenBug', () => {
    it('should return 400 if the reason is empty', async () => {
      const res = mockRes();
      await reopenBug({ params: { id: 'x' }, body: {}, user: { id: oid() } }, res);
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledWith({ message: 'Reason for reopening is required' })).to.be.true;
    });

    it('should return 403 if the user is not the reporter', async () => {
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'Resolved' }));
      const res = mockRes();
      await reopenBug({ params: { id: 'x' }, body: { reopenReason: 'Still broken' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(403)).to.be.true;
    });

    it('should return 422 if the bug is already Closed', async () => {
      const me = oid();
      sinon.stub(Bug, 'findById').resolves(makeBug({ status: 'Closed', reporter: me }));
      const res = mockRes();
      await reopenBug({ params: { id: 'x' }, body: { reopenReason: 'Still broken' }, user: { id: me } }, res);
      expect(res.status.calledWith(422)).to.be.true;
      expect(res.json.calledWith({ message: 'This bug is closed and can no longer be changed' })).to.be.true;
    });

    it('should move Resolved -> Reopened, store the reason and publish REOPEN', async () => {
      const me = oid();
      const bug = makeBug({ status: 'Resolved', reporter: me });
      stubFindByIdTwice(bug);
      const res = mockRes();

      await reopenBug({ params: { id: 'x' }, body: { reopenReason: 'Still broken' }, user: { id: me } }, res);

      expect(bug.status).to.equal('Reopened');
      expect(bug.reopenReason).to.equal('Still broken');
      expect(publishStub.firstCall.args[0]).to.equal(EVENTS.REOPEN);
      expect(res.status.calledWith(200)).to.be.true;
    });
  });

  //  deleteBug
  describe('deleteBug', () => {
    it('should return 404 if the bug does not exist', async () => {
      sinon.stub(Bug, 'findById').resolves(null);
      const res = mockRes();
      await deleteBug({ params: { id: 'x' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(404)).to.be.true;
    });

    it('should return 403 if the user is not the reporter', async () => {
      sinon.stub(Bug, 'findById').resolves(makeBug());
      const res = mockRes();
      await deleteBug({ params: { id: 'x' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(403)).to.be.true;
    });

    it('should return 422 once work has begun on the bug', async () => {
      const me = oid();
      const bug = makeBug({ status: 'In Progress', reporter: me });
      sinon.stub(Bug, 'findById').resolves(bug);
      const res = mockRes();

      await deleteBug({ params: { id: 'x' }, user: { id: me } }, res);

      expect(res.status.calledWith(422)).to.be.true;
      expect(res.json.firstCall.args[0].message).to.match(/work has already begun/);
      expect(bug.deleteOne.called).to.be.false;
    });

    it('should delete a New bug owned by the reporter and publish DELETE', async () => {
      const me = oid();
      const bug = makeBug({ status: 'New', reporter: me });
      sinon.stub(Bug, 'findById').resolves(bug);
      const res = mockRes();

      await deleteBug({ params: { id: 'x' }, user: { id: me } }, res);

      expect(bug.deleteOne.calledOnce).to.be.true;
      expect(publishStub.firstCall.args[0]).to.equal(EVENTS.DELETE);
      expect(publishStub.firstCall.args[1]).to.include({ previousStatus: 'New', newStatus: 'Deleted' });
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledWith({ message: 'Bug deleted' })).to.be.true;
    });

    it('should return 500 if the database throws', async () => {
      sinon.stub(Bug, 'findById').throws(new Error('DB Error'));
      const res = mockRes();
      await deleteBug({ params: { id: 'x' }, user: { id: oid() } }, res);
      expect(res.status.calledWith(500)).to.be.true;
    });
  });
});
