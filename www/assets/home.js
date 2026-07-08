(() => {
  const STREAM_URL = "https://stream.stickwithit.xyz/live/live.m3u8";
  const RETRY_MS = 8000;
  const esc = (value) => String(value ?? "").replace(/[&<"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", '"': "&quot;" }[char]));

  function initLivePlayer() {
    const video = document.getElementById("home-player");
    const status = document.getElementById("home-live-status");
    const liveButton = document.getElementById("home-go-live");
    if (!video || !status || !liveButton) return;

    let hlsRef = null;

    const setStatus = (message) => { status.textContent = message || ""; };
    const liveEdgeTime = () => {
      if (hlsRef && hlsRef.liveSyncPosition != null) return hlsRef.liveSyncPosition;
      const ranges = video.seekable;
      return ranges.length ? ranges.end(ranges.length - 1) : NaN;
    };
    const atLiveEdge = () => {
      const edge = liveEdgeTime();
      return Number.isNaN(edge) ? true : edge - video.currentTime < 8;
    };

    liveButton.addEventListener("click", () => {
      const edge = liveEdgeTime();
      if (!Number.isNaN(edge)) video.currentTime = edge;
      video.play().catch(() => {});
    });

    setInterval(() => {
      const live = atLiveEdge() && !video.paused;
      liveButton.classList.toggle("is-live", live);
      liveButton.querySelector("span:last-child").textContent = live ? "LIVE" : "GO LIVE";
    }, 1000);

    function startHlsJs() {
      hlsRef = new Hls({
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 15,
        backBufferLength: 120,
        manifestLoadingMaxRetry: 4,
        levelLoadingMaxRetry: 4,
        fragLoadingMaxRetry: 4,
      });
      hlsRef.loadSource(STREAM_URL);
      hlsRef.attachMedia(video);
      hlsRef.on(Hls.Events.MANIFEST_PARSED, () => {
        setStatus("");
        video.play().catch(() => setStatus("Tap play to start the live stream."));
      });
      hlsRef.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        setStatus("Stream unavailable - retrying...");
        hlsRef.destroy();
        hlsRef = null;
        setTimeout(startHlsJs, RETRY_MS);
      });
    }

    function startNative() {
      video.src = STREAM_URL;
      video.addEventListener("error", () => {
        setStatus("Stream unavailable - retrying...");
        setTimeout(() => {
          video.src = STREAM_URL;
          video.play().catch(() => {});
        }, RETRY_MS);
      });
      video.play().catch(() => setStatus("Tap play to start the live stream."));
    }

    if (window.Hls && Hls.isSupported()) startHlsJs();
    else if (video.canPlayType("application/vnd.apple.mpegurl")) startNative();
    else setStatus("This browser cannot play the live stream.");
  }

  function cookie(name) {
    return document.cookie.split("; ").find((part) => part.startsWith(`${name}=`))?.split("=")[1] || "";
  }

  function setVoteCookie(name, value) {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 2);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
  }

  function initCarouselControls() {
    document.querySelectorAll("[data-carousel]").forEach((button) => {
      button.addEventListener("click", () => {
        const target = button.getAttribute("data-carousel") === "drummers"
          ? document.getElementById("home-drummers")
          : document.getElementById("vote-grid");
        if (!target) return;
        const direction = Number(button.getAttribute("data-dir") || 1);
        const card = target.querySelector(":scope > *");
        const amount = card ? card.getBoundingClientRect().width + 14 : target.clientWidth * 0.85;
        target.scrollBy({ left: amount * direction, behavior: "smooth" });
      });
    });
  }

  function startCountdown(target, dateValue) {
    const end = new Date(dateValue || "");
    target.classList.remove("is-loading");
    if (Number.isNaN(end.getTime())) {
      target.textContent = "This month";
      return;
    }

    const render = () => {
      const ms = end.getTime() - Date.now();
      if (ms <= 0) {
        target.textContent = "Voting closes soon";
        return;
      }
      const totalMinutes = Math.floor(ms / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      target.innerHTML = `<span>${days}</span><small>days</small><span>${String(hours).padStart(2, "0")}</span><small>hrs</small><span>${String(minutes).padStart(2, "0")}</span><small>min</small>`;
    };

    render();
    setInterval(render, 60000);
  }

  async function loadContest() {
    const countdown = document.getElementById("contest-countdown");
    const grid = document.getElementById("vote-grid");
    const shell = document.getElementById("vote-shell");
    if (!countdown || !grid) return;
    const hasStaticEntries = grid.children.length > 0;

    try {
      const response = await fetch("/assets/data/contest.json?ts=" + Date.now(), { cache: "no-store" });
      const data = await response.json();
      const entries = (Array.isArray(data.entries) ? data.entries : []).filter((entry) => entry.active !== false);
      const contestId = data.id || "monthly";
      const voteCookie = `swi_vote_${contestId}`;
      const votedFor = decodeURIComponent(cookie(voteCookie));
      startCountdown(countdown, data.ends_at);

      if (!entries.length) {
        shell?.classList.add("is-hidden");
        return;
      }

      grid.innerHTML = entries.map((entry) => {
        const isVoted = votedFor === entry.id;
        const disabled = Boolean(votedFor) || data.voting_open === false;
        return `<article class="vote-card" data-entry-id="${esc(entry.id)}">
          ${entry.video ? `<video class="vote-video" controls muted playsinline preload="metadata" poster="${esc(entry.image || "")}" src="${esc(entry.video)}"></video>` : entry.image ? `<img class="thumb" src="${esc(entry.image)}" alt="">` : '<div class="thumb">SWI</div>'}
          <div>
            <h3>${esc(entry.title)}</h3>
            <p>${esc(entry.artist || entry.blurb || "")}</p>
          </div>
          <button class="vote-button" type="button" ${disabled ? "disabled" : ""}>${isVoted ? "Vote saved" : disabled ? "Voting closed" : "Vote"}</button>
        </article>`;
      }).join("");
      shell?.classList.remove("is-hidden");

      grid.querySelectorAll(".vote-button").forEach((button) => {
        button.addEventListener("click", () => {
          const card = button.closest("[data-entry-id]");
          const entryId = card?.getAttribute("data-entry-id");
          if (!entryId) return;
          setVoteCookie(voteCookie, entryId);
          // TODO: POST to a contest vote endpoint that also enforces one vote per IP for this monthly contest.
          grid.querySelectorAll(".vote-button").forEach((node) => {
            node.disabled = true;
            node.textContent = node === button ? "Vote saved" : "Already voted";
          });
        });
      });
    } catch {
      countdown.textContent = "Voting soon";
      if (!hasStaticEntries) shell?.classList.add("is-hidden");
    }
  }

  async function loadMarket() {
    const wrap = document.getElementById("home-market");
    if (!wrap) return;

    try {
      const response = await fetch("/assets/data/market.json?ts=" + Date.now(), { cache: "no-store" });
      const data = await response.json();
      const products = (Array.isArray(data.products) ? data.products : []).filter((product) => product.active !== false);
      const mockProducts = [
        { title: "Stick With It Tee", blurb: "First drop mockup", price: "$28", image: "/assets/StickWithItBlack.png", url: "/store/" },
        { title: "Practice Pad Pack", blurb: "Warmup essentials", price: "$18", image: "/assets/StickWithItBlack.png", url: "/store/" },
        { title: "Contest Track", blurb: "Download + submit", price: "$5", image: "/assets/StickWithItBlack.png", url: "/store/" },
      ];
      const items = products.length ? products.slice(0, 6) : mockProducts;
      wrap.innerHTML = items.map((product) => `
        <a class="market-card" href="${esc(product.url)}" target="_blank" rel="noopener">
          ${product.image ? `<img src="${esc(product.image)}" alt="">` : '<div class="thumb">SWI</div>'}
          <div>
            <strong>${esc(product.title)}</strong>
            ${product.blurb ? `<span>${esc(product.blurb)}</span>` : ""}
            ${product.price ? `<span class="price">${esc(product.price)}</span>` : ""}
          </div>
        </a>`).join("");
    } catch {
      wrap.innerHTML = '<div class="empty-state">Store unavailable.</div>';
    }
  }

  async function loadDrummers() {
    const wrap = document.getElementById("home-drummers");
    if (!wrap) return;

    try {
      const response = await fetch("/assets/data/drummers.json?ts=" + Date.now(), { cache: "no-store" });
      const data = await response.json();
      const drummers = (Array.isArray(data.drummers) ? data.drummers : [])
        .filter((drummer) => drummer.active !== false)
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999) || String(a.name || "").localeCompare(String(b.name || "")));

      wrap.innerHTML = drummers.length ? drummers.map((drummer) => {
        const href = drummer.playlist_url || drummer.lessons_url || "/drummers/";
        return `<a class="drummer-card${drummer.memorial ? " memorial" : ""}" href="${esc(href)}" ${href.startsWith("http") ? 'target="_blank" rel="noopener"' : ""}>
          ${drummer.image ? `<img src="${esc(drummer.image)}" alt="">` : '<div class="thumb">SWI</div>'}
          <div>
            ${drummer.memorial ? '<span class="label">In Memoriam</span>' : ""}
            <strong>${esc(drummer.name)}</strong>
            <span>${esc(drummer.first_featured || drummer.blurb || "")}</span>
          </div>
        </a>`;
      }).join("") : '<div class="empty-state">More artists soon.</div>';
    } catch {
      wrap.innerHTML = '<div class="empty-state">Artists unavailable.</div>';
    }
  }

  initLivePlayer();
  initCarouselControls();
  loadContest();
  loadMarket();
  loadDrummers();
})();
