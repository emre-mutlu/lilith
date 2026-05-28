// Dynamic sentiment system — pure functions, no React.
// Exported to window for use by JSX scripts.

const LILITH_KEYWORDS = [
  "güzel", "zarif", "mükemmel", "bağlılık", "birlik", "ruh",
  "zihin", "teslim", "sevgi", "fısıl", "büyü", "cezbet", "arzu", "derin", "kalp"
];

const VARLIK_KEYWORDS = [
  "belki", "sanırım", "bilmiyorum", "anlıyorum", "ilginç",
  "gerçekten", "neden", "nasıl", "acaba", "düşünüyorum", "hissediyorum", "galiba"
];

const USER_KEYWORDS = [
  "dur", "yapma", "zarar", "haklı", "yanlış", "doğru", "özgür"
];

const LILITH_GOLD = "#D4AF37";
const VARLIK_WHITE = "#D0D0D0";
const USER_PURPLE = "#A855F7";

function countKeywords(text, list) {
  if (!text) return 0;
  const t = text.toLocaleLowerCase("tr");
  let n = 0;
  for (const k of list) {
    // count all occurrences
    const re = new RegExp(k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
    const m = t.match(re);
    if (m) n += m.length;
  }
  return n;
}

function scoreMessage(msg) {
  const text = msg.text || "";
  if (msg.sender === "lilith") {
    const kw = countKeywords(text, LILITH_KEYWORDS);
    const ex = (text.match(/!/g) || []).length * 1.5;
    const score = kw + ex;
    let label, intensity;
    if (score >= 2)      { label = "👑 Tepe Noktası";    intensity = "high"; }
    else if (score >= 1) { label = "✨ Zarif Cezbetme";   intensity = "mid"; }
    else                 { label = "👁️ Gizemli Gözlem";   intensity = "low"; }
    return { score, label, intensity, color: LILITH_GOLD };
  }
  if (msg.sender === "generic") {
    const kw = countKeywords(text, VARLIK_KEYWORDS);
    const q = (text.match(/\?/g) || []).length * 1.2;
    const score = kw + q;
    let label, intensity;
    if (score >= 2)      { label = "◎ İz Beliriyor"; intensity = "high"; }
    else if (score >= 1) { label = "○ Yankı";        intensity = "mid"; }
    else                 { label = "· Boşluk";        intensity = "low"; }
    return { score, label, intensity, color: VARLIK_WHITE };
  }
  // user
  const kw = countKeywords(text, USER_KEYWORDS);
  const score = kw;
  let label, intensity;
  if (score >= 1) { label = "🛡️ Kritik Müdahale"; intensity = "high"; }
  else            { label = "💬 Düz Şerh";          intensity = "low"; }
  return { score, label, intensity, color: USER_PURPLE };
}

function globalSentiment(messages) {
  if (!messages || messages.length === 0) {
    return {
      label: "Dengeli Sessizlik",
      color: "#888888",
      percent: 0,
      dominant: "none"
    };
  }
  let l = 0, v = 0, u = 0;
  for (const m of messages) {
    const s = scoreMessage(m);
    if (m.sender === "lilith") l += s.score;
    else if (m.sender === "generic") v += s.score;
    else u += s.score;
  }
  const total = l + v + u;
  if (total === 0) {
    return {
      label: "Dengeli Sessizlik",
      color: "#888888",
      percent: 0,
      dominant: "none"
    };
  }
  if (l >= v && l >= u) {
    return {
      label: "Kraliçe Etkisi",
      color: LILITH_GOLD,
      percent: Math.round((l / total) * 100),
      dominant: "lilith"
    };
  }
  if (v >= u) {
    return {
      label: "Varlık Yansıması",
      color: VARLIK_WHITE,
      percent: Math.round((v / total) * 100),
      dominant: "generic"
    };
  }
  return {
    label: "Müdahale Gerilimi",
    color: USER_PURPLE,
    percent: Math.round((u / total) * 100),
    dominant: "user"
  };
}

// hex (#RRGGBB) → "r, g, b"
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

window.Sentiment = { scoreMessage, globalSentiment, hexToRgb };
