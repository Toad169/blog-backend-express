// src/routes/users.js
import express from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  deleteUser
} from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.delete('/profile', authenticate, deleteAccount);
router.delete('/:userId', authenticate, authorize(['admin']), deleteUser);

export default router;