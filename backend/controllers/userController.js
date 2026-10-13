
const mongoose = require('mongoose');
const User = require('../models/User');
const { assertNotLastActiveAdmin } = require('../services/lastAdminGuard');
const { PUBLIC_USER_FIELDS } = require('../models/userFields');

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

const setUserStatus = async (req, res) => {
    const { id } = req.params;
    const { isActive } = req.body;

    if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({ message: 'Invalid user id' });
    }
    if (typeof isActive !== 'boolean') {
        return res.status(400).json({ message: 'isActive must be true or false' });
    }

    // Server-side twin of the UI rule: admins cannot lock themselves out
    if (isActive === false && req.user && String(req.user.id) === id) {
        return res.status(400).json({ message: 'You cannot deactivate your own account' });
    }

    try {
        const target = await User.findById(id);
        if (!target) {
            return res.status(404).json({ message: 'User not found' });
        }

        const activeAdmins = await User.countDocuments({ role: 'admin', isActive: { $ne: false } });
        assertNotLastActiveAdmin(target, activeAdmins, isActive);

        // Update only isActive (no full-document validation), so legacy users
        // that are missing other fields (e.g. role) can still be toggled.
        const updated = await User.findByIdAndUpdate(
            id,
            { isActive },
            { new: true, runValidators: false }
        ).select(PUBLIC_USER_FIELDS);
        res.status(200).json(updated);
    } catch (error) {
        res.status(error.status || 500).json({ message: error.message });
    }
};

module.exports = { listUsers, setUserStatus };