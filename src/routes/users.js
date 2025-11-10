// src/routes/users.js
import express from 'express';
import {
  getProfile,
  updateProfile,
  deleteAccount,
  deleteUser,
  getUserById,
  getAllUsers,
  verifyUser,
  changeUserRole
} from '../controllers/userController.js';
import { 
  authenticate, 
  authorize
} from '../middleware/auth.js';

const router = express.Router();

// User profile routes (authenticated users only)
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);
router.delete('/profile', authenticate, deleteAccount);

// Admin only routes
router.get('/', authenticate, authorize(['admin']), getAllUsers); // Get all users
router.get('/:userId', authenticate, authorize(['admin', 'mod']), getUserById);
router.put('/:userId/verify', authenticate, authorize(['admin']), verifyUser); // Verify user
router.put('/:userId/role', authenticate, authorize(['admin']), changeUserRole); // Change user role
router.delete('/:userId', authenticate, authorize(['admin']), deleteUser);

export default router;