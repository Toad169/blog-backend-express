// src/routes/posts.js
import express from 'express';
import {
  createPost,
  getPosts,
  getPost,
  updatePost,
  deletePost
} from '../controllers/postController.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/', getPosts);
router.get('/:slug', getPost);
router.post('/', authenticate, upload.single('image'), createPost);
router.put('/:slug', authenticate, upload.single('image'), updatePost);
router.delete('/:slug', authenticate, deletePost);

export default router;