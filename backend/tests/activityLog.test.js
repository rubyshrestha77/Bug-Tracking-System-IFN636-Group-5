const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const ActivityLogger = require('../domain/events/ActivityLogger');
const { publisher, BugEventPublisher, EVENTS } = require('../domain/events/BugEventPublisher');

const oid = () => new mongoose.Types.ObjectId();

describe('BTSG-39: activity log', () => {

  afterEach(() => sinon.restore());

  describe('Activity log records transitions (FR-04)', () => {
    const eventData = (bugId = oid()) => ({
      actorId: oid(), bugId, bugTitle: 'Login fails', previousStatus: 'New', newStatus: 'Assigned',
    });

    // One test per event type: each must write exactly one log entry
    Object.values(EVENTS).forEach((type) => {
      it(`should write exactly one entry for ${type}`, async () => {
        const createStub = sinon.stub(ActivityLog, 'create').resolves();
        const bugPublisher = new BugEventPublisher();
        bugPublisher.subscribe(new ActivityLogger());

        await bugPublisher.publish(type, eventData());

        expect(createStub.calledOnce).to.be.true;
        expect(createStub.firstCall.args[0].actionType).to.equal(type);
      });
    });

    it('should store actor, action, bug, previous status, new status and timestamp', async () => {
      const createStub = sinon.stub(ActivityLog, 'create').resolves();
      const bugPublisher = new BugEventPublisher();
      bugPublisher.subscribe(new ActivityLogger());
      const data = eventData();

      await bugPublisher.publish(EVENTS.ASSIGN, data);

      const saved = createStub.firstCall.args[0];
      expect(saved.actor).to.equal(data.actorId);
      expect(saved.actionType).to.equal('ASSIGN');
      expect(saved.entityId).to.equal(data.bugId);
      expect(saved.bugTitle).to.equal('Login fails');
      expect(saved.previousValue).to.equal('New');
      expect(saved.newValue).to.equal('Assigned');
      expect(saved.timestamp).to.be.instanceOf(Date);
    });

    it('should not crash the publisher if the log cannot be written', async () => {
      sinon.stub(ActivityLog, 'create').rejects(new Error('DB Error'));
      sinon.stub(console, 'error'); // hide the expected error message
      const bugPublisher = new BugEventPublisher();
      bugPublisher.subscribe(new ActivityLogger());

      await bugPublisher.publish(EVENTS.START, eventData()); // must not throw
    });
  });

  describe('registerObservers', () => {
    // registerObservers keeps a module-level "registered" flag, so load a fresh copy
    const loadFresh = () => {
      const path = require.resolve('../domain/events/registerObservers');
      delete require.cache[path];
      return require(path);
    };

    it('should subscribe the ActivityLogger once, even if called twice', () => {
      const subscribeStub = sinon.stub(publisher, 'subscribe');
      const registerObservers = loadFresh();

      registerObservers();
      registerObservers();

      expect(subscribeStub.calledOnce).to.be.true;
      expect(subscribeStub.firstCall.args[0]).to.be.instanceOf(ActivityLogger);
    });
  });

  describe('ActivityLog is immutable (NFR-02)', () => {
    let entry;

    beforeEach(() => {
      // hydrate() builds an "already saved" document without touching the database
      entry = ActivityLog.hydrate({
        _id: oid(), actor: oid(), actionType: 'ASSIGN', entityId: oid(), newValue: 'Assigned',
      });
    });

    // Runs fn and returns the error it threw (or null)
    const attempt = async (fn) => {
      try { await fn(); } catch (error) { return error; }
      return null;
    };

    it('should reject saving changes to an existing entry', async () => {
      entry.newValue = 'Hacked';
      const error = await attempt(() => entry.save());
      expect(error.message).to.equal('ActivityLog entries are immutable');
    });

    it('should reject updateOne', async () => {
      const error = await attempt(() => ActivityLog.updateOne({ _id: entry._id }, { newValue: 'x' }));
      expect(error.message).to.equal('ActivityLog entries are immutable');
    });

    it('should reject findByIdAndUpdate', async () => {
      const error = await attempt(() => ActivityLog.findByIdAndUpdate(entry._id, { newValue: 'x' }));
      expect(error.message).to.equal('ActivityLog entries are immutable');
    });

    it('should reject deleteOne on the model', async () => {
      const error = await attempt(() => ActivityLog.deleteOne({ _id: entry._id }));
      expect(error.message).to.equal('ActivityLog entries are immutable');
    });

    it('should reject deleting a document instance', async () => {
      const error = await attempt(() => entry.deleteOne());
      expect(error.message).to.equal('ActivityLog entries are immutable');
    });

    it('should reject deleteMany', async () => {
      const error = await attempt(() => ActivityLog.deleteMany({ _id: entry._id }));
      expect(error.message).to.equal('ActivityLog entries are immutable');
    });
  });
});
