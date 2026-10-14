const express = require('express');
const { requireAuth } = require('../middleware/authMiddleware');
const {
    getNotifications,
    markAsRead,
    markAllAsRead
} = require('../controllers/notificationController');

const router = express.Router();

router.get('/', requireAuth, getNotifications);
router.patch('/read-all', requireAuth, markAllAsRead);
router.patch('/:id/read', requireAuth, markAsRead);

module.exports = router;