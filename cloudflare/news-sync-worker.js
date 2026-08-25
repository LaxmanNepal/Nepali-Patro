const REPO_OWNER = "LaxmanNepal";
const REPO_NAME = "Nepali-Patro";
const FEEDS_URL = "https://raw.githubusercontent.com/LaxmanNepal/Nepali-Patro/main/feeds/feeds.js";
const NEWS_PATH = "feeds/news.json";
const MAX_ARTICLES = 500;
const MAX_PER_FEED = 50;
const CONCURRENCY = 8;
const SOURCE_NAMES = {
  "onlinekhabar.com": "Onlinekhabar",
  "nagariknetwork.com": "Nagarik",
  "ratopati.com": "Ratopati",
  "setopati.com": "Setopati",
  "gorkhapatraonline.com": "Gorkhapatra",
  "bbc.co.uk": "BBC Nepali",
  "annapurnapost.com": "Annapurna Post",
  "rajdhanidaily.com": "Rajdhani",
  "news24nepal.com": "News24 Nepal",
  "nepallive.com": "Nepal Live",
  "lokaantar.com": "Lokaantar",
  "dainiknepal.com": "Dainik Nepal",
  "nepalsamaya.com": "Nepal Samaya",
  "pahilopost.com": "Pahilo Post",
  "nepalpress.com": "Nepal Press",
  "himalkhabar.com": "Himal Khabar",
  "nepalnews.com": "Nepal News",
  "hamrokhelkud.com": "Hamro Khelkud",
  "newsofnepal.com": "News of Nepal",
  "clickmandu.com": "Clickmandu",
  "arthasarokar.com": "Arthasarokar",
  "bankingkhabar.com": "Banking Khabar",
  "vikasnews.com": "Vikas News",
  "techpana.com": "TechPana",
  "nepalitelecom.com": "NepaliTelecom",
  "techmandu.com": "Techmandu",
  "ictframe.com": "ICT Frame",
  "techsathi.com": "TechSathi",
  "lexlimbu.com": "Lex Limbu",
  "khabarhub.com": "Khabarhub"
};

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncNews(env));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      const result = await syncNews(env);
      return Response.json(result, { status: result.ok ? 200 : 500 });
    }
    return new Response("Nepali-Patro news sync worker is running", { status: 200 });
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
      .filter(isUsableNepaliNews)
      .sort((a, b) => newsDate(b.publishedTime) - newsDate(a.publishedTime))
      .slice(0, MAX_ARTICLES);

    if (!unique.length) throw new Error("No usable Nepal news articles were returned by the configured feeds");

    const now = new Date().toISOString();
    const payload = {
      version: 2,
      feedType: "nepal-news",
      region: "Nepal",
      language: "ne",
      updatedAt: now,
      generatedAt: now,
      fetchedAt: now,
      articleCount: unique.length,
      sourceCount: urls.length,
      successfulSources: urls.length - failures.length,
      failedSources: failures.length,
      newestArticleTime: unique[0]?.publishedTime || null,
      failures,
      articles: unique,
      items: unique
    };

    const writeResult = await updateGitHubFile(
      env.GITHUB_TOKEN,
      NEWS_PATH,
      payload,
      `chore: update Nepal news JSON (${now})`
    );

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

async function fetchFeed(feedUrl) {
  const xml = await fetchText(feedUrl, 10000);
  const blocks = [...xml.matchAll(/<(item|entry)\b[\s\S]*?<\/\1>/gi)].map(m => m[0]);
  let hostname = "";
  try { hostname = new URL(feedUrl).hostname.replace(/^www\./, "").toLowerCase(); } catch {}
  const sourceName = SOURCE_NAMES[hostname] || hostname || "समाचार स्रोत";

  return blocks.slice(0, MAX_PER_FEED).map(block => {
    const title = clean(text(block, "title"));
    const articleUrl = clean(text(block, "link")) || clean((block.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1]);
    if (!title || !articleUrl) return null;
    const description = clean(text(block, "description") || text(block, "summary") || text(block, "content:encoded"));
    const publishedRaw = clean(text(block, "pubDate") || text(block, "published") || text(block, "updated") || text(block, "dc:date"));
    const publishedTime = normalizeDate(publishedRaw);
    const imageUrl = extractImage(block);
    return {
      id: stableId(articleUrl, title),
      region: "Nepal",
      language: "ne",
      category: inferCategory(title, description),
      sourceName,
      sourceDomain: hostname,
      sourceLogo: hostname ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64` : "",
      sourceFeed: feedUrl,
      title,
      heading: title,
      description,
      summary: description,
      imageUrl,
      publishedTime,
      publishedAt: publishedTime,
      fetchedAt: new Date().toISOString(),
      articleUrl,
      link: articleUrl
    };
  }).filter(Boolean);
}

function isUsableNepaliNews(item) {
  if (!item?.title || !item?.articleUrl) return false;
  // The configured publishers are Nepal-focused. Keep all valid publisher stories,
  // but reject obvious non-news feed pollution such as video/image-only entries.
  const textValue = `${item.title} ${item.description}`.toLowerCase();
  if (textValue.length < 12) return false;
  return true;
}

function inferCategory(title, description) {
  const t = `${title} ${description}`.toLowerCase();
  if (/क्रिकेट|फुटबल|खेलकुद|खेलाडी|विश्वकप|ओलम्पिक|football|cricket|sports/.test(t)) return "sports";
  if (/शेयर|सेयर|नेप्से|बैंक|बैंकिङ|आर्थिक|अर्थतन्त्र|व्यापार|बजेट|लगानी|finance|business|nepse/.test(t)) return "business";
  if (/प्रविधि|टेक्नोलोजी|मोबाइल|एआई|ai|technology|tech|सफ्टवेयर|इन्टरनेट/.test(t)) return "technology";
  if (/चलचित्र|फिल्म|गीत|संगीत|मनोरञ्जन|अभिनेता|अभिनेत्री|entertainment|movie/.test(t)) return "entertainment";
  if (/सरकार|प्रधानमन्त्री|मन्त्री|संसद|निर्वाचन|राजनीति|दल|राष्ट्रपति|अदालत|कांग्रेस|एमाले|माओवादी|politics|government/.test(t)) return "politics";
  return "national";
}

function text(block, tag) {
  const escaped = tag.replace(":", "\\:");
  const m = block.match(new RegExp(`<${escaped}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escaped}>`, "i"));
  return m ? m[1] : "";
}
function extractImage(block) {
  const a = block.match(/<(?:media:content|media:thumbnail|enclosure)[^>]+(?:url|href)=["']([^"']+)["']/i);
  if (a) return decode(a[1]);
  const b = block.match(/<img[^>]+(?:src|data-src)=["']([^"']+)["']/i);
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
function normalizeDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
function newsDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}
function stableId(url, title) {
  const value = `${url}|${title}`;
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `n${(h >>> 0).toString(36)}`;
}
async function fetchText(url, timeout) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const r = await fetch(url, {
      headers: { "User-Agent": "Nepali-Patro-News-Sync/2.0" },
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
  if (current.ok) {
    const data = await current.json();
    sha = data.sha;
  } else if (current.status !== 404) {
    throw new Error(`GitHub read failed: ${current.status}`);
  }

  // The requested design is an always-fresh backend JSON file. The timestamp is
  // intentionally part of the payload, so every successful minute sync updates it.
  const body = base64Encode(JSON.stringify(payload, null, 2) + "\n");
  const r = await fetch(api, {
    method: "PUT",
    headers,
    body: JSON.stringify({ message, content: body, ...(sha ? { sha } : {}), branch: "main" })
  });
  if (!r.ok) throw new Error(`GitHub update failed: ${r.status} ${await r.text()}`);
  return { updated: true };
}
