const Bug = require('../models/Bug');

const createBug = async (req, res) => {
    const { title, description, stepsToReproduce, severity } = req.body;

    if (!title || !title.trim()) {
        return res.status(400).json({ message: 'Title is required' });
    }
    if (!description || !description.trim()) {
        return res.status(400).json({ message: 'Description is required' });
    }
    if (!stepsToReproduce || !stepsToReproduce.trim()) {
        return res.status(400).json({ message: 'Steps to reproduce are required' });
    }
    if (!['Critical', 'Major', 'Minor', 'Trivial'].includes(severity)) {
        return res.status(400).json({ message: 'Valid severity is required' });
    }

    try {
        const bug = await Bug.create({
            title,
            description,
            stepsToReproduce,
            severity,
            reporter: req.user.id
        });
        res.status(201).json(bug);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBugs = async (req, res) => {
    try {
        const { status, severity, priority, assignedToMe } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (severity) filter.severity = severity;
        if (priority) filter.priority = priority;
        if (assignedToMe === 'true') filter.assignee = req.user.id;

        const bugs = await Bug.find(filter)
            .populate('reporter', 'name')
            .populate('assignee', 'name')
            .sort({ createdAt: -1 });

        res.status(200).json(bugs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getBugById = async (req, res) => {
    try {
        const bug = await Bug.findById(req.params.id)
            .populate('reporter', 'name')
            .populate('assignee', 'name');

        if (!bug) {
            return res.status(404).json({ message: 'Bug not found' });
        }

        res.status(200).json(bug);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Bug not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

const assignBug = async (req, res) => {
    const { priority } = req.body;

    if (!['High', 'Medium', 'Low'].includes(priority)) {
        return res.status(400).json({ message: 'Priority is required' });
    }

    try {
        const bug = await Bug.findById(req.params.id);

        if (!bug) {
            return res.status(404).json({ message: 'Bug not found' });
        }

        if (bug.status !== 'New') {
            return res.status(422).json({
                message: 'Only bugs with status New can be assigned'
            });
        }

        bug.priority = priority;
        bug.assignee = req.user.id;
        bug.status = 'Assigned';
        await bug.save();

        const updated = await Bug.findById(bug._id)
            .populate('reporter', 'name')
            .populate('assignee', 'name');

        res.status(200).json(updated);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Bug not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

const startWork = async (req, res) => {
    try {
        const bug = await Bug.findById(req.params.id);

        if (!bug) {
            return res.status(404).json({ message: 'Bug not found' });
        }

        if (!bug.assignee || bug.assignee.toString() !== req.user.id) {
            return res.status(403).json({
                message: 'Only the assigned developer can start work on this bug'
            });
        }

        if (bug.status !== 'Assigned' && bug.status !== 'Reopened') {
            return res.status(422).json({
                message: 'Only assigned or reopened bugs can be moved to In Progress'
            });
        }

        bug.status = 'In Progress';
        await bug.save();

        const updated = await Bug.findById(bug._id)
            .populate('reporter', 'name')
            .populate('assignee', 'name');

        res.status(200).json(updated);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Bug not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

const resolveBug = async (req, res) => {
    const { resolutionNote } = req.body;

    if (!resolutionNote || !resolutionNote.trim()) {
        return res.status(400).json({ message: 'Resolution note is required' });
    }

    try {
        const bug = await Bug.findById(req.params.id);

        if (!bug) {
            return res.status(404).json({ message: 'Bug not found' });
        }

        if (!bug.assignee || bug.assignee.toString() !== req.user.id) {
            return res.status(403).json({
                message: 'Only the assigned developer can resolve this bug'
            });
        }

        if (bug.status !== 'In Progress') {
            return res.status(422).json({
                message: 'Only bugs in progress can be resolved'
            });
        }

        bug.resolutionNote = resolutionNote;
        bug.resolvedAt = new Date();
        bug.status = 'Resolved';
        await bug.save();

        const updated = await Bug.findById(bug._id)
            .populate('reporter', 'name')
            .populate('assignee', 'name');

        res.status(200).json(updated);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Bug not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

const verifyBug = async (req, res) => {
    try {
        const bug = await Bug.findById(req.params.id);

        if (!bug) {
            return res.status(404).json({ message: 'Bug not found' });
        }

        if (bug.reporter.toString() !== req.user.id) {
            return res.status(403).json({
                message: 'Only the reporter who raised this bug can verify it'
            });
        }

        if (bug.status !== 'Resolved') {
            return res.status(422).json({
                message: 'Only resolved bugs can be verified'
            });
        }

        bug.verifiedAt = new Date();
        bug.status = 'Closed';
        await bug.save();

        const updated = await Bug.findById(bug._id)
            .populate('reporter', 'name')
            .populate('assignee', 'name');

        res.status(200).json(updated);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Bug not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

const reopenBug = async (req, res) => {
    const { reopenReason } = req.body;

    if (!reopenReason || !reopenReason.trim()) {
        return res.status(400).json({ message: 'Reason for reopening is required' });
    }

    try {
        const bug = await Bug.findById(req.params.id);

        if (!bug) {
            return res.status(404).json({ message: 'Bug not found' });
        }

        if (bug.reporter.toString() !== req.user.id) {
            return res.status(403).json({
                message: 'Only the reporter who raised this bug can reopen it'
            });
        }

        if (bug.status !== 'Resolved') {
            return res.status(422).json({
                message: 'Only resolved bugs can be reopened'
            });
        }

        bug.reopenReason = reopenReason;
        bug.status = 'Reopened';
        await bug.save();

        const updated = await Bug.findById(bug._id)
            .populate('reporter', 'name')
            .populate('assignee', 'name');

        res.status(200).json(updated);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Bug not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

const deleteBug = async (req, res) => {
    try {
        const bug = await Bug.findById(req.params.id);

        if (!bug) {
            return res.status(404).json({ message: 'Bug not found' });
        }

        if (bug.reporter.toString() !== req.user.id) {
            return res.status(403).json({
                message: 'Only the reporter who raised this bug can delete it'
            });
        }

        if (bug.status !== 'New') {
            return res.status(422).json({
                message: 'This bug cannot be deleted because work has already begun on it'
            });
        }

        await bug.deleteOne();
        res.status(200).json({ message: 'Bug deleted' });
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Bug not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createBug, getBugs, getBugById, assignBug, startWork, resolveBug, verifyBug, reopenBug, deleteBug};