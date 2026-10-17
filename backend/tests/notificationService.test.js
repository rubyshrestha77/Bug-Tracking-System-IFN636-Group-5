const { expect } = require('chai');
const sinon = require('sinon');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const NotificationService = require('../domain/notifications/NotificationService');
const NotificationChannel = require('../domain/notifications/NotificationChannel');
const InAppChannel = require('../domain/notifications/InAppChannel');
const { EVENTS } = require('../domain/events/BugEventPublisher');

const oid = () => new mongoose.Types.ObjectId();

describe('NotificationService (Observer)', () => {
  let channel;
  let service;
  let event;

  beforeEach(() => {
    channel = { send: sinon.stub().resolves() };   // fake channel, nothing is saved
    service = new NotificationService(channel);
    event = {
      type: EVENTS.ASSIGN,
      actorId: oid(),            // the developer 
      bugId: oid(),
      bugTitle: 'Login fails',
      reporterId: oid(),
      assigneeId: oid(),
    };
  });

  afterEach(() => sinon.restore());

  it('should tell the reporter when a developer picks up the bug', async () => {
    await service.update({ ...event, type: EVENTS.ASSIGN });

    expect(channel.send.calledOnceWith(
      event.reporterId, '"Login fails" has been picked up by a developer', event.bugId
    )).to.be.true;
  });

  it('should tell the reporter when the bug is resolved', async () => {
    await service.update({ ...event, type: EVENTS.RESOLVE });

    expect(channel.send.calledOnceWith(
      event.reporterId, '"Login fails" has been resolved and is ready to verify', event.bugId
    )).to.be.true;
  });

  it('should tell the assignee when the bug is reopened', async () => {
    await service.update({ ...event, type: EVENTS.REOPEN });

    expect(channel.send.calledOnceWith(
      event.assigneeId, '"Login fails" has been reopened', event.bugId
    )).to.be.true;
  });

  it('should tell the assignee when the bug is verified and closed', async () => {
    await service.update({ ...event, type: EVENTS.VERIFY });

    expect(channel.send.calledOnceWith(
      event.assigneeId, '"Login fails" has been verified and closed', event.bugId
    )).to.be.true;
  });

  [EVENTS.START, EVENTS.DELETE].forEach((type) => {
    it(`should send nothing for ${type} (no notification rule)`, async () => {
      await service.update({ ...event, type });

      expect(channel.send.called).to.be.false;
    });
  });

  it('should not notify someone about their own action', async () => {
    const same = oid();

    await service.update({ ...event, type: EVENTS.RESOLVE, reporterId: same, actorId: same });

    expect(channel.send.called).to.be.false;
  });

  it('should recognise the same user even when ids are different objects', async () => {
    const hex = oid().toHexString();

    await service.update({
      ...event, type: EVENTS.RESOLVE,
      reporterId: new mongoose.Types.ObjectId(hex),
      actorId: new mongoose.Types.ObjectId(hex),
    });

    expect(channel.send.called).to.be.false;
  });

  it('should send nothing when there is nobody to notify', async () => {
    await service.update({ ...event, type: EVENTS.VERIFY, assigneeId: null });

    expect(channel.send.called).to.be.false;
  });

  it('should use the in-app channel by default', () => {
    expect(new NotificationService().channel).to.be.instanceOf(InAppChannel);
  });
});

describe('InAppChannel', () => {
  afterEach(() => sinon.restore());

  it('should save an in-app Notification for the recipient', async () => {
    const createStub = sinon.stub(Notification, 'create').resolves({ _id: 'n1' });
    const recipient = oid();
    const bug = oid();

    await new InAppChannel().send(recipient, 'Hello', bug);

    expect(createStub.calledOnceWith({ recipient, message: 'Hello', bug })).to.be.true;
  });
});

describe('NotificationChannel (abstract)', () => {
  it('should force subclasses to implement send()', async () => {
    let error;
    try { await new NotificationChannel().send('u1', 'msg', 'b1'); } catch (e) { error = e; }

    expect(error.message).to.equal('NotificationChannel must implement send()');
  });
});
