---
tags:
  - blog
title: Renaming Setlist Sprint & Sharpening Its Job
slug: setlist-sprint-roadmap
date: 2026-02-20
summary: Show planning, runtime math, and why the next name (ShowFlow) needs to reflect calm control instead of chaos.
status: published
---

“Setlist Sprint” was the working title back when this was just a hackathon board. Today the app lives on shows because it keeps drummers locked into the moments the crowd remembers. The new name, **The Gigstrella**, leans into that mission—stick the intro, stick the outro, and stay calm in between.

## Using AB/CD loops like a safety net

The workflow is simple: drag the latest board mix into the browser, drop marker A at the count-in, B at verse one, C at the start of the outro vamp, and D where the band buttons the song. With AB active, the app keeps spitting the intro back until the pickup feels automatic. Flip to CD and it loops the ending tag so you can shed over a pad without touching a DAW.

## Show-night triage

On gig night the same project becomes a quiet stage manager. If the singer cuts the third tune, type the new order and The Gigstrella immediately recalculates runtime based on each song’s BPM and note count. No spreadsheets, no head math—just a quick glance before calling the next number.

## Rig Notes

- AB/CD loop states, markers, and BPM settings live in IndexedDB so you can rehearse offline on an iPad.
- Manual + auto BPM detection share the same UI; detected tempos land first, but you can type what the band actually plays.
- Runtime math and set summaries serialize into the URL, which makes it easy to drop a “latest plan” link into chat.
- Share a single URL with the band and everyone sees the current loops, BPMs, and runtime math without hunting for the latest PDF.
  
---
