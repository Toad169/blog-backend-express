// src/utils/markdown.js
import { marked } from 'marked';
import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const { window } = new JSDOM('');
const DOMPurify = createDOMPurify(window);

// Configure marked options
marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: true,
  highlight: function (code, lang) {
    // You can integrate with highlight.js here for syntax highlighting
    return `<pre><code class="language-${lang}">${code}</code></pre>`;
  }
});

export const markdownToHtml = async (markdown) => {
  try {
    const rawHtml = await marked.parse(markdown);
    const cleanHtml = DOMPurify.sanitize(rawHtml);
    return cleanHtml;
  } catch (error) {
    console.error('Markdown parsing error:', error);
    throw new Error('Failed to parse markdown');
  }
};

// Optional: Extract plain text from markdown for previews
export const markdownToText = (markdown) => {
  return markdown
    .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
    .replace(/\[.*?\]\(.*?\)/g, '$1') // Replace links with text
    .replace(/[#*`~]/g, '') // Remove markdown formatting
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .substring(0, 200) + '...'; // Limit length
};