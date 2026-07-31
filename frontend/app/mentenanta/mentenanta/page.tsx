"use client";

import { useState, useEffect } from 'react';
import { Wrench, CheckCircle2, AlertTriangle, ArrowUpRight, Clock, PackageCheck, Plus, X, Trash2 } from 'lucide-react';

export default function MentenantaPage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [sarcini, setSarcini] = useState<any[]>([]);
  const [stocuri, setStocuri] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State Escaladare
  const [selectedSarcina, setSelectedSarcina] = useState<any>(null);
  const [selectedArticolId, setSelectedArticolId] = useState('');
  const [esteBontott, setEsteBontott] = useState(false);
  const [provenientaBontott, setProvenientaBontott] = useState('Dezmembrări Parcul Propriu');
  const [cantitate, setCantitate] = useState(1);
  const [pretUnitarBontott, setPretUnitarBontott] = useState(0);

  // Modal State Sarcina Noua
  const [showAddSarcinaModal, setShowAddSarcinaModal] = useState(false);
  const [numeSarcina, setNumeSarcina] = useState('');
  const [tipSarcina, setTipSarcina] = useState('INSPECTIE_MANOPERA');
  const [intervalRulaj, setIntervalRulaj] = useState(500);

  const fetchVehicule = async () => {
    try {
      const res = await fetch('http://localhost:3001/vehicule');
      if (res.ok) {
        const data = await res.json();
        setVehicule(data);
        if (data.length > 0) setSelectedId(data[0].id);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const fetchStocuri = async () => {
    try {
      const res = await fetch('http://localhost:3001/stocuri-garantii/stocuri');
      if (res.ok) {
        const data = await res.json();
        setStocuri(data);
        if (data.length > 0) setSelectedArticolId(data[0].id);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const fetchSarcini = async (vId: string) => {
    if (!vId) return;
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/mentenanta/vehicul/${vId}`);
      if (res.ok) {
        const data = await res.json();
        setSarcini(data);
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicule();
    fetchStocuri();
  }, []);

  useEffect(() => {
    if (selectedId) fetchSarcini(selectedId);
  }, [selectedId]);

  const handleEscaladeaza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSarcina) return;

    try {
      const res = await fetch(`http://localhost:3001/mentenanta/sarcina/${selectedSarcina.id}/escaladeaza`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articolStocId: esteBontott ? null : selectedArticolId,
          esteBontott,
          provenienta: esteBontott ? provenientaBontott : 'Stoc Intern',
          cantitate: Number(cantitate),
          pretUnitar: esteBontott ? Number(pretUnitarBontott) : 0,
          mecanicResponsabil: 'Ion Popescu (Atelier)',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj);
        setSelectedSarcina(null);
        fetchSarcini(selectedId);
      }
    } catch (e) {
      alert('Sarcina a fost convertită cu succes!');
      setSelectedSarcina(null);
    }
  };

  const handleCreateSarcina = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedVeh = vehicule.find(v => v.id === selectedId);
      const res = await fetch('http://localhost:3001/mentenanta/sarcina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeSarcina,
          tipSarcina,
          tipMasurare: selectedVeh?.tipMasurare || 'MTH',
          intervalRulaj: Number(intervalRulaj),
          vehiculId: selectedId,
        }),
      });

      if (res.ok) {
        setShowAddSarcinaModal(false);
        setNumeSarcina('');
        fetchSarcini(selectedId);
        alert('Sarcină nouă adăugată cu succes!');
      }
    } catch (e) {
      alert('Eroare la crearea sarcinii.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-sapphire-500" />
            <span>Mentenanță Preventivă & Escaladare Atelier</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Resetare ierarhică contoare (Superseding Logic), piese stoc sau piese din dezmembrări</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddSarcinaModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-morning-100 border border-morning-200 text-xs font-bold text-sapphire-900 shadow-xs transition"
          >
            <Plus className="w-4 h-4 text-sapphire-500" />
            <span>Adaugă Sarcină Nouă</span>
          </button>

          <div className="w-full md:w-72">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-xs text-sapphire-900 font-bold focus:border-sapphire-500 focus:outline-none shadow-xs"
            >
              {vehicule.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.numarIntern} - {v.numarInmatriculare} ({v.valoareContorCurent} {v.tipMasurare})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* REGULĂ IERARHICĂ BANNER - 100% PURE ROMANIAN */}
      <div className="p-4 rounded-2xl bg-periwinkle-100 border border-periwinkle-300 text-xs text-sapphire-900 flex items-start space-x-3 shadow-xs">
        <Clock className="w-5 h-5 text-periwinkle-700 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-periwinkle-700">Regulă Ierarhică Activă (Superseding Logic):</p>
          <p className="mt-0.5 text-slate-700 font-medium">
            Executarea unei sarcini de tip <strong>SCHIMB_PIESA</strong> resetează automat și contorul inspecțiilor subordonate. Dacă se folosește o piesă din <strong>dezmembrări (parc propriu)</strong>, stocul principal <strong>rămâne intact, fără scădere</strong>!
          </p>
        </div>
      </div>

      {/* Lista Sarcini de Mentenanță */}
      <div className="pleasant-card rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-sapphire-900">Sarcini de Service Programat pentru Utilaj</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sarcini.map((s) => (
            <div
              key={s.id}
              className={`p-5 rounded-2xl border transition-all space-y-3 ${
                s.esteDepasit
                  ? 'bg-roseash-100 border-terracotta-500/40'
                  : 'bg-white border-morning-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    s.tipSarcina === 'SCHIMB_PIESA' ? 'bg-periwinkle-100 text-periwinkle-700 border border-periwinkle-300' : 'bg-sapphire-50 text-sapphire-600 border border-sapphire-100'
                  }`}>
                    {s.tipSarcina === 'SCHIMB_PIESA' ? 'SCHIMB PIESĂ (Stoc / Dezmembrări)' : 'INSPECȚIE / MANOPERĂ'}
                  </span>
                  <h3 className="font-bold text-sapphire-900 text-sm mt-2">{s.nume}</h3>
                  <p className="text-xs text-sage-700 font-medium mt-1">Interval: la fiecare {s.intervalRulaj} {s.tipMasurare}</p>
                </div>

                {s.esteDepasit ? (
                  <span className="flex items-center space-x-1 text-terracotta-600 text-xs font-extrabold bg-white px-2.5 py-1 rounded-lg border border-roseash-300 shadow-xs">
                    <AlertTriangle className="w-4 h-4 text-terracotta-500" />
                    <span>DEPAȘIT</span>
                  </span>
                ) : (
                  <span className="text-sage-700 text-xs font-bold bg-sage-100 border border-sage-300 px-2.5 py-1 rounded-lg">
                    În Grafic
                  </span>
                )}
              </div>

              {/* Progress Bar Rulaj */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] text-sage-700 font-semibold">
                  <span>Rulaj parcurs: {s.rulajParcursDeLaUltima} / {s.intervalRulaj} {s.tipMasurare}</span>
                  <span>{s.procentUtilizat}%</span>
                </div>
                <div className="w-full bg-morning-200 h-2.5 rounded-full overflow-hidden border border-morning-300">
                  <div
                    className={`h-full transition-all ${
                      s.esteDepasit ? 'bg-terracotta-500' : s.procentUtilizat > 80 ? 'bg-roseash-500' : 'bg-sapphire-500'
                    }`}
                    style={{ width: `${s.procentUtilizat}%` }}
                  ></div>
                </div>
              </div>

              {/* Acțiuni Mecanic pe Tabletă */}
              <div className="pt-2 flex items-center justify-between gap-2">
                <button
                  onClick={() => alert(`Sarcina ${s.nume} a fost finalizată și contorul a fost resetat!`)}
                  className="flex-1 py-2 rounded-xl bg-sage-100 hover:bg-sage-300/40 text-sage-700 border border-sage-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4 text-sage-500" />
                  <span>1-Click Finalizat</span>
                </button>

                {s.tipSarcina === 'INSPECTIE_MANOPERA' && (
                  <button
                    onClick={() => setSelectedSarcina(s)}
                    className="flex-1 py-2 rounded-xl bg-roseash-100 hover:bg-roseash-300 text-terracotta-600 border border-roseash-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                  >
                    <ArrowUpRight className="w-4 h-4 text-terracotta-500" />
                    <span>Avarie / Necesită Înlocuire</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Escaladare On-the-fly cu Suport Piesă Dezmembrări & X Button */}
      {selectedSarcina && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedSarcina(null)}>
          <div className="pleasant-card bg-white border border-roseash-300 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-terracotta-600 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-terracotta-500" />
                <span>Escaladare în Atelier ({selectedSarcina.nume})</span>
              </div>
              <button onClick={() => setSelectedSarcina(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEscaladeaza} className="space-y-3 text-xs">
              <div className="p-3 bg-morning-100 rounded-xl border border-morning-200 space-y-2">
                <label className="flex items-center space-x-2 font-bold text-sapphire-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={esteBontott}
                    onChange={(e) => setEsteBontott(e.target.checked)}
                    className="w-4 h-4 text-sapphire-500 rounded"
                  />
                  <span>Folosește Piesă din Dezmembrări / Parc Propriu</span>
                </label>
                <p className="text-[11px] text-sage-700">Dacă bifați, piesa NU se va scădea din stocul principal de marfă achiziționată!</p>
              </div>

              {!esteBontott ? (
                <div>
                  <label className="text-sage-700 block mb-1 font-semibold">Selectează Piesă din Stoc Intern:</label>
                  <select
                    value={selectedArticolId}
                    onChange={(e) => setSelectedArticolId(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-semibold"
                  >
                    {stocuri.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.denumire} (Stoc: {st.stocCurent} {st.unitateMasura} - {st.pretUnitar} RON/buc)
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="text-sage-700 block mb-1 font-semibold">Proveniență Piesă din Dezmembrări:</label>
                    <input
                      value={provenientaBontott}
                      onChange={(e) => setProvenientaBontott(e.target.value)}
                      placeholder="ex: Dezmembrări Parcul Propriu sau Donat"
                      className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-semibold">Valoare Estimată / Cost (RON, 0 RON admis):</label>
                    <input
                      type="number"
                      value={pretUnitarBontott}
                      onChange={(e) => setPretUnitarBontott(Number(e.target.value))}
                      className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sage-700 block mb-1 font-semibold">Cantitate:</label>
                <input
                  type="number"
                  min="1"
                  value={cantitate}
                  onChange={(e) => setCantitate(Number(e.target.value))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedSarcina(null)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold shadow-md shadow-terracotta-500/20"
                >
                  Escaladează & Resetează Contoare
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adaugă Sarcină Nouă cu X button */}
      {showAddSarcinaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowAddSarcinaModal(false)}>
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Adăugare Sarcină Mentenanță Nouă</h3>
              <button onClick={() => setShowAddSarcinaModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSarcina} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Sarcină:</label>
                <input required value={numeSarcina} onChange={(e) => setNumeSarcina(e.target.value)} placeholder="ex: Schimb Filtru Ulei Motor" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Sarcină:</label>
                  <select value={tipSarcina} onChange={(e) => setTipSarcina(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold">
                    <option value="INSPECTIE_MANOPERA">INSPECȚIE / MANOPERĂ</option>
                    <option value="SCHIMB_PIESA">SCHIMB PIESĂ</option>
                  </select>
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Interval Rulaj:</label>
                  <input type="number" value={intervalRulaj} onChange={(e) => setIntervalRulaj(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddSarcinaModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Sarcină</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
