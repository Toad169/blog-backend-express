// src/controllers/commentController.js
import prisma from '../config/database.js';

// In commentController.js - update createComment
export const createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;

    // Validation
    if (!postId || !content) {
      return res.status(400).json({ error: 'Post ID and content are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const comment = await prisma.comments.create({
      data: {
        content: content.trim(),
        userId: req.user.id,
        postId
      },
      include: {
        user: { select: { username: true, id: true } },
        votes: true
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getPostComments = async (req, res) => {
  try {
    const { postId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const comments = await prisma.comments.findMany({
      where: { postId },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        user: { select: { username: true, id: true } },
        votes: true,
        _count: {
          select: {
            votes: {
              where: { type: 'up' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.comments.count({ where: { postId } });

    res.json({
      comments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;

    // Check if comment exists and user owns it
    const existingComment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.userId !== req.user.id && !['admin', 'mod'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const comment = await prisma.comments.update({
      where: { id: commentId },
      data: { content },
      include: {
        user: { select: { username: true, id: true } },
        votes: true
      }
    });

    res.json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const existingComment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (existingComment.userId !== req.user.id && !['admin', 'mod'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.comments.delete({
      where: { id: commentId }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};