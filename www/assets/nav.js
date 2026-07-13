(() => {
  const THEME_KEY = "swi-theme";
  const themes = ["dark", "light"];

  function requestedTheme() {
    try {
      const value = new URLSearchParams(window.location.search).get("theme");
      return themes.includes(value) ? value : "";
    } catch {
      return "";
    }
  }

  function requestedMenuOpen() {
    try {
      return new URLSearchParams(window.location.search).get("menu") === "open";
    } catch {
      return false;
    }
  }

  function savedTheme() {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      return themes.includes(stored) ? stored : "";
    } catch {
      return "";
    }
  }

  function applyTheme(theme, persist = false, emit = false) {
    const next = themes.includes(theme) ? theme : "dark";
    document.documentElement.setAttribute("data-theme", next);
    if (persist) {
      try { localStorage.setItem(THEME_KEY, next); } catch {}
    }
    updateThemeButtons(next);
    if (emit) {
      window.dispatchEvent(new CustomEvent("swi-theme-change", { detail: { theme: next } }));
    }
  }

  applyTheme(requestedTheme() || savedTheme() || "dark", Boolean(requestedTheme()));

  const LOGO_SRC = "/assets/StickWithItBlack.png";
  const primaryLinks = [
    { href: "/", label: "Live" },
    { href: "/contest/", label: "Contest" },
    { href: "/apps/", label: "Apps" },
    { href: "/artists/", label: "Artists" },
    { href: "/more/", label: "More" },
  ];
  const appLinks = [
    { href: "/apps/metrognome/", label: "MetroGnome", note: "Timing" },
    { href: "/apps/chopmeister/", label: "Chopmeister", note: "Chops" },
    { href: "/apps/gigasector/", label: "Gigasector", note: "Setlists" },
    { href: "/apps/rudimentor/", label: "Rudimentor", note: "Rudiments" },
  ];

  function normalize(pathname) {
    const path = pathname || "/";
    if (path === "/index.html") return "/";
    return path.endsWith("/") ? path : `${path}/`;
  }

  function isCurrent(href) {
    const here = normalize(window.location.pathname);
    const target = normalize(href);
    return target === "/" ? here === "/" : here.startsWith(target);
  }

  function link({ href, label }, className) {
    const node = document.createElement("a");
    node.className = className;
    node.href = href;
    node.textContent = label;
    if (isCurrent(href)) node.setAttribute("aria-current", "page");
    return node;
  }

  function appLink(item, className) {
    const node = link(item, className);
    if (className === "swi-app-link") {
      node.innerHTML = `${item.label}<span>${item.note}</span>`;
    }
    return node;
  }

  function updateThemeSwitch(input, theme = document.documentElement.getAttribute("data-theme") || "dark") {
    input.checked = theme === "light";
    input.setAttribute("aria-label", `Switch to ${theme === "light" ? "dark" : "light"} mode`);
  }

  function updateThemeButtons(theme = document.documentElement.getAttribute("data-theme") || "dark") {
    document.querySelectorAll(".swi-theme-switch input").forEach((input) => {
      updateThemeSwitch(input, theme);
    });
  }

  function themeSwitch(className = "") {
    const label = document.createElement("label");
    label.className = ["swi-theme-switch", className].filter(Boolean).join(" ");
    label.innerHTML = '<input type="checkbox" role="switch"><i aria-hidden="true"></i><span class="swi-theme-label">Theme</span>';
    const input = label.querySelector("input");
    input.addEventListener("change", () => {
      applyTheme(input.checked ? "light" : "dark", true, true);
    });
    updateThemeSwitch(input);
    return label;
  }

  function classifyBody() {
    const path = normalize(window.location.pathname);
    document.body.classList.add("swi-has-nav");
    if (path === "/") document.body.classList.add("swi-home-page");
    if (path.startsWith("/apps/")) document.body.classList.add("swi-app-shell");
    if (path.startsWith("/live/")) document.body.classList.add("swi-live-page");
    if (path.startsWith("/submit/")) document.body.classList.add("swi-submit-page");
    if (!path.startsWith("/apps/") && !path.startsWith("/live/")) {
      document.body.classList.add("swi-content-page");
    }
  }

  function mount() {
    if (!document.body || document.querySelector(".swi-site-header")) return;
    classifyBody();

    const header = document.createElement("header");
    header.className = "swi-site-header";
    header.setAttribute("role", "banner");

    const inner = document.createElement("div");
    inner.className = "swi-nav-inner";

    const brand = document.createElement("a");
    brand.className = "swi-brand";
    brand.href = "/";
    brand.setAttribute("aria-label", "Stick With It home");
    brand.innerHTML = `<img class="swi-brand-mark" src="${LOGO_SRC}" alt=""><span class="swi-brand-word">Stick With It</span>`;
    inner.appendChild(brand);

    const desktopNav = document.createElement("nav");
    desktopNav.className = "swi-desktop-nav";
    desktopNav.setAttribute("aria-label", "Primary");
    primaryLinks.forEach((item) => desktopNav.appendChild(link(item, "swi-nav-link")));

    inner.appendChild(desktopNav);

    const navActions = document.createElement("div");
    navActions.className = "swi-nav-actions";
    navActions.appendChild(themeSwitch("swi-theme-switch--icon"));

    const menuButton = document.createElement("button");
    menuButton.className = "swi-menu-button";
    menuButton.type = "button";
    menuButton.setAttribute("aria-label", "Open site navigation");
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.innerHTML = "<span></span>";
    navActions.appendChild(menuButton);
    inner.appendChild(navActions);
    header.appendChild(inner);

    const mobileNav = document.createElement("nav");
    mobileNav.className = "swi-menu-panel";
    mobileNav.setAttribute("aria-label", "Site menu");
    mobileNav.hidden = true;
    const primarySection = document.createElement("div");
    primarySection.className = "swi-menu-primary";
    primaryLinks.forEach((item) => primarySection.appendChild(link(item, "swi-mobile-link")));
    mobileNav.appendChild(primarySection);
    const section = document.createElement("div");
    section.className = "swi-mobile-section";
    section.textContent = "Apps";
    mobileNav.appendChild(section);
    appLinks.forEach((item) => mobileNav.appendChild(link(item, "swi-mobile-link")));
    header.appendChild(mobileNav);

    function setOpen(open) {
      header.classList.toggle("is-open", open);
      mobileNav.hidden = !open;
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close site navigation" : "Open site navigation");
    }

    menuButton.addEventListener("click", () => setOpen(mobileNav.hidden));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setOpen(false);
    });
    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) setOpen(false);
    });

    if (requestedMenuOpen()) setOpen(true);

    document.body.insertBefore(header, document.body.firstChild);
  }

  // ---- Feedback modal ------------------------------------------------
  let fbToken = "";
  let fbWidget = null;

  function loadTurnstile(container, statusEl) {
    fetch("/api/submit/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((cfg) => {
        if (!cfg.enabled || !cfg.sitekey) return;
        const render = () => {
          fbWidget = window.turnstile.render(container, {
            sitekey: cfg.sitekey,
            callback: (t) => { fbToken = t; },
            "expired-callback": () => { fbToken = ""; },
          });
        };
        if (window.turnstile) { render(); return; }
        const s = document.createElement("script");
        s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        s.async = true;
        s.onload = render;
        s.onerror = () => {
          statusEl.textContent = "Verification blocked \u2014 disable ad blocker for this site.";
        };
        document.head.appendChild(s);
      })
      .catch(() => {});
  }

  function openFeedback() {
    let overlay = document.querySelector(".swi-feedback-overlay");
    if (overlay) { overlay.hidden = false; return; }

    overlay = document.createElement("div");
    overlay.className = "swi-feedback-overlay";
    overlay.innerHTML = [
      '<div class="swi-feedback-card" role="dialog" aria-modal="true" aria-label="Send feedback">',
      '<button class="swi-feedback-close" type="button" aria-label="Close">\u00d7</button>',
      "<h2>Feedback</h2>",
      '<p class="swi-feedback-sub">Bug, idea, or request \u2014 goes straight to the crew.</p>',
      '<textarea class="swi-feedback-text" maxlength="2000" rows="5" placeholder="What\u2019s on your mind?"></textarea>',
      '<input class="swi-feedback-email" type="email" maxlength="120" placeholder="Email (optional, if you want a reply)">',
      '<div class="swi-feedback-turnstile"></div>',
      '<div class="swi-feedback-row">',
      '<button class="swi-feedback-send" type="button">Send</button>',
      '<span class="swi-feedback-status" role="status"></span>',
      "</div></div>",
    ].join("");
    document.body.appendChild(overlay);

    const card = overlay.querySelector(".swi-feedback-card");
    const status = overlay.querySelector(".swi-feedback-status");
    const close = () => { overlay.hidden = true; };
    overlay.querySelector(".swi-feedback-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (!card.contains(e.target)) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

    loadTurnstile(overlay.querySelector(".swi-feedback-turnstile"), status);

    overlay.querySelector(".swi-feedback-send").addEventListener("click", () => {
      const msg = overlay.querySelector(".swi-feedback-text").value.trim();
      const email = overlay.querySelector(".swi-feedback-email").value.trim();
      if (msg.length < 3) { status.textContent = "Write a little more first."; return; }
      status.textContent = "Sending\u2026";
      fetch("/api/submit/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Turnstile-Token": fbToken },
        body: JSON.stringify({ message: msg, email, page: window.location.pathname }),
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.ok) {
            card.innerHTML = '<h2>Thanks! \ud83e\udd41</h2><p class="swi-feedback-sub">Message received.</p>';
            setTimeout(close, 2200);
          } else {
            status.textContent = d.error || "Something went wrong \u2014 try again.";
            if (fbWidget !== null && window.turnstile) window.turnstile.reset(fbWidget);
            fbToken = "";
          }
        })
        .catch(() => { status.textContent = "Network error \u2014 try again."; });
    });
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  }
})();
