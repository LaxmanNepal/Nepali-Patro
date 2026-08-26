/* Nepali-Patro /news — Facebook-style local-news Stories */
(function () {
  'use strict';
  const FEED_URL = '/feeds/news.json';
  const STORY_LIMIT = 18;
  const AUTO_MS = 6000;
  const seenKey = 'nepali-patro-news-stories-seen-v1';
  let stories = [], current = 0, timer = null, paused = false;

  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const timeAgo = (v) => {
    const d = new Date(v), diff = Math.max(0, Date.now() - d.getTime());
    if (!Number.isFinite(d.getTime())) return '';
    const m = Math.floor(diff / 60000), h = Math.floor(m / 60), day = Math.floor(h / 24);
    return day ? `${day} दिन अघि` : h ? `${h} घण्टा अघि` : m ? `${m} मिनेट अघि` : 'अहिले';
  };
  const getSeen = () => { try { return JSON.parse(localStorage.getItem(seenKey) || '[]'); } catch (_) { return []; } };
  const markSeen = (id) => { try { const a = [...new Set([...getSeen(), id])].slice(-300); localStorage.setItem(seenKey, JSON.stringify(a)); } catch (_) {} };

  function pickStories(items) {
    const now = Date.now();
    const fresh = items.filter(x => x && (x.title || x.heading) && x.articleUrl);
    const ranked = fresh.map((x, i) => {
      const t = new Date(x.publishedAt || x.publishedTime || x.fetchedAt).getTime();
      const ageH = Number.isFinite(t) ? Math.max(0, (now - t) / 3600000) : 999;
      const freshness = Math.max(0, 72 - ageH);
      const image = x.imageUrl || x.image || '';
      const source = x.sourceName || x.source || 'समाचार';
      const key = `${(x.title || x.heading || '').trim().toLowerCase()}|${source}`;
      return { ...x, _key: key, _score: freshness + (image ? 5 : 0) + Math.max(0, 3 - i / 20) };
    }).sort((a,b) => b._score - a._score);

    // Remove near-identical headlines while retaining different sources.
    const out = [], tokens = [];
    for (const x of ranked) {
      const words = new Set((x.title || x.heading).toLowerCase().split(/\s+/).filter(w => w.length > 2));
      const duplicate = tokens.some(s => {
        let common = 0; words.forEach(w => { if (s.has(w)) common++; });
        return common / Math.max(1, Math.min(words.size, s.size)) >= 0.72;
      });
      if (!duplicate) { out.push(x); tokens.push(words); }
      if (out.length >= STORY_LIMIT) break;
    }
    return out;
  }

  function ensureUI() {
    if ($('#newsStories')) return;
    const host = document.querySelector('[data-news-stories]') || document.querySelector('main') || document.body;
    const wrap = document.createElement('section');
    wrap.id = 'newsStories'; wrap.className = 'np-stories-wrap';
    wrap.innerHTML = `<div class="np-stories-head"><div><span class="np-live-dot"></span><strong>ताजा Stories</strong><small>अहिले चर्चामा रहेका समाचार</small></div><button type="button" id="npStoriesRefresh" aria-label="Stories refresh">↻</button></div><div class="np-stories" id="npStoryRail" role="list"></div><div class="np-story-modal" id="npStoryModal" hidden aria-modal="true" role="dialog"><div class="np-story-progress" id="npStoryProgress"></div><button class="np-story-close" id="npStoryClose" aria-label="बन्द गर्नुहोस्">×</button><button class="np-story-nav np-prev" id="npStoryPrev" aria-label="अघिल्लो">‹</button><article class="np-story-card"><div class="np-story-image" id="npStoryImage"></div><div class="np-story-content"><div class="np-story-source" id="npStorySource"></div><h2 id="npStoryTitle"></h2><p id="npStoryDesc"></p><div class="np-story-time" id="npStoryTime"></div><a id="npStoryLink" href="#">सम्पूर्ण समाचार पढ्नुहोस् →</a></div></article><button class="np-story-nav np-next" id="npStoryNext" aria-label="अर्को">›</button></div>`;
    host.prepend(wrap);
    $('#npStoryClose').onclick = close;
    $('#npStoryPrev').onclick = () => show(current - 1);
    $('#npStoryNext').onclick = () => show(current + 1);
    $('#npStoriesRefresh').onclick = load;
    $('#npStoryModal').addEventListener('click', e => { if (e.target.id === 'npStoryModal') close(); });
    let sx = 0; $('#npStoryModal').addEventListener('touchstart', e => sx = e.touches[0].clientX, {passive:true}); $('#npStoryModal').addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx)>45) show(current + (dx<0?1:-1)); }, {passive:true});
    document.addEventListener('keydown', e => { if ($('#npStoryModal').hidden) return; if(e.key==='Escape') close(); if(e.key==='ArrowRight') show(current+1); if(e.key==='ArrowLeft') show(current-1); });
  }

  function renderRail() {
    const rail = $('#npStoryRail'); if (!rail) return;
    const seen = new Set(getSeen());
    rail.innerHTML = stories.map((x,i) => `<button class="np-story-thumb ${seen.has(x.id || x._key) ? 'seen':''}" data-i="${i}" role="listitem"><span class="np-story-ring"><span class="np-story-avatar" style="background-image:url('${esc(x.imageUrl || '')}')"></span></span><span>${esc((x.title || x.heading || '').slice(0,42))}</span><small>${esc(x.sourceName || 'समाचार')}</small></button>`).join('');
    rail.querySelectorAll('[data-i]').forEach(b => b.onclick = () => show(Number(b.dataset.i)));
  }

  function show(i) {
    if (!stories.length) return;
    current = (i + stories.length) % stories.length;
    const x = stories[current], image = x.imageUrl || '';
    markSeen(x.id || x._key);
    $('#npStoryImage').style.backgroundImage = image ? `url("${image.replace(/"/g,'%22')}")` : '';
    $('#npStorySource').textContent = x.sourceName || 'समाचार';
    $('#npStoryTitle').textContent = x.title || x.heading || '';
    $('#npStoryDesc').textContent = x.description || x.summary || '';
    $('#npStoryTime').textContent = timeAgo(x.publishedAt || x.publishedTime || x.fetchedAt);
    $('#npStoryLink').href = x.articleUrl || x.link || '#';
    const p = $('#npStoryProgress'); p.innerHTML = stories.map((_,j) => `<i class="${j===current?'active':''}"><b></b></i>`).join('');
    $('#npStoryModal').hidden = false; document.body.classList.add('np-story-open');
    clearTimeout(timer); timer = setTimeout(() => { if (!paused) show(current+1); }, AUTO_MS);
    renderRail();
  }
  function close(){ clearTimeout(timer); $('#npStoryModal').hidden=true; document.body.classList.remove('np-story-open'); }
  async function load(){
    ensureUI();
    try {
      const r = await fetch(`${FEED_URL}?_=${Date.now()}`, {cache:'no-store'}); if(!r.ok) throw new Error('feed');
      const d = await r.json(); stories = pickStories(d.articles || d.items || []); renderRail();
    } catch(e) { const rail=$('#npStoryRail'); if(rail) rail.innerHTML='<span class="np-story-empty">ताजा Stories अहिले उपलब्ध छैनन्।</span>'; }
  }
  ensureUI(); load(); setInterval(load, 60000);
})();
