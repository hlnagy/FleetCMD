"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import {
  Link2, Unlink, Truck, Search, Activity, Clock, CheckCircle2,
  AlertCircle, RefreshCw, Layers, Plus, ArrowRight, ShieldCheck
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';

export default function AnsambluriPage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [cuplariActive, setCuplariActive] = useState<any[]>([]);
  const [istoricCuplari, setIstoricCuplari] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Formular cuplare
  const [selectedCapTractorId, setSelectedCapTractorId] = useState('');
  const [selectedSemiremorcaId, setSelectedSemiremorcaId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtre căutare istoric
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'TOATE' | 'ACTIVE' | 'INACTIVE'>('TOATE');

  const fetchData = async () => {
    setLoading(true);
    try {
      const resVeh = await fetch(`${API_BASE_URL}/vehicule`);
      if (resVeh.ok) {
        const dataVeh = await resVeh.json();
        setVehicule(dataVeh);

        // Auto-select initial Tractor and Semi-trailer if available
        const tractors = dataVeh.filter((v: any) => v.categorieEnum === 'CAP_TRACTOR');
        const trailers = dataVeh.filter((v: any) => v.categorieEnum === 'SEMIREMORCA' || v.categorieEnum === 'REMORCA');

        if (tractors.length > 0 && !selectedCapTractorId) {
          setSelectedCapTractorId(tractors[0].id);
        }
        if (trailers.length > 0 && !selectedSemiremorcaId) {
          setSelectedSemiremorcaId(trailers[0].id);
        }
      }

      const resActive = await fetch(`${API_BASE_URL}/vehicule/cuplari-active`);
      if (resActive.ok) {
        setCuplariActive(await resActive.json());
      }

      const resHist = await fetch(`${API_BASE_URL}/vehicule/istoric-cuplari`);
      if (resHist.ok) {
        setIstoricCuplari(await resHist.json());
      }
    } catch (e) {
      console.error('Eroare la încărcarea datelor de cuplare', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const capTractoare = vehicule.filter((v) => v.categorieEnum === 'CAP_TRACTOR');
  const semiremorci = vehicule.filter((v) => v.categorieEnum === 'SEMIREMORCA' || v.categorieEnum === 'REMORCA');

  const handleCuplare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCapTractorId || !selectedSemiremorcaId) {
      alert('Vă rugăm să selectați atât un Cap Tractor cât și o Semiremorcă!');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/cuplare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capTractorId: selectedCapTractorId,
          semiremorcaId: selectedSemiremorcaId,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.mesaj || 'Cuplare efectuată cu succes!');
        fetchData();
      } else {
        alert(`Eroare la cuplare: ${data.message || 'Verificați datele introduse'}`);
      }
    } catch (e) {
      alert('Eroare la procesarea cuplării.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecuplare = async (cuplareId: string) => {
    const confirmed = await showConfirm(
      'Decuplare Ansamblu',
      'Sigur doriți să decuplați acest ansamblu (Cap Tractor și Semiremorcă)?',
      'Da, decuplează',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/decuplare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cuplareId }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.mesaj || 'Decuplare efectuată cu succes!');
        fetchData();
      } else {
        alert(`Eroare la decuplare: ${data.message}`);
      }
    } catch (e) {
      alert('Eroare la decuplare.');
    }
  };

  // Filtrare istoric cuplări
  const istoricFiltrat = istoricCuplari.filter((item) => {
    const matchFilter =
      filterType === 'TOATE' ? true :
      filterType === 'ACTIVE' ? item.esteActiv : !item.esteActiv;

    if (!searchQuery) return matchFilter;

    const q = searchQuery.toLowerCase();
    const trInt = item.capTractor?.numarIntern?.toLowerCase().includes(q);
    const trInm = item.capTractor?.numarInmatriculare?.toLowerCase().includes(q);
    const smInt = item.semiremorca?.numarIntern?.toLowerCase().includes(q);
    const smInm = item.semiremorca?.numarInmatriculare?.toLowerCase().includes(q);

    return matchFilter && (trInt || trInm || smInt || smInm);
  });

  return (
    <div className="space-y-6">
      {/* Antet Titlu & Acțiuni */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <Link2 className="w-6 h-6 text-sapphire-500" />
            <span>Management Ansambluri (Cuplare Cap Tractor 🔗 Semiremorcă)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">
            Cuplare dinamică și acumulare automată de kilometri pe semiremorci în timp real
          </p>
        </div>

        <button
          onClick={fetchData}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold border border-morning-200 transition"
        >
          <RefreshCw className={`w-4 h-4 text-sapphire-500 ${loading ? 'animate-spin' : ''}`} />
          <span>Reîmprospătează Date</span>
        </button>
      </div>

      {/* DASHBOARD SUMMARY KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-sapphire-50 border border-sapphire-200 text-sapphire-700">
            <Link2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-sage-600 font-semibold block">Ansambluri Active</span>
            <span className="text-xl font-black font-mono text-sapphire-900">{cuplariActive.length}</span>
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-morning-100 border border-morning-300 text-sapphire-900">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-sage-600 font-semibold block">Capete Tractoare</span>
            <span className="text-xl font-black font-mono text-slate-800">{capTractoare.length}</span>
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-morning-100 border border-morning-300 text-sapphire-900">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs text-sage-600 font-semibold block">Semiremorci Flotă</span>
            <span className="text-xl font-black font-mono text-slate-800">{semiremorci.length}</span>
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-sapphire-50 border border-sapphire-200 text-sapphire-700">
            <Activity className="w-5 h-5 text-sapphire-600" />
          </div>
          <div>
            <span className="text-xs text-sage-600 font-semibold block">Total Cuplări Înregistrate</span>
            <span className="text-xl font-black font-mono text-sapphire-900">{istoricCuplari.length}</span>
          </div>
        </div>
      </div>

      {/* SECTOR 1: WIDGET CUPLARE RAPIDĂ */}
      <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-lg border border-morning-200">
        <div className="border-b border-morning-200 pb-3">
          <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
            <Link2 className="w-5 h-5 text-sapphire-500" />
            <span>Cuplare Rapidă Ansamblu Nou</span>
          </h2>
          <p className="text-xs text-sage-600 font-medium">
            Selectează un Cap Tractor și o Semiremorcă pentru a le cupla activ. Ansamblurile anterioare vor fi decuplate automat.
          </p>
        </div>

        <form onSubmit={handleCuplare} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
            {/* SELECTOR CAP TRACTOR */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-sage-700 font-bold block">1. Selectează Cap Tractor: *</label>
              <select
                value={selectedCapTractorId}
                onChange={(e) => setSelectedCapTractorId(e.target.value)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-extrabold text-xs focus:outline-none"
              >
                {capTractoare.length === 0 && <option value="">Nu există capete tractoare</option>}
                {capTractoare.map((v) => {
                  const isCoupled = cuplariActive.some((c) => c.capTractorId === v.id);
                  return (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern} — {v.numarInmatriculare} ({v.valoareContorCurent} KM) {isCoupled ? '🔗 [Cuplat]' : '🟢 [Disponibil]'}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* SIMBOL CUPLARE */}
            <div className="flex items-center justify-center py-2 md:py-0">
              <div className="w-10 h-10 rounded-full bg-sapphire-500 text-white flex items-center justify-center shadow-md shadow-sapphire-500/30">
                <Link2 className="w-5 h-5 animate-pulse" />
              </div>
            </div>

            {/* SELECTOR SEMIREMORCĂ */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-sage-700 font-bold block">2. Selectează Semiremorcă: *</label>
              <select
                value={selectedSemiremorcaId}
                onChange={(e) => setSelectedSemiremorcaId(e.target.value)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-extrabold text-xs focus:outline-none"
              >
                {semiremorci.length === 0 && <option value="">Nu există semiremorci</option>}
                {semiremorci.map((v) => {
                  const isCoupled = cuplariActive.some((c) => c.semiremorcaId === v.id);
                  return (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern} — {v.numarInmatriculare} ({v.valoareContorCurent} KM) {isCoupled ? '🔗 [Cuplată]' : '🟢 [Disponibilă]'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSubmitting || capTractoare.length === 0 || semiremorci.length === 0}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 transition disabled:opacity-50"
            >
              <Link2 className="w-4 h-4" />
              <span>Cuplează Ansamblu Acum</span>
            </button>
          </div>
        </form>
      </div>

      {/* SECTOR 2: CARD-URI ANSAMBLURI ACTIVE */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-sapphire-500" />
            <span>Ansambluri Active în Flotă ({cuplariActive.length})</span>
          </h2>
        </div>

        {cuplariActive.length === 0 ? (
          <div className="pleasant-card rounded-2xl p-8 text-center bg-morning-50 space-y-2">
            <ShieldCheck className="w-10 h-10 text-sage-400 mx-auto" />
            <p className="font-extrabold text-sapphire-900 text-sm">Nu există niciun ansamblu cuplat activ în acest moment.</p>
            <p className="text-xs text-sage-600">Folosește widget-ul de mai sus pentru a cupla un Cap Tractor cu o Semiremorcă.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cuplariActive.map((item) => (
              <div key={item.id} className="pleasant-card pleasant-card-hover rounded-2xl p-5 space-y-4 border-2 border-sapphire-100 shadow-md">
                <div className="flex items-center justify-between border-b border-morning-200 pb-3">
                  <span className="px-2.5 py-1 rounded-full bg-sapphire-500 text-white text-[10px] font-extrabold uppercase tracking-wider flex items-center space-x-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                    <span>Ansamblu Activ</span>
                  </span>
                  <span className="text-[10px] text-sage-500 font-mono">
                    Cuplat: {new Date(item.dataCuplare).toLocaleDateString('ro-RO')}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2 items-center text-xs">
                  {/* CAP TRACTOR CARD DETAILS */}
                  <div className="col-span-2 p-3 rounded-xl bg-morning-100 border border-morning-200 space-y-1">
                    <span className="text-[10px] text-sage-600 font-bold uppercase block">Cap Tractor</span>
                    <p className="font-extrabold text-sapphire-900 text-sm">{item.capTractor?.numarIntern}</p>
                    <p className="text-[11px] text-slate-700 font-semibold">{item.capTractor?.numarInmatriculare}</p>
                    <p className="text-[10px] font-mono text-sage-600 font-bold">{item.capTractor?.valoareContorCurent} KM</p>
                  </div>

                  {/* ICON 🔗 */}
                  <div className="col-span-1 flex justify-center text-sapphire-500 font-bold">
                    <div className="p-2 rounded-full bg-sapphire-50">
                      <Link2 className="w-5 h-5 text-sapphire-500" />
                    </div>
                  </div>

                  {/* SEMIREMORCA CARD DETAILS */}
                  <div className="col-span-2 p-3 rounded-xl bg-morning-100 border border-morning-200 space-y-1">
                    <span className="text-[10px] text-sage-600 font-bold uppercase block">Semiremorcă</span>
                    <p className="font-extrabold text-sapphire-900 text-sm">{item.semiremorca?.numarIntern}</p>
                    <p className="text-[11px] text-slate-700 font-semibold">{item.semiremorca?.numarInmatriculare}</p>
                    <p className="text-[10px] font-mono text-sapphire-600 font-bold">{item.semiremorca?.valoareContorCurent} KM</p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-morning-200 text-xs">
                  <div className="text-[11px] text-sage-600">
                    <span>KM la cuplare: </span>
                    <span className="font-mono font-bold text-sapphire-900">{item.kmInceputTractor} KM</span>
                  </div>

                  <button
                    onClick={() => handleDecuplare(item.id)}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-terracotta-100 hover:bg-terracotta-200 text-terracotta-700 text-[11px] font-bold transition border border-terracotta-300"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Decuplează</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTOR 3: TABEL ISTORIC COMPLET CUPLĂRI */}
      <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm border border-morning-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-morning-200 pb-3">
          <div>
            <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-sapphire-500" />
              <span>Tabel Istoric Cuplări (Audit & Rulaj per Ansamblu)</span>
            </h2>
            <p className="text-xs text-sage-600 font-medium">Toate cuplările și decuplările înregistrate în sistem cu calcul de KM parcurși</p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Căutare număr intern/înmatriculare..."
                className="bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-sapphire-900 font-bold focus:outline-none"
              />
            </div>

            <select
              value={filterType}
              onChange={(e: any) => setFilterType(e.target.value)}
              className="bg-morning-100 border border-morning-200 rounded-xl p-1.5 text-sapphire-900 font-bold cursor-pointer"
            >
              <option value="TOATE">Toate Cuplările</option>
              <option value="ACTIVE">Doar Active</option>
              <option value="INACTIVE">Doar Decuplate (Istoric)</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
            <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
              <tr>
                <th className="p-3">Stare</th>
                <th className="p-3">Cap Tractor</th>
                <th className="p-3">Semiremorcă</th>
                <th className="p-3 font-mono">Data Cuplare</th>
                <th className="p-3 font-mono">Data Decuplare</th>
                <th className="p-3 font-mono text-right">KM Început / Sfârșit Tractor</th>
                <th className="p-3 font-mono text-right font-black text-sapphire-900">KM Parcurși Ansamblu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-morning-200">
              {istoricFiltrat.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-sage-500 font-medium">
                    Nu s-au găsit înregistrări conform filtrelor selectate.
                  </td>
                </tr>
              ) : (
                istoricFiltrat.map((item) => (
                  <tr key={item.id} className="hover:bg-morning-50 transition">
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.esteActiv
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-morning-200 text-sage-700'
                      }`}>
                        {item.esteActiv ? '🔗 ACTIV' : '⏹️ DECUPALAT'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-sapphire-900 block">{item.capTractor?.numarIntern}</span>
                      <span className="text-[10px] text-sage-600 block">{item.capTractor?.numarInmatriculare}</span>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-sapphire-900 block">{item.semiremorca?.numarIntern}</span>
                      <span className="text-[10px] text-sage-600 block">{item.semiremorca?.numarInmatriculare}</span>
                    </td>
                    <td className="p-3 font-mono text-sage-700 font-semibold">
                      {new Date(item.dataCuplare).toLocaleDateString('ro-RO')} {new Date(item.dataCuplare).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 font-mono text-sage-700">
                      {item.dataDecuplare
                        ? `${new Date(item.dataDecuplare).toLocaleDateString('ro-RO')} ${new Date(item.dataDecuplare).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}`
                        : '— Active —'}
                    </td>
                    <td className="p-3 font-mono text-right font-semibold text-slate-800">
                      {item.kmInceputTractor} KM ➔ {item.kmSfarsitTractor !== null && item.kmSfarsitTractor !== undefined ? `${item.kmSfarsitTractor} KM` : 'En-route'}
                    </td>
                    <td className="p-3 font-mono text-right font-black text-sapphire-900 text-sm">
                      {item.kmParcursiAnsa !== null && item.kmParcursiAnsa !== undefined
                        ? `+${item.kmParcursiAnsa} KM`
                        : `${item.capTractor?.valoareContorCurent ? item.capTractor.valoareContorCurent - item.kmInceputTractor : 0} KM (în curs)`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
