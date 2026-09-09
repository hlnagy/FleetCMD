"use client";

import React, { useState, useEffect } from 'react';

export type RobotMood = 'idle' | 'thinking' | 'bored' | 'analyzing' | 'alert' | 'happy' | 'speaking';

interface FleetRobotOrbProps {
  isOpen: boolean;
  mood: RobotMood;
  onToggle: () => void;
  unreadCount?: number;
}

export default function FleetRobotOrb({
  isOpen,
  mood,
  onToggle,
  unreadCount = 0,
}: FleetRobotOrbProps) {
  const [blink, setBlink] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Natural spontaneous blinking when in idle or happy mode
  useEffect(() => {
    if (mood !== 'idle' && mood !== 'happy') return;
    const interval = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 220);
    }, 4000 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [mood]);

  // Determine glow colors based on mood
  const getMoodColors = () => {
    switch (mood) {
      case 'alert':
        return {
          glow: 'rgba(239, 68, 68, 0.65)',
          border: 'border-red-500/60',
          accent: 'bg-red-500',
          textColor: 'text-red-400',
        };
      case 'analyzing':
        return {
          glow: 'rgba(245, 158, 11, 0.65)',
          border: 'border-amber-400/60',
          accent: 'bg-amber-400',
          textColor: 'text-amber-300',
        };
      case 'thinking':
        return {
          glow: 'rgba(168, 85, 247, 0.65)',
          border: 'border-purple-400/60',
          accent: 'bg-purple-400',
          textColor: 'text-purple-300',
        };
      case 'happy':
        return {
          glow: 'rgba(16, 185, 129, 0.65)',
          border: 'border-emerald-400/60',
          accent: 'bg-emerald-400',
          textColor: 'text-emerald-300',
        };
      case 'bored':
        return {
          glow: 'rgba(100, 116, 139, 0.4)',
          border: 'border-slate-500/50',
          accent: 'bg-slate-400',
          textColor: 'text-slate-400',
        };
      case 'speaking':
      case 'idle':
      default:
        return {
          glow: 'rgba(6, 182, 212, 0.7)',
          border: 'border-cyan-400/60',
          accent: 'bg-cyan-400',
          textColor: 'text-cyan-300',
        };
    }
  };

  const colors = getMoodColors();

  return (
    <div
      className="relative select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Floating Zzz particles when bored */}
      {mood === 'bored' && (
        <div className="absolute -top-6 right-2 pointer-events-none z-30 font-mono font-black text-cyan-400/90 text-xs">
          <span className="absolute animate-zzz-1 text-[11px]">z</span>
          <span className="absolute animate-zzz-2 text-[14px]">Z</span>
          <span className="absolute animate-zzz-3 text-[17px]">Z</span>
        </div>
      )}

      {/* Main Interactive Button Wrapper */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Toggle Fleet AI Assistant"
        className={`group relative flex items-center justify-center transition-all duration-700 ease-out focus:outline-none ${
          isOpen ? 'w-24 h-24' : 'w-20 h-20'
        } ${mood === 'bored' ? 'animate-robot-bored' : 'animate-robot-float'}`}
        style={{
          filter: `drop-shadow(0 8px 24px ${colors.glow})`,
        }}
      >
        {/* SPHERE MODE (When Closed) */}
        {!isOpen && (
          <div className="relative w-18 h-18 sm:w-20 sm:h-20 flex items-center justify-center transition-transform duration-500 transform group-hover:scale-105">
            {/* Outer Gyro Ring 1 */}
            <div
              className={`absolute inset-0 rounded-full border border-cyan-400/40 pointer-events-none animate-gyro-spin ${
                isHovered ? 'border-cyan-300 border-dashed' : ''
              }`}
            />
            {/* Outer Gyro Ring 2 (Crossed) */}
            <div
              className={`absolute inset-1 rounded-full border border-indigo-400/30 pointer-events-none animate-gyro-reverse ${
                isHovered ? 'border-indigo-300' : ''
              }`}
            />

            {/* Glowing Ambient Atmospheric Halo */}
            <div className="absolute -inset-2 rounded-full bg-cyan-500/15 blur-md -z-10 group-hover:bg-cyan-400/25 transition-all duration-300" />

            {/* Metallic Sphere Body */}
            <div
              className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-inner overflow-hidden border border-white/25"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #334155 0%, #1e293b 40%, #090d16 90%)',
                boxShadow:
                  'inset 2px 2px 5px rgba(255,255,255,0.3), inset -3px -3px 7px rgba(0,0,0,0.8), 0 10px 25px rgba(0,0,0,0.7)',
              }}
            >
              {/* Brushed Metallic Reflection Highlight */}
              <div className="absolute top-1 left-2 w-8 h-4 rounded-full bg-gradient-to-b from-white/40 to-transparent blur-[1px] transform -rotate-25 pointer-events-none" />

              {/* Central Core Eye / Aperture */}
              <div
                className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  mood === 'alert'
                    ? 'bg-red-950 border border-red-500/60'
                    : mood === 'thinking'
                    ? 'bg-purple-950 border border-purple-500/60'
                    : 'bg-cyan-950 border border-cyan-400/60'
                }`}
                style={{
                  boxShadow: `0 0 14px ${colors.glow}, inset 0 0 8px ${colors.glow}`,
                }}
              >
                {/* Glowing Core Pupil / Iris */}
                <div
                  className={`rounded-full transition-all duration-300 ${
                    blink ? 'h-0.5 w-6' : 'w-4 h-4'
                  } ${colors.accent} shadow-lg`}
                  style={{
                    boxShadow: `0 0 10px ${colors.glow}`,
                  }}
                />

                {/* Cyber HUD tick marks on iris */}
                <div className="absolute inset-0 rounded-full border border-dashed border-white/20 pointer-events-none animate-spin" style={{ animationDuration: '20s' }} />
              </div>

              {/* Status Indicator LED on sphere apex */}
              <div className="absolute top-1 right-2 w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping opacity-75" />
            </div>

            {/* Notification Badge if unread / alert */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-black flex items-center justify-center ring-2 ring-slate-900 shadow-lg animate-bounce">
                {unreadCount > 9 ? '!' : unreadCount}
              </div>
            )}
          </div>
        )}

        {/* ROBOT DRONE MODE (When Open / Transformed) */}
        {isOpen && (
          <div className="relative w-24 h-24 flex flex-col items-center justify-center transition-all duration-700 ease-out transform scale-100">
            {/* Top Cowling / Armor Shell (Lifted) */}
            <div className="absolute -top-1 w-16 h-3 rounded-t-full bg-gradient-to-r from-slate-700 via-slate-600 to-slate-800 border-t border-x border-white/30 shadow-md flex items-center justify-center z-10 transition-transform duration-500 transform -translate-y-1">
              <div className="w-4 h-0.5 rounded-full bg-cyan-400/70 shadow-[0_0_6px_#22d3ee]" />
            </div>

            {/* Antigravity Side Fin / Ear Sensors */}
            <div className="absolute -left-2 top-6 w-3 h-8 rounded-l-md bg-gradient-to-r from-slate-800 to-slate-700 border-y border-l border-cyan-500/40 shadow-sm flex flex-col justify-between py-1 items-start pl-0.5">
              <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
              <div className="w-1 h-2 rounded-full bg-slate-600" />
              <div className="w-1 h-1 rounded-full bg-cyan-400" />
            </div>
            <div className="absolute -right-2 top-6 w-3 h-8 rounded-r-md bg-gradient-to-l from-slate-800 to-slate-700 border-y border-r border-cyan-500/40 shadow-sm flex flex-col justify-between py-1 items-end pr-0.5">
              <div className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse" />
              <div className="w-1 h-2 rounded-full bg-slate-600" />
              <div className="w-1 h-1 rounded-full bg-cyan-400" />
            </div>

            {/* Central Robot Chassis / Head */}
            <div
              className="relative w-20 h-16 rounded-2xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border border-slate-700/80 shadow-2xl overflow-hidden flex flex-col items-center justify-center p-2 z-20"
              style={{
                boxShadow: `0 8px 30px rgba(0,0,0,0.8), 0 0 20px ${colors.glow}`,
              }}
            >
              {/* Metallic Glass Specular Flare */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-white/25 to-transparent pointer-events-none" />

              {/* Visor Screen (OLED Cyber Face) */}
              <div className="relative w-full h-9 rounded-lg bg-black/90 border border-white/10 shadow-inner flex items-center justify-center px-1 overflow-hidden">
                {/* Subtle Scanlines */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-20"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.08) 1px, rgba(255,255,255,0.08) 2px)',
                  }}
                />

                {/* Laser scanline in thinking / analyzing mode */}
                {(mood === 'thinking' || mood === 'analyzing') && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_8px_#22d3ee] animate-scan-laser pointer-events-none" />
                )}

                {/* === MOOD SPECIFIC VISOR EXPRESSIONS === */}
                {/* 1. THINKING: Neural scanning arcs */}
                {mood === 'thinking' && (
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_8px_#c084fc]" />
                    <div className="w-5 h-1.5 rounded-full bg-purple-300 shadow-[0_0_8px_#c084fc] animate-pulse" />
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_8px_#c084fc]" />
                  </div>
                )}

                {/* 2. ANALYZING: Matrix data cluster */}
                {mood === 'analyzing' && (
                  <div className="flex items-center space-x-1.5 font-mono text-[9px] font-bold text-amber-300 tracking-tighter">
                    <span className="animate-pulse">01</span>
                    <span className="w-2 h-3 bg-amber-400/80 rounded-sm shadow-[0_0_6px_#fbbf24]" />
                    <span className="animate-pulse">X8</span>
                    <span className="w-2 h-3 bg-amber-400/80 rounded-sm shadow-[0_0_6px_#fbbf24]" />
                  </div>
                )}

                {/* 3. ALERT: Red angled alert visor */}
                {mood === 'alert' && (
                  <div className="flex items-center space-x-2">
                    <div className="w-3.5 h-2 bg-red-500 rounded-sm transform -rotate-12 shadow-[0_0_10px_#ef4444] animate-pulse" />
                    <span className="text-red-400 font-black text-xs">!</span>
                    <div className="w-3.5 h-2 bg-red-500 rounded-sm transform rotate-12 shadow-[0_0_10px_#ef4444] animate-pulse" />
                  </div>
                )}

                {/* 4. BORED: Droopy sleepy eyes with tilt */}
                {mood === 'bored' && (
                  <div className="flex items-center space-x-2.5 opacity-70">
                    <div className="w-3.5 h-1 bg-slate-400 rounded-full shadow-[0_0_4px_#94a3b8] transform rotate-6" />
                    <div className="w-3.5 h-1 bg-slate-400 rounded-full shadow-[0_0_4px_#94a3b8] transform -rotate-6" />
                  </div>
                )}

                {/* 5. HAPPY: Joyful arc eyes ^ ^ */}
                {mood === 'happy' && (
                  <div className="flex items-center space-x-3 text-emerald-400 font-bold text-sm leading-none drop-shadow-[0_0_6px_#34d399]">
                    <span className="transform -scale-y-100">◡</span>
                    <span className="transform -scale-y-100">◡</span>
                  </div>
                )}

                {/* 6. SPEAKING: Equalizer bars */}
                {mood === 'speaking' && (
                  <div className="flex items-center space-x-1">
                    <div className="w-1 bg-cyan-400 rounded-full animate-soundwave-1 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1 bg-cyan-300 rounded-full animate-soundwave-2 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1 bg-cyan-400 rounded-full animate-soundwave-3 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1 bg-cyan-300 rounded-full animate-soundwave-4 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1 bg-cyan-400 rounded-full animate-soundwave-5 shadow-[0_0_6px_#22d3ee]" />
                  </div>
                )}

                {/* 7. IDLE: Glowing twin eyes with realistic blink */}
                {mood === 'idle' && (
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`bg-cyan-300 rounded-full transition-all duration-150 ${
                        blink ? 'w-3 h-0.5' : 'w-3.5 h-2.5'
                      }`}
                      style={{
                        boxShadow: '0 0 8px #22d3ee, 0 0 14px rgba(34,211,238,0.6)',
                      }}
                    />
                    <div
                      className={`bg-cyan-300 rounded-full transition-all duration-150 ${
                        blink ? 'w-3 h-0.5' : 'w-3.5 h-2.5'
                      }`}
                      style={{
                        boxShadow: '0 0 8px #22d3ee, 0 0 14px rgba(34,211,238,0.6)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Lower Mouth / Audio Grill / Mic Sensor */}
              <div className="mt-1 flex items-center space-x-1 opacity-60">
                <div className="w-1.5 h-0.5 rounded-full bg-slate-400" />
                <div className="w-3 h-0.5 rounded-full bg-cyan-400/80 shadow-[0_0_4px_#22d3ee]" />
                <div className="w-1.5 h-0.5 rounded-full bg-slate-400" />
              </div>
            </div>

            {/* Bottom Repulsor Thruster Glow */}
            <div className="w-8 h-1.5 rounded-full bg-cyan-400/80 blur-[2px] mt-0.5 shadow-[0_0_12px_#22d3ee] animate-pulse" />
          </div>
        )}
      </button>

      {/* Futuristic Hover Tooltip */}
      {!isOpen && isHovered && (
        <div className="absolute bottom-full right-0 mb-3 pointer-events-none transition-all duration-200 z-40 whitespace-nowrap">
          <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 text-cyan-200 text-xs px-3 py-1.5 rounded-xl shadow-2xl shadow-cyan-950/50 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-semibold tracking-wide">Robi • AI Flotta Drón</span>
            <span className="text-[10px] text-slate-400">Kattints az aktiváláshoz</span>
          </div>
        </div>
      )}
    </div>
  );
}
