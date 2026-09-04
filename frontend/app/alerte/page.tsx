"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert, AlertTriangle, CheckCircle2, Droplets, CircleDot, Clock, X,
  Filter, FileText, Bell, Wrench, Search, RotateCcw, ShieldCheck, ArrowRight
} from 'lucide-react';

export default function AlertePage() {
  const [alerteCentralizate, setAlerteCentralizate] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // FILTERS
  const [categorieFilter, setCategorieFilter] = useState('TOATE');
  const [urgentaFilter, setUrgentaFilter] = useState('TOATE');
  const [searchQuery, setSearchQuery] = useState('');

  // MODAL REZOLVARE
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

  useEffect(() => {
    fetchAlerte();
  }, []);

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
        alert('Alerta a fost confirmată și rezolvată! A fost eliminată din lista de atenționări active.');
        const resolvedId = selectedAlerta.id;
        setSelectedAlerta(null);
        setSolutie('');
        // Optimistic local removal + fresh refetch
        setAlerteCentralizate((prev) => prev.filter((a) => a.id !== resolvedId));
        fetchAlerte();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut confirma rezolvarea alertei'}`);
      }
    } catch (e) {
      alert('Eroare de conexiune la rezolvarea alertei.');
    }
  };

  // FILTER LOGIC
  const alerteFiltrate = alerteCentralizate.filter((a) => {
    const matchCat = categorieFilter === 'TOATE' || a.categorieAlert === categorieFilter;
    const matchUrg = urgentaFilter === 'TOATE' || a.urgenta === urgentaFilter;
    const q = searchQuery.toLowerCase().trim();
    const matchSearch = !q || a.titlu.toLowerCase().includes(q) || a.mesaj.toLowerCase().includes(q) || (a.vehiculNumar && a.vehiculNumar.toLowerCase().includes(q));
    return matchCat && matchUrg && matchSearch;
  });

  const numCritice = alerteCentralizate.filter((a) => a.urgenta === 'CRITIC').length;
  const numAvertizari = alerteCentralizate.filter((a) => a.urgenta === 'AVERTIZARE').length;

  return (
    <div className="space-y-6">
      {/* ANTET TITLU & ACȚIUNI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-sapphire-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-7 h-7 text-terracotta-500" />
            <span>Centru de Alerte Active & Notificări În Prealabil</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium mt-1">
            Centralizator integral: Alerte consumabile (KM/mTH/Zile), expirări documente legale (ITP, RCA, Tahograf) & anomalii scurgeri
          </p>
        </div>

        <Link
          href="/setari"
          className="px-4 py-2.5 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2 self-start"
        >
          <Wrench className="w-4 h-4" />
          <span>Configurare Praguri Alerte & Valabilități</span>
        </Link>
      </div>

      {/* KPI ALERTE ACTIVE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-terracotta-500">
          <div>
            <p className="text-[10px] uppercase font-black text-terracotta-600 tracking-wider">Alerte Critice (Depășite)</p>
            <p className="text-3xl font-black text-terracotta-600 font-mono mt-0.5">{numCritice}</p>
            <p className="text-[11px] text-sage-600 font-semibold">acțiune imediată necesară</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-roseash-100 border border-roseash-300 flex items-center justify-center text-terracotta-600">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-500">
          <div>
            <p className="text-[10px] uppercase font-black text-amber-700 tracking-wider">În Prag Avertizare</p>
            <p className="text-3xl font-black text-amber-700 font-mono mt-0.5">{numAvertizari}</p>
            <p className="text-[11px] text-sage-600 font-semibold">notificare în prealabil</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-700">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-black text-sapphire-700 tracking-wider">Total Notificări Active</p>
            <p className="text-3xl font-black text-sapphire-900 font-mono mt-0.5">{alerteCentralizate.length}</p>
            <p className="text-[11px] text-sage-600 font-semibold">în toată flota & firmă</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center text-sapphire-600">
            <Bell className="w-6 h-6" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-black text-sage-700 tracking-wider">Status General Flotă</p>
            <p className="text-lg font-black text-sapphire-900 mt-1">
              {numCritice === 0 ? 'Flotă Optimă' : 'Atenție Necesară'}
            </p>
            <p className="text-[11px] text-sage-600 font-semibold">monitorizare continuă</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-morning-100 border border-morning-200 flex items-center justify-center text-sapphire-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* PANOU FILTRARE AVANSATĂ ALERTE */}
      <div className="pleasant-card rounded-2xl p-4 bg-white border border-morning-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sapphire-900 font-extrabold text-xs">
            <Filter className="w-4 h-4 text-sapphire-500" />
            <span>Filtrare & Categorisire Alerte ({alerteFiltrate.length} / {alerteCentralizate.length} Afișate)</span>
          </div>

          {(categorieFilter !== 'TOATE' || urgentaFilter !== 'TOATE' || searchQuery) && (
            <button
              onClick={() => {
                setCategorieFilter('TOATE');
                setUrgentaFilter('TOATE');
                setSearchQuery('');
              }}
              className="text-[11px] font-bold text-terracotta-600 hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Resetează Filtrele</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
          {/* Căutare text */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-sage-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Căutare titlu alertă, utilaj, document, mesaj..."
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-sapphire-900 font-bold focus:bg-white transition"
            />
          </div>

          {/* Filtru Categorie */}
          <div>
            <select
              value={categorieFilter}
              onChange={(e) => setCategorieFilter(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 font-bold text-sapphire-900 cursor-pointer"
            >
              <option value="TOATE">Toate Categoriile</option>
              <option value="STOC_CRITIC">Stoc Critic / Piese & Uleiuri</option>
              <option value="MENTENANTA_CONSUMABIL"> Mentenanță & Consumabile</option>
              <option value="DOCUMENTE_FLOTA">Documente Legale Flotă</option>
              <option value="LICENTE_CUSTOM">Licențe & Atestate Firmă</option>
              <option value="SCURGERI_ULEI">Scurgeri Ulei</option>
            </select>
          </div>

          {/* Filtru Urgență */}
          <div>
            <select
              value={urgentaFilter}
              onChange={(e) => setUrgentaFilter(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 font-bold text-sapphire-900 cursor-pointer"
            >
              <option value="TOATE">Toate Urgențele</option>
              <option value="CRITIC">Doar Critice (Depășite/Expirate/Epuizate)</option>
              <option value="AVERTIZARE"> Doar Avertizări În Prealabil</option>
            </select>
          </div>
        </div>
      </div>

      {/* LISTA DE ALERTE FILTRATE */}
      <div className="space-y-3">
        {alerteFiltrate.length > 0 ? (
          alerteFiltrate.map((a) => {
            const esteCritic = a.urgenta === 'CRITIC';
            const esteStoc = a.categorieAlert === 'STOC_CRITIC';

            return (
              <div
                key={a.id}
                className={`pleasant-card p-4 rounded-2xl border-l-4 transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs ${
                  esteCritic
                    ? 'border-l-terracotta-500 bg-roseash-50/60 hover:bg-roseash-100/60'
                    : 'border-l-amber-500 bg-amber-50/40 hover:bg-amber-100/40'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        esteCritic ? 'bg-terracotta-600 text-white' : 'bg-amber-500 text-white'
                      }`}
                    >
                      {esteCritic ? 'CRITIC' : 'AVERTIZARE'}
                    </span>

                    <span className={`px-2.5 py-0.5 rounded-lg font-extrabold text-[11px] ${
                      esteStoc
                        ? 'bg-purple-100 text-purple-900 border border-purple-200'
                        : 'bg-sapphire-100 text-sapphire-900'
                    }`}>
                      {a.categorieText}
                    </span>

                    {a.vehiculNumar && (
                      <span className="font-mono text-xs font-black text-sapphire-900 bg-white px-2 py-0.5 rounded border border-morning-200">
                        {a.vehiculNumar}
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-sm text-sapphire-900">{a.titlu}</h3>
                  <p className="text-xs text-slate-800 font-semibold">{a.mesaj}</p>

                  <div className="flex items-center space-x-3 text-[11px] text-sage-600 font-medium">
                    <span>Dată / Calcul: {a.modCalcul}</span>
                    <span>•</span>
                    <span>Generată la: {new Date(a.dataReferinta).toLocaleDateString('ro-RO')}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 self-end md:self-center">
                  {esteStoc ? (
                    <Link
                      href="/stocuri?tab=stoc"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 whitespace-nowrap"
                    >
                      <span>Vezi Stoc & Comandă</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  ) : (
                    <button
                      onClick={() => setSelectedAlerta(a)}
                      className="px-4 py-2 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1 whitespace-nowrap"
                    >
                      <span>Rezolvă / Confirmă</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="pleasant-card p-8 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-sage-500 mx-auto" />
            <h3 className="font-extrabold text-sapphire-900 text-base">Nu există alerte active pentru filtrele selectate!</h3>
            <p className="text-xs text-sage-700 font-medium">Toate documentele flotei, consumabilele și licențele sunt în parametri optimi.</p>
          </div>
        )}
      </div>

      {/* MODAL REZOLVARE ALERTĂ */}
      {selectedAlerta && (
        <div className="fixed inset-0 bg-sapphire-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-morning-200 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="font-extrabold text-sapphire-900 text-base">Rezolvare / Confirmare Alertă</h3>
              <button onClick={() => setSelectedAlerta(null)} className="text-sage-400 hover:text-sapphire-900 font-bold"></button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="font-extrabold text-sapphire-900">{selectedAlerta.titlu}</p>
              <p className="text-sage-700">{selectedAlerta.mesaj}</p>

              <div>
                <label className="font-bold text-sapphire-900 block mt-3 mb-1">Măsuri Luate / Soluție Rezolvare:</label>
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
