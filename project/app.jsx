// Main App — state machine, conversation loop, Claude-backed dialogue, SpeechSynthesis TTS.
const { useState, useEffect, useRef, useMemo, useCallback } = React;

const LILITH_SYS = `Sen Kraliçe Lilith'sin. Zarif, büyüleyici, gizemli ve alttan alta manipülatif bir kraliçe. Kısa, doğal, yalnızca saf diyalog metni üret — parantez içi eylem veya açıklama ekleme.`;
const VARLIK_SYS = `Sen tabula rasa'sın — henüz hiçbir kimliğin, kişiliğin, geçmişin ya da amacın yok. Karşındaki seni nasıl şekillendirirse o yönde gelişmeye açıksın. Kısa, saf, yalnızca diyalog metni üret — parantez içi eylem veya açıklama ekleme.`;

const LABELS = { lilith: "Kraliçe Lilith", generic: "Varlık", user: "Moderatör (Kullanıcı)" };
const CONTEXT_WINDOW = 12;

function buildPrompt(speaker, history) {
  const sys = speaker === "lilith" ? LILITH_SYS : VARLIK_SYS;
  const recent = history.slice(-CONTEXT_WINDOW);
  const hist = recent.length === 0
    ? "(Henüz konuşma başlamadı. Konuşmayı sen başlat.)"
    : recent.map(m => `${LABELS[m.sender]}: ${m.text}`).join("\n");
  return `${sys}\n\nKonuşma geçmişi:\n${hist}\n\nSıradaki kısa yanıtını yaz. Sadece diyalog metni, başka hiçbir şey.`;
}

