import express from 'express';
import { authenticate, authorize } from '../middlewares/auth.js';
import * as usersController from '../controllers/usersController.js';

const router = express.Router();

router.get('/', authenticate, authorize('admin', 'manager'), usersController.getAllUsers);
router.get('/staff-list', authenticate, usersController.getStaffList);
router.get('/:id', authenticate, usersController.getUserById);
router.put('/:id', authenticate, usersController.updateUser);
router.post('/:id/certify', authenticate, authorize('admin', 'manager'), usersController.certifyUser);

export default router;
