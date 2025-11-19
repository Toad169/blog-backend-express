// src/controllers/commentController.js
import prisma from '../config/database.js';

// In commentController.js - update createComment
export const createComment = async (req, res) => {
  try {
    const { postId, content } = req.body;

    console.log('CREATE COMMENT:', { postId, userId: req.user.id });

    if (!postId || !content) {
      return res.status(400).json({ error: 'Post ID and content are required' });
    }

    if (content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    // Check if post exists
    const post = await prisma.post.findUnique({ where: { id: postId } });
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
        user: { select: { username: true, id: true } }
      }
    });

    res.status(201).json({ success: true, comment });

  } catch (error) {
    console.error('CREATE COMMENT ERROR:', error);
    res.status(500).json({ error: 'Failed to create comment: ' + error.message });
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

    console.log('UPDATE COMMENT REQUEST:', { commentId, userId: req.user.id });

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    // Find the comment first
    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Check permissions
    const isOwner = comment.userId === req.user.id;
    const isAdmin = ['admin', 'mod'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }

    // Update the comment
    const updatedComment = await prisma.comments.update({
      where: { id: commentId },
      data: { 
        content: content.trim(),
        updatedAt: new Date()
      },
      include: {
        user: { select: { username: true, id: true } }
      }
    });

    res.json({ success: true, comment: updatedComment });

  } catch (error) {
    console.error('UPDATE COMMENT ERROR:', error);
    res.status(500).json({ error: 'Failed to update comment: ' + error.message });
  }
};

export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    console.log('DELETE COMMENT REQUEST:', { commentId, userId: req.user.id });

    // First, find the comment with user info
    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: { user: true }
    });

    if (!comment) {
      console.log('Comment not found');
      return res.status(404).json({ error: 'Comment not found' });
    }

    console.log('Comment found:', { 
      commentId: comment.id, 
      commentUserId: comment.userId, 
      requestUserId: req.user.id,
      userRole: req.user.role 
    });

    // Check permissions
    const isOwner = comment.userId === req.user.id;
    const isAdmin = ['admin', 'mod'].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      console.log('Permission denied');
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }

    console.log('Permission granted, deleting comment...');

    // Delete the comment
    await prisma.comments.delete({
      where: { id: commentId }
    });

    console.log('Comment deleted successfully');
    res.json({ success: true, message: 'Comment deleted successfully' });

  } catch (error) {
    console.error('DELETE COMMENT ERROR:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.status(500).json({ error: 'Failed to delete comment: ' + error.message });
  }
};

// Add this function to src/controllers/commentController.js
export const getComment = async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.comments.findUnique({
      where: { id: commentId },
      include: {
        user: { select: { username: true, id: true } },
        post: { select: { id: true, title: true, slug: true } }
      }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    res.json(comment);
  } catch (error) {
    console.error('Get comment error:', error);
    res.status(500).json({ error: error.message });
  }
};