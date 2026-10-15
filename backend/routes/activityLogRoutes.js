const express = require('express');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const P = require('../roles/permissions');
const { getActivityLog } = require('../controllers/activityLogController');

const router = express.Router();

router.get('/', requireAuth, requirePermission(P.ACTIVITY_LOG_VIEW), getActivityLog);

module.exports = router;