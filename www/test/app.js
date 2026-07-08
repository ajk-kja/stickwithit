(() => {
  "use strict";
  const STREAM_URL = "https://stream.stickwithit.xyz/live/live.m3u8";
  const RETRY_MS = 8000;
  const CONTEST_URL = "/assets/data/contest.json";

  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const today = () => new Date().toISOString().slice(0, 10);
  const cookie = (n) => (document.cookie.split("; ").find((p) => p.startsWith(n + "=")) || "").split("=")[1] || "";
  const setCookie = (n, v) => {
    const e = new Date(); e.setMonth(e.getMonth() + 2);
    document.cookie = `${n}=${encodeURIComponent(v)}; expires=${e.toUTCString()}; path=/; SameSite=Lax`;
  };

  // ---------- live player ----------
  function initPlayer() {
    const video = document.getElementById("player");
    const status = document.getElementById("player-status");
    const badge = document.getElementById("live-badge");
    if (!video) return;
    let hls = null;

    const setStatus = (m) => { if (status) status.textContent = m || ""; };
    const setLive = (on) => {
      if (!badge) return;
      badge.classList.toggle("is-off", !on);
      badge.innerHTML = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${on ? "var(--swi-accent)" : "var(--swi-dim)"}"></span>${on ? "LIVE" : "OFFLINE"}`;
    };

    function startHls() {
      hls = new Hls({ liveSyncDurationCount: 3, manifestLoadingMaxRetry: 4, levelLoadingMaxRetry: 4, fragLoadingMaxRetry: 4 });
      hls.loadSource(STREAM_URL);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { setStatus(""); setLive(true); video.play().catch(() => setStatus("Tap the player to start the live stream.")); });
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (!d.fatal) return;
        setStatus("Stream offline — retrying…"); setLive(false);
        try { hls.destroy(); } catch (e) {}
        hls = null; setTimeout(startHls, RETRY_MS);
      });
    }
    function startNative() {
      video.src = STREAM_URL;
      video.addEventListener("loadedmetadata", () => { setLive(true); setStatus(""); });
      video.addEventListener("error", () => {
        setStatus("Stream offline — retrying…"); setLive(false);
        setTimeout(() => { video.src = STREAM_URL; video.play().catch(() => {}); }, RETRY_MS);
      });
      video.play().catch(() => setStatus("Tap the player to start the live stream."));
    }

    if (window.Hls && Hls.isSupported()) startHls();
    else if (video.canPlayType("application/vnd.apple.mpegurl")) startNative();
    else { setLive(false); setStatus("This browser can't play the live stream."); }

    const expand = document.getElementById("expand-btn");
    if (expand) expand.addEventListener("click", () => {
      const el = video.closest(".player-card") || video;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
    });
  }

  // ---------- countdown ----------
  function renderCountdown(el, iso) {
    const end = new Date(iso || "");
    if (Number.isNaN(end.getTime())) { el.innerHTML = `<div class="u" style="flex:1"><b>Soon</b><span>voting opens</span></div>`; return; }
    const tick = () => {
      const ms = end.getTime() - Date.now();
      if (ms <= 0) { el.innerHTML = `<div class="u" style="flex:1"><b>Closed</b><span>winner soon</span></div>`; return; }
      const mins = Math.floor(ms / 60000);
      const days = Math.floor(mins / 1440);
      const hrs = Math.floor((mins % 1440) / 60);
      const min = mins % 60;
      el.innerHTML =
        `<div class="u"><b>${days}</b><span>days</span></div>` +
        `<div class="u"><b>${String(hrs).padStart(2, "0")}</b><span>hrs</span></div>` +
        `<div class="u"><b>${String(min).padStart(2, "0")}</b><span>min</span></div>`;
    };
    tick(); setInterval(tick, 60000);
  }

  // ---------- play-along track (audio) ----------
  function renderTrack(el, track) {
    if (!track || !track.url) { el.remove(); return; }
    el.innerHTML =
      `<button class="play" type="button" aria-label="Play the play-along track">▶</button>` +
      `<div class="info"><div class="lbl">Play-along track</div>` +
      `<div class="t">${esc(track.title || "This month's track")}</div>` +
      `<div class="bar"><i></i></div></div>`;
    const audio = new Audio(track.url);
    audio.preload = "none";
    const btn = el.querySelector(".play");
    const fill = el.querySelector(".bar i");
    btn.addEventListener("click", () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
    audio.addEventListener("play", () => { btn.textContent = "❚❚"; });
    audio.addEventListener("pause", () => { btn.textContent = "▶"; });
    audio.addEventListener("ended", () => { btn.textContent = "▶"; fill.style.width = "0%"; });
    audio.addEventListener("timeupdate", () => { if (audio.duration) fill.style.width = (audio.currentTime / audio.duration * 100) + "%"; });
  }

  // ---------- vote rail (1 vote per day, client-side) ----------
  function renderVote(rail, data) {
    const entries = (Array.isArray(data.entries) ? data.entries : []).filter((e) => e.active !== false);
    if (!entries.length) { rail.innerHTML = `<div class="empty">Entries drop soon.</div>`; return; }
    const voteCookie = `swi_vote_${data.id || "monthly"}`;
    const [vDate, vId] = decodeURIComponent(cookie(voteCookie)).split("|");
    const votedToday = vDate === today();
    const closed = data.voting_open === false;

    rail.innerHTML = entries.map((e) => {
      const voted = votedToday && vId === e.id;
      const disabled = votedToday || closed;
      const media = e.video
        ? `<video src="${esc(e.video)}" poster="${esc(e.image || "")}" muted playsinline preload="metadata" controls></video>`
        : e.image ? `<img class="thumb" src="${esc(e.image)}" alt="">` : `<div class="thumb"></div>`;
      const label = voted ? "✓ Voted today" : closed ? "Voting closed" : "Vote";
      return `<article class="vote-card" data-id="${esc(e.id)}">${media}` +
        `<div class="meta"><strong>${esc(e.title)}</strong><span>${esc(e.artist || "")}</span></div>` +
        `<button class="vote-btn" type="button" ${disabled ? "disabled" : ""}>${label}</button></article>`;
    }).join("");

    rail.querySelectorAll(".vote-btn").forEach((btn) => btn.addEventListener("click", () => {
      const card = btn.closest("[data-id]");
      const id = card && card.getAttribute("data-id");
      if (!id) return;
      setCookie(voteCookie, `${today()}|${id}`);
      rail.querySelectorAll(".vote-btn").forEach((b) => { b.disabled = true; b.textContent = b === btn ? "✓ Voted today" : "Voted"; });
    }));
  }

  // ---------- eyebrow (contest month) ----------
  function setEyebrow(el, data) {
    if (!el) return;
    const end = new Date(data.ends_at || "");
    if (!Number.isNaN(end.getTime())) {
      const month = new Date(end.getTime() - 86400000).toLocaleString("en-US", { month: "long" });
      el.textContent = `${month} contest`;
    } else if (data.voting_window) {
      el.textContent = `${data.voting_window} contest`;
    }
  }

  async function loadContest() {
    const countdown = document.getElementById("countdown");
    const track = document.getElementById("track");
    const rail = document.getElementById("vote-rail");
    const eyebrow = document.getElementById("contest-eyebrow");
    try {
      const res = await fetch(`${CONTEST_URL}?ts=${Date.now()}`, { cache: "no-store" });
      const data = await res.json();
      setEyebrow(eyebrow, data);
      if (countdown) renderCountdown(countdown, data.ends_at);
      if (track) renderTrack(track, data.page && Array.isArray(data.page.tracks) ? data.page.tracks[0] : null);
      if (rail) renderVote(rail, data);
    } catch (err) {
      if (countdown) countdown.innerHTML = `<div class="u" style="flex:1"><b>Soon</b><span>voting opens</span></div>`;
      if (track) track.remove();
      if (rail) rail.innerHTML = `<div class="empty">Couldn't load entries — refresh to try again.</div>`;
    }
  }

  // ---------- more sheet ----------
  function initMore() {
    const btn = document.getElementById("more-btn");
    const sheet = document.getElementById("more-sheet");
    if (!btn || !sheet) return;
    const open = (o) => { sheet.hidden = !o; btn.setAttribute("aria-expanded", String(o)); };
    btn.addEventListener("click", () => open(sheet.hidden));
    sheet.addEventListener("click", (e) => { if (e.target === sheet) open(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") open(false); });
  }

  initPlayer();
  loadContest();
  initMore();
})();
