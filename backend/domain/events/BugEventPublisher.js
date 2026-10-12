const Subject = require('./Subject');

const EVENTS = Object.freeze({
  ASSIGN: 'ASSIGN',
  START: 'START',
  RESOLVE: 'RESOLVE',
  VERIFY: 'VERIFY',
  REOPEN: 'REOPEN',
  DELETE: 'DELETE',
});

class BugEventPublisher extends Subject {
  publish(type, { actorId, bugId, bugTitle, reporterId, assigneeId, previousStatus, newStatus }) {
    if (!Object.values(EVENTS).includes(type)) {
      throw new Error(`Unknown bug event type: ${type}`);
    }
    return this.notify(
      Object.freeze({
        type,
        actorId,
        bugId,
        bugTitle,
        reporterId,
        assigneeId,
        previousStatus,
        newStatus,
        timestamp: new Date(),
      })
    );
  }
}

module.exports = { publisher: new BugEventPublisher(), BugEventPublisher, EVENTS };