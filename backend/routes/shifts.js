import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validation.js';
import * as shiftsController from '../controllers/shiftsController.js';

const router = express.Router();

router.get('/', authenticate, shiftsController.getShifts);
router.post('/', authenticate, authorize('admin', 'manager'), validate(schemas.createShift), shiftsController.createShift);
router.post('/:id/assign', authenticate, authorize('admin', 'manager'), validate(schemas.assignShift), shiftsController.assignStaff);
router.post('/:id/unassign', authenticate, authorize('admin', 'manager'), shiftsController.unassignStaff);
router.post('/publish', authenticate, authorize('admin', 'manager'), shiftsController.publishSchedule);
router.put('/:id', authenticate, authorize('admin', 'manager'), shiftsController.updateShift);
router.delete('/:id', authenticate, authorize('admin', 'manager'), shiftsController.deleteShift);
router.post('/unpublish', authenticate, authorize('admin', 'manager'), shiftsController.unpublishSchedule);

export default router;

