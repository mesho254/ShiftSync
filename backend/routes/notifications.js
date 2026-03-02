import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import * as notificationsController from '../controllers/notificationsController.js';

const router = express.Router();

router.get('/', authenticate, notificationsController.getUserNotifications);
router.post('/mark-read', authenticate, notificationsController.markAsRead);
router.post('/mark-all-read', authenticate, notificationsController.markAllAsRead);
router.put('/:id/read', authenticate, notificationsController.markNotificationAsRead);

export default router;
