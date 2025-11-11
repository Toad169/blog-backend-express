// src/controllers/voteController.js
import prisma from '../config/database.js';

export const vote = async (req, res) => {
  try {
    const { targetId, targetType, type } = req.body;

    // Validate input
    if (!targetId || !targetType || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    if (!['up', 'down'].includes(type)) {
      return res.status(400).json({ error: 'Invalid vote type' });
    }

    // Check if target exists and prepare vote data
    let targetExists = false;
    let voteData = {
      userId: req.user.id,
      targetId,
      targetType,
      type
    };

    if (targetType === 'post') {
      const post = await prisma.post.findUnique({
        where: { id: targetId }
      });
      targetExists = !!post;
      if (targetExists) {
        voteData.postId = targetId; // Set the postId for the relation
      }
    } else if (targetType === 'comment') {
      const comment = await prisma.comments.findUnique({
        where: { id: targetId }
      });
      targetExists = !!comment;
      if (targetExists) {
        voteData.commentId = targetId; // Set the commentId for the relation
      }
    }

    if (!targetExists) {
      return res.status(404).json({ 
        error: `${targetType.charAt(0).toUpperCase() + targetType.slice(1)} not found` 
      });
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

    let vote;
    let action;

    if (existingVote) {
      if (existingVote.type === type) {
        // Same vote type - remove vote (undo)
        await prisma.vote.delete({
          where: {
            userId_targetId_targetType: {
              userId: req.user.id,
              targetId,
              targetType
            }
          }
        });
        action = 'removed';
        
        return res.json({
          message: 'Vote removed',
          action: 'removed',
          vote: null,
          previousType: type
        });
      } else {
        // Different vote type - update vote (switch)
        vote = await prisma.vote.update({
          where: {
            userId_targetId_targetType: {
              userId: req.user.id,
              targetId,
              targetType
            }
          },
          data: { 
            type,
            // Also update the relation fields if they exist
            ...(targetType === 'post' ? { postId: targetId } : { commentId: targetId })
          }
        });
        action = 'updated';
        
        return res.json({
          message: 'Vote updated',
          action: 'updated',
          vote,
          previousType: existingVote.type
        });
      }
    } else {
      // New vote - create with proper relation fields
      vote = await prisma.vote.create({
        data: voteData
      });
      action = 'created';
      
      return res.status(201).json({
        message: 'Vote created',
        action: 'created',
        vote
      });
    }
  } catch (error) {
    console.error('Vote error:', error);
    
    // Handle specific Prisma errors
    if (error.code === 'P2003') {
      return res.status(400).json({ 
        error: 'Invalid user or target reference' 
      });
    }
    
    if (error.code === 'P2002') {
      return res.status(400).json({ 
        error: 'Vote already exists' 
      });
    }
    
    res.status(400).json({ 
      error: error.message,
      code: error.code 
    });
  }
};

export const getUserVote = async (req, res) => {
  try {
    const { targetId, targetType } = req.params;

    // For optional auth, check if user is authenticated
    if (!req.user?.id) {
      return res.json({ vote: null });
    }

    // Validate targetType
    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

    const vote = await prisma.vote.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: req.user.id,
          targetId,
          targetType
        }
      }
    });

    res.json({ vote });
  } catch (error) {
    console.error('Get user vote error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getVoteCounts = async (req, res) => {
  try {
    const { targetId, targetType } = req.params;

    // Validate targetType
    if (!['post', 'comment'].includes(targetType)) {
      return res.status(400).json({ error: 'Invalid target type' });
    }

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

    res.json({
      upvotes,
      downvotes,
      score: upvotes - downvotes
    });
  } catch (error) {
    console.error('Get vote counts error:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getUserVotes = async (req, res) => {
  try {
    const votes = await prisma.vote.findMany({
      where: {
        userId: req.user.id
      },
      include: {
        // You can include related data if needed
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ votes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};