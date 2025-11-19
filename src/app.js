// src/app.js - FIXED VERSION
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import prisma from './config/database.js'; // ADD THIS IMPORT

import authRoutes from './routes/auth.js';
import postRoutes from './routes/posts.js';
import userRoutes from './routes/users.js';
import commentRoutes from './routes/comments.js';
import voteRoutes from './routes/votes.js';
import categoryRoutes from './routes/categories.js'; 
import { startTokenCleanup } from './services/tokenCleanup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Middleware - MUST COME FIRST
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes - MUST COME AFTER BASIC MIDDLEWARE BUT BEFORE ERROR HANDLERS
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/categories', categoryRoutes);

// Debug routes - ADD THESE AFTER ALL YOUR ROUTES
app.get('/api/debug-votes', async (req, res) => {
  try {
    const votes = await prisma.vote.findMany({
      include: {
        user: { select: { username: true } },
        post: { select: { title: true } },
        comment: { select: { content: true } }
      }
    });
    res.json({ totalVotes: votes.length, votes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/debug-comments', async (req, res) => {
  try {
    const comments = await prisma.comments.findMany({
      include: {
        user: { select: { username: true, id: true } },
        post: { select: { title: true } }
      }
    });
    res.json({ totalComments: comments.length, comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add debug route for posts too
app.get('/api/debug-posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        user: { select: { username: true, id: true } },
        comments: true,
        votes: true
      }
    });
    res.json({ totalPosts: posts.length, posts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Hello World!')
});

// 404 Handler - MUST COME AFTER ALL ROUTES
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware - MUST COME LAST
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Check for file size limit error (from multer)
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Something went wrong!' 
      : error.message 
  });
});

// Start token cleanup service in all environments
try {
  startTokenCleanup();
  console.log('Token cleanup service started successfully');
} catch (error) {
  console.error('Failed to start token cleanup service:', error);
}

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});