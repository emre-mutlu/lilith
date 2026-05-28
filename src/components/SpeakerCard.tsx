import React from "react";
import { Sparkles, Radio, Skull, ShieldCheck } from "lucide-react";
import { SpeakerProfile } from "../types";

interface SpeakerCardProps {
  profile: SpeakerProfile;
  isSpeaking: boolean;
  isGenerating: boolean;
  isListening: boolean;
  currentWordHighlight?: string;
}

export const SpeakerCard: React.FC<SpeakerCardProps> = ({
  profile,
  isSpeaking,
  isGenerating,
  isListening,
  currentWordHighlight
}) => {
  const isLilith = profile.id === "lilith";

  return (
    <div
      id={`speaker-card-${profile.id}`}
      className={`relative overflow-hidden rounded-3xl border transition-all duration-700 p-6 flex flex-col items-center ${
        isSpeaking
          ? isLilith
            ? "bg-slate-950/95 border-fuchsia-500/80 shadow-[0_0_40px_rgba(217,70,239,0.35)]"
            : "bg-slate-950/95 border-cyan-500/80 shadow-[0_0_40px_rgba(6,182,212,0.35)]"
          : isGenerating
          ? "bg-slate-950/80 border-slate-700 shadow-md animate-pulse"
          : "bg-slate-950/40 border-slate-800/80 opacity-80"
      }`}
    >
      {/* Dynamic Animated Glow in the background */}
      <div
        className={`absolute -top-12 -left-12 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none transition-all duration-1000 ${
          isSpeaking
            ? isLilith
              ? "bg-fuchsia-500"
              : "bg-cyan-400"
            : isGenerating
            ? "bg-amber-400"
            : "bg-slate-800"
        }`}
      />

      {/* Role Badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono tracking-wider font-semibold uppercase bg-slate-900/90 text-slate-400 border border-slate-800">
        <span className={`w-1.5 h-1.5 rounded-full ${isSpeaking ? "bg-emerald-500 animate-ping" : "bg-slate-600"}`} />
        {isSpeaking ? "Konuşuyor" : isGenerating ? "Düşünüyor" : isListening ? "Dinlemede" : "Beklemede"}
      </div>

      {/* Avatar Container with glowing rings */}
      <div className="relative mt-4 mb-4">
        {/* Glowing concentric rings when speaking */}
        {isSpeaking && (
          <>
            <div
              className={`absolute -inset-4 rounded-full border opacity-20 animate-ping duration-1000 ${
                isLilith ? "border-fuchsia-500" : "border-cyan-500"
              }`}
            />
            <div
              className={`absolute -inset-2 rounded-full border opacity-40 animate-pulse ${
                isLilith ? "border-fuchsia-400" : "border-cyan-400"
              }`}
            />
          </>
        )}

        <div
          className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center border-2 shadow-inner transition-all duration-500 ${
            isSpeaking
              ? isLilith
                ? "border-fuchsia-500 bg-fuchsia-950/30"
                : "border-cyan-500 bg-cyan-950/30"
              : "border-slate-800 bg-slate-900"
          }`}
        >
          {isLilith ? (
            <div className="text-center flex flex-col items-center select-none">
              <span className="text-5xl drop-shadow-[0_0_8px_rgba(217,70,239,0.6)]">👸</span>
              <span className="text-[10px] uppercase font-bold text-fuchsia-400 tracking-widest mt-1 font-mono">LILITH</span>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center select-none">
              <span className="text-5xl drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">🤖</span>
              <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-widest mt-1 font-mono">ASSISTANT</span>
            </div>
          )}
        </div>

        {/* Floating status icon */}
        <div className={`absolute bottom-0 right-1 p-2 rounded-full shadow-lg ${
          isLilith ? "bg-fuchsia-950/90 border border-fuchsia-500/50" : "bg-cyan-950/90 border border-cyan-500/50"
        }`}>
          {isLilith ? (
            <Skull className="w-4 h-4 text-fuchsia-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          )}
        </div>
      </div>

      {/* Profile Details */}
      <div className="text-center z-10 w-full mb-3">
        <h3 className="font-display text-xl font-bold tracking-tight text-white flex items-center justify-center gap-1.5">
          {profile.name}
          {isLilith ? (
            <Sparkles className="w-4 h-4 text-fuchsia-400 fill-fuchsia-950/50" />
          ) : (
            <Radio className="w-4 h-4 text-cyan-400" />
          )}
        </h3>
        <p className={`text-[11px] font-mono tracking-widest font-semibold mt-0.5 ${isLilith ? "text-fuchsia-400/80" : "text-cyan-400/80"}`}>
          {profile.title}
        </p>
        <p className="text-xs text-slate-400 mt-3 px-3 line-clamp-2 h-8 leading-relaxed">
          {profile.roleDescription}
        </p>
      </div>

      {/* Real-time Subtitles / Highlight Word */}
      <div className="w-full z-10 h-10 mt-1 flex items-center justify-center">
        {isSpeaking && currentWordHighlight ? (
          <div className="px-4 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-center max-w-[90%] overflow-hidden text-ellipsis whitespace-nowrap">
            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1.5">Aktif Söz:</span>
            <span className={`text-sm font-bold tracking-tight ${isLilith ? "text-fuchsia-400 font-display animate-pulse" : "text-cyan-400 font-display animate-pulse"}`}>
              {currentWordHighlight}
            </span>
          </div>
        ) : isGenerating ? (
          <div className="flex items-center gap-1 px-4 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
            <span className="text-[10px] font-mono text-amber-400 ml-1">Yanıt Hazırlanıyor...</span>
          </div>
        ) : (
          <span className="text-[10px] font-mono text-slate-500 uppercase">Sessiz</span>
        )}
      </div>

      {/* Voice Activity Waves */}
      <div className="w-full h-10 mt-2 flex items-center justify-center gap-1">
        {isSpeaking ? (
          <div className="flex items-end h-8 gap-1.5 px-4 py-1">
            {[1, 2, 3, 4, 5, 4, 3, 2, 1].map((val, idx) => {
              const baseDur = isLilith ? 0.35 : 0.5;
              const randomDur = baseDur + (idx % 3) * 0.15;
              return (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all ${
                    isLilith ? "bg-gradient-to-t from-fuchsia-600 to-pink-400" : "bg-gradient-to-t from-cyan-600 to-emerald-400"
                  }`}
                  style={{
                    height: `${Math.max(10, val * 8)}%`,
                    animation: `bounce ${randomDur}s infinite ease-in-out alternate`
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div className="w-4/5 h-[1px] bg-slate-800/80 rounded" />
        )}
      </div>

      {/* CSS Bounce Animation definition */}
      <style>{`
        @keyframes bounce {
          0% { height: 10%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  );
};
