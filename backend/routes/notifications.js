const express = require('express');
const router = express.Router();
const db = require('../utils/dbStore');
const { authMiddleware } = require('../middleware/auth');

const wrapAsyncHandlers = (routerInstance) => {
  ['get', 'post', 'put', 'delete', 'patch'].forEach((method) => {
    const original = routerInstance[method].bind(routerInstance);
    routerInstance[method] = (path, ...handlers) =>
      original(
        path,
        ...handlers.map((handler) => (
          typeof handler === 'function'
            ? (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
            : handler
        ))
      );
  });
};

wrapAsyncHandlers(router);

// @route   GET /api/notifications
// @desc    Get user notifications
// @access  Private
router.get('/', authMiddleware, async (req, res) => {
  const notifications = await db.notifications.find({ recipient: req.user.id });
  // Sort by newest first
  notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(notifications);
});

// @route   PUT /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.put('/:id/read', authMiddleware, async (req, res) => {
  const notif = await db.notifications.findById(req.params.id);
  if (!notif) {
    return res.status(404).json({ message: 'Notification not found' });
  }

  if (notif.recipient !== req.user.id) {
    return res.status(403).json({ message: 'Unauthorized' });
  }

  const updated = await db.notifications.findByIdAndUpdate(req.params.id, { read: true });
  res.json(updated);
});

// @route   PUT /api/notifications/read-all
// @desc    Mark all user's notifications as read
// @access  Private
router.put('/read-all', authMiddleware, async (req, res) => {
  const userNotifs = await db.notifications.find({ recipient: req.user.id });
  await Promise.all(
    userNotifs
      .filter((notif) => !notif.read)
      .map((notif) => db.notifications.findByIdAndUpdate(notif.id, { read: true }))
  );
  res.json({ message: 'All notifications marked as read' });
});

module.exports = router;
