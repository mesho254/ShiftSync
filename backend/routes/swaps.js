import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { validate, schemas } from '../middlewares/validation.js';
import * as swapsController from '../controllers/swapsController.js';

const router = express.Router();

router.get('/', authenticate, swapsController.getSwapRequests);
router.post('/', authenticate, validate(schemas.createSwap), swapsController.createSwapRequest);
router.post('/:id/accept', authenticate, swapsController.acceptSwap);
router.post('/:id/manager-approve', authenticate, swapsController.managerApprove);
router.post('/:id/cancel', authenticate, swapsController.cancelSwap);
router.post('/:id/pickup', authenticate, swapsController.pickupShift);

export default router;

