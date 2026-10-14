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

const immutable = function (next) {
  next(new Error('ActivityLog entries are immutable'));
};
['updateMany', 'replaceOne', 'findOneAndUpdate', 'findOneAndReplace',
 'findOneAndDelete', 'deleteMany'].forEach((op) => activityLogSchema.pre(op, immutable));
activityLogSchema.pre('updateOne', { document: true, query: true }, immutable);
activityLogSchema.pre('deleteOne', { document: true, query: true }, immutable);
activityLogSchema.pre('save', function (next) {
  return this.isNew ? next() : immutable(next);
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);