let expect;
before(async () => {
  ({ expect } = await import('chai'));
});

const Subject = require('../domain/events/Subject');
const Observer = require('../domain/events/Observer');
const { BugEventPublisher, EVENTS } = require('../domain/events/BugEventPublisher');

class Spy extends Observer {
  constructor() {
    super();
    this.events = [];
  }
  update(event) {
    this.events.push(event);
  }
}

class Broken extends Observer {
  update() {
    throw new Error('boom');
  }
}

describe('Subject / Observer (B1, NFR-02)', () => {
  it('delivers an event to a subscriber', async () => {
    const subject = new Subject();
    const spy = new Spy();
    subject.subscribe(spy);
    await subject.notify({ type: 'X' });
    expect(spy.events).to.have.length(1);
  });

  it('delivers the same event to every subscriber', async () => {
    const subject = new Subject();
    const a = new Spy();
    const b = new Spy();
    subject.subscribe(a);
    subject.subscribe(b);
    await subject.notify({ type: 'X' });
    expect(a.events).to.have.length(1);
    expect(b.events).to.have.length(1);
  });

  it('ignores duplicate subscription', async () => {
    const subject = new Subject();
    const spy = new Spy();
    subject.subscribe(spy);
    subject.subscribe(spy);
    await subject.notify({});
    expect(spy.events).to.have.length(1);
  });

  it('stops delivering after unsubscribe', async () => {
    const subject = new Subject();
    const spy = new Spy();
    subject.subscribe(spy);
    subject.unsubscribe(spy);
    await subject.notify({});
    expect(spy.events).to.have.length(0);
  });

  it('a failing observer does not block the others', async () => {
    const subject = new Subject();
    const spy = new Spy();
    subject.subscribe(new Broken());
    subject.subscribe(spy);
    await subject.notify({});
    expect(spy.events).to.have.length(1);
  });

  it('rejects an object without update()', () => {
    expect(() => new Subject().subscribe({})).to.throw();
  });

  it('base Observer.update() must be overridden', () => {
    expect(() => new Observer().update({})).to.throw();
  });
});

describe('BugEventPublisher (B1)', () => {
  it('publishes a frozen event with a timestamp', async () => {
    const publisher = new BugEventPublisher();
    const spy = new Spy();
    publisher.subscribe(spy);

    await publisher.publish(EVENTS.RESOLVE, {
      actorId: 'actor1',
      bugId: 'bug1',
      bugTitle: 'Login fails',
      previousStatus: 'In Progress',
      newStatus: 'Resolved',
    });

    const event = spy.events[0];
    expect(event.type).to.equal('RESOLVE');
    expect(event.previousStatus).to.equal('In Progress');
    expect(event.newStatus).to.equal('Resolved');
    expect(event.timestamp).to.be.instanceOf(Date);
    expect(Object.isFrozen(event)).to.equal(true);
  });

  it('defines all six transition event types', () => {
    expect(Object.keys(EVENTS)).to.have.members([
      'ASSIGN', 'START', 'RESOLVE', 'VERIFY', 'REOPEN', 'DELETE',
    ]);
  });

  it('rejects an unknown event type', () => {
    expect(() => new BugEventPublisher().publish('NOPE', {})).to.throw();
  });

  it('observers on the same event share one timestamp', async () => {
    const publisher = new BugEventPublisher();
    const a = new Spy();
    const b = new Spy();
    publisher.subscribe(a);
    publisher.subscribe(b);
    await publisher.publish(EVENTS.ASSIGN, { actorId: 'x', bugId: 'y' });
    expect(a.events[0].timestamp).to.equal(b.events[0].timestamp);
  });
});