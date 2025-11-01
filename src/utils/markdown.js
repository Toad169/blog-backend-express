// src/utils/markdown.js
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  highlight: function (code, lang) {
    // You can integrate with highlight.js here
    return code;
  }
});

export const markdownToHtml = async (markdown) => {
  try {
    const rawHtml = await marked.parse(markdown);
    const cleanHtml = purify.sanitize(rawHtml);
    return cleanHtml;
  } catch (error) {
    throw new Error('Failed to parse markdown');
  }
};