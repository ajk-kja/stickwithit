# Design & UX Improvement Brief — StickWithIt Web Redesign
_Handover from AJ, 2026-07-08. Source of truth for the next front-end iteration._

## I. Core Goals & Strategy
- **Unified identity:** stickwithit.xyz with the player at top = the definitive single live page.
- **Anti-dead-end policy:** every feature must guide the user to another element on the site. Avoid external links with no path back (e.g., bare Featured Artist profiles) and abrupt off-track links.
- **Monetization:** requires a dedicated separate strategy meeting — DO NOT implement yet.

## II. Information Architecture & Layout
### Visual hierarchy (above the fold)
- Contest info (rules, winner announcements, eligibility) above or immediately adjacent to the main clips/player content.
- Highly visible countdown timer.

### Content arrangement
- "Play Along" track moved prominently to the **right side**; the "1-2-3" guide sits directly below it.
- Fix "dead space on desktop"; prevent sections feeling spread out / disconnected.

### Section streamlining
- **No big section titles** — store, apps, featured artists pages are self-explanatory. Remove big title names for each segment (incl. Featured Artist).
- Featured Artists does not need to be on the main screen.
- **App listing ("pills"):** refactor from tall vertical stack → compact grid (~4 pills), app image consistently on the left for scanning.

## III. Workflow & Feature Deep Dives
### A. Contest flow
- Resolve confusion: what is the reward? how do I know what I voted for / when it's shown?
- Add "One vote per day" informational note.
- Clip submission integrated into the main contest page flow (no jump to intimidating secondary dead page).
- Use dead space in voting section for catchy taglines that pop out into a dedicated Contest Information page.

### B. Artist & community hubs (portfolio system)
- Individual artist band pages with dedicated URLs (first-party, scalable; cross-promotion without artists building their own sites).
- Must have an easy **Share button**.
- Must always have a visible functional **Back icon** returning to the main live page.
- **Leaderboard:** structured text-based, cross-referenced/visually linked to featured artist profile pages.

### C. Specific fixes
- **Blog listings:** clear "Back to Home" button at the end of the post list page.
- **Chopmeister app (HIGH PRIORITY):**
  1. Initial instructional overlay too intrusive — must not block bottom nav tabs.
  2. After successful upload, default screen must navigate to **Setlist** (desktop drag-and-drop reorder must work).
- **Mini portfolio embedding:** stop YouTube playlist redirects; embed within the mini-portfolio domain to keep users on-site.
- **Featured artist thumbnails:** eliminate black letterbox bars above/below videos. Remove the buttons under each artist preview; the preview buttons take the user to the artist's page (offsite links allowed only from there).

## Assets
- Easter egg image: `www/assets/easteregg.png` (702×935 PNG, delivered 2026-07-08 — the Discord upload had failed; staged by Clank).
