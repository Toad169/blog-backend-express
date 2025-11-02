// src/middleware/auth.js
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import prisma from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { 
        id: true, 
        username: true, 
        email: true, 
        role: true,
        emailVerified: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    // Check if user account is active (you can add more checks here)
    if (!user.emailVerified) {
      // Optional: you might want to allow access but restrict some actions
      // return res.status(401).json({ error: 'Please verify your email address.' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired.' });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed.' });
  }
};

// In src/middleware/auth.js, update the optionalAuth function:
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      
      try {
        const decoded = jwt.verify(token, config.jwtSecret);
        
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { 
            id: true, 
            username: true, 
            email: true, 
            role: true,
            emailVerified: true
          }
        });

        if (user) {
          req.user = user;
        }
      } catch (error) {
        // If token is invalid, just continue without user
        console.log('Optional auth: Invalid token, continuing without user');
      }
    }
    
    next();
  } catch (error) {
    // For optional auth, we just continue without setting req.user
    next();
  }
};

export const authorize = (roles = []) => {
  // Convert single role to array for flexibility
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (roles.length > 0 && !roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};

export const requireEmailVerification = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  if (!req.user.emailVerified) {
    return res.status(403).json({ 
      error: 'Please verify your email address to perform this action.' 
    });
  }

  next();
};

export const selfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const resourceUserId = req.params.userId || req.body.userId;
  
  if (!resourceUserId) {
    return res.status(400).json({ error: 'User ID is required.' });
  }

  if (req.user.id !== resourceUserId && !['admin', 'mod'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Access denied. You can only modify your own resources.' 
    });
  }

  next();
};

// Middleware to check if user owns the post or is admin/moderator
export const postOwnership = async (req, res, next) => {
  try {
    const { slug, postId } = req.params;
    
    let post;
    
    if (slug) {
      post = await prisma.post.findUnique({
        where: { slug },
        include: { user: true }
      });
    } else if (postId) {
      post = await prisma.post.findUnique({
        where: { id: postId },
        include: { user: true }
      });
    }

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    // Store post in request for later use
    req.post = post;

    if (post.userId !== req.user.id && !['admin', 'mod'].includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. You can only modify your own posts.' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Middleware to check if user owns the comment or is admin/moderator
export const commentOwnership = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    
    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found.' });
    }

    // Store comment in request for later use
    req.comment = comment;

    if (comment.userId !== req.user.id && !['admin', 'mod'].includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. You can only modify your own comments.' 
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};