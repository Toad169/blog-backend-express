// src/utils/helpers.js
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

export const generateToken = (userId) => {
  return jwt.sign({ userId }, config.jwtSecret, { expiresIn: '7d' });
};

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  return password.length >= 6;
};

export const generateExcerpt = (content, length = 150) => {
  const plainText = content
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[.*?\]\(.*?\)/g, '$1') // Replace links with text
    .replace(/[#*`~]/g, '') // Remove markdown formatting
    .replace(/\n+/g, ' '); // Replace newlines with spaces

  return plainText.substring(0, length) + (plainText.length > length ? '...' : '');
};