const { publisher } = require('./BugEventPublisher');

function publishTransition(type, { bug, previousStatus, actorId, newStatus }) {
  return publisher.publish(type, {
    actorId,
    bugId: bug._id,
    bugTitle: bug.title,
    reporterId: bug.reporter,
    assigneeId: bug.assignee,
    previousStatus,
    newStatus: newStatus ?? bug.status,
  });
}
module.exports = publishTransition;