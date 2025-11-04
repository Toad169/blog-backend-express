// src/controllers/categoriesController.js
import prisma from '../config/database.js';

export const getCategories = async (req, res) => {
  try {
    const categories = await prisma.categories.findMany({
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      },
      orderBy: {
        title: 'asc'
      }
    });

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.categories.findUnique({
      where: { id },
      include: {
        posts: {
          include: {
            post: {
              include: {
                user: {
                  select: { username: true }
                }
              }
            }
          }
        },
        _count: {
          select: {
            posts: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Category title is required' });
    }

    // Check if category already exists
    const existingCategory = await prisma.categories.findUnique({
      where: { title: title.trim() }
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = await prisma.categories.create({
      data: {
        title: title.trim()
      },
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Category title is required' });
    }

    // Check if category exists
    const existingCategory = await prisma.categories.findUnique({
      where: { id }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Check if new title already exists (excluding current category)
    const duplicateCategory = await prisma.categories.findUnique({
      where: { title: title.trim() }
    });

    if (duplicateCategory && duplicateCategory.id !== id) {
      return res.status(400).json({ error: 'Category title already exists' });
    }

    const category = await prisma.categories.update({
      where: { id },
      data: {
        title: title.trim()
      },
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    });

    res.json(category);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existingCategory = await prisma.categories.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Optional: Check if category has posts
    if (existingCategory._count.posts > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category that has posts. Please reassign or delete the posts first.' 
      });
    }

    await prisma.categories.delete({
      where: { id }
    });

    res.json({ 
      message: 'Category deleted successfully',
      deletedCategory: {
        id: existingCategory.id,
        title: existingCategory.title
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Get posts by category
export const getCategoryPosts = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const category = await prisma.categories.findUnique({
      where: { id },
      include: {
        posts: {
          skip: parseInt(skip),
          take: parseInt(limit),
          include: {
            post: {
              include: {
                user: {
                  select: { username: true, id: true }
                },
                tags: {
                  include: { tag: true }
                },
                categories: {
                  include: { category: true }
                },
                _count: {
                  select: {
                    comments: true,
                    votes: {
                      where: { type: 'up' }
                    }
                  }
                }
              }
            }
          },
          orderBy: {
            post: {
              createdAt: 'desc'
            }
          }
        },
        _count: {
          select: {
            posts: true
          }
        }
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const posts = category.posts.map(pc => pc.post);

    res.json({
      category: {
        id: category.id,
        title: category.title
      },
      posts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: category._count.posts,
        pages: Math.ceil(category._count.posts / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};