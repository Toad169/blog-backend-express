// src/routes/comments.js
import express from 'express';
import {
  createComment,
  updateComment,
  deleteComment
} from '../controllers/commentController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, createComment);
router.put('/:commentId', authenticate, updateComment);
router.delete('/:commentId', authenticate, deleteComment);

export default router;