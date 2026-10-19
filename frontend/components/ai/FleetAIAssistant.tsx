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

*Apasă pe oricare dintre sugestiile de mai sus sau scrie-mi o întrebare!*`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<ChatMessage[]>([initialWelcome]);

  // Draggable position, Physics throwing & Mini Collapsed state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isMini, setIsMini] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);
  const [mounted, setMounted] = useState(false);

  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialPosX: number;
    initialPosY: number;
    hasMoved: boolean;
  }>({ startX: 0, startY: 0, initialPosX: 0, initialPosY: 0, hasMoved: false });

  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const physicsAnimRef = useRef<number | null>(null);
  const velocityHistoryRef = useRef<{ x: number; y: number; time: number }[]>([]);

  // Load saved position & mini state from localStorage on mount
  useEffect(() => {
    setMounted(true);
    try {
      const savedMini = localStorage.getItem('fleet_ai_robi_mini');
      const initialMini = savedMini !== null ? JSON.parse(savedMini) : false;
      setIsMini(initialMini);

      const botSize = initialMini ? 44 : 80;
      const margin = 12;

      const savedPos = localStorage.getItem('fleet_ai_robi_pos');
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          const clampedX = Math.min(Math.max(margin, parsed.x), window.innerWidth - botSize - margin);
          const clampedY = Math.min(Math.max(margin, parsed.y), window.innerHeight - botSize - margin);
          setPosition({ x: clampedX, y: clampedY });
          return;
        }
      }

      // Default bottom-right position
      setPosition({
        x: Math.max(margin, window.innerWidth - botSize - 24),
        y: Math.max(margin, window.innerHeight - botSize - 24),
      });
    } catch (e) {
      console.warn('Failed to load Robi position from localStorage', e);
    }
  }, []);

  // Keep bot strictly inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        const botSize = isMini ? 44 : 80;
        const margin = 12;
        const clampedX = Math.min(Math.max(margin, prev.x), window.innerWidth - botSize - margin);
        const clampedY = Math.min(Math.max(margin, prev.y), window.innerHeight - botSize - margin);
        return { x: clampedX, y: clampedY };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMini]);

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

  // Toggle Mini / Compact mode with animation
  const toggleMini = () => {
    setIsMini((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fleet_ai_robi_mini', JSON.stringify(next));
      } catch (err) {}
      setMood('happy');
      setTimeout(() => setMood('idle'), 1200);
      return next;
    });
  };

  // Stop physics on interaction
  const stopPhysics = () => {
    if (physicsAnimRef.current) {
      cancelAnimationFrame(physicsAnimRef.current);
      physicsAnimRef.current = null;
    }
    setIsBouncing(false);
  };

  // Handle native double-click
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopPhysics();
    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
      clickTimerRef.current = null;
    }
    lastClickTimeRef.current = 0;
    toggleMini();
  };

  // Drag, Throw & Pointer Gesture Handler with Wall-Bouncing Physics
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button (left mouse or touch)
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    stopPhysics();

    const botSize = isMini ? 40 : 80;
    const currentPos = position || {
      x: window.innerWidth - botSize - 24,
      y: window.innerHeight - botSize - 24,
    };

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialPosX: currentPos.x,
      initialPosY: currentPos.y,
      hasMoved: false,
    };

    velocityHistoryRef.current = [{ x: e.clientX, y: e.clientY, time: performance.now() }];

    const handlePointerMove = (ev: PointerEvent) => {
      const deltaX = ev.clientX - dragRef.current.startX;
      const deltaY = ev.clientY - dragRef.current.startY;

      // Track last 5 position samples with timestamps for throw impulse
      const now = performance.now();
      velocityHistoryRef.current.push({ x: ev.clientX, y: ev.clientY, time: now });
      if (velocityHistoryRef.current.length > 5) {
        velocityHistoryRef.current.shift();
      }

      // Threshold of 4px to distinguish deliberate drag from click
      if (!dragRef.current.hasMoved && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
        dragRef.current.hasMoved = true;
        setIsDragging(true);
      }

      if (dragRef.current.hasMoved) {
        const margin = 10;
        const maxX = Math.max(margin, window.innerWidth - botSize - margin);
        const maxY = Math.max(margin, window.innerHeight - botSize - margin);

        const newX = Math.min(Math.max(margin, dragRef.current.initialPosX + deltaX), maxX);
        const newY = Math.min(Math.max(margin, dragRef.current.initialPosY + deltaY), maxY);

        setPosition({ x: newX, y: newY });
      }
    };

    const handlePointerUp = (ev: PointerEvent) => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);

      if (dragRef.current.hasMoved) {
        setIsDragging(false);

        // Calculate release throw velocity from recent pointer samples
        const hist = velocityHistoryRef.current;
        let vx = 0;
        let vy = 0;
        if (hist.length >= 2) {
          const oldest = hist[0];
          const newest = hist[hist.length - 1];
          const dt = Math.max(1, newest.time - oldest.time);
          vx = ((newest.x - oldest.x) / dt) * 16;
          vy = ((newest.y - oldest.y) / dt) * 16;
        }

        const throwSpeed = Math.hypot(vx, vy);

        // If thrown with velocity (> 2.2px/frame), start bouncing physics!
        if (throwSpeed > 2.2) {
          const maxSpeed = 36;
          if (throwSpeed > maxSpeed) {
            vx = (vx / throwSpeed) * maxSpeed;
            vy = (vy / throwSpeed) * maxSpeed;
          }

          setIsBouncing(true);
          setMood('happy');

          let curX = dragRef.current.initialPosX + (ev.clientX - dragRef.current.startX);
          let curY = dragRef.current.initialPosY + (ev.clientY - dragRef.current.startY);
          let curVx = vx;
          let curVy = vy;

          const step = () => {
            const margin = 10;
            const minX = margin;
            const maxX = Math.max(margin, window.innerWidth - botSize - margin);
            const minY = margin;
            const maxY = Math.max(margin, window.innerHeight - botSize - margin);

            curX += curVx;
            curY += curVy;

            // Air friction (gradual deceleration)
            curVx *= 0.965;
            curVy *= 0.965;

            // Restitution bounce factor (76% of energy preserved on wall bounce)
            const bounceRestitution = 0.76;

            // Bounce off Left / Right walls
            if (curX <= minX) {
              curX = minX;
              curVx = -curVx * bounceRestitution;
            } else if (curX >= maxX) {
              curX = maxX;
              curVx = -curVx * bounceRestitution;
            }

            // Bounce off Top / Bottom walls
            if (curY <= minY) {
              curY = minY;
              curVy = -curVy * bounceRestitution;
            } else if (curY >= maxY) {
              curY = maxY;
              curVy = -curVy * bounceRestitution;
            }

            setPosition({ x: curX, y: curY });

            const currentSpeed = Math.hypot(curVx, curVy);
            if (currentSpeed > 0.25) {
              physicsAnimRef.current = requestAnimationFrame(step);
            } else {
              // Stopped bouncing!
              setIsBouncing(false);
              setMood('idle');
              const finalPos = { x: curX, y: curY };
              setPosition(finalPos);
              try {
                localStorage.setItem('fleet_ai_robi_pos', JSON.stringify(finalPos));
              } catch (e) {}
            }
          };

          physicsAnimRef.current = requestAnimationFrame(step);
          return;
        }

        // Just placed without throwing:
        const margin = 10;
        const deltaX = ev.clientX - dragRef.current.startX;
        const deltaY = ev.clientY - dragRef.current.startY;
        const maxX = Math.max(margin, window.innerWidth - botSize - margin);
        const maxY = Math.max(margin, window.innerHeight - botSize - margin);
        const finalX = Math.min(Math.max(margin, dragRef.current.initialPosX + deltaX), maxX);
        const finalY = Math.min(Math.max(margin, dragRef.current.initialPosY + deltaY), maxY);

        const finalPos = { x: finalX, y: finalY };
        setPosition(finalPos);
        try {
          localStorage.setItem('fleet_ai_robi_pos', JSON.stringify(finalPos));
        } catch (err) {}
        return;
      }

      // No drag -> Click detected!
      // Handle Single Click vs Double Click:
      const clickNow = Date.now();
      const diff = clickNow - lastClickTimeRef.current;
      if (diff < 420) {
        // DOUBLE CLICK DETECTED!
        if (clickTimerRef.current) {
          clearTimeout(clickTimerRef.current);
          clickTimerRef.current = null;
        }
        lastClickTimeRef.current = 0;
        toggleMini();
      } else {
        lastClickTimeRef.current = clickNow;
        clickTimerRef.current = setTimeout(() => {
          clickTimerRef.current = null;
          lastClickTimeRef.current = 0;
          handleToggle();
        }, 340);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  // Adaptive, screen-bounded placement for speech bubble dialog
  const getBubbleStyle = (): React.CSSProperties => {
    if (!mounted || !position) {
      return {
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        zIndex: 50,
      };
    }

    const bubbleWidth = typeof window !== 'undefined' ? Math.min(420, window.innerWidth - 24) : 420;
    const bubbleHeight = typeof window !== 'undefined' ? Math.min(540, window.innerHeight - 24) : 540;
    const botSize = isMini ? 40 : 80;
    const margin = 12;

    let x = position.x;
    let y = position.y;

    // Horizontal placement: if bot is on right side of screen, bubble opens to the left
    if (position.x > window.innerWidth / 2) {
      x = position.x - bubbleWidth - margin;
    } else {
      x = position.x + botSize + margin;
    }

    // Vertical placement: if bot is in bottom half, bubble opens upwards
    if (position.y > window.innerHeight / 2) {
      y = position.y - bubbleHeight + botSize;
    } else {
      y = position.y;
    }

    // Strictly clamp within viewport
    const clampedX = Math.min(Math.max(margin, x), window.innerWidth - bubbleWidth - margin);
    const clampedY = Math.min(Math.max(margin, y), window.innerHeight - bubbleHeight - margin);

    return {
      position: 'fixed',
      left: `${clampedX}px`,
      top: `${clampedY}px`,
      zIndex: 50,
    };
  };

  return (
    <>
      {/* Robi's Transformers Speech Bubble Dialogue Window */}
      {isOpen && (
        <div style={getBubbleStyle()}>
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

      {/* Floating Draggable & Throwable Robi (Sphere <-> Mini <-> Full Robot) */}
      <div
        className={`fixed z-50 flex items-center justify-center select-none ${
          isDragging
            ? 'cursor-grabbing transition-none'
            : isBouncing
            ? 'cursor-grab transition-none'
            : 'cursor-grab transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]'
        }`}
        style={
          mounted && position
            ? {
                left: `${position.x}px`,
                top: `${position.y}px`,
                touchAction: 'none',
              }
            : {
                right: '24px',
                bottom: '24px',
                touchAction: 'none',
              }
        }
        onPointerDown={handlePointerDown}
        onDoubleClick={handleDoubleClick}
      >
        <TransformerRobi
          isOpen={isOpen}
          mood={mood}
          onToggle={() => {}} // Handled cleanly by parent click gesture timer
          onDoubleClick={handleDoubleClick}
          unreadCount={unreadCount}
          isMini={isMini}
        />
      </div>
    </>
  );
}
