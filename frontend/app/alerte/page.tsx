"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, Clock, X,
  Bell, Wrench, Search, RotateCcw, ShieldCheck, ArrowRight
} from 'lucide-react';

// Category pill config with distinctive colors and indicator dots
const CAT_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
  TOATE:                { label: 'Toate',              bg: 'bg-slate-100',    text: 'text-slate-700',      border: 'border-slate-300',    dot: 'bg-slate-400' },
  MENTENANTA_CONSUMABIL:{ label: 'Mentenanță',         bg: 'bg-sapphire-100', text: 'text-sapphire-800',   border: 'border-sapphire-300', dot: 'bg-sapphire-500' },
  STOC_CRITIC:          { label: 'Stoc Critic',        bg: 'bg-purple-100',   text: 'text-purple-800',     border: 'border-purple-300',   dot: 'bg-purple-500' },
  DOCUMENTE_FLOTA:      { label: 'Documente Flotă',    bg: 'bg-emerald-100',  text: 'text-emerald-800',    border: 'border-emerald-300',  dot: 'bg-emerald-500' },
  LICENTE_CUSTOM:       { label: 'Licențe & Atestate', bg: 'bg-amber-100',    text: 'text-amber-800',      border: 'border-amber-300',    dot: 'bg-amber-500' },
  SCURGERI_ULEI:        { label: 'Scurgeri Ulei',      bg: 'bg-roseash-100',  text: 'text-terracotta-800', border: 'border-roseash-300',  dot: 'bg-terracotta-500' },
};

const URGENTA_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  TOATE:      { label: 'Toate Urgențele', bg: 'bg-slate-100',       text: 'text-slate-700',      border: 'border-slate-300' },
  CRITIC:     { label: 'Critice',         bg: 'bg-roseash-100',     text: 'text-terracotta-800', border: 'border-roseash-300' },
  AVERTIZARE: { label: 'Avertizări',      bg: 'bg-amber-100',       text: 'text-amber-800',      border: 'border-amber-300' },
};

