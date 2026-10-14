const mongoose = require('mongoose');
const { EVENTS } = require('../domain/events/BugEventPublisher');

const activityLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actionType: { type: String, enum: Object.values(EVENTS), required: true, index: true },
    entityType: { type: String, default: 'bug' },
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    bugTitle: String,
    previousValue: String,
    newValue: String,
    timestamp: { type: Date, default: Date.now, index: true },
  },
  { versionKey: false }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);