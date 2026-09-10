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
        className={`group relative flex items-center justify-center transition-all duration-500 ease-out focus:outline-none ${
          isOpen ? 'w-36 h-56 sm:w-44 sm:h-68' : 'w-20 h-20'
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
        {/* STATE 2: HUMANOID ARMORED MUSCULAR CAPTAIN PLANET ROBOT   */}
        {/* ========================================================= */}
        {isOpen && (
          <div className="relative w-full h-full flex items-center justify-center transition-all duration-700 ease-out transform scale-100">
            <svg
              viewBox="0 0 200 320"
              className="w-full h-full overflow-visible transition-transform duration-300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Metallic Sky-Blue / Cyan Chassis Gradient */}
                <linearGradient id="chassisCyan" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#bae6fd" />
                  <stop offset="30%" stopColor="#38bdf8" />
                  <stop offset="70%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#082f49" />
                </linearGradient>

                {/* Crimson Red Armor Gradient with Specular Sheen */}
                <linearGradient id="armorRed" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fca5a5" />
                  <stop offset="25%" stopColor="#ef4444" />
                  <stop offset="65%" stopColor="#b91c1c" />
                  <stop offset="100%" stopColor="#7f1d1d" />
                </linearGradient>

                {/* Gold Hero Trim Gradient */}
                <linearGradient id="trimGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#fef08a" />
                  <stop offset="40%" stopColor="#facc15" />
                  <stop offset="80%" stopColor="#ca8a04" />
                  <stop offset="100%" stopColor="#713f12" />
                </linearGradient>

                {/* Modern Aerodynamic Emerald Energy Crest Gradient */}
                <linearGradient id="modernCrestGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#047857" />
                  <stop offset="40%" stopColor="#10b981" />
                  <stop offset="75%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#a7f3d0" />
                </linearGradient>

                {/* Abdominal 6-Pack Plates Gradient */}
                <linearGradient id="absGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="50%" stopColor="#0284c7" />
                  <stop offset="100%" stopColor="#0c4a6e" />
                </linearGradient>

                {/* Power Fist Flame Gradient (Hover State) */}
                <radialGradient id="fistFlame" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="30%" stopColor="#fef08a" />
                  <stop offset="60%" stopColor="#f59e0b" />
                  <stop offset="90%" stopColor="#ef4444" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
                </radialGradient>

                {/* Thruster Flame Gradient */}
                <linearGradient id="thrusterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="25%" stopColor="#67e8f9" />
                  <stop offset="65%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0" />
                </linearGradient>

                {/* Glow Filter */}
                <filter id="heroGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 1. JET THRUSTERS / PLASMA EXHAUST (UNDER FEET) */}
              <g className="animate-thruster-flame opacity-90">
                <polygon points="76,288 84,288 80,314" fill="url(#thrusterGrad)" filter="url(#heroGlow)" />
                <polygon points="116,288 124,288 120,314" fill="url(#thrusterGrad)" filter="url(#heroGlow)" />
                <circle cx="80" cy="289" r="3" fill="#ffffff" />
                <circle cx="120" cy="289" r="3" fill="#ffffff" />
              </g>

              {/* 2. MUSCULAR LEGS & ARMORED BOOTS */}
              {/* Left Leg */}
              <g>
                <path d="M 76,204 L 88,204 L 90,240 L 72,240 Z" fill="url(#chassisCyan)" stroke="#0284c7" strokeWidth="1" />
                <path d="M 68,206 L 76,206 L 73,238 L 65,236 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="0.8" />
                <polygon points="69,238 88,238 85,250 72,250" fill="url(#trimGold)" stroke="#713f12" strokeWidth="0.8" />
                <circle cx="78.5" cy="244" r="2.5" fill="#0284c7" />
                <path d="M 70,250 L 87,250 L 85,278 L 74,278 Z" fill="url(#chassisCyan)" stroke="#0284c7" strokeWidth="1" />
                <path d="M 68,278 L 88,278 L 91,288 L 66,288 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1" />
              </g>

              {/* Right Leg */}
              <g>
                <path d="M 112,204 L 124,204 L 128,240 L 110,240 Z" fill="url(#chassisCyan)" stroke="#0284c7" strokeWidth="1" />
                <path d="M 124,206 L 132,206 L 135,236 L 127,238 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="0.8" />
                <polygon points="112,238 131,238 128,250 115,250" fill="url(#trimGold)" stroke="#713f12" strokeWidth="0.8" />
                <circle cx="121.5" cy="244" r="2.5" fill="#0284c7" />
                <path d="M 113,250 L 130,250 L 126,278 L 115,278 Z" fill="url(#chassisCyan)" stroke="#0284c7" strokeWidth="1" />
                <path d="M 112,278 L 132,278 L 134,288 L 109,288 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1" />
              </g>

              {/* Pelvic Armor Plate */}
              <polygon points="86,204 114,204 107,222 93,222" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1" />
              <circle cx="100" cy="212" r="3" fill="#38bdf8" />

              {/* 3. GOLDEN HERO UTILITY BELT */}
              <rect x="74" y="196" width="52" height="9" rx="2" fill="url(#trimGold)" stroke="#713f12" strokeWidth="1" />
              <rect x="94" y="194.5" width="12" height="12" rx="2" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1.2" />
              <circle cx="100" cy="200.5" r="3" fill="#facc15" />

              {/* 4. CHISELED 6-PACK ABDOMINAL ARMOR (V-TAPER ATHLETIC TORSO) */}
              <path d="M 76,146 L 124,146 L 120,196 L 80,196 Z" fill="#032b43" />
              {/* Oblique Rib Armor Plates */}
              <path d="M 72,152 L 78,150 L 78,162 L 74,166 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="0.6" />
              <path d="M 73,168 L 78,165 L 78,177 L 75,180 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="0.6" />
              <path d="M 128,152 L 122,150 L 122,162 L 126,166 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="0.6" />
              <path d="M 127,168 L 122,165 L 122,177 L 125,180 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="0.6" />

              {/* 6-Pack Individual Sculpted Muscle Plates */}
              <rect x="83" y="150" width="15" height="12" rx="2" fill="url(#absGrad)" stroke="#38bdf8" strokeWidth="0.8" />
              <rect x="102" y="150" width="15" height="12" rx="2" fill="url(#absGrad)" stroke="#38bdf8" strokeWidth="0.8" />
              <rect x="84" y="165" width="14" height="12" rx="2" fill="url(#absGrad)" stroke="#38bdf8" strokeWidth="0.8" />
              <rect x="102" y="165" width="14" height="12" rx="2" fill="url(#absGrad)" stroke="#38bdf8" strokeWidth="0.8" />
              <polygon points="85,180 98,180 96,192 87,192" fill="url(#absGrad)" stroke="#38bdf8" strokeWidth="0.8" />
              <polygon points="102,180 115,180 113,192 104,192" fill="url(#absGrad)" stroke="#38bdf8" strokeWidth="0.8" />
              {/* Glowing Neon Cyber-Seams */}
              <line x1="100" y1="148" x2="100" y2="194" stroke="#22d3ee" strokeWidth="1" opacity="0.85" />
              <line x1="82" y1="163.5" x2="118" y2="163.5" stroke="#22d3ee" strokeWidth="0.8" opacity="0.6" />
              <line x1="83" y1="178.5" x2="117" y2="178.5" stroke="#22d3ee" strokeWidth="0.8" opacity="0.6" />

              {/* 5. BROAD MUSCULAR SHOULDERS & CURVED PAULDRONS */}
              <polygon points="80,88 100,82 120,88 140,102 60,102" fill="url(#chassisCyan)" />

              {/* Left Pauldron (Broad Shoulder Muscle) */}
              <g>
                <path d="M 28,102 Q 32,84 62,94 L 66,128 Q 36,128 28,102 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1.2" />
                <path d="M 36,92 Q 48,88 60,94" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                <path d="M 27,104 Q 40,132 66,128" fill="none" stroke="url(#trimGold)" strokeWidth="2.5" />
                <path d="M 38,124 L 58,124 L 54,136 L 42,136 Z" fill="url(#chassisCyan)" />
              </g>

              {/* Right Pauldron (Broad Shoulder Muscle) */}
              <g>
                <path d="M 172,102 Q 168,84 138,94 L 134,128 Q 164,128 172,102 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1.2" />
                <path d="M 164,92 Q 152,88 140,94" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
                <path d="M 173,104 Q 160,132 134,128" fill="none" stroke="url(#trimGold)" strokeWidth="2.5" />
                <path d="M 162,124 L 142,124 L 146,136 L 158,136 Z" fill="url(#chassisCyan)" />
              </g>

              {/* 6. SCULPTED PECTORAL CHEST ARMOR & GOLDEN EARTH SOLAR CORE */}
              {/* Left Pectoral Plate */}
              <path d="M 64,102 L 96,102 L 96,146 L 68,144 Q 54,124 64,102 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1.2" />
              <path d="M 68,106 Q 82,104 94,106" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

              {/* Right Pectoral Plate */}
              <path d="M 136,102 L 104,102 L 104,146 L 132,144 Q 146,124 136,102 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1.2" />
              <path d="M 132,106 Q 118,104 106,106" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.5" />

              {/* Golden Sternum Collar Frame */}
              <polygon points="95,96 105,96 107,105 93,105" fill="url(#trimGold)" />

              {/* Central Iconic Earth Globe Solar Medallion */}
              <g transform="translate(100, 126)">
                <circle cx="0" cy="0" r="19" fill="#0a0a0a" stroke="url(#trimGold)" strokeWidth="2.2" filter="url(#heroGlow)" />
                <circle cx="0" cy="0" r="16.5" fill="#0284c7" />

                {/* Rotating Continents (Green) */}
                <g className="animate-planet-spin">
                  <path
                    d="M -7,-10 Q -4,-12 0,-9 Q 4,-6 -2,-3 Q -8,-5 -7,-10 Z
                       M 4,-7 Q 10,-8 11,-2 Q 7,1 3,-2 Z
                       M -8,2 Q -3,0 -1,4 Q -4,9 -8,5 Z
                       M 3,4 Q 8,3 9,8 Q 5,11 2,7 Z"
                    fill="#10b981"
                  />
                  <ellipse cx="0" cy="0" rx="16" ry="6.5" stroke="#fde047" strokeWidth="0.8" strokeDasharray="2 1.5" />
                  <ellipse cx="0" cy="0" rx="6.5" ry="16" stroke="#fde047" strokeWidth="0.8" strokeDasharray="2 1.5" />
                </g>

                {/* Planetary Ring */}
                <ellipse cx="0" cy="0" rx="24" ry="7" stroke="url(#trimGold)" strokeWidth="1.8" fill="none" transform="rotate(-22)" />

                {/* Pulsing Solar Spark */}
                <circle cx="0" cy="0" r="3" fill="#fef08a" className="animate-ping opacity-90" />
                <circle cx="0" cy="0" r="2.5" fill="#ffffff" />
              </g>

              {/* 7. MUSCULAR ARMS & HEROIC POWER FIST */}
              {/* Left Arm (Resting Powerfully on Hip) */}
              <g>
                <path d="M 44,126 Q 32,142 40,166 L 52,164 Q 56,140 50,126 Z" fill="url(#chassisCyan)" stroke="#0284c7" strokeWidth="1" />
                <circle cx="39" cy="166" r="4.5" fill="url(#trimGold)" stroke="#713f12" strokeWidth="0.8" />
                <path d="M 37,168 L 52,168 L 58,198 L 40,198 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1" />
                <rect x="42" y="198" width="16" height="12" rx="4" fill="url(#chassisCyan)" stroke="#facc15" strokeWidth="1" />
              </g>

              {/* Right Arm (Interactive: Normal Stance or Triumphant Raised Fist on Hover) */}
              {isHovered ? (
                <g className="animate-hero-fist">
                  <path d="M 152,120 L 168,104 L 178,114 L 162,130 Z" fill="url(#chassisCyan)" stroke="#0284c7" strokeWidth="1" />
                  <circle cx="174" cy="106" r="5" fill="url(#trimGold)" />
                  <path d="M 172,104 L 164,68 L 178,64 L 186,100 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1" />
                  <circle cx="172" cy="54" r="20" fill="url(#fistFlame)" filter="url(#heroGlow)" className="animate-pulse" />
                  <rect x="163" y="46" width="18" height="16" rx="4" fill="url(#trimGold)" stroke="#ffffff" strokeWidth="1.2" />
                  <line x1="167" y1="52" x2="177" y2="52" stroke="#713f12" strokeWidth="1" />
                  <line x1="167" y1="56" x2="177" y2="56" stroke="#713f12" strokeWidth="1" />
                  <circle cx="176" cy="50" r="3" fill="#10b981" filter="url(#heroGlow)" className="animate-ping" />
                </g>
              ) : (
                <g>
                  <path d="M 156,126 Q 168,142 160,166 L 148,164 Q 144,140 150,126 Z" fill="url(#chassisCyan)" stroke="#0284c7" strokeWidth="1" />
                  <circle cx="161" cy="166" r="4.5" fill="url(#trimGold)" stroke="#713f12" strokeWidth="0.8" />
                  <path d="M 163,168 L 148,168 L 142,198 L 160,198 Z" fill="url(#armorRed)" stroke="#facc15" strokeWidth="1" />
                  <rect x="142" y="198" width="16" height="12" rx="4" fill="url(#chassisCyan)" stroke="#facc15" strokeWidth="1" />
                </g>
              )}

              {/* 8. CHISELED CYBORG NECK & CONDUITS */}
              <path d="M 90,78 L 110,78 L 114,94 L 86,94 Z" fill="#0f172a" stroke="#0284c7" strokeWidth="0.8" />
              <line x1="95" y1="80" x2="95" y2="92" stroke="#38bdf8" strokeWidth="1.2" />
              <line x1="100" y1="80" x2="100" y2="92" stroke="#22d3ee" strokeWidth="1.5" />
              <line x1="105" y1="80" x2="105" y2="92" stroke="#38bdf8" strokeWidth="1.2" />

              {/* 9. CHISELED MECHA SUPERHERO HELMET & JAWLINE */}
              <polygon
                points="82,34 118,34 128,52 124,76 100,88 76,76 72,52"
                fill="url(#chassisCyan)"
                stroke="url(#trimGold)"
                strokeWidth="1.4"
              />
              <polygon points="84,36 116,36 112,46 88,46" fill="url(#armorRed)" stroke="#facc15" strokeWidth="0.8" />

              {/* High-Tech Obsidian Visor Faceplate */}
              <polygon
                points="82,48 118,48 122,64 114,75 100,80 86,75 78,64"
                fill="#020617"
                stroke="#10b981"
                strokeWidth="1.2"
                filter="url(#heroGlow)"
              />

              {/* Visor Eyes Reacting to Mood */}
              {mood === 'alert' ? (
                <g>
                  <line x1="86" y1="62" x2="114" y2="62" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round" filter="url(#heroGlow)" />
                  <circle cx="94" cy="62" r="3" fill="#ffffff" className="animate-ping" />
                  <circle cx="106" cy="62" r="3" fill="#ffffff" className="animate-ping" />
                </g>
              ) : (isHovered || mood === 'happy') ? (
                <g>
                  <path d="M 88,65 Q 94,57 100,65" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" fill="none" filter="url(#heroGlow)" />
                  <path d="M 100,65 Q 106,57 112,65" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" fill="none" filter="url(#heroGlow)" />
                  <circle cx="100" cy="56" r="2" fill="#facc15" />
                </g>
              ) : (mood === 'thinking' || mood === 'analyzing') ? (
                <g>
                  <line x1="84" y1="62" x2="116" y2="62" stroke="#a7f3d0" strokeWidth="2" strokeDasharray="3 2" className="animate-pulse" />
                  <circle cx="100" cy="62" r="3.5" fill="#facc15" className="animate-ping" />
                </g>
              ) : mood === 'speaking' ? (
                <g className="animate-pulse">
                  <line x1="88" y1="62" x2="88" y2="62" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                  <line x1="94" y1="58" x2="94" y2="66" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
                  <line x1="100" y1="55" x2="100" y2="69" stroke="#facc15" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="106" y1="58" x2="106" y2="66" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round" />
                  <line x1="112" y1="62" x2="112" y2="62" stroke="#34d399" strokeWidth="3" strokeLinecap="round" />
                </g>
              ) : (
                <g>
                  <polygon
                    points={blink ? "86,63 98,63 98,65 86,65" : "86,59 98,61 97,67 87,66"}
                    fill="#38bdf8"
                    filter="url(#heroGlow)"
                  />
                  <polygon
                    points={blink ? "102,63 114,63 114,65 102,65" : "102,61 114,59 113,66 103,67"}
                    fill="#38bdf8"
                    filter="url(#heroGlow)"
                  />
                  {!blink && (
                    <>
                      <circle cx="92" cy="63" r="1.5" fill="#ffffff" />
                      <circle cx="108" cy="63" r="1.5" fill="#ffffff" />
                    </>
                  )}
                </g>
              )}

              <polygon points="94,80 106,80 103,87 97,87" fill="url(#trimGold)" />
              <circle cx="73" cy="58" r="4.5" fill="url(#trimGold)" stroke="#713f12" strokeWidth="0.8" />
              <circle cx="73" cy="58" r="2" fill="#10b981" />
              <circle cx="127" cy="58" r="4.5" fill="url(#trimGold)" stroke="#713f12" strokeWidth="0.8" />
              <circle cx="127" cy="58" r="2" fill="#10b981" />

              {/* 10. MODERN AERODYNAMIC EMERALD ENERGY CREST (NOT 80s MULLET!) */}
              <g className="animate-hair-flow">
                <polygon
                  points="96,34 100,0 104,34 100,28"
                  fill="url(#modernCrestGrad)"
                  stroke="#6ee7b7"
                  strokeWidth="1.2"
                  filter="url(#heroGlow)"
                />
                <line x1="100" y1="2" x2="100" y2="30" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
                <polygon
                  points="88,36 80,6 94,32"
                  fill="url(#modernCrestGrad)"
                  stroke="#6ee7b7"
                  strokeWidth="1"
                  filter="url(#heroGlow)"
                />
                <polygon
                  points="112,36 120,6 106,32"
                  fill="url(#modernCrestGrad)"
                  stroke="#6ee7b7"
                  strokeWidth="1"
                  filter="url(#heroGlow)"
                />
                <polygon
                  points="78,42 64,16 86,38"
                  fill="url(#modernCrestGrad)"
                  stroke="#34d399"
                  strokeWidth="1"
                  filter="url(#heroGlow)"
                />
                <polygon
                  points="122,42 136,16 114,38"
                  fill="url(#modernCrestGrad)"
                  stroke="#34d399"
                  strokeWidth="1"
                  filter="url(#heroGlow)"
                />
                <polygon
                  points="72,50 54,28 78,48"
                  fill="url(#modernCrestGrad)"
                  stroke="#10b981"
                  strokeWidth="0.8"
                />
                <polygon
                  points="128,50 146,28 122,48"
                  fill="url(#modernCrestGrad)"
                  stroke="#10b981"
                  strokeWidth="0.8"
                />
                <polygon points="97,36 103,36 100,42" fill="#facc15" filter="url(#heroGlow)" />
              </g>
            </svg>
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
