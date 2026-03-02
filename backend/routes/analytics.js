import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as analyticsController from '../controllers/analyticsController.js';

const router = express.Router();

router.get('/overtime', authenticate, authorize('admin', 'manager'), analyticsController.getOvertimeAnalytics);
router.get('/fairness', authenticate, authorize('admin', 'manager'), analyticsController.getFairnessAnalytics);
router.get('/on-duty-now', authenticate, authorize('admin', 'manager'), analyticsController.getOnDutyNow);

export default router;

