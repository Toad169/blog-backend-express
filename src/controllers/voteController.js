// src/controllers/voteController.js
import prisma from '../config/database.js';

export const vote = async (req, res) => {
  try {
    const { targetId, targetType, type } = req.body;

    // Check if target exists
    if (targetType === 'post') {
      const post = await prisma.post.findUnique({
        where: { id: targetId }
      });
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
    } else if (targetType === 'comment') {
      const comment = await prisma.comments.findUnique({
        where: { id: targetId }
      });
      if (!comment) {
        return res.status(404).json({ error: 'Comment not found' });
      }
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
        return res.json({ 
          message: 'Vote removed',
          action: 'removed',
          vote: null
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
          data: { type }
        });
        return res.json({ 
          message: 'Vote updated',
          action: 'updated',
          vote
        });
      }
    } else {
      // New vote
      vote = await prisma.vote.create({
        data: {
          userId: req.user.id,
          targetId,
          targetType,
          type
        }
      });
      
      return res.status(201).json({ 
        message: 'Vote created',
        action: 'created',
        vote
      });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getUserVote = async (req, res) => {
  try {
    const { targetId, targetType } = req.params;

    const vote = await prisma.vote.findUnique({
      where: {
        userId_targetId_targetType: {
          userId: req.user?.id || '', // Handle optional auth
          targetId,
          targetType
        }
      }
    });

    res.json({ vote });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getVoteCounts = async (req, res) => {
  try {
    const { targetId, targetType } = req.params;

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