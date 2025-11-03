// src/routes/auth.js
import express from 'express';
import { 
  register, 
  login, 
  getMe,
  refreshToken,
  logout 
} from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);

// Protected routes
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

// src/routes/auth.js - add this route
router.post('/logout-all', authenticate, logoutAllDevices);

export default router;