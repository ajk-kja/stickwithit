(function () {
  "use strict";

  const params = new URLSearchParams(location.search);
  const requested = params.get("demo") === "1" || params.has("track");

  function hashToId(value) {
    let hash = 0;
    const text = String(value || "stickwithit-demo");
    for (let i = 0; i < text.length; i += 1) {
      hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
    }
    return 9000000000000 + Math.abs(hash);
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("GignailerDB", 2);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("songs")) {
          const songs = db.createObjectStore("songs", { keyPath: "id" });
          songs.createIndex("name", "name", { unique: false });
          songs.createIndex("uploadedAt", "uploadedAt", { unique: false });
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "key" });
        }
      };
    });
  }

  function txDone(tx) {
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  function getAllSongs(db) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(["songs"], "readonly").objectStore("songs").getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result || []);
    });
  }

  async function setActiveSong(db, id) {
    const tx = db.transaction(["settings"], "readwrite");
    tx.objectStore("settings").put({ key: "activeSongId", value: id });
    await txDone(tx);
  }

  async function loadContestTrack() {
    let contest = null;
    try {
      const res = await fetch("/assets/data/contest.json?ts=" + Date.now(), { cache: "no-store" });
      if (res.ok) contest = await res.json();
    } catch (err) {
      console.warn("[StickWithIt] Contest data unavailable for demo preload", err);
    }
    const jsonTrack = contest?.page?.tracks?.find((track) => track && track.url) || null;
    const url = params.get("track") || jsonTrack?.url || "";
    if (!url) return null;
    const title = params.get("title") || jsonTrack?.title || "Contest track";
    const month = contest?.voting_window || "";
    const contestId = contest?.id || "monthly";
    return {
      idSeed: `${contestId}:${url}:${title}`,
      url: new URL(url, location.origin).href,
      name: `${month ? month + " - " : ""}${title} (demo)`,
    };
  }

  async function preloadDemoTrack() {
    if (!requested || !("indexedDB" in window)) return null;
    const track = await loadContestTrack();
    if (!track) return null;
    const id = hashToId(track.idSeed);
    const db = await openDb();
    try {
      const existing = (await getAllSongs(db)).find((song) => song && (song.id === id || song.name === track.name));
      if (existing) {
        await setActiveSong(db, existing.id);
        window.__swiDemoSongId = existing.id;
        return existing;
      }

      const res = await fetch(track.url, { mode: "cors", cache: "force-cache" });
      if (!res.ok) throw new Error(`track fetch failed: ${res.status}`);
      const audioData = await res.arrayBuffer();
      const song = {
        id,
        name: track.name,
        duration: 0,
        audioData,
        fileType: res.headers.get("Content-Type") || "audio/mpeg",
        fileSize: audioData.byteLength,
        uploadedAt: new Date().toISOString(),
        markers: { introStart: 0, introEnd: 0, outroStart: 0, outroEnd: 0 },
        loopState: { ab: false, cd: false },
        bpmMode: "manual",
        detectedBPM: null,
        manualBPM: 120,
        source: "stickwithit-contest-demo",
        sourceUrl: track.url,
      };
      const tx = db.transaction(["songs", "settings"], "readwrite");
      tx.objectStore("songs").put(song);
      tx.objectStore("settings").put({ key: "activeSongId", value: id });
      await txDone(tx);
      window.__swiDemoSongId = id;
      return song;
    } finally {
      db.close();
    }
  }

  window.__swiDemoPreloadReady = preloadDemoTrack().catch((err) => {
    console.warn("[StickWithIt] Demo track preload skipped", err);
    return null;
  });
})();
