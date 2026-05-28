import React, { useRef, useEffect } from "react";
import { Download, Copy, Trash2, Check, HelpCircle } from "lucide-react";
import { Message } from "../types";

interface TranscriptViewProps {
  messages: Message[];
  activeSpeaker: string | null;
  onClear: () => void;
  onCopyAll: () => void;
  onDownload: () => void;
  isCopied: boolean;
}

export const TranscriptView: React.FC<TranscriptViewProps> = ({
  messages,
  activeSpeaker,
  onClear,
  onCopyAll,
  onDownload,
  isCopied
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div id="transcript-panel" className="flex flex-col h-full bg-slate-950/60 border border-slate-800 rounded-3xl overflow-hidden backdrop-blur-md">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-display text-lg font-bold text-white tracking-tight">Gerçek Zamanlı Metin Dökümü</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="copy-transcript-btn"
            onClick={onCopyAll}
            disabled={messages.length === 0}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl"
            title="Tümünü Kopyala"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            id="download-transcript-btn"
            onClick={onDownload}
            disabled={messages.length === 0}
            className="p-2 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl"
            title="Dökümü İndir"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            id="clear-transcript-btn"
            onClick={onClear}
            disabled={messages.length === 0}
            className="p-2 text-slate-400 hover:text-rose-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl"
            title="Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Stream */}
      <div
        ref={scrollRef}
        id="transcript-scroll-area"
        className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[400px]"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
            <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-4 animate-pulse-slow">
              <HelpCircle className="w-8 h-8" />
            </div>
            <p className="font-display font-medium text-slate-300 text-base">Henüz diyalog başlamadı</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
              Konuşmayı başlatmak için aşağıdaki paneli kullanarak 'Simülasyonu Başlat' butonuna tıklayın.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isLilith = msg.sender === "lilith";
            const isUser = msg.sender === "user";
            let senderName = "Kullanıcı";
            let senderBg = "bg-slate-900/80 hover:bg-slate-900 border-slate-800 text-slate-100";
            let avatarEmoji = "💬";

            if (isLilith) {
              senderName = "Kraliçe Lilith";
              senderBg = "bg-fuchsia-950/20 hover:bg-fuchsia-950/30 border-fuchsia-900/40 text-fuchsia-100 shadow-[inset_0_1px_3px_rgba(217,70,239,0.05)]";
              avatarEmoji = "👸";
            } else if (msg.sender === "generic") {
              senderName = "Standart AI";
              senderBg = "bg-cyan-950/20 hover:bg-cyan-950/30 border-cyan-900/40 text-cyan-100 shadow-[inset_0_1px_3px_rgba(6,182,212,0.05)]";
              avatarEmoji = "🤖";
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-4 items-start p-4 rounded-2xl border transition-all duration-300 ${senderBg}`}
              >
                {/* Speaker Avatar Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${
                  isLilith
                    ? "bg-fuchsia-950 border-fuchsia-700/50"
                    : isUser
                    ? "bg-slate-800 border-slate-700"
                    : "bg-cyan-950 border-cyan-700/50"
                }`}>
                  {avatarEmoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-xs font-bold tracking-tight">
                      {senderName}
                    </span>
                    <span className="text-[10px] uppercase font-mono text-slate-500">
                      {new Date(msg.timestamp).toLocaleTimeString("tr-TR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </span>
                  </div>
                  <p className="text-sm mt-1.5 leading-relaxed font-sans font-normal break-words whitespace-pre-line">
                    {msg.text}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info displaying active turn */}
      <div className="px-6 py-3 border-t border-slate-900 bg-slate-950 text-center text-slate-500 text-[10px] uppercase tracking-wider font-mono">
        {activeSpeaker ? (
          <span className="flex items-center justify-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${activeSpeaker === 'lilith' ? 'bg-fuchsia-500' : 'bg-cyan-500'} animate-ping`} />
            Aktif Söz hakkı: {activeSpeaker === "lilith" ? "Kraliçe Lilith" : "Standart Yapay Zeka"}
          </span>
        ) : (
          <span>Diyalog Duruyor</span>
        )}
      </div>
    </div>
  );
};
