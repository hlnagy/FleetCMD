"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  X,
  RotateCcw,
  Maximize2,
  Minimize2,
  Volume2,
} from 'lucide-react';
import { RobotMood } from './FleetRobotOrb';
import { ChatMessage, FleetQuickKpi } from './FleetAIChatHUD';

interface RobiSpeechBubbleProps {
  messages: ChatMessage[];
  mood: RobotMood;
  isLoading: boolean;
  kpi?: FleetQuickKpi | null;
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export default function RobiSpeechBubble({
  messages,
  mood,
  isLoading,
  onSendMessage,
  onClearHistory,
  onClose,
}: RobiSpeechBubbleProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Mood Status Display in Romanian
  const getMoodInfo = () => {
    switch (mood) {
      case 'thinking':
        return { text: 'Gândește...', color: 'text-purple-400 bg-purple-950/70 border-purple-500/40' };
      case 'analyzing':
        return { text: 'Analizează datele...', color: 'text-amber-400 bg-amber-950/70 border-amber-500/40' };
      case 'alert':
        return { text: 'Alertă Flotă!', color: 'text-red-400 bg-red-950/70 border-red-500/40' };
      case 'happy':
        return { text: 'Flotă Optimă', color: 'text-emerald-400 bg-emerald-950/70 border-emerald-500/40' };
      case 'bored':
        return { text: 'Adoarme (zZz)', color: 'text-slate-400 bg-slate-800/70 border-slate-600/40' };
      case 'speaking':
        return { text: 'Robi Răspunde...', color: 'text-cyan-400 bg-cyan-950/70 border-cyan-500/40' };
      case 'idle':
      default:
        return { text: 'În așteptare', color: 'text-cyan-400 bg-cyan-950/70 border-cyan-500/40' };
    }
  };

  const moodInfo = getMoodInfo();

  // Simple clean markdown formatter supporting both RO & HU tags
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-[13px] sm:text-[13.5px] leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) return <div key={idx} className="h-1" />;

          // Header
          if (line.startsWith('#')) {
            const clean = line.replace(/^#+\s*/, '');
            return (
              <h4
                key={idx}
                className="font-black text-cyan-300 tracking-wide text-[13.5px] sm:text-[14px] mt-1.5 pb-0.5 border-b border-cyan-500/20"
              >
                {clean}
              </h4>
            );
          }

          // Bullet points
          if (line.match(/^[\*\-•]\s/)) {
            const clean = line.replace(/^[\*\-•]\s*/, '');
            return (
              <div key={idx} className="flex items-start space-x-2 pl-1 text-slate-200">
                <span className="text-cyan-400 font-bold mt-1 text-xs">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(clean) }} />
              </div>
            );
          }

          // Numbered lists
          if (line.match(/^\d+\.\s/)) {
            const match = line.match(/^(\d+)\.\s*(.*)$/);
            return (
              <div key={idx} className="flex items-start space-x-2 pl-1 text-slate-200">
                <span className="text-cyan-400 font-mono font-bold text-xs mt-0.5">
                  {match ? match[1] : '•'}.
                </span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(match ? match[2] : line) }} />
              </div>
            );
          }

          // Regular line
          return (
            <p
              key={idx}
              className="text-slate-200"
              dangerouslySetInnerHTML={{ __html: formatInline(line) }}
            />
          );
        })}
      </div>
    );
  };

  const formatInline = (str: string) => {
    let out = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    out = out.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-bold text-white tracking-tight">$1</strong>'
    );
    out = out.replace(
      /`(.*?)`/g,
      '<code class="px-1 py-0.5 bg-slate-900/90 border border-slate-700/60 rounded text-[11px] font-mono text-cyan-300">$1</code>'
    );

    // Alert pills in Romanian & Hungarian
    out = out.replace(
      /\[EXPIRAT\]|\[LEJÁRT\]/g,
      '<span class="px-1.5 py-0.5 rounded bg-red-900/80 border border-red-500/50 text-red-300 font-bold text-[10px] font-mono mr-1">EXPIRAT</span>'
    );
    out = out.replace(
      /\[CRITIC\]|\[KRITIKUS\]/g,
      '<span class="px-1.5 py-0.5 rounded bg-red-900/80 border border-red-500/50 text-red-300 font-bold text-[10px] font-mono mr-1">CRITIC</span>'
    );
    out = out.replace(
      /\[ATENȚIE\]|\[FIGYELEM\]/g,
      '<span class="px-1.5 py-0.5 rounded bg-amber-900/80 border border-amber-500/50 text-amber-300 font-bold text-[10px] font-mono mr-1">ATENȚIE</span>'
    );
    out = out.replace(
      /\[ÎN REGULĂ\]|\[RENDBEN\]/g,
      '<span class="px-1.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] font-mono mr-1">ÎN REGULĂ</span>'
    );

    return out;
  };

  return (
    <div className="relative animate-speech-bubble-in z-50">
      {/* ========================================================= */}
      {/* SPEECH BUBBLE CONTAINER (Sci-Fi Dialogue Balloon)          */}
      {/* ========================================================= */}
      <div
        className={`flex flex-col rounded-3xl border border-emerald-500/40 backdrop-blur-2xl bg-slate-950/92 shadow-[0_25px_65px_rgba(0,0,0,0.92)] overflow-hidden transition-all duration-300 ${
          isExpanded
            ? 'w-[calc(100vw-2.5rem)] sm:w-[650px] h-[calc(100vh-4rem)] sm:h-[780px] max-h-[92vh]'
            : 'w-[calc(100vw-2.5rem)] sm:w-[480px] h-[540px] max-h-[82vh]'
        }`}
        style={{
          boxShadow:
            '0 25px 65px -10px rgba(0, 0, 0, 0.95), 0 0 30px rgba(16, 185, 129, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
        }}
      >
        {/* Top Sci-Fi Planeteer Neon Edge */}
        <div className="h-1 bg-gradient-to-r from-emerald-500 via-cyan-400 to-yellow-400 shadow-[0_0_12px_#10b981]" />

        {/* SPEECH BUBBLE HEADER */}
        <div className="px-4 py-3 bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {/* Modern Mecha Captain Planet Mini Avatar */}
            <div className="relative w-8 h-8 rounded-lg bg-slate-900/90 border border-emerald-400/80 flex items-center justify-center overflow-hidden shadow-[0_0_10px_rgba(16,185,129,0.5)]">
              <svg viewBox="0 0 32 32" className="w-7 h-7">
                {/* Modern Emerald Energy Crest */}
                <polygon points="16,2 18,10 14,10" fill="#10b981" />
                <polygon points="12,4 15,10 10,10" fill="#34d399" />
                <polygon points="20,4 22,10 17,10" fill="#34d399" />
                {/* Mecha Helmet Silhouette */}
                <polygon
                  points="9,10 23,10 26,17 23,26 16,29 9,26 6,17"
                  fill="#0284c7"
                  stroke="#facc15"
                  strokeWidth="0.8"
                />
                {/* Forehead Crimson Guard */}
                <polygon points="11,10 21,10 19,13 13,13" fill="#ef4444" />
                {/* Obsidian Visor */}
                <polygon points="9,14 23,14 22,20 16,22 10,20" fill="#020617" stroke="#10b981" strokeWidth="0.6" />
                {/* Glowing Cyan LED Visor Eyes */}
                <line x1="11" y1="17" x2="21" y2="17" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="16" cy="17" r="1" fill="#ffffff" className="animate-ping" />
              </svg>
            </div>

            <div className="flex flex-col">
              <span className="text-xs font-black tracking-wider text-white flex items-center space-x-1.5">
                <span className="text-emerald-400">ROBI</span>
                <span className="text-[10px] text-yellow-400/90 font-mono tracking-normal">CAPTAIN PLANET</span>
              </span>
              <span className="text-[9px] text-cyan-300/80 font-mono -mt-0.5">„The Power is Yours!”</span>
            </div>

            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center space-x-1 ${moodInfo.color}`}
            >
              <Volume2 className="w-3 h-3 animate-pulse" />
              <span>{moodInfo.text}</span>
            </span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center space-x-1">
            <button
              type="button"
              onClick={onClearHistory}
              title="Șterge conversația"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Micșorează' : 'Ecran complet'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors hidden sm:block"
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onClose}
              title="Închide și transformă în sferă"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SPEECH BUBBLE DIALOGUE BODY */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-950/60">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-mono text-slate-400 px-1">
                  <span className={isAI ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
                    {isAI ? '🤖 ROBI' : '👤 TU'}
                  </span>
                  <span>•</span>
                  <span>{msg.timestamp}</span>
                </div>
                <div
                  className={`max-w-[92%] sm:max-w-[88%] rounded-2xl p-3.5 shadow-md ${
                    isAI
                      ? 'bg-slate-900/90 border border-slate-800/90 text-slate-100 rounded-tl-sm'
                      : 'bg-gradient-to-r from-sapphire-600 to-indigo-600 text-white rounded-tr-sm border border-indigo-400/30'
                  }`}
                >
                  {isAI ? (
                    renderMessageContent(msg.text)
                  ) : (
                    <p className="text-[13.5px] leading-relaxed whitespace-pre-wrap">
                      {msg.text}
                    </p>
                  )}
                </div>
              </div>
            );
          })}

          {/* Typing / Analysis Wave in Romanian */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-mono text-cyan-400 px-1">
                <span>ROBI ANALIZEAZĂ</span>
                <span className="animate-ping">•</span>
              </div>
              <div className="rounded-2xl rounded-tl-sm p-3.5 bg-slate-900/90 border border-cyan-500/40 text-slate-100 flex items-center space-x-3 shadow-lg">
                <div className="flex space-x-1">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-xs font-mono text-cyan-300">
                  Robi consultă baza de date a flotei...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* SPEECH BUBBLE INPUT BAR (ALL ROMANIAN IN TEXTBOX) */}
        <form
          onSubmit={handleSubmit}
          className="p-3 bg-gradient-to-t from-slate-950 via-slate-950 to-slate-900/90 border-t border-slate-800/80 flex items-end space-x-2"
        >
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Scrie-i lui Robi (piese, prețuri, flotta, funcții sistem)..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/50 resize-none font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            aria-label="Trimite mesaj lui Robi"
            className="h-11 w-11 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </form>
      </div>

      {/* ========================================================= */}
      {/* SPEECH BUBBLE TAIL (Pointing towards Robi)                 */}
      {/* ========================================================= */}
      {/* Right tail pointing to the robot on desktop */}
      <div className="hidden sm:block absolute -right-3 bottom-12 w-0 h-0 border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[14px] border-l-slate-950 drop-shadow-[2px_0_4px_rgba(6,182,212,0.4)] pointer-events-none z-50" />
      {/* Down tail pointing to the robot on mobile */}
      <div className="sm:hidden absolute -bottom-3 right-10 w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[14px] border-t-slate-950 drop-shadow-[0_2px_4px_rgba(6,182,212,0.4)] pointer-events-none z-50" />
    </div>
  );
}
