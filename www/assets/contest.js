(() => {
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char]));

  function cookie(name) {
    return document.cookie.split("; ").find((part) => part.startsWith(`${name}=`))?.split("=")[1] || "";
  }

  function setVoteCookie(name, value) {
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 2);
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
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

  function renderPage(page = {}) {
    const title = document.getElementById("contest-title");
    const description = document.getElementById("contest-description");
    const prize = document.getElementById("contest-prize");
    const steps = document.getElementById("contest-steps");

    title.textContent = page.headline || "Contest";
    document.title = `${page.headline || "Contest"} | Stick With It`;

    const paragraphs = Array.isArray(page.description) ? page.description.filter(Boolean) : [];
    description.innerHTML = paragraphs.map((text) => `<p>${esc(text)}</p>`).join("");

    if (page.prize) {
      prize.hidden = false;
      prize.textContent = page.prize;
    } else {
      prize.hidden = true;
      prize.textContent = "";
    }

    const stepItems = Array.isArray(page.steps) ? page.steps : [];
    steps.innerHTML = stepItems.map((step, index) => `
      <article class="step-card">
        <span class="step-number" aria-hidden="true">${index + 1}</span>
        <h3>${esc(step.title)}</h3>
        <p>${esc(step.text)}</p>
      </article>
    `).join("");
  }

  function renderVideo(page = {}) {
    const wrap = document.getElementById("contest-video");
    const id = String(page.youtube_video_id || "").trim();
    if (!id || !/^[A-Za-z0-9_-]{6,}$/.test(id)) {
      wrap.innerHTML = "";
      return;
    }

    wrap.innerHTML = `
      <button class="youtube-facade" type="button" aria-label="Play contest explainer video">
        <span class="youtube-play" aria-hidden="true"></span>
        <span class="youtube-label">Watch the explainer</span>
      </button>
    `;
    wrap.querySelector("button").addEventListener("click", () => {
      wrap.innerHTML = `<iframe class="youtube-frame" src="https://www.youtube-nocookie.com/embed/${esc(id)}?autoplay=1&rel=0" title="Contest explainer video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    }, { once: true });
  }

  function renderTracks(page = {}) {
    const wrap = document.getElementById("contest-tracks");
    const tracks = Array.isArray(page.tracks) ? page.tracks.filter((track) => track && track.url) : [];

    if (!tracks.length) {
      wrap.innerHTML = '<p class="empty-state">This month&#39;s track drops soon.</p>';
      return;
    }

    wrap.innerHTML = tracks.map((track) => `
      <article class="track-card">
        <h3>${esc(track.title || "Play-along track")}</h3>
        <audio controls preload="none" src="${esc(track.url)}"></audio>
        ${track.note ? `<p>${esc(track.note)}</p>` : ""}
        <a class="track-download" href="${esc(track.url)}" download>Download track</a>
      </article>
    `).join("");
  }

  function mediaMarkup(entry) {
    if (entry.video) {
      return `<video class="vote-video" controls muted playsinline preload="metadata" poster="${esc(entry.image || "")}" src="${esc(entry.video)}"></video>`;
    }
    if (entry.image) {
      return `<img class="thumb" src="${esc(entry.image)}" alt="${esc(entry.title || "Contest entry")}">`;
    }
    return '<div class="thumb" aria-hidden="true">SWI</div>';
  }

  function renderEntries(data = {}) {
    const grid = document.getElementById("vote-grid");
    const entries = (Array.isArray(data.entries) ? data.entries : []).filter((entry) => entry.active !== false);
    const contestId = data.id || "monthly";
    const voteCookie = `swi_vote_${contestId}`;
    const votedFor = decodeURIComponent(cookie(voteCookie));

    if (!entries.length) {
      grid.innerHTML = '<p class="empty-state">Entries will appear here when voting opens.</p>';
      return;
    }

    grid.innerHTML = entries.map((entry) => {
      const isVoted = votedFor === entry.id;
      const disabled = Boolean(votedFor) || data.voting_open === false;
      return `<article class="vote-card" data-entry-id="${esc(entry.id)}">
        ${mediaMarkup(entry)}
        <div>
          <h3>${esc(entry.title)}</h3>
          <p>${esc(entry.artist || entry.blurb || "")}</p>
        </div>
        <button class="vote-button" type="button" ${disabled ? "disabled" : ""}>${isVoted ? "Vote saved" : disabled ? "Voting closed" : "Vote"}</button>
      </article>`;
    }).join("");

    grid.querySelectorAll(".vote-button").forEach((button) => {
      button.addEventListener("click", () => {
        const card = button.closest("[data-entry-id]");
        const entryId = card?.getAttribute("data-entry-id");
        if (!entryId) return;
        setVoteCookie(voteCookie, entryId);
        grid.querySelectorAll(".vote-button").forEach((node) => {
          node.disabled = true;
          node.textContent = node === button ? "Vote saved" : "Already voted";
        });
      });
    });
  }

  function renderArchive(data = {}) {
    const section = document.getElementById("contest-archive-section");
    const wrap = document.getElementById("contest-archive");
    const archive = Array.isArray(data.archive) ? data.archive : [];

    if (!archive.length) {
      section.hidden = true;
      wrap.innerHTML = "";
      return;
    }

    section.hidden = false;
    wrap.innerHTML = archive.map((item) => {
      const winner = item.winner || null;
      return `<article class="archive-card">
        ${item.image ? `<img src="${esc(item.image)}" alt="${esc(winner?.name || item.label || "Past contest")}">` : '<div class="thumb" aria-hidden="true">SWI</div>'}
        <div class="archive-card__body">
          <h3>${esc(item.label)}</h3>
          ${winner ? `<p>Winner: ${esc(winner.name)}${winner.title ? ` - ${esc(winner.title)}` : ""}</p>` : ""}
          ${item.video ? `<a href="${esc(item.video)}">Watch winner</a>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  async function loadContest() {
    const countdown = document.getElementById("contest-countdown");
    try {
      const response = await fetch("/assets/data/contest.json?ts=" + Date.now(), { cache: "no-store" });
      const data = await response.json();
      const page = data.page || {};
      startCountdown(countdown, data.ends_at);
      renderPage(page);
      renderVideo(page);
      renderTracks(page);
      renderEntries(data);
      renderArchive(data);
    } catch {
      countdown.classList.remove("is-loading");
      countdown.textContent = "Voting soon";
      document.getElementById("contest-description").innerHTML = '<p>Contest details are unavailable right now.</p>';
      document.getElementById("contest-tracks").innerHTML = '<p class="empty-state">This month&#39;s track drops soon.</p>';
      document.getElementById("vote-grid").innerHTML = '<p class="empty-state">Entries will appear here when voting opens.</p>';
    }
  }

  loadContest();
})();
