"use client";

import { Bell, ShieldAlert, User, Search } from 'lucide-react';

export default function Navbar() {
  return (
    <header className="h-16 border-b border-morning-200 bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <div className="flex items-center space-x-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
          <input
            type="text"
            placeholder="Căutare utilaj, serie VIN, anvelopă sau serie piesă..."
            className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 placeholder-sage-500 focus:outline-none focus:border-sapphire-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 bg-roseash-100 border border-roseash-300 text-terracotta-500 px-3 py-1 rounded-full text-xs font-semibold">
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Monitorizare Scurgeri: Activă</span>
        </div>

        <button className="relative p-2 text-sage-500 hover:text-sapphire-900 rounded-lg hover:bg-morning-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-terracotta-500 rounded-full animate-ping"></span>
          <span className="absolute top-1 right-1 w-2 h-2 bg-terracotta-500 rounded-full"></span>
        </button>

        <div className="h-6 w-px bg-morning-200"></div>

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-periwinkle-100 border border-periwinkle-300 flex items-center justify-center text-sapphire-500 font-bold">
            <User className="w-4 h-4" />
          </div>
          <div className="text-xs">
            <p className="font-bold text-sapphire-900">Ing. Mihai Popa</p>
            <p className="text-sage-700 font-medium">Șef Flotă & Atelier</p>
          </div>
        </div>
      </div>
    </header>
  );
}
