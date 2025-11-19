// src/routes/comments.js - FIXED VERSION
import express from 'express';
import {
  createComment,
  updateComment,
  deleteComment,
  getPostComments,
  getComment
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js'; // REMOVE commentOwnership import

const router = express.Router();

// Public routes
router.get('/post/:postId', getPostComments);

// Protected routes - REMOVE commentOwnership middleware
router.post('/', authenticate, createComment);
router.get('/:commentId', getComment); // This can be public
router.put('/:commentId', authenticate, updateComment); // Remove commentOwnership
router.delete('/:commentId', authenticate, deleteComment); // Remove commentOwnership

export default router;