(() => {
  "use strict";
  const STREAM_URL = "https://stream.stickwithit.xyz/live/live.m3u8";
  const RETRY_MS = 8000;
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = (id) => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);
  const cookie = (n) => (document.cookie.split("; ").find((p) => p.startsWith(n + "=")) || "").split("=")[1] || "";
  const setCookie = (n, v) => { const e = new Date(); e.setMonth(e.getMonth() + 2); document.cookie = `${n}=${encodeURIComponent(v)}; expires=${e.toUTCString()}; path=/; SameSite=Lax`; };
  const getJSON = (url) => fetch(`${url}?ts=${Date.now()}`, { cache: "no-store" }).then((r) => r.json());
  function ytEmbed(url) {
    if (!url) return "";
    const list = (url.match(/[?&]list=([^&]+)/) || [])[1];
    if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`;
    const v = (url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/) || [])[1];
    return v ? `https://www.youtube.com/embed/${v}` : "";
  }

  /* ---------- live player (home only) ---------- */
  function initPlayer() {
    const video = $("player"); if (!video) return;
    const badge = $("live-badge"), status = $("player-status");
    let hls = null;
    const setStatus = (m) => { if (status) status.textContent = m || ""; };
    const setLive = (on) => { if (!badge) return; badge.classList.toggle("is-off", !on); badge.innerHTML = `<span class="dot" style="background:${on ? "var(--acc)" : "var(--dim)"}"></span>${on ? "LIVE" : "OFFLINE"}`; };
    function startHls() {
      hls = new Hls({ liveSyncDurationCount: 3, manifestLoadingMaxRetry: 4, levelLoadingMaxRetry: 4, fragLoadingMaxRetry: 4 });
      hls.loadSource(STREAM_URL); hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setStatus(""); setLive(true); video.play().catch(() => setStatus("Tap to start the live stream.")); });
      hls.on(Hls.Events.ERROR, (_e, d) => { if (!d.fatal) return; setStatus("Stream offline — retrying…"); setLive(false); try { hls.destroy(); } catch (e) {} hls = null; setTimeout(startHls, RETRY_MS); });
    }
    function startNative() {
      video.src = STREAM_URL;
      video.addEventListener("loadedmetadata", () => { setLive(true); setStatus(""); });
      video.addEventListener("error", () => { setStatus("Stream offline — retrying…"); setLive(false); setTimeout(() => { video.src = STREAM_URL; video.play().catch(() => {}); }, RETRY_MS); });
      video.play().catch(() => setStatus("Tap to start the live stream."));
    }
    if (window.Hls && Hls.isSupported()) startHls();
    else if (video.canPlayType("application/vnd.apple.mpegurl")) startNative();
    else { setLive(false); setStatus("This browser can't play the live stream."); }
    const ex = $("expand-btn");
    if (ex) ex.addEventListener("click", () => { const el = video.closest(".player") || video; if (el.requestFullscreen) el.requestFullscreen().catch(() => {}); else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); });
  }

  /* ---------- countdown ---------- */
  function renderCountdown(el, iso) {
    const end = new Date(iso || "");
    if (Number.isNaN(end.getTime())) { el.innerHTML = `<div class="g"><b>Soon</b><span>voting opens</span></div>`; return; }
    const tick = () => {
      const ms = end.getTime() - Date.now();
      if (ms <= 0) { el.innerHTML = `<div class="g"><b>Closed</b><span>winner soon</span></div>`; return; }
      const m = Math.floor(ms / 60000), days = Math.floor(m / 1440), hrs = Math.floor((m % 1440) / 60), min = m % 60;
      el.innerHTML = `<div class="g"><b>${days}</b><span>days</span></div><div class="sep">:</div><div class="g"><b>${String(hrs).padStart(2, "0")}</b><span>hrs</span></div><div class="sep">:</div><div class="g"><b>${String(min).padStart(2, "0")}</b><span>min</span></div>`;
    };
    tick(); setInterval(tick, 60000);
  }

  /* ---------- play-along track (audio) ---------- */
  function renderTrack(el, track) {
    if (!track || !track.url) { el.remove(); return; }
    const lbl = el.dataset.label || "Play-along track";
    el.innerHTML = `<button class="play" type="button" aria-label="Play the track">▶</button><div class="info"><div class="lbl">${esc(lbl)}</div><div class="t">${esc(track.title || "This month's track")}</div><div class="bar"><i></i></div></div>`;
    const audio = new Audio(track.url); audio.preload = "none";
    const btn = el.querySelector(".play"), fill = el.querySelector(".bar i");
    btn.addEventListener("click", () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
    audio.addEventListener("play", () => { btn.textContent = "❚❚"; });
    audio.addEventListener("pause", () => { btn.textContent = "▶"; });
    audio.addEventListener("ended", () => { btn.textContent = "▶"; fill.style.width = "0%"; });
    audio.addEventListener("timeupdate", () => { if (audio.duration) fill.style.width = (audio.currentTime / audio.duration * 100) + "%"; });
  }

  /* ---------- vote (rail on home / grid on contest) ---------- */
  function renderEntries(el, data) {
    const entries = (Array.isArray(data.entries) ? data.entries : []).filter((e) => e.active !== false);
    if (!entries.length) { el.innerHTML = `<div class="empty">Entries drop soon.</div>`; return; }
    const ck = `swi_vote_${data.id || "monthly"}`;
    const [vDate, vId] = decodeURIComponent(cookie(ck)).split("|");
    const votedToday = vDate === today(), closed = data.voting_open === false;
    el.innerHTML = entries.map((e) => {
      const voted = votedToday && vId === e.id, dis = votedToday || closed;
      const media = e.video ? `<video src="${esc(e.video)}" poster="${esc(e.image || "")}" muted playsinline preload="metadata" controls></video>` : e.image ? `<img src="${esc(e.image)}" alt="">` : "";
      return `<article class="votecard" data-id="${esc(e.id)}"><div class="th">${media}</div><div class="m"><strong>${esc(e.title)}</strong><span>${esc(e.artist || "")}</span></div><button class="vb" type="button" ${dis ? "disabled" : ""}>${voted ? "✓ Voted today" : closed ? "Voting closed" : "Vote"}</button></article>`;
    }).join("");
    el.querySelectorAll(".vb").forEach((btn) => btn.addEventListener("click", () => {
      const id = btn.closest("[data-id]")?.getAttribute("data-id"); if (!id) return;
      setCookie(ck, `${today()}|${id}`);
      el.querySelectorAll(".vb").forEach((b) => { b.disabled = true; b.textContent = b === btn ? "✓ Voted today" : "Voted"; });
    }));
  }

  function setEyebrow(el, data) {
    if (!el) return;
    const end = new Date(data.ends_at || "");
    if (!Number.isNaN(end.getTime())) el.textContent = `${new Date(end.getTime() - 86400000).toLocaleString("en-US", { month: "long" })} contest`;
    else if (data.voting_window) el.textContent = `${data.voting_window} contest`;
  }

  function renderWinner(el, data) {
    const w = (data.winners || [])[0]; if (!w) { el.remove(); return; }
    const entry = (data.entries || []).find((e) => e.id === w.entry_id);
    if (!entry) { el.remove(); return; }
    el.innerHTML = `<span class="medal">🏆</span><div class="th"><img src="${esc(entry.image || "")}" alt=""></div><div><b>${esc(entry.title)}</b><span class="wl">${esc(w.label || "1st")} place</span></div>`;
  }

  async function loadContest() {
    const cd = $("countdown"), tk = $("track"), eb = $("contest-eyebrow"),
          entriesEl = $("vote-rail") || $("vote-grid"), win = $("winner"), desc = $("contest-desc");
    if (!cd && !tk && !entriesEl && !eb) return;
    let data;
    try { data = await getJSON("/assets/data/contest.json"); }
    catch { if (cd) cd.innerHTML = `<div class="g"><b>Soon</b><span>voting opens</span></div>`; if (tk) tk.remove(); if (entriesEl) entriesEl.innerHTML = `<div class="empty">Couldn't load entries.</div>`; return; }
    if (eb) setEyebrow(eb, data);
    if (cd) renderCountdown(cd, data.ends_at);
    if (tk) renderTrack(tk, data.page && Array.isArray(data.page.tracks) ? data.page.tracks[0] : null);
    if (desc && data.page) desc.innerHTML = `<b>${esc(data.page.headline || "")}</b> ${esc((data.page.description || [])[0] || "")}`;
    if (entriesEl) renderEntries(entriesEl, data);
    if (win) renderWinner(win, data);
  }

  /* ---------- artists ---------- */
  const isPodcast = (d) => String(d.id || "").startsWith("stick-together-");
  function artistTile(d) {
    return `<a class="artistcard${d.memorial ? " mem" : ""}" href="/test/artist/?id=${encodeURIComponent(d.id)}"><div class="img"><img src="${esc(d.image)}" alt="" loading="lazy"></div><div class="tx">${d.memorial ? '<span class="memtag">In memoriam</span>' : ""}<div class="nm">${esc(d.name)}</div><div class="bl">${esc(d.blurb || "")}</div><div class="ff">${esc(d.first_featured || "")}</div></div></a>`;
  }
  async function loadArtists() {
    const featEl = $("artist-featured"), subEl = $("artist-sub"), gridEl = $("artist-grid");
    if (!featEl && !gridEl) return;
    let data; try { data = await getJSON("/assets/data/drummers.json"); } catch { if (gridEl) gridEl.innerHTML = `<div class="empty">Artists unavailable.</div>`; return; }
    const all = (data.drummers || []).filter((d) => d.active !== false && !isPodcast(d)).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const hero = all.find((d) => !d.memorial) || all[0];
    const rest = all.filter((d) => d !== hero);
    if (featEl && hero) featEl.innerHTML = `<a class="feat-hero" href="/test/artist/?id=${encodeURIComponent(hero.id)}"><div class="img"><img src="${esc(hero.image)}" alt=""></div><div class="tx"><span class="kick">Featured</span><div class="nm">${esc(hero.name)}</div><div class="bl">${esc(hero.blurb || "")}</div><div class="ff">${esc(hero.first_featured || "")}</div></div></a>`;
    if (subEl) subEl.innerHTML = rest.slice(0, 3).map(artistTile).join("");
    if (gridEl) gridEl.innerHTML = rest.slice(3).map(artistTile).join("");
  }

  async function loadArtistDetail() {
    const nameEl = $("a-name"); if (!nameEl) return;
    let data; try { data = await getJSON("/assets/data/drummers.json"); } catch { nameEl.textContent = "Artist unavailable"; return; }
    const id = new URLSearchParams(location.search).get("id");
    const list = data.drummers || [];
    const a = list.find((d) => d.id === id) || list[0];
    if (!a) return;
    $("a-hero").innerHTML = `<img src="${esc(a.image)}" alt="">`;
    nameEl.textContent = a.name;
    $("a-ff").textContent = a.first_featured || "";
    $("a-bio").textContent = a.blurb || "";
    const emb = ytEmbed(a.playlist_url);
    $("a-playlist").innerHTML = emb ? `<iframe class="yt" src="${emb}" title="${esc(a.name)} playlist" loading="lazy" allow="encrypted-media" allowfullscreen></iframe>` : `<div class="empty">No videos yet.</div>`;
    const socs = a.socials || [];
    $("a-socials").innerHTML = socs.length ? socs.map((s) => `<a class="soc" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} <span class="ext">↗</span></a>`).join("") : `<span class="muted" style="font-size:.78rem">No links listed.</span>`;
    document.title = `${a.name} — Stick With It`;
  }

  /* ---------- submit (preview only on /test) ---------- */
  function initSubmit() {
    const btn = $("submit-btn"); if (!btn) return;
    btn.addEventListener("click", (e) => { e.preventDefault(); const n = $("submit-note"); if (n) n.textContent = "✓ Preview — on the live site this uploads your clip to the July contest."; });
  }

  initPlayer(); loadContest(); loadArtists(); loadArtistDetail(); initSubmit();
})();
