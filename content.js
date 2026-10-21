// Learning Only for YouTube
// Hides recommended videos unless their YouTube category is educational.
// The category is the one the uploader picked; this script doesn't guess.

const LEARNING = ["Education", "Science & Technology", "Howto & Style"];

// Recommendation tiles: home grid, watch-page sidebar, Shorts shelf.
// ytd-rich-item-renderer wraps a whole home tile, so it is checked first.
const TILE_OUTER = "ytd-rich-item-renderer";
const TILE_INNER = [
  "yt-lockup-view-model",
  "ytd-compact-video-renderer",
  "ytm-shorts-lockup-view-model",
  "ytm-shorts-lockup-view-model-v2",
  "ytd-reel-item-renderer",
].join(",");

const CACHE_PREFIX = "learning-only:";
const FALLBACK_CLIENT_VERSION = "2.20261020.05.00";
const MAX_PARALLEL = 6;

const memory = new Map();
const queue = [];
let running = 0;
let shown = 0;
let hidden = 0;
let clientVersion;

// Only filter recommendations: home and the watch page. Search, channels
// and subscriptions are things the user asked for, so leave them alone.
function isFilteredPage() {
  return location.pathname === "/" || location.pathname === "/watch";
}

function videoId(href) {
  const m = href.match(/[?&]v=([\w-]{11})/) || href.match(/\/shorts\/([\w-]{11})/);
  return m && m[1];
}

function getClientVersion() {
  if (!clientVersion) {
    const m = document.documentElement.innerHTML.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/);
    clientVersion = m ? m[1] : FALLBACK_CLIENT_VERSION;
  }
  return clientVersion;
}

function readCache(id) {
  if (memory.has(id)) return memory.get(id);
  try {
    return localStorage.getItem(CACHE_PREFIX + id);
  } catch {
    return null;
  }
}

function writeCache(id, category) {
  memory.set(id, category);
  try {
    localStorage.setItem(CACHE_PREFIX + id, category);
  } catch {}
}

// The player endpoint is what YouTube's own page calls. Its answer is about
// 13 KB and includes the category. If it changes, fall back to the watch page.
async function fetchCategory(id) {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        videoId: id,
        context: { client: { clientName: "WEB", clientVersion: getClientVersion(), hl: "en" } },
      }),
    });
    const data = await res.json();
    const category = data?.microformat?.playerMicroformatRenderer?.category;
    if (category) return category;
  } catch {}

  const html = await (await fetch(`https://www.youtube.com/watch?v=${id}&hl=en`)).text();
  const m = html.match(/"category":"([^"]+)"/);
  return m ? m[1] : null;
}

// Decisions are applied together once per frame, so the grid reflows once
// instead of jumping for every single tile.
const decisions = [];
let frameRequested = false;

function decide(tile, category) {
  decisions.push([tile, category]);
  if (frameRequested) return;
  frameRequested = true;
  requestAnimationFrame(applyDecisions);
}

function applyDecisions() {
  frameRequested = false;
  for (const [tile, category] of decisions.splice(0)) {
    tile.classList.remove("lo-pending");
    // Unknown category: show the tile rather than risk an empty page.
    if (category && !LEARNING.includes(category)) {
      tile.classList.add("lo-hidden");
      hidden++;
    } else {
      shown++;
    }
  }
  updateCounter();
}

function pump() {
  while (running < MAX_PARALLEL && queue.length) {
    const { id, tiles } = queue.shift();
    running++;
    fetchCategory(id)
      .then(category => {
        if (category) writeCache(id, category);
        tiles.forEach(t => decide(t, category));
      })
      .catch(() => tiles.forEach(t => decide(t, null)))
      .finally(() => {
        running--;
        pump();
      });
  }
}

function check(tile, id) {
  if (tile.dataset.loId === id) return;
  tile.dataset.loId = id;
  tile.classList.remove("lo-hidden");

  const cached = readCache(id);
  if (cached) return decide(tile, cached);

  tile.classList.add("lo-pending");
  const waiting = queue.find(q => q.id === id);
  if (waiting) waiting.tiles.push(tile);
  else queue.push({ id, tiles: [tile] });
  pump();
}

const LINK = 'a[href*="/watch?v="], a[href^="/shorts/"]';

// A full scan re-checks every tile (YouTube reuses tile elements when you
// navigate). A quick scan only looks at tiles that haven't been seen yet.
function scan(full) {
  if (!isFilteredPage()) return;
  const selector = full
    ? `${TILE_OUTER}, ${TILE_INNER}`
    : `${TILE_OUTER}:not([data-lo-id]), :is(${TILE_INNER}):not([data-lo-id])`;
  document.querySelectorAll(selector).forEach(el => {
    const tile = el.closest(TILE_OUTER) || el;
    const link = tile.querySelector(LINK);
    const id = link && videoId(link.getAttribute("href"));
    if (id) check(tile, id);
  });
}

function updateCounter() {
  let el = document.getElementById("lo-counter");
  if (!el) {
    el = document.createElement("div");
    el.id = "lo-counter";
    el.title = "Learning Only for YouTube. Click to hide.";
    el.addEventListener("click", () => el.remove());
    document.body.append(el);
  }
  el.textContent = `Learning only: ${shown} shown, ${hidden} hidden`;
}

// YouTube is a single-page app: it swaps content without reloading,
// so watch the DOM and rescan when it changes.
let scheduled = false;
new MutationObserver(records => {
  // Ignore changes made by our own counter.
  if (scheduled || records.every(r => r.target.id === "lo-counter")) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    scan(false);
  }, 200);
}).observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener("yt-navigate-finish", () => {
  shown = 0;
  hidden = 0;
  scan(true);
});

scan(true);
