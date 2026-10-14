const Observer = require('./Observer');
const ActivityLog = require('../../models/ActivityLog');

class ActivityLogger extends Observer {
  async update(event) {
    await ActivityLog.create({
      actor: event.actorId,
      actionType: event.type,
      entityId: event.bugId,
      bugTitle: event.bugTitle,
      previousValue: event.previousStatus,
      newValue: event.newStatus,
      timestamp: event.timestamp,
    });
  }
}
module.exports = ActivityLogger;