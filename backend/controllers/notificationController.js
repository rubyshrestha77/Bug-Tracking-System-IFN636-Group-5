const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.user.id })
            .populate('bug', 'title')
            .sort({ createdAt: -1 })
            .limit(50);

        res.status(200).json(notifications);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const notification = await Notification.findById(req.params.id);

        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }

        if (notification.recipient.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Not permitted' });
        }

        notification.isRead = true;
        await notification.save();

        res.status(200).json(notification);
    } catch (error) {
        if (error.name === 'CastError') {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.status(500).json({ message: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.user.id, isRead: false },
            { isRead: true }
        );

        res.status(200).json({ message: 'All notifications marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };