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

  // Futuristic Captain Planet Elemental Palette
  const getColors = () => {
    switch (mood) {
      case 'alert':
        return {
          glow: 'rgba(239, 68, 68, 0.85)',
          neon: '#ef4444',
          accentBg: 'bg-red-500',
          hairGlow: 'drop-shadow(0 0 12px #ef4444)',
          aura: 'from-red-500/30 to-amber-500/20',
          badgeColor: 'bg-red-600',
        };
      case 'analyzing':
        return {
          glow: 'rgba(250, 204, 21, 0.85)',
          neon: '#facc15',
          accentBg: 'bg-amber-400',
          hairGlow: 'drop-shadow(0 0 14px #facc15)',
          aura: 'from-amber-400/30 to-emerald-400/20',
          badgeColor: 'bg-amber-500',
        };
      case 'thinking':
        return {
          glow: 'rgba(192, 132, 252, 0.8)',
          neon: '#c084fc',
          accentBg: 'bg-purple-400',
          hairGlow: 'drop-shadow(0 0 14px #c084fc)',
          aura: 'from-purple-500/30 to-cyan-500/20',
          badgeColor: 'bg-purple-600',
        };
      case 'happy':
        return {
          glow: 'rgba(16, 185, 129, 0.95)',
          neon: '#10b981',
          accentBg: 'bg-emerald-400',
          hairGlow: 'drop-shadow(0 0 18px #10b981)',
          aura: 'from-emerald-400/40 to-cyan-400/30',
          badgeColor: 'bg-emerald-600',
        };
      case 'bored':
        return {
          glow: 'rgba(148, 163, 184, 0.5)',
          neon: '#94a3b8',
          accentBg: 'bg-slate-400',
          hairGlow: 'drop-shadow(0 0 8px #94a3b8)',
          aura: 'from-slate-500/20 to-slate-700/20',
          badgeColor: 'bg-slate-600',
        };
      case 'speaking':
      case 'idle':
      default:
        return {
          glow: 'rgba(16, 185, 129, 0.85)',
          neon: '#10b981',
          accentBg: 'bg-emerald-400',
          hairGlow: 'drop-shadow(0 0 14px #10b981)',
          aura: 'from-emerald-400/35 to-cyan-400/25',
          badgeColor: 'bg-emerald-500',
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
      {/* Transformation Shockwave Elemental Burst */}
      {justTransformed && (
        <div
          className="absolute -inset-10 rounded-full pointer-events-none z-0 animate-shockwave border-2 border-emerald-400 shadow-[0_0_40px_#10b981]"
          style={{ borderColor: c.neon }}
        />
      )}

      {/* Boredom Floating "z Z Z" bubbles */}
      {mood === 'bored' && (
        <div className="absolute -top-7 right-4 pointer-events-none z-40 font-mono font-black text-emerald-300 text-xs">
          <span className="absolute animate-zzz-1 text-[11px]">z</span>
          <span className="absolute animate-zzz-2 text-[14px]">Z</span>
          <span className="absolute animate-zzz-3 text-[18px]">Z</span>
        </div>
      )}

      {/* Main Interactive Button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Robi • Captain Planet AI átalakítása"
        className={`group relative flex items-center justify-center transition-all duration-700 ease-spring focus:outline-none ${
          isOpen ? 'w-34 h-48 sm:w-38 sm:h-52' : 'w-20 h-20'
        } ${mood === 'bored' ? 'animate-robot-bored' : 'animate-robot-float'}`}
        style={{
          filter: `drop-shadow(0 10px 28px ${c.glow})`,
        }}
      >
        {/* ========================================================= */}
        {/* STATE 1: PLANETEER ORBITAL ECO-CORE (Closed Sphere)       */}
        {/* ========================================================= */}
        {!isOpen && (
          <div className="relative w-20 h-20 flex items-center justify-center transition-transform duration-500 transform group-hover:scale-110">
            {/* Outer Emerald-Green Planeteer Gyro Ring (Earth & Wind) */}
            <div
              className={`absolute inset-0 rounded-full border-2 border-emerald-400/70 pointer-events-none animate-gyro-spin shadow-[0_0_15px_#10b981] ${
                isHovered ? 'border-emerald-300 border-dashed' : ''
              }`}
            />
            {/* Cross Ruby Red Energy Arc (Fire & Heart) */}
            <div
              className={`absolute inset-1.5 rounded-full border border-red-500/60 pointer-events-none animate-gyro-reverse shadow-[0_0_10px_#ef4444] ${
                isHovered ? 'border-red-400' : ''
              }`}
            />

            {/* Glowing Elemental Ambient Halo */}
            <div className={`absolute -inset-3 rounded-full bg-gradient-to-tr ${c.aura} blur-md -z-10 group-hover:opacity-100 transition-all duration-300`} />

            {/* Metallic Cyber-Blue Sphere Body (Captain Planet Skin Metal) */}
            <div
              className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-2xl overflow-hidden border-2 border-cyan-300/80"
              style={{
                background:
                  'radial-gradient(circle at 35% 28%, #7dd3fc 0%, #0284c7 35%, #0369a1 70%, #082f49 100%)',
                boxShadow:
                  'inset 3px 3px 8px rgba(255,255,255,0.7), inset -4px -4px 9px rgba(0,0,0,0.6), 0 12px 28px rgba(0,0,0,0.5)',
              }}
            >
              {/* Metallic Specular Highlight */}
              <div className="absolute top-1 left-2 w-9 h-4 rounded-full bg-gradient-to-b from-white/90 to-transparent blur-[0.5px] transform -rotate-25 pointer-events-none opacity-90" />

              {/* Equator Ruby-Red Armor Band */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2.5 bg-gradient-to-r from-red-600 via-red-500 to-red-600 border-y border-yellow-400/60 opacity-85" />

              {/* Central Holographic Earth Globe Core */}
              <div
                className="relative z-10 w-9 h-9 rounded-full bg-slate-950 border-2 border-yellow-400/90 flex items-center justify-center shadow-[0_0_18px_#facc15]"
                style={{
                  boxShadow: `0 0 16px ${c.glow}, inset 0 0 10px rgba(16,185,129,0.7)`,
                }}
              >
                {/* Rotating Earth Globe Graphic */}
                <svg
                  viewBox="0 0 32 32"
                  className="w-7 h-7 animate-planet-spin text-emerald-400"
                  fill="none"
                >
                  {/* Ocean Base */}
                  <circle cx="16" cy="16" r="14" fill="#0284c7" />
                  {/* Continents */}
                  <path
                    d="M10 8c2-1 4 0 5 2s-1 3-2 4-3 0-4-2 0-3 1-4zM20 12c1.5-1 3 0 4 1.5s-1 3-2 3.5-3-1-3-2.5 0-1.5 1-2.5zM12 18c1-1 3-1 4 0s0 3-1 4-3 1-4-1 0-2 1-3zM21 21c1.5 0 2.5 1 2 2.5s-2 2-3 1.5-1-2 0-3 0.5-1 1-1z"
                    fill="#10b981"
                  />
                  {/* Latitude / Longitude Cyber Lines */}
                  <ellipse cx="16" cy="16" rx="14" ry="6" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
                  <ellipse cx="16" cy="16" rx="6" ry="14" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
                </svg>

                {/* Pulsing Core Spark */}
                <div
                  className={`absolute w-2 h-2 rounded-full ${c.accentBg} animate-ping opacity-75`}
                />
              </div>

              {/* Apex Green Energy Beacon */}
              <div className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] animate-pulse" />
            </div>

            {/* Notification Badge */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-black flex items-center justify-center ring-2 ring-yellow-400 shadow-xl animate-bounce">
                {unreadCount > 9 ? '!' : unreadCount}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STATE 2: FUTURISTIC CAPTAIN PLANET ANDROID ROBI (Open)    */}
        {/* ========================================================= */}
        {isOpen && (
          <div className="relative w-34 h-48 sm:w-38 sm:h-52 flex flex-col items-center justify-start transition-all duration-700 ease-out transform scale-100">
            
            {/* --- 1. ICONIC GLOWING NEON EMERALD CYBER-HAIR --- */}
            <div className="relative z-30 flex items-end justify-center w-28 -mb-3 animate-hair-flow">
              {/* Left flowing energy hair spike */}
              <div
                className="w-6 h-9 -mr-2.5 rounded-tl-full rounded-br-2xl bg-gradient-to-t from-emerald-600 via-emerald-400 to-emerald-200 transform -rotate-25 shadow-[0_0_14px_#10b981]"
                style={{ filter: c.hairGlow }}
              />
              {/* Central high cyber mane spike */}
              <div
                className="w-8 h-12 rounded-t-full bg-gradient-to-t from-emerald-600 via-emerald-300 to-emerald-100 z-10 shadow-[0_0_20px_#10b981] flex items-start justify-center pt-1"
                style={{ filter: c.hairGlow }}
              >
                {/* Solar Energy Core Sparkle */}
                <div className="w-1.5 h-3 rounded-full bg-white animate-pulse" />
              </div>
              {/* Right sweeping energy hair spike */}
              <div
                className="w-7 h-10 -ml-2 rounded-tr-full rounded-bl-2xl bg-gradient-to-t from-emerald-600 via-emerald-400 to-emerald-200 transform rotate-20 shadow-[0_0_14px_#10b981]"
                style={{ filter: c.hairGlow }}
              />
              {/* Extra green plasma aura rim */}
              <div className="absolute -top-1 inset-x-4 h-6 bg-emerald-400/30 blur-md rounded-full pointer-events-none" />
            </div>

            {/* --- 2. HEROIC METALLIC SKY-BLUE CYBORG HEAD --- */}
            <div
              className={`relative z-20 w-24 sm:w-26 h-16 rounded-3xl p-1.5 flex flex-col items-center justify-center border-2 border-cyan-300 shadow-2xl transition-transform duration-300 ${
                isHovered ? 'animate-head-tilt' : ''
              }`}
              style={{
                background:
                  'radial-gradient(circle at 35% 25%, #bae6fd 0%, #38bdf8 35%, #0284c7 75%, #0369a1 100%)',
                boxShadow: `0 8px 25px rgba(0,0,0,0.4), 0 0 22px ${c.glow}`,
              }}
            >
              {/* Metallic Brow Plate & Specular Highlight */}
              <div className="absolute top-1 inset-x-3 h-1 bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />

              {/* High-Tech Obsidian Visor Faceplate */}
              <div className="relative w-full h-10 rounded-2xl bg-slate-950 border border-emerald-400/60 shadow-inner flex items-center justify-center px-1.5 overflow-hidden">
                {/* Laser scanline in thinking / analyzing mode */}
                {(mood === 'thinking' || mood === 'analyzing') && (
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_8px_#10b981] animate-scan-laser pointer-events-none" />
                )}

                {/* === EXPRESSIVE HEROIC VISOR EYES === */}
                {/* 1. HAPPY or HOVERED: Joyful hero arcs (◡ ◡) with gold sparkles */}
                {(isHovered || mood === 'happy') ? (
                  <div className="flex items-center space-x-3 text-emerald-300 font-black text-lg leading-none drop-shadow-[0_0_10px_#10b981]">
                    <span className="transform -scale-y-100">◡</span>
                    <span className="text-yellow-300 text-xs animate-spin">★</span>
                    <span className="transform -scale-y-100">◡</span>
                  </div>
                ) : mood === 'thinking' ? (
                  /* 2. THINKING: Violet cosmic arcs */
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_8px_#c084fc]" />
                    <div className="w-4 h-2 rounded-full bg-purple-300 shadow-[0_0_8px_#c084fc] animate-pulse" />
                    <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_8px_#c084fc]" />
                  </div>
                ) : mood === 'analyzing' ? (
                  /* 3. ANALYZING: Golden planetary grid matrix */
                  <div className="flex items-center space-x-1.5 font-mono text-[9px] font-black text-yellow-300">
                    <span className="animate-pulse">⊕</span>
                    <span className="w-2.5 h-3 bg-yellow-400/90 rounded-sm shadow-[0_0_8px_#facc15]" />
                    <span className="animate-pulse">⊕</span>
                  </div>
                ) : mood === 'alert' ? (
                  /* 4. ALERT: Red battle warning visor */
                  <div className="flex items-center space-x-3">
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444] animate-ping" />
                    <div className="w-3.5 h-3.5 rounded-full bg-red-500 shadow-[0_0_12px_#ef4444] animate-ping" />
                  </div>
                ) : mood === 'bored' ? (
                  /* 5. BORED: Sleepy droop */
                  <div className="flex items-center space-x-3 opacity-75">
                    <div className="w-3.5 h-1 bg-cyan-300 rounded-full transform rotate-6 shadow-[0_0_4px_#22d3ee]" />
                    <div className="w-3.5 h-1 bg-cyan-300 rounded-full transform -rotate-6 shadow-[0_0_4px_#22d3ee]" />
                  </div>
                ) : mood === 'speaking' ? (
                  /* 6. SPEAKING: Energetic emerald soundwave smile */
                  <div className="flex items-center space-x-1">
                    <div className="w-1 bg-emerald-400 rounded-full animate-soundwave-1 shadow-[0_0_6px_#10b981]" />
                    <div className="w-1 bg-cyan-300 rounded-full animate-soundwave-2 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1.5 bg-yellow-300 rounded-full animate-soundwave-3 shadow-[0_0_8px_#facc15]" />
                    <div className="w-1 bg-cyan-300 rounded-full animate-soundwave-4 shadow-[0_0_6px_#22d3ee]" />
                    <div className="w-1 bg-emerald-400 rounded-full animate-soundwave-5 shadow-[0_0_6px_#10b981]" />
                  </div>
                ) : (
                  /* 7. IDLE: Piercing heroic cyan/white oval eyes with hero blink */
                  <div className="flex items-center space-x-3">
                    <div
                      className={`bg-gradient-to-b from-white to-cyan-300 rounded-full transition-all duration-150 ${
                        blink ? 'w-4 h-0.5' : 'w-3.5 h-4'
                      }`}
                      style={{
                        boxShadow: '0 0 10px #22d3ee, 0 0 18px rgba(34,211,238,0.8)',
                      }}
                    />
                    <div
                      className={`bg-gradient-to-b from-white to-cyan-300 rounded-full transition-all duration-150 ${
                        blink ? 'w-4 h-0.5' : 'w-3.5 h-4'
                      }`}
                      style={{
                        boxShadow: '0 0 10px #22d3ee, 0 0 18px rgba(34,211,238,0.8)',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Heroic Chin Guard & Smile Accent */}
              <div className="mt-1 w-4 h-0.5 bg-cyan-200/80 rounded-full" />
            </div>

            {/* --- 3. CRIMSON-RED CYBERNETIC CHEST ARMOR & GOLDEN EARTH EMBLEM --- */}
            <div
              className="relative w-24 sm:w-26 h-16 rounded-3xl mt-0.5 flex flex-col items-center justify-center z-10 border-2 border-red-400/90 shadow-2xl overflow-hidden"
              style={{
                background:
                  'radial-gradient(circle at 35% 25%, #f87171 0%, #ef4444 40%, #dc2626 75%, #991b1b 100%)',
                boxShadow: '0 8px 22px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.4)',
              }}
            >
              {/* Metallic Chest Highlight */}
              <div className="absolute top-0.5 left-2 right-2 h-2 rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent pointer-events-none" />

              {/* Golden Yellow Shoulders / Epaulet Trim */}
              <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-yellow-400/90 shadow-[0_0_6px_#facc15]" />
              <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-yellow-400/90 shadow-[0_0_6px_#facc15]" />

              {/* Central Iconic Golden Earth Emblem (Captain Planet Solar Core) */}
              <div
                className="relative z-10 w-9 h-9 rounded-full bg-slate-950 border-2 border-yellow-300 flex items-center justify-center shadow-[0_0_18px_#facc15] animate-arc-reactor"
              >
                <svg
                  viewBox="0 0 32 32"
                  className="w-7 h-7 animate-planet-spin text-emerald-400"
                  fill="none"
                >
                  {/* Ocean Base */}
                  <circle cx="16" cy="16" r="14" fill="#0284c7" />
                  {/* Continents */}
                  <path
                    d="M10 8c2-1 4 0 5 2s-1 3-2 4-3 0-4-2 0-3 1-4zM20 12c1.5-1 3 0 4 1.5s-1 3-2 3.5-3-1-3-2.5 0-1.5 1-2.5zM12 18c1-1 3-1 4 0s0 3-1 4-3 1-4-1 0-2 1-3zM21 21c1.5 0 2.5 1 2 2.5s-2 2-3 1.5-1-2 0-3 0.5-1 1-1z"
                    fill="#10b981"
                  />
                  {/* Latitude / Longitude Cyber Lines */}
                  <ellipse cx="16" cy="16" rx="14" ry="6" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
                  <ellipse cx="16" cy="16" rx="6" ry="14" stroke="#facc15" strokeWidth="0.8" strokeDasharray="2 2" />
                </svg>

                {/* Pulsing Core Spark */}
                <div className="absolute w-2 h-2 rounded-full bg-yellow-300 animate-ping opacity-80" />
              </div>

              {/* Abdominal Cyber Plates */}
              <div className="mt-0.5 flex space-x-1">
                <div className="w-2.5 h-1 rounded-sm bg-red-900 border border-yellow-400/40" />
                <div className="w-3 h-1 rounded-sm bg-red-900 border border-yellow-400/50" />
                <div className="w-2.5 h-1 rounded-sm bg-red-900 border border-yellow-400/40" />
              </div>
            </div>

            {/* --- 4. CYBER ARMS & HEROIC CAPTAIN PLANET FIST POSE --- */}
            {/* Left Arm (Resting heroically on hip) */}
            <div className="absolute -left-2.5 top-16 w-4.5 h-14 flex flex-col items-center z-15">
              {/* Shoulder Pauldron (Crimson with Gold Trim) */}
              <div className="w-5 h-4 rounded-t-lg bg-gradient-to-b from-red-500 to-red-700 border border-yellow-400 shadow-md" />
              {/* Sky-Blue Bicep */}
              <div className="w-3 h-5 bg-gradient-to-b from-cyan-400 to-sky-600 border-x border-cyan-300 shadow-inner" />
              {/* Crimson/Gold Gauntlet & Fist */}
              <div className="w-4 h-5 rounded-b-md bg-gradient-to-b from-red-600 to-red-800 border border-yellow-400 shadow-md flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#10b981]" />
              </div>
            </div>

            {/* Right Arm (WAVING / HEROIC FIST-IN-THE-AIR POSE "THE POWER IS YOURS!") */}
            <div
              className={`absolute -right-2.5 top-16 w-4.5 h-14 flex flex-col items-center z-15 transition-transform duration-300 ${
                isHovered ? 'animate-hero-fist' : mood === 'speaking' ? 'animate-arm-sway' : ''
              }`}
            >
              {/* Shoulder Pauldron */}
              <div className="w-5 h-4 rounded-t-lg bg-gradient-to-b from-red-500 to-red-700 border border-yellow-400 shadow-md" />
              {/* Sky-Blue Bicep */}
              <div className="w-3 h-5 bg-gradient-to-b from-cyan-400 to-sky-600 border-x border-cyan-300 shadow-inner" />
              {/* Heroic Gauntlet with Power Ring Sparkle */}
              <div className="w-4 h-5 rounded-b-md bg-gradient-to-b from-red-600 to-red-800 border border-yellow-400 shadow-md flex items-center justify-center relative">
                <div className="w-2 h-2 rounded-full bg-emerald-300 shadow-[0_0_10px_#10b981] animate-ping" />
                {isHovered && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full border border-yellow-300 animate-spin" />
                )}
              </div>
            </div>

            {/* --- 5. GOLDEN HERO BELT & DUAL ELEMENTAL THRUSTER PODS --- */}
            {/* Golden Belt */}
            <div className="w-16 h-2 rounded-md bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 border border-yellow-200 shadow-md z-15 mt-0.5 flex items-center justify-center">
              <div className="w-3 h-1.5 rounded-sm bg-red-600 border border-yellow-200" />
            </div>

            {/* Dual Thruster Pods (Sky-Blue Legs / Jet Flames) */}
            <div className="relative w-16 h-8 flex items-start justify-between px-2 mt-0.5 z-10">
              {/* Left Thruster Pod */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-b-xl bg-gradient-to-b from-sky-600 via-sky-700 to-slate-900 border border-cyan-300 shadow-md" />
                <div className="w-3.5 h-3 rounded-b-full bg-gradient-to-b from-emerald-400 to-cyan-400 blur-[1px] shadow-[0_0_14px_#10b981] animate-thruster-flame" />
              </div>

              {/* Right Thruster Pod */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-b-xl bg-gradient-to-b from-sky-600 via-sky-700 to-slate-900 border border-cyan-300 shadow-md" />
                <div className="w-3.5 h-3 rounded-b-full bg-gradient-to-b from-emerald-400 to-cyan-400 blur-[1px] shadow-[0_0_14px_#10b981] animate-thruster-flame" />
              </div>
            </div>
          </div>
        )}
      </button>

      {/* Heroic Captain Planet Hover Tooltip */}
      {!isOpen && isHovered && (
        <div className="absolute bottom-full right-0 mb-3 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
          <div className="bg-slate-950/95 backdrop-blur-md border border-emerald-400/60 text-emerald-200 text-xs px-3.5 py-2 rounded-2xl shadow-2xl shadow-emerald-950/80 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-bold tracking-wide">Robi • Captain Planet AI</span>
            <span className="text-[10px] text-yellow-300 font-mono">„The Power is Yours!”</span>
          </div>
        </div>
      )}
    </div>
  );
}
