"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Truck, Wrench, ShieldAlert, PackageCheck, CircleDot,
  Droplets, FileText, BarChart3, Settings, Clock
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Dashboard Principal', href: '/', icon: LayoutDashboard },
    { name: 'Vehicule & Flotă', href: '/fisa-tehnica', icon: Truck },
    { name: 'Comenzi de Lucru', href: '/comenzi-lucru', icon: Wrench },
    { name: 'Profiluri Mentenanță', href: '/mentenanta', icon: Clock },
    { name: 'Gestiune Stoc & Garanții', href: '/stocuri', icon: PackageCheck },
    { name: 'Anvelope & Axe', href: '/anvelope', icon: CircleDot },
    { name: 'Gestiune Uleiuri & Fluide', href: '/fluide', icon: Droplets },
    { name: 'Alerte Active', href: '/alerte', icon: ShieldAlert },
    { name: 'Rapoarte & Analitică', href: '/rapoarte', icon: BarChart3 },
  ];

  return (
    <aside className="w-64 bg-white border-r border-morning-200 flex flex-col h-screen sticky top-0 z-40 shadow-sm">
      {/* Antet Brand */}
      <div className="p-5 border-b border-morning-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-sapphire-500 flex items-center justify-center shadow-md shadow-sapphire-500/20">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-base text-sapphire-900 tracking-tight flex items-center">
              Fleet<span className="text-sapphire-500">CMD</span>
            </h1>
            <p className="text-[10px] text-sage-700 font-semibold uppercase tracking-wider">CMMS & FMS Enterprise RO</p>
          </div>
        </div>
      </div>

      {/* Navigație Principală */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
                  : 'text-slate-600 hover:bg-morning-100 hover:text-sapphire-900'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-sage-500'}`} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Subsol & Setări */}
      <div className="p-3 border-t border-morning-200 space-y-2">
        <Link
          href="/setari"
          className={`flex items-center space-x-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
            pathname === '/setari' ? 'bg-sapphire-500 text-white' : 'text-slate-600 hover:bg-morning-100'
          }`}
        >
          <Settings className="w-4 h-4 text-sage-500" />
          <span>Setări Sistem</span>
        </Link>

        <div className="px-3 py-1.5 bg-morning-100 rounded-xl text-[10px] text-sage-700 text-center font-medium">
          <p className="font-bold text-sapphire-900">Sapphire Ash Morning</p>
          <p className="text-slate-400">v2.5 Enterprise 100% Română</p>
        </div>
      </div>
    </aside>
  );
}
