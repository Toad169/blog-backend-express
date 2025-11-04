// src/controllers/postController.js
import prisma from '../config/database.js';
import { slugify } from '../utils/helpers.js';
import { markdownToHtml } from '../utils/markdown.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In your existing postController.js, update the createPost and updatePost methods:

// In createPost method, update the categories handling:
export const createPost = async (req, res) => {
  try {
    const { title, content, tags, categories } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const slug = slugify(title) + '-' + Date.now();
    
    // Convert markdown to HTML
    const contentHtml = await markdownToHtml(content);

    // Parse categories if they're sent as JSON string (from form-data)
    let categoryIds = [];
    if (categories) {
      try {
        categoryIds = typeof categories === 'string' ? JSON.parse(categories) : categories;
      } catch (error) {
        categoryIds = Array.isArray(categories) ? categories : [categories];
      }
    }

    const post = await prisma.post.create({
      data: {
        title,
        slug,
        content, // Store raw markdown
        contentHtml, // Store rendered HTML
        imageUrl,
        userId: req.user.id,
        tags: {
          create: tags?.map(tagName => ({
            tag: {
              connectOrCreate: {
                where: { name: tagName.toLowerCase() },
                create: { name: tagName.toLowerCase() }
              }
            }
          })) || []
        },
        categories: {
          create: categoryIds.map(categoryId => ({
            category: { connect: { id: categoryId } }
          }))
        }
      },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        user: { select: { username: true, id: true } },
        _count: {
          select: {
            comments: true,
            votes: {
              where: { type: 'up' }
            }
          }
        }
      }
    });

    res.status(201).json(post);
  } catch (error) {
    // Clean up uploaded file if post creation fails
    if (req.file) {
      await fs.unlink(path.join(__dirname, '../../uploads', req.file.filename)).catch(console.error);
    }
    res.status(400).json({ error: error.message });
  }
};


export const getPosts = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      category, 
      tag, 
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const skip = (page - 1) * limit;

    const where = {};
    
    if (category) {
      where.categories = { some: { category: { title: category } } };
    }
    
    if (tag) {
      where.tags = { some: { tag: { name: tag } } };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } }
      ];
    }

    const posts = await prisma.post.findMany({
      where,
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        user: { select: { username: true, id: true } },
        _count: {
          select: {
            comments: true,
            votes: {
              where: { type: 'up' }
            }
          }
        }
      },
      orderBy: { [sortBy]: sortOrder }
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
            user: { select: { username: true, id: true } },
            _count: {
              select: {
                votes: {
                  where: { type: 'up' }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            votes: {
              where: { type: 'up' }
            }
          }
        }
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

    // Convert markdown to HTML if content is updated
    const contentHtml = content ? await markdownToHtml(content) : undefined;

    // If new image is uploaded, delete old image
    let oldImagePath = null;
    if (req.file && existingPost.imageUrl) {
      const oldFilename = existingPost.imageUrl.split('/').pop();
      oldImagePath = path.join(__dirname, '../../uploads', oldFilename);
    }

    let categoryIds = [];
    if (categories) {
      try {
        categoryIds = typeof categories === 'string' ? JSON.parse(categories) : categories;
      } catch (error) {
        categoryIds = Array.isArray(categories) ? categories : [categories];
      }
    }

    const post = await prisma.post.update({
      where: { slug },
      data: {
        ...(title && { title }),
        ...(content && { content, contentHtml }),
        ...(imageUrl && { imageUrl }),
        ...(tags && {
          tags: {
            deleteMany: {},
            create: tags.map(tagName => ({
              tag: {
                connectOrCreate: {
                  where: { name: tagName.toLowerCase() },
                  create: { name: tagName.toLowerCase() }
                }
              }
            }))
          }
        }),
        ...(categories && {
          categories: {
            deleteMany: {},
            create: categoryIds.map(categoryId => ({
              category: { connect: { id: categoryId } }
            }))
          }
        })
      },
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        user: { select: { username: true, id: true } },
        _count: {
          select: {
            comments: true,
            votes: {
              where: { type: 'up' }
            }
          }
        }
      }
    });

    // Delete old image after successful update
    if (oldImagePath) {
      await fs.unlink(oldImagePath).catch(console.error);
    }

    res.json(post);
  } catch (error) {
    // Clean up new uploaded file if update fails
    if (req.file) {
      await fs.unlink(path.join(__dirname, '../../uploads', req.file.filename)).catch(console.error);
    }
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

    // Delete associated image file
    if (existingPost.imageUrl) {
      const filename = existingPost.imageUrl.split('/').pop();
      const imagePath = path.join(__dirname, '../../uploads', filename);
      await fs.unlink(imagePath).catch(console.error);
    }

    await prisma.post.delete({
      where: { slug }
    });

    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const posts = await prisma.post.findMany({
      where: { userId },
      skip: parseInt(skip),
      take: parseInt(limit),
      include: {
        tags: { include: { tag: true } },
        categories: { include: { category: true } },
        user: { select: { username: true, id: true } },
        _count: {
          select: {
            comments: true,
            votes: {
              where: { type: 'up' }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const total = await prisma.post.count({ where: { userId } });

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