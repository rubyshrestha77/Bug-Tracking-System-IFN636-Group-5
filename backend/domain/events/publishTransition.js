const { publisher } = require('./BugEventPublisher');

function publishTransition(type, { bug, previousStatus, actorId, newStatus }) {
  return publisher.publish(type, {
    actorId,
    bugId: bug._id,
    bugTitle: bug.title,
    previousStatus,
    newStatus: newStatus ?? bug.status,
  });
}
module.exports = publishTransition;