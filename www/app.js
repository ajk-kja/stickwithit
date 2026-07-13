(() => {
  "use strict";
  const STREAM_URL = "https://stream.stickwithit.xyz/live/live.m3u8";
  const RETRY_MS = 8000;
  const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = (id) => document.getElementById(id);
  const TEST_BASE = location.pathname.startsWith("/test/") ? "/test" : "";
  const sitePath = (path) => `${TEST_BASE}${path}`;
  const today = () => new Date().toISOString().slice(0, 10);
  const cookie = (n) => (document.cookie.split("; ").find((p) => p.startsWith(n + "=")) || "").split("=")[1] || "";
  const setCookie = (n, v) => { const e = new Date(); e.setMonth(e.getMonth() + 2); document.cookie = `${n}=${encodeURIComponent(v)}; expires=${e.toUTCString()}; path=/; SameSite=Lax`; };
  const getJSON = (url) => fetch(`${url}?ts=${Date.now()}`, { cache: "no-store" }).then((r) => r.json());
  const THEME_KEY = "swi-theme";
  function ytEmbed(url) {
    if (!url) return "";
    const list = (url.match(/[?&]list=([^&]+)/) || [])[1];
    if (list) return `https://www.youtube.com/embed/videoseries?list=${list}`;
    const v = (url.match(/[?&]v=([^&]+)/) || url.match(/youtu\.be\/([^?&]+)/) || [])[1];
    return v ? `https://www.youtube.com/embed/${v}` : "";
  }

  /* ---------- theme toggle ---------- */
  function applyTheme(theme, persist = false) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    document.body.classList.toggle("theme-light", next === "light");
    document.querySelectorAll(".theme-toggle input").forEach((input) => {
      input.checked = next === "light";
      input.setAttribute("aria-label", next === "light" ? "Use dark mode" : "Use light mode");
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next === "light" ? "#f7f7f4" : "#050506");
    if (persist) {
      try { localStorage.setItem(THEME_KEY, next); } catch {}
    }
  }

  function initThemeToggle() {
    const host = document.querySelector(".chrome-in");
    if (host && !host.querySelector(".theme-toggle")) {
      const label = document.createElement("label");
      label.className = "theme-toggle";
      label.title = "Light / dark";
      label.innerHTML = '<input type="checkbox"><span aria-hidden="true"></span>';
      host.appendChild(label);
    }
    let saved = "dark";
    try { saved = localStorage.getItem(THEME_KEY) || "dark"; } catch {}
    applyTheme(saved);
    document.querySelectorAll(".theme-toggle input").forEach((input) => {
      input.addEventListener("change", () => applyTheme(input.checked ? "light" : "dark", true));
    });
  }

  /* ---------- live player (home only) ---------- */
  function initPlayer() {
    const video = $("player"); if (!video) return;
    const badge = $("live-badge"), status = $("player-status");
    const castBtn = $("cast-btn");
    const shell = video.closest(".player");
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
    const snd = $("sound-btn");
    if (snd) {
      const paint = () => { snd.textContent = video.muted ? "\uD83D\uDD07" : "\uD83D\uDD0A"; snd.title = video.muted ? "Unmute" : "Mute"; snd.setAttribute("aria-label", (video.muted ? "Unmute" : "Mute") + " the live stream"); };
      snd.addEventListener("click", () => { video.muted = !video.muted; if (!video.muted) { video.volume = video.volume || 1; video.play().catch(() => {}); } paint(); });
      video.addEventListener("volumechange", paint);
      paint();
    }
    if (shell) initPlayerChrome(shell);
    if (castBtn) initCastButton(video, castBtn);
  }

  function initPlayerChrome(shell) {
    let idleTimer = 0;
    const reveal = () => {
      shell.classList.remove("controls-idle");
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (!shell.matches(":hover") && !shell.contains(document.activeElement)) {
          shell.classList.add("controls-idle");
        }
      }, 2400);
    };
    ["pointermove", "pointerdown", "touchstart", "mousemove", "focusin", "keydown"].forEach((eventName) => {
      shell.addEventListener(eventName, reveal, { passive: true });
    });
    shell.addEventListener("mouseleave", () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => shell.classList.add("controls-idle"), 700);
    });
    reveal();
  }

  function initCastButton(video, btn) {
    const canAirPlay = () => typeof video.webkitShowPlaybackTargetPicker === "function";
    const hasRemote = () => video.remote && typeof video.remote.prompt === "function";
    const hasGoogleCast = () => window.cast && window.chrome && chrome.cast && cast.framework;
    const configureGoogleCast = () => {
      if (!hasGoogleCast()) return false;
      cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
      });
      return true;
    };
    const show = () => { btn.hidden = false; };
    const hide = () => { btn.hidden = true; };
    const showIfAvailable = () => {
      if (canAirPlay() || hasRemote() || configureGoogleCast()) show();
      else hide();
    };
    window.addEventListener("swi-cast-api", (event) => {
      if (event.detail?.available && configureGoogleCast()) show();
      else showIfAvailable();
    });
    if (window.__swiCastAvailable && configureGoogleCast()) show();
    if (video.remote && typeof video.remote.watchAvailability === "function") {
      video.remote.watchAvailability((available) => {
        btn.hidden = !(available || canAirPlay() || hasGoogleCast());
      }).catch(showIfAvailable);
    } else {
      showIfAvailable();
    }
    btn.addEventListener("click", async () => {
      if (canAirPlay()) {
        video.webkitShowPlaybackTargetPicker();
        return;
      }
      if (hasGoogleCast()) {
        try {
          const context = cast.framework.CastContext.getInstance();
          let session = context.getCurrentSession();
          if (!session) session = await context.requestSession();
          const mediaInfo = new chrome.cast.media.MediaInfo(STREAM_URL, "application/x-mpegURL");
          mediaInfo.metadata = new chrome.cast.media.GenericMediaMetadata();
          mediaInfo.metadata.title = "Stick With It Live";
          mediaInfo.metadata.subtitle = "Live drums and monthly contest";
          await session.loadMedia(new chrome.cast.media.LoadRequest(mediaInfo));
          return;
        } catch (e) {}
      }
      if (hasRemote()) {
        video.remote.prompt().catch(() => {});
      }
    });
  }

  /* ---------- live chat ---------- */
  const CHAT_ICONS = {
    twitch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#9146ff" d="M4 3h17v11.7l-4.8 4.8h-3.7L9.8 22H7v-2.5H3V6.8L4 3Zm2 2v12.5h4v1.8l1.8-1.8h3.4L19 13.7V5H6Zm4.5 3.1h2v5.6h-2V8.1Zm5 0h2v5.6h-2V8.1Z"/></svg>',
    discord: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#5865f2" d="M19.7 5.4A16.7 16.7 0 0 0 15.6 4l-.2.3c-.2.4-.4.8-.5 1.2a15.6 15.6 0 0 0-5.8 0 8 8 0 0 0-.7-1.5 16.7 16.7 0 0 0-4.1 1.4C1.7 9.3 1 13.2 1.4 17c1.7 1.3 3.4 2 5 2.4.4-.5.8-1.1 1.1-1.8-.6-.2-1.1-.5-1.7-.8l.4-.3c3.3 1.5 6.8 1.5 10 0l.4.3c-.5.3-1.1.6-1.7.8.3.7.7 1.3 1.1 1.8 1.7-.5 3.4-1.2 5.1-2.4.5-4.4-.8-8.2-3.4-11.6ZM8.4 14.7c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm7.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z"/></svg>',
    web: '<span class="src-web" aria-hidden="true">🥁</span>'
  };

  function chatIcon(source) {
    return CHAT_ICONS[source] || CHAT_ICONS.web;
  }

  function initChat() {
    const root = $("live-chat"), list = $("chat-messages"), form = $("chat-form"),
          nameEl = $("chat-name"), textEl = $("chat-text"), sendEl = $("chat-send"),
          stateEl = $("chat-state"), statusEl = $("chat-status");
    if (!root || !list || !form || !nameEl || !textEl) return;
    let autoScroll = true;
    const seen = new Set();
    const setState = (value) => { if (stateEl) stateEl.textContent = value; };
    const setStatus = (value) => { if (statusEl) statusEl.textContent = value || ""; };
    const atBottom = () => list.scrollTop + list.clientHeight >= list.scrollHeight - 24;
    const scrollDown = () => { if (autoScroll) list.scrollTop = list.scrollHeight; };
    const saved = localStorage.getItem("swi_chat_name") || "";
    if (saved) nameEl.value = saved.slice(0, 24);
    list.addEventListener("scroll", () => { autoScroll = atBottom(); });
    function removeMissingMessages(messages) {
      const keep = new Set((messages || []).map((msg) => String(msg?.id || "")).filter(Boolean));
      for (const row of Array.from(list.children)) {
        const id = row.dataset ? row.dataset.chatId : "";
        if (id && !keep.has(id)) {
          row.remove();
          seen.delete(id);
        }
      }
    }
    function addMessage(msg) {
      if (!msg || !msg.id || seen.has(msg.id)) return;
      seen.add(msg.id);
      const wasBottom = atBottom();
      const row = document.createElement("div");
      row.className = `m source-${String(msg.source || "web").replace(/[^a-z]/g, "")}`;
      row.dataset.chatId = String(msg.id);
      const src = document.createElement("span");
      src.className = "src";
      src.innerHTML = chatIcon(msg.source);
      const user = document.createElement("b");
      user.textContent = String(msg.user || "guest");
      const text = document.createElement("span");
      text.className = "txt";
      text.textContent = String(msg.text || "");
      row.append(src, user, text);
      list.append(row);
      while (list.children.length > 200) list.firstElementChild.remove();
      if (wasBottom || autoScroll) scrollDown();
    }
    function syncMessages(messages) {
      if (!Array.isArray(messages)) return;
      const wasBottom = atBottom();
      removeMissingMessages(messages);
      messages.forEach(addMessage);
      if (wasBottom || autoScroll) scrollDown();
    }
    function connect() {
      if (!("EventSource" in window)) {
        setState("Recent");
        getJSON("/api/chat/recent").then((d) => syncMessages(d.messages || [])).catch(() => setState("Offline"));
        setInterval(() => getJSON("/api/chat/recent").then((d) => syncMessages(d.messages || [])).catch(() => {}), 5000);
        return;
      }
      const es = new EventSource("/api/chat/events");
      es.onopen = () => { setState("Live"); setStatus(""); };
      es.onmessage = (ev) => {
        try { addMessage(JSON.parse(ev.data)); } catch (e) {}
      };
      es.addEventListener("message", (ev) => {
        try { addMessage(JSON.parse(ev.data)); } catch (e) {}
      });
      es.addEventListener("sync", (ev) => {
        try { syncMessages((JSON.parse(ev.data) || {}).messages || []); } catch (e) {}
      });
      es.onerror = () => { setState("Reconnecting"); };
      setInterval(() => getJSON("/api/chat/recent").then((d) => syncMessages(d.messages || [])).catch(() => {}), 15000);
    }
    form.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      const name = nameEl.value.trim();
      const text = textEl.value.trim();
      if (!name || !text) return;
      localStorage.setItem("swi_chat_name", name);
      setStatus("");
      if (sendEl) sendEl.disabled = true;
      try {
        const res = await fetch("/api/chat/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, text })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "chat unavailable");
        textEl.value = "";
        textEl.focus();
      } catch (err) {
        setStatus(err.message || "chat unavailable");
      } finally {
        if (sendEl) sendEl.disabled = false;
      }
    });
    connect();
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
  function trackDownloadName(track) {
    const fromUrl = String(track?.url || "").split("/").pop() || "";
    return track?.filename || fromUrl || "stickwithit-playalong.mp3";
  }

  function isAppleTouchDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function trackMimeType(name = "") {
    const lower = name.toLowerCase();
    if (lower.endsWith(".wav")) return "audio/wav";
    if (lower.endsWith(".m4a")) return "audio/mp4";
    if (lower.endsWith(".ogg")) return "audio/ogg";
    return "audio/mpeg";
  }

  async function saveTrackOnIOS(track, trigger) {
    const filename = trackDownloadName(track);
    const original = trigger.textContent;
    trigger.textContent = "Preparing...";
    trigger.setAttribute("aria-busy", "true");
    try {
      const res = await fetch(track.url, { mode: "cors", cache: "force-cache" });
      if (!res.ok) throw new Error("Track unavailable");
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || trackMimeType(filename) });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        await navigator.share({ files: [file], title: track.title || "Stick With It play-along track" });
      } else {
        window.open(track.url, "_blank", "noopener");
      }
    } catch (err) {
      if (err && err.name === "AbortError") return;
      window.open(track.url, "_blank", "noopener");
    } finally {
      trigger.textContent = original;
      trigger.removeAttribute("aria-busy");
    }
  }

  function gigasectorUrl(track) {
    const params = new URLSearchParams();
    params.set("demo", "1");
    if (track?.url) params.set("track", track.url);
    if (track?.title) params.set("title", track.title);
    const qs = params.toString();
    return `/apps/gigasector/${qs ? "?" + qs : ""}`;
  }

  function renderContestPrizes(el, page = {}) {
    if (!el) return;
    const prizes = Array.isArray(page.prizes) ? page.prizes.filter((p) => p && (p.text || p.value)) : [];
    const legacy = page.prize ? `<p class="contest-prize-note">${esc(page.prize)}</p>` : "";
    if (!prizes.length && !legacy) {
      el.innerHTML = "";
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const rows = prizes.map((p, i) => {
      const place = p.place || (i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `#${i + 1}`);
      const value = p.value ? `<span class="contest-prize-value">${esc(p.value)}</span>` : "";
      return `<li><b>${esc(place)}</b><span>${esc(p.text || "Prize TBA")}</span>${value}</li>`;
    }).join("");
    el.innerHTML = `${rows ? `<div class="contest-prize-title">Prizes</div><ol>${rows}</ol>` : ""}${legacy}`;
  }

  function renderTrack(el, track) {
    if (!track || !track.url) { el.remove(); return; }
    const lbl = el.dataset.label || "Play-along track";
    const downloadText = isAppleTouchDevice() ? "Save track" : "Download track";
    el.innerHTML = `<button class="play" type="button" aria-label="Play the track">▶</button><div class="info"><div class="lbl">${esc(lbl)}</div><div class="t">${esc(track.title || "This month's track")}</div><div class="bar"><i></i></div></div><div class="track-shortcuts"><a class="track-shortcut" href="${esc(track.url)}" download="${esc(trackDownloadName(track))}" data-track-download>${downloadText}</a><a class="track-shortcut" href="${esc(gigasectorUrl(track))}">Open in Gigasector</a></div>`;
    const audio = new Audio(track.url); audio.preload = "none";
    const btn = el.querySelector(".play"), fill = el.querySelector(".bar i");
    const download = el.querySelector("[data-track-download]");
    btn.addEventListener("click", () => { if (audio.paused) audio.play().catch(() => {}); else audio.pause(); });
    download.addEventListener("click", (event) => {
      if (!isAppleTouchDevice()) return;
      event.preventDefault();
      saveTrackOnIOS(track, download);
    });
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

  function artistSlug(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }

  function findArtistProfile(artists, data) {
    const chosen = data.last_winner && data.last_winner.artist_id;
    if (chosen) return artists.find((a) => a.id === chosen);
    const w = (data.winners || [])[0];
    const entry = w && (data.entries || []).find((e) => e.id === w.entry_id);
    if (!entry) return null;
    const entryArtist = artistSlug(entry.artist || "");
    return artists.find((a) => {
      const id = a.id || "";
      const name = artistSlug(a.name);
      return id === entryArtist || name === entryArtist || entryArtist.startsWith(id + "-") || entryArtist.startsWith(name + "-");
    });
  }

  function renderWinner(el, data, artists = []) {
    const artist = findArtistProfile(artists, data);
    if (!artist) {
      el.innerHTML = `<div class="empty">Last winner profile coming soon.</div>`;
      return;
    }
    const month = data.last_winner?.win_month || data.voting_window || "";
    el.innerHTML = `<a class="winner" href="${sitePath("/artist/")}?id=${encodeURIComponent(artist.id)}"><span class="medal">🏆</span><div class="th"><img src="${esc(artist.image || "")}" alt=""></div><div><b>${esc(artist.name)}</b><span class="wl">Contest Winner${month ? " — " + esc(month) : ""}</span></div></a>`;
  }

  function renderGiveaways(data) {
    const section = $("giveaways-section"), list = $("giveaways-list");
    if (!section || !list) return;
    const items = (Array.isArray(data.giveaways) ? data.giveaways : []).filter((g) => g && g.active !== false);
    if (!items.length) {
      section.hidden = true;
      list.innerHTML = "";
      return;
    }
    section.hidden = false;
    list.innerHTML = items.map((g) => `<article class="giveaway-card">${g.image ? `<img src="${esc(g.image)}" alt="">` : ""}<div><b>${esc(g.title || "Giveaway")}</b>${g.description ? `<p>${esc(g.description)}</p>` : ""}<span>${g.end_date ? `Ends ${esc(g.end_date)} · ` : ""}<a href="/contest/terms/">Terms</a></span></div></article>`).join("");
  }

  async function loadContest() {
    const cd = $("countdown"), tk = $("track"), eb = $("contest-eyebrow"),
          entriesEl = $("vote-rail") || $("vote-grid"), win = $("winner"),
          head = $("contest-headline"), tag = $("contest-tagline"),
          prizesEl = $("contest-prizes");
    if (!cd && !tk && !entriesEl && !eb) return;
    let data;
    try { data = await getJSON("/assets/data/contest.json"); }
    catch { if (cd) cd.innerHTML = `<div class="g"><b>Soon</b><span>voting opens</span></div>`; if (tk) tk.remove(); if (entriesEl) entriesEl.innerHTML = `<div class="empty">Couldn't load entries.</div>`; return; }
    const track = data.page && Array.isArray(data.page.tracks) ? data.page.tracks[0] : null;
    if (eb) setEyebrow(eb, data);
    if (cd) renderCountdown(cd, data.ends_at);
    if (tk) renderTrack(tk, track);
    renderContestPrizes(prizesEl, data.page || {});
    if (head && data.page) head.textContent = data.page.headline || "";
    if (tag && data.page) tag.textContent = (data.page.description || [])[0] || "";
    if (entriesEl) renderEntries(entriesEl, data);
    renderGiveaways(data);
    if (win) {
      let artists = [];
      try { artists = (await getJSON("/assets/data/drummers.json")).drummers || []; } catch {}
      renderWinner(win, data, artists);
    }
  }

  /* ---------- artists ---------- */
  const isPodcast = (d) => String(d.id || "").startsWith("stick-together-");
  function artistTile(d) {
    return `<a class="artistcard${d.memorial ? " mem" : ""}" href="${sitePath("/artist/")}?id=${encodeURIComponent(d.id)}"><div class="img"><img src="${esc(d.image)}" alt="" loading="lazy"></div><div class="tx">${d.memorial ? '<span class="memtag">In memoriam</span>' : ""}<div class="nm">${esc(d.name)}</div><div class="bl">${esc(d.blurb || "")}</div><div class="ff">${esc(d.first_featured || "")}</div></div></a>`;
  }
  async function loadArtists() {
    const featEl = $("artist-featured"), subEl = $("artist-sub"), gridEl = $("artist-grid");
    if (!featEl && !gridEl) return;
    let data; try { data = await getJSON("/assets/data/drummers.json"); } catch { if (gridEl) gridEl.innerHTML = `<div class="empty">Artists unavailable.</div>`; return; }
    const all = (data.drummers || []).filter((d) => d.active !== false && !isPodcast(d)).sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const hero = all.find((d) => !d.memorial) || all[0];
    const rest = all.filter((d) => d !== hero);
    if (featEl && hero) featEl.innerHTML = `<a class="feat-hero" href="${sitePath("/artist/")}?id=${encodeURIComponent(hero.id)}"><div class="img"><img src="${esc(hero.image)}" alt=""></div><div class="tx"><span class="kick">Featured</span><div class="nm">${esc(hero.name)}</div><div class="bl">${esc(hero.blurb || "")}</div><div class="ff">${esc(hero.first_featured || "")}</div></div></a>`;
    if (subEl) subEl.innerHTML = rest.slice(0, 3).map(artistTile).join("");
    if (gridEl) gridEl.innerHTML = rest.slice(3).map(artistTile).join("");
  }

  async function loadArtistDetail() {
    const nameEl = $("a-name"); if (!nameEl) return;
    let data; try { data = await getJSON("/assets/data/drummers.json"); } catch { nameEl.textContent = "Artist unavailable"; return; }
    let contest = {};
    try { contest = await getJSON("/assets/data/contest.json"); } catch {}
    const pathId = (location.pathname.match(/^\/(?:test\/)?artist\/([^/]+)/) || [])[1] || "";
    const id = new URLSearchParams(location.search).get("id") || pathId;
    const list = data.drummers || [];
    const a = list.find((d) => d.id === id) || list[0];
    if (!a) return;
    $("a-hero").innerHTML = `<img src="${esc(a.image)}" alt="">`;
    nameEl.textContent = a.name;
    $("a-ff").textContent = a.first_featured || "";
    $("a-bio").textContent = a.blurb || "";
    const wins = Array.isArray(a.wins) ? a.wins.slice() : [];
    if (contest.last_winner?.artist_id === a.id) {
      wins.unshift({ month: contest.last_winner.win_month || contest.voting_window || "", label: "Contest Winner" });
    }
    const badgeEl = $("a-badges");
    if (badgeEl) badgeEl.innerHTML = wins.length ? wins.map((w) => `<span class="winner-badge">🏆 ${esc(w.label || "Contest Winner")}${w.month ? " — " + esc(w.month) : ""}</span>`).join("") : "";
    const emb = ytEmbed(a.playlist_url);
    $("a-playlist").innerHTML = emb ? `<iframe class="yt" src="${emb}" title="${esc(a.name)} playlist" loading="lazy" allow="encrypted-media" allowfullscreen></iframe>` : `<div class="empty">No videos yet.</div>`;
    const socs = a.socials || [];
    $("a-socials").innerHTML = socs.length ? socs.map((s) => `<a class="soc" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)} <span class="ext">↗</span></a>`).join("") : `<span class="muted" style="font-size:.78rem">No links listed.</span>`;
    document.title = `${a.name} — Stick With It`;
  }

  /* ---------- store (More page) ---------- */
  async function loadMarket() {
    const el = $("store-grid"); if (!el) return;
    let data; try { data = await getJSON("/assets/data/market.json"); } catch { el.innerHTML = `<div class="empty">Store loading soon.</div>`; return; }
    const products = (data.products || []).filter((p) => p.active !== false);
    if (!products.length) { el.innerHTML = `<div class="empty">New drops soon.</div>`; return; }
    el.innerHTML = products.map((p) => `<a class="merchcard" href="${esc(p.url || "/store/")}" target="_blank" rel="noopener"><div class="mi">${p.image ? `<img src="${esc(p.image)}" alt="" loading="lazy">` : "🛍️"}</div><div class="mb"><b>${esc(p.title)}</b>${p.price ? `<span class="pr">${esc(p.price)}</span>` : ""}${p.blurb ? `<span class="st">${esc(p.blurb)}</span>` : ""}</div></a>`).join("");
  }

  function initSubmitPreview() {
    const btn = $("submit-btn"); if (!btn) return;
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const n = $("submit-note");
      if (n) n.textContent = "Preview - on the live site this uploads your clip to the current contest.";
    });
  }

  initThemeToggle(); initPlayer(); initChat(); loadContest(); loadArtists(); loadArtistDetail(); loadMarket(); initSubmitPreview();
})();
