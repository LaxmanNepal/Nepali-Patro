from pathlib import Path
import json,re,html

ROOT='https://apps.laxmannepal.com.np/Nepali-Patro/'
META={
'index.html':('नेपाली पात्रो — आजको नेपाली मिति, पञ्चाङ्ग, पर्व र दैनिक जानकारी','आजको नेपाली मिति, पञ्चाङ्ग, पर्व, साइत, राशिफल, मिति रूपान्तरण, इतिहास, सुनको मूल्य, विदेशी मुद्रा र नेपाली समाचार।'),
'patro/index.html':('नेपाली पात्रो — आजको नेपाली क्यालेन्डर','आजको नेपाली मिति, महिना, बार, पर्व र बिदासहितको नेपाली क्यालेन्डर।'),
'calendar/index.html':('नेपाली क्यालेन्डर — वि.सं. पात्रो २०४०–२१००','वि.सं. २०४० देखि २१०० सम्मको नेपाली क्यालेन्डर, मिति, पर्व र बिदा खोज्नुहोस्।'),
'panchanga/index.html':('आजको पञ्चाङ्ग — तिथि, नक्षत्र, योग र करण','आजको विस्तृत पञ्चाङ्ग: तिथि, पक्ष, नक्षत्र, योग, करण, चन्द्रराशि, सूर्योदय र सूर्यास्त।'),
'rashifal/index.html':('आजको राशिफल — १२ राशिको दैनिक नेपाली राशिफल','मेषदेखि मीनसम्म १२ राशिको आजको तथा साप्ताहिक नेपाली राशिफल।'),
'converter/index.html':('BS AD मिति रूपान्तरण — नेपाली पात्रो','वि.सं. बाट ई.सं. र ई.सं. बाट वि.सं. मिति रूपान्तरण तथा उमेर गणना उपकरण।'),
'gold-price/index.html':('आजको सुनको मूल्य नेपाल — Fine Gold, 22 KT र Silver','नेपालमा आजको सुन तथा चाँदीको दर, प्रति तोला, प्रति ग्राम र पछिल्लो मूल्य इतिहास।'),
'forex/index.html':('आजको विदेशी मुद्रा दर — NRB Exchange Rate Nepal','नेपाल राष्ट्र बैंकका आधारमा USD, EUR, GBP, AED, KWD लगायत विदेशी मुद्राको दैनिक विनिमय दर।'),
'parba/index.html':('नेपालका पर्व तथा बिदा — नेपाली पात्रो','नेपालका प्रमुख पर्व, उत्सव र सार्वजनिक बिदाको मिति नेपाली क्यालेन्डरमा हेर्नुहोस्।'),
'saith/index.html':('आजको शुभ साइत — विवाह, गृहप्रवेश र शुभ मुहूर्त','विवाह, गृहप्रवेश, पास्नी, व्रतबन्ध लगायतका परम्परागत शुभ साइत र मुहूर्त।'),
'itihas-aaja/index.html':('आजको इतिहास — नेपालका ऐतिहासिक घटना र संस्कृति','आजकै दिन नेपालमा भएका ऐतिहासिक घटना, संस्कृति, सम्पदा र महत्वपूर्ण व्यक्तित्वसम्बन्धी जानकारी।'),
'news/index.html':('ताजा नेपाली समाचार — राष्ट्रिय, राजनीति, अर्थतन्त्र, प्रविधि र खेलकुद','विभिन्न नेपाली स्रोतबाट संकलित ताजा राष्ट्रिय, राजनीति, अर्थतन्त्र, प्रविधि, खेलकुद र मनोरञ्जन समाचार।'),
'Nepse/index.html':('NEPSE विश्लेषण — नेपाली शेयर बजार र कम्पनी डेटा','नेपाल स्टक एक्सचेन्ज सम्बन्धी कम्पनी डेटा, बजार जानकारी र लगानी अनुसन्धान उपकरण।'),
'blog/index.html':('नेपाली पात्रो ब्लग — उपयोगी नेपाली गाइड','नेपाली पात्रो, BS/AD मिति, पञ्चाङ्ग, पर्व, राशिफल, सुनको मूल्य र नेपाली संस्कृतिसम्बन्धी उपयोगी लेखहरू।')}

def canonical(path):
    rel=path.as_posix()
    if rel=='index.html': return ROOT
    if rel.endswith('/index.html'): return ROOT+rel[:-10]
    return ROOT+rel

def upsert(html_text, name, description, url):
    block=f'''<!-- Nepali Patro SEO -->\n<link rel="canonical" href="{url}">\n<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">\n<meta property="og:type" content="website">\n<meta property="og:site_name" content="नेपाली पात्रो">\n<meta property="og:locale" content="ne_NP">\n<meta property="og:title" content="{html.escape(name, quote=True)}">\n<meta property="og:description" content="{html.escape(description, quote=True)}">\n<meta property="og:url" content="{url}">\n<meta name="twitter:card" content="summary">\n<meta name="twitter:title" content="{html.escape(name, quote=True)}">\n<meta name="twitter:description" content="{html.escape(description, quote=True)}">\n<script type="application/ld+json">{json.dumps({'@context':'https://schema.org','@type':'WebPage','name':name,'description':description,'url':url,'inLanguage':'ne-NP','isPartOf':{'@type':'WebSite','name':'नेपाली पात्रो','url':ROOT}},ensure_ascii=False,separators=(',',':'))}</script>\n<!-- /Nepali Patro SEO -->'''
    html_text=re.sub(r'<!-- Nepali Patro SEO -->.*?<!-- /Nepali Patro SEO -->\s*','',html_text,flags=re.S)
    html_text=re.sub(r'<link\s+rel=["\']canonical["\'][^>]*>\s*','',html_text,flags=re.I)
    html_text=re.sub(r'<meta\s+name=["\']robots["\'][^>]*>\s*','',html_text,flags=re.I)
    return html_text.replace('</head>',block+'</head>',1)

def main():
    changed=[]
    for p in Path('.').rglob('*.html'):
        if any(part in {'.git','node_modules'} for part in p.parts): continue
        rel=p.as_posix()
        if rel.startswith('demo/'): continue
        current=p.read_text(encoding='utf-8')
        title,desc=META.get(rel,(None,None))
        if not title:
            m=re.search(r'<title>(.*?)</title>',current,re.I|re.S)
            title=html.unescape(re.sub('<[^>]+>',' ',m.group(1))).strip() if m else f'नेपाली पात्रो — {p.stem}'
            d=re.search(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']',current,re.I|re.S)
            desc=html.unescape(d.group(1)).strip() if d else f'{title} — नेपाली पात्रोको उपयोगी जानकारी र उपकरण।'
        updated=upsert(current,title,desc,canonical(p))
        if updated!=current:
            p.write_text(updated,encoding='utf-8');changed.append(rel)
    print(f'SEO optimized {len(changed)} HTML pages')
    for x in changed: print(x)
if __name__=='__main__': main()
