// src/routes/categories.js
import express from 'express';
import {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryPosts
} from '../controllers/categoriesController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', getCategories);
router.get('/:id', getCategory);
router.get('/:id/posts', getCategoryPosts);

// Protected routes (admin/moderator only)
router.post('/', authenticate, authorize(['admin', 'mod']), createCategory);
router.put('/:id', authenticate, authorize(['admin', 'mod']), updateCategory);
router.delete('/:id', authenticate, authorize(['admin', 'mod']), deleteCategory);

export default router;