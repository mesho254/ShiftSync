import express from 'express';
import { validate, schemas } from '../middlewares/validation.js';
import * as authController from '../controllers/authController.js';

const router = express.Router();

router.post('/register', validate(schemas.register), authController.register);
router.post('/login', validate(schemas.login), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);

export default router;