export default function AlertePage() {
  const [alerteCentralizate, setAlerteCentralizate] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categorieFilter, setCategorieFilter] = useState('TOATE');
  const [urgentaFilter, setUrgentaFilter] = useState('TOATE');
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedAlerta, setSelectedAlerta] = useState<any>(null);
  const [solutie, setSolutie] = useState('');

  const fetchAlerte = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/anomalii/alerte-centralizate`);
      if (res.ok) setAlerteCentralizate(await res.json());
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerte(); }, []);

  const handleRezolvaAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlerta) return;
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/alerte/rezolva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAlerta.id,
          dbId: selectedAlerta.dbId,
          categorieAlert: selectedAlerta.categorieAlert,
          vehiculId: selectedAlerta.vehiculId,
          solutie,
        }),
      });
      if (res.ok) {
        alert('Alerta a fost confirmată și rezolvată!');
        const resolvedId = selectedAlerta.id;
        setSelectedAlerta(null);
        setSolutie('');
        setAlerteCentralizate((prev) => prev.filter((a) => a.id !== resolvedId));
        fetchAlerte();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut confirma rezolvarea alertei'}`);
      }
    } catch (e) {
      alert('Eroare de conexiune.');
    }
  };

  // Live counts for pill badges
  const countsByCat = alerteCentralizate.reduce((acc: Record<string,number>, a) => {
    acc[a.categorieAlert] = (acc[a.categorieAlert] || 0) + 1;
    return acc;
  }, {});
  const countsByUrg = alerteCentralizate.reduce((acc: Record<string,number>, a) => {
    acc[a.urgenta] = (acc[a.urgenta] || 0) + 1;
    return acc;
  }, {});

  const alerteFiltrate = alerteCentralizate.filter((a) => {
    const matchCat = categorieFilter === 'TOATE' || a.categorieAlert === categorieFilter;
    const matchUrg = urgentaFilter === 'TOATE' || a.urgenta === urgentaFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || a.titlu.toLowerCase().includes(q) || a.mesaj.toLowerCase().includes(q) || (a.vehiculNumar && a.vehiculNumar.toLowerCase().includes(q));
    return matchCat && matchUrg && matchSearch;
  });

  const numCritice = alerteCentralizate.filter((a) => a.urgenta === 'CRITIC').length;
  const numAvertizari = alerteCentralizate.filter((a) => a.urgenta === 'AVERTIZARE').length;
  const hasActiveFilters = categorieFilter !== 'TOATE' || urgentaFilter !== 'TOATE' || searchQuery;

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-sapphire-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-terracotta-500" />
            <span>Centru de Alerte Active & Notificări în Prealabil</span>
          </h1>
          <p className="text-xs text-sage-600 font-medium mt-0.5">
            Alerte consumabile (KM/mTH/Zile), documente legale (ITP, RCA, Tahograf) & anomalii scurgeri
          </p>
        </div>
        <Link
          href="/setari"
          className="px-4 py-2 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 self-start shrink-0"
        >
          <Wrench className="w-4 h-4" />
          <span>Configurare Praguri Alerte & Valabilități</span>
        </Link>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-terracotta-500">
          <div>
            <p className="text-[10px] uppercase font-black text-terracotta-600 tracking-wider">Alerte Critice</p>
            <p className="text-3xl font-black text-terracotta-600 font-mono mt-0.5">{numCritice}</p>
            <p className="text-[11px] text-sage-600 font-semibold">acțiune imediată necesară</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-roseash-100 border border-roseash-300 flex items-center justify-center text-terracotta-600">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-400">
          <div>
            <p className="text-[10px] uppercase font-black text-amber-700 tracking-wider">În Prag Avertizare</p>
            <p className="text-3xl font-black text-amber-700 font-mono mt-0.5">{numAvertizari}</p>
            <p className="text-[11px] text-sage-600 font-semibold">notificare în prealabil</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-black text-sapphire-700 tracking-wider">Total Notificări</p>
            <p className="text-3xl font-black text-sapphire-900 font-mono mt-0.5">{alerteCentralizate.length}</p>
            <p className="text-[11px] text-sage-600 font-semibold">în toată flota & firmă</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center text-sapphire-600">
            <Bell className="w-5 h-5" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-black text-sage-700 tracking-wider">Status General</p>
            <p className={`text-base font-black mt-1 ${numCritice === 0 ? 'text-emerald-700' : 'text-terracotta-700'}`}>
              {numCritice === 0 ? 'Flotă Optimă' : 'Atenție Necesară'}
            </p>
            <p className="text-[11px] text-sage-600 font-semibold">monitorizare continuă</p>
          </div>
          <div className={`w-11 h-11 rounded-2xl border flex items-center justify-center ${numCritice === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-roseash-100 border-roseash-300 text-terracotta-600'}`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="pleasant-card rounded-2xl p-4 bg-white border border-morning-200 space-y-4 shadow-xs">

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Căutare titlu alertă, utilaj, document, mesaj..."
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 font-bold focus:bg-white transition"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={() => { setCategorieFilter('TOATE'); setUrgentaFilter('TOATE'); setSearchQuery(''); }}
              className="text-[11px] font-bold text-terracotta-600 hover:underline flex items-center space-x-1 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetează</span>
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-sage-500 uppercase tracking-wider">Categorie Alert</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CAT_CONFIG).map(([key, cfg]) => {
              const count = key === 'TOATE' ? alerteCentralizate.length : (countsByCat[key] || 0);
              const isActive = categorieFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setCategorieFilter(key)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none ${
                    isActive
                      ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm ring-2 ring-offset-1 ring-current`
                      : 'bg-white text-slate-500 border-morning-200 hover:border-morning-300 hover:bg-morning-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isActive ? cfg.dot : 'bg-slate-300'}`} />
                  <span>{cfg.label}</span>
                  {count > 0 && (
                    <span className={`px-1.5 rounded-full text-[10px] font-black leading-5 ${isActive ? 'bg-white/50' : 'bg-morning-100 text-slate-400'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Urgency pills */}
        <div className="space-y-2">
          <p className="text-[10px] font-black text-sage-500 uppercase tracking-wider">Nivel Urgență</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(URGENTA_CONFIG).map(([key, cfg]) => {
              const count = key === 'TOATE' ? alerteCentralizate.length : (countsByUrg[key] || 0);
              const isActive = urgentaFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => setUrgentaFilter(key)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none ${
                    isActive
                      ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm ring-2 ring-offset-1 ring-current`
                      : 'bg-white text-slate-500 border-morning-200 hover:border-morning-300 hover:bg-morning-50'
                  }`}
                >
                  <span>{cfg.label}</span>
                  {count > 0 && (
                    <span className={`px-1.5 rounded-full text-[10px] font-black leading-5 ${isActive ? 'bg-white/50' : 'bg-morning-100 text-slate-400'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-sage-400 font-medium pt-1 border-t border-morning-100">
          {alerteFiltrate.length} din {alerteCentralizate.length} alerte afișate
        </p>
      </div>

      {/* ALERT LIST */}
      {loading ? (
        <div className="pleasant-card p-8 rounded-2xl text-center text-sage-500 text-sm font-medium animate-pulse">
          Se încarcă alertele...
        </div>
      ) : alerteFiltrate.length > 0 ? (
        <div className="space-y-2">
          {alerteFiltrate.map((a) => {
            const esteCritic = a.urgenta === 'CRITIC';
            const esteStoc = a.categorieAlert === 'STOC_CRITIC';
            const esteDocument = a.categorieAlert === 'DOCUMENTE_FLOTA';
            const catCfg = CAT_CONFIG[a.categorieAlert] || CAT_CONFIG['MENTENANTA_CONSUMABIL'];

            return (
              <div
                key={a.id}
                className={`pleasant-card rounded-2xl border-l-4 transition flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 shadow-xs ${
                  esteCritic
                    ? 'border-l-terracotta-500 bg-roseash-50/50 hover:bg-roseash-100/40'
                    : 'border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/60'
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5">
                    {/* Urgency badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
                      esteCritic ? 'bg-terracotta-600 text-white' : 'bg-amber-400 text-white'
                    }`}>
                      {esteCritic ? 'CRITIC' : 'AVERTIZARE'}
                    </span>

                    {/* Category pill (colored) */}
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${catCfg.bg} ${catCfg.text} ${catCfg.border}`}>
                      {a.categorieText}
                    </span>

                    {/* Vehicle tag */}
                    {a.vehiculNumar && (
                      <span className="font-mono text-[11px] font-black text-sapphire-900 bg-white px-2 py-0.5 rounded-lg border border-morning-200">
                        {a.vehiculNumar}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-sapphire-900 leading-snug">{a.titlu}</h3>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">{a.mesaj}</p>

                  <div className="flex items-center gap-3 text-[11px] text-sage-500 font-medium">
                    <span>{a.modCalcul}</span>
                    <span>•</span>
                    <span>Generată: {new Date(a.dataReferinta).toLocaleDateString('ro-RO')}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
                  {esteStoc ? (
                    <Link
                      href="/stocuri?tab=stoc"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 whitespace-nowrap"
                    >
                      <span>Vezi Stoc & Comandă</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : esteDocument ? (
                    <Link
                      href={`/documente?search=${encodeURIComponent(a.vehiculNumar || '')}`}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 whitespace-nowrap"
                    >
                      <span>Vezi & Reînnoiește Act</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => setSelectedAlerta(a)}
                      className="px-4 py-2 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 whitespace-nowrap"
                    >
                      <span>Rezolvă / Confirmă</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="pleasant-card p-10 rounded-2xl text-center space-y-2">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
          <h3 className="font-extrabold text-sapphire-900 text-base">Nu există alerte pentru filtrele selectate</h3>
          <p className="text-xs text-sage-600 font-medium">Toate documentele, consumabilele și licențele sunt în parametri optimi.</p>
        </div>
      )}

      {/* MODAL REZOLVARE */}
      {selectedAlerta && (
        <div className="fixed inset-0 bg-sapphire-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-morning-200 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="font-extrabold text-sapphire-900 text-base">Rezolvare / Confirmare Alertă</h3>
              <button onClick={() => setSelectedAlerta(null)} className="text-sage-400 hover:text-sapphire-900 p-1 rounded-lg hover:bg-morning-100 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-roseash-50 border border-roseash-200 rounded-xl space-y-1">
                <p className="font-extrabold text-terracotta-700">{selectedAlerta.titlu}</p>
                <p className="text-slate-600 font-medium">{selectedAlerta.mesaj}</p>
              </div>
              <div>
                <label className="font-bold text-sapphire-900 block mt-2 mb-1">Măsuri Luate / Soluție Rezolvare:</label>
                <textarea
                  rows={3}
                  value={solutie}
                  onChange={(e) => setSolutie(e.target.value)}
                  placeholder="ex: Schimbat filtru aer în atelier, Înnoit RCA cu valabilitate 1 an..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAlerta(null)}
                className="px-4 py-2 bg-morning-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Renunță
              </button>
              <button
                type="button"
                onClick={handleRezolvaAlerta}
                className="px-5 py-2 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Confirmă Rezolvarea
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
