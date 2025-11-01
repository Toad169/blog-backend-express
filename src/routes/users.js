// src/routes/users.js
import express from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  deleteUser,
  getUserById
} from '../controllers/userController.js';
import { 
  authenticate, 
  authorize, 
  selfOrAdmin 
} from '../middleware/auth.js';

const router = express.Router();

// User profile routes (authenticated users only)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.delete('/profile', authenticate, deleteAccount);

// Admin only routes
router.get('/:userId', authenticate, authorize(['admin', 'mod']), getUserById);
router.delete('/:userId', authenticate, authorize(['admin']), deleteUser);

export default router;