import { expect } from 'chai';
import sinon from 'sinon';
import Subject from '../domain/events/Subject.js';
import Observer from '../domain/events/Observer.js';
import publisherModule from '../domain/events/BugEventPublisher.js';

const { BugEventPublisher, EVENTS } = publisherModule;

describe('Subscribe Function Test', () => {
  afterEach(() => sinon.restore());

  it('should deliver an event to a subscribed observer', async () => {
    const subject = new Subject();
    const observer = { update: sinon.spy() };
    const event = { type: 'X' };

    subject.subscribe(observer);
    await subject.notify(event);

    expect(observer.update.calledOnceWith(event)).to.be.true;
  });

  it('should ignore a duplicate subscription', async () => {
    const subject = new Subject();
    const observer = { update: sinon.spy() };

    subject.subscribe(observer);
    subject.subscribe(observer);
    await subject.notify({});

    expect(observer.update.calledOnce).to.be.true;
  });

  it('should throw if the observer has no update method', () => {
    expect(() => new Subject().subscribe({})).to.throw();
  });
});

describe('Unsubscribe Function Test', () => {
  it('should stop delivering events after unsubscribe', async () => {
    const subject = new Subject();
    const observer = { update: sinon.spy() };

    subject.subscribe(observer);
    subject.unsubscribe(observer);
    await subject.notify({});

    expect(observer.update.called).to.be.false;
  });
});

describe('Notify Function Test', () => {
  afterEach(() => sinon.restore());

  it('should deliver the same event to every observer', async () => {
    const subject = new Subject();
    const a = { update: sinon.spy() };
    const b = { update: sinon.spy() };
    const event = { type: 'X' };

    subject.subscribe(a);
    subject.subscribe(b);
    await subject.notify(event);

    expect(a.update.calledOnceWith(event)).to.be.true;
    expect(b.update.calledOnceWith(event)).to.be.true;
  });

  it('should not block other observers when one fails', async () => {
    const errorStub = sinon.stub(console, 'error');
    const subject = new Subject();
    const failing = { update: sinon.stub().rejects(new Error('boom')) };
    const working = { update: sinon.spy() };

    subject.subscribe(failing);
    subject.subscribe(working);
    await subject.notify({});

    expect(working.update.calledOnce).to.be.true;
    expect(errorStub.calledOnce).to.be.true;
  });
});

describe('Observer Base Class Test', () => {
  it('should throw if update is not overridden', () => {
    expect(() => new Observer().update({})).to.throw();
  });
});

describe('Publish Function Test', () => {
  const data = {
    actorId: 'actor1', bugId: 'bug1', bugTitle: 'Login fails',
    previousStatus: 'In Progress', newStatus: 'Resolved',
  };

  it('should publish a frozen event with a timestamp', async () => {
    const publisher = new BugEventPublisher();
    const observer = { update: sinon.spy() };
    publisher.subscribe(observer);

    await publisher.publish(EVENTS.RESOLVE, data);

    const event = observer.update.firstCall.args[0];
    expect(event.type).to.equal('RESOLVE');
    expect(event.previousStatus).to.equal('In Progress');
    expect(event.newStatus).to.equal('Resolved');
    expect(event.timestamp).to.be.instanceOf(Date);
    expect(Object.isFrozen(event)).to.be.true;
  });

  it('should define all six transition event types', () => {
    expect(Object.keys(EVENTS)).to.have.members([
      'ASSIGN', 'START', 'RESOLVE', 'VERIFY', 'REOPEN', 'DELETE',
    ]);
  });

  it('should throw for an unknown event type', () => {
    expect(() => new BugEventPublisher().publish('NOPE', {})).to.throw();
  });

  it('should give every observer the same timestamp', async () => {
    const publisher = new BugEventPublisher();
    const a = { update: sinon.spy() };
    const b = { update: sinon.spy() };
    publisher.subscribe(a);
    publisher.subscribe(b);

    await publisher.publish(EVENTS.ASSIGN, data);

    expect(a.update.firstCall.args[0].timestamp)
      .to.equal(b.update.firstCall.args[0].timestamp);
  });
});