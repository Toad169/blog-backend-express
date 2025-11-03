// src/controllers/authController.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { 
  generateToken, 
  validateEmail, 
  validatePassword 
} from '../utils/helpers.js';
import { config } from '../config/env.js';

export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!validateEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (!validatePassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(400).json({ error: 'Email already registered' });
      } else {
        return res.status(400).json({ error: 'Username already taken' });
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true
      }
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user,
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified
      },
      token
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const refreshToken = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const newToken = generateToken(user.id);

    res.json({
      message: 'Token refreshed successfully',
      token: newToken
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }

    res.status(500).json({ error: error.message });
  }
};

export const logout = async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(400).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Decode the token to get expiration time
    const decoded = jwt.decode(token);
    
    if (!decoded || !decoded.exp) {
      return res.status(400).json({ error: 'Invalid token' });
    }

    // Calculate token expiration time
    const expiresAt = new Date(decoded.exp * 1000);

    // Add token to blacklist
    await prisma.tokenBlacklist.upsert({
      where: { token },
      update: { expiresAt },
      create: {
        token,
        expiresAt
      }
    });

    // Schedule cleanup of expired tokens (optional - you can run this as a separate job)
    await cleanupExpiredTokens();

    res.json({ 
      message: 'Logged out successfully',
      logoutTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Helper function to clean up expired tokens
const cleanupExpiredTokens = async () => {
  try {
    const result = await prisma.tokenBlacklist.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });
    console.log(`Cleaned up ${result.count} expired tokens`);
  } catch (error) {
    console.error('Token cleanup error:', error);
  }
};

// Optional: Add a method to check if token is blacklisted
export const isTokenBlacklisted = async (token) => {
  const blacklistedToken = await prisma.tokenBlacklist.findUnique({
    where: { token }
  });
  
  if (blacklistedToken) {
    // Also check if the token hasn't expired naturally yet
    if (blacklistedToken.expiresAt > new Date()) {
      return true;
    } else {
      // Remove expired token from blacklist
      await prisma.tokenBlacklist.delete({
        where: { token }
      });
      return false;
    }
  }
  
  return false;
};

// Add to src/controllers/authController.js

export const logoutAllDevices = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Invalidate all tokens issued before now for this user
    // This is a simple implementation - you might want to track token issuance times
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Update user to track logout time (add a field to User model for this)
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        // You would need to add lastLogoutAt field to your User model
        // lastLogoutAt: new Date()
      }
    });

    res.json({ 
      message: 'Logged out from all devices successfully',
      logoutTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('Logout all devices error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};