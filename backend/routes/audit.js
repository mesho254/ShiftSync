import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as auditController from '../controllers/auditController.js';

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'manager'), auditController.getAuditLogs);
router.get('/shift/:shiftId', authenticate, authorize('admin', 'manager'), auditController.getShiftHistory);

export default router;

