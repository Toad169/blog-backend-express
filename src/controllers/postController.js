// src/controllers/postController.js
import prisma from '../config/database.js';
import { slugify } from '../utils/helpers.js';

export const createPost = async (req, res) => {
  try {
    const { title, content, tags, categories } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const slug = slugify(title) + '-' + Date.now();

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content,
        imageUrl,
        userId: req.user.id,
        tags: {
          create: tags?.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName },
                create: { name: tagName }
              }
            }
          })) || []
        },
        categories: {
          create: categories?.map(categoryId => ({
            category: { connect: { id: categoryId } }
          })) || []
        }
      },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        user: { select: { username: true } }
      }
    });

    res.status(201).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getPosts = async (req, res) => {
  try {
    const { page = 1, limit = 10, category, tag } = req.query;
    const skip = (page - 1) * limit;

    const where = {};
    
    if (category) {
      where.categories = { some: { category: { title: category } } };
    }
    
    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }

    const posts = await prisma.post.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        user: { select: { username: true } },
        comments: { 
          take: 5,
          orderBy: { createdAt: 'desc' }
        },
        votes: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.post.count({ where });

    res.json({
      posts,
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

export const getPost = async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        user: { select: { username: true, id: true } },
        comments: {
          include: {
            user: { select: { username: true } },
            votes: true
          },
          orderBy: { createdAt: 'desc' }
        },
        votes: true
      }
    });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { slug } = req.params;
    const { title, content, tags, categories } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Check if user owns the post or is admin/moderator
    const existingPost = await prisma.post.findUnique({
      where: { slug },
      include: { user: true }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.userId !== req.user.id && !['admin', 'mod'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const post = await prisma.post.update({
      where: { slug },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(imageUrl && { imageUrl }),
        ...(tags && {
          tags: {
            deleteMany: {},
            create: tags.map(tagName => ({
              tag: {
                connectOrCreate: {
                  where: { name: tagName },
                  create: { name: tagName }
                }
              }
            }))
          }
        }),
        ...(categories && {
          categories: {
            deleteMany: {},
            create: categories.map(categoryId => ({
              category: { connect: { id: categoryId } }
            }))
          }
        })
      },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        user: { select: { username: true } }
      }
    });

    res.json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deletePost = async (req, res) => {
  try {
    const { slug } = req.params;

    const existingPost = await prisma.post.findUnique({
      where: { slug },
      include: { user: true }
    });

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    if (existingPost.userId !== req.user.id && !['admin', 'mod'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.post.delete({
      where: { slug }
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};