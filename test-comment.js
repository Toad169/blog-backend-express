// test-comment.js - Run this with: node test-comment.js
import prisma from './src/config/database.js';

async function testComments() {
  try {
    console.log('Testing comments...');
    
    // Check if we can connect to database
    const commentCount = await prisma.comments.count();
    console.log(`Total comments in database: ${commentCount}`);
    
    // List all comments
    const comments = await prisma.comments.findMany({
      take: 5,
      include: {
        user: { select: { username: true } },
        post: { select: { title: true } }
      }
    });
    
    console.log('Recent comments:', comments);
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testComments();