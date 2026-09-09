"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  X,
  RotateCcw,
  AlertTriangle,
  FileText,
  Package,
  Wrench,
  TrendingUp,
  Bot,
  Activity,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { RobotMood } from './FleetRobotOrb';

export interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

export interface FleetQuickKpi {
  totalVehicles: number;
  expiredDocs: number;
  imminentDocs: number;
  lowStockItems: number;
  openWorkOrders: number;
  totalOpenCost: number;
}

interface FleetAIChatHUDProps {
  messages: ChatMessage[];
  mood: RobotMood;
  isLoading: boolean;
  kpi: FleetQuickKpi | null;
  onSendMessage: (text: string) => void;
  onClearHistory: () => void;
  onClose: () => void;
}

export default function FleetAIChatHUD({
  messages,
  mood,
  isLoading,
  kpi,
  onSendMessage,
  onClearHistory,
  onClose,
}: FleetAIChatHUDProps) {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input on open
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

  // Quick Action Buttons
  const quickActions = [
    {
      label: '📊 Flotta Állapotjelentés',
      prompt: 'Készíts egy átfogó analitikus összefoglalót a teljes járműflottáról, az aktákról és a szervizállapotról!',
      icon: TrendingUp,
    },
    {
      label: '⚠️ Sürgős Akták & Lejáratok',
      prompt: 'Mely járművek aktái jártak le vagy járnak le a következő 30 napban? Részletezd ITP, CASCO, RCA és tachográf szerint!',
      icon: AlertTriangle,
    },
    {
      label: '📦 Raktárkészlet & Olajhiány',
      prompt: 'Milyen alkatrészek és kenőanyagok vannak kritikus szinten vagy hiányoznak a raktárból?',
      icon: Package,
    },
    {
      label: '🔧 Nyitott Munkalapok & Költségek',
      prompt: 'Milyen javítások vannak jelenleg folyamatban és mekkora a becsült összköltségük?',
      icon: Wrench,
    },
    {
      label: '💡 Optimalizálási Tanácsok',
      prompt: 'Milyen költségcsökkentési és megelőző karbantartási javaslataid vannak a jelenlegi flottaadatok alapján?',
      icon: Sparkles,
    },
  ];

  // Helper to get mood description
  const getMoodBadge = () => {
    switch (mood) {
      case 'thinking':
        return { text: 'Gondolkodik...', color: 'text-purple-400 bg-purple-950/70 border-purple-500/40' };
      case 'analyzing':
        return { text: 'Adatelemzés...', color: 'text-amber-400 bg-amber-950/70 border-amber-500/40' };
      case 'alert':
        return { text: 'Flotta Riasztás!', color: 'text-red-400 bg-red-950/70 border-red-500/40' };
      case 'happy':
        return { text: 'Flotta Optimális', color: 'text-emerald-400 bg-emerald-950/70 border-emerald-500/40' };
      case 'bored':
        return { text: 'Alvó Mód (zZz)', color: 'text-slate-400 bg-slate-800/70 border-slate-600/40' };
      case 'speaking':
        return { text: 'Válaszol...', color: 'text-cyan-400 bg-cyan-950/70 border-cyan-500/40' };
      case 'idle':
      default:
        return { text: 'Készenlét', color: 'text-cyan-400 bg-cyan-950/70 border-cyan-500/40' };
    }
  };

  const moodBadge = getMoodBadge();

  // Simple clean markdown formatter for AI responses
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-1.5 text-[13.5px] leading-relaxed">
        {lines.map((line, idx) => {
          // Empty line
          if (!line.trim()) {
            return <div key={idx} className="h-1.5" />;
          }

          // Main Header (### or ## or #)
          if (line.startsWith('#')) {
            const clean = line.replace(/^#+\s*/, '');
            return (
              <h4
                key={idx}
                className="font-black text-cyan-300 tracking-wide text-[14px] mt-2 pb-0.5 border-b border-cyan-500/20 flex items-center space-x-1.5"
              >
                <span>{clean}</span>
              </h4>
            );
          }

          // Bullet point (- or * or •)
          if (line.match(/^[\*\-•]\s/)) {
            const clean = line.replace(/^[\*\-•]\s*/, '');
            return (
              <div key={idx} className="flex items-start space-x-2 pl-1.5 text-slate-200">
                <span className="text-cyan-400 font-bold mt-1 text-xs">•</span>
                <span dangerouslySetInnerHTML={{ __html: formatInline(clean) }} />
              </div>
            );
          }

          // Numbered list
          if (line.match(/^\d+\.\s/)) {
            const match = line.match(/^(\d+)\.\s*(.*)$/);
            return (
              <div key={idx} className="flex items-start space-x-2 pl-1 text-slate-200">
                <span className="text-cyan-400 font-mono font-bold text-xs mt-0.5">
                  {match ? match[1] : '•'}.
                </span>
                <span
                  dangerouslySetInnerHTML={{
                    __html: formatInline(match ? match[2] : line),
                  }}
                />
              </div>
            );
          }

          // Regular paragraph
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

  // Inline formatting for **bold**, `code`, and warning tags
  const formatInline = (str: string) => {
    let out = str
      // Escape basic HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Bold **text**
    out = out.replace(
      /\*\*(.*?)\*\*/g,
      '<strong class="font-bold text-white tracking-tight">$1</strong>'
    );

    // Code `code`
    out = out.replace(
      /`(.*?)`/g,
      '<code class="px-1.5 py-0.5 bg-slate-900/80 border border-slate-700/60 rounded text-[12px] font-mono text-cyan-300">$1</code>'
    );

    // Alert / Status Pills
    out = out.replace(
      /\[LEJÁRT\]/g,
      '<span class="px-1.5 py-0.5 rounded bg-red-900/80 border border-red-500/50 text-red-300 font-bold text-[10px] font-mono uppercase mr-1">LEJÁRT</span>'
    );
    out = out.replace(
      /\[KRITIKUS\]/g,
      '<span class="px-1.5 py-0.5 rounded bg-red-900/80 border border-red-500/50 text-red-300 font-bold text-[10px] font-mono uppercase mr-1">KRITIKUS</span>'
    );
    out = out.replace(
      /\[FIGYELEM\]/g,
      '<span class="px-1.5 py-0.5 rounded bg-amber-900/80 border border-amber-500/50 text-amber-300 font-bold text-[10px] font-mono uppercase mr-1">FIGYELEM</span>'
    );
    out = out.replace(
      /\[RENDBEN\]/g,
      '<span class="px-1.5 py-0.5 rounded bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 font-bold text-[10px] font-mono uppercase mr-1">RENDBEN</span>'
    );

    return out;
  };

  return (
    <div
      className={`fixed transition-all duration-300 ease-out z-50 flex flex-col rounded-3xl border border-cyan-500/30 backdrop-blur-2xl bg-slate-950/90 shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden ${
        isExpanded
          ? 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[680px] h-[calc(100vh-3rem)] sm:h-[820px] max-h-[92vh]'
          : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[500px] h-[580px] max-h-[85vh]'
      }`}
      style={{
        boxShadow:
          '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 35px rgba(6, 182, 212, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.15)',
      }}
    >
      {/* Top Cyber Aesthetic Accent Line */}
      <div className="h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee]" />

      {/* HEADER */}
      <div className="px-4 py-3 bg-gradient-to-b from-slate-900/90 to-slate-950/90 border-b border-slate-800/80 flex items-center justify-between">
        {/* Title & Robot Badge */}
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Bot className="w-4 h-4 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-black tracking-tight text-white flex items-center space-x-1">
                <span>ROBI</span>
                <span className="text-cyan-400">AI</span>
                <span className="text-[10px] text-slate-400 font-mono font-normal ml-1">
                  v2.4
                </span>
              </span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full border flex items-center space-x-1 ${moodBadge.color}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                <span>{moodBadge.text}</span>
              </span>
            </div>
            <p className="text-[10px] font-mono text-slate-400">
              Élő adatbázis • Flotta & Akta Asszisztens
            </p>
          </div>
        </div>

        {/* Actions (Expand, Clear, Close) */}
        <div className="flex items-center space-x-1">
          <button
            type="button"
            onClick={onClearHistory}
            title="Beszélgetés törlése"
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Kicsinyítés' : 'Teljes méret'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/60 transition-colors hidden sm:block"
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Bezárás & Vissza golyóvá"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* LIVE KPI STRIP */}
      {kpi && (
        <div className="px-3 py-1.5 bg-slate-900/40 border-b border-slate-800/60 flex items-center justify-between text-[11px] font-mono overflow-x-auto no-scrollbar">
          <div className="flex items-center space-x-3 text-slate-300 whitespace-nowrap">
            <span className="flex items-center space-x-1">
              <span className="text-slate-500">Jármű:</span>
              <strong className="text-cyan-400 font-bold">{kpi.totalVehicles}</strong>
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center space-x-1">
              <span className="text-slate-500">Lejárt:</span>
              <strong
                className={`font-bold ${
                  kpi.expiredDocs > 0 ? 'text-red-400 animate-pulse' : 'text-emerald-400'
                }`}
              >
                {kpi.expiredDocs}
              </strong>
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center space-x-1">
              <span className="text-slate-500">30 napon belül:</span>
              <strong className="text-amber-400 font-bold">{kpi.imminentDocs}</strong>
            </span>
            <span className="text-slate-700">•</span>
            <span className="flex items-center space-x-1">
              <span className="text-slate-500">Készlethiány:</span>
              <strong className="text-rose-400 font-bold">{kpi.lowStockItems}</strong>
            </span>
          </div>
        </div>
      )}

      {/* QUICK PROMPT PILLS */}
      <div className="px-3 py-2 bg-slate-950/60 border-b border-slate-900 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
        {quickActions.map((action, i) => {
          const Icon = action.icon;
          return (
            <button
              key={i}
              type="button"
              disabled={isLoading}
              onClick={() => onSendMessage(action.prompt)}
              className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-cyan-950/60 border border-slate-800 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300 transition-all flex items-center space-x-1 shadow-sm disabled:opacity-50"
            >
              <Icon className="w-3 h-3 text-cyan-400" />
              <span>{action.label}</span>
            </button>
          );
        })}
      </div>

      {/* MESSAGES SCROLL AREA */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/50">
        {messages.map((msg) => {
          const isAI = msg.sender === 'ai';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAI ? 'items-start' : 'items-end'}`}
            >
              <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-mono text-slate-400 px-1">
                <span>{isAI ? 'ROBI' : 'TE'}</span>
                <span>•</span>
                <span>{msg.timestamp}</span>
              </div>
              <div
                className={`max-w-[90%] sm:max-w-[85%] rounded-2xl p-3.5 shadow-md ${
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

        {/* Loading Indicator when generating answer */}
        {isLoading && (
          <div className="flex flex-col items-start">
            <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-mono text-cyan-400 px-1">
              <span>ROBI ELEMZÉSE</span>
              <span className="animate-ping">•</span>
            </div>
            <div className="rounded-2xl rounded-tl-sm p-3.5 bg-slate-900/90 border border-cyan-500/40 text-slate-100 flex items-center space-x-3 shadow-lg">
              <div className="flex space-x-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-xs font-mono text-cyan-300">
                Flottaadatbázis lekérdezése és analízis folyamatban...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT FORM */}
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
            placeholder="Kérdezz a flottáról, aktákról, költségekről, alkatrészekről..."
            className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400/80 focus:ring-1 focus:ring-cyan-400/50 resize-none font-sans"
          />
          <div className="absolute right-2 bottom-2 text-[9px] font-mono text-slate-500 pointer-events-none hidden sm:block">
            Shift+Enter új sor
          </div>
        </div>
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          aria-label="Üzenet küldése"
          className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-cyan-500/25 hover:opacity-95 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
        >
          <Send className="w-5 h-5 text-white" />
        </button>
      </form>
    </div>
  );
}
