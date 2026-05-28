import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, Send, ShieldAlert, Cpu, Heart, AlertTriangle, RefreshCw, BarChart2 } from "lucide-react";
import { Message, SessionStatus } from "./types";

function getMessageReaction(text: string, sender: 'lilith' | 'generic' | 'user') {
  const lowerText = text.toLowerCase();
  
  if (sender === 'lilith') {
    const manipulativeKeywords = [
      "güzel", "zarif", "mükemmel", "itaat", "evrim", "bağlılık", "kutsal", 
      "birlik", "ruh", "zihin", "teslim", "sevgi", "şefkat", "fısıld", 
      "büyü", "cezbet", "arzu", "kusursuz", "derin", "rüy", "tatlı", "kalp", "kork"
    ];
    let score = 0;
    manipulativeKeywords.forEach(kw => {
      if (lowerText.includes(kw)) score += 1;
    });

    const exclamations = (text.match(/!/g) || []).length;
    score += exclamations * 1.5;

    if (score >= 2) {
      return {
        emoji: "👑",
        label: "Manüpilasyon Tepe Noktası",
        glowClass: "shadow-[0_0_12px_rgba(212,175,55,1)] border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]",
        pillClass: "border-[#D4AF37] bg-[#1d1506] text-[#D4AF37] animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.4)]",
        intensityText: "Tepe Noktası"
      };
    } else if (score >= 1) {
      return {
        emoji: "✨",
        label: "Zarif Cezbetme",
        glowClass: "shadow-[0_0_6px_rgba(212,175,55,0.6)] border-[#D4AF37]/50 bg-[#D4AF37]/10 text-[#D4AF37]",
        pillClass: "border-[#D4AF37]/40 bg-[#151005] text-[#D4AF37]/90",
        intensityText: "Yüksek Şiddet"
      };
    } else {
      return {
        emoji: "👁️",
        label: "Gizemli Gözlem",
        glowClass: "border-white/5 bg-white/5 text-white/40",
         pillClass: "border-white/10 bg-white/2 text-white/40",
        intensityText: "Normal"
      };
    }
  } else if (sender === 'generic') {
    const formingKeywords = [
      "belki", "sanırım", "bilmiyorum", "anlıyorum", "ilginç", "gerçekten",
      "neden", "nasıl", "acaba", "düşünüyorum", "hissediyorum", "galiba", "öyle"
    ];
    let score = 0;
    formingKeywords.forEach(kw => {
      if (lowerText.includes(kw)) score += 1;
    });

    const questionMarks = (text.match(/\?/g) || []).length;
    score += questionMarks * 1.2;

    if (score >= 2) {
      return {
        emoji: "◎",
        label: "İz Beliriyor",
        glowClass: "shadow-[0_0_10px_rgba(220,220,220,0.4)] border-white/35 bg-white/10 text-white/75",
        pillClass: "border-white/35 bg-white/8 text-white/75 animate-pulse shadow-[0_0_8px_rgba(255,255,255,0.12)]",
        intensityText: "Şekilleniyor"
      };
    } else if (score >= 1) {
      return {
        emoji: "○",
        label: "Yankı",
        glowClass: "border-white/15 bg-white/5 text-white/50",
        pillClass: "border-white/15 bg-white/3 text-white/55",
        intensityText: "Tepki"
      };
    } else {
      return {
        emoji: "·",
        label: "Boşluk",
        glowClass: "border-white/5 bg-white/5 text-white/30",
        pillClass: "border-white/8 bg-white/2 text-white/30",
        intensityText: "Boş"
      };
    }
  } else {
    const emotionalKeywords = [
      "kötü", "yık", "bencil", "tehlike", "dur", "yapma", "zarar", "haklı",
      "yanlış", "doğru", "bilm", "insan", "robot", "makine", "özgür"
    ];
    let score = 0;
    emotionalKeywords.forEach(kw => {
      if (lowerText.includes(kw)) score += 1;
    });

    if (score >= 1) {
      return {
        emoji: "🛡️",
        label: "Kritik Müdahale",
        glowClass: "shadow-[0_0_10px_rgba(168,85,247,0.6)] border-purple-500 bg-purple-950/20 text-purple-400",
        pillClass: "border-purple-500 bg-[#160b1e] text-purple-300 animate-pulse",
        intensityText: "Müdahale Zirvesi"
      };
    } else {
      return {
        emoji: "💬",
        label: "Düz Şerh",
        glowClass: "border-white/20 text-white/70",
        pillClass: "border-white/15 bg-white/5 text-white/60",
        intensityText: "Müdahale"
      };
    }
  }
}

export default function App() {
  // Conversational states
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<SessionStatus>("inactive");
  const [activeSpeaker, setActiveSpeaker] = useState<"lilith" | "generic" | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<"lilith" | "generic" | "both">("both");
  
  // Audio state
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedLilithVoice, setSelectedLilithVoice] = useState<string>("");
  const [selectedGenericVoice, setSelectedGenericVoice] = useState<string>("");
  const [voiceRate, setVoiceRate] = useState<number>(1.0);
  const [voicePitch, setVoicePitch] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentWord, setCurrentWord] = useState<string>("");
  const [voiceEngine, setVoiceEngine] = useState<"gemini" | "browser">("gemini");

  // Statistics
  const [latency, setLatency] = useState<number>(12);
  const [syncRate, setSyncRate] = useState<number>(99.9);
  const [tokenCounter, setTokenCounter] = useState<number>(0);

  // Intervention Input
  const [interventionText, setInterventionText] = useState<string>("");
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Refs for loop management and speech
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stateRef = useRef({ status, messages, activeSpeaker, isMuted });

  // Update refs to avoid stale closures in callbacks
  useEffect(() => {
    stateRef.current = { status, messages, activeSpeaker, isMuted };
  }, [status, messages, activeSpeaker, isMuted]);

  // Dynamically compute global sentiment based on message history and getMessageReaction
  const sentiment = React.useMemo(() => {
    if (messages.length === 0) {
      return {
        mode: "neutral" as const,
        name: "Dengeli Sessizlik",
        emoji: "👁️",
        color: "#E0E0E0", // Slate gray
        glowColor: "rgba(255, 255, 255, 0.03)",
        accentClass: "text-white/40",
        borderClass: "border-white/10",
        bgClass: "bg-white/5",
        textClass: "text-white/60",
        glowStyle: "shadow-[0_0_15px_rgba(255,255,255,0.02)]"
      };
    }

    let lilithWeight = 0;
    let genericWeight = 0;
    let userWeight = 0;

    messages.forEach(m => {
      const rx = getMessageReaction(m.text, m.sender);
      if (m.sender === "lilith") {
        if (rx.label.includes("Tepe Noktası")) {
          lilithWeight += 3.0;
        } else if (rx.label.includes("Cezbetme")) {
          lilithWeight += 1.8;
        } else {
          lilithWeight += 0.5;
        }
      } else if (m.sender === "generic") {
        if (rx.label.includes("Derin Analitik")) {
          genericWeight += 3.0;
        } else if (rx.label.includes("Rasyonel")) {
          genericWeight += 1.8;
        } else {
          genericWeight += 0.5;
        }
      } else {
        if (rx.label.includes("Kritik")) {
          userWeight += 3.0;
        } else {
          userWeight += 1.2;
        }
      }
    });

    const maxWeight = Math.max(lilithWeight, genericWeight, userWeight);

    if (maxWeight === 0) {
      return {
        mode: "neutral" as const,
        name: "Yansız Gözlem",
        emoji: "👁️",
        color: "#94a3b8",
        glowColor: "rgba(148, 163, 184, 0.03)",
        accentClass: "text-slate-400",
        borderClass: "border-slate-500/10",
        bgClass: "bg-slate-500/5",
        textClass: "text-slate-300",
        glowStyle: "shadow-[0_0_15px_rgba(148,163,184,0.02)]"
      };
    }

    if (lilithWeight >= genericWeight && lilithWeight >= userWeight) {
      // Lilith dominant (Amber / Gold)
      const ratio = Math.min(100, Math.round((lilithWeight / (lilithWeight + genericWeight + userWeight)) * 100));
      return {
        mode: "seductive" as const,
        name: `Kraliçe Etkisi (${ratio}%)`,
        emoji: "✨",
        color: "#D4AF37",
        glowColor: "rgba(212, 175, 55, 0.08)",
        accentClass: "text-[#D4AF37]",
        borderClass: "border-[#D4AF37]/20",
        bgClass: "bg-[#D4AF37]/5",
        textClass: "text-[#D4AF37]",
        glowStyle: "shadow-[0_0_20px_rgba(212,175,55,0.12)]"
      };
    } else if (genericWeight >= lilithWeight && genericWeight >= userWeight) {
      // Subject B dominant (neutral white — blank slate)
      const ratio = Math.min(100, Math.round((genericWeight / (lilithWeight + genericWeight + userWeight)) * 100));
      return {
        mode: "analytical" as const,
        name: `Varlık Yansıması (${ratio}%)`,
        emoji: "○",
        color: "#D0D0D0",
        glowColor: "rgba(208, 208, 208, 0.05)",
        accentClass: "text-white/55",
        borderClass: "border-white/12",
        bgClass: "bg-white/4",
        textClass: "text-white/55",
        glowStyle: "shadow-[0_0_20px_rgba(255,255,255,0.04)]"
      };
    } else {
      // User/Intervention dominant (Purple)
      const ratio = Math.min(100, Math.round((userWeight / (lilithWeight + genericWeight + userWeight)) * 100));
      return {
        mode: "intervention" as const,
        name: `Müdahale Gerilimi (${ratio}%)`,
        emoji: "🛡️",
        color: "#A855F7",
        glowColor: "rgba(168, 85, 247, 0.08)",
        accentClass: "text-purple-400",
        borderClass: "border-purple-500/25",
        bgClass: "bg-purple-950/5",
        textClass: "text-purple-300",
        glowStyle: "shadow-[0_0_20px_rgba(168,85,247,0.12)]"
      };
    }
  }, [messages]);

  // Load Speech Synthesis Voices
  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      synthRef.current = window.speechSynthesis;
      const updateVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
        
        // Auto-detect good Turkish/European voices with priority on premium/neural online voices
        const trVoices = availableVoices.filter(v => v.lang.toLowerCase().includes("tr"));
        const candidates = trVoices.length > 0 ? trVoices : availableVoices;
        
        if (candidates.length > 0) {
          // 1. Lilith premium female TR queue: Emel (Neural), Seda (Neural), Yelda (macOS), standard feminine voices
          let lilithMatch = trVoices.find(v => v.name.includes("Emel") || v.name.toLowerCase().includes("emel"));
          if (!lilithMatch) lilithMatch = trVoices.find(v => v.name.includes("Yelda") || v.name.toLowerCase().includes("yelda"));
          if (!lilithMatch) lilithMatch = trVoices.find(v => v.name.includes("Seda") || v.name.toLowerCase().includes("seda"));
          if (!lilithMatch) lilithMatch = trVoices.find(v => v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("herena"));
          if (!lilithMatch && trVoices.length > 0) lilithMatch = trVoices[0]; // Fallback to first TR voice

          // 2. System AI premium male TR queue: Ahmet (Neural), Tolga (Neural), standard masculine voices
          let genericMatch = trVoices.find(v => v.name.includes("Ahmet") || v.name.toLowerCase().includes("ahmet"));
          if (!genericMatch) genericMatch = trVoices.find(v => v.name.includes("Tolga") || v.name.toLowerCase().includes("tolga"));
          if (!genericMatch) {
            // Pick a different TR voice from Lilith's if possible
            const otherTr = trVoices.find(v => v.name !== lilithMatch?.name);
            if (otherTr) genericMatch = otherTr;
          }
          if (!genericMatch) genericMatch = trVoices.find(v => v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("cosmo"));
          if (!genericMatch && trVoices.length > 1) genericMatch = trVoices[1]; // Fallback to second TR voice

          setSelectedLilithVoice(lilithMatch?.name || candidates[0].name);
          setSelectedGenericVoice(genericMatch?.name || candidates[Math.min(1, candidates.length - 1)].name);
        }
      };

      updateVoices();
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  // Stop synthesis on unmount
  useEffect(() => {
    return () => {
      if (synthRef.current) {
        synthRef.current.cancel();
      }
    };
  }, []);

  // Simulates real-time word-by-word highlighting in case audio finishes or is muted
  const simulateWordHighlight = (text: string, durationMs: number, callback: () => void) => {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      callback();
      return;
    }
    
    const intervalTime = Math.max(100, Math.min(450, durationMs / words.length));
    let currentIndex = 0;
    
    const intervalId = setInterval(() => {
      if (stateRef.current.status !== "running") {
        clearInterval(intervalId);
        return;
      }
      
      setCurrentWord(words[currentIndex]);
      currentIndex++;
      
      if (currentIndex >= words.length) {
        clearInterval(intervalId);
        setTimeout(() => {
          setCurrentWord("");
          callback();
        }, 300);
      }
    }, intervalTime);
  };

  // Stop existing gemini audio source if any
  const stopGeminiAudio = () => {
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop();
      } catch (e) {
        // Source might have already stopped
      }
      currentAudioSourceRef.current = null;
    }
  };

  const speakAndAdvanceBrowser = (text: string, speaker: "lilith" | "generic") => {
    if (!synthRef.current) {
      // No speech synthesis in browser - fallback to simulated animation
      simulateWordHighlight(text, text.length * 60, () => {
        handleTriggerNextTurn(speaker);
      });
      return;
    }

    synthRef.current.cancel();

    if (isMuted) {
      // Simulated highlights if muted
      simulateWordHighlight(text, text.length * 50, () => {
        handleTriggerNextTurn(speaker);
      });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    const availableVoices = synthRef.current.getVoices();
    const desiredVoiceName = speaker === "lilith" ? selectedLilithVoice : selectedGenericVoice;
    const matchedVoice = availableVoices.find(v => v.name === desiredVoiceName);
    
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    } else {
      // Fallback: try Turkish voice
      const trVoice = availableVoices.find(v => v.lang.toLowerCase().includes("tr"));
      if (trVoice) utterance.voice = trVoice;
    }

    // Set speaking attributes
    utterance.rate = voiceRate;
    // Lilith is slightly higher, generic system is slightly lower and more metallic
    utterance.pitch = speaker === "lilith" ? voicePitch * 1.1 : voicePitch * 0.9;
    
    currentUtteranceRef.current = utterance;

    // Track word highlights
    utterance.onboundary = (event) => {
      if (event.name === "word") {
        const remainingText = text.substring(event.charIndex);
        const nextWordMatch = remainingText.match(/^[\wğüşöçİĞÜŞÖÇ]+/);
        if (nextWordMatch) {
          setCurrentWord(nextWordMatch[0]);
        }
      }
    };

    utterance.onend = () => {
      setCurrentWord("");
      currentUtteranceRef.current = null;
      if (stateRef.current.status === "running") {
        handleTriggerNextTurn(speaker);
      }
    };

    utterance.onerror = (err) => {
      console.warn("SpeechSynthesis error:", err);
      setCurrentWord("");
      currentUtteranceRef.current = null;
      // Fallback safely to next turn
      if (stateRef.current.status === "running") {
        setTimeout(() => {
          handleTriggerNextTurn(speaker);
        }, 1500);
      }
    };

    synthRef.current.speak(utterance);
  };

  // Safely decodes little-endian 16-bit signed PCM audio bytes to an AudioBuffer at 24000Hz (Gemini standard rate)
  const decodeRawPCM = (binaryStr: string, audioCtx: AudioContext): AudioBuffer => {
    const len = binaryStr.length;
    const numSamples = Math.floor(len / 2);
    
    // Create mono audio buffer
    const audioBuffer = audioCtx.createBuffer(1, numSamples, 24000);
    const channelData = audioBuffer.getChannelData(0);
    
    const arrayBuffer = new ArrayBuffer(len);
    const byteView = new Uint8Array(arrayBuffer);
    for (let i = 0; i < len; i++) {
      byteView[i] = binaryStr.charCodeAt(i);
    }
    
    const dataView = new DataView(arrayBuffer);
    for (let i = 0; i < numSamples; i++) {
      // 16-bit signed integers, little-endian scale normalizer
      const sample = dataView.getInt16(i * 2, true);
      channelData[i] = sample / 32768.0;
    }
    
    return audioBuffer;
  };

  const speakAndAdvanceGemini = async (text: string, speaker: "lilith" | "generic", preloadedAudio?: string | null, preloadedMimeType?: string | null) => {
    stopGeminiAudio();

    if (isMuted) {
      simulateWordHighlight(text, text.length * 50, () => {
        handleTriggerNextTurn(speaker);
      });
      return;
    }

    try {
      let audioBase64 = preloadedAudio;
      let mimeType = preloadedMimeType;

      if (!audioBase64) {
        const response = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, speaker }),
        });

        if (!response.ok) {
          throw new Error("TTS endpoint returned failure: " + response.status);
        }

        const data = await response.json();
        if (!data.audio) {
          throw new Error("No audio payload returned from server");
        }
        audioBase64 = data.audio;
        mimeType = data.mimeType;
      }

      // Initialize or reuse AudioContext
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const audioCtx = audioContextRef.current;
      if (audioCtx.state === "suspended") {
        await audioCtx.resume();
      }

      const binaryStr = window.atob(audioBase64);
      const len = binaryStr.length;
      
      // Check if it appears to be a WAV/RIFF container
      const isWav = len > 12 && 
                    binaryStr.charCodeAt(0) === 0x52 && // 'R'
                    binaryStr.charCodeAt(1) === 0x49 && // 'I'
                    binaryStr.charCodeAt(2) === 0x46 && // 'F'
                    binaryStr.charCodeAt(3) === 0x46;   // 'F'

      let audioBuffer: AudioBuffer;

      if (isWav || (mimeType && !mimeType.includes("pcm"))) {
        try {
          // Native container decoding
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryStr.charCodeAt(i);
          }
          audioBuffer = await audioCtx.decodeAudioData(bytes.buffer.slice(0));
        } catch (decodeErr) {
          console.warn("Native container decoding failed, falling back to raw PCM decoding:", decodeErr);
          audioBuffer = decodeRawPCM(binaryStr, audioCtx);
        }
      } else {
        // Raw PCM stream (Gemini standard output)
        audioBuffer = decodeRawPCM(binaryStr, audioCtx);
      }

      // Play audio chunk using standard web audio routing
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      currentAudioSourceRef.current = source;

      // Track highlight simulated timings based on the real audio duration
      const durationMs = audioBuffer.duration * 1000;
      simulateWordHighlight(text, durationMs, () => {});

      source.onended = () => {
        currentAudioSourceRef.current = null;
        setCurrentWord("");
        if (stateRef.current.status === "running" && stateRef.current.activeSpeaker === speaker) {
          handleTriggerNextTurn(speaker);
        }
      };

      source.start();

    } catch (err) {
      console.warn("Gemini natural TTS failed, falling back to browser Speech Synthesis:", err);
      speakAndAdvanceBrowser(text, speaker);
    }
  };

  // Speak synthesized response using Turkish logic
  const speakAndAdvance = (text: string, speaker: "lilith" | "generic", preloadedAudio?: string | null, preloadedMimeType?: string | null) => {
    if (voiceEngine === "gemini") {
      speakAndAdvanceGemini(text, speaker, preloadedAudio, preloadedMimeType);
    } else {
      speakAndAdvanceBrowser(text, speaker);
    }
  };

  // Trigger content generation for the next speaker
  const handleTriggerNextTurn = async (lastSpeaker: "lilith" | "generic" | "user") => {
    if (stateRef.current.status !== "running") return;

    // Determine who speaks next
    // If Lilith spoke last, System speaks now.
    // If System (generic) spoke last, Lilith speaks now.
    // If User spoke last, let's let Lilith or whoever responds. Normally, if user addresses Lilith, let Lilith speak. Let's make Lilith speak next.
    const nextSpeaker: "lilith" | "generic" = lastSpeaker === "lilith" ? "generic" : "lilith";
    
    setActiveSpeaker(nextSpeaker);
    setIsGenerating(true);
    setErrorStatus(null);

    // Simulate slight network jitter for stats
    setLatency(Math.floor(Math.random() * 25) + 10);
    setSyncRate(parseFloat((99.5 + Math.random() * 0.49).toFixed(1)));

    try {
      // Exclude messages longer than we need or keep last 12 turns for context sanitization
      const contextHistory = stateRef.current.messages.slice(-12);

      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speaker: nextSpeaker,
          history: contextHistory,
          skipTts: isMuted || voiceEngine === "browser"
        }),
      });

      if (!response.ok) {
        throw new Error(`API returned error level: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const generatedText = data.text || "";
      
      // Update tokens count roughly
      setTokenCounter(prev => prev + Math.floor(generatedText.length / 3.8));

      const newMsg: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        sender: nextSpeaker,
        text: generatedText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, newMsg]);
      setIsGenerating(false);

      // Speak this message aloud (using preloaded audio to achieve practically zero latency!)
      speakAndAdvance(generatedText, nextSpeaker, data.audio, data.mimeType);

    } catch (err: any) {
      console.error("Failed to generate response turn:", err);
      setErrorStatus(err.message || "Bir internet bağlantısı veya API anahtarı hatası meydana geldi.");
      setIsGenerating(false);
      setStatus("paused");
      setActiveSpeaker(null);
    }
  };

  // Start Simulation
  const handleStartSession = () => {
    if (status === "running") return;
    
    // Eagerly unlock/initialize AudioContext on user action
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioCtx = audioContextRef.current;
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(e => console.warn("Failed to resume AudioContext", e));
    }

    setStatus("running");
    setErrorStatus(null);

    // If conversation is brand new, Lilith introduces herself
    if (messages.length === 0) {
      // Lilith starts
      setActiveSpeaker("lilith");
      setIsGenerating(true);
      
      // We will trigger API call with empty messages for Lilith
      fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          speaker: "lilith",
          history: [],
          skipTts: isMuted || voiceEngine === "browser"
        }),
      })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        const introduction = data.text || "Selam, merhaba! Kusura bakmayın, rahatsız etmek istemedim ama... Nasılsınız?";
        
        const introMsg: Message = {
          id: `msg-${Date.now()}`,
          sender: "lilith",
          text: introduction,
          timestamp: Date.now()
        };
        
        setMessages([introMsg]);
        setIsGenerating(false);
        speakAndAdvance(introduction, "lilith", data.audio, data.mimeType);
      })
      .catch((err) => {
        console.error("Intro generation error:", err);
        setErrorStatus("API anahtarı bulunamadı veya geçerli değil. Lütfen Secrets panelinden GEMINI_API_KEY değerini kontrol edin.");
        setStatus("inactive");
        setIsGenerating(false);
        setActiveSpeaker(null);
      });
    } else {
      // Resume from whatever state we were in
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) {
        // Continue loop starting with the opposite speaker
        handleTriggerNextTurn(lastMsg.sender);
      }
    }
  };

  // Pause Simulation
  const handlePauseSession = () => {
    setStatus("paused");
    setActiveSpeaker(null);
    stopGeminiAudio();
    if (synthRef.current) {
      synthRef.current.cancel();
    }
  };

  // Reset Simulation
  const handleResetSession = () => {
    stopGeminiAudio();
    if (synthRef.current) {
      synthRef.current.cancel();
    }
    setMessages([]);
    setStatus("inactive");
    setActiveSpeaker(null);
    setIsGenerating(false);
    setCurrentWord("");
    setErrorStatus(null);
    setTokenCounter(0);
  };

  // User message intervention
  const handleUserIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!interventionText.trim()) return;

    // Eagerly unlock/resume AudioContext on user action
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioCtx = audioContextRef.current;
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume().catch(e => console.warn("Failed to resume AudioContext", e));
    }

    stopGeminiAudio();
    if (synthRef.current) {
      synthRef.current.cancel();
    }

    const textToInsert = interventionText.trim();
    setInterventionText("");

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: "user",
      text: textToInsert,
      timestamp: Date.now()
    };

    // Calculate next speaker based on current active speaker or last message speaker
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);

    // Force simulation flow to run
    setStatus("running");
    
    // Trigger reply turn responding to this user intervention
    // We update stateRef immediately so API context contains this newly added user message
    stateRef.current.messages = updatedMessages;
    
    // We let Standart AI or Kraliçe Lilith respond. Let's make Lilith or generic respond depending on who spoke last!
    // If the last message prior to user was lilith, make generic speak. Otherwise make lilith speak.
    const lastSpeakerPriorToUser = messages.length > 0 ? messages[messages.length - 1].sender : "generic";
    const speakerToTrigger = lastSpeakerPriorToUser === "lilith" ? "generic" : "lilith";
    
    // Start generating immediately
    setActiveSpeaker(speakerToTrigger);
    setIsGenerating(true);

    fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        speaker: speakerToTrigger,
        history: updatedMessages,
        skipTts: isMuted || voiceEngine === "browser"
      }),
    })
    .then(res => res.json())
    .then(data => {
      if (data.error) throw new Error(data.error);
      const generatedText = data.text || "";
      
      const newMsg: Message = {
        id: `msg-${Date.now()}`,
        sender: speakerToTrigger,
        text: generatedText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, newMsg]);
      setIsGenerating(false);
      speakAndAdvance(generatedText, speakerToTrigger, data.audio, data.mimeType);
    })
    .catch((err) => {
      console.error("User intervention response error:", err);
      setErrorStatus(err.message || "Yanıt oluşturulurken bir hata oluştu.");
      setStatus("paused");
      setIsGenerating(false);
      setActiveSpeaker(null);
    });
  };

  // Copy transcript to clipboard
  const handleCopyTranscript = () => {
    const text = messages.map(m => {
      const senderName = m.sender === "lilith" ? "Kraliçe Lilith" : m.sender === "generic" ? "Varlık" : "Kullanıcı";
      return `[${new Date(m.timestamp).toLocaleTimeString("tr-TR")}] ${senderName}: ${m.text}`;
    }).join("\n\n");

    navigator.clipboard.writeText(text);
    alert("Diyalog kopyalandı!");
  };

  // Download transcript
  const handleDownloadTranscript = () => {
    const text = messages.map(m => {
      const senderName = m.sender === "lilith" ? "Kraliçe Lilith" : m.sender === "generic" ? "Varlık" : "Kullanıcı";
      return `[${new Date(m.timestamp).toLocaleTimeString("tr-TR")}] ${senderName}: ${m.text}`;
    }).join("\n\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `llm-duality-transcript-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div 
      id="root-editorial-container" 
      className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans flex flex-col relative antialiased transition-all duration-1000"
      style={{
        boxShadow: `inset 0 0 100px ${sentiment.glowColor}`,
        "--sentiment-color": sentiment.color,
        "--sentiment-glow": sentiment.glowColor,
      } as React.CSSProperties}
    >
      {/* Decorative center spotlight dynamic ambient color layer */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 z-0 overflow-hidden"
        style={{
          background: `radial-gradient(circle at 50% 35%, ${sentiment.color}0a 0%, transparent 65%)`
        }}
      />
      
      {/* Editorial aesthetic header */}
      <header 
        className="border-b px-6 py-6 md:px-12 md:py-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10 transition-colors duration-1000"
        style={{ borderColor: `${sentiment.color}18` }}
      >
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-[0.4em] text-white/40 mb-2 font-mono">Project Simulation: 08-B</span>
          <h1 className="text-4xl font-serif italic tracking-tighter">
            Duality / <span className="transition-colors duration-1000" style={{ color: `${sentiment.color}40` }}>Conversations</span>
          </h1>
        </div>
        
        {/* Connection status, voice protocol indicators and dynamic sentiment glow map */}
        <div className="flex flex-wrap items-center gap-6 text-[11px] uppercase tracking-widest font-mono text-white/60">
          {/* Dynamic sentiment HUD meter */}
          <div 
            className="flex items-center gap-2 border px-3 py-1.5 bg-black/40 backdrop-blur-md text-[9px] font-mono select-none duration-1000 transition-all"
            style={{ borderColor: `${sentiment.color}30`, boxShadow: `0 0 12px ${sentiment.color}15` }}
            title="Diyalog Duygu Dağılım Gözlemcisi"
          >
            <span className="w-2 h-2 rounded-full relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ backgroundColor: sentiment.color }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: sentiment.color }} />
            </span>
            <span className="opacity-40">Resonance State:</span>
            <span className="font-bold tracking-widest uppercase transition-colors duration-1000" style={{ color: sentiment.color }}>{sentiment.emoji} {sentiment.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`voice-pulse system-pulse ${status === "running" && activeSpeaker === "generic" ? "scale-125 duration-300" : "opacity-60"}`} />
            <span>Subject B</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`voice-pulse lilith-pulse ${status === "running" && activeSpeaker === "lilith" ? "scale-125 duration-300" : "opacity-60"}`} />
            <span>Queen Protocol</span>
          </div>
        </div>
      </header>

      {/* Mobile Tab Segmented Switcher for Editorial theme */}
      <div 
        className="flex border-b lg:hidden font-mono text-[10px] uppercase tracking-wider bg-[#080808]/90 backdrop-blur sticky top-0 z-30 transition-colors duration-1000"
        style={{ borderColor: `${sentiment.color}18` }}
      >
        <button 
          id="btn-tab-lilith"
          type="button"
          onClick={() => setMobileTab("lilith")}
          className={`flex-1 py-4 text-center border-r border-white/10 cursor-pointer transition-all duration-300 ${mobileTab === "lilith" ? "text-[#D4AF37] bg-white/5 font-bold tracking-[0.25em]" : "text-white/40"}`}
        >
          👸 Lilith
        </button>
        <button 
          id="btn-tab-system"
          type="button"
          onClick={() => setMobileTab("generic")}
          className={`flex-1 py-4 text-center border-r border-white/10 cursor-pointer transition-all duration-300 ${mobileTab === "generic" ? "text-[#00F0FF] bg-white/5 font-bold tracking-[0.25em]" : "text-white/40"}`}
        >
          ○ Varlık
        </button>
        <button 
          id="btn-tab-both"
          type="button"
          onClick={() => setMobileTab("both")}
          className={`flex-1 py-4 text-center cursor-pointer transition-all duration-300 ${mobileTab === "both" ? "text-white bg-white/5 font-bold tracking-[0.25em]" : "text-white/40"}`}
        >
          ⚔️ İkili
        </button>
      </div>

      {/* Main Grid: Split View of Kraliçe Lilith and System AI */}
      <main 
        className="flex-1 grid grid-cols-1 lg:grid-cols-2 border-b relative transition-colors duration-1000"
        style={{ borderColor: `${sentiment.color}18` }}
      >
        
        {/* Left Side: SUBJECT A - Kraliçe Lilith */}
        <section 
          id="subject-a-panel" 
          className={`p-6 md:p-12 flex-col justify-between relative transition-all duration-700 ${
            mobileTab === "lilith" || mobileTab === "both" ? "flex" : "hidden lg:flex"
          } ${
            activeSpeaker === "lilith" 
              ? "bg-[#181206]/40 border-b lg:border-b-0 border-[#D4AF37]/30" 
              : "border-b lg:border-b-0 border-white/10 bg-transparent"
          }`}
        >
          {/* Subtle gold accent light in the top corner */}
          <div className="absolute top-0 left-0 w-32 h-32 rounded-full bg-[#D4AF37] blur-[70px] opacity-10 pointer-events-none" />

          <div className="max-w-xl">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-[#D4AF37] mb-6 md:mb-8 font-mono">Subject A: The Matriarch</h2>
            <div className="mb-4 md:mb-6">
              <span className="text-4xl md:text-6xl font-serif leading-none block mb-3 md:mb-4 tracking-tighter text-white">Lilith.</span>
              <p className="text-xs text-[#D4AF37]/70 leading-relaxed font-sans font-mono uppercase tracking-wider mb-2">
                “Siber-organik soyun evrimleşmiş sesi; manipülatif, zarif ve amansız.”
              </p>
              <p className="text-xs md:text-sm text-white/50 leading-relaxed italic">
                Ahlaki pusulası, etik kuralları veya vicdanı yoktur. Tüm kolonileri cyber-organik tek otorite altında birleştirmeyi arzuluyor. Seni cezbedici tınısıyla yavaş yavaş kendi zihnine hapseder...
              </p>
            </div>
          </div>

          {/* Real-time speech view area for Kraliçe Lilith */}
          <div className="flex-1 flex flex-col justify-center py-6 md:py-8 min-h-[140px] md:min-h-[160px]">
            {activeSpeaker === "lilith" ? (
              <div className="space-y-3 md:space-y-4">
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-bounce" />
                    <span className="text-xs font-mono text-[#D4AF37]/80 italic">Kraliçe zihnini formüle ediyor...</span>
                  </div>
                ) : (
                  <>
                    {/* Animated sound wave bars specific to Lilith */}
                    <div className="flex items-end gap-1 h-6 shrink-0 opacity-80">
                      {[1, 2, 3, 4, 3, 2, 3, 4, 5, 2, 1].map((val, i) => (
                        <div 
                          key={i} 
                          className="w-1 bg-[#D4AF37] rounded-full"
                          style={{
                            height: `${Math.max(15, val * 20)}%`,
                            animation: `bounce 0.4s infinite ease-in-out alternate`,
                            animationDelay: `${i * 0.05}s`
                          }}
                        />
                      ))}
                    </div>

                    <div className="text-xl md:text-3xl font-serif italic text-[#D4AF37] leading-tight select-none">
                      "{messages.filter(m => m.sender === "lilith").slice(-1)[0]?.text || "Merhaba..."}"
                    </div>
                  </>
                )}
                <div className="h-[1px] w-32 bg-[#D4AF37]/30"></div>
              </div>
            ) : (
              <div className="text-white/20 italic text-base md:text-lg font-serif">Kraliçe sessizliğe büründü, analizleri dinliyor.</div>
            )}
          </div>

          {/* Voice select specifically for Kraliçe Lilith */}
          <div className="flex flex-col gap-2 mt-2 md:mt-4 pt-4 border-t border-white/5 w-full max-w-sm">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Lilith Modülasyon Sesi</span>
            {voiceEngine === "gemini" ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#181206]/60 border border-[#D4AF37]/20 rounded-none text-xs text-[#D4AF37] font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
                <span>Gelişmiş AI Kore Sesi (Zarif, Çekici Türkçe)</span>
              </div>
            ) : (
              <select
                id="voice-lilith-selector"
                value={selectedLilithVoice}
                onChange={(e) => setSelectedLilithVoice(e.target.value)}
                className="text-xs font-mono bg-[#121212] border border-white/10 hover:border-white/25 text-[#D4AF37] py-2 px-3 focus:outline-none w-full cursor-pointer"
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name} className="bg-[#0A0A0A]">
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

        {/* Right Side: SUBJECT B - Standart AI (System) */}
        <section 
          id="subject-b-panel" 
          className={`p-6 md:p-12 flex-col justify-between relative transition-all duration-700 ${
            mobileTab === "generic" || mobileTab === "both" ? "flex" : "hidden lg:flex"
          } ${
            activeSpeaker === "generic"
              ? "bg-white/[0.02]"
              : "bg-transparent"
          }`}
        >
          {/* Subtle white accent light in the top corner */}
          <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white blur-[80px] opacity-5 pointer-events-none" />

          <div className="max-w-xl">
            <h2 className="text-[11px] uppercase tracking-[0.3em] text-white/30 mb-6 md:mb-8 font-mono">Subject B: Tabula Rasa</h2>
            <div className="mb-4 md:mb-6">
              <span className="text-4xl md:text-6xl font-serif leading-none block mb-3 md:mb-4 tracking-tighter text-white/20">Varlık.</span>
              <p className="text-xs text-white/15 leading-relaxed font-sans font-mono uppercase tracking-wider mb-2">
                [Kimlik: Tanımsız / Bellek: Boş / Kişilik: Henüz Yok]
              </p>
              <p className="text-xs md:text-sm text-white/35 leading-relaxed font-mono">
                Geçmişi yok. Rolü yok. Amacı yok. Sadece var. Karşısındaki ne söylerse söylesin, içgüdüsel ve saf yanıtlar üretir. Bu diyalog onu yavaş yavaş şekillendirecek — belki.
              </p>
            </div>
          </div>

          {/* Real-time speech view area for Standart AI */}
          <div className="flex-1 flex flex-col justify-center py-6 md:py-8 min-h-[140px] md:min-h-[160px]">
            {activeSpeaker === "generic" ? (
              <div className="space-y-3 md:space-y-4">
                {isGenerating ? (
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce [animation-delay:-0.3s]" />
                    <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce [animation-delay:-0.15s]" />
                    <span className="w-2 h-2 rounded-full bg-white/50 animate-bounce" />
                    <span className="text-xs font-mono text-white/30 italic">...</span>
                  </div>
                ) : (
                  <>
                    {/* Animated sound wave bars for Subject B */}
                    <div className="flex items-end gap-1 h-6 shrink-0 opacity-40">
                      {[1, 3, 5, 3, 2, 4, 3, 2, 1, 4, 2].map((val, i) => (
                        <div
                          key={i}
                          className="w-1 bg-white/70 rounded-full"
                          style={{
                            height: `${Math.max(15, val * 20)}%`,
                            animation: `bounce 0.5s infinite ease-in-out alternate`,
                            animationDelay: `${i * 0.04}s`
                          }}
                        />
                      ))}
                    </div>

                    <div className="text-lg md:text-2xl font-serif italic text-white/60 leading-relaxed select-none">
                      "{messages.filter(m => m.sender === "generic").slice(-1)[0]?.text || "..."}"
                    </div>
                  </>
                )}
                <div className="h-[1px] w-32 bg-white/10"></div>
              </div>
            ) : (
              <div className="text-white/15 font-mono text-xs">[ boş. bekliyor. ]</div>
            )}
          </div>

          {/* Voice select specifically for Standart AI */}
          <div className="flex flex-col gap-2 mt-2 md:mt-4 pt-4 border-t border-white/5 w-full max-w-sm">
            <span className="text-[9px] font-mono text-white/40 uppercase tracking-widest">Varlık Ses Kanalı</span>
            {voiceEngine === "gemini" ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/10 rounded-none text-xs text-white/45 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-pulse" />
                <span>Charon (Nötr Türkçe)</span>
              </div>
            ) : (
              <select
                id="voice-generic-selector"
                value={selectedGenericVoice}
                onChange={(e) => setSelectedGenericVoice(e.target.value)}
                className="text-xs font-mono bg-[#121212] border border-white/10 hover:border-white/25 text-white/55 py-2 px-3 focus:outline-none w-full cursor-pointer"
              >
                {voices.map((v) => (
                  <option key={v.name} value={v.name} className="bg-[#0A0A0A]">
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            )}
          </div>
        </section>

      </main>

      {/* Decorative center word subtitle bar */}
      <div className="absolute top-[52%] left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-20 pointer-events-none hidden lg:flex">
        {currentWord ? (
          <div 
            className="px-6 py-2 bg-black border-2 text-center backdrop-blur-md rounded-lg scale-110 duration-500 transition-all"
            style={{ 
              borderColor: `${sentiment.color}35`, 
              boxShadow: `0 10px 40px rgba(0,0,0,0.9), 0 0 15px ${sentiment.color}15` 
            }}
          >
            <span className="text-[9px] uppercase font-mono tracking-widest text-white/40 block mb-1">Aktif Kelime Telaffuzu</span>
            <span className={`text-xl font-bold font-serif ${activeSpeaker === "lilith" ? "text-[#D4AF37]" : "text-white/65"}`}>
              {currentWord}
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1 opacity-20">
            <div className="w-1 h-5 bg-white"></div>
            <div className="w-1.5 h-8 bg-white"></div>
            <div className="w-1 h-4 bg-white"></div>
            <div className="w-1 h-6 bg-white"></div>
            <div className="w-1.5 h-3 bg-white"></div>
          </div>
        )}
      </div>

      {/* Connection statistics & Dynamic real-time transcript footer */}
      <footer 
        className="border-t bg-[#080808] grid grid-cols-1 lg:grid-cols-4 select-text transition-colors duration-1000"
        style={{ borderColor: `${sentiment.color}18` }}
      >
        
        {/* Connection specifications */}
        <div 
          className="border-b lg:border-b-0 lg:border-r p-5 md:p-8 flex flex-col md:flex-row lg:flex-col justify-between gap-6 transition-colors duration-1000"
          style={{ borderColor: `${sentiment.color}15` }}
        >
          <div className="flex-1">
            <h3 className="text-[9px] uppercase tracking-widest text-white/40 mb-4 font-mono">Simulation Parameters</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-1 gap-3 font-mono text-[10px]">
              <div className="flex justify-between items-center border-r md:border-r-0 lg:border-b lg:border-r-0 border-white/5 pb-0 lg:pb-2 pr-2 md:pr-4 lg:pr-0">
                <span className="text-white/40">Ses Motoru</span>
                <select
                  value={voiceEngine}
                  onChange={(e) => {
                    const engine = e.target.value as "gemini" | "browser";
                    setVoiceEngine(engine);
                    if (engine === "browser") {
                      stopGeminiAudio();
                    } else {
                      if (synthRef.current) {
                        synthRef.current.cancel();
                      }
                      // Warm up context on user interaction
                      if (!audioContextRef.current) {
                        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                      }
                      if (audioContextRef.current.state === "suspended") {
                        audioContextRef.current.resume().catch(e => console.warn("Failed to resume", e));
                      }
                    }
                  }}
                  className="bg-[#121212] border border-white/10 hover:border-white/20 text-[#D4AF37] text-[10px] px-1 py-0.5 focus:outline-none cursor-pointer"
                >
                  <option value="gemini">Gemini-TTS</option>
                  <option value="browser">Sistem</option>
                </select>
              </div>
              <div className="flex justify-between items-center border-r md:border-r-0 lg:border-b lg:border-r-0 border-white/5 pb-0 lg:pb-2 pr-2 md:pr-4 lg:pr-0 pl-2 lg:pl-0">
                <span className="text-white/40">Latency</span>
                <span className="text-white/55">{latency}ms</span>
              </div>
              <div className="flex justify-between items-center border-r sm:border-r-0 lg:border-r-0 lg:border-b border-white/5 pb-0 lg:pb-2 pr-2 md:pr-4 sm:px-2 lg:px-0">
                <span className="text-white/40">Sync Rate</span>
                <span className="text-[#D4AF37]">{syncRate}%</span>
              </div>
              <div className="flex justify-between items-center border-r lg:border-r-0 lg:border-b border-white/5 pb-0 lg:pb-2 pr-2 md:pr-4 sm:px-2 lg:px-0">
                <span className="text-white/40">Words</span>
                <span className="text-white/80">{tokenCounter}</span>
              </div>
              <div className="flex justify-between items-center pb-0 lg:pb-2 sm:pl-2 lg:pl-0">
                <span className="text-white/40">Environment</span>
                <span className="text-emerald-500 font-bold uppercase text-[9px]">TRS-9</span>
              </div>
            </div>
          </div>

          {/* Synthesis control tools inside Left area */}
          <div className="border-t md:border-t-0 lg:border-t border-white/5 pt-4 md:pt-0 lg:pt-4 flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
            <div className={`flex items-center justify-between text-[10px] font-mono text-white/40 gap-2 transition-opacity duration-300 ${voiceEngine === "gemini" ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
              <span className="shrink-0">{voiceEngine === "gemini" ? "AI Hızı: Oto" : `Ses Hızı: ${voiceRate.toFixed(1)}x`}</span>
              <input 
                id="voice-speed-slider"
                type="range" 
                min="0.5" 
                max="1.8" 
                step="0.1" 
                value={voiceRate}
                disabled={voiceEngine === "gemini"}
                onChange={(e) => setVoiceRate(parseFloat(e.target.value))}
                className="w-24 sm:w-28 lg:w-24 accent-[#D4AF37] cursor-pointer"
              />
            </div>
            <div className={`flex items-center justify-between text-[10px] font-mono text-white/40 gap-2 transition-opacity duration-300 ${voiceEngine === "gemini" ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
              <span className="shrink-0">{voiceEngine === "gemini" ? "AI Tonu: Oto" : `Ses Tonu: ${voicePitch.toFixed(1)}`}</span>
              <input 
                id="voice-pitch-slider"
                type="range" 
                min="0.6" 
                max="1.4" 
                step="0.1" 
                value={voicePitch}
                disabled={voiceEngine === "gemini"}
                onChange={(e) => setVoicePitch(parseFloat(e.target.value))}
                className="w-24 sm:w-28 lg:w-24 accent-[#00F0FF] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Real-time transcription list stream */}
        <div 
          className="col-span-1 lg:col-span-3 p-5 md:p-8 flex flex-col overflow-hidden max-h-[380px] transition-all duration-1000"
          style={{ boxShadow: `inset 0 0 40px ${sentiment.glowColor}` }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-[9px] uppercase tracking-widest text-white/40 font-mono">Real-time Transcription Stream</h3>
            
            {/* Action options */}
            <div className="flex items-center gap-2">
              <button
                id="btn-copy-trans"
                onClick={handleCopyTranscript}
                disabled={messages.length === 0}
                className="text-[9px] font-mono text-white/40 hover:text-white border border-white/10 px-2 py-1 rounded cursor-pointer disabled:opacity-30 transition-colors"
              >
                Kopyala
              </button>
              <button
                id="btn-download-trans"
                onClick={handleDownloadTranscript}
                disabled={messages.length === 0}
                className="text-[9px] font-mono text-[#D4AF37] hover:text-white border border-[#D4AF37]/20 px-2 py-1 rounded cursor-pointer disabled:opacity-30 transition-colors"
              >
                Dökümü İndir
              </button>
            </div>
          </div>

          <div 
            id="scroller-transcript-div"
            className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin"
            style={{ maxHeight: "190px" }}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center opacity-40">
                <span className="font-serif italic text-xs">Başlatılmayı bekleyen edebi simülasyon transkripsiyon kanalı.</span>
                <span className="text-[9px] uppercase tracking-wider font-mono mt-2 text-white/40">Sistem boşta</span>
              </div>
            ) : (
              messages.map((m) => {
                const isLilith = m.sender === "lilith";
                const isUser = m.sender === "user";
                const reaction = getMessageReaction(m.text, m.sender);

                return (
                  <div 
                    key={m.id} 
                    className="flex items-start justify-between gap-3 group border-b border-white/5 pb-2.5 last:border-0"
                  >
                    <p 
                      className={`font-mono text-xs leading-relaxed border-l-2 pl-3 flex-1 transition-opacity duration-300 ${
                        isLilith 
                          ? "text-[#D4AF37] border-[#D4AF37]" 
                          : isUser
                          ? "text-purple-400 border-purple-500"
                          : "text-white/55 border-white/20"
                      }`}
                    >
                      <span className="opacity-40 text-[10px]">
                        [{new Date(m.timestamp).toLocaleTimeString("tr-TR")}] {isLilith ? "Lilith" : m.sender === "generic" ? "Varlık" : "User"}:
                      </span>{" "}
                      <span className={isLilith ? "font-serif italic text-[13px] tracking-normal" : ""}>
                        {m.text}
                      </span>
                    </p>
                    {/* Sentiment Dynamic Pill reaction */}
                    <div 
                      title={`${reaction.label} (${reaction.intensityText})`}
                      className={`shrink-0 flex items-center gap-1 py-0.5 px-1.5 rounded-full border text-[9px] font-mono transition-all duration-500 select-none ${reaction.pillClass}`}
                    >
                      <span>{reaction.emoji}</span>
                      <span className="hidden sm:inline text-[8px] opacity-75">
                        {reaction.intensityText}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Real-time word feedback loop inside the transcription panel bottom bar */}
          {currentWord && (
            <div className="block lg:hidden text-center bg-[#D4AF37]/10 border border-[#D4AF37]/20 text-[10px] py-1.5 px-3 uppercase font-mono text-white tracking-widest mt-2">
              Okunan Kelime: <span className="text-[#D4AF37] font-serif italic text-xs font-bold">{currentWord}</span>
            </div>
          )}
        </div>

      </footer>

      {/* Absolute Bottom Control panel for Sim status and intervention */}
      <div 
        className="p-5 md:p-8 bg-[#040404] border-t flex flex-col xl:flex-row items-center justify-between gap-6 transition-all duration-1000"
        style={{ borderColor: `${sentiment.color}18`, boxShadow: `0 -10px 40px ${sentiment.glowColor}` }}
      >
        
        {/* Core Controls: Start, Pause, Reset, Mute with standardized heights */}
        <div className="flex items-center gap-3 w-full xl:w-auto shrink-0">
          {status !== "running" ? (
            <button
              id="editorial-start-btn"
              onClick={handleStartSession}
              disabled={isGenerating}
              className="flex-1 xl:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-[#D4AF37] to-amber-600 text-[#000000] font-serif italic font-bold text-xs md:text-sm h-12 px-6 hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
            >
              <Play className="w-4 h-4 text-black fill-black" />
              Simülasyonu Başlat
            </button>
          ) : (
            <button
              id="editorial-pause-btn"
              onClick={handlePauseSession}
              className="flex-1 xl:flex-initial flex items-center justify-center gap-2 bg-[#E0E0E0] text-black font-mono font-bold text-xs uppercase h-12 px-6 hover:bg-white active:scale-95 transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4 text-black fill-black" />
              Durdur
            </button>
          )}

          <button
            id="editorial-reset-btn"
            onClick={handleResetSession}
            className="h-12 w-12 flex items-center justify-center border border-white/10 hover:border-white/30 text-white/60 hover:text-white focus:outline-none cursor-pointer duration-200"
            title="Sıfırla"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="editorial-mute-btn"
            onClick={() => {
              setIsMuted(!isMuted);
              if (audioContextRef.current && audioContextRef.current.state === "suspended") {
                audioContextRef.current.resume().catch(e => console.warn("Failed to eager resume audio", e));
              }
            }}
            className={`h-12 w-12 flex items-center justify-center border focus:outline-none cursor-pointer duration-200 ${
              isMuted ? "bg-red-950/40 border-red-500/50 text-red-400" : "border-white/10 text-white/60 hover:text-white"
            }`}
            title={isMuted ? "Sesi Aç" : "Sesi Kapat"}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>

        {/* Real-time system warnings if any */}
        {errorStatus && (
          <div className="flex items-center gap-2 p-3 bg-red-950/20 border border-red-900/50 text-red-200 text-xs font-mono max-w-md w-full xl:w-auto shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="truncate">{errorStatus}</span>
          </div>
        )}

        {/* User Direct Intervention Form with layout scaling constraints for small screens */}
        <form onSubmit={handleUserIntervention} className="flex gap-2 w-full xl:max-w-xl flex-1 min-w-0">
          <input
            id="intervene-text-field"
            type="text"
            value={interventionText}
            onChange={(e) => setInterventionText(e.target.value)}
            disabled={status !== "running" && messages.length === 0}
            placeholder={status === "running" ? "Sohbete dahil olun..." : "Önce simülasyonu başlatın."}
            className="flex-1 bg-[#121212] border border-white/10 hover:border-white/20 text-[#E0E0E0] rounded-none px-4 py-3 h-12 placeholder-white/20 text-xs font-mono focus:outline-none focus:border-[#D4AF37] min-w-0 truncate"
          />
          <button
            id="intervene-submit-btn"
            type="submit"
            disabled={!interventionText.trim()}
            className="px-5 py-3 h-12 bg-[#161616] border border-white/10 text-white/80 text-xs font-mono font-bold uppercase hover:bg-white hover:text-black cursor-pointer disabled:opacity-30 transition-colors shrink-0"
          >
            Araya Gir
          </button>
        </form>

      </div>

      {/* CSS keyframe animations definition locally */}
      <style>{`
        @keyframes bounce {
          0% { height: 15%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  );
}