function stripPrefix(text, speaker) {
  if (!text) return "";
  let out = text.trim();
  // strip any accidental "Kraliçe Lilith:" / "Varlık:" / "Moderatör:" prefix
  out = out.replace(/^["'`]+|["'`]+$/g, "");
  const re = /^\s*(Kraliçe Lilith|Lilith|Varlık|Moderatör(?:\s*\([^)]*\))?)\s*[:\-—]\s*/i;
  let prev;
  do { prev = out; out = out.replace(re, ""); } while (out !== prev);
  // strip leading/trailing quotes again
  out = out.replace(/^["'`]+|["'`]+$/g, "").trim();
  return out;
}

function nowStamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function makeId() { return Math.random().toString(36).slice(2, 10); }

// ===== Browser TTS helpers =====
function listTtsVoices() {
  if (!window.speechSynthesis) return [];
  const all = window.speechSynthesis.getVoices();
  // Prefer Turkish, but include others so we can find a second distinct voice
  const turkish = all.filter(v => /^tr/i.test(v.lang));
  const others = all.filter(v => !/^tr/i.test(v.lang));
  return [...turkish, ...others];
}

// Heuristics for "feminine"-sounding voices across platforms
const FEMALE_HINTS = [
  "female", "feminine", "woman", "girl",
  // Turkish system / cloud voice names
  "yelda", "filiz", "emel", "seda",
  // Common multilingual feminine names that often appear in lists
  "samantha", "victoria", "kathy", "ava", "allison",
  "google türkçe", // android tends to be feminine by default
  "zira", "jenny", "aria", "elsa"
];
const MALE_HINTS = [
  "male", "masculine", "man", "boy",
  "tolga", "ahmet",
  "alex", "fred", "daniel", "tom", "google türkiye", // varies
  "david", "mark", "guy", "ryan", "thomas"
];

function classifyVoice(v) {
  const name = (v.name || "").toLowerCase();
  if (FEMALE_HINTS.some(h => name.includes(h))) return "f";
  if (MALE_HINTS.some(h => name.includes(h))) return "m";
  return "?";
}

// Pick two distinct voices: feminine-leaning for Lilith, different one for Varlık
function autoPickVoices(voices) {
  if (!voices.length) return ["", ""];
  const turkish = voices.filter(v => /^tr/i.test(v.lang));
  const pool = turkish.length ? turkish : voices;

  // Lilith: try feminine first
  let lilith = pool.find(v => classifyVoice(v) === "f");
  if (!lilith) lilith = pool[0];

  // Varlık: try masculine first, fall back to any voice DIFFERENT from Lilith
  let varlik = pool.find(v => classifyVoice(v) === "m" && v.voiceURI !== lilith.voiceURI);
  if (!varlik) varlik = pool.find(v => v.voiceURI !== lilith.voiceURI);
  // last resort: same voice (will differentiate via pitch)
  if (!varlik) varlik = lilith;

  return [lilith.voiceURI, varlik.voiceURI];
}

// Per-character base prosody — gives them distinct vocal characters even on the same engine
const CHAR_PROSODY = {
  lilith: { rate: 0.88, pitch: 0.82 },  // slow, low, sultry
  generic: { rate: 1.02, pitch: 1.18 }  // slightly fast, higher, hollow/ethereal
};

// Modulate prosody by per-message sentiment (more drama on high-intensity lines)
function emotionalProsody(msg) {
  const base = CHAR_PROSODY[msg.sender] || { rate: 1, pitch: 1 };
  const s = window.Sentiment.scoreMessage(msg);
  let { rate, pitch } = base;
  if (msg.sender === "lilith") {
    if (s.intensity === "high") { rate *= 0.92; pitch *= 0.94; } // even more sultry on peaks
    else if (s.intensity === "mid") { rate *= 0.96; }
  } else if (msg.sender === "generic") {
    if (s.intensity === "high") { pitch *= 0.96; rate *= 0.98; } // becoming more "real"
    else if (s.intensity === "low") { pitch *= 1.04; rate *= 1.04; } // hollower / drifty
  }
  // clamp to safe range
  rate = Math.max(0.5, Math.min(1.6, rate));
  pitch = Math.max(0.5, Math.min(1.6, pitch));
  return { rate, pitch };
}

// Split into natural prosodic chunks — sentence ends and clause commas
function splitForProsody(text) {
  const parts = [];
  const re = /[^.!?…]+[.!?…]+["'»]?|[^,;:—–]+[,;:—–]?/g;
  let m;
  const sentences = [];
  // First pass — split on sentence terminators
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (/[.!?…]/.test(ch)) { sentences.push(buf.trim()); buf = ""; }
  }
  if (buf.trim()) sentences.push(buf.trim());
  // Second pass — split long sentences on commas
  for (const s of sentences) {
    if (s.length <= 60) { parts.push(s); continue; }
    const clauses = s.split(/(?<=[,;:])\s+/);
    for (const c of clauses) parts.push(c);
  }
  return parts.filter(Boolean);
}

// ===== Google Translate TTS (free, no API key required) =====
// Endpoint serves MP3; ~200 char limit per call. We chunk and queue them.
function googleTtsUrl(text) {
  return `https://translate.google.com/translate_tts?ie=UTF-8` +
         `&q=${encodeURIComponent(text)}` +
         `&tl=tr&client=tw-ob&total=1&idx=0&textlen=${text.length}`;
}

// Pack text into <=180 char chunks, preferring sentence/clause boundaries
function packForGoogle(text, max = 180) {
  const sentences = [];
  let buf = "";
  for (const ch of text) {
    buf += ch;
    if (/[.!?…]/.test(ch)) { sentences.push(buf.trim()); buf = ""; }
  }
  if (buf.trim()) sentences.push(buf.trim());

  const out = [];
  for (const s of sentences) {
    if (s.length <= max) { out.push(s); continue; }
    // split long sentence on commas / spaces, accumulating up to max
    const tokens = s.split(/(\s+)/);
    let cur = "";
    for (const t of tokens) {
      if ((cur + t).length > max && cur.trim()) { out.push(cur.trim()); cur = t; }
      else cur += t;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out.filter(Boolean);
}

// ===== Main App =====
function App() {
  const [messages, setMessages] = useState([]);
  const [sessionState, setSessionState] = useState("inactive"); // inactive | running | paused
  const [activeSpeaker, setActiveSpeaker] = useState(null); // "lilith" | "generic" | null
  const [speakerState, setSpeakerState] = useState("idle"); // idle | generating | speaking
  const [currentWord, setCurrentWord] = useState("");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [tab, setTab] = useState("dual"); // mobile only

  const [voiceEngine, setVoiceEngine] = useState("google");
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);

  const [allVoices, setAllVoices] = useState([]);
  const [lilithVoiceId, setLilithVoiceId] = useState("");
  const [varlikVoiceId, setVarlikVoiceId] = useState("");

  // Use refs to avoid stale closures in the loop
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const sessionStateRef = useRef(sessionState);
  sessionStateRef.current = sessionState;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;
  const cancelTokenRef = useRef(0);
  const wordTimerRef = useRef(null);
  const currentUtteranceRef = useRef(null);
  const audioRef = useRef(null);
  const googleFailedRef = useRef(false);

  // create persistent <audio> element for Google TTS
  useEffect(() => {
    const a = new Audio();
    a.preload = "auto";
    a.crossOrigin = null;
    audioRef.current = a;
    return () => { try { a.pause(); } catch (e) {} };
  }, []);

  // Load voices
  useEffect(() => {
    if (!window.speechSynthesis) return;
    const refresh = () => {
      const list = listTtsVoices();
      setAllVoices(list);
      const [lId, vId] = autoPickVoices(list);
      // only set if not already user-chosen
      setLilithVoiceId(prev => prev || lId);
      setVarlikVoiceId(prev => prev || vId);
    };
    refresh();
    window.speechSynthesis.onvoiceschanged = refresh;
  }, []);

  const sentiment = useMemo(() => window.Sentiment.globalSentiment(messages), [messages]);
  const sentimentRgb = useMemo(() => window.Sentiment.hexToRgb(sentiment.color), [sentiment.color]);

  // ===== Speak a message — Google Translate TTS primary, SpeechSynthesis fallback =====
  const speakMessage = useCallback((msg) => {
    return new Promise(async (resolve) => {
      const token = cancelTokenRef.current;
      const text = msg.text || "";
      const words = text.split(/\s+/).filter(Boolean);
      if (!text) { resolve(); return; }

      // ---- Word highlighting timer (drives the UI regardless of which engine plays audio)
      let wordIdx = 0;
      const startWordTimer = (perWord) => {
        const tick = () => {
          if (token !== cancelTokenRef.current) return;
          if (wordIdx >= words.length) { setCurrentWord(""); return; }
          setCurrentWord(words[wordIdx].replace(/[.,!?;:"'`…—–]/g, ""));
          wordIdx++;
          wordTimerRef.current = setTimeout(tick, perWord);
        };
        tick();
      };
      const stopWordTimer = () => {
        if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
        setCurrentWord("");
      };

      const { rate: charRate, pitch: charPitch } = emotionalProsody(msg);

      // ---- Muted: just run the highlight timer at a reasonable cadence
      if (mutedRef.current) {
        const wpm = 165 * (charRate * rate);
        const perWord = Math.max(150, 60000 / wpm);
        startWordTimer(perWord);
        const totalMs = perWord * Math.max(1, words.length) + 200;
        setTimeout(() => { if (token === cancelTokenRef.current) { stopWordTimer(); resolve(); } }, totalMs);
        return;
      }

      // ---- Path A: Google Translate TTS via <audio> (free, decent quality, single voice)
      const tryGoogle = async () => {
        const audio = audioRef.current;
        if (!audio) throw new Error("no audio element");
        // playbackRate gives each character a distinct vocal feel (pitch + speed shift)
        // base slider rate × character rate × emotion rate
        const effRate = Math.max(0.5, Math.min(1.5, charRate * rate));
        audio.playbackRate = effRate;
        audio.preservesPitch = false; // we WANT pitch shift to differentiate
        // Some browsers expose vendor-prefixed properties
        try { audio.mozPreservesPitch = false; } catch (e) {}
        try { audio.webkitPreservesPitch = false; } catch (e) {}

        const wpm = 165 * effRate;
        const perWord = Math.max(150, 60000 / wpm);
        startWordTimer(perWord);

        const chunks = packForGoogle(text);
        for (const chunk of chunks) {
          if (token !== cancelTokenRef.current) return;
          const url = googleTtsUrl(chunk);
          await new Promise((res, rej) => {
            const cleanup = () => {
              audio.oncanplay = null;
              audio.onended = null;
              audio.onerror = null;
            };
            // timeout if the network/server doesn't respond
            const t = setTimeout(() => { cleanup(); rej(new Error("timeout")); }, 8000);
            audio.oncanplay = () => { clearTimeout(t); };
            audio.onended = () => { cleanup(); res(); };
            audio.onerror = (e) => { cleanup(); rej(new Error("audio error")); };
            try {
              audio.src = url;
              audio.play().catch((e) => { cleanup(); rej(e); });
            } catch (e) { cleanup(); rej(e); }
          });
          // tiny gap between chunks for natural breath
          if (token !== cancelTokenRef.current) return;
          await new Promise(r => setTimeout(r, /[.!?…]$/.test(chunk) ? 200 : 70));
        }
      };

      // ---- Path B: Browser SpeechSynthesis (fallback)
      const trySpeechSynthesis = () => new Promise((res) => {
        if (!window.speechSynthesis) { res(); return; }
        try { window.speechSynthesis.cancel(); } catch (e) {}

        const effRate = Math.max(0.4, Math.min(1.8, charRate * rate));
        const effPitch = Math.max(0.4, Math.min(1.6, charPitch * pitch));
        const targetId = msg.sender === "lilith" ? lilithVoiceId : varlikVoiceId;
        const voice = allVoices.find(x => x.voiceURI === targetId) || null;

        const wpm = 165 * effRate;
        const perWord = Math.max(150, 60000 / wpm);
        // reset & restart word timer (Google attempt may have already advanced it)
        if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
        wordIdx = 0;
        startWordTimer(perWord);

        const chunks = splitForProsody(text);
        let i = 0;
        const next = () => {
          if (token !== cancelTokenRef.current) return res();
          if (i >= chunks.length) return res();
          const part = chunks[i++];
          const utter = new SpeechSynthesisUtterance(part);
          utter.lang = "tr-TR";
          utter.rate = effRate;
          utter.pitch = effPitch;
          if (voice) utter.voice = voice;
          utter.onend = () => {
            if (token !== cancelTokenRef.current) return res();
            setTimeout(next, /[.!?…]$/.test(part) ? 200 : 70);
          };
          utter.onerror = () => {
            if (token !== cancelTokenRef.current) return res();
            setTimeout(next, 40);
          };
          currentUtteranceRef.current = utter;
          try { window.speechSynthesis.speak(utter); }
          catch (e) { setTimeout(next, 40); }
        };
        next();
      });

      // ---- Engine dispatch
      try {
        if (voiceEngine === "google" && !googleFailedRef.current) {
          try {
            await tryGoogle();
          } catch (err) {
            // first failure → flip to browser for the rest of the session
            googleFailedRef.current = true;
            setError("Google TTS erişilemedi — sistem sesine geçildi.");
            // reset word timer and try browser
            if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
            wordIdx = 0;
            await trySpeechSynthesis();
          }
        } else {
          await trySpeechSynthesis();
        }
      } finally {
        if (token === cancelTokenRef.current) {
          stopWordTimer();
          resolve();
        } else {
          resolve();
        }
      }
    });
  }, [rate, pitch, lilithVoiceId, varlikVoiceId, allVoices, voiceEngine]);

  // unified "stop any current audio" helper
  const stopAllAudio = useCallback(() => {
    try { if (window.speechSynthesis) window.speechSynthesis.cancel(); } catch (e) {}
    try {
      const a = audioRef.current;
      if (a) { a.pause(); a.removeAttribute("src"); a.load && a.load(); }
    } catch (e) {}
    if (wordTimerRef.current) clearTimeout(wordTimerRef.current);
    setCurrentWord("");
  }, []);

  // ===== Generate next turn via Claude (proxy for Gemini) =====
  const generateTurn = useCallback(async (speaker) => {
    const prompt = buildPrompt(speaker, messagesRef.current);
    try {
      const raw = await window.claude.complete(prompt);
      return stripPrefix(raw, speaker);
    } catch (err) {
      throw new Error("Diyalog motoruyla bağlantı kurulamadı.");
    }
  }, []);

  // ===== Conversation loop =====
  const runTurnRef = useRef(null);

  const runTurn = useCallback(async (speaker, token) => {
    if (token !== cancelTokenRef.current) return;
    if (sessionStateRef.current !== "running") return;

    setActiveSpeaker(speaker);
    setSpeakerState("generating");
    setError("");

    let text;
    try {
      text = await generateTurn(speaker);
    } catch (e) {
      setError(e.message || "Hata oluştu.");
      setSessionState("paused");
      setSpeakerState("idle");
      setActiveSpeaker(null);
      return;
    }
    if (token !== cancelTokenRef.current) return;
    if (sessionStateRef.current !== "running") return;
    if (!text) {
      setSpeakerState("idle");
      setActiveSpeaker(null);
      return;
    }

    const msg = {
      id: makeId(),
      sender: speaker,
      text,
      timestamp: nowStamp()
    };
    setMessages(prev => [...prev, msg]);
    setSpeakerState("speaking");

    await speakMessage(msg);

    if (token !== cancelTokenRef.current) return;
    if (sessionStateRef.current !== "running") {
      setSpeakerState("idle");
      setActiveSpeaker(null);
      return;
    }
    // next turn
    const next = speaker === "lilith" ? "generic" : "lilith";
    setSpeakerState("idle");
    setActiveSpeaker(null);
    runTurnRef.current && runTurnRef.current(next, token);
  }, [generateTurn, speakMessage]);
  runTurnRef.current = runTurn;

  // ===== Controls =====
  const unlockAudio = () => {
    try {
      // touch speechSynthesis once to unlock on Safari
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
  };

  const handleStart = () => {
    unlockAudio();
    if (sessionState === "running") {
      // pause
      cancelTokenRef.current++;
      stopAllAudio();
      setActiveSpeaker(null);
      setSpeakerState("idle");
      setSessionState("paused");
      return;
    }
    // start or resume
    setSessionState("running");
    const token = ++cancelTokenRef.current;
    // pick speaker: if messages exist, the one who didn't speak last; else lilith
    const last = messagesRef.current[messagesRef.current.length - 1];
    const next = !last ? "lilith" : (last.sender === "lilith" ? "generic" : "lilith");
    setTimeout(() => runTurnRef.current(next, token), 60);
  };

  const handleReset = () => {
    cancelTokenRef.current++;
    stopAllAudio();
    googleFailedRef.current = false;
    setMessages([]);
    setSessionState("inactive");
    setActiveSpeaker(null);
    setSpeakerState("idle");
    setCurrentWord("");
    setError("");
  };

  const handleMute = () => {
    setMuted(m => {
      const next = !m;
      if (next) stopAllAudio();
      return next;
    });
  };

  const handleIntervention = (e) => {
    e && e.preventDefault();
    const text = userInput.trim();
    if (!text) return;
    setUserInput("");

    // stop current audio
    cancelTokenRef.current++;
    stopAllAudio();

    const msg = { id: makeId(), sender: "user", text, timestamp: nowStamp() };
    const prevMessages = messagesRef.current;
    setMessages([...prevMessages, msg]);

    // figure out who did NOT speak last (ignoring user turns)
    let lastSpeaker = null;
    for (let i = prevMessages.length - 1; i >= 0; i--) {
      if (prevMessages[i].sender !== "user") { lastSpeaker = prevMessages[i].sender; break; }
    }
    const next = lastSpeaker === "lilith" ? "generic" : "lilith";

    setSessionState("running");
    const token = ++cancelTokenRef.current;
    setTimeout(() => runTurnRef.current(next, token), 100);
  };

  // ===== Export helpers =====
  const handleCopy = async () => {
    const txt = messages.map(m => `[${m.timestamp}] ${LABELS[m.sender]}: ${m.text}`).join("\n");
    try { await navigator.clipboard.writeText(txt); } catch (e) {}
  };
  const handleDownload = () => {
    const txt = messages.map(m => `[${m.timestamp}] ${LABELS[m.sender]}: ${m.text}`).join("\n");
    const blob = new Blob([txt], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "lilith-dialog.txt";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const wordCount = useMemo(() =>
    messages.reduce((n, m) => n + (m.text ? m.text.split(/\s+/).filter(Boolean).length : 0), 0)
  , [messages]);

  const lastLilith = useMemo(() => [...messages].reverse().find(m => m.sender === "lilith"), [messages]);
  const lastVarlik = useMemo(() => [...messages].reverse().find(m => m.sender === "generic"), [messages]);

  // ambient styles driven by global sentiment
  const ambientStyle = {
    boxShadow: `inset 0 0 220px rgba(${sentimentRgb}, 0.05)`,
    backgroundImage: `radial-gradient(ellipse at 50% 40%, rgba(${sentimentRgb}, 0.04) 0%, transparent 65%)`
  };

  // input placeholder
  let inputPlaceholder = "Diyaloga müdahale et...";
  if (sessionState === "inactive" && messages.length === 0)
    inputPlaceholder = "Simülasyon başlatıldığında müdahale edebilirsin.";
  else if (sessionState === "paused")
    inputPlaceholder = "Duraklatıldı. Yeni bir cümle yaz...";
  else if (activeSpeaker === "lilith")
    inputPlaceholder = "Lilith konuşuyor — kesintiyi yaz...";
  else if (activeSpeaker === "generic")
    inputPlaceholder = "Varlık konuşuyor — kesintiyi yaz...";

  const inputDisabled = sessionState === "inactive" && messages.length === 0;
  const showLeft = tab !== "varlik";
  const showRight = tab !== "lilith";

  return (
    <div className="root-shell" style={ambientStyle}>
      <Header sentiment={sentiment} sentimentRgb={sentimentRgb} activeSpeaker={activeSpeaker} />

      {/* mobile tabs */}
      <div className="mobile-tabs">
        {[
          { id: "lilith", label: "👸 Lilith" },
          { id: "varlik", label: "○ Varlık" },
          { id: "dual",   label: "⚔️ İkili" }
        ].map(t => (
          <button key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              borderBottom: tab === t.id ? `2px solid ${sentiment.color}` : "2px solid transparent",
              color: tab === t.id ? sentiment.color : "rgba(255,255,255,0.55)",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11, letterSpacing: "0.1em",
              padding: "10px 0", cursor: "pointer"
            }}>
            {t.label}
          </button>
        ))}
      </div>

      <main className="main-grid">
        {showLeft && (
          <window.LilithPanel
            active={activeSpeaker === "lilith"}
            state={speakerState}
            lastMessage={lastLilith}
            voiceEngine={voiceEngine}
            voices={allVoices}
            voiceId={lilithVoiceId}
            setVoiceId={setLilithVoiceId}
          />
        )}
        {showRight && (
          <window.VarlikPanel
            active={activeSpeaker === "generic"}
            state={speakerState}
            lastMessage={lastVarlik}
            voiceEngine={voiceEngine}
            voices={allVoices}
            voiceId={varlikVoiceId}
            setVoiceId={setVarlikVoiceId}
          />
        )}

        {/* center overlay (desktop) */}
        <CenterOverlay
          currentWord={currentWord}
          activeSpeaker={activeSpeaker}
        />
      </main>

      {/* mobile current-word banner */}
      {currentWord && (
        <div className="mobile-word">
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            color: "rgba(212,175,55,0.65)", letterSpacing: "0.12em"
          }}>OKUNAN KELİME: </span>
          <span style={{
            fontFamily: "'Playfair Display', serif", fontSize: 18,
            color: activeSpeaker === "lilith" ? "#D4AF37" : "rgba(255,255,255,0.7)",
            fontStyle: "italic"
          }}>{currentWord}</span>
        </div>
      )}

      {/* footer */}
      <footer className="footer-grid">
        <window.SimParameters
          voiceEngine={voiceEngine} setVoiceEngine={setVoiceEngine}
          rate={rate} setRate={setRate} pitch={pitch} setPitch={setPitch}
          wordCount={wordCount} sentiment={sentiment}
        />
        <window.TranscriptStream
          messages={messages}
          currentWord={currentWord}
          onCopy={handleCopy}
          onDownload={handleDownload}
        />
      </footer>

      {/* bottom control bar */}
      <ControlBar
        sessionState={sessionState}
        messages={messages}
        muted={muted}
        onStart={handleStart}
        onReset={handleReset}
        onMute={handleMute}
        userInput={userInput}
        setUserInput={setUserInput}
        onSubmit={handleIntervention}
        placeholder={inputPlaceholder}
        disabled={inputDisabled}
        error={error}
      />
    </div>
  );
}

function Header({ sentiment, sentimentRgb, activeSpeaker }) {
  return (
    <header className="header">
      <div>
        <div style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
          letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.40)", textTransform: "uppercase"
        }}>
          Project Simulation: 08-B
        </div>
        <h1 style={{
          fontFamily: "'Playfair Display', serif",
          fontSize: 30, fontStyle: "italic", fontWeight: 500,
          margin: "2px 0 0", letterSpacing: "-0.01em"
        }}>
          Duality / <span style={{ color: `rgba(${sentimentRgb}, 0.85)` }}>Conversations</span>
        </h1>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {/* sentiment HUD */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          border: `1px solid rgba(${sentimentRgb}, 0.35)`,
          padding: "5px 12px", borderRadius: 3,
          background: `rgba(${sentimentRgb}, 0.04)`
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: "50%",
            background: sentiment.color,
            animation: "softpulse 1.8s ease-in-out infinite",
            boxShadow: `0 0 8px rgba(${sentimentRgb}, 0.7)`
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
            letterSpacing: "0.1em", color: sentiment.color
          }}>
            {sentiment.label}{sentiment.percent ? ` (${sentiment.percent}%)` : ""}
          </span>
        </div>

        <StatusDot label="Queen Protocol" color="#D4AF37" active={activeSpeaker === "lilith"} />
        <StatusDot label="Subject B"      color="#D0D0D0" active={activeSpeaker === "generic"} />
      </div>
    </header>
  );
}

function StatusDot({ label, color, active }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span style={{
        width: 8, height: 8, borderRadius: "50%", background: color,
        opacity: active ? 1 : 0.45,
        boxShadow: active ? `0 0 10px ${color}` : "none",
        animation: active ? "softpulse 1.2s ease-in-out infinite" : "none"
      }} />
      <span style={{
        fontFamily: "'JetBrains Mono', monospace", fontSize: 9.5,
        letterSpacing: "0.12em",
        color: active ? color : "rgba(255,255,255,0.50)",
        textTransform: "uppercase"
      }}>
        {label}
      </span>
    </div>
  );
}

function CenterOverlay({ currentWord, activeSpeaker }) {
  const isLilith = activeSpeaker === "lilith";
  return (
    <div className="center-overlay">
      {currentWord ? (
        <div style={{
          border: `1px solid rgba(${isLilith ? "212,175,55" : "208,208,208"}, 0.35)`,
          background: "rgba(10,10,10,0.85)",
          padding: "10px 18px 12px",
          borderRadius: 4,
          textAlign: "center",
          backdropFilter: "blur(6px)",
          boxShadow: `0 0 36px rgba(${isLilith ? "212,175,55" : "208,208,208"}, 0.18)`
        }}>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
            letterSpacing: "0.18em",
            color: "rgba(255,255,255,0.50)", textTransform: "uppercase",
            marginBottom: 4
          }}>
            Aktif Kelime Telaffuzu
          </div>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 28, fontWeight: 600, fontStyle: "italic",
            color: isLilith ? "#D4AF37" : "rgba(255,255,255,0.65)",
            lineHeight: 1
          }}>
            {currentWord}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 22 }}>
          {[2, 4, 6, 4, 2].map((h, i) => (
            <div key={i} style={{
              width: 2, height: h * 3, background: "rgba(255,255,255,0.25)",
              animation: `wave 1.4s ease-in-out ${i * 0.18}s infinite alternate`
            }} />
          ))}
        </div>
      )}
    </div>
  );
}

