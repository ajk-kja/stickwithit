# StickWithIt Blog Pipeline

Lightweight Eleventy setup that turns Obsidian notes inside `/home/clank/data/obsidian-vault/Blog/` into the production-ready StickWithIt blog (output goes to `projects/stickwithit/www/blog/`).

## Workflow

1. Draft or edit posts in Obsidian under `Blog/`.
   - Use YAML frontmatter:
     ```yaml
     ---
     title: "My Post"
     slug: my-post
     date: 2026-03-01
     summary: "One-liner for the blog index."
     tags:
       - blog
       - stickwithit
     status: published
     ---
     ```
   - `tags` must include `blog` so the Eleventy collection picks it up.
2. From `projects/stickwithit/blog`, run:
   ```bash
   npm run publish-blog
   ```
   This script:
   - Syncs every `.md` file from the Obsidian folder into `content/posts/`
   - Runs Eleventy to generate `/blog/index.html` and `/blog/<slug>/index.html` inside `../www/blog`
3. Deploy the updated `www/blog` directory however you normally ship the StickWithIt site (Caddy, rsync, etc.).

## Scripts

- `npm run publish-blog` – sync notes + build once
- `npm run dev` – same as publish but keeps Eleventy in watch mode (passes `--watch` through)
- `npm run clean` – nuke generated markdown + the compiled blog folder (use carefully)

## Files of Interest

- `scripts/sync-notes.mjs` – safe copy from the Obsidian vault (only `.md` files)
- `content/_includes/layouts` – shared layouts for index + post pages
- `content/index.njk` – blog roll template
- `content/posts/posts.json` – default layout/permalink for posts

Add new templates/partials inside `content/_includes/` and they’ll be available to every note.
