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
      setTimeout(() => setBlink(false), 200);
    }, 3800 + Math.random() * 3000);
    return () => clearInterval(interval);
  }, [mood]);

  // Mood color schemes
  const getColors = () => {
    switch (mood) {
      case 'alert':
        return {
          glow: 'rgba(239, 68, 68, 0.75)',
          neon: '#ef4444',
          accentBg: 'bg-red-500',
          textColor: 'text-red-400',
          ring: 'border-red-500/60',
        };
      case 'analyzing':
        return {
          glow: 'rgba(245, 158, 11, 0.75)',
          neon: '#f59e0b',
          accentBg: 'bg-amber-400',
          textColor: 'text-amber-300',
          ring: 'border-amber-400/60',
        };
      case 'thinking':
        return {
          glow: 'rgba(168, 85, 247, 0.75)',
          neon: '#a855f7',
          accentBg: 'bg-purple-400',
          textColor: 'text-purple-300',
          ring: 'border-purple-400/60',
        };
      case 'happy':
        return {
          glow: 'rgba(16, 185, 129, 0.75)',
          neon: '#10b981',
          accentBg: 'bg-emerald-400',
          textColor: 'text-emerald-300',
          ring: 'border-emerald-400/60',
        };
      case 'bored':
        return {
          glow: 'rgba(100, 116, 139, 0.4)',
          neon: '#94a3b8',
          accentBg: 'bg-slate-400',
          textColor: 'text-slate-400',
          ring: 'border-slate-500/40',
        };
      case 'speaking':
      case 'idle':
      default:
        return {
          glow: 'rgba(6, 182, 212, 0.8)',
          neon: '#06b6d4',
          accentBg: 'bg-cyan-400',
          textColor: 'text-cyan-300',
          ring: 'border-cyan-400/60',
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
          className="absolute -inset-10 rounded-full pointer-events-none z-0 animate-shockwave border-2 border-cyan-400/90 shadow-[0_0_30px_#22d3ee]"
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

      {/* Main Trigger Button */}
      <button
        type="button"
        onClick={onToggle}
        aria-label="Transformers Robi átalakítása"
        className={`group relative flex items-center justify-center transition-all duration-700 ease-spring focus:outline-none ${
          isOpen ? 'w-36 h-48' : 'w-20 h-20'
        } ${mood === 'bored' ? 'animate-robot-bored' : 'animate-robot-float'}`}
        style={{
          filter: `drop-shadow(0 10px 30px ${c.glow})`,
        }}
      >
        {/* ========================================================= */}
        {/* STATE 1: HIGH-TECH METALLIC SPHERE (Closed)              */}
        {/* ========================================================= */}
        {!isOpen && (
          <div className="relative w-20 h-20 flex items-center justify-center transition-transform duration-500 transform group-hover:scale-110">
            {/* Outer Gyro Ring 1 */}
            <div
              className={`absolute inset-0 rounded-full border border-cyan-400/40 pointer-events-none animate-gyro-spin ${
                isHovered ? 'border-cyan-300 border-dashed' : ''
              }`}
            />
            {/* Outer Gyro Ring 2 (Counter) */}
            <div
              className={`absolute inset-1 rounded-full border border-indigo-400/30 pointer-events-none animate-gyro-reverse ${
                isHovered ? 'border-indigo-300' : ''
              }`}
            />

            {/* Glowing Ambient Atmospheric Halo */}
            <div className="absolute -inset-3 rounded-full bg-cyan-500/20 blur-md -z-10 group-hover:bg-cyan-400/35 transition-all duration-300" />

            {/* Layered Titanium Sphere Carapace */}
            <div
              className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-inner overflow-hidden border border-white/30"
              style={{
                background:
                  'radial-gradient(circle at 35% 30%, #475569 0%, #1e293b 45%, #090d16 90%)',
                boxShadow:
                  'inset 2px 2px 6px rgba(255,255,255,0.4), inset -4px -4px 8px rgba(0,0,0,0.85), 0 12px 28px rgba(0,0,0,0.7)',
              }}
            >
              {/* Transformers Seam Lines (Glow on hover) */}
              <div
                className={`absolute inset-0 border-2 border-transparent transition-colors duration-300 rounded-full ${
                  isHovered ? 'border-cyan-400/50' : 'border-slate-600/30'
                }`}
              />
              <div className="absolute w-full h-[1px] bg-cyan-400/30 transform rotate-45 pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-cyan-400/30 transform -rotate-45 pointer-events-none" />

              {/* Specular Chrome Highlight */}
              <div className="absolute top-1 left-2 w-9 h-4 rounded-full bg-gradient-to-b from-white/45 to-transparent blur-[1px] transform -rotate-25 pointer-events-none" />

              {/* Central Core Lens / Transformers Spark */}
              <div
                className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  mood === 'alert'
                    ? 'bg-red-950 border border-red-500/70'
                    : mood === 'thinking'
                    ? 'bg-purple-950 border border-purple-500/70'
                    : 'bg-cyan-950 border border-cyan-400/70'
                }`}
                style={{
                  boxShadow: `0 0 16px ${c.glow}, inset 0 0 10px ${c.glow}`,
                }}
              >
                {/* Glowing Core Pupil / Spark */}
                <div
                  className={`rounded-full transition-all duration-300 ${
                    blink ? 'h-0.5 w-6' : 'w-4 h-4'
                  } ${c.accentBg} shadow-lg`}
                  style={{
                    boxShadow: `0 0 12px ${c.glow}`,
                  }}
                />

                {/* Rotating Cyber Reticle */}
                <div
                  className="absolute inset-0 rounded-full border border-dashed border-white/30 pointer-events-none animate-spin"
                  style={{ animationDuration: '18s' }}
                />
              </div>

              {/* Apex LED beacon */}
              <div className="absolute top-1.5 right-2 w-1.5 h-1.5 rounded-full bg-cyan-300 animate-ping opacity-80" />
            </div>

            {/* Notification Badge */}
            {unreadCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-600 text-white font-mono text-[10px] font-black flex items-center justify-center ring-2 ring-slate-950 shadow-xl animate-bounce">
                {unreadCount > 9 ? '!' : unreadCount}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* STATE 2: FULL TRANSFORMERS ROBOT (Transformed)            */}
        {/* ========================================================= */}
        {isOpen && (
          <div className="relative w-36 h-48 flex flex-col items-center justify-start transition-all duration-700 ease-out transform scale-100">
            {/* --- 1. BACK TRANSFORMER WINGS / EXHAUST COWLS --- */}
            <div className="absolute top-8 -left-4 w-6 h-16 rounded-tl-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 border-l border-t border-cyan-400/40 shadow-xl transform -rotate-12 flex flex-col items-center justify-around py-2 z-0">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <div className="w-1 h-6 bg-slate-950/80 rounded-full" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            </div>
            <div className="absolute top-8 -right-4 w-6 h-16 rounded-tr-2xl bg-gradient-to-bl from-slate-700 via-slate-800 to-slate-900 border-r border-t border-cyan-400/40 shadow-xl transform rotate-12 flex flex-col items-center justify-around py-2 z-0">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <div className="w-1 h-6 bg-slate-950/80 rounded-full" />
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            </div>

            {/* --- 2. TRANSFORMERS MECHA HEAD & HELMET --- */}
            <div className="relative z-30 flex flex-col items-center">
              {/* Helmet Crest / Antenna (Optimus Style) */}
              <div className="w-4 h-3 bg-gradient-to-t from-slate-700 to-cyan-400 rounded-t-sm shadow-[0_0_8px_#22d3ee] flex items-center justify-center">
                <div className="w-1 h-2 bg-white/90 rounded-full animate-ping" />
              </div>

              {/* Face Helm Chassis */}
              <div
                className="relative w-22 h-14 rounded-2xl bg-gradient-to-b from-slate-700 via-slate-800 to-slate-950 border border-slate-600/90 shadow-2xl p-1.5 flex flex-col items-center justify-center"
                style={{
                  boxShadow: `0 6px 20px rgba(0,0,0,0.8), 0 0 15px ${c.glow}`,
                }}
              >
                {/* Side Ear Antennas */}
                <div className="absolute -left-2 top-2 w-2 h-7 bg-gradient-to-r from-slate-900 to-slate-700 border-y border-l border-cyan-500/50 rounded-l-md" />
                <div className="absolute -right-2 top-2 w-2 h-7 bg-gradient-to-l from-slate-900 to-slate-700 border-y border-r border-cyan-500/50 rounded-r-md" />

                {/* OLED Visor Screen */}
                <div className="relative w-full h-8 rounded-lg bg-black/95 border border-white/15 shadow-inner flex items-center justify-center px-1 overflow-hidden">
                  {/* Subtle Scanline Texture */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-25"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(0deg, transparent, transparent 1px, rgba(255,255,255,0.1) 1px, rgba(255,255,255,0.1) 2px)',
                    }}
                  />

                  {/* Thinking Laser Scan */}
                  {(mood === 'thinking' || mood === 'analyzing') && (
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_8px_#22d3ee] animate-scan-laser pointer-events-none" />
                  )}

                  {/* === ROBI OLED VISOR EXPRESSIONS === */}
                  {/* Thinking: Dual neural wave */}
                  {mood === 'thinking' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_8px_#c084fc]" />
                      <div className="w-4 h-1.5 rounded-full bg-purple-300 shadow-[0_0_8px_#c084fc] animate-pulse" />
                      <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-ping shadow-[0_0_8px_#c084fc]" />
                    </div>
                  )}

                  {/* Analyzing: Matrix Data stream */}
                  {mood === 'analyzing' && (
                    <div className="flex items-center space-x-1 font-mono text-[9px] font-black text-amber-300 tracking-tighter">
                      <span className="animate-pulse">01</span>
                      <span className="w-2 h-3 bg-amber-400/90 rounded-sm shadow-[0_0_6px_#fbbf24]" />
                      <span className="animate-pulse">X8</span>
                    </div>
                  )}

                  {/* Alert: Warning Angled Visor */}
                  {mood === 'alert' && (
                    <div className="flex items-center space-x-2">
                      <div className="w-3.5 h-2 bg-red-500 rounded-sm transform -rotate-12 shadow-[0_0_10px_#ef4444] animate-pulse" />
                      <span className="text-red-400 font-black text-xs animate-ping">!</span>
                      <div className="w-3.5 h-2 bg-red-500 rounded-sm transform rotate-12 shadow-[0_0_10px_#ef4444] animate-pulse" />
                    </div>
                  )}

                  {/* Bored: Sleepy heavy droop */}
                  {mood === 'bored' && (
                    <div className="flex items-center space-x-3 opacity-70">
                      <div className="w-3.5 h-1 bg-slate-400 rounded-full transform rotate-6" />
                      <div className="w-3.5 h-1 bg-slate-400 rounded-full transform -rotate-6" />
                    </div>
                  )}

                  {/* Happy: Joyful curved eyes ^ ^ */}
                  {mood === 'happy' && (
                    <div className="flex items-center space-x-3 text-emerald-400 font-black text-base leading-none drop-shadow-[0_0_8px_#34d399]">
                      <span className="transform -scale-y-100">◡</span>
                      <span className="transform -scale-y-100">◡</span>
                    </div>
                  )}

                  {/* Speaking: Equalizer soundwaves */}
                  {mood === 'speaking' && (
                    <div className="flex items-center space-x-1">
                      <div className="w-1 bg-cyan-400 rounded-full animate-soundwave-1 shadow-[0_0_6px_#22d3ee]" />
                      <div className="w-1 bg-cyan-300 rounded-full animate-soundwave-2 shadow-[0_0_6px_#22d3ee]" />
                      <div className="w-1 bg-cyan-400 rounded-full animate-soundwave-3 shadow-[0_0_6px_#22d3ee]" />
                      <div className="w-1 bg-cyan-300 rounded-full animate-soundwave-4 shadow-[0_0_6px_#22d3ee]" />
                      <div className="w-1 bg-cyan-400 rounded-full animate-soundwave-5 shadow-[0_0_6px_#22d3ee]" />
                    </div>
                  )}

                  {/* Idle: Glowing cyan twin eyes */}
                  {mood === 'idle' && (
                    <div className="flex items-center space-x-2.5">
                      <div
                        className={`bg-cyan-300 rounded-full transition-all duration-150 ${
                          blink ? 'w-3 h-0.5' : 'w-3.5 h-2.5'
                        }`}
                        style={{
                          boxShadow: '0 0 10px #22d3ee, 0 0 18px rgba(34,211,238,0.7)',
                        }}
                      />
                      <div
                        className={`bg-cyan-300 rounded-full transition-all duration-150 ${
                          blink ? 'w-3 h-0.5' : 'w-3.5 h-2.5'
                        }`}
                        style={{
                          boxShadow: '0 0 10px #22d3ee, 0 0 18px rgba(34,211,238,0.7)',
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Mouth speaker grill */}
                <div className="mt-1 flex items-center space-x-1 opacity-70">
                  <div className="w-1.5 h-0.5 rounded-full bg-slate-500" />
                  <div className="w-3 h-0.5 rounded-full bg-cyan-400 shadow-[0_0_4px_#22d3ee]" />
                  <div className="w-1.5 h-0.5 rounded-full bg-slate-500" />
                </div>
              </div>
            </div>

            {/* --- 3. MECHA TORSO & CHEST ARC REACTOR --- */}
            <div className="relative w-24 h-16 mt-0.5 flex flex-col items-center justify-center z-20">
              {/* Upper Chest Cowl */}
              <div className="w-20 h-5 bg-gradient-to-b from-slate-700 to-slate-800 border-x border-t border-slate-600 rounded-t-lg flex items-center justify-between px-2">
                <div className="w-2 h-1 bg-cyan-400/80 rounded-sm" />
                <div className="w-6 h-1 bg-slate-900 rounded-full" />
                <div className="w-2 h-1 bg-cyan-400/80 rounded-sm" />
              </div>

              {/* Center Chest Plate with Glowing Arc Spark Core */}
              <div className="w-24 h-11 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 border border-slate-700/80 rounded-b-xl shadow-xl flex items-center justify-center relative overflow-hidden">
                {/* Gold hazard stripe accents */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_6px_#22d3ee]" />

                {/* Glowing Arc Reactor Core */}
                <div
                  className="w-7 h-7 rounded-full bg-slate-950 border-2 border-cyan-400/80 flex items-center justify-center animate-arc-reactor"
                  style={{
                    borderColor: c.neon,
                    boxShadow: `0 0 14px ${c.glow}, inset 0 0 10px ${c.glow}`,
                  }}
                >
                  <div
                    className="w-3.5 h-3.5 rounded-full bg-white shadow-inner animate-pulse"
                    style={{
                      boxShadow: `0 0 10px ${c.neon}`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* --- 4. ARTICULATED ROBOTIC ARMS & FOREARMS --- */}
            {/* Left Arm */}
            <div
              className={`absolute left-0 top-18 w-5 h-16 flex flex-col items-center z-15 ${
                mood === 'speaking' ? 'animate-arm-sway' : ''
              }`}
            >
              {/* Shoulder Pauldron */}
              <div className="w-5 h-5 rounded-tl-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 shadow-md flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
              </div>
              {/* Bicep Piston */}
              <div className="w-2.5 h-6 bg-slate-800 border-x border-slate-700" />
              {/* Forearm & Repulsor Hand */}
              <div className="w-4 h-6 rounded-b-md bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-md flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              </div>
            </div>

            {/* Right Arm */}
            <div
              className={`absolute right-0 top-18 w-5 h-16 flex flex-col items-center z-15 ${
                mood === 'speaking' ? 'animate-arm-sway' : ''
              }`}
            >
              {/* Shoulder Pauldron */}
              <div className="w-5 h-5 rounded-tr-xl bg-gradient-to-bl from-slate-700 to-slate-900 border border-slate-600 shadow-md flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
              </div>
              {/* Bicep Piston */}
              <div className="w-2.5 h-6 bg-slate-800 border-x border-slate-700" />
              {/* Forearm & Repulsor Hand */}
              <div className="w-4 h-6 rounded-b-md bg-gradient-to-b from-slate-800 to-slate-900 border border-slate-700 shadow-md flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              </div>
            </div>

            {/* --- 5. ROBOTIC LEGS & DUAL JET THRUSTER PODS --- */}
            <div className="relative w-16 h-10 flex items-start justify-between px-1 mt-0.5 z-10">
              {/* Left Jet Leg */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-6 rounded-b-lg bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700 shadow-lg flex items-center justify-center">
                  <div className="w-2.5 h-1 rounded-full bg-slate-600" />
                </div>
                {/* Ion Thruster Flame */}
                <div className="w-3.5 bg-gradient-to-b from-white via-cyan-400 to-transparent rounded-b-full animate-thruster-flame shadow-[0_0_14px_#22d3ee]" />
              </div>

              {/* Right Jet Leg */}
              <div className="flex flex-col items-center">
                <div className="w-5 h-6 rounded-b-lg bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700 shadow-lg flex items-center justify-center">
                  <div className="w-2.5 h-1 rounded-full bg-slate-600" />
                </div>
                {/* Ion Thruster Flame */}
                <div className="w-3.5 bg-gradient-to-b from-white via-cyan-400 to-transparent rounded-b-full animate-thruster-flame shadow-[0_0_14px_#22d3ee]" />
              </div>
            </div>
          </div>
        )}
      </button>

      {/* Futuristic Hover Tooltip */}
      {!isOpen && isHovered && (
        <div className="absolute bottom-full right-0 mb-3 pointer-events-none transition-all duration-200 z-50 whitespace-nowrap">
          <div className="bg-slate-950/95 backdrop-blur-md border border-cyan-500/50 text-cyan-200 text-xs px-3 py-1.5 rounded-xl shadow-2xl shadow-cyan-950/60 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span className="font-bold tracking-wide">Robi Transformers Robot</span>
            <span className="text-[10px] text-slate-400">Kattints az átalakuláshoz!</span>
          </div>
        </div>
      )}
    </div>
  );
}
