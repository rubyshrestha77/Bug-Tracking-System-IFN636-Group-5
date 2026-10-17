const Bug = require("../models/Bug");
const User = require("../models/User");
const { PUBLIC_USER_FIELDS } = require("../models/userFields");
const BugStateFactory = require("../domain/states/BugStateFactory");
const { EVENTS } = require("../domain/events/BugEventPublisher");
const publishTransition = require("../domain/events/publishTransition");

const createBug = async (req, res) => {
  const { title, description, stepsToReproduce, severity } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ message: "Title is required" });
  }
  if (!description || !description.trim()) {
    return res.status(400).json({ message: "Description is required" });
  }
  if (!stepsToReproduce || !stepsToReproduce.trim()) {
    return res.status(400).json({ message: "Steps to reproduce are required" });
  }
  if (!["Critical", "Major", "Minor", "Trivial"].includes(severity)) {
    return res.status(400).json({ message: "Valid severity is required" });
  }

  try {
    const bug = await Bug.create({
      title,
      description,
      stepsToReproduce,
      severity,
      reporter: req.user.id,
    });
    res.status(201).json(bug);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getBugs = async (req, res) => {
  try {
    const filter = buildBugFilter(req.query, req.user.id);

    const bugs = await Bug.find(filter)
      .populate("reporter", "name")
      .populate("assignee", "name")
      .sort({ createdAt: -1 });

    return res.status(200).json(bugs);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const buildBugFilter = (query, userId) => {
    const { status, severity, priority, assignedToMe } = query;
    const filter = {};

    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (priority) filter.priority = priority;

    if (assignedToMe === 'true') {
        filter.assignee = userId;
    }

    return filter;
};

const getBugById = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id)
      .populate("reporter", "name")
      .populate("assignee", "name");

    if (!bug) {
      return res.status(404).json({ message: "Bug not found" });
    }

    res.status(200).json(bug);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Bug not found" });
    }
    res.status(500).json({ message: error.message });
  }
};

const assignBug = async (req, res) => {
  const { priority } = req.body;

  if (!["High", "Medium", "Low"].includes(priority)) {
    return res.status(400).json({ message: "Priority is required" });
  }

  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const state = BugStateFactory.create(bug.status);

    if (!state.allowsTransitionTo("Assigned")) {
      return res
        .status(422)
        .json({ message: state.refusalMessage("Assigned") });
    }

    if (!state.isAuthorisedFor("Assigned", req.user, bug)) {
      return res
        .status(403)
        .json({ message: state.permissionMessage("Assigned") });
    }

    const previousStatus = bug.status;
    bug.priority = priority;
    bug.assignee = req.user.id;
    bug.status = "Assigned";
    await bug.save();
    await publishTransition(EVENTS.ASSIGN, {
      bug,
      previousStatus,
      actorId: req.user.id,
    });

    const updated = await Bug.findById(bug._id)
      .populate("reporter", "name")
      .populate("assignee", "name");

    res.status(200).json(updated);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Bug not found" });
    }
    res.status(500).json({ message: error.message });
  }
};

const startWork = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const state = BugStateFactory.create(bug.status);

    if (!state.isAuthorisedFor("In Progress", req.user, bug)) {
      return res
        .status(403)
        .json({ message: state.permissionMessage("In Progress") });
    }

    if (!state.allowsTransitionTo("In Progress")) {
      return res
        .status(422)
        .json({ message: state.refusalMessage("In Progress") });
    }

    const previousStatus = bug.status;
    bug.status = "In Progress";
    await bug.save();
    await publishTransition(EVENTS.START, {
      bug,
      previousStatus,
      actorId: req.user.id,
    });

    const updated = await Bug.findById(bug._id)
      .populate("reporter", "name")
      .populate("assignee", "name");

    res.status(200).json(updated);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Bug not found" });
    }
    res.status(500).json({ message: error.message });
  }
};

const resolveBug = async (req, res) => {
  const { resolutionNote } = req.body;

  if (!resolutionNote || !resolutionNote.trim()) {
    return res.status(400).json({ message: "Resolution note is required" });
  }

  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const state = BugStateFactory.create(bug.status);

    if (!state.isAuthorisedFor("Resolved", req.user, bug)) {
      return res
        .status(403)
        .json({ message: state.permissionMessage("Resolved") });
    }

    if (!state.allowsTransitionTo("Resolved")) {
      return res
        .status(422)
        .json({ message: state.refusalMessage("Resolved") });
    }

    const previousStatus = bug.status;
    bug.resolutionNote = resolutionNote;
    bug.resolvedAt = new Date();
    bug.status = "Resolved";
    await bug.save();
    await publishTransition(EVENTS.RESOLVE, {
      bug,
      previousStatus,
      actorId: req.user.id,
    });

    const updated = await Bug.findById(bug._id)
      .populate("reporter", "name")
      .populate("assignee", "name");

    res.status(200).json(updated);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Bug not found" });
    }
    res.status(500).json({ message: error.message });
  }
};

const verifyBug = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const state = BugStateFactory.create(bug.status);

    if (!state.isAuthorisedFor("Closed", req.user, bug)) {
      return res
        .status(403)
        .json({ message: state.permissionMessage("Closed") });
    }

    if (!state.allowsTransitionTo("Closed")) {
      return res.status(422).json({ message: state.refusalMessage("Closed") });
    }

    const previousStatus = bug.status;
    bug.verifiedAt = new Date();
    bug.status = "Closed";
    await bug.save();
    await publishTransition(EVENTS.VERIFY, {
      bug,
      previousStatus,
      actorId: req.user.id,
    });

    const updated = await Bug.findById(bug._id)
      .populate("reporter", "name")
      .populate("assignee", "name");

    res.status(200).json(updated);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Bug not found" });
    }
    res.status(500).json({ message: error.message });
  }
};

const reopenBug = async (req, res) => {
  const { reopenReason } = req.body;

  if (!reopenReason || !reopenReason.trim()) {
    return res
      .status(400)
      .json({ message: "Reason for reopening is required" });
  }

  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const state = BugStateFactory.create(bug.status);

    if (!state.isAuthorisedFor("Reopened", req.user, bug)) {
      return res
        .status(403)
        .json({ message: state.permissionMessage("Reopened") });
    }

    if (!state.allowsTransitionTo("Reopened")) {
      return res
        .status(422)
        .json({ message: state.refusalMessage("Reopened") });
    }

    const previousStatus = bug.status;
    bug.reopenReason = reopenReason;
    bug.status = "Reopened";
    await bug.save();
    await publishTransition(EVENTS.REOPEN, {
      bug,
      previousStatus,
      actorId: req.user.id,
    });

    const updated = await Bug.findById(bug._id)
      .populate("reporter", "name")
      .populate("assignee", "name");

    res.status(200).json(updated);
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Bug not found" });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteBug = async (req, res) => {
  try {
    const bug = await Bug.findById(req.params.id);

    if (!bug) {
      return res.status(404).json({ message: "Bug not found" });
    }

    const state = BugStateFactory.create(bug.status);

    if (!state.isAuthorisedFor("Deleted", req.user, bug)) {
      return res
        .status(403)
        .json({ message: state.permissionMessage("Deleted") });
    }

    if (!state.allowsTransitionTo("Deleted")) {
      return res.status(422).json({ message: state.refusalMessage("Deleted") });
    }

    const previousStatus = bug.status;
    await bug.deleteOne();
    await publishTransition(EVENTS.DELETE, {
      bug,
      previousStatus,
      actorId: req.user.id,
      newStatus: "Deleted",
    });
    res.status(200).json({ message: "Bug deleted" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(404).json({ message: "Bug not found" });
    }
    res.status(500).json({ message: error.message });
  }
};

const listUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select(PUBLIC_USER_FIELDS)
      .sort({ createdAt: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBug,
  getBugs,
  getBugById,
  assignBug,
  startWork,
  resolveBug,
  verifyBug,
  reopenBug,
  deleteBug,
  listUsers,
  buildBugFilter,
};
