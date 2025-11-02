// src/routes/comments.js
import express from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  getPostComments
} from '../controllers/commentController.js';
import { 
  authenticate,
  commentOwnership 
} from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/post/:postId', getPostComments);

// Protected routes
router.post('/', authenticate, createComment);
router.put('/:commentId', authenticate, commentOwnership, updateComment);
router.delete('/:commentId', authenticate, commentOwnership, deleteComment);

export default router;