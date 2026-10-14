const express = require('express');
const { requireAuth, requirePermission } = require('../middleware/authMiddleware');
const P = require('../roles/permissions');
const { createBug, getBugs, getBugById, assignBug, startWork, resolveBug, verifyBug, reopenBug, deleteBug } = require('../controllers/bugController');
const router = express.Router();

router.post('/', requireAuth, requirePermission(P.BUG_REPORT), createBug);
router.get('/', requireAuth, requirePermission(P.BUG_VIEW), getBugs);
router.get('/:id', requireAuth, requirePermission(P.BUG_VIEW), getBugById);
router.patch('/:id/assign', requireAuth, requirePermission(P.BUG_ASSIGN), assignBug);
router.patch('/:id/start', requireAuth, requirePermission(P.BUG_START), startWork);
router.patch('/:id/resolve', requireAuth, requirePermission(P.BUG_RESOLVE), resolveBug);
router.patch('/:id/verify', requireAuth, requirePermission(P.BUG_VERIFY), verifyBug);
router.patch('/:id/reopen', requireAuth, requirePermission(P.BUG_REOPEN), reopenBug);
router.delete('/:id', requireAuth, requirePermission(P.BUG_DELETE), deleteBug);

module.exports = router;