"use client";

import { useState, useEffect } from 'react';
import {
  CircleDot, AlertTriangle, RefreshCw, Ruler, BarChart2, Repeat, Layers, Search, Plus,
  CheckCircle2, X, ArrowLeftRight, Wrench, ShieldAlert, History, Calendar, UserCheck, Trash2, Truck, ChevronDown, Check, Settings
} from 'lucide-react';
import VehicleSelector from '@/components/VehicleSelector';

export default function AnvelopePage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [hartaAxe, setHartaAxe] = useState<any>(null);
  const [flotaAnvelope, setFlotaAnvelope] = useState<any[]>([]);
  const [tcoBrands, setTcoBrands] = useState<any[]>([]);
  const [istoricPermutari, setIstoricPermutari] = useState<any[]>([]);
  const [stocAnvelope, setStocAnvelope] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<'harta' | 'flota' | 'istoric' | 'tco'>('harta');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State Configurare Axe
  const [showConfigAxeModal, setShowConfigAxeModal] = useState(false);
  const [editModConfigurareAxe, setEditModConfigurareAxe] = useState<'AUTOMAT' | 'MANUAL'>('AUTOMAT');
  const [editRotiPerAxList, setEditRotiPerAxList] = useState<number[]>([2, 4]);

  // Modal State Picker Flotă (Scalabil 1-500 Utilaje)
  const [showFleetPickerModal, setShowFleetPickerModal] = useState(false);
  const [searchQueryFleet, setSearchQueryFleet] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');

  // Modal State Masurare
  const [selectedPozitie, setSelectedPozitie] = useState<any>(null);
  const [adancimeMm, setAdancimeMm] = useState(12);

  // Permutare Directă 2 Poziții (Rotire Vizuală)
  const [pozitieA, setPozitieA] = useState<any>(null);
  const [pozitieB, setPozitieB] = useState<any>(null);
  const [showPermutareModal, setShowPermutareModal] = useState(false);
  const [permutareData, setPermutareData] = useState(new Date().toISOString().split('T')[0]);
  const [permutareOperator, setPermutareOperator] = useState('Mihai Popa (Șef Atelier)');
  const [permutareObservatii, setPermutareObservatii] = useState('');
  const [permutareValoareContor, setPermutareValoareContor] = useState<number>(0);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);

  // Modal State Înregistrare Anvelopă Nouă sau Folosită
  const [showAddAnvelopaModal, setShowAddAnvelopaModal] = useState(false);
  const [modalMountMode, setModalMountMode] = useState<'NOUA' | 'DIN_STOC'>('NOUA');
  const [selectedAnvelopaDinStocId, setSelectedAnvelopaDinStocId] = useState('');
  const [newCodDot, setNewCodDot] = useState('DOT-2026');
  const [newSerie, setNewSerie] = useState('');
  const [newMarca, setNewMarca] = useState('Michelin');
  const [newModel, setNewModel] = useState('X-Multi Z');
  const [newDimensiune, setNewDimensiune] = useState('315/80 R22.5');
  const [newAdancimeInitiala, setNewAdancimeInitiala] = useState(16);
  const [newAdancimeCurenta, setNewAdancimeCurenta] = useState(14);
  const [newPretAchizitie, setNewPretAchizitie] = useState(1850);
  
  // Selecție Axă & Poziție per Vehicul
  const [selectedVehiculForAdd, setSelectedVehiculForAdd] = useState('');
  const [selectedAxNumar, setSelectedAxNumar] = useState<number | ''>('');
  const [newMountPositionId, setNewMountPositionId] = useState('');
  const [actiuneAnvelopaVeche, setActiuneAnvelopaVeche] = useState<'DEMONTARE_IN_STOC' | 'CASARE_STOC'>('DEMONTARE_IN_STOC');

  const fetchVehicule = async () => {
    try {
      const res = await fetch('http://localhost:3001/vehicule');
      if (res.ok) {
        const data = await res.json();
        setVehicule(data);
        if (data.length > 0) {
          if (!selectedId) setSelectedId(data[0].id);
          if (!selectedVehiculForAdd) setSelectedVehiculForAdd(data[0].id);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  const fetchHartaAxe = async (vId: string) => {
    if (!vId) return;
    try {
      const res = await fetch(`http://localhost:3001/anvelope/harta-axe/${vId}`);
      if (res.ok) setHartaAxe(await res.json());
    } catch (e) {
      console.log(e);
    }
  };

  const fetchFlotaAnvelope = async () => {
    try {
      const res = await fetch('http://localhost:3001/anvelope/flota-anvelope');
      if (res.ok) setFlotaAnvelope(await res.json());

      const resStoc = await fetch('http://localhost:3001/anvelope/stoc');
      if (resStoc.ok) setStocAnvelope(await resStoc.json());
    } catch (e) {
      console.log(e);
    }
  };

  const fetchIstoricPermutari = async () => {
    try {
      const res = await fetch('http://localhost:3001/anvelope/istoric-permutari');
      if (res.ok) setIstoricPermutari(await res.json());
    } catch (e) {
      console.log(e);
    }
  };

  const fetchTCO = async () => {
    try {
      const res = await fetch('http://localhost:3001/anvelope/comparatie-tco');
      if (res.ok) setTcoBrands(await res.json());
    } catch (e) {
      console.log(e);
    }
  };

  const fetchMecanici = async () => {
    try {
      const res = await fetch('http://localhost:3001/mentenanta/mecanici');
      if (res.ok) {
        const data = await res.json();
        setMecaniciList(data);
        if (data.length > 0) setPermutareOperator(data[0].nume);
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchVehicule();
    fetchFlotaAnvelope();
    fetchIstoricPermutari();
    fetchTCO();
    fetchMecanici();
  }, []);

  useEffect(() => {
    if (selectedId) fetchHartaAxe(selectedId);
  }, [selectedId]);

  const handleSalveazaMasurare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPozitie) return;

    if (!selectedPozitie.anvelopa) {
      alert(`Poziția ${selectedPozitie.codPozitie} este liberă! Vă rugăm înregistrați / montați o anvelopă pe această poziție.`);
      setSelectedVehiculForAdd(selectedId);
      setSelectedAxNumar(selectedPozitie.numarAx);
      setNewMountPositionId(selectedPozitie.id);
      setSelectedPozitie(null);
      setShowAddAnvelopaModal(true);
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/anvelope/masurare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anvelopaId: selectedPozitie.anvelopa.id,
          adancimeProfilMm: Number(adancimeMm),
          valoareContor: hartaAxe?.valoareContorCurent || 10000,
          tehnician: 'Mecanic Șef Flotă',
        }),
      });

      if (res.ok) {
        alert('✅ Măsurătoarea adâncimii a fost salvată cu succes!');
        setSelectedPozitie(null);
        fetchHartaAxe(selectedId);
        fetchFlotaAnvelope();
      } else {
        alert('Eroare la salvarea măsurătorii.');
      }
    } catch (e) {
      alert('Eroare la salvarea măsurătorii.');
    }
  };

  const handleExecutaPermutare = async () => {
    if (!pozitieA || !pozitieB) return;
    try {
      const res = await fetch('http://localhost:3001/anvelope/permuta-doua-pozitii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedId,
          pozitieAId: pozitieA.id,
          pozitieBId: pozitieB.id,
          valoareContor: Number(permutareValoareContor || hartaAxe?.valoareContorCurent || 0),
          operator: permutareOperator,
          dataPermutare: permutareData,
          observatii: permutareObservatii,
        }),
      });

      if (res.ok) {
        alert(`✅ Permutarea directă între pozițiile ${pozitieA.codPozitie} ↔️ ${pozitieB.codPozitie} a fost înregistrată cu succes în registrul de audit!`);
        setShowPermutareModal(false);
        setPozitieA(null);
        setPozitieB(null);
        setPermutareObservatii('');
        fetchHartaAxe(selectedId);
        fetchIstoricPermutari();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la realizarea permutării.');
    }
  };

  const handleOpenConfigAxeModal = () => {
    const targetAxe = hartaAxe?.pozitiiAxe || currentVehicul?.pozitiiAxe || [];
    if (targetAxe.length > 0) {
      const axeMap = new Map<number, number>();
      targetAxe.forEach((p: any) => {
        const axNum = p.numarAx || 1;
        axeMap.set(axNum, (axeMap.get(axNum) || 0) + 1);
      });
      const sortedAxNums = Array.from(axeMap.keys()).sort((a, b) => a - b);
      const list = sortedAxNums.map(num => axeMap.get(num) || 2);
      setEditRotiPerAxList(list.length > 0 ? list : [2, 4]);
      setEditModConfigurareAxe('MANUAL');
    } else {
      setEditRotiPerAxList([2, 4]);
      setEditModConfigurareAxe('AUTOMAT');
    }
    setShowConfigAxeModal(true);
  };

  const handleSaveConfigAxe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      alert('Vă rugăm să selectați un utilaj mai întâi.');
      return;
    }
    const payloadManual = editModConfigurareAxe === 'MANUAL'
      ? editRotiPerAxList.map((roti, idx) => ({ numarAx: idx + 1, numarRoti: roti }))
      : undefined;

    try {
      const res = await fetch(`http://localhost:3001/vehicule/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          configuratieManualAxe: payloadManual,
          regenerareAxe: editModConfigurareAxe === 'AUTOMAT',
        }),
      });

      if (res.ok) {
        alert('✅ Configurația axelor și a roților a fost actualizată cu succes!');
        setShowConfigAxeModal(false);
        fetchVehicule();
        fetchHartaAxe(selectedId);
      } else {
        alert('Nu s-a putut actualiza configurația axelor.');
      }
    } catch (e) {
      alert('Eroare la actualizarea axelor.');
    }
  };

  const handleCreateAnvelopa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerie) {
      alert('Vă rugăm introduceți seria unică a anvelopei!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/anvelope/inregistreaza-anvelopa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serieAnvelopa: newSerie,
          codDot: newCodDot,
          marca: newMarca,
          model: newModel,
          dimensiune: newDimensiune,
          adancimeInitialaMm: Number(newAdancimeInitiala),
          adancimeCurentaMm: Number(newAdancimeCurenta),
          pretAchizitie: Number(newPretAchizitie),
          vehiculId: selectedVehiculForAdd || selectedId,
          pozitieAxId: newMountPositionId || undefined,
          actiuneAnvelopaVeche,
          operator: 'Mecanic Șef Flotă',
        }),
      });

      if (res.ok) {
        alert('Anvelopa a fost înregistrată și montată cu succes pe pozitia selectată!');
        setShowAddAnvelopaModal(false);
        setNewSerie('');
        setNewMountPositionId('');
        setSelectedAxNumar('');
        fetchHartaAxe(selectedId);
        fetchFlotaAnvelope();
        fetchIstoricPermutari();
      } else {
        const err = await res.json();
        alert(`Eroare la înregistrare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la salvarea anvelopei.');
    }
  };

  const handleMonteazaDinStoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnvelopaDinStocId) {
      alert('Vă rugăm să selectați o anvelopă din stoc!');
      return;
    }
    if (!newMountPositionId) {
      alert('Vă rugăm să selectați o poziție de montaj pe șasiu!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/anvelope/monteaza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anvelopaId: selectedAnvelopaDinStocId,
          pozitieAxId: newMountPositionId,
          actiuneAnvelopaVeche,
          operator: 'Operator Atelier Flotă',
        }),
      });

      if (res.ok) {
        alert('✅ Anvelopa din stoc a fost montată pe vehicul! Stocul a fost actualizat.');
        setShowAddAnvelopaModal(false);
        setSelectedAnvelopaDinStocId('');
        fetchHartaAxe(selectedId);
        fetchFlotaAnvelope();
        fetchIstoricPermutari();
      } else {
        const err = await res.json();
        alert(`Eroare la montare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la montarea anvelopei din stoc.');
    }
  };

  const handleDemonteazaInStoc = async (anvelopaId: string) => {
    if (!confirm('Sigur doriți să demontați această anvelopă și să o treceți în stocul de rezervă?')) return;
    try {
      const res = await fetch(`http://localhost:3001/anvelope/demonteaza-in-stoc/${anvelopaId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valoareContor: hartaAxe?.valoareContorCurent || 0,
          operator: 'Operator Atelier Flotă',
        }),
      });
      if (res.ok) {
        alert('Anvelopa a fost demontată și transferată în stocul de rezervă!');
        fetchHartaAxe(selectedId);
        fetchFlotaAnvelope();
        fetchIstoricPermutari();
      }
    } catch (e) {
      alert('Eroare la demontarea anvelopei.');
    }
  };

  const getStatusColor = (anvelopa: any) => {
    if (!anvelopa) return 'bg-morning-100 border-morning-300 text-sage-600';
    const mm = anvelopa.adancimeCurentaMm;
    if (mm > 10) return 'bg-sage-100 border-sage-400 text-sage-900 font-extrabold';
    if (mm > 5) return 'bg-periwinkle-100 border-periwinkle-400 text-periwinkle-900 font-extrabold';
    return 'bg-roseash-200 border-terracotta-500 text-terracotta-900 font-extrabold animate-pulse';
  };

  const vehiculeFiltrate = vehicule.filter((v) => {
    const matchCat = selectedCatFilter ? v.categorieEnum === selectedCatFilter : true;
    if (searchQueryFleet) {
      const q = searchQueryFleet.toLowerCase();
      const matchSearch = v.numarIntern?.toLowerCase().includes(q) || v.numarInmatriculare?.toLowerCase().includes(q) || v.marca?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    }
    return matchCat;
  });

  const [modalHartaAxe, setModalHartaAxe] = useState<any>(null);

  useEffect(() => {
    if (selectedVehiculForAdd) {
      fetch(`http://localhost:3001/anvelope/harta-axe/${selectedVehiculForAdd}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setModalHartaAxe(data);
        })
        .catch(console.error);
    }
  }, [selectedVehiculForAdd, showAddAnvelopaModal]);

  const categoriiDisponibile = Array.from(new Set(vehicule.map((v) => v.categorieEnum)));
  const currentVehicul = vehicule.find((v) => v.id === selectedId);

  const targetVehiculObj = vehicule.find((v) => v.id === selectedVehiculForAdd);
  const targetPozitii = (modalHartaAxe?.vehiculId === selectedVehiculForAdd && modalHartaAxe?.pozitiiAxe?.length > 0)
    ? modalHartaAxe.pozitiiAxe
    : (targetVehiculObj?.pozitiiAxe && targetVehiculObj.pozitiiAxe.length > 0)
      ? targetVehiculObj.pozitiiAxe
      : (hartaAxe?.vehiculId === selectedVehiculForAdd && hartaAxe?.pozitiiAxe)
        ? hartaAxe.pozitiiAxe
        : [];
  const axeDisponibile = Array.from(new Set(targetPozitii.map((p: any) => p.numarAx))).sort((a: any, b: any) => a - b);
  const pozitiiFiltratePeAx = selectedAxNumar !== '' 
    ? targetPozitii.filter((p: any) => p.numarAx === Number(selectedAxNumar))
    : targetPozitii;

  const targetSelectedPositionObj = targetPozitii.find((p: any) => p.id === newMountPositionId);
  const estePozitieOcupata = targetSelectedPositionObj && targetSelectedPositionObj.anvelopa;

  return (
    <div className="space-y-6">
      {/* Antet Titlu & Acțiuni */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <CircleDot className="w-6 h-6 text-sapphire-500" />
            <span>Harta Vizuală a Axelor & Management Anvelope</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Permutări vizuale, istoric complet de mutări cu km/mTH și audit istoric</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenConfigAxeModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold shadow-xs transition"
          >
            <Settings className="w-4 h-4 text-sapphire-500" />
            <span>⚙️ Configurează Axe & Roți</span>
          </button>

          <button
            onClick={() => {
              setSelectedVehiculForAdd(selectedId);
              setShowAddAnvelopaModal(true);
            }}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Înregistrează Anvelopă (Selectează Axă)</span>
          </button>

          {pozitieA && pozitieB && (
            <button
              onClick={() => setShowPermutareModal(true)}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white text-xs font-bold shadow-md shadow-terracotta-500/20 transition animate-pulse"
            >
              <ArrowLeftRight className="w-4 h-4" />
              <span>🔄 Execută Permutare între {pozitieA.codPozitie} ↔️ {pozitieB.codPozitie}</span>
            </button>
          )}
        </div>
      </div>

      {/* SELECTOR SCALABIL COMPACT (COMPACT 1-LINE BAR FOR 1 TO 500+ VEHICLES) */}
      <VehicleSelector
        selectedId={selectedId}
        onSelect={(v) => setSelectedId(v.id)}
        vehicule={vehicule}
      />

      {/* TAB-URI MODUL ANVELOPE */}
      <div className="pleasant-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2 bg-morning-100 p-1.5 rounded-xl">
            <button
              onClick={() => setActiveTab('harta')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'harta' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
              }`}
            >
              1. Harta Vizuală Diagramă Șasiu
            </button>

            <button
              onClick={() => setActiveTab('flota')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'flota' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
              }`}
            >
              2. Registru Flotă Anvelope ({flotaAnvelope.length})
            </button>

            <button
              onClick={() => setActiveTab('istoric')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'istoric' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
              }`}
            >
              3. 📜 Registru Schimburi & Permutări Roți ({istoricPermutari.length})
            </button>

            <button
              onClick={() => setActiveTab('tco')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'tco' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
              }`}
            >
              4. Analiză TCO per Brand
            </button>
          </div>

          {activeTab === 'flota' && (
            <div className="relative w-64 text-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Căutare serie, brand sau utilaj..."
                className="w-full bg-white border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 font-bold focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* TAB 1: DIAGRAMĂ VIZUALĂ ȘASIU DEDICATĂ PER CONFIGURAȚIE MANUALA AXE & ROȚI */}
      {activeTab === 'harta' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-morning-200 pb-3">
            <h2 className="text-base font-bold text-sapphire-900">
              Diagramă Șasiu & Configurație Axe ({hartaAxe?.numarIntern} - {hartaAxe?.numarInmatriculare})
            </h2>
            <div className="flex items-center space-x-4 text-xs font-semibold">
              <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded bg-sage-500"></span><span className="text-slate-700">Bun (&gt;60%)</span></span>
              <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded bg-periwinkle-500"></span><span className="text-slate-700">Uzura Medie (30-60%)</span></span>
              <span className="flex items-center space-x-1"><span className="w-3 h-3 rounded bg-terracotta-500"></span><span className="text-slate-700">Sub Limita (&lt;30%)</span></span>
            </div>
          </div>

          <div className="bg-morning-100/60 p-8 rounded-3xl border border-morning-200 max-w-3xl mx-auto space-y-8 shadow-inner">
            <div className="w-36 h-7 bg-slate-300 rounded-t-xl mx-auto text-[10px] text-center text-slate-700 font-extrabold tracking-widest pt-1 border border-slate-400 uppercase">
              FAȚĂ / CABINĂ
            </div>

            {hartaAxe?.pozitiiAxe && Array.from(new Set(hartaAxe.pozitiiAxe.map((p: any) => p.numarAx))).map((numarAx: any) => {
              const pozOnAx = hartaAxe.pozitiiAxe.filter((p: any) => p.numarAx === numarAx);
              const stanga = pozOnAx.filter((p: any) => p.codPozitie.includes('-S'));
              const dreapta = pozOnAx.filter((p: any) => p.codPozitie.includes('-D'));

              return (
                <div key={numarAx} className="space-y-2">
                  <div className="text-[11px] font-extrabold text-center text-sapphire-900 tracking-wider uppercase bg-morning-200 py-1 rounded-lg">
                    AXA {numarAx} ({pozOnAx.length} ROȚI CONFIGURATE PE ACEASTĂ AXĂ)
                  </div>

                  <div className="flex justify-between items-center px-4">
                    {/* Stânga */}
                    <div className="flex space-x-2">
                      {stanga.map((poz: any) => {
                        const isSelectedA = pozitieA?.id === poz.id;
                        const isSelectedB = pozitieB?.id === poz.id;
                        return (
                          <div
                            key={poz.id}
                            onClick={() => {
                              if (!pozitieA) setPozitieA(poz);
                              else if (!pozitieB && pozitieA.id !== poz.id) setPozitieB(poz);
                              else {
                                setPozitieA(poz);
                                setPozitieB(null);
                              }
                            }}
                            className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition transform hover:scale-105 ${getStatusColor(poz.anvelopa)} ${
                              isSelectedA || isSelectedB ? 'ring-4 ring-terracotta-500 font-extrabold scale-105' : ''
                            }`}
                          >
                            <p className="font-extrabold font-mono text-xs">{poz.codPozitie}</p>
                            {poz.anvelopa ? (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-[10px] font-bold">{poz.anvelopa.marca} {poz.anvelopa.dimensiune}</p>
                                <p className="text-[11px] font-extrabold font-mono">{poz.anvelopa.adancimeCurentaMm} mm</p>
                              </div>
                            ) : (
                              <p className="text-[10px] italic font-semibold text-slate-500">LIPSĂ / LIBER</p>
                            )}

                            <div className="mt-2 flex items-center justify-center space-x-1">
                              {poz.anvelopa ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPozitie(poz);
                                      setAdancimeMm(poz.anvelopa?.adancimeCurentaMm || 12);
                                    }}
                                    className="px-2 py-1 bg-white border rounded text-[10px] font-bold text-sapphire-900 shadow-xs hover:bg-morning-100"
                                  >
                                    📏 Măsoară
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDemonteazaInStoc(poz.anvelopa.id);
                                    }}
                                    className="px-2 py-1 bg-morning-200 hover:bg-roseash-200 border rounded text-[10px] font-bold text-terracotta-600 shadow-xs"
                                  >
                                    Schimbă
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVehiculForAdd(selectedId);
                                    setSelectedAxNumar(poz.numarAx);
                                    setNewMountPositionId(poz.id);
                                    setShowAddAnvelopaModal(true);
                                  }}
                                  className="px-2 py-1 bg-sapphire-500 hover:bg-sapphire-600 text-white rounded text-[10px] font-bold shadow-xs"
                                >
                                  + Montează
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="h-6 w-32 bg-slate-400 rounded-full flex items-center justify-center text-[10px] text-white font-mono font-bold">
                      AXĂ {numarAx}
                    </div>

                    {/* Dreapta */}
                    <div className="flex space-x-2">
                      {dreapta.map((poz: any) => {
                        const isSelectedA = pozitieA?.id === poz.id;
                        const isSelectedB = pozitieB?.id === poz.id;
                        return (
                          <div
                            key={poz.id}
                            onClick={() => {
                              if (!pozitieA) setPozitieA(poz);
                              else if (!pozitieB && pozitieA.id !== poz.id) setPozitieB(poz);
                              else {
                                setPozitieA(poz);
                                setPozitieB(null);
                              }
                            }}
                            className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition transform hover:scale-105 ${getStatusColor(poz.anvelopa)} ${
                              isSelectedA || isSelectedB ? 'ring-4 ring-terracotta-500 font-extrabold scale-105' : ''
                            }`}
                          >
                            <p className="font-extrabold font-mono text-xs">{poz.codPozitie}</p>
                            {poz.anvelopa ? (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-[10px] font-bold">{poz.anvelopa.marca} {poz.anvelopa.dimensiune}</p>
                                <p className="text-[11px] font-extrabold font-mono">{poz.anvelopa.adancimeCurentaMm} mm</p>
                              </div>
                            ) : (
                              <p className="text-[10px] italic font-semibold text-slate-500">LIPSĂ / LIBER</p>
                            )}

                            <div className="mt-2 flex items-center justify-center space-x-1">
                              {poz.anvelopa ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedPozitie(poz);
                                      setAdancimeMm(poz.anvelopa?.adancimeCurentaMm || 12);
                                    }}
                                    className="px-2 py-1 bg-white border rounded text-[10px] font-bold text-sapphire-900 shadow-xs hover:bg-morning-100"
                                  >
                                    📏 Măsoară
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDemonteazaInStoc(poz.anvelopa.id);
                                    }}
                                    className="px-2 py-1 bg-morning-200 hover:bg-roseash-200 border rounded text-[10px] font-bold text-terracotta-600 shadow-xs"
                                  >
                                    Schimbă
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedVehiculForAdd(selectedId);
                                    setSelectedAxNumar(poz.numarAx);
                                    setNewMountPositionId(poz.id);
                                    setShowAddAnvelopaModal(true);
                                  }}
                                  className="px-2 py-1 bg-sapphire-500 hover:bg-sapphire-600 text-white rounded text-[10px] font-bold shadow-xs"
                                >
                                  + Montează
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="w-32 h-7 bg-slate-300 rounded-b-xl mx-auto text-[10px] text-center text-slate-700 font-extrabold tracking-widest pt-1 border border-slate-400 uppercase">
              SPATE
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTRU FLOTĂ ANVELOPE */}
      {activeTab === 'flota' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-sapphire-900">Registrul Centralizat al Anvelopelor din Flotă</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-3">Serie Anvelopă</th>
                  <th className="p-3">Marcă & Model</th>
                  <th className="p-3 font-mono">Dimensiune</th>
                  <th className="p-3">Stare & Poziție</th>
                  <th className="p-3 font-mono">Adâncime Profil</th>
                  <th className="p-3 text-right">Preț Achiziție</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {flotaAnvelope.map((a: any) => (
                  <tr key={a.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-extrabold text-sapphire-900 font-mono">{a.serieAnvelopa}</td>
                    <td className="p-3 font-bold text-slate-800">{a.marca} {a.model}</td>
                    <td className="p-3 font-mono text-sage-700 font-semibold">{a.dimensiune}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        a.stare === 'MONTATA' ? 'bg-sapphire-50 text-sapphire-600 border border-sapphire-100' : 'bg-morning-200 text-sage-700'
                      }`}>
                        {a.stare} {a.pozitieAx?.codPozitie ? `(${a.pozitieAx.codPozitie})` : ''}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-extrabold text-sapphire-900">{a.adancimeCurentaMm} mm / {a.adancimeInitialaMm} mm</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800">{a.pretAchizitie} RON</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: AUDIT ISTORIC SCHIMBURI & PERMUTĂRI */}
      {activeTab === 'istoric' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-sapphire-900">📜 Registru Audit Schimburi & Permutări Roți (Istoric Mutări)</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-3">Dată Intervenție</th>
                  <th className="p-3">Utilaj</th>
                  <th className="p-3">Anvelopă / Serie</th>
                  <th className="p-3">Poziție Sursă ➔ Destinație</th>
                  <th className="p-3 font-mono">Odometru (KM/mTH)</th>
                  <th className="p-3 text-right">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {istoricPermutari.map((h: any) => (
                  <tr key={h.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 text-sage-700 font-medium">{new Date(h.dataPermutare).toISOString().split('T')[0]}</td>
                    <td className="p-3 font-extrabold text-sapphire-900">{h.vehicul?.numarIntern}</td>
                    <td className="p-3 font-bold text-slate-800">{h.anvelopa?.marca} ({h.anvelopa?.serieAnvelopa})</td>
                    <td className="p-3 font-mono font-bold text-sapphire-900">
                      <span className="px-2 py-0.5 rounded bg-morning-200">{h.pozitieSursaCod}</span> ➔ <span className="px-2 py-0.5 rounded bg-sapphire-100 text-sapphire-900">{h.pozitieDestCod}</span>
                    </td>
                    <td className="p-3 font-mono font-extrabold text-sapphire-900">{h.valoareContor}</td>
                    <td className="p-3 text-right text-sage-600 font-bold">{h.operator || 'Atelier'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: TCO BRAND */}
      {activeTab === 'tco' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-sapphire-900">Analiză Cost Per Kilometru / Brand Anvelopă (TCO)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {tcoBrands.map((b: any) => (
              <div key={b.marca} className="p-5 rounded-2xl border border-morning-200 bg-white space-y-2">
                <p className="font-extrabold text-sapphire-900 text-sm">{b.marca}</p>
                <p className="text-2xl font-extrabold text-sapphire-900 font-mono">{b.costPer1000Km} RON / 1.000 KM</p>
                <p className="text-xs text-sage-600 font-medium">Cost total achiziții: {b.costTotal} RON ({b.countTotal || b.count} bucăți)</p>
              </div>
            ))}
          </div>
        </div>
      )}



      {/* MODAL ÎNREGISTRARE ANVELOPĂ NOUĂ SAU MONTAT DIN STOC PER AXĂ */}
      {showAddAnvelopaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-xl space-y-4 shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-lg font-bold text-sapphire-900">Montare Anvelopă pe Axă</h3>
              <button onClick={() => setShowAddAnvelopaModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB OPȚIUNE MONTARE: NOUĂ VS DIN STOC */}
            <div className="flex items-center space-x-2 bg-morning-100 p-1.5 rounded-xl border border-morning-200">
              <button
                type="button"
                onClick={() => setModalMountMode('NOUA')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  modalMountMode === 'NOUA' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
                }`}
              >
                🆕 Anvelopă Nouă (Creează & Montează)
              </button>

              <button
                type="button"
                onClick={() => setModalMountMode('DIN_STOC')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  modalMountMode === 'DIN_STOC' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
                }`}
              >
                📦 Din Stoc Intern ({stocAnvelope.length} buc. în stoc)
              </button>
            </div>

            <form onSubmit={modalMountMode === 'NOUA' ? handleCreateAnvelopa : handleMonteazaDinStoc} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Vehicul / Utilaj:</label>
                  <select
                    value={selectedVehiculForAdd}
                    onChange={(e) => {
                      setSelectedVehiculForAdd(e.target.value);
                      setSelectedAxNumar('');
                      setNewMountPositionId('');
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {vehicule.map((v) => (
                      <option key={v.id} value={v.id}>{v.numarIntern} - {v.numarInmatriculare}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Selectează Axă:</label>
                  <select
                    value={selectedAxNumar}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setSelectedAxNumar(val);
                      setNewMountPositionId('');
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Toate Axele --</option>
                    {axeDisponibile.map((axNum) => (
                      <option key={axNum} value={axNum}>Axă {axNum}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-extrabold text-sapphire-900">Poziție pe Axă: *</label>
                <select
                  required
                  value={newMountPositionId}
                  onChange={(e) => setNewMountPositionId(e.target.value)}
                  className="w-full bg-morning-100 border-2 border-sapphire-500/40 rounded-xl p-2.5 text-sapphire-900 font-extrabold"
                >
                  <option value="">-- Alege Poziția de Montaj pe Șasiu --</option>
                  {pozitiiFiltratePeAx.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.codPozitie} - {p.descrierePozitie} {p.anvelopa ? `(OCUPAT: ${p.anvelopa.serieAnvelopa})` : '(LIBER)'}
                    </option>
                  ))}
                </select>
              </div>

              {estePozitieOcupata && (
                <div className="p-3 bg-terracotta-50 border border-terracotta-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-terracotta-700 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Atenție: Poziția {targetSelectedPositionObj.codPozitie} este ocupată de anvelopa {targetSelectedPositionObj.anvelopa.serieAnvelopa}!</span>
                  </div>
                  <p className="text-[11px] text-slate-700">Ce doriți să faceți cu anvelopa veche de pe această poziție?</p>
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-1.5 font-bold text-sapphire-900 cursor-pointer">
                      <input
                        type="radio"
                        name="actiuneVeche"
                        checked={actiuneAnvelopaVeche === 'DEMONTARE_IN_STOC'}
                        onChange={() => setActiuneAnvelopaVeche('DEMONTARE_IN_STOC')}
                      />
                      <span>Trece în Stoc (Anvelopă de rezervă)</span>
                    </label>
                    <label className="flex items-center space-x-1.5 font-bold text-terracotta-600 cursor-pointer">
                      <input
                        type="radio"
                        name="actiuneVeche"
                        checked={actiuneAnvelopaVeche === 'CASARE_STOC'}
                        onChange={() => setActiuneAnvelopaVeche('CASARE_STOC')}
                      />
                      <span>Casare (Sub limita legală)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* DACA SELECTAM ANVELOPA NOUA */}
              {modalMountMode === 'NOUA' ? (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Serie Unică Anvelopă: *</label>
                      <input required value={newSerie} onChange={(e) => setNewSerie(e.target.value)} placeholder="ex: MIC-99201" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                    </div>
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Cod DOT:</label>
                      <input value={newCodDot} onChange={(e) => setNewCodDot(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Marcă:</label>
                      <input value={newMarca} onChange={(e) => setNewMarca(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                    </div>
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Model:</label>
                      <input value={newModel} onChange={(e) => setNewModel(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                    </div>
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Dimensiune:</label>
                      <input value={newDimensiune} onChange={(e) => setNewDimensiune(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Profil Inițial (mm):</label>
                      <input type="number" value={newAdancimeInitiala} onChange={(e) => setNewAdancimeInitiala(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                    </div>
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Profil Curent (mm):</label>
                      <input type="number" value={newAdancimeCurenta} onChange={(e) => setNewAdancimeCurenta(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                    </div>
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Preț Achiziție (RON):</label>
                      <input type="number" value={newPretAchizitie} onChange={(e) => setNewPretAchizitie(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                    </div>
                  </div>
                </>
              ) : (
                /* MONTARE DIN STOC INTERN */
                <div className="space-y-3 p-4 bg-morning-50 border border-morning-200 rounded-2xl">
                  <label className="text-sage-700 block font-extrabold text-sapphire-900 text-xs">
                    Selectează Anvelopă din Stoc Intern: *
                  </label>

                  {stocAnvelope.length > 0 ? (
                    <select
                      required
                      value={selectedAnvelopaDinStocId}
                      onChange={(e) => setSelectedAnvelopaDinStocId(e.target.value)}
                      className="w-full bg-white border-2 border-sapphire-500/40 rounded-xl p-3 text-sapphire-900 font-extrabold text-xs"
                    >
                      <option value="">-- Selectează Anvelopa din Stoc pentru Montaj --</option>
                      {stocAnvelope.map((a: any) => (
                        <option key={a.id} value={a.id}>
                          {a.serieAnvelopa} - {a.marca} {a.model} ({a.dimensiune}) - Profil: {a.adancimeCurentaMm}mm ({a.pretAchizitie} RON)
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Nu există nicio anvelopă disponibilă în stoc în acest moment. Puteți înregistra o anvelopă nouă folosind opțiunea „Anvelopă Nouă”.</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowAddAnvelopaModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">
                  {modalMountMode === 'NOUA' ? 'Înregistrează & Montează pe Axă' : 'Montează Anvelopa din Stoc'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MĂSURARE ADÂNCIME PROFIL */}
      {selectedPozitie && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900">Măsurare Profil Anvelopă ({selectedPozitie.codPozitie})</h3>
              <button onClick={() => setSelectedPozitie(null)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSalveazaMasurare} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Adâncime Măsurată (mm):</label>
                <input type="number" step="0.5" value={adancimeMm} onChange={(e) => setAdancimeMm(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-3 text-lg text-sapphire-900 font-mono font-extrabold" />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setSelectedPozitie(null)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Măsurătoare</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXECUȚIE PERMUTARE */}
      {showPermutareModal && pozitieA && pozitieB && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <RefreshCw className="w-5 h-5 text-sapphire-500" />
                <span>Confirmare Permutare Directă 🔄</span>
              </h3>
              <button onClick={() => setShowPermutareModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 bg-morning-100 rounded-2xl border border-morning-200 text-xs space-y-2 text-center">
              <p className="font-extrabold text-sapphire-900 text-sm">Rotire între Poziția {pozitieA.codPozitie} ↔️ Poziția {pozitieB.codPozitie}</p>
              <p className="text-[11px] text-sage-600 font-medium">Sistemul va schimba fizic locurile celor 2 anvelope pe șasiu și va înregistra un audit istoric complet cu data, contorul curent și operatorul!</p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Data Operare / Rotire: *</label>
                  <input
                    type="date"
                    required
                    value={permutareData}
                    onChange={(e) => setPermutareData(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Mecanic / Operator: *</label>
                  <select
                    required
                    value={permutareOperator}
                    onChange={(e) => setPermutareOperator(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {mecaniciList.map((m: any) => (
                      <option key={m.id} value={m.nume}>
                        👨‍🔧 {m.nume} ({m.functie || 'Mecanic'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-extrabold text-sapphire-900">
                  Index Contor (KM / mTH) la Rotire: *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={permutareValoareContor || hartaAxe?.valoareContorCurent || ''}
                  onChange={(e) => setPermutareValoareContor(Number(e.target.value))}
                  placeholder="ex: 125000"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-extrabold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Motiv Rotire:</label>
                <input
                  value={permutareObservatii}
                  onChange={(e) => setPermutareObservatii(e.target.value)}
                  placeholder="ex: Rotire periodică pentru egalizare uzură profil"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
              <button type="button" onClick={() => setShowPermutareModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
              <button onClick={handleExecutaPermutare} className="px-5 py-2.5 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold shadow-md shadow-terracotta-500/20">Confirmă & Schimbă Vizual</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIGURARE AXE & ROȚI */}
      {showConfigAxeModal && currentVehicul && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <Settings className="w-5 h-5 text-sapphire-500" />
                <h3 className="text-lg font-bold text-sapphire-900">Configurare Axe & Roți ({currentVehicul.numarIntern})</h3>
              </div>
              <button onClick={() => setShowConfigAxeModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConfigAxe} className="space-y-4 text-xs">
              <div className="p-4 bg-morning-50 border border-morning-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sapphire-900 font-bold text-xs">Mod Configurare Axe</label>
                  <div className="flex items-center space-x-1.5 bg-morning-200 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setEditModConfigurareAxe('AUTOMAT')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                        editModConfigurareAxe === 'AUTOMAT' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700'
                      }`}
                    >
                      Automat (din Categorie)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditModConfigurareAxe('MANUAL')}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold transition ${
                        editModConfigurareAxe === 'MANUAL' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700'
                      }`}
                    >
                      🛠️ Manual (Personalizat)
                    </button>
                  </div>
                </div>

                {editModConfigurareAxe === 'MANUAL' ? (
                  <div className="space-y-2 pt-1 border-t border-morning-200">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-sage-700">Configurare Număr Axe & Roți pe fiecare Axă:</span>
                      <button
                        type="button"
                        onClick={() => setEditRotiPerAxList([...editRotiPerAxList, 2])}
                        className="px-2.5 py-1 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[10px] font-bold transition"
                      >
                        + Adaugă Axă Nouă
                      </button>
                    </div>

                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {editRotiPerAxList.map((roti, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-morning-200 text-xs">
                          <span className="font-extrabold text-sapphire-900">Axă {idx + 1}:</span>
                          <div className="flex items-center space-x-2">
                            <select
                              value={roti}
                              onChange={(e) => {
                                const list = [...editRotiPerAxList];
                                list[idx] = Number(e.target.value);
                                setEditRotiPerAxList(list);
                              }}
                              className="bg-morning-100 border border-morning-200 rounded-lg p-1.5 font-bold text-sapphire-900 text-xs"
                            >
                              <option value={2}>2 Roți (Stânga Simplu + Dreapta Simplu)</option>
                              <option value={4}>4 Roți (Dublă Tracțiune / Motrică)</option>
                              <option value={6}>6 Roți (Triplă)</option>
                              <option value={8}>8 Roți (Quadruplă)</option>
                            </select>
                            {editRotiPerAxList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setEditRotiPerAxList(editRotiPerAxList.filter((_, i) => i !== idx))}
                                className="text-terracotta-500 hover:text-terracotta-700 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-800 text-[11px] font-semibold">
                    ℹ️ Se vor regenera automat axe conform categoriei vehiculului ({currentVehicul.categorieEnum}).
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowConfigAxeModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Configurația Axelor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
