// src/routes/votes.js
import express from 'express';
import {
  vote,
  getUserVote,
  getVoteCounts,
  getUserVotes
} from '../controllers/voteController.js';
import { authenticate, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/counts/:targetId/:targetType', getVoteCounts);

// Protected routes
router.post('/', authenticate, vote);
router.get('/user', authenticate, getUserVotes);
router.get('/:targetId/:targetType', optionalAuth, getUserVote);

export default router;