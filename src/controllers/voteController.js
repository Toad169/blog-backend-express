// src/controllers/voteController.js - FINAL WORKING VERSION
import prisma from '../config/database.js';

export const vote = async (req, res) => {
  try {
    const { targetId, targetType, type } = req.body;

    console.log('=== VOTE REQUEST START ===');
    console.log('User:', req.user.id);
    console.log('Target:', targetId);
    console.log('Target Type:', targetType);
    console.log('Vote Type:', type);

    // Validate input
    if (!targetId || !targetType || !type) {
      console.log('Missing fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['post', 'comment'].includes(targetType)) {
      console.log('Invalid target type');
      return res.status(400).json({ error: 'Invalid target type' });
    }

    if (!['up', 'down'].includes(type)) {
      console.log('Invalid vote type');
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Check if target exists
    let targetExists = false;
    if (targetType === 'post') {
      const post = await prisma.post.findUnique({ where: { id: targetId } });
      targetExists = !!post;
      console.log('Post exists:', targetExists, post?.title);
    } else {
      const comment = await prisma.comments.findUnique({ 
        where: { id: targetId },
        include: { user: true }
      });
      targetExists = !!comment;
      console.log('Comment exists:', targetExists, comment?.content);
    }

    if (!targetExists) {
      console.log('Target not found');
      return res.status(404).json({ error: `${targetType} not found` });
    }

    // Check for existing vote
    const existingVote = await prisma.vote.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: req.user.id,
          targetId,
          targetType
        }
      }
    });

    console.log('Existing vote:', existingVote);

    let result;
    
    if (existingVote) {
      if (existingVote.type === type) {
        // Remove vote if same type clicked again
        console.log('Removing vote');
        await prisma.vote.delete({
          where: {
            userId_targetId_targetType: {
              userId: req.user.id,
              targetId,
              targetType
            }
          }
        });
        result = { action: 'removed', vote: null };
      } else {
        // Update vote if different type
        console.log('Updating vote');
        const vote = await prisma.vote.update({
          where: {
            userId_targetId_targetType: {
              userId: req.user.id,
              targetId,
              targetType
            }
          },
          data: { type }
        });
        result = { action: 'updated', vote };
      }
    } else {
      // Create new vote
      console.log('Creating new vote');
      const voteData = {
        userId: req.user.id,
        targetId,
        targetType,
        type
      };
      
      // Add relation field based on target type
      if (targetType === 'post') {
        voteData.postId = targetId;
      } else {
        voteData.commentId = targetId;
      }

      const vote = await prisma.vote.create({ data: voteData });
      result = { action: 'created', vote };
    }

    // Get updated counts
    const upvotes = await prisma.vote.count({
      where: { targetId, targetType, type: 'up' }
    });

    const downvotes = await prisma.vote.count({
      where: { targetId, targetType, type: 'down' }
    });

    const score = upvotes - downvotes;

    console.log('Final counts - Upvotes:', upvotes, 'Downvotes:', downvotes, 'Score:', score);
    console.log('=== VOTE REQUEST END ===');

    res.json({
      success: true,
      ...result,
      upvotes,
      downvotes,
      score
    });

  } catch (error) {
    console.error('=== VOTE ERROR ===', error);
    
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Vote already exists' });
    }
    
    res.status(500).json({ error: 'Internal server error: ' + error.message });
  }
};

export const getUserVote = async (req, res) => {
  try {
    const { targetId, targetType } = req.params;
    const userId = req.user?.id;

    console.log('Get user vote:', { targetId, targetType, userId });

    if (!userId) {
      return res.json({ success: true, vote: null });
    }

    const vote = await prisma.vote.findUnique({
      where: {
        userId_targetId_targetType: {
          userId,
          targetId,
          targetType
        }
      }
    });

    res.json({ success: true, vote });
  } catch (error) {
    console.error('Get user vote error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getVoteCounts = async (req, res) => {
  try {
    const { targetId, targetType } = req.params;

    console.log('Get vote counts:', { targetId, targetType });

    const upvotes = await prisma.vote.count({
      where: {
        targetId,
        targetType,
        type: 'up'
      }
    });

    const downvotes = await prisma.vote.count({
      where: {
        targetId,
        targetType,
        type: 'down'
      }
    });

    const score = upvotes - downvotes;

    res.json({
      success: true,
      upvotes,
      downvotes,
      score
    });
  } catch (error) {
    console.error('Get vote counts error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getUserVotes = async (req, res) => {
  try {
    const votes = await prisma.vote.findMany({
      where: { userId: req.user.id },
      include: {
        post: { select: { title: true, slug: true } },
        comment: { select: { content: true } }
      }
    });
    res.json({ success: true, votes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};