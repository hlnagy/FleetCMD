"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell, ShieldAlert, User, Search, Wrench, Truck, PackageCheck,
  Droplets, FileText, CheckCircle2, ChevronDown, ChevronRight, X, RefreshCw, Menu,
  Users, Settings, LogOut, Package, Sun, Moon, Sparkles, LayoutDashboard,
  ShoppingCart, History, CircleDot, Building2, ShieldCheck, Clock, Gauge,
  Timer, FileCheck, Link2, BarChart3
} from 'lucide-react';
import { API_BASE_URL } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import { useTheme } from '../lib/ThemeContext';
import { useTabWorkspace } from '../lib/TabWorkspaceContext';

interface NavGroup {
  name: string;
  icon: any;
  items: {
    name: string;
    href: string;
    icon: any;
    desc?: string;
  }[];
}

export default function TopNavigation() {
  const { user, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const { openTab, activeTabId } = useTabWorkspace();

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [vehicule, setVehicule] = useState<any[]>([]);

  // Notifications state
  const [numAlerte, setNumAlerte] = useState(0);
  const [alerteList, setAlerteList] = useState<any[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'TOATE' | 'STOC' | 'MENTENANTA' | 'DOCUMENTE'>('TOATE');

  // User menu state
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Global sync status
  const [globalSyncStatus, setGlobalSyncStatus] = useState<any>(null);

  const navGroups: NavGroup[] = [
    {
      name: 'Facturi & Recepție',
      icon: FileText,
      items: [
        { name: '1. ANAF e-Factura (Import)', href: '/efactura?tab=efactura', icon: FileText, desc: 'Preluare automată din SPV & alocare directă' },
        { name: '2. Recepție Manuală Factură', href: '/efactura?tab=manual', icon: ShoppingCart, desc: 'Introducere NIR / factură de la furnizori' },
        { name: '3. Istoric & Căutare Facturi', href: '/efactura?tab=istoric', icon: History, desc: 'Arhivă facturi importate, sume și articole' },
      ],
    },
    {
      name: 'Comenzi & Mentenanță',
      icon: Wrench,
      items: [
        { name: 'Comenzi de Lucru (Munkalapok)', href: '/comenzi-lucru', icon: Wrench, desc: 'Devize reparații, mecanici, manoperă și consum' },
        { name: 'Profiluri Mentenanță & Planificator', href: '/mentenanta', icon: Clock, desc: 'Intervale revizii km/ore, revizii recurente' },
      ],
    },
    {
      name: 'Vehicule & Flotă',
      icon: Truck,
      items: [
        { name: 'Fișă Tehnică & Flotă', href: '/fisa-tehnica', icon: Truck, desc: 'Parc auto complet, detalii tehnice, axe' },
        { name: 'Actualizare KM (Pompă)', href: '/import-km', icon: Gauge, desc: 'Import contor din alimentări carburant' },
        { name: 'Ore Funcționare (mTH / GPS)', href: '/ore-functionare', icon: Timer, desc: 'Înregistrare orar utilaje grele' },
        { name: 'Valabilitate Acte & Documente', href: '/documente', icon: FileCheck, desc: 'ITP, RCA, CASCO, tahograf, roviniete' },
        { name: 'Cuplare Ansambluri', href: '/ansambluri', icon: Link2, desc: 'Asocieri cap tractor - semiremorcă' },
      ],
    },
    {
      name: 'Gestiune Stoc',
      icon: PackageCheck,
      items: [
        { name: '1. Piese & Consumabile', href: '/stocuri?tab=stoc', icon: PackageCheck, desc: 'Nomenclator articole, stoc curent, FIFO' },
        { name: '2. Magazie Centrală Anvelope (Serii)', href: '/stocuri?tab=anvelope_stoc', icon: CircleDot, desc: 'Anvelope cu serii unice și rulaj' },
        { name: '3. Depozite Flotă & Transferuri', href: '/stocuri?tab=depozite', icon: Building2, desc: 'Ateliere, magazii și mișcări interne' },
        { name: '4. Garanții Componente Serializate', href: '/stocuri?tab=componente', icon: ShieldCheck, desc: 'Piese montate aflate în perioada de garanție' },
        { name: '5. Anvelope & Harta Axe', href: '/anvelope', icon: CircleDot, desc: 'Poziționare anvelope pe axe utilaje' },
        { name: '6. Uleiuri & Fluide Flotă', href: '/fluide', icon: Droplets, desc: 'Monitorizare consum ulei, schimb vs completare' },
      ],
    },
    {
      name: 'Analitice & Rapoarte',
      icon: BarChart3,
      items: [
        { name: 'Rapoarte & Analitică Flotă', href: '/rapoarte', icon: BarChart3, desc: 'Costuri per km/mTH, consum ulei, grafice' },
        { name: 'Centru Alerte Active', href: '/alerte', icon: ShieldAlert, desc: 'Avertizări depășiri, stoc critic, documente expirate' },
      ],
    },
  ];

  const fetchAlerte = async () => {
    try {
      const resAlerte = await fetch(`${API_BASE_URL}/anomalii/alerte-centralizate`);
      if (resAlerte.ok) {
        const alerte = await resAlerte.json();
        const list = Array.isArray(alerte) ? alerte : [];
        setAlerteList(list);
        setNumAlerte(list.length);
      }

      const resVeh = await fetch(`${API_BASE_URL}/vehicule`);
      if (resVeh.ok) {
        const vData = await resVeh.json();
        setVehicule(Array.isArray(vData) ? vData : (vData?.data || []));
      }

      const resSync = await fetch(`${API_BASE_URL}/efactura/sync/status`);
      if (resSync.ok) {
        const sData = await resSync.json();
        setGlobalSyncStatus(sData);
      }
    } catch (e) {
      console.log('Error fetching navbar data', e);
    }
  };

  useEffect(() => {
    fetchAlerte();
    const interval = setInterval(fetchAlerte, 4000);
    return () => clearInterval(interval);
  }, []);

  const searchResults = searchQuery.trim()
    ? vehicule.filter(
        (v) =>
          v.numarIntern?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.numarInmatriculare?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.marca?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          v.model?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const filteredNotifications = alerteList.filter((a) => {
    if (activeCategoryFilter === 'STOC') return a.categorieAlert === 'STOC_CRITIC';
    if (activeCategoryFilter === 'MENTENANTA') return a.categorieAlert === 'MENTENANTA_CONSUMABIL' || a.categorieAlert === 'SCURGERI_ULEI';
    if (activeCategoryFilter === 'DOCUMENTE') return a.categorieAlert === 'DOCUMENTE_FLOTA' || a.categorieAlert === 'LICENTE_CUSTOM';
    return true;
  });

  const numStoc = alerteList.filter((a) => a.categorieAlert === 'STOC_CRITIC').length;
  const numMent = alerteList.filter((a) => a.categorieAlert === 'MENTENANTA_CONSUMABIL' || a.categorieAlert === 'SCURGERI_ULEI').length;
  const numDoc = alerteList.filter((a) => a.categorieAlert === 'DOCUMENTE_FLOTA' || a.categorieAlert === 'LICENTE_CUSTOM').length;

  return (
    <header className="bg-white/95 dark:bg-slate-900/95 border-b border-morning-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md shadow-xs">
      <div className="px-3 sm:px-5 h-14 flex items-center justify-between gap-3">
        {/* BRAND & LOGO */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            type="button"
            onClick={() => openTab({ href: '/', title: 'Dashboard', iconName: 'LayoutDashboard' })}
            className="flex items-center space-x-2.5 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-sapphire-600 dark:bg-sapphire-500 flex items-center justify-center shadow-md shadow-sapphire-600/20 group-hover:scale-105 transition">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-sapphire-900 dark:text-white flex items-center">
                Fleet<span className="text-sapphire-500 dark:text-cyan-400">CMD</span>
              </span>
              <span className="text-[9px] text-sage-500 font-bold uppercase tracking-wider block -mt-1">Enterprise CMMS</span>
            </div>
          </button>
        </div>

        {/* MENIU ORIZONTAL PRINCIPAL CU DROPDOWN-URI ELEGANTE */}
        <nav className="hidden lg:flex items-center space-x-1 flex-1 max-w-4xl">
          {/* DASHBOARD LINK */}
          <button
            type="button"
            onClick={() => openTab({ href: '/', title: 'Dashboard', iconName: 'LayoutDashboard' })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeTabId === '/'
                ? 'bg-sapphire-50 dark:bg-slate-800 text-sapphire-900 dark:text-white font-black'
                : 'text-slate-700 dark:text-slate-300 hover:bg-morning-100 dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-sapphire-600 dark:text-cyan-400" />
            <span>Dashboard</span>
          </button>

          {/* DROPDOWN GROUPS */}
          {navGroups
            .filter((grp) => !(user?.rol === 'VIEWER' && grp.name.includes('Facturi')))
            .map((group) => {
              const isOpen = activeDropdown === group.name;
              const hasActiveChild = group.items.some((it) => it.href === activeTabId || it.href.split('?')[0] === activeTabId.split('?')[0]);
              const GroupIcon = group.icon;

              return (
                <div
                  key={group.name}
                  className="relative"
                  onMouseEnter={() => setActiveDropdown(group.name)}
                  onMouseLeave={() => setActiveDropdown(null)}
                >
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(isOpen ? null : group.name)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
                      hasActiveChild
                        ? 'bg-sapphire-50 dark:bg-slate-800 text-sapphire-900 dark:text-white font-black ring-1 ring-sapphire-200 dark:ring-slate-700'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-morning-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <GroupIcon className={`w-3.5 h-3.5 ${hasActiveChild ? 'text-sapphire-600 dark:text-cyan-400' : 'text-sage-500'}`} />
                    <span>{group.name}</span>
                    <ChevronDown className={`w-3 h-3 text-sage-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* MEGA / POPUP DROPDOWN MENIU */}
                  {isOpen && (
                    <div className="absolute left-0 top-full pt-1.5 z-50 w-72 animate-scale-up">
                      <div className="bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 divide-y divide-morning-100 dark:divide-slate-800">
                        <div className="p-1 space-y-1">
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isItemActive = activeTabId === item.href;
                            return (
                              <button
                                key={item.href}
                                type="button"
                                onClick={() => {
                                  openTab({ href: item.href, title: item.name });
                                  setActiveDropdown(null);
                                }}
                                className={`w-full flex items-start space-x-2.5 p-2 rounded-xl text-left transition cursor-pointer ${
                                  isItemActive
                                    ? 'bg-sapphire-50 dark:bg-slate-800 text-sapphire-900 dark:text-white font-extrabold'
                                    : 'hover:bg-morning-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <div className="p-1.5 bg-morning-100 dark:bg-slate-800 rounded-lg text-sapphire-600 dark:text-cyan-400 shrink-0 mt-0.5">
                                  <ItemIcon className="w-3.5 h-3.5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold leading-tight">{item.name}</p>
                                  {item.desc && (
                                    <p className="text-[10px] text-sage-500 font-medium leading-tight mt-0.5 line-clamp-1">{item.desc}</p>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

          {/* SETĂRI SISTEM */}
          <button
            type="button"
            onClick={() => openTab({ href: '/setari', title: 'Setări Sistem', iconName: 'Settings' })}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer ${
              activeTabId === '/setari'
                ? 'bg-sapphire-50 dark:bg-slate-800 text-sapphire-900 dark:text-white font-black'
                : 'text-slate-700 dark:text-slate-300 hover:bg-morning-100 dark:hover:bg-slate-800'
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-sage-500" />
            <span>Setări</span>
          </button>
        </nav>

        {/* DREAPTA: CĂUTARE RAPIDĂ, ANAF SYNC, TEMA, NOTIFICĂRI, PROFIL */}
        <div className="flex items-center space-x-2 shrink-0">
          {/* CĂUTARE RAPIDĂ UTILAJ */}
          <div className="relative">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-sage-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Caută utilaj..."
                className="w-28 sm:w-44 bg-morning-100 dark:bg-slate-800 border border-morning-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold text-sapphire-900 dark:text-white placeholder-sage-400 focus:w-56 focus:bg-white dark:focus:bg-slate-900 transition-all duration-200"
              />
            </div>

            {/* POPUP REZULTATE CĂUTARE */}
            {isSearchOpen && searchResults.length > 0 && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsSearchOpen(false)} />
                <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 w-72 max-h-72 overflow-y-auto space-y-1 animate-scale-up">
                  {searchResults.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => {
                        openTab({
                          href: `/fisa-tehnica?id=${v.id}`,
                          title: `${v.numarIntern} (${v.numarInmatriculare})`,
                          iconName: 'Truck',
                        });
                        setIsSearchOpen(false);
                      }}
                      className="w-full flex items-center justify-between p-2 hover:bg-morning-100 dark:hover:bg-slate-800 rounded-xl transition text-xs text-left cursor-pointer"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="p-1.5 bg-sapphire-50 dark:bg-slate-800 text-sapphire-600 dark:text-cyan-400 rounded-lg shrink-0">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-sapphire-900 dark:text-white truncate">{v.numarIntern} ({v.numarInmatriculare})</p>
                          <p className="text-[10px] text-sage-500 font-medium truncate">{v.marca} {v.model}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono font-bold text-sapphire-700 dark:text-cyan-300 bg-morning-200 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
                        {v.valoareContorCurent} {v.tipMasurare}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* GLOBAL ANAF SYNC BADGE */}
          {globalSyncStatus?.inProgress && (
            <button
              type="button"
              onClick={() => openTab({ href: '/efactura?tab=efactura', title: 'ANAF e-Factura' })}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-sapphire-50 dark:bg-slate-800 border border-sapphire-300 dark:border-slate-700 text-sapphire-800 dark:text-cyan-300 transition shadow-2xs animate-pulse cursor-pointer"
              title="Sincronizare ANAF SPV în curs"
            >
              <RefreshCw className="w-3 h-3 animate-spin text-sapphire-600 dark:text-cyan-400 shrink-0" />
              <span className="text-[10px] font-bold font-mono">
                {globalSyncStatus.processed}/{globalSyncStatus.totalMessages || '...'}
              </span>
            </button>
          )}

          {/* TEMA TOGGLE */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-1.5 rounded-xl text-sage-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-white hover:bg-morning-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Comutator Temă (Luminos / Gris / Întunecat)"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : resolvedTheme === 'gray' ? (
              <Sparkles className="w-4 h-4 text-sky-400" />
            ) : (
              <Moon className="w-4 h-4 text-sapphire-700" />
            )}
          </button>

          {/* NOTIFICĂRI BELL */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-1.5 rounded-xl text-sage-600 dark:text-slate-400 hover:text-sapphire-900 dark:hover:text-white hover:bg-morning-100 dark:hover:bg-slate-800 transition cursor-pointer"
              title="Alerte Active"
            >
              <Bell className="w-4 h-4" />
              {numAlerte > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] min-w-[16px] h-[16px] flex items-center justify-center rounded-full px-0.5 shadow-md border border-white dark:border-slate-900">
                  {numAlerte > 99 ? '99+' : numAlerte}
                </span>
              )}
            </button>

            {/* NOTIFICATIONS DROPDOWN */}
            {isNotificationsOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-morning-200 dark:divide-slate-800 animate-scale-up">
                  <div className="p-3 bg-morning-50 dark:bg-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-4 h-4 text-sapphire-600 dark:text-cyan-400" />
                      <span className="font-extrabold text-xs text-sapphire-900 dark:text-white">Alerte Flotă</span>
                      <span className="px-1.5 py-0.2 bg-terracotta-500 text-white font-black text-[10px] rounded-full">
                        {numAlerte}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsNotificationsOpen(false)}
                      className="text-sage-400 hover:text-slate-900 text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Filtre */}
                  <div className="px-3 py-1.5 bg-white dark:bg-slate-900 flex items-center space-x-1 overflow-x-auto text-[10px] font-bold">
                    <button
                      onClick={() => setActiveCategoryFilter('TOATE')}
                      className={`px-2 py-0.5 rounded-lg whitespace-nowrap ${
                        activeCategoryFilter === 'TOATE'
                          ? 'bg-sapphire-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-morning-100'
                      }`}
                    >
                      Toate ({alerteList.length})
                    </button>
                    <button
                      onClick={() => setActiveCategoryFilter('STOC')}
                      className={`px-2 py-0.5 rounded-lg whitespace-nowrap ${
                        activeCategoryFilter === 'STOC'
                          ? 'bg-purple-600 text-white'
                          : 'text-purple-700 bg-purple-50 dark:bg-purple-950/40'
                      }`}
                    >
                      Stoc ({numStoc})
                    </button>
                    <button
                      onClick={() => setActiveCategoryFilter('MENTENANTA')}
                      className={`px-2 py-0.5 rounded-lg whitespace-nowrap ${
                        activeCategoryFilter === 'MENTENANTA'
                          ? 'bg-sapphire-600 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-morning-100'
                      }`}
                    >
                      Mentenanță ({numMent})
                    </button>
                    <button
                      onClick={() => setActiveCategoryFilter('DOCUMENTE')}
                      className={`px-2 py-0.5 rounded-lg whitespace-nowrap ${
                        activeCategoryFilter === 'DOCUMENTE'
                          ? 'bg-amber-600 text-white'
                          : 'text-amber-700 bg-amber-50 dark:bg-amber-950/40'
                      }`}
                    >
                      Acte ({numDoc})
                    </button>
                  </div>

                  {/* Listă Alerte */}
                  <div className="max-h-64 overflow-y-auto divide-y divide-morning-100 dark:divide-slate-800">
                    {filteredNotifications.length > 0 ? (
                      filteredNotifications.map((al) => (
                        <div
                          key={al.id}
                          onClick={() => {
                            openTab({ href: al.categorieAlert === 'STOC_CRITIC' ? '/stocuri?tab=stoc' : '/alerte', title: 'Alerte' });
                            setIsNotificationsOpen(false);
                          }}
                          className="p-2.5 hover:bg-morning-50 dark:hover:bg-slate-800 transition cursor-pointer text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded ${
                              al.urgenta === 'CRITIC' ? 'bg-terracotta-100 text-terracotta-700' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {al.urgenta}
                            </span>
                            <span className="text-[10px] text-sage-500 font-mono">{al.vehiculNumar || 'Flotă'}</span>
                          </div>
                          <p className="font-bold text-sapphire-900 dark:text-white mt-1 line-clamp-1">{al.titlu}</p>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-1">{al.mesaj}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-sage-500">Nu există alerte active.</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* USER MENU */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center space-x-1.5 p-1 rounded-xl hover:bg-morning-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-sapphire-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user?.nume ? user.nume[0] : 'U'}
              </div>
              <ChevronDown className="w-3 h-3 text-sage-400" />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-morning-200 dark:border-slate-800 rounded-2xl shadow-xl p-2 z-50 text-xs font-bold divide-y divide-morning-100 dark:divide-slate-800 animate-scale-up">
                  <div className="p-2 space-y-0.5">
                    <p className="font-black text-sapphire-900 dark:text-white">{user?.nume}</p>
                    <p className="text-[10px] text-sage-500 font-mono">@{user?.username || 'utilizator'}</p>
                    <span className="inline-block mt-1 text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-sapphire-100 text-sapphire-800">
                      {user?.rol || 'OPERATOR'}
                    </span>
                  </div>

                  <div className="p-1 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        openTab({ href: '/setari?tab=utilizatori', title: 'Utilizatori & Audit', iconName: 'Users' });
                        setIsUserMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-morning-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center space-x-2"
                    >
                      <Users className="w-3.5 h-3.5 text-sapphire-600" />
                      <span>Gestiune Utilizatori</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-50 text-rose-600 flex items-center space-x-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Deconectare (Logout)</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* HAMBURGER BUTON MOBIL */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-xl text-sage-600 dark:text-slate-400 hover:bg-morning-100 dark:hover:bg-slate-800"
            title="Meniu Principal"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* MOBILE DRAWER */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-morning-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 max-h-[80vh] overflow-y-auto space-y-3">
          <button
            type="button"
            onClick={() => {
              openTab({ href: '/', title: 'Dashboard', iconName: 'LayoutDashboard' });
              setIsMobileMenuOpen(false);
            }}
            className="w-full flex items-center space-x-2 p-2 rounded-xl text-xs font-bold text-sapphire-900 dark:text-white hover:bg-morning-100"
          >
            <LayoutDashboard className="w-4 h-4 text-sapphire-600" />
            <span>Dashboard</span>
          </button>

          {navGroups.map((group) => (
            <div key={group.name} className="space-y-1">
              <span className="text-[10px] font-black uppercase text-sage-500 tracking-wider block px-2">
                {group.name}
              </span>
              {group.items.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => {
                    openTab({ href: item.href, title: item.name });
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-morning-100 dark:hover:bg-slate-800"
                >
                  <item.icon className="w-3.5 h-3.5 text-sapphire-600" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </header>
  );
}
