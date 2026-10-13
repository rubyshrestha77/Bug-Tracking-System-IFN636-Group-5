const mongoose = require('mongoose');
const User = require('../models/User');
const { PUBLIC_USER_FIELDS } = require('../models/userFields');
const { assertNotLastActiveAdmin } = require('../services/lastAdminGuard');

/**
 * Controller to list all registered users (excluding sensitive fields like passwords).
 */
exports.listUsers = async (req, res) => {
    try {
        const users = await User.find().select(PUBLIC_USER_FIELDS).sort({ createdAt: 1 });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching users', error: error.message });
    }
};

/**
 * Controller to update a user's active status (with protection against disabling the last active admin).
 */
exports.setUserStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid id' });
    }
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be boolean' });
    }

    try {
        const target = await User.findById(id);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }

        const activeAdmins = await User.countDocuments({ role: 'Admin', isActive: true });
        assertNotLastActiveAdmin(target, activeAdmins, isActive); // Guard check added in BTSG-8

        target.isActive = isActive;
        await target.save();

        const updatedUser = await User.findById(id).select(PUBLIC_USER_FIELDS);
        res.json(updatedUser);
    } catch (e) {
        return res.status(e.status || 500).json({ message: e.message });
    }
};