"use client";

import React, { useState, useEffect } from 'react';
import { RobotMood } from './FleetRobotOrb';

interface TransformerRobiProps {
  isOpen: boolean;
  mood: RobotMood;
  onToggle: () => void;
  unreadCount?: number;
}

export default function TransformerRobi({
  isOpen,
  mood,
  onToggle,
  unreadCount = 0,
}: TransformerRobiProps) {
  const [blink, setBlink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [justTransformed, setJustTransformed] = useState(false);

  // Trigger shockwave effect on transformation toggle
  useEffect(() => {
    setJustTransformed(true);
    const timer = setTimeout(() => setJustTransformed(false), 800);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Natural spontaneous blinking
  useEffect(() => {
    if (mood !== 'idle' && mood !== 'happy') return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 190);
    }, 3600 + Math.random() * 2600);
    return () => clearInterval(interval);
  }, [mood]);

  // Friendly soft mood color schemes
  const getColors = () => {
    switch (mood) {
      case 'alert':
        return {
          glow: 'rgba(239, 68, 68, 0.7)',
          neon: '#ef4444',
          accentBg: 'bg-red-500',
          textColor: 'text-red-400',
        };
      case 'analyzing':
        return {
          glow: 'rgba(245, 158, 11, 0.7)',
          neon: '#f59e0b',
          accentBg: 'bg-amber-400',
          textColor: 'text-amber-300',
        };
      case 'thinking':
        return {
          glow: 'rgba(168, 85, 247, 0.7)',
          neon: '#a855f7',
          accentBg: 'bg-purple-400',
          textColor: 'text-purple-300',
        };
      case 'happy':
        return {
          glow: 'rgba(16, 185, 129, 0.75)',
          neon: '#10b981',
          accentBg: 'bg-emerald-400',
          textColor: 'text-emerald-300',
        };
      case 'bored':
        return {
          glow: 'rgba(148, 163, 184, 0.45)',
          neon: '#94a3b8',
          accentBg: 'bg-slate-400',
          textColor: 'text-slate-400',
        };
      case 'speaking':
      case 'idle':
      default:
        return {
          glow: 'rgba(6, 182, 212, 0.75)',
          neon: '#06b6d4',
          accentBg: 'bg-cyan-400',
          textColor: 'text-cyan-300',
        };
    }
  };

  const c = getColors();

  return (
    <div
      className="relative select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Transformation Shockwave Energy Burst */}
      {justTransformed && (
        <div
          className="absolute -inset-10 rounded-full pointer-events-none z-0 animate-shockwave border-2 border-cyan-400/90 shadow-[0_0_35px_#22d3ee]"
          style={{ borderColor: c.neon }}
        />
      )}

      {/* Boredom Floating "z Z Z" bubbles */}
      {mood === 'bored' && (
        <div className="absolute -top-7 right-4 pointer-events-none z-40 font-mono font-black text-cyan-300 text-xs">
          <span className="absolute animate-zzz-1 text-[11px]">z</span>
          <span className="absolute animate-zzz-2 text-[14px]">Z</span>
          <span className="absolute animate-zzz-3 text-[18px]">Z</span>
        </div>
      )}

      {/* Main Interactive Button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Robi robot átalakítása"
        className={`group relative flex items-center justify-center transition-all duration-700 ease-spring focus:outline-none ${
          isOpen ? 'w-32 h-44 sm:w-36 sm:h-48' : 'w-20 h-20'
        } ${mood === 'bored' ? 'animate-robot-bored' : 'animate-robot-float'}`}
        style={{
          filter: `drop-shadow(0 10px 28px ${c.glow})`,
        }}
      >
        {/* ========================================================= */}
        {/* STATE 1: GLOSSY PEARL WHITE SPHERE (Closed)              */}
        {/* ========================================================= */}
        {!isOpen && (
          <div className="relative w-20 h-20 flex items-center justify-center transition-transform duration-500 transform group-hover:scale-110">
            {/* Outer Cyan Gyro Rings */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-cyan-400/50 pointer-events-none animate-gyro-spin ${
                isHovered ? 'border-cyan-300 border-dashed' : ''
              }`}
            />
            <div
              className={`absolute inset-1.5 rounded-full border border-sky-400/40 pointer-events-none animate-gyro-reverse ${
                isHovered ? 'border-sky-300' : ''
              }`}
            />

            {/* Soft Ambient Atmospheric Halo */}
            <div className="absolute -inset-3 rounded-full bg-cyan-400/25 blur-md -z-10 group-hover:bg-cyan-300/40 transition-all duration-300" />

            {/* Ceramic Pearl White Sphere Body */}
            <div
              className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-2 border-white/95"
              style={{
                background:
                  'radial-gradient(circle at 35% 28%, #ffffff 0%, #f8fafc 35%, #e2e8f0 70%, #94a3b8 100%)',
                boxShadow:
                  'inset 3px 3px 7px rgba(255,255,255,0.9), inset -4px -4px 8px rgba(100,116,139,0.35), 0 12px 28px rgba(0,0,0,0.35)',
              }}
            >
              {/* Gloss Specular Highlight */}
              <div className="absolute top-1 left-2 w-9 h-4 rounded-full bg-gradient-to-b from-white to-transparent blur-[0.5px] transform -rotate-25 pointer-events-none opacity-90" />

              {/* Central Cute Core Eye / Spark */}
              <div
                className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  mood === 'alert'
                    ? 'bg-red-950/80 border border-red-500/80'
                    : mood === 'thinking'
                    ? 'bg-purple-950/80 border border-purple-500/80'
                    : 'bg-slate-950/85 border border-cyan-400/80'
                }`}
                style={{
                  boxShadow: `0 0 16px ${c.glow}, inset 0 0 10px ${c.glow}`,
                }}
              >
                {/* Glowing Pupil */}
                <div
                  className={`rounded-full transition-all duration-200 ${
                    blink ? 'h-0.5 w-6' : 'w-4 h-4'
                  } ${c.accentBg} shadow-lg`}
                  style={{
                    boxShadow: `0 0 12px ${c.neon}`,
                  }}
                />
              </div>

              {/* Apex LED beacon */}
              <div className="absolute top-2 right-2.5 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping opacity-90" />
            </div>

            {/* Notification Badge */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white font-mono text-[10px] font-black flex items-center justify-center ring-2 ring-white shadow-xl animate-bounce">
                {unreadCount > 9 ? '!' : unreadCount}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STATE 2: FEHÉR & KEDVES ROBI (Transformed Friendly Mecha) */}
        {/* ========================================================= */}
        {isOpen && (
          <div className="relative w-32 h-44 sm:w-36 sm:h-48 flex flex-col items-center justify-start transition-all duration-700 ease-out transform scale-100">
            {/* --- 1. CUTE WHITE ANTENNA WITH GLOWING BEAD --- */}
            <div className="relative flex flex-col items-center z-30 mb-0.5">
              <div
                className="w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee] animate-pulse border border-white"
                style={{ backgroundColor: c.neon }}
              />
              <div className="w-1 h-2.5 bg-gradient-to-b from-slate-300 to-white" />
            </div>

            {/* --- 2. FRIENDLY ROUNDED WHITE CERAMIC HEAD --- */}
            <div
              className={`relative z-30 w-24 sm:w-26 h-16 rounded-3xl p-1.5 flex flex-col items-center justify-center border-2 border-white shadow-2xl transition-transform duration-300 ${
                isHovered ? 'animate-head-tilt' : ''
              }`}
              style={{
                background:
                  'radial-gradient(circle at 35% 25%, #ffffff 0%, #f8fafc 40%, #e2e8f0 85%, #cbd5e1 100%)',
                boxShadow: `0 8px 25px rgba(0,0,0,0.3), 0 0 20px ${c.glow}`,
              }}
            >
              {/* Cute Cheek Blush Pink Lights when happy or hovered */}
              {(isHovered || mood === 'happy') && (
                <>
                  <div className="absolute left-2.5 bottom-2.5 w-2 h-1.5 rounded-full bg-pink-400/80 blur-[1px] animate-pulse" />
                  <div className="absolute right-2.5 bottom-2.5 w-2 h-1.5 rounded-full bg-pink-400/80 blur-[1px] animate-pulse" />
                </>
              )}

              {/* Glossy Curved Obsidian OLED Visor */}
              <div className="relative w-full h-10 rounded-2xl bg-slate-950 border border-cyan-400/40 shadow-inner flex items-center justify-center px-1.5 overflow-hidden">
                {/* Laser scanline in thinking / analyzing mode */}
                {(mood === 'thinking' || mood === 'analyzing') && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_8px_#22d3ee] animate-scan-laser pointer-events-none" />
                )}

                {/* === CUTE EXPRESSIVE OLED EYES === */}
                {/* 1. HAPPY or HOVERED: Cute joyful curved anime eyes ^ ^ */}
                {(isHovered || mood === 'happy') ? (
                  <div className="flex items-center space-x-3 text-cyan-300 font-black text-lg leading-none drop-shadow-[0_0_8px_#22d3ee]">
                    <span className="transform -scale-y-100">◡</span>
                    <span className="transform -scale-y-100">◡</span>
                  </div>
                ) : mood === 'thinking' ? (
                  /* 2. THINKING: Neural pulsing arcs */
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_8px_#c084fc]" />
                    <div className="w-4 h-2 rounded-full bg-purple-300 shadow-[0_0_8px_#c084fc] animate-pulse" />
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_8px_#c084fc]" />
                  </div>
                ) : mood === 'analyzing' ? (
                  /* 3. ANALYZING: Golden spark matrix */
                  <div className="flex items-center space-x-1.5 font-mono text-[9px] font-black text-amber-300">
                    <span className="animate-pulse">★</span>
                    <span className="w-2.5 h-3 bg-amber-400/90 rounded-sm shadow-[0_0_6px_#fbbf24]" />
                    <span className="animate-pulse">★</span>
                  </div>
                ) : mood === 'alert' ? (
                  /* 4. ALERT: Surprised round warning eyes */
                  <div className="flex items-center space-x-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping" />
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-ping" />
                  </div>
                ) : mood === 'bored' ? (
                  /* 5. BORED: Sleepy heavy droop */
                  <div className="flex items-center space-x-3 opacity-75">
                    <div className="w-3.5 h-1 bg-cyan-300 rounded-full transform rotate-6 shadow-[0_0_4px_#22d3ee]" />
                    <div className="w-3.5 h-1 bg-cyan-300 rounded-full transform -rotate-6 shadow-[0_0_4px_#22d3ee]" />
                  </div>
                ) : mood === 'speaking' ? (
                  /* 6. SPEAKING: Bouncing equalizer soundwave smile */
                  <div className="flex items-center space-x-1">
                    <div className="w-1 bg-cyan-400 rounded-full animate-soundwave-1 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1 bg-cyan-300 rounded-full animate-soundwave-2 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1.5 bg-cyan-200 rounded-full animate-soundwave-3 shadow-[0_0_8px_#22d3ee]" />
                    <div className="w-1 bg-cyan-300 rounded-full animate-soundwave-4 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1 bg-cyan-400 rounded-full animate-soundwave-5 shadow-[0_0_6px_#22d3ee]" />
                  </div>
                ) : (
                  /* 7. IDLE: Big, friendly, glowing cyan oval eyes */
                  <div className="flex items-center space-x-3">
                    <div
                      className={`bg-cyan-300 rounded-full transition-all duration-150 ${
                        blink ? 'w-4 h-0.5' : 'w-3.5 h-4'
                      }`}
                      style={{
                        boxShadow: '0 0 10px #22d3ee, 0 0 18px rgba(34,211,238,0.7)',
                      }}
                    />
                    <div
                      className={`bg-cyan-300 rounded-full transition-all duration-150 ${
                        blink ? 'w-4 h-0.5' : 'w-3.5 h-4'
                      }`}
                      style={{
                        boxShadow: '0 0 10px #22d3ee, 0 0 18px rgba(34,211,238,0.7)',
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* --- 3. WHITE ROUNDED BODY & GLOWING HEART REACTOR --- */}
            <div
              className="relative w-22 sm:w-24 h-15 rounded-3xl mt-0.5 flex flex-col items-center justify-center z-20 border-2 border-white shadow-xl overflow-hidden"
              style={{
                background:
                  'radial-gradient(circle at 35% 25%, #ffffff 0%, #f8fafc 45%, #e2e8f0 80%, #cbd5e1 100%)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.25)',
              }}
            >
              {/* Glossy Chest Highlight */}
              <div className="absolute top-0.5 left-2 right-2 h-2 rounded-full bg-gradient-to-r from-transparent via-white to-transparent opacity-80 pointer-events-none" />

              {/* Glowing Heart / Arc Reactor */}
              <div
                className="w-7 h-7 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center animate-arc-reactor shadow-lg"
                style={{
                  borderColor: c.neon,
                  boxShadow: `0 0 14px ${c.glow}, inset 0 0 8px ${c.glow}`,
                }}
              >
                <div
                  className="w-3.5 h-3.5 rounded-full bg-cyan-300 animate-pulse"
                  style={{
                    backgroundColor: c.neon,
                    boxShadow: `0 0 8px ${c.neon}`,
                  }}
                />
              </div>
            </div>

            {/* --- 4. ARTICULATED WHITE ARMS (WAVING ON HOVER!) --- */}
            {/* Left Arm (Resting) */}
            <div className="absolute -left-2 top-14 w-4 h-12 flex flex-col items-center z-15">
              <div className="w-4 h-4 rounded-full bg-white border border-slate-300 shadow-sm" />
              <div className="w-2.5 h-5 bg-gradient-to-b from-white to-slate-200 border-x border-slate-300" />
              <div className="w-3.5 h-4 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
              </div>
            </div>

            {/* Right Arm (WAVING HELLO WHEN HOVERED!) */}
            <div
              className={`absolute -right-2 top-14 w-4 h-12 flex flex-col items-center z-15 transition-transform duration-300 ${
                isHovered ? 'animate-cute-wave' : mood === 'speaking' ? 'animate-arm-sway' : ''
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white border border-slate-300 shadow-sm" />
              <div className="w-2.5 h-5 bg-gradient-to-b from-white to-slate-200 border-x border-slate-300" />
              <div className="w-3.5 h-4 rounded-full bg-white border border-slate-300 shadow-sm flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
              </div>
            </div>

            {/* --- 5. ROUNDED WHITE HOVER JET PODS & GLOW --- */}
            <div className="relative w-16 h-8 flex items-start justify-between px-2 mt-0.5 z-10">
              {/* Left Pod */}
              <div className="flex flex-col items-center">
                <div className="w-4.5 h-5 rounded-b-xl bg-gradient-to-b from-white to-slate-200 border border-slate-300 shadow-md" />
                <div className="w-3 h-2 rounded-b-full bg-cyan-400 blur-[1.5px] shadow-[0_0_12px_#22d3ee] animate-pulse" />
              </div>

              {/* Right Pod */}
              <div className="flex flex-col items-center">
                <div className="w-4.5 h-5 rounded-b-xl bg-gradient-to-b from-white to-slate-200 border border-slate-300 shadow-md" />
                <div className="w-3 h-2 rounded-b-full bg-cyan-400 blur-[1.5px] shadow-[0_0_12px_#22d3ee] animate-pulse" />
              </div>
            </div>
          </div>
        )}
      </button>

      {/* Friendly Hover Tooltip in Romanian */}
      {!isOpen && isHovered && (
        <div className="absolute bottom-full right-0 mb-3 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
          <div className="bg-slate-950/95 backdrop-blur-md border border-cyan-400/50 text-cyan-200 text-xs px-3.5 py-2 rounded-2xl shadow-2xl shadow-cyan-950/70 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold tracking-wide">Robi • Asistent Flotă</span>
            <span className="text-[11px] text-slate-400">Apasă pentru a deschide</span>
          </div>
        </div>
      )}
    </div>
  );
}
