// src/utils/tokenUtils.js
import prisma from '../config/database.js';

export const isTokenBlacklisted = async (token) => {
  const blacklistedToken = await prisma.tokenBlacklist.findUnique({
    where: { token }
  });
  
  if (blacklistedToken) {
    if (blacklistedToken.expiresAt > new Date()) {
      return true;
    } else {
      // Remove expired token from blacklist
      await prisma.tokenBlacklist.delete({
        where: { token }
      });
      return false;
    }
  }
  
  return false;
};

// You can also move other token-related utilities here
export const validateToken = (token) => {
  // Add token validation logic if needed
  return token && token.length > 0;
};