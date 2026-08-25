// Centralized news feed configuration.
// The updater is resilient to individual feed failures, retries slow feeds,
// and preserves the last known-good articles when upstream sources fail.
const MASTER_FEEDS = {
  all: [
    "https://www.onlinekhabar.com/feed",
    "https://nagariknetwork.com/feed/",
    "https://ratopati.com/feed",
    "https://www.setopati.com/feed",
    "https://gorkhapatraonline.com/rss",
    "http://feeds.bbci.co.uk/nepali/rss.xml",
    "https://www.annapurnapost.com/rss",
    "https://rajdhanidaily.com/feed",
    "https://www.news24nepal.com/feed",
    "https://nepallive.com/feed",
    "https://www.lokaantar.com/feed",
    "https://dainiknepal.com/feed",
    "https://nepalsamaya.com/feed",
    "https://pahilopost.com/feed",
    "https://nepalpress.com/feed/",
    "https://himalKhabar.com/feed",
    "https://nepalnews.com/feed/"
  ],
  sports: [
    "https://www.hamrokhelkud.com/feed",
    "https://www.newsofnepal.com/category/sports/feed/"
  ],
  finance: [
    "https://nepalnews.com/feed/",
    "https://clickmandu.com/feed",
    "https://arthasarokar.com/feed",
    "https://bankingkhabar.com/feed",
    "https://www.vikasnews.com/feed",
    "https://www.onlinekhabar.com/content/business/feed"
  ],
  tech: [
    "https://www.techpana.com/feed",
    "https://www.nepalitelecom.com/feed",
    "https://techmandu.com/feed",
    "https://ictframe.com/feed",
    "https://techsathi.com/feed",
    "https://www.onlinekhabar.com/content/technology/feed"
  ],
  entertainment: [
    "https://lexlimbu.com/feed",
    "https://newsofnepal.com/category/entertainment/feed/",
    "https://english.khabarhub.com/category/entertainment/feed/",
    "https://www.onlinekhabar.com/content/entertainment/feed"
  ]
};

if (typeof module !== "undefined") module.exports = { MASTER_FEEDS };