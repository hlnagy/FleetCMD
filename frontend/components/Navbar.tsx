"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell, ShieldAlert, User, Search, Wrench, Truck, PackageCheck,
  Droplets, FileText, CheckCircle2, ChevronRight, X, RefreshCw, Menu,
  Users, Settings, LogOut, Package
} from 'lucide-react';
import { API_BASE_URL } from '../lib/api';
import { useSidebar } from '../lib/SidebarContext';
import { useAuth } from '../lib/AuthContext';

export default function Navbar() {
  const { toggle } = useSidebar();
  const { user, logout, setIsLoginModalOpen } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [numAlerte, setNumAlerte] = useState(0);
  const [alerteList, setAlerteList] = useState<any[]>([]);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'TOATE' | 'STOC' | 'MENTENANTA' | 'DOCUMENTE'>('TOATE');
  const [globalSyncStatus, setGlobalSyncStatus] = useState<any>(null);

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
    const interval = setInterval(fetchAlerte, 4000); // Polling la fiecare 4 secunde
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
    <header className="h-16 border-b border-morning-200 bg-white/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs gap-3">
      {/* HAMBURGER TOGGLE BUTTON & CĂUTARE GLOBALĂ */}
      <div className="flex items-center space-x-3 w-full max-w-md">
        <button
          type="button"
          onClick={toggle}
          className="lg:hidden p-2 rounded-xl text-sage-600 hover:text-sapphire-900 hover:bg-morning-100 transition shrink-0"
          title="Deschide Meniul Principal"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
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
      </div>

      {/* DREAPTA: NOTIFICĂRI & PROFIL USER */}
      <div className="flex items-center space-x-3">
        {/* GLOBAL ANAF SYNC BADGE */}
        {globalSyncStatus?.inProgress && (
          <Link
            href="/efactura?tab=efactura"
            className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-sapphire-50 border border-sapphire-300 text-sapphire-800 hover:bg-sapphire-100 transition shadow-xs animate-pulse"
            title="Sincronizare ANAF SPV în curs"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-sapphire-600 shrink-0" />
            <div className="text-left leading-none">
              <p className="text-[10px] font-black uppercase tracking-wider text-sapphire-900">ANAF Sync Activ</p>
              <p className="text-[10px] font-bold font-mono text-sapphire-600">
                {globalSyncStatus.processed}/{globalSyncStatus.totalMessages || '...'} ({globalSyncStatus.downloaded} noi)
              </p>
            </div>
          </Link>
        )}

        {/* CLOPOȚEL DE NOTIFICĂRI FACEBOOK-STYLE */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className={`relative p-2 rounded-xl transition ${
              isNotificationsOpen
                ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
                : 'text-sage-600 hover:text-sapphire-900 hover:bg-morning-100'
            }`}
            title="Notificări & Alerte Active"
          >
            <Bell className="w-5 h-5" />
            {numAlerte > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[10px] min-w-[19px] h-[19px] flex items-center justify-center rounded-full px-1 shadow-md border-2 border-white animate-bounce">
                {numAlerte > 99 ? '99+' : numAlerte}
              </span>
            )}
          </button>

          {/* DROPDOWN NOTIFICĂRI FACEBOOK-STYLE */}
          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />

              <div className="absolute right-0 top-full mt-2 w-80 sm:w-[420px] bg-white border border-morning-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fade-in divide-y divide-morning-200">
                {/* Header Dropdown */}
                <div className="p-4 bg-morning-50/90 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="w-4 h-4 text-sapphire-600" />
                    <h3 className="font-extrabold text-sapphire-900 text-sm">Notificări & Alerte Active</h3>
                    <span className="px-2 py-0.5 bg-terracotta-500 text-white font-black text-[10px] rounded-full">
                      {numAlerte}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-sage-400 hover:text-sapphire-900 text-xs font-bold p-1 rounded-lg hover:bg-morning-200"
                  >
                    
                  </button>
                </div>

                {/* Filtre Categorie Tip Facebook */}
                <div className="px-3 py-2 bg-white flex items-center space-x-1.5 overflow-x-auto text-[11px] font-bold">
                  <button
                    onClick={() => setActiveCategoryFilter('TOATE')}
                    className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap ${
                      activeCategoryFilter === 'TOATE'
                        ? 'bg-sapphire-500 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-morning-100'
                    }`}
                  >
                    Toate ({alerteList.length})
                  </button>
                  <button
                    onClick={() => setActiveCategoryFilter('STOC')}
                    className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                      activeCategoryFilter === 'STOC'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-purple-800 bg-purple-50 hover:bg-purple-100'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Stoc ({numStoc})</span>
                  </button>
                  <button
                    onClick={() => setActiveCategoryFilter('MENTENANTA')}
                    className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                      activeCategoryFilter === 'MENTENANTA'
                        ? 'bg-sapphire-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-morning-100'
                    }`}
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Mentenanță ({numMent})</span>
                  </button>
                  <button
                    onClick={() => setActiveCategoryFilter('DOCUMENTE')}
                    className={`px-2.5 py-1 rounded-lg transition whitespace-nowrap flex items-center gap-1 ${
                      activeCategoryFilter === 'DOCUMENTE'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-amber-800 bg-amber-50 hover:bg-amber-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Acte ({numDoc})</span>
                  </button>
                </div>

                {/* Listă Notificări */}
                <div className="max-h-80 overflow-y-auto divide-y divide-morning-100">
                  {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((al) => {
                      const esteStoc = al.categorieAlert === 'STOC_CRITIC';
                      const linkHref = esteStoc ? '/stocuri?tab=stoc' : '/alerte';

                      return (
                        <Link
                          key={al.id}
                          href={linkHref}
                          onClick={() => setIsNotificationsOpen(false)}
                          className={`p-3.5 flex items-start space-x-3 hover:bg-morning-50 transition block text-xs ${
                            al.urgenta === 'CRITIC' ? 'bg-roseash-50/40' : ''
                          }`}
                        >
                          <div className={`mt-0.5 p-2 rounded-xl border shadow-2xs shrink-0 ${
                            esteStoc
                              ? 'bg-purple-50 border-purple-200 text-purple-600'
                              : al.categorieAlert === 'SCURGERI_ULEI'
                              ? 'bg-sapphire-50 border-sapphire-200 text-sapphire-600'
                              : al.categorieAlert === 'DOCUMENTE_FLOTA' || al.categorieAlert === 'LICENTE_CUSTOM'
                              ? 'bg-amber-50 border-amber-200 text-amber-600'
                              : 'bg-roseash-50 border-roseash-200 text-terracotta-600'
                          }`}>
                            {esteStoc ? (
                              <PackageCheck className="w-4 h-4" />
                            ) : al.categorieAlert === 'SCURGERI_ULEI' ? (
                              <Droplets className="w-4 h-4" />
                            ) : al.categorieAlert === 'DOCUMENTE_FLOTA' || al.categorieAlert === 'LICENTE_CUSTOM' ? (
                              <FileText className="w-4 h-4" />
                            ) : (
                              <Wrench className="w-4 h-4" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                                al.urgenta === 'CRITIC'
                                  ? 'bg-terracotta-100 text-terracotta-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {al.urgenta === 'CRITIC' ? 'Critic' : 'Avertizare'}
                              </span>
                              <span className="text-[10px] text-sage-500 font-mono truncate max-w-[120px]">
                                {al.vehiculNumar || 'Depozit'}
                              </span>
                            </div>
                            <p className="font-extrabold text-sapphire-900 leading-snug line-clamp-1">{al.titlu}</p>
                            <p className="text-[11px] text-slate-700 font-medium line-clamp-2">{al.mesaj}</p>
                          </div>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-sage-600 font-medium">
                      Nu există notificări active în această categorie.
                    </div>
                  )}
                </div>

                {/* Footer Dropdown */}
                <div className="p-3 bg-morning-50 text-center">
                  <Link
                    href="/alerte"
                    onClick={() => setIsNotificationsOpen(false)}
                    className="text-xs font-extrabold text-sapphire-600 hover:text-sapphire-800 hover:underline inline-flex items-center space-x-1"
                  >
                    <span>Vezi Toate Alertele în Centrul de Notificări</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="h-5 w-px bg-morning-200"></div>

        {/* PROFIL UTILIZATOR & MENIU ROL */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2.5 p-1.5 rounded-xl hover:bg-morning-100 transition text-left"
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs ${
              user?.rol === 'ADMIN'
                ? 'bg-sapphire-600 ring-2 ring-sapphire-400/20'
                : user?.rol === 'OPERATOR'
                ? 'bg-emerald-600'
                : 'bg-amber-600'
            }`}>
              {user?.nume ? user.nume.split(' ').map((n) => n[0]).slice(0, 2).join('') : 'U'}
            </div>
            <div className="hidden sm:block text-xs">
              <div className="flex items-center space-x-1.5">
                <p className="font-extrabold text-sapphire-900 leading-tight truncate max-w-[130px]">
                  {user?.nume || 'Utilizator'}
                </p>
                <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase ${
                  user?.rol === 'ADMIN'
                    ? 'bg-sapphire-100 text-sapphire-800 border border-sapphire-300'
                    : user?.rol === 'OPERATOR'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {user?.rol || 'OPERATOR'}
                </span>
              </div>
              <p className="text-[10px] text-sage-600 font-semibold truncate max-w-[150px]">
                {user?.functie || (user?.rol === 'ADMIN' ? 'Administrator Sistem' : 'Operator')}
              </p>
            </div>
          </button>

          {/* User Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-morning-200 z-50 overflow-hidden divide-y divide-morning-100 animate-scale-up">
                <div className="p-4 bg-morning-50/80">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-xs ${
                      user?.rol === 'ADMIN'
                        ? 'bg-sapphire-600'
                        : user?.rol === 'OPERATOR'
                        ? 'bg-emerald-600'
                        : 'bg-amber-600'
                    }`}>
                      {user?.nume ? user.nume.split(' ').map((n) => n[0]).slice(0, 2).join('') : 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-extrabold text-xs text-sapphire-900 truncate">{user?.nume}</p>
                      <p className="text-[11px] text-sage-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-[11px]">
                    <span className="text-sage-600 font-medium">Nivel Acces:</span>
                    <span className={`font-black px-2 py-0.5 rounded text-[10px] uppercase ${
                      user?.rol === 'ADMIN'
                        ? 'bg-sapphire-100 text-sapphire-800'
                        : user?.rol === 'OPERATOR'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {user?.rol === 'ADMIN' ? 'Full Admin' : user?.rol === 'OPERATOR' ? 'Operator Flotă' : 'Vizitator (Citire)'}
                    </span>
                  </div>
                </div>

                <div className="p-2 space-y-1 text-xs font-bold">
                  {user?.rol === 'ADMIN' && (
                    <Link
                      href="/setari?tab=utilizatori"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-sapphire-900 hover:bg-morning-100 transition flex items-center space-x-2.5"
                    >
                      <Users className="w-4 h-4 text-sapphire-600" />
                      <span>Gestiune Utilizatori & Jurnal Audit</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-terracotta-600 hover:bg-roseash-100 transition flex items-center space-x-2.5"
                  >
                    <LogOut className="w-4 h-4 text-terracotta-600" />
                    <span>Deconectare (Logout)</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
