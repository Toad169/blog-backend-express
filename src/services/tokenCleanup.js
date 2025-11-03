// src/services/tokenCleanup.js
import prisma from '../config/database.js';

export const startTokenCleanup = () => {
  // Run cleanup every hour
  setInterval(async () => {
    try {
      const result = await prisma.tokenBlacklist.deleteMany({
        where: {
          expiresAt: {
            lt: new Date()
          }
        }
      });
      
      if (result.count > 0) {
        console.log(`[Token Cleanup] Removed ${result.count} expired tokens`);
      }
    } catch (error) {
      console.error('[Token Cleanup] Error:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  console.log('Token cleanup service started');
};