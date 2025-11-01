// src/routes/votes.js
import express from 'express';
import {
  vote,
  getUserVote,
  getVoteCounts
} from '../controllers/voteController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, vote);
router.get('/:targetId/:targetType', authenticate, getUserVote);
router.get('/counts/:targetId/:targetType', getVoteCounts);

export default router;