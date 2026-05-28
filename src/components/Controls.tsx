import React, { useState } from "react";
import { Play, Pause, RotateCcw, Volume2, UserPlus, Sparkles, Sliders } from "lucide-react";
import { SessionStatus } from "../types";

interface ControlsProps {
  status: SessionStatus;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onUserIntervene: (text: string) => void;
  voices: SpeechSynthesisVoice[];
  lilithVoiceName: string;
  genericVoiceName: string;
  onLilithVoiceChange: (name: string) => void;
  onGenericVoiceChange: (name: string) => void;
  voiceRate: number;
  onVoiceRateChange: (rate: number) => void;
  voicePitch: number;
  onVoicePitchChange: (pitch: number) => void;
  isGenerating: boolean;
}

export const Controls: React.FC<ControlsProps> = ({
  status,
  onStart,
  onPause,
  onReset,
  onUserIntervene,
  voices,
  lilithVoiceName,
  genericVoiceName,
  onLilithVoiceChange,
  onGenericVoiceChange,
  voiceRate,
  onVoiceRateChange,
  voicePitch,
  onVoicePitchChange,
  isGenerating
}) => {
  const [inputText, setInputText] = useState("");
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const handleSubmitIntervention = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onUserIntervene(inputText.trim());
    setInputText("");
  };

  // Filter for Turkish/European or generic clean voices if available
  const trVoices = voices.filter(v => v.lang.toLowerCase().includes("tr"));
  const cleanVoices = trVoices.length > 0 ? trVoices : voices.slice(0, 15);

  return (
    <div id="controls-panel" className="flex flex-col gap-6 bg-slate-950/60 border border-slate-800 rounded-3xl p-6 backdrop-blur-md">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Play/Pause/Reset Panel */}
        <div className="flex items-center gap-3">
          {status === "inactive" || status === "paused" ? (
            <button
              id="start-session-btn"
              onClick={onStart}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-fuchsia-600 hover:zoom-in hover:brightness-110 active:scale-95 text-white font-display font-bold text-sm tracking-wide shadow-[0_4px_20px_rgba(217,70,239,0.25)] transition-all cursor-pointer disabled:opacity-40"
            >
              <Play className="w-4 h-4 text-white fill-white" />
              {status === "inactive" ? "Diyaloğu Başlat" : "Devam Ettir"}
            </button>
          ) : (
            <button
              id="pause-session-btn"
              onClick={onPause}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-display font-medium text-sm tracking-wide transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-slate-200" />
              Diyaloğu Duraklat
            </button>
          )}

          <button
            id="reset-session-btn"
            onClick={onReset}
            className="flex items-center justify-center p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 active:scale-95 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Sıfırla"
          >
            <RotateCcw className="w-4.5 h-4.5" />
          </button>

          <button
            id="toggle-voice-settings"
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className={`flex items-center justify-center p-3.5 rounded-2xl border transition-all cursor-pointer ${
              showVoiceSettings
                ? "bg-slate-800 border-slate-600 text-white"
                : "bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
            }`}
            title="Ses Ayarları"
          >
            <Sliders className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Dynamic State info */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-900/60 border border-slate-800/80 rounded-2xl">
          <span className={`w-2.5 h-2.5 rounded-full ${
            status === "running" ? "bg-emerald-500 animate-pulse" : "bg-slate-600"
          }`} />
          <span className="font-mono text-xs text-slate-400 capitalize">
            Simülasyon Durumu:{" "}
            <span className={`font-semibold ${status === "running" ? "text-emerald-400" : "text-slate-500"}`}>
              {status === "running" ? "Aktif" : status === "paused" ? "Duraklatıldı" : "Devre Dışı"}
            </span>
          </span>
        </div>
      </div>

      {/* Voice Configuration Panel (Collapsible) */}
      {showVoiceSettings && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl bg-slate-900/40 border border-slate-800/80 animate-fadeIn">
          {/* Lilith Voice settings */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-fuchsia-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Kraliçe Lilith Ses Seçimi
            </h4>
            <select
              id="lilith-voice-select"
              value={lilithVoiceName}
              onChange={(e) => onLilithVoiceChange(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            >
              <option value="">-- Varsayılan Kadın Ses Tonu --</option>
              {cleanVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Assistant Voice settings */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Standart AI Ses Seçimi
            </h4>
            <select
              id="generic-voice-select"
              value={genericVoiceName}
              onChange={(e) => onGenericVoiceChange(e.target.value)}
              className="w-full text-xs bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl p-2.5 focus:outline-none focus:ring-1 focus:ring-cyan-500"
            >
              <option value="">-- Varsayılan Erkek/Nötr Ses Tonu --</option>
              {cleanVoices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name} ({voice.lang})
                </option>
              ))}
            </select>
          </div>

          {/* Voice rate (speed) and Pitch */}
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-3 border-t border-slate-900">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Konuşma Hızı:</span>
                <span className="font-semibold text-white">{voiceRate.toFixed(1)}x</span>
              </div>
              <input
                id="voice-rate-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={voiceRate}
                onChange={(e) => onVoiceRateChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-slate-400">
                <span>Ses Tonu (Pitch):</span>
                <span className="font-semibold text-white">{voicePitch.toFixed(1)}</span>
              </div>
              <input
                id="voice-pitch-slider"
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={voicePitch}
                onChange={(e) => onVoicePitchChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* User Intervention box */}
      <div className="space-y-2.5 pt-4 border-t border-slate-800/40">
        <label className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <UserPlus className="w-4 h-4" /> Sohbet Simülasyonuna Müdahale Et
        </label>
        <form onSubmit={handleSubmitIntervention} className="flex gap-2">
          <input
            id="user-intervention-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Araya girip bir soru sorun veya konuyu değiştirin (örn: 'Lilith, insanları neden küçümsüyorsun?')"
            className="flex-1 text-sm bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-fuchsia-500/50 focus:border-fuchsia-500"
          />
          <button
            id="submit-intervention-btn"
            type="submit"
            disabled={!inputText.trim()}
            className="px-5 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800 active:scale-95 transition-all cursor-pointer font-display text-xs font-bold shrink-0 disabled:opacity-30 disabled:hover:bg-slate-900 disabled:hover:text-slate-500"
          >
            Araya Gir
          </button>
        </form>
      </div>
    </div>
  );
};
