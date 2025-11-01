// src/controllers/postController.js
import prisma from '../config/database.js';
import { slugify } from '../utils/helpers.js';
import { markdownToHtml } from '../utils/markdown.js';

export const createPost = async (req, res) => {
  try {
    const { title, content, tags, categories } = req.body;
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const slug = slugify(title) + '-' + Date.now();
    
    // Convert markdown to HTML (optional - can be done on frontend)
    const contentHtml = await markdownToHtml(content);

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