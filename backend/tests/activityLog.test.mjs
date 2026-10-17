import 'dotenv/config';
import mongoose from 'mongoose';
import { expect } from 'chai';
import ActivityLog from '../models/ActivityLog.js';
import ActivityLogger from '../domain/events/ActivityLogger.js';
import registerObservers from '../domain/events/registerObservers.js';
import publisherModule from '../domain/events/BugEventPublisher.js';

const { publisher, BugEventPublisher, EVENTS } = publisherModule;
const oid = () => new mongoose.Types.ObjectId();

describe('BTSG-39: activity log (needs MONGO_URI_TEST)', function () {
  before(async function () {
    if (!process.env.MONGO_URI_TEST) return this.skip();
    await mongoose.connect(process.env.MONGO_URI_TEST);
  });

  after(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.collection('activitylogs').deleteMany({});
      await mongoose.disconnect();
    }
  });

  describe('Activity log records transitions (FR-04)', () => {
    const data = (bugId) => ({
      actorId: oid(), bugId, bugTitle: 'Login fails', previousStatus: 'New', newStatus: 'Assigned',
    });

    Object.values(EVENTS).forEach((type) => {
      it(`${type} produces exactly one entry`, async () => {
        const p = new BugEventPublisher();
        p.subscribe(new ActivityLogger());
        const bugId = oid();
        await p.publish(type, data(bugId));
        expect(await ActivityLog.countDocuments({ entityId: bugId })).to.equal(1);
      });
    });

    it('stores actor, action, bug, previous status, new status and timestamp', async () => {
      const p = new BugEventPublisher();
      p.subscribe(new ActivityLogger());
      const bugId = oid();
      const d = data(bugId);
      await p.publish(EVENTS.ASSIGN, d);
      const entry = await ActivityLog.findOne({ entityId: bugId });
      expect(String(entry.actor)).to.equal(String(d.actorId));
      expect(entry.actionType).to.equal('ASSIGN');
      expect(entry.previousValue).to.equal('New');
      expect(entry.newValue).to.equal('Assigned');
      expect(entry.timestamp).to.be.instanceOf(Date);
    });

    it('registering twice still produces one entry', async () => {
      registerObservers();
      registerObservers();
      const bugId = oid();
      await publisher.publish(EVENTS.START, data(bugId));
      expect(await ActivityLog.countDocuments({ entityId: bugId })).to.equal(1);
    });

    it('no entry exists for a transition that was never published', async () => {
      expect(await ActivityLog.countDocuments({ entityId: oid() })).to.equal(0);
    });
  });

  describe('ActivityLog is immutable (NFR-02)', () => {
    let entry;
    beforeEach(async () => {
      entry = await ActivityLog.create({
        actor: oid(), actionType: 'ASSIGN', entityId: oid(), newValue: 'Assigned',
      });
    });

    const attempt = async (fn) => {
      let error;
      try { await fn(); } catch (e) { error = e; }
      return error;
    };

    it('rejects saving changes to an existing entry', async () => {
      entry.newValue = 'Hacked';
      expect(await attempt(() => entry.save())).to.exist;
    });
    it('rejects updateOne', async () => {
      expect(await attempt(() => ActivityLog.updateOne({ _id: entry._id }, { newValue: 'x' }))).to.exist;
    });
    it('rejects findByIdAndUpdate', async () => {
      expect(await attempt(() => ActivityLog.findByIdAndUpdate(entry._id, { newValue: 'x' }))).to.exist;
    });
    it('rejects deleteOne on the model', async () => {
      expect(await attempt(() => ActivityLog.deleteOne({ _id: entry._id }))).to.exist;
    });
    it('rejects deleting a document instance', async () => {
      expect(await attempt(() => entry.deleteOne())).to.exist;
    });
    it('rejects deleteMany', async () => {
      expect(await attempt(() => ActivityLog.deleteMany({ _id: entry._id }))).to.exist;
    });
    it('leaves the entry unchanged after the refused attempts', async () => {
      const same = await ActivityLog.findById(entry._id);
      expect(same.newValue).to.equal('Assigned');
    });
  });
});