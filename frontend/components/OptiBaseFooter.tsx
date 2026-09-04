"use client";

import React from 'react';

export function OptiBaseLogo({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M16 2L2 10V22L16 30L30 22V10L16 2Z"
        fill="url(#optibase-grad-1)"
        fillOpacity="0.25"
        stroke="url(#optibase-grad-1)"
        strokeWidth="2"
      />
      <path
        d="M16 8L6.5 13.5V18.5L16 24L25.5 18.5V13.5L16 8Z"
        fill="url(#optibase-grad-2)"
        opacity="0.95"
      />
      <circle cx="16" cy="16" r="3" fill="#ffffff" />
      <defs>
        <linearGradient id="optibase-grad-1" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id="optibase-grad-2" x1="32" y1="0" x2="0" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10b981" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

interface OptiBaseFooterProps {
  variant?: 'light' | 'dark' | 'sidebar';
}

export default function OptiBaseFooter({ variant = 'light' }: OptiBaseFooterProps) {
  if (variant === 'dark') {
    return (
      <footer className="w-full py-4 text-center select-none">
        <a
          href="https://optibase.ro/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2.5 px-4 py-2 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 hover:border-cyan-500/50 text-slate-300 hover:text-white transition-all duration-200 group shadow-xl shadow-black/30 backdrop-blur-md"
        >
          <span className="p-1 rounded-lg bg-slate-950 border border-slate-800 shadow-inner group-hover:scale-110 transition-transform">
            <OptiBaseLogo className="w-4 h-4" />
          </span>
          <span className="text-xs font-semibold tracking-wide">
            Created by <span className="font-black bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent group-hover:underline">OptiBase™</span>
          </span>
        </a>
      </footer>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="pt-1">
        <a
          href="https://optibase.ro/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center space-x-2 px-3 py-2 rounded-xl bg-morning-100 hover:bg-white border border-morning-200 hover:border-sapphire-300 text-slate-600 hover:text-sapphire-900 transition-all duration-200 group shadow-xs"
        >
          <span className="p-0.5 rounded bg-slate-900 shadow-xs group-hover:scale-105 transition-transform">
            <OptiBaseLogo className="w-3.5 h-3.5" />
          </span>
          <span className="text-[11px] font-semibold text-slate-600">
            Created by <span className="font-bold text-sapphire-700 group-hover:text-sapphire-900">OptiBase™</span>
          </span>
        </a>
      </div>
    );
  }

  // Default: variant === 'light' for main AppShell layout
  return (
    <footer className="border-t border-morning-200/80 bg-white/80 backdrop-blur-md px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
      <div className="flex items-center space-x-2">
        <span className="font-black tracking-tight text-sapphire-950">FleetCMD</span>
        <span className="text-slate-300">•</span>
        <span className="text-slate-500 font-medium">Enterprise FMS &amp; CMMS Platform</span>
      </div>

      <div>
        <a
          href="https://optibase.ro/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-morning-100 hover:bg-white border border-morning-300/80 hover:border-sapphire-400/60 text-slate-600 hover:text-sapphire-900 transition-all duration-200 group shadow-xs"
        >
          <span className="p-1 rounded-md bg-slate-900 shadow-xs group-hover:scale-110 transition-transform">
            <OptiBaseLogo className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold">
            Created by <span className="font-extrabold text-sapphire-700 group-hover:text-sapphire-900">OptiBase™</span>
          </span>
        </a>
      </div>
    </footer>
  );
}