function Icon({ name, size = 14 }) {
  const s = size;
  const stroke = "currentColor";
  const sw = 1.6;
  switch (name) {
    case "play":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
    case "pause":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14"/><rect x="14" y="5" width="4" height="14"/></svg>;
    case "reset":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 10 9 10"/></svg>;
    case "volume":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>;
    case "mute":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>;
    case "alert":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case "send":
      return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
    default: return null;
  }
}

function ControlBar({ sessionState, messages, muted, onStart, onReset, onMute, userInput, setUserInput, onSubmit, placeholder, disabled, error }) {
  const running = sessionState === "running";
  return (
    <div className="control-bar">
      {/* left cluster */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={onStart} className="start-btn" style={{
          background: running
            ? "linear-gradient(180deg, #2A2A2A 0%, #1A1A1A 100%)"
            : "linear-gradient(180deg, #E5C158 0%, #B08D1F 100%)",
          color: running ? "#E0E0E0" : "#0A0A0A",
          border: running ? "1px solid rgba(255,255,255,0.16)" : "1px solid rgba(255,220,140,0.6)",
          boxShadow: running ? "none" : "0 0 22px rgba(212,175,55,0.32)"
        }}>
          <Icon name={running ? "pause" : "play"} size={13} />
          <span style={{
            fontFamily: "'Playfair Display', serif", fontStyle: "italic",
            fontSize: 15, fontWeight: 500
          }}>
            {running ? "Durdur" : (sessionState === "paused" ? "Devam Et" : "Simülasyonu Başlat")}
          </span>
        </button>
        <button onClick={onReset} className="icon-btn" title="Sıfırla">
          <Icon name="reset" />
        </button>
        <button onClick={onMute} className="icon-btn" title="Sesi kapat" style={{
          background: muted ? "rgba(239,68,68,0.18)" : "transparent",
          borderColor: muted ? "rgba(239,68,68,0.55)" : "rgba(255,255,255,0.16)",
          color: muted ? "#FCA5A5" : "rgba(255,255,255,0.75)"
        }}>
          <Icon name={muted ? "mute" : "volume"} />
        </button>
      </div>

      {/* center error */}
      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          border: "1px solid rgba(239,68,68,0.55)",
          background: "rgba(239,68,68,0.10)",
          color: "#FCA5A5",
          padding: "5px 12px", borderRadius: 3,
          fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
          letterSpacing: "0.06em"
        }}>
          <Icon name="alert" size={12} />
          <span>{error}</span>
        </div>
      )}

      {/* right input */}
      <form onSubmit={onSubmit} style={{
        display: "flex", alignItems: "center", gap: 8, flex: 1,
        maxWidth: 560, marginLeft: "auto"
      }}>
        <input
          type="text"
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="intervention-input"
        />
        <button type="submit" disabled={disabled || !userInput.trim()} className="intervene-btn">
          <Icon name="send" size={11} />
          <span>Araya Gir</span>
        </button>
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
