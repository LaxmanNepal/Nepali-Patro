import makeWASocket, { DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'node:fs/promises';
import path from 'node:path';

const CONFIG = {
  feedBase: process.env.GOLD_FEED_BASE || 'https://apps.laxmannepal.com.np/Nepali-Patro/feeds/gold_daily',
  channelJid: process.env.WHATSAPP_CHANNEL_JID || '',
  authDir: process.env.AUTH_DIR || './auth',
  stateFile: process.env.STATE_FILE || './data/posted.json',
  phoneNumber: (process.env.WHATSAPP_PHONE || '').replace(/\D/g, ''),
  pollMs: Number(process.env.POLL_MS || 15 * 60 * 1000),
};

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
let sock;
let pairingRequested = false;

const nepaliDigits = value => String(value).replace(/\d/g, d => '०१२३४५६७८९'[d]);
const money = value => `रू. ${Number(value).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

async function readState() {
  try { return JSON.parse(await fs.readFile(CONFIG.stateFile, 'utf8')); }
  catch { return { postedDates: {} }; }
}

async function writeState(state) {
  await fs.mkdir(path.dirname(CONFIG.stateFile), { recursive: true });
  await fs.writeFile(CONFIG.stateFile, JSON.stringify(state, null, 2) + '\n');
}

async function getTodayFeed() {
  const kathmandu = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  const url = `${CONFIG.feedBase}/${kathmandu}.json`;
  const response = await fetch(`${url}?v=${Date.now()}`, { headers: { 'User-Agent': 'Nepali-Patro-Gold-WhatsApp-Bot/1.0' } });
  if (!response.ok) throw new Error(`Gold JSON HTTP ${response.status}: ${url}`);
  return response.json();
}

function buildMessage(feed) {
  const g = feed.gold?.fineGold || {};
  const g22 = feed.gold?.['22KT'] || {};
  const s = feed.silver || {};
  const goldChange = Number(g.changePerTola || 0);
  const silverChange = Number(s.changePerTola || 0);
  const arrow = n => n > 0 ? '📈' : n < 0 ? '📉' : '➖';
  const signed = n => `${n > 0 ? '+' : ''}${money(n)}`;

  return [
    '🪙 *आजको सुनचाँदीको मूल्य*',
    '',
    `📅 ${feed.date?.bs || ''} (${feed.date?.ad || ''})`,
    '',
    `🥇 *Fine Gold (छापावाल)*`,
    `• प्रति तोला: *${money(g.perTola)}* ${arrow(goldChange)} ${signed(goldChange)}`,
    `• प्रति १० ग्राम: ${money(g.per10Gram)}`,
    `• प्रति ग्राम: ${money(g.perGram)}`,
    '',
    `💛 *22 KT Gold*`,
    `• प्रति तोला: *${money(g22.perTola)}*`,
    `• प्रति १० ग्राम: ${money(g22.per10Gram)}`,
    `• प्रति ग्राम: ${money(g22.perGram)}`,
    '',
    `🥈 *Silver (चाँदी)*`,
    `• प्रति तोला: *${money(s.perTola)}* ${arrow(silverChange)} ${signed(silverChange)}`,
    `• प्रति १० ग्राम: ${money(s.per10Gram)}`,
    `• प्रति ग्राम: ${money(s.perGram)}`,
    '',
    `📌 स्रोत: ${feed.source?.name || 'NEGOSIDA'}`,
    '🔗 https://apps.laxmannepal.com.np/Nepali-Patro/gold-price/',
    '',
    '⚠️ वास्तविक कारोबार दर स्थान/व्यवसायअनुसार फरक हुन सक्छ।'
  ].join('\n');
}

async function resolveChannelJid() {
  if (!CONFIG.channelJid) throw new Error('WHATSAPP_CHANNEL_JID is not configured');
  const metadata = await sock.newsletterMetadata('jid', CONFIG.channelJid);
  if (!metadata?.id?.endsWith('@newsletter')) throw new Error('Configured channel JID is not a valid WhatsApp Channel JID');
  logger.info({ channel: metadata.name, jid: metadata.id }, 'WhatsApp Channel validated');
  return metadata.id;
}

async function postToday() {
  if (!sock?.user) return;
  const feed = await getTodayFeed();
  const date = feed.date?.ad;
  if (!date) throw new Error('Daily gold JSON has no date.ad');

  const state = await readState();
  if (state.postedDates?.[date]) {
    logger.info({ date }, 'Gold price already posted');
    return;
  }

  const jid = await resolveChannelJid();
  const message = buildMessage(feed);
  const sent = await sock.sendMessage(jid, { text: message });

  state.postedDates = state.postedDates || {};
  state.postedDates[date] = {
    messageId: sent?.key?.id || null,
    postedAt: new Date().toISOString(),
  };
  await writeState(state);
  logger.info({ date, messageId: sent?.key?.id }, 'Daily gold price posted to WhatsApp Channel');
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.authDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: ['Nepali-Patro Gold Bot', 'Chrome', '1.0.0'],
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) logger.info('QR available. If pairing code is preferred, set WHATSAPP_PHONE.');

    if (connection === 'open') {
      logger.info({ user: sock.user?.id }, 'WhatsApp connected');
      try { await postToday(); } catch (error) { logger.error({ err: error }, 'Initial gold post check failed'); }
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      logger.warn({ code, shouldReconnect }, 'WhatsApp connection closed');
      if (shouldReconnect) setTimeout(connect, 5000);
    }
  });

  if (!state.creds.registered && CONFIG.phoneNumber && !pairingRequested) {
    pairingRequested = true;
    await new Promise(r => setTimeout(r, 3000));
    const code = await sock.requestPairingCode(CONFIG.phoneNumber);
    logger.info(`PAIRING CODE: ${code}`);
  }
}

await fs.mkdir(CONFIG.authDir, { recursive: true });
await fs.mkdir(path.dirname(CONFIG.stateFile), { recursive: true });
await connect();

setInterval(async () => {
  try { await postToday(); }
  catch (error) { logger.error({ err: error }, 'Scheduled gold post check failed'); }
}, CONFIG.pollMs);
