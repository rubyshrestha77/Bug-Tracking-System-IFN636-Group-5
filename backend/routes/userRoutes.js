const router = require('express').Router();
const { requireAuth } = require('../middleware/authMiddleware');
const requirePermission = require('../middleware/requirePermission');
const P = require('../roles/permissions');
const { listUsers, setUserStatus } = require('../controllers/userController');

router.get('/', requireAuth, requirePermission(P.USERS_VIEW), listUsers);
router.patch('/:id/status', requireAuth, requirePermission(P.USERS_MANAGE), setUserStatus);
module.exports = router;