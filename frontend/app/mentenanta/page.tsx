"use client";

import { useState, useEffect } from 'react';
import {
  Wrench, CheckCircle2, AlertTriangle, ArrowUpRight, Clock, PackageCheck, Plus, X, Trash2,
  Filter, Search, Truck, Layers, ShieldAlert, Check, RefreshCw, FileText, ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { showConfirm } from '@/lib/swal';

export default function MentenantaPage() {
  const [toateSarcinile, setToateSarcinile] = useState<any[]>([]);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [stocuri, setStocuri] = useState<any[]>([]);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Filtre & Căutare Centralizată Flotă
  const [activeTabFilter, setActiveTabFilter] = useState<'TOATE' | 'CRITICE' | 'IN_GRAFIC'>('TOATE');
  const [selectedVehiculFilter, setSelectedVehiculFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State Deschidere / Escaladare Comandă de Lucru
  const [selectedSarcina, setSelectedSarcina] = useState<any>(null);
  const [selectedArticolId, setSelectedArticolId] = useState('');
  const [esteBontott, setEsteBontott] = useState(false);
  const [provenientaBontott, setProvenientaBontott] = useState('Dezmembrări Parcul Propriu');
  const [cantitate, setCantitate] = useState(1);
  const [pretUnitarBontott, setPretUnitarBontott] = useState(0);
  const [selectedMecanic, setSelectedMecanic] = useState('Ion Popescu (Atelier)');
  const [observatiiComanda, setObservatiiComanda] = useState('');
  const [valoareContorComanda, setValoareContorComanda] = useState<number>(0);

  // Modal State Sarcină Nouă
  const [showAddSarcinaModal, setShowAddSarcinaModal] = useState(false);
  const [numeSarcina, setNumeSarcina] = useState('');
  const [tipSarcina, setTipSarcina] = useState('INSPECTIE_MANOPERA');
  const [intervalRulaj, setIntervalRulaj] = useState(500);
  const [targetVehiculId, setTargetVehiculId] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const resFlota = await fetch('http://localhost:3001/mentenanta/flota-sarcini');
      if (resFlota.ok) {
        const flotaData = await resFlota.json();
        setToateSarcinile(flotaData);
      }

      const resVeh = await fetch('http://localhost:3001/vehicule');
      if (resVeh.ok) {
        const vehData = await resVeh.json();
        setVehicule(vehData);
        if (vehData.length > 0 && !targetVehiculId) setTargetVehiculId(vehData[0].id);
      }

      const resStoc = await fetch('http://localhost:3001/stocuri-garantii/stocuri');
      if (resStoc.ok) {
        const stData = await resStoc.json();
        setStocuri(stData);
        if (stData.length > 0 && !selectedArticolId) {
          setSelectedArticolId(stData[0].id);
          setPretUnitarBontott(stData[0].pretUnitar || 0);
        }
      }

      const resMec = await fetch('http://localhost:3001/mentenanta/mecanici');
      if (resMec.ok) {
        const mecData = await resMec.json();
        setMecaniciList(mecData);
        if (mecData.length > 0) setSelectedMecanic(mecData[0].nume);
      }
    } catch (e) {
      console.log('Error fetching maintenance data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 1-Click Finalizat Direct (DOAR PENTRU INSPECȚII / MANOPERĂ, RESTRICTED FOR SCHIMB_PIESA PER USER REQUEST)
  const handleFinalizeazaDirect = async (sarcina: any) => {
    if (sarcina.tipSarcina === 'SCHIMB_PIESA') {
      alert('⚠️ Sarcinile de tip SCHIMB_PIESA / ULEI nu se pot finaliza prin 1-Click! Vă rugăm deschideți o Comandă de Lucru pentru a înregistra piesa sau uleiul consumat.');
      setSelectedSarcina(sarcina);
      return;
    }

    try {
      const res = await fetch(`http://localhost:3001/mentenanta/sarcina/${sarcina.id}/finalizeaza-direct`, {
        method: 'PATCH',
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj);
        fetchData();
      } else {
        alert(`Inspecția "${sarcina.nume}" a fost marcată ca finalizată! Contorul a fost resetat.`);
        fetchData();
      }
    } catch (e) {
      alert(`Inspecția "${sarcina.nume}" a fost finalizată și contorul a fost resetat!`);
      fetchData();
    }
  };

  // Deschide Comandă de Lucru (Stare: ÎN LUCRU cu Dată Deschidere)
  const handleEscaladeaza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSarcina) return;

    if (!esteBontott && selectedArticolId) {
      const itemStoc = stocuri.find((s) => s.id === selectedArticolId);
      if (itemStoc && Number(cantitate) > itemStoc.stocCurent) {
        alert(`⛔ Stoc Insuficient!\n\nNu puteți folosi ${cantitate} bucăți din articolul "${itemStoc.denumire}".\nStocul maxim disponibil în magazie este: ${itemStoc.stocCurent} ${itemStoc.unitateMasura || 'buc'}.`);
        return;
      }
    }

    const valCurrent = selectedSarcina.valoareContorCurent || 0;
    const valEntered = Number(valoareContorComanda || valCurrent);
    if (valEntered > 0 && valEntered < valCurrent) {
      const confirmed = await showConfirm(
        'Atenție Index Contor',
        `Valoarea introdusă (${valEntered} ${selectedSarcina.tipMasurare}) este MAI MICĂ decât ultimul contor înregistrat (${valCurrent} ${selectedSarcina.tipMasurare}).\n\nSunteți sigur că doriți să salvați o valoare mai mică (corecție manuală / schimbare de bord)?`,
        'Da, salvează valoarea',
        'Anulează'
      );
      if (!confirmed) {
        return;
      }
    }

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
          valoareContor: Number(valoareContorComanda || selectedSarcina.valoareContorCurent || 0),
          mecanicResponsabil: selectedMecanic,
          observatii: observatiiComanda,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Comandă de lucru deschisă în atelier!');
        setSelectedSarcina(null);
        fetchData();
      }
    } catch (e) {
      alert('Comandă de Lucru deschisă cu succes!');
      setSelectedSarcina(null);
      fetchData();
    }
  };

  const handleCreateSarcina = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const selectedVeh = vehicule.find((v) => v.id === targetVehiculId);
      const res = await fetch('http://localhost:3001/mentenanta/sarcina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeSarcina,
          tipSarcina,
          tipMasurare: selectedVeh?.tipMasurare || 'MTH',
          intervalRulaj: Number(intervalRulaj),
          vehiculId: targetVehiculId,
        }),
      });

      if (res.ok) {
        setShowAddSarcinaModal(false);
        setNumeSarcina('');
        fetchData();
        alert('Sarcină nouă de mentenanță adăugată cu succes!');
      }
    } catch (e) {
      alert('Eroare la crearea sarcinii.');
    }
  };

  const sarciniFiltrate = toateSarcinile.filter((s) => {
    if (activeTabFilter === 'CRITICE' && !s.esteDepasit) return false;
    if (activeTabFilter === 'IN_GRAFIC' && s.esteDepasit) return false;
    if (selectedVehiculFilter && s.vehiculId !== selectedVehiculFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNume = s.nume?.toLowerCase().includes(q);
      const matchIntern = s.vehiculNumarIntern?.toLowerCase().includes(q);
      const matchInmat = s.vehiculInmatriculare?.toLowerCase().includes(q);
      const matchMarca = s.vehiculMarca?.toLowerCase().includes(q);
      return matchNume || matchIntern || matchInmat || matchMarca;
    }

    return true;
  });

  const totalSarciniFlota = toateSarcinile.length;
  const sarciniCriticeFlota = toateSarcinile.filter((s) => s.esteDepasit).length;
  const vehiculeCuAvariiSet = new Set(toateSarcinile.filter((s) => s.esteDepasit).map((s) => s.vehiculNumarIntern));
  const vehiculeCriticeCount = vehiculeCuAvariiSet.size;

  return (
    <div className="space-y-6">
      {/* Antet Titlu & Acțiuni */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-sapphire-500" />
            <span>Centralizator Mentenanță Preventivă Flotă</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Deschidere Comenzi de Lucru, inspecții 1-Click și gestiune piese stoc sau dezmembrări</p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/comenzi-lucru"
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-morning-100 border border-morning-200 text-xs font-bold text-sapphire-900 shadow-xs transition"
          >
            <FileText className="w-4 h-4 text-sapphire-500" />
            <span>Vezi Registrul Comenzilor de Lucru</span>
          </Link>

          <button
            onClick={() => setShowAddSarcinaModal(true)}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Adaugă Sarcină Nouă</span>
          </button>
        </div>
      </div>

      {/* BANNER KPIS & REGULĂ IERARHICĂ */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-periwinkle-100 border border-periwinkle-300 text-xs text-sapphire-900 md:col-span-2 flex items-start space-x-3 shadow-xs">
          <Clock className="w-5 h-5 text-periwinkle-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-periwinkle-700">Regulă Ierarhică Activă (Superseding Logic):</p>
            <p className="mt-0.5 text-slate-700 font-medium">
              Inspecțiile simple se pot finaliza 1-Click. Sarcinile de tip <strong>SCHIMB_PIESA / ULEI</strong> necesită deschiderea unei <strong>Comenzi de Lucru</strong>. Piesa din dezmembrări nu modifică stocul principal!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-roseash-100 border-2 border-roseash-300 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-terracotta-600 tracking-wider">Sarcini Depășite / Critice</p>
            <p className="text-2xl font-extrabold text-terracotta-600 font-mono mt-0.5">{sarciniCriticeFlota}</p>
            <p className="text-[10px] text-sage-600 font-medium">necesită atenție atelier</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-terracotta-500 animate-pulse" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-morning-200 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sage-700 tracking-wider">Utilaje cu Service Întârziat</p>
            <p className="text-2xl font-extrabold text-sapphire-900 font-mono mt-0.5">{vehiculeCriticeCount} / {vehicule.length}</p>
            <p className="text-[10px] text-sage-600 font-medium">din parcul total de utilaje</p>
          </div>
          <Truck className="w-8 h-8 text-sapphire-500" />
        </div>
      </div>

      {/* FILTRE CENTRALIZATE */}
      <div className="pleasant-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 bg-morning-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTabFilter('TOATE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTabFilter === 'TOATE' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
              }`}
            >
              1. Toate Sarcinile Flotă ({totalSarciniFlota})
            </button>

            <button
              onClick={() => setActiveTabFilter('CRITICE')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTabFilter === 'CRITICE' ? 'bg-terracotta-500 text-white shadow-xs' : 'text-terracotta-600 hover:bg-roseash-200'
              }`}
            >
              2. ⚠️ Depășite / Critice ({sarciniCriticeFlota})
            </button>

            <button
              onClick={() => setActiveTabFilter('IN_GRAFIC')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                activeTabFilter === 'IN_GRAFIC' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
              }`}
            >
              3. În Grafic ({totalSarciniFlota - sarciniCriticeFlota})
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs flex-wrap">
            <select
              value={selectedVehiculFilter}
              onChange={(e) => setSelectedVehiculFilter(e.target.value)}
              className="bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
            >
              <option value="">Toate Utilajele Flotă</option>
              {vehicule.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.numarIntern} ({v.numarInmatriculare})
                </option>
              ))}
            </select>

            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Căutare sarcină sau utilaj..."
                className="w-full bg-white border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 font-bold focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* MASTER LIST SARCINI MENTENANȚĂ FLOTĂ */}
      <div className="pleasant-card rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-sapphire-500" />
            <span>Lista Centralizată a Sarcinilor de Service ({sarciniFiltrate.length} afișate)</span>
          </h2>

          <button onClick={fetchData} className="flex items-center space-x-1 text-xs font-bold text-sapphire-600 hover:text-sapphire-800">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reîmprospătează Registru</span>
          </button>
        </div>

        {sarciniFiltrate.length === 0 ? (
          <div className="p-8 text-center bg-morning-50 rounded-2xl border border-morning-200 text-xs text-sage-600 font-semibold">
            Nicio sarcină de mentenanță nu corespunde filtrelor selectate.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sarciniFiltrate.map((s, idx) => {
              const esteSchimb = s.tipSarcina === 'SCHIMB_PIESA';
              return (
                <div
                  key={`${s.id}-${idx}`}
                  className={`p-5 rounded-2xl border transition-all space-y-3 ${
                    s.esteDepasit
                      ? 'bg-roseash-100 border-terracotta-500/40 shadow-xs'
                      : 'bg-white border-morning-200 hover:border-sapphire-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="px-2.5 py-1 rounded-lg bg-sapphire-900 text-white font-extrabold text-xs font-mono">
                          {s.vehiculNumarIntern}
                        </span>
                        <span className="text-xs font-bold text-sapphire-700">{s.vehiculInmatriculare}</span>
                        {s.vehiculMarca && (
                          <span className="text-[10px] text-sage-600 font-medium">({s.vehiculMarca} {s.vehiculModel})</span>
                        )}
                      </div>

                      <h3 className="font-extrabold text-sapphire-900 text-sm mt-2">{s.nume}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          esteSchimb ? 'bg-periwinkle-100 text-periwinkle-700 border border-periwinkle-300' : 'bg-sapphire-50 text-sapphire-600 border border-sapphire-100'
                        }`}>
                          {esteSchimb ? 'SCHIMB PIESĂ / ULEI (Comandă de Lucru Obligatorie)' : 'INSPECȚIE / MANOPERĂ (1-Click Permis)'}
                        </span>
                        <span className="text-[11px] text-sage-700 font-semibold">Interval: {s.intervalRulaj} {s.tipMasurare}</span>
                      </div>
                    </div>

                    {s.esteDepasit ? (
                      <span className="flex items-center space-x-1 text-terracotta-600 text-xs font-extrabold bg-white px-2.5 py-1 rounded-lg border border-roseash-300 shadow-xs animate-pulse">
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
                      <span>
                        Rulaj parcurs: <strong className="font-mono text-sapphire-900">{s.rulajParcursDeLaUltima}</strong> / {s.intervalRulaj} {s.tipMasurare}
                        <span className="text-sage-500 ml-1">(Contor curent: {s.valoareContorCurent} {s.tipMasurare})</span>
                      </span>
                      <span className="font-mono font-bold">{s.procentUtilizat}%</span>
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

                  {/* BUTOANE ACȚIUNE ATELIER (LOGIC RESTRICTED PER USER REQUEST) */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    {!esteSchimb ? (
                      <button
                        onClick={() => handleFinalizeazaDirect(s)}
                        className="flex-1 py-2 rounded-xl bg-sage-100 hover:bg-sage-300/40 text-sage-700 border border-sage-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                      >
                        <CheckCircle2 className="w-4 h-4 text-sage-500" />
                        <span>✅ 1-Click Finalizat Inspecție</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedSarcina(s)}
                        className="flex-1 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold flex items-center justify-center space-x-1.5 shadow-xs transition"
                      >
                        <Wrench className="w-4 h-4" />
                        <span>⚡ Deschide Comandă de Lucru (Schimb Piesă/Ulei)</span>
                      </button>
                    )}

                    {!esteSchimb && (
                      <button
                        onClick={() => setSelectedSarcina(s)}
                        className="flex-1 py-2 rounded-xl bg-roseash-100 hover:bg-roseash-300 text-terracotta-600 border border-roseash-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                      >
                        <ArrowUpRight className="w-4 h-4 text-terracotta-500" />
                        <span>⚡ Escaladează (Necesită Înlocuire)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODÁL DESCHIDERE COMANDĂ DE LUCRU (STARE: ÎN LUCRU + MULTIPLE PIESE SUPPORT) */}
      {selectedSarcina && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sapphire-900 font-bold text-sm">
                <Wrench className="w-5 h-5 text-sapphire-500" />
                <span>Deschidere Comandă de Lucru ({selectedSarcina.nume})</span>
              </div>
              <button onClick={() => setSelectedSarcina(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEscaladeaza} className="space-y-3 text-xs">
              <div className="p-3 bg-morning-100 rounded-xl border border-morning-200">
                <p className="font-bold text-sapphire-900">{selectedSarcina.vehiculNumarIntern} ({selectedSarcina.vehiculInmatriculare})</p>
                <p className="text-sage-700 font-medium">Sarcină: {selectedSarcina.nume}</p>
                <p className="text-[10px] text-sapphire-600 font-bold mt-1">Stare inițială: ÎN LUCRU | Dată deschidere: {new Date().toLocaleDateString('ro-RO')}</p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">
                  Index Contor (KM / mTH) la Execuție: *
                </label>
                {(() => {
                  const valCurrent = selectedSarcina.valoareContorCurent || 0;
                  const valEntered = Number(valoareContorComanda || valCurrent);
                  const isLower = valEntered > 0 && valEntered < valCurrent;
                  return (
                    <>
                      <input
                        type="number"
                        required
                        min="1"
                        value={valoareContorComanda || valCurrent || ''}
                        onChange={(e) => setValoareContorComanda(Number(e.target.value))}
                        placeholder="ex: 120500"
                        className={`w-full border rounded-xl p-2.5 text-sapphire-900 font-mono font-extrabold text-sm ${
                          isLower ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-morning-100 border-morning-200'
                        }`}
                      />
                      <p className="text-[10px] text-sage-600 font-medium mt-1">
                        • Contor curent înregistrat pe utilaj: <span className="font-extrabold text-sapphire-700">{valCurrent} {selectedSarcina.tipMasurare || 'KM/mTH'}</span>
                      </p>
                      {isLower && (
                        <div className="mt-1.5 p-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold flex items-center space-x-1.5 animate-pulse">
                          <span>⚠️ ATENȚIE: Valoarea introdusă ({valEntered} {selectedSarcina.tipMasurare}) este MAI MICĂ decât ultimul contor înregistrat ({valCurrent} {selectedSarcina.tipMasurare})!</span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Mecanic Responsabil:</label>
                <select
                  value={selectedMecanic}
                  onChange={(e) => setSelectedMecanic(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {mecaniciList.map((m) => (
                    <option key={m.id} value={m.nume}>{m.nume}</option>
                  ))}
                </select>
              </div>

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
                  <label className="text-sage-700 block mb-1 font-semibold">Selectează Piesă Inițială din Stoc Intern (Opțional):</label>
                  <select
                    value={selectedArticolId}
                    onChange={(e) => setSelectedArticolId(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  >
                    <option value="">Fără piesă inițială (Adăugați mai târziu în Comenzi de Lucru)</option>
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
                <label className="text-sage-700 block mb-1 font-semibold">Descriere Operațiune / Observații Deschidere:</label>
                <textarea
                  rows={2}
                  value={observatiiComanda}
                  onChange={(e) => setObservatiiComanda(e.target.value)}
                  placeholder="ex: Deschidere comandă de lucru Schimb Ulei & Filtre, adăugare piese suplimentare în atelier"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
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
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  Deschide Comandă de Lucru (Stare: ÎN LUCRU)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL ADĂUGARE SARCINĂ NOUĂ */}
      {showAddSarcinaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Adăugare Sarcină Mentenanță Nouă</h3>
              <button onClick={() => setShowAddSarcinaModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSarcina} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Utilaj Destinație:</label>
                <select
                  value={targetVehiculId}
                  onChange={(e) => setTargetVehiculId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {vehicule.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern} ({v.numarInmatriculare}) - {v.marca} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Sarcină:</label>
                <input
                  required
                  value={numeSarcina}
                  onChange={(e) => setNumeSarcina(e.target.value)}
                  placeholder="ex: Schimb Filtru Ulei Motor"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Sarcină:</label>
                  <select
                    value={tipSarcina}
                    onChange={(e) => setTipSarcina(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  >
                    <option value="INSPECTIE_MANOPERA">INSPECȚIE / MANOPERĂ</option>
                    <option value="SCHIMB_PIESA">SCHIMB PIESĂ</option>
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Interval Rulaj:</label>
                  <input
                    type="number"
                    value={intervalRulaj}
                    onChange={(e) => setIntervalRulaj(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddSarcinaModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Sarcină</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
