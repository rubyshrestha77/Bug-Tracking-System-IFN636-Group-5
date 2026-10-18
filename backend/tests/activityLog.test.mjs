import { expect } from 'chai';
import sinon from 'sinon';
import mongoose from 'mongoose';
import ActivityLog from '../models/ActivityLog.js';
import ActivityLogger from '../domain/events/ActivityLogger.js';
import registerObservers from '../domain/events/registerObservers.js';
import publisherModule from '../domain/events/BugEventPublisher.js';

const { publisher, BugEventPublisher, EVENTS } = publisherModule;
const oid = () => new mongoose.Types.ObjectId();

const eventData = (overrides = {}) => ({
  actorId: oid(), bugId: oid(), bugTitle: 'Login fails',
  previousStatus: 'New', newStatus: 'Assigned', ...overrides,
});

const loggerPublisher = () => {
  const p = new BugEventPublisher();
  p.subscribe(new ActivityLogger());
  return p;
};

describe('ActivityLogger Function Test (FR-04)', () => {
  afterEach(() => sinon.restore());

  Object.values(EVENTS).forEach((type) => {
    it(`should create exactly one entry for a ${type} transition`, async () => {
      const createStub = sinon.stub(ActivityLog, 'create').resolves({});

      await loggerPublisher().publish(type, eventData());

      expect(createStub.calledOnce).to.be.true;
      expect(createStub.firstCall.args[0].actionType).to.equal(type);
    });
  });

  it('should store actor, action, bug, previous status, new status and timestamp', async () => {
    const createStub = sinon.stub(ActivityLog, 'create').resolves({});
    const data = eventData();

    await loggerPublisher().publish(EVENTS.ASSIGN, data);

    const entry = createStub.firstCall.args[0];
    expect(entry.actor).to.equal(data.actorId);
    expect(entry.actionType).to.equal('ASSIGN');
    expect(entry.entityId).to.equal(data.bugId);
    expect(entry.previousValue).to.equal('New');
    expect(entry.newValue).to.equal('Assigned');
    expect(entry.timestamp).to.be.instanceOf(Date);
  });

  it('should keep a snapshot of the bug title for a deleted bug', async () => {
    const createStub = sinon.stub(ActivityLog, 'create').resolves({});

    await loggerPublisher().publish(
      EVENTS.DELETE, eventData({ bugTitle: 'Crash on save', newStatus: 'Deleted' })
    );

    expect(createStub.firstCall.args[0].bugTitle).to.equal('Crash on save');
  });

  it('should create no entry when no transition is published', () => {
    const createStub = sinon.stub(ActivityLog, 'create').resolves({});
    loggerPublisher();
    expect(createStub.called).to.be.false;
  });

  it('should not break the transition if the database write fails', async () => {
    sinon.stub(ActivityLog, 'create').rejects(new Error('DB Error'));
    const errorStub = sinon.stub(console, 'error');

    await loggerPublisher().publish(EVENTS.START, eventData()); // must not throw

    expect(errorStub.calledOnce).to.be.true;
    expect(errorStub.firstCall.args[1]).to.equal('DB Error');
  });
});

describe('registerObservers Function Test (FR-04)', () => {
  afterEach(() => sinon.restore());

  it('should never subscribe the logger more than once', () => {
    const subscribeStub = sinon.stub(publisher, 'subscribe');

    registerObservers();
    registerObservers();

    // 0 calls is also fine if the app already registered it earlier in this test run
    expect(subscribeStub.callCount).to.be.at.most(1);
    if (subscribeStub.callCount === 1) {
      expect(subscribeStub.firstCall.args[0]).to.be.instanceOf(ActivityLogger);
    }
  });
});

describe('ActivityLog Schema Test (FR-04)', () => {
  const valid = () => ({
    actor: oid(), actionType: 'ASSIGN', entityId: oid(), newValue: 'Assigned',
  });

  it('should accept a valid entry and default entityType and timestamp', () => {
    const entry = new ActivityLog(valid());
    expect(entry.validateSync()).to.be.undefined;
    expect(entry.entityType).to.equal('bug');
    expect(entry.timestamp).to.be.instanceOf(Date);
  });

  it('should require actor, action type and entity id', () => {
    const error = new ActivityLog({}).validateSync();
    expect(error.errors).to.have.all.keys('actor', 'actionType', 'entityId');
  });

  it('should reject an unknown action type', () => {
    const error = new ActivityLog({ ...valid(), actionType: 'HACK' }).validateSync();
    expect(error.errors.actionType).to.exist;
  });
});

describe('ActivityLog Immutability Test (NFR-02)', () => {
  const MESSAGE = 'ActivityLog entries are immutable';

  const existingEntry = () => {
    const entry = new ActivityLog({
      actor: oid(), actionType: 'ASSIGN', entityId: oid(), newValue: 'Assigned',
    });
    entry.isNew = false; // behave like an entry already stored
    return entry;
  };

  const refusal = async (action) => {
    try { await action(); } catch (error) { return error; }
    return null;
  };

  it('should refuse saving changes to an existing entry', async () => {
    const entry = existingEntry();
    entry.newValue = 'Hacked';
    const error = await refusal(() => entry.save());
    expect(error).to.be.instanceOf(Error);
    expect(error.message).to.equal(MESSAGE);
  });

  it('should refuse updateOne', async () => {
    const error = await refusal(() => ActivityLog.updateOne({ _id: oid() }, { newValue: 'x' }));
    expect(error.message).to.equal(MESSAGE);
  });

  it('should refuse findByIdAndUpdate', async () => {
    const error = await refusal(() => ActivityLog.findByIdAndUpdate(oid(), { newValue: 'x' }));
    expect(error.message).to.equal(MESSAGE);
  });

  it('should refuse replaceOne', async () => {
    const error = await refusal(() => ActivityLog.replaceOne({ _id: oid() }, { newValue: 'x' }));
    expect(error.message).to.equal(MESSAGE);
  });

  it('should refuse deleteOne on the model', async () => {
    const error = await refusal(() => ActivityLog.deleteOne({ _id: oid() }));
    expect(error.message).to.equal(MESSAGE);
  });

  it('should refuse deleting a document instance', async () => {
    const error = await refusal(() => existingEntry().deleteOne());
    expect(error.message).to.equal(MESSAGE);
  });

  it('should refuse deleteMany', async () => {
    const error = await refusal(() => ActivityLog.deleteMany({ actionType: 'ASSIGN' }));
    expect(error.message).to.equal(MESSAGE);
  });
});