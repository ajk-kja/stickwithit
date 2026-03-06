#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const vaultBlogPath = path.resolve('/home/clank/data/obsidian-vault/Blog');
const contentDir = path.join(projectRoot, 'content');
const postsDir = path.join(contentDir, 'posts');

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function cleanMarkdownFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      await fs.rm(path.join(dirPath, entry.name));
    }
  }));
}

async function copyBlogNotes() {
  await ensureDir(postsDir);

  try {
    await fs.access(vaultBlogPath);
  } catch (err) {
    throw new Error(`Obsidian blog folder not found at ${vaultBlogPath}`);
  }

  await cleanMarkdownFiles(postsDir);

  const entries = await fs.readdir(vaultBlogPath, { withFileTypes: true });
  const markdownFiles = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.md'));

  if (!markdownFiles.length) {
    console.warn('[sync-notes] No markdown files found in the Obsidian Blog folder.');
  }

  await Promise.all(markdownFiles.map(async (entry) => {
    const source = path.join(vaultBlogPath, entry.name);
    const target = path.join(postsDir, entry.name);
    await fs.copyFile(source, target);
  }));

  console.log(`[sync-notes] Copied ${markdownFiles.length} note(s) into content/posts/`);
}

await ensureDir(contentDir);
await copyBlogNotes();
