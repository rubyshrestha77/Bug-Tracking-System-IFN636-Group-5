const express = require('express');
const { requireAuth, requireRole } = require('../middleware/authMiddleware');
const { createBug, getBugs, getBugById, assignBug, startWork, resolveBug, verifyBug, reopenBug, deleteBug } = require('../controllers/bugController');
const router = express.Router();

router.post('/', requireAuth, requireRole('reporter'), createBug);
router.get('/', requireAuth, getBugs);
router.get('/:id', requireAuth, getBugById);
router.patch('/:id/assign', requireAuth, requireRole('developer'), assignBug);
router.patch('/:id/start', requireAuth, requireRole('developer'), startWork);
router.patch('/:id/resolve', requireAuth, requireRole('developer'), resolveBug);
router.patch('/:id/verify', requireAuth, requireRole('reporter'), verifyBug);
router.patch('/:id/reopen', requireAuth, requireRole('reporter'), reopenBug);
router.delete('/:id', requireAuth, requireRole('reporter'), deleteBug);

module.exports = router;