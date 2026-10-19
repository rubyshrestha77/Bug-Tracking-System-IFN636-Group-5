const { expect } = require('chai');
const sinon = require('sinon');
const Subject = require('../domain/events/Subject');
const Observer = require('../domain/events/Observer');
const { BugEventPublisher, EVENTS } = require('../domain/events/BugEventPublisher');

// A fake observer whose update() is a Sinon spy, so we can see what it received
const makeObserver = () => ({ update: sinon.spy() });

describe('BTSG-37: Subject / Observer (FR-04, NFR-02)', () => {

  afterEach(() => sinon.restore());

  it('should deliver an event to a subscriber', async () => {
    const subject = new Subject();
    const observer = makeObserver();
    subject.subscribe(observer);

    await subject.notify({ type: 'X' });

    expect(observer.update.calledOnceWith({ type: 'X' })).to.be.true;
  });

  it('should deliver the same event to every subscriber', async () => {
    const subject = new Subject();
    const a = makeObserver();
    const b = makeObserver();
    subject.subscribe(a);
    subject.subscribe(b);

    await subject.notify({ type: 'X' });

    expect(a.update.calledOnce).to.be.true;
    expect(b.update.calledOnce).to.be.true;
  });

  it('should ignore a duplicate subscription', async () => {
    const subject = new Subject();
    const observer = makeObserver();
    subject.subscribe(observer);
    subject.subscribe(observer);

    await subject.notify({});

    expect(observer.update.calledOnce).to.be.true;
  });

  it('should stop delivering after unsubscribe', async () => {
    const subject = new Subject();
    const observer = makeObserver();
    subject.subscribe(observer);
    subject.unsubscribe(observer);

    await subject.notify({});

    expect(observer.update.called).to.be.false;
  });

  it('should not let a failing observer block the others', async () => {
    const errorStub = sinon.stub(console, 'error'); // hide the expected error message
    const subject = new Subject();
    const broken = { update: sinon.stub().throws(new Error('boom')) };
    const healthy = makeObserver();
    subject.subscribe(broken);
    subject.subscribe(healthy);

    await subject.notify({});

    expect(healthy.update.calledOnce).to.be.true;
    expect(errorStub.calledOnce).to.be.true;
  });

  it('should reject an object without update()', () => {
    expect(() => new Subject().subscribe({})).to.throw('Observer must implement update(event)');
  });

  it('should force the base Observer.update() to be overridden', () => {
    expect(() => new Observer().update({})).to.throw('must implement update(event)');
  });
});

describe('BTSG-37: BugEventPublisher', () => {

  it('should publish a frozen event with a timestamp', async () => {
    const publisher = new BugEventPublisher();
    const observer = makeObserver();
    publisher.subscribe(observer);

    await publisher.publish(EVENTS.RESOLVE, {
      actorId: 'actor1',
      bugId: 'bug1',
      bugTitle: 'Login fails',
      previousStatus: 'In Progress',
      newStatus: 'Resolved',
    });

    const event = observer.update.firstCall.args[0];
    expect(event.type).to.equal('RESOLVE');
    expect(event.previousStatus).to.equal('In Progress');
    expect(event.newStatus).to.equal('Resolved');
    expect(event.timestamp).to.be.instanceOf(Date);
    expect(Object.isFrozen(event)).to.equal(true);
  });

  it('should define all six transition event types', () => {
    expect(Object.keys(EVENTS)).to.have.members([
      'ASSIGN', 'START', 'RESOLVE', 'VERIFY', 'REOPEN', 'DELETE',
    ]);
  });

  it('should reject an unknown event type', () => {
    expect(() => new BugEventPublisher().publish('NOPE', {})).to.throw('Unknown bug event type');
  });

  it('should give every observer of the same event one shared timestamp', async () => {
    const publisher = new BugEventPublisher();
    const a = makeObserver();
    const b = makeObserver();
    publisher.subscribe(a);
    publisher.subscribe(b);

    await publisher.publish(EVENTS.ASSIGN, { actorId: 'x', bugId: 'y' });

    expect(a.update.firstCall.args[0].timestamp).to.equal(b.update.firstCall.args[0].timestamp);
  });
});
