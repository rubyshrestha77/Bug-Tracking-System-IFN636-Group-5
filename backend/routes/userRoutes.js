const express = require('express');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const P = require('../roles/permissions');
const { listUsers, setUserStatus } = require('../controllers/userController');
const router = express.Router();

router.get('/', requireAuth, requirePermission(P.USERS_VIEW), listUsers);
router.patch('/:id/status', requireAuth, requirePermission(P.USERS_MANAGE), setUserStatus);

module.exports = router;
