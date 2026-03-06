#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const postsDir = path.join(__dirname, '..', 'content', 'posts');

const files = await fs.readdir(postsDir);

for (const file of files) {
  if (!file.endsWith('.md')) continue;
  const filePath = path.join(postsDir, file);
  let content = await fs.readFile(filePath, 'utf8');
  const original = content;

  // Remove single-line "Search focus" callouts
  content = content.replace(/\n> \*\*Search focus:[^\n]*\n?/gi, '\n');
  content = content.replace(/\nSearch focus:[^\n]*\n?/gi, '\n');

  // Drop backlinks sections entirely
  content = content.replace(/\n## Backlinks[\s\S]*/i, '\n');

  if (content !== original) {
    await fs.writeFile(filePath, content.trimEnd() + '\n', 'utf8');
  }
}
