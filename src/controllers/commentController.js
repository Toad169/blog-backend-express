// src/controllers/commentController.js
import prisma from '../config/database.js';

export const createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;

    const comment = await prisma.comments.create({
      data: {
        content,
        userId: req.user.id,
        postId
      },
      include: {
        user: { select: { username: true } },
        votes: true
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
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
        user: { select: { username: true } },
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