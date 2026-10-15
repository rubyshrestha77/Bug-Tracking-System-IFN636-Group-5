const mongoose = require('mongoose');
const ActivityLog = require('../models/ActivityLog');
const { EVENTS } = require('../domain/events/BugEventPublisher');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const parseDate = (value, endOfDay) => {
  if (!DATE_ONLY.test(value)) return null;
  const date = new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const parsePositiveInt = (value, fallback) => {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value) || Number(value) < 1) return null;
  return Number(value);
};

const getActivityLog = async (req, res) => {
  try {
    const { actor, actionType, dateFrom, dateTo } = req.query;
    const filter = {};

    if (actor !== undefined) {
      if (!mongoose.isValidObjectId(actor)) {
        return res.status(400).json({ message: 'actor must be a valid user id' });
      }
      filter.actor = actor;
    }

    if (actionType !== undefined) {
      const type = String(actionType).toUpperCase();
      if (!Object.values(EVENTS).includes(type)) {
        return res.status(400).json({
          message: `actionType must be one of: ${Object.values(EVENTS).join(', ')}`,
        });
      }
      filter.actionType = type;
    }

    let from;
    let to;
    if (dateFrom !== undefined) {
      from = parseDate(dateFrom, false);
      if (!from) return res.status(400).json({ message: 'dateFrom must be a date in YYYY-MM-DD format' });
    }
    if (dateTo !== undefined) {
      to = parseDate(dateTo, true);
      if (!to) return res.status(400).json({ message: 'dateTo must be a date in YYYY-MM-DD format' });
    }
    if (from && to && from > to) {
      return res.status(400).json({ message: 'dateFrom must not be after dateTo' });
    }
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = from;
      if (to) filter.timestamp.$lte = to;
    }

    const page = parsePositiveInt(req.query.page, 1);
    if (page === null) return res.status(400).json({ message: 'page must be a positive integer' });
    let limit = parsePositiveInt(req.query.limit, DEFAULT_LIMIT);
    if (limit === null) return res.status(400).json({ message: 'limit must be a positive integer' });
    limit = Math.min(limit, MAX_LIMIT);

    const [entries, total] = await Promise.all([
      ActivityLog.find(filter)
        .populate('actor', 'name')          
        .sort({ timestamp: -1, _id: -1 })   
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(filter),
    ]);

    res.status(200).json({
      entries,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getActivityLog };