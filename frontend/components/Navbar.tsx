"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bell, ShieldAlert, User, Search, Wrench, Truck } from 'lucide-react';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const [numAlerte, setNumAlerte] = useState(0);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const resAlerte = await fetch('http://localhost:3001/anomalii/alerte');
        if (resAlerte.ok) {
          const alerte = await resAlerte.json();
          setNumAlerte(alerte.length);
        }

        const resVeh = await fetch('http://localhost:3001/vehicule');
        if (resVeh.ok) {
          setVehicule(await resVeh.json());
        }
      } catch (e) {
        console.log(e);
      }
    };
    fetchData();
  }, []);

  const searchResults = searchQuery.trim()
    ? vehicule.filter(
        (v) =>
          v.numarIntern.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.numarInmatriculare.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.marca.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.model.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  return (
    <header className="h-16 border-b border-morning-200 bg-white/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* CĂUTARE GLOBALĂ CU AUTO-SUGESTII LIVE */}
      <div className="relative w-full max-w-md">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            onFocus={() => setIsSearchOpen(true)}
            placeholder="Căutare utilaj (ex: CAM-03, UTIL-01, VOLVO)..."
            className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-sapphire-900 placeholder-sage-500 focus:outline-none focus:border-sapphire-500 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setIsSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sage-400 hover:text-sapphire-900 font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* POPUP REZULTATE CĂUTARE */}
        {isSearchOpen && searchResults.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-morning-200 rounded-2xl shadow-xl p-2 z-50 max-h-72 overflow-y-auto space-y-1">
            {searchResults.map((v) => (
              <Link
                key={v.id}
                href={`/fisa-tehnica?id=${v.id}`}
                onClick={() => setIsSearchOpen(false)}
                className="flex items-center justify-between p-2.5 hover:bg-morning-100 rounded-xl transition text-xs"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 bg-sapphire-50 text-sapphire-600 rounded-lg">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-extrabold text-sapphire-900">{v.numarIntern} ({v.numarInmatriculare})</p>
                    <p className="text-[10px] text-sage-600 font-medium">{v.marca} {v.model} • {v.categorieEnum}</p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold text-sapphire-700 bg-morning-200 px-2 py-0.5 rounded">
                  {v.valoareContorCurent} {v.tipMasurare}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* DREAPTA: STATUS ALERTE & PROFIL USER */}
      <div className="flex items-center space-x-4">
        <Link
          href="/alerte"
          className="flex items-center space-x-2 bg-roseash-100 hover:bg-roseash-200 border border-roseash-300 text-terracotta-700 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-2xs"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-terracotta-600 animate-pulse" />
          <span>Monitorizare: {numAlerte > 0 ? `${numAlerte} Alerte Active` : 'Flotă Optimă'}</span>
        </Link>

        <Link
          href="/alerte"
          className="relative p-2 text-sage-600 hover:text-sapphire-900 rounded-xl hover:bg-morning-100 transition"
        >
          <Bell className="w-5 h-5" />
          {numAlerte > 0 && (
            <>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-terracotta-500 rounded-full animate-ping"></span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-terracotta-500 rounded-full"></span>
            </>
          )}
        </Link>

        <div className="h-5 w-px bg-morning-200"></div>

        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-sapphire-500 text-white flex items-center justify-center font-extrabold text-xs shadow-sm">
            MP
          </div>
          <div className="text-xs">
            <p className="font-extrabold text-sapphire-900 leading-tight">Ing. Mihai Popa</p>
            <p className="text-[10px] text-sage-600 font-semibold">Șef Flotă & Atelier</p>
          </div>
        </div>
      </div>
    </header>
  );
}
