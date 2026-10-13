const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    stepsToReproduce: { type: String, required: true },
    severity: { type: String, enum: ['Critical', 'Major', 'Minor', 'Trivial'], required: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low', null],  default: null },
    status: { type: String, enum: ['New', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Reopened'], default: 'New' },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolutionNote: { type: String, default: null },
    reopenReason: { type: String, default: null },
    resolvedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Bug', bugSchema);  