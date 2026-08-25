const REPO_OWNER = "LaxmanNepal";
const REPO_NAME = "Nepali-Patro";
const FEEDS_URL = "https://raw.githubusercontent.com/LaxmanNepal/Nepali-Patro/main/feeds/feeds.js";
const NEWS_PATH = "feeds/news.json";
const MAX_ARTICLES = 500;
const MAX_PER_FEED = 50;
const CONCURRENCY = 8;

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncNews(env));
  },
  async fetch(request, env) {
    if (new URL(request.url).pathname !== "/health") return new Response("News sync worker is running", { status: 200 });
    const result = await syncNews(env);
    return Response.json(result, { status: result.ok ? 200 : 500 });
  }
};

async function syncNews(env) {
  const started = Date.now();
  if (!env.GITHUB_TOKEN) return { ok: false, error: "Missing GITHUB_TOKEN secret" };
  try {
    const feedsJs = await fetchText(FEEDS_URL, 12000);
    const urls = extractFeedUrls(feedsJs);
    if (!urls.length) throw new Error("No feed URLs found in feeds/feeds.js");

    const articles = [];
    const failures = [];
    for (let i = 0; i < urls.length; i += CONCURRENCY) {
      const batch = urls.slice(i, i + CONCURRENCY);
      const results = await Promise.all(batch.map(async (url) => {
        try { return { url, items: await fetchFeed(url) }; }
        catch (error) { return { url, error: String(error.message || error) }; }
      }));
      for (const r of results) {
        if (r.error) failures.push({ url: r.url, error: r.error });
        else articles.push(...r.items);
      }
    }

    const unique = dedupe(articles)
      .sort((a, b) => newsDate(b.publishedTime) - newsDate(a.publishedTime))
      .slice(0, MAX_ARTICLES);

    if (!unique.length) throw new Error("All configured feeds returned zero usable articles");

    const now = new Date().toISOString();
    const payload = {
      updatedAt: now,
      generatedAt: now,
      articleCount: unique.length,
      sourceCount: urls.length,
      successfulSources: urls.length - failures.length,
      failedSources: failures.length,
      newestArticleTime: unique[0]?.publishedTime || null,
      failures,
      articles: unique,
      items: unique
    };

    const writeResult = await updateGitHubFile(env.GITHUB_TOKEN, NEWS_PATH, payload, `chore: refresh news feed (${now})`);
    return {
      ok: true,
      updated: writeResult.updated,
      articleCount: unique.length,
      sourceCount: urls.length,
      failedSources: failures.length,
      durationMs: Date.now() - started
    };
  } catch (error) {
    return { ok: false, error: String(error.message || error), durationMs: Date.now() - started };
  }
}

function extractFeedUrls(source) {
  const matches = source.match(/https?:\/\/[^"'\s,\]]+/g) || [];
  return [...new Set(matches.map(x => x.replace(/\\/g, "").replace(/[),;]+$/, "")))];
}

async function fetchFeed(url) {
  const xml = await fetchText(url, 10000);
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]);
  return blocks.slice(0, MAX_PER_FEED).map(block => {
    const title = clean(text(block, "title"));
    const articleUrl = clean(text(block, "link")) || clean((block.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1]);
    if (!title || !articleUrl) return null;
    const description = clean(text(block, "description") || text(block, "summary") || text(block, "content:encoded"));
    const publishedTime = clean(text(block, "pubDate") || text(block, "published") || text(block, "updated") || text(block, "dc:date"));
    const imageUrl = extractImage(block);
    let hostname = "";
    try { hostname = new URL(url).hostname.replace(/^www\./, ""); } catch {}
    return {
      title,
      description,
      imageUrl,
      sourceLogo: hostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64` : "",
      sourceName: hostname || "समाचार स्रोत",
      publishedTime,
      articleUrl
    };
  }).filter(Boolean);
}

function text(block, tag) {
  const escaped = tag.replace(":", "\\:");
  const m = block.match(new RegExp(`<${escaped}(?:\s[^>]*)?>([\s\S]*?)<\/${escaped}>`, "i"));
  return m ? m[1] : "";
}
function extractImage(block) {
  const a = block.match(/<(?:media:content|media:thumbnail|enclosure)[^>]+(?:url|href)=["']([^"']+)["']/i);
  if (a) return decode(a[1]);
  const b = block.match(/<img[^>]+src=["']([^"']+)["']/i);
  return b ? decode(b[1]) : "";
}
function clean(value) {
  return decode(String(value || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim());
}
function decode(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
function newsDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}
async function fetchText(url, timeout) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Nepali-Patro-News-Sync/1.1" },
      signal: controller.signal,
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.text();
  } finally { clearTimeout(t); }
}
function dedupe(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.articleUrl.replace(/[?#].*$/, "").toLowerCase() || item.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function base64Encode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(binary);
}
function base64Decode(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
function comparable(payload) {
  const articles = Array.isArray(payload?.articles) ? payload.articles : Array.isArray(payload?.items) ? payload.items : [];
  return JSON.stringify(articles.map(a => [a.articleUrl, a.title, a.description, a.imageUrl, a.sourceName, a.publishedTime]));
}
async function updateGitHubFile(token, path, payload, message) {
  const api = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
    "User-Agent": "Nepali-Patro-News-Sync"
  };
  const current = await fetch(api, { headers });
  let sha = null;
  let previous = null;
  if (current.ok) {
    const data = await current.json();
    sha = data.sha;
    try { previous = JSON.parse(base64Decode(data.content || "")); } catch {}
  } else if (current.status !== 404) {
    throw new Error(`GitHub read failed: ${current.status}`);
  }

  if (previous && comparable(previous) === comparable(payload)) {
    return { updated: false };
  }

  const body = base64Encode(JSON.stringify(payload, null, 2) + "\n");
  const r = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content: body, ...(sha ? { sha } : {}), branch: "main" })
  });
  if (!r.ok) throw new Error(`GitHub update failed: ${r.status} ${await r.text()}`);
  return { updated: true };
}
