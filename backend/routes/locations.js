import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as locationsController from '../controllers/locationsController.js';

const router = express.Router();

router.get('/', authenticate, locationsController.getAllLocations);
router.get('/:id', authenticate, locationsController.getLocationById);
router.post('/', authenticate, authorize('admin'), locationsController.createLocation);
router.put('/:id', authenticate, authorize('admin'), locationsController.updateLocation);
router.delete('/:id', authenticate, authorize('admin'), locationsController.deleteLocation);

export default router;
