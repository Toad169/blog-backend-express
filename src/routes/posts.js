// src/routes/posts.js
import express from 'express';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost,
  getUserPosts
} from '../controllers/postController.js';
import { 
  authenticate, 
  authorize, 
  optionalAuth,
  postOwnership 
} from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Public routes
router.get('/', optionalAuth, getPosts); // Optional auth for personalized content
router.get('/:slug', optionalAuth, getPost);
router.get('/user/:userId', getUserPosts);

// Protected routes
router.post('/', authenticate, upload.single('image'), createPost);
router.put('/:slug', authenticate, postOwnership, upload.single('image'), updatePost);
router.delete('/:slug', authenticate, postOwnership, deletePost);

export default router;