"use client";

import React, { useState, useEffect, useRef } from 'react';
import TransformerRobi from './TransformerRobi';
import RobiSpeechBubble from './RobiSpeechBubble';
import { RobotMood } from './FleetRobotOrb';
import { ChatMessage, FleetQuickKpi } from './FleetAIChatHUD';
import { API_BASE_URL } from '@/lib/api';

export default function FleetAIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [mood, setMood] = useState<RobotMood>('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [kpi, setKpi] = useState<FleetQuickKpi | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const initialWelcome: ChatMessage = {
    id: 'welcome-1',
    sender: 'ai',
    text: `### 🤖 Bună! Sunt Robi, asistentul tău inteligent de flotă.

Conectez în timp real întreaga flotă de vehicule, documentele, facturile din e-Factura, stocurile și comenzile de service. 

**Cum te pot ajuta astăzi?**
- 📋 **Acte & Valabilitate:** Verificare ITP, RCA, Rovinietă, Casco, Tahograf
- 📊 **Raport Flotă:** Vehicule active, categorii, contoare KM
- 📄 **Facturi & Furnizori:** Căutare facturi e-Factura și totaluri lunare (ex: DUBHE, PARTS TRADE)
- 📦 **Stoc & Lubrifianți:** Niveluri critice de piese și uleiuri
- 🔧 **Service & Comenzi:** Reparații deschise și costuri estimate

*Apasă pe oricare dintre sugestiile de mai sus sau scrie-mi o întrebare! (Răspund în Română și Maghiară / Beszélek románul és magyarul is!)*`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcome]);

  // Idle timer to trigger boredom (unatkozás) after 28 seconds of inactivity
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (mood === 'bored') {
      setMood('idle');
    }
    idleTimerRef.current = setTimeout(() => {
      if (!isLoading) {
        setMood('bored');
      }
    }, 28000);
  };

  // Listen to user interactions to reset idle timer
  useEffect(() => {
    resetIdleTimer();
    const handleActivity = () => {
      if (mood === 'bored') {
        setMood('idle');
      }
      resetIdleTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
    };
  }, [mood, isLoading]);

  // Fetch KPI data on mount
  useEffect(() => {
    const fetchKpi = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/ai/fleet-kpi`);
        if (res.ok) {
          const data = await res.json();
          setKpi(data);
          if (data.expiredDocs > 0) {
            setUnreadCount(data.expiredDocs);
          }
        }
      } catch (err) {
        console.warn('Fleet AI: Failed to load quick KPI', err);
      }
    };
    fetchKpi();
  }, []);

  const handleToggle = () => {
    resetIdleTimer();
    if (!isOpen) {
      setIsOpen(true);
      setMood('happy');
      setUnreadCount(0);
      setTimeout(() => {
        setMood('idle');
      }, 1500);
    } else {
      setIsOpen(false);
      setMood('idle');
    }
  };

  const handleSendMessage = async (text: string) => {
    resetIdleTimer();
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: now,
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    // Expressive mood during query processing: alternate thinking and analyzing
    setMood('thinking');
    const moodTimeout = setTimeout(() => {
      setMood('analyzing');
    }, 900);

    try {
      // Build history payload for AI service
      const historyPayload = newHistory.slice(-8).map((m) => ({
        role: m.sender === 'user' ? 'user' : 'model',
        content: m.text,
      }));

      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: historyPayload,
        }),
      });

      clearTimeout(moodTimeout);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const aiReply =
        data.reply ||
        data.answer ||
        data.text ||
        data.message ||
        'Nu am putut procesa răspunsul în acest moment.';

      // Reaction based on content (supports both RO & HU tags)
      if (
        aiReply.includes('[LEJÁRT]') ||
        aiReply.includes('[KRITIKUS]') ||
        aiReply.includes('[EXPIRAT]') ||
        aiReply.includes('[CRITIC]')
      ) {
        setMood('alert');
        setTimeout(() => setMood('speaking'), 1800);
        setTimeout(() => setMood('idle'), 4500);
      } else {
        setMood('speaking');
        setTimeout(() => setMood('happy'), 1800);
        setTimeout(() => setMood('idle'), 3500);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      clearTimeout(moodTimeout);
      setMood('alert');
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'ai',
          text: '⚠️ Nu am putut stabili conexiunea cu serverul AI. Te rog încearcă din nou în câteva secunde!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setTimeout(() => setMood('idle'), 3000);
    } finally {
      setIsLoading(false);
      resetIdleTimer();
    }
  };

  const handleClearHistory = () => {
    resetIdleTimer();
    setMessages([
      {
        id: `clear-${Date.now()}`,
        sender: 'ai',
        text: '🧹 Istoricul conversației a fost șters. Cu ce te pot ajuta legat de flotă?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setMood('happy');
    setTimeout(() => setMood('idle'), 1500);
  };

  return (
    <>
      {/* Robi's Transformers Speech Bubble Dialogue Window */}
      {isOpen && (
        <div className="fixed bottom-36 right-3 sm:bottom-8 sm:right-40 z-50">
          <RobiSpeechBubble
            messages={messages}
            mood={mood}
            isLoading={isLoading}
            kpi={kpi}
            onSendMessage={handleSendMessage}
            onClearHistory={handleClearHistory}
            onClose={() => handleToggle()}
          />
        </div>
      )}

      {/* Floating Transformers Robi (Sphere <-> Full Robot) in bottom-right */}
      <div className="fixed bottom-6 right-3 sm:right-6 z-50 flex items-center justify-center">
        <TransformerRobi
          isOpen={isOpen}
          mood={mood}
          onToggle={handleToggle}
          unreadCount={unreadCount}
        />
      </div>
    </>
  );
}
