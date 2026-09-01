"use client";

import { useState, useEffect } from 'react';
import {
  CircleDot, AlertTriangle, RefreshCw, Ruler, BarChart2, Repeat, Layers, Search, Plus,
  CheckCircle2, X, ArrowLeftRight, Wrench, ShieldAlert, History, Calendar, UserCheck, Trash2, Truck, ChevronDown, Check, Settings, PackageCheck
} from 'lucide-react';
import VehicleSelector from '@/components/VehicleSelector';
import { getLabelPozitie } from '@/lib/tirePositions';

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

  // Modal State Demontare Anvelopă în Stoc
  const [showDemountModal, setShowDemountModal] = useState(false);
  const [demountPozitie, setDemountPozitie] = useState<any>(null);
  const [demountActiune, setDemountActiune] = useState<'DEMONTARE_IN_STOC' | 'CASARE_DIRECTA' | 'RESAPARE'>('DEMONTARE_IN_STOC');
  const [demountMotivCasare, setDemountMotivCasare] = useState('EXPLOZIE_PUNCTURA');
  const [demountDepozitId, setDemountDepozitId] = useState('');
  const [demountContor, setDemountContor] = useState<number>(0);
  const [demountData, setDemountData] = useState(new Date().toISOString().split('T')[0]);
  const [demountOperator, setDemountOperator] = useState('Brașoveanu Virgil (Șef Atelier)');
  const [demountObservatii, setDemountObservatii] = useState('Înlocuire de sezon / Demontare în stoc');

  // Modal State Istoric Complet Anvelopă
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTireData, setHistoryTireData] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Permutare Directă 2 Poziții (Rotire Vizuală)
  const [pozitieA, setPozitieA] = useState<any>(null);
  const [pozitieB, setPozitieB] = useState<any>(null);
  const [showPermutareModal, setShowPermutareModal] = useState(false);
  const [permutareData, setPermutareData] = useState(new Date().toISOString().split('T')[0]);
  const [permutareOperator, setPermutareOperator] = useState('Brașoveanu Virgil (Șef Atelier)');
  const [permutareObservatii, setPermutareObservatii] = useState('');
  const [permutareValoareContor, setPermutareValoareContor] = useState<number>(0);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);
  const [depoziteList, setDepoziteList] = useState<any[]>([]);

  // Modal State Înregistrare Anvelopă Nouă sau Folosită
  const [showAddAnvelopaModal, setShowAddAnvelopaModal] = useState(false);
  const [modalMountMode, setModalMountMode] = useState<'DIN_STOC' | 'NOUA'>('DIN_STOC');
  const [selectedAnvelopaDinStocId, setSelectedAnvelopaDinStocId] = useState('');
  const [stocSearchTerm, setStocSearchTerm] = useState('');
  const [newCodDot, setNewCodDot] = useState('DOT-2026');
  const [newSerie, setNewSerie] = useState('');
  const [newMarca, setNewMarca] = useState('Michelin');
  const [newModel, setNewModel] = useState('X-Multi Z');
  const [newDimensiune, setNewDimensiune] = useState('315/80 R22.5');
  const [newAdancimeInitiala, setNewAdancimeInitiala] = useState(16);
  const [newAdancimeCurenta, setNewAdancimeCurenta] = useState(14);
  const [newPretAchizitie, setNewPretAchizitie] = useState(1850);
  
  // Date & Contor Montare
  const [mountData, setMountData] = useState(new Date().toISOString().split('T')[0]);
  const [mountContor, setMountContor] = useState<number | ''>('');
  const [mountOperator, setMountOperator] = useState('Brașoveanu Virgil (Șef Atelier)');
  const [mountObservatii, setMountObservatii] = useState('');

  // Selecție Axă & Poziție per Vehicul
  const [selectedVehiculForAdd, setSelectedVehiculForAdd] = useState('');
  const [selectedAxNumar, setSelectedAxNumar] = useState<number | ''>('');
  const [newMountPositionId, setNewMountPositionId] = useState('');
  const [actiuneAnvelopaVeche, setActiuneAnvelopaVeche] = useState<'DEMONTARE_IN_STOC' | 'CASARE_STOC'>('DEMONTARE_IN_STOC');

  const openMountModal = (vId?: string, axNum?: number | '', posId?: string) => {
    const targetVId = vId || selectedId;
    setSelectedVehiculForAdd(targetVId);
    setSelectedAxNumar(axNum !== undefined ? axNum : '');
    setNewMountPositionId(posId || '');
    setModalMountMode('DIN_STOC');
    setSelectedAnvelopaDinStocId('');
    setStocSearchTerm('');
    setMountData(new Date().toISOString().split('T')[0]);
    
    const targetVeh = vehicule.find((v) => v.id === targetVId);
    setMountContor(targetVeh?.valoareContorCurent || 0);
    if (mecaniciList.length > 0) {
      setMountOperator(mecaniciList[0].nume);
    }
    setMountObservatii('');
    setShowAddAnvelopaModal(true);
  };

  const handleSelectStocItem = (selectedId: string) => {
    setSelectedAnvelopaDinStocId(selectedId);
    const found = stocAnvelope.find((s) => s.id === selectedId);
    if (found) {
      setNewMarca(found.marca || '');
      setNewModel(found.model || '');
      setNewDimensiune(found.dimensiune || '');
      setNewSerie(found.serieAnvelopa || '');
      setNewCodDot(found.codDot || 'DOT-2026');
      setNewAdancimeInitiala(found.adancimeInitialaMm || 16);
      setNewAdancimeCurenta(found.adancimeCurentaMm || 16);
      setNewPretAchizitie(found.pretAchizitie || 0);
    }
  };

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

  const fetchDepozite = async () => {
    try {
      const res = await fetch('http://localhost:3001/stocuri-garantii/depozite');
      if (res.ok) {
        const data = await res.json();
        setDepoziteList(data);
        if (data.length > 0) setDemountDepozitId(data[0].id);
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
    fetchDepozite();
  }, []);

  useEffect(() => {
    if (selectedId) fetchHartaAxe(selectedId);
  }, [selectedId]);

  const openDemountModal = (poz: any) => {
    setDemountPozitie(poz);
    setDemountActiune('DEMONTARE_IN_STOC');
    setDemountMotivCasare('EXPLOZIE_PUNCTURA');
    if (depoziteList.length > 0 && !demountDepozitId) setDemountDepozitId(depoziteList[0].id);
    setDemountContor(hartaAxe?.valoareContorCurent || 0);
    setDemountData(new Date().toISOString().split('T')[0]);
    if (mecaniciList.length > 0) setDemountOperator(mecaniciList[0].nume);
    setDemountObservatii('Înlocuire de sezon / Demontare în stoc');
    setShowDemountModal(true);
  };

  const handleConfirmDemount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demountPozitie || !demountPozitie.anvelopa) return;

    try {
      const res = await fetch(`http://localhost:3001/anvelope/demonteaza-in-stoc/${demountPozitie.anvelopa.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actiune: demountActiune,
          depozitId: demountActiune === 'DEMONTARE_IN_STOC' ? demountDepozitId : undefined,
          motivCasare: demountMotivCasare,
          valoareContor: Number(demountContor),
          operator: demountOperator,
          dataDemontare: demountData,
          observatii: demountObservatii,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj);
        setShowDemountModal(false);
        setDemountPozitie(null);
        fetchHartaAxe(selectedId);
        fetchFlotaAnvelope();
        fetchIstoricPermutari();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e: any) {
      alert('Eroare la demontarea/casarea anvelopei.');
    }
  };

  const openHistoryModal = async (anvelopaId: string) => {
    setShowHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await fetch(`http://localhost:3001/anvelope/${anvelopaId}/istoric-complet`);
      if (res.ok) {
        setHistoryTireData(await res.json());
      } else {
        alert('Nu s-a putut încărca istoricul anvelopei.');
      }
    } catch (e) {
      alert('Eroare la preluarea istoricului.');
    } finally {
      setHistoryLoading(false);
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
        alert(`🔄 Permutarea directă între pozițiile ${getLabelPozitie(pozitieA).titlu} ↔️ ${getLabelPozitie(pozitieB).titlu} a fost executată cu succes!`);
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
          valoareContor: Number(mountContor || 0),
          dataMontare: mountData,
          actiuneAnvelopaVeche,
          operator: mountOperator,
          observatii: mountObservatii,
        }),
      });

      if (res.ok) {
        alert('✅ Anvelopa a fost înregistrată și montată cu succes pe poziția selectată!');
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

    const selectedItem = stocAnvelope.find((s) => s.id === selectedAnvelopaDinStocId);

    try {
      const res = await fetch('http://localhost:3001/anvelope/monteaza', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anvelopaId: selectedItem?.anvelopaId || undefined,
          articolStocId: selectedItem?.articolStocId || undefined,
          pozitieAxId: newMountPositionId,
          serieAnvelopa: newSerie || undefined,
          codDot: newCodDot || undefined,
          marca: newMarca || undefined,
          model: newModel || undefined,
          dimensiune: newDimensiune || undefined,
          adancimeInitialaMm: Number(newAdancimeInitiala),
          adancimeCurentaMm: Number(newAdancimeCurenta),
          pretAchizitie: Number(newPretAchizitie),
          valoareContor: Number(mountContor || 0),
          dataMontare: mountData,
          actiuneAnvelopaVeche,
          operator: mountOperator,
          observatii: mountObservatii,
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

  const getStatusColor = (anvelopa: any) => {
    if (!anvelopa) return 'bg-morning-100 border-morning-300 text-sage-600';
    return 'bg-white border-sapphire-400 text-sapphire-950 font-bold shadow-xs';
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

  const stocAnvelopeFiltrate = stocAnvelope.filter((item: any) => {
    if (!stocSearchTerm.trim()) return true;
    const q = stocSearchTerm.toLowerCase();
    return (
      (item.serieAnvelopa || '').toLowerCase().includes(q) ||
      (item.codArticol || '').toLowerCase().includes(q) ||
      (item.marca || '').toLowerCase().includes(q) ||
      (item.model || '').toLowerCase().includes(q) ||
      (item.dimensiune || '').toLowerCase().includes(q) ||
      (item.depozitNume || '').toLowerCase().includes(q) ||
      (item.codDot || '').toLowerCase().includes(q) ||
      (item.eticheta || '').toLowerCase().includes(q)
    );
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
            onClick={() => openMountModal(selectedId)}
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
              <span>🔄 Execută Permutare între {getLabelPozitie(pozitieA).titlu} ↔️ {getLabelPozitie(pozitieB).titlu}</span>
            </button>
          )}
        </div>
      </div>

      <VehicleSelector
        selectedId={selectedId}
        onSelect={(v) => setSelectedId(v.id)}
        vehicule={vehicule}
      />

      <div className="flex items-center space-x-2 border-b border-morning-200 pb-2">
        <button
          onClick={() => setActiveTab('harta')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'harta' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>Șasiu & Axe Vizuale</span>
        </button>

        <button
          onClick={() => setActiveTab('flota')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'flota' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Inventar Anvelope Flotă ({flotaAnvelope.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('istoric')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'istoric' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Istoric & Audit Permutări</span>
        </button>

        <button
          onClick={() => setActiveTab('tco')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'tco' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analiză TCO Branduri</span>
        </button>
      </div>

      {activeTab === 'harta' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-morning-200 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                <span>Diagramă Axe: {currentVehicul?.numarIntern}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sapphire-100 text-sapphire-900 font-mono">
                  {currentVehicul?.numarInmatriculare}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-morning-200 text-slate-700">
                  {currentVehicul?.categorieEnum || 'CAMION'}
                </span>
              </h2>
              <p className="text-xs text-sage-600 font-medium mt-0.5">
                Dați clic pe două anvelope pentru permutare directă sau clic pe <b>+ Montează</b> pentru montaj anvelopă
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchHartaAxe(selectedId)}
                className="p-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-200 text-slate-700 text-xs font-bold flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reîmprospătează</span>
              </button>
            </div>
          </div>

          <div className="bg-morning-100/60 p-8 rounded-3xl border border-morning-200 max-w-3xl mx-auto space-y-8 shadow-inner">
            <div className="w-36 h-7 bg-slate-300 rounded-t-xl mx-auto text-[10px] text-center text-slate-700 font-extrabold tracking-widest pt-1 border border-slate-400 uppercase">
              FAȚĂ / CABINĂ
            </div>

            {hartaAxe?.pozitiiAxe && Array.from(new Set(hartaAxe.pozitiiAxe.map((p: any) => p.numarAx))).map((numarAx: any) => {
              const pozOnAx = hartaAxe.pozitiiAxe.filter((p: any) => p.numarAx === numarAx);
              const stanga = pozOnAx
                .filter((p: any) => p.codPozitie.includes('-S') || p.codPozitie.includes('ST') || (p.descrierePozitie || '').toLowerCase().includes('stanga') || (p.descrierePozitie || '').toLowerCase().includes('stânga'))
                .sort((a: any, b: any) => {
                  const aIsExt = a.codPozitie.endsWith('SS') || a.codPozitie.includes('EXT') || (a.descrierePozitie || '').toLowerCase().includes('exterior');
                  const bIsExt = b.codPozitie.endsWith('SS') || b.codPozitie.includes('EXT') || (b.descrierePozitie || '').toLowerCase().includes('exterior');
                  return aIsExt ? -1 : (bIsExt ? 1 : 0);
                });

              const dreapta = pozOnAx
                .filter((p: any) => p.codPozitie.includes('-D') || p.codPozitie.includes('DR') || (p.descrierePozitie || '').toLowerCase().includes('dreapta'))
                .sort((a: any, b: any) => {
                  const aIsInt = a.codPozitie.endsWith('DI') || a.codPozitie.includes('INT') || (a.descrierePozitie || '').toLowerCase().includes('interior');
                  const bIsInt = b.codPozitie.endsWith('DI') || b.codPozitie.includes('INT') || (b.descrierePozitie || '').toLowerCase().includes('interior');
                  return aIsInt ? -1 : (bIsInt ? 1 : 0);
                });

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
                        const posLbl = getLabelPozitie(poz, pozOnAx.length);
                        const kmCurenti = (poz.anvelopa && hartaAxe?.valoareContorCurent > (poz.anvelopa.kilometrajMontare || 0))
                          ? (hartaAxe.valoareContorCurent - poz.anvelopa.kilometrajMontare)
                          : 0;
                        const totalKmRulati = (poz.anvelopa?.rulajTotalKm || 0) + kmCurenti;

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
                            className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition transform hover:scale-105 min-w-[120px] ${getStatusColor(poz.anvelopa)} ${
                              isSelectedA || isSelectedB ? 'ring-4 ring-terracotta-500 font-extrabold scale-105' : ''
                            }`}
                          >
                            <p className="font-extrabold font-mono text-xs text-sapphire-900 tracking-tight">{posLbl.titlu}</p>
                            <p className="text-[9px] font-bold text-sage-600 truncate">{posLbl.descriereCurata}</p>
                            {poz.anvelopa ? (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-[10px] font-bold truncate max-w-[110px]">{poz.anvelopa.marca} {poz.anvelopa.dimensiune}</p>
                                <p className="text-[9px] font-bold text-sage-600 font-mono">SN: {poz.anvelopa.serieAnvelopa || 'N/A'}</p>
                                <p className="text-[10px] font-extrabold text-sapphire-900 font-mono bg-sapphire-100/70 px-1 py-0.5 rounded">
                                  Rulaj: {Math.round(totalKmRulati).toLocaleString('ro-RO')} KM
                                </p>
                              </div>
                            ) : (
                              <p className="text-[10px] italic font-semibold text-slate-500 py-2">LIPSĂ / LIBER</p>
                            )}

                            <div className="mt-2 flex items-center justify-center space-x-1">
                              {poz.anvelopa ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDemountModal(poz);
                                    }}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-extrabold shadow-xs transition"
                                    title="Demontează anvelopa și trimite-o în stoc"
                                  >
                                    📦 Demontează
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openHistoryModal(poz.anvelopa.id);
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-morning-100 border border-morning-300 text-sapphire-900 rounded-lg text-[10px] font-bold shadow-xs transition"
                                    title="Vezi istoricul complet al anvelopei"
                                  >
                                    📜 Istoric
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMountModal(selectedId, poz.numarAx, poz.id);
                                  }}
                                  className="px-2.5 py-1 bg-sapphire-500 hover:bg-sapphire-600 text-white rounded-lg text-[10px] font-bold shadow-xs"
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
                        const posLbl = getLabelPozitie(poz, pozOnAx.length);
                        const kmCurenti = (poz.anvelopa && hartaAxe?.valoareContorCurent > (poz.anvelopa.kilometrajMontare || 0))
                          ? (hartaAxe.valoareContorCurent - poz.anvelopa.kilometrajMontare)
                          : 0;
                        const totalKmRulati = (poz.anvelopa?.rulajTotalKm || 0) + kmCurenti;

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
                            className={`p-3 rounded-2xl border-2 text-center cursor-pointer transition transform hover:scale-105 min-w-[120px] ${getStatusColor(poz.anvelopa)} ${
                              isSelectedA || isSelectedB ? 'ring-4 ring-terracotta-500 font-extrabold scale-105' : ''
                            }`}
                          >
                            <p className="font-extrabold font-mono text-xs text-sapphire-900 tracking-tight">{posLbl.titlu}</p>
                            <p className="text-[9px] font-bold text-sage-600 truncate">{posLbl.descriereCurata}</p>
                            {poz.anvelopa ? (
                              <div className="mt-1 space-y-0.5">
                                <p className="text-[10px] font-bold truncate max-w-[110px]">{poz.anvelopa.marca} {poz.anvelopa.dimensiune}</p>
                                <p className="text-[9px] font-bold text-sage-600 font-mono">SN: {poz.anvelopa.serieAnvelopa || 'N/A'}</p>
                                <p className="text-[10px] font-extrabold text-sapphire-900 font-mono bg-sapphire-100/70 px-1 py-0.5 rounded">
                                  Rulaj: {Math.round(totalKmRulati).toLocaleString('ro-RO')} KM
                                </p>
                              </div>
                            ) : (
                              <p className="text-[10px] italic font-semibold text-slate-500 py-2">LIPSĂ / LIBER</p>
                            )}

                            <div className="mt-2 flex items-center justify-center space-x-1">
                              {poz.anvelopa ? (
                                <>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openDemountModal(poz);
                                    }}
                                    className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-extrabold shadow-xs transition"
                                    title="Demontează anvelopa și trimite-o în stoc"
                                  >
                                    📦 Demontează
                                  </button>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openHistoryModal(poz.anvelopa.id);
                                    }}
                                    className="px-2 py-1 bg-white hover:bg-morning-100 border border-morning-300 text-sapphire-900 rounded-lg text-[10px] font-bold shadow-xs transition"
                                    title="Vezi istoricul complet al anvelopei"
                                  >
                                    📜 Istoric
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openMountModal(selectedId, poz.numarAx, poz.id);
                                  }}
                                  className="px-2.5 py-1 bg-sapphire-500 hover:bg-sapphire-600 text-white rounded-lg text-[10px] font-bold shadow-xs"
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
                  <th className="p-3 font-mono">Rulaj Total Acumulat</th>
                  <th className="p-3 text-right">Preț Achiziție</th>
                  <th className="p-3 text-center">Istoric & Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {flotaAnvelope.map((a: any) => {
                  const kmCurenti = (a.stare === 'MONTATA' && a.vehicul && a.vehicul.valoareContorCurent > (a.kilometrajMontare || 0))
                    ? (a.vehicul.valoareContorCurent - a.kilometrajMontare)
                    : 0;
                  const totalKm = (a.rulajTotalKm || 0) + kmCurenti;

                  return (
                    <tr key={a.id} className="hover:bg-morning-50 transition">
                      <td className="p-3 font-extrabold text-sapphire-900 font-mono">{a.serieAnvelopa}</td>
                      <td className="p-3 font-bold text-slate-800">{a.marca} {a.model}</td>
                      <td className="p-3 font-mono text-sage-700 font-semibold">{a.dimensiune}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          a.stare === 'MONTATA' 
                            ? 'bg-sapphire-50 text-sapphire-700 border border-sapphire-200' 
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          {a.stare === 'MONTATA' 
                            ? `MONTATĂ (${a.vehicul?.numarIntern || ''} ${a.pozitieAx ? `• ${getLabelPozitie(a.pozitieAx).titlu}` : ''})` 
                            : `📦 ÎN STOC (${a.depozit?.nume || a.depozitNume || 'Depozit Central'})`}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-extrabold text-sapphire-900">
                        {Math.round(totalKm).toLocaleString('ro-RO')} KM
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-800">
                        {Number(a.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => openHistoryModal(a.id)}
                          className="px-2.5 py-1 bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-800 border border-sapphire-200 rounded-lg text-xs font-bold transition inline-flex items-center space-x-1"
                        >
                          <History className="w-3.5 h-3.5 text-sapphire-600" />
                          <span>Istoric Rulaj</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
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

            {/* TAB OPȚIUNE MONTARE: DIN STOC (IMPLICIT) VS NOUĂ */}
            <div className="flex items-center space-x-2 bg-morning-100 p-1.5 rounded-xl border border-morning-200">
              <button
                type="button"
                onClick={() => setModalMountMode('DIN_STOC')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  modalMountMode === 'DIN_STOC' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
                }`}
              >
                📦 Din Stoc Intern ({stocAnvelope.length} articole disponibile)
              </button>

              <button
                type="button"
                onClick={() => setModalMountMode('NOUA')}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  modalMountMode === 'NOUA' ? 'bg-sapphire-500 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
                }`}
              >
                🆕 Anvelopă Nouă Nemenționată în Stoc
              </button>
            </div>

            <form onSubmit={modalMountMode === 'NOUA' ? handleCreateAnvelopa : handleMonteazaDinStoc} className="space-y-4 text-xs">
              {/* DACĂ POZIȚIA ESTE DEJA SELECTATĂ DIN DIAGRAMA VIZUALĂ */}
              {targetSelectedPositionObj ? (
                <div className="p-3.5 bg-gradient-to-r from-sapphire-50 via-morning-50 to-morning-100 border border-sapphire-200 rounded-2xl flex items-center justify-between shadow-xs">
                  <div className="flex items-center space-x-3">
                    <div className="px-3 py-2 bg-sapphire-500 text-white rounded-xl shadow-xs font-mono font-black text-xs flex items-center justify-center text-center">
                      {getLabelPozitie(targetSelectedPositionObj, targetPozitii.filter((p: any) => p.numarAx === targetSelectedPositionObj.numarAx).length).titlu}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-extrabold text-sapphire-900 text-sm">
                          {targetVehiculObj?.numarIntern} <span className="text-sage-600 font-normal text-xs">({targetVehiculObj?.numarInmatriculare})</span>
                        </p>
                        <span className="px-2 py-0.5 rounded bg-sapphire-100 text-sapphire-900 font-mono font-bold text-[10px]">
                          Axă {targetSelectedPositionObj.numarAx}
                        </span>
                      </div>
                      <p className="text-[11px] text-sage-700 font-medium">
                        {getLabelPozitie(targetSelectedPositionObj, targetPozitii.filter((p: any) => p.numarAx === targetSelectedPositionObj.numarAx).length).descriere} {targetSelectedPositionObj.anvelopa ? `• (⚠️ Ocupată: ${targetSelectedPositionObj.anvelopa.serieAnvelopa})` : '• (Poziție Liberă)'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewMountPositionId('');
                      setSelectedAxNumar('');
                    }}
                    className="text-[11px] font-bold text-sapphire-600 hover:text-sapphire-800 hover:underline px-2 py-1"
                  >
                    Schimbă poziția
                  </button>
                </div>
              ) : (
                /* DACĂ SE DESCHIDE DIN MENIUL GENERAL FĂRĂ POZIȚIE PRESELECTATĂ */
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Vehicul / Utilaj: *</label>
                      <select
                        value={selectedVehiculForAdd}
                        onChange={(e) => {
                          setSelectedVehiculForAdd(e.target.value);
                          setSelectedAxNumar('');
                          setNewMountPositionId('');
                        }}
                        className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                      >
                        <option value="">-- Alege Vehiculul --</option>
                        {vehicule.map((v) => (
                          <option key={v.id} value={v.id}>{v.numarIntern} - {v.numarInmatriculare}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Selectează Axă: *</label>
                      <select
                        value={selectedAxNumar}
                        onChange={(e) => {
                          setSelectedAxNumar(e.target.value ? Number(e.target.value) : '');
                          setNewMountPositionId('');
                        }}
                        className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                      >
                        <option value="">-- Alege Axă --</option>
                        {axeDisponibile.map((axNum: any) => (
                          <option key={String(axNum)} value={String(axNum)}>Axă {String(axNum)}</option>
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
                      {pozitiiFiltratePeAx.map((p: any) => {
                        const lbl = getLabelPozitie(p, targetPozitii.filter((x: any) => x.numarAx === p.numarAx).length);
                        return (
                          <option key={p.id} value={p.id}>
                            {lbl.titlu} - {lbl.descriere} {p.anvelopa ? `(OCUPAT: ${p.anvelopa.serieAnvelopa})` : '(LIBER)'}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </>
              )}

              {/* DATA MONTĂRII ȘI INDEX CONTOR LA MONTARE */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-morning-50 border border-morning-200 rounded-2xl">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-sapphire-500" />
                    <span>Data Montării pe Axă: *</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={mountData}
                    onChange={(e) => setMountData(e.target.value)}
                    className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-extrabold text-sapphire-900 flex items-center space-x-1">
                    <Ruler className="w-3.5 h-3.5 text-sapphire-500" />
                    <span>
                      Index Contor la Montare ({targetVehiculObj?.tipMasurare === 'ORE_MTH' ? 'Ore mTH' : 'KM'}): *
                    </span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={mountContor}
                    onChange={(e) => setMountContor(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="ex: 125000"
                    className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-extrabold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Mecanic / Operator Responsabil: *</label>
                  <select
                    required
                    value={mountOperator}
                    onChange={(e) => setMountOperator(e.target.value)}
                    className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {mecaniciList.map((m: any) => (
                      <option key={m.id} value={m.nume}>
                        👨‍🔧 {m.nume} ({m.functie || 'Mecanic'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Observații Montare:</label>
                  <input
                    value={mountObservatii}
                    onChange={(e) => setMountObservatii(e.target.value)}
                    placeholder="ex: Montare anvelopă nouă din depozit"
                    className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                  />
                </div>
              </div>

              {estePozitieOcupata && (
                <div className="p-3 bg-terracotta-50 border border-terracotta-200 rounded-xl space-y-2">
                  <div className="flex items-center space-x-2 text-terracotta-700 font-bold">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Atenție: Poziția {getLabelPozitie(targetSelectedPositionObj).titlu} este ocupată de anvelopa {targetSelectedPositionObj.anvelopa.serieAnvelopa}!</span>
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

              {/* OPȚIUNEA 1: MONTARE DIN STOC INTERN (IMPLICIT) */}
              {modalMountMode === 'DIN_STOC' ? (
                <div className="space-y-3 p-4 bg-sapphire-50/70 border border-sapphire-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <label className="text-sage-700 block font-extrabold text-sapphire-900 text-xs">
                      Selectează Anvelopă din Gestiunea Stocului (Magazie / Rezervă): *
                    </label>
                    <span className="text-[11px] font-bold text-sapphire-700 bg-sapphire-100 px-2 py-0.5 rounded-full">
                      {stocAnvelopeFiltrate.length} din {stocAnvelope.length} disponibile
                    </span>
                  </div>

                  {/* BARA DE CĂUTARE ACTIVĂ DUPĂ SERIE / DENUMIRE */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={stocSearchTerm}
                      onChange={(e) => setStocSearchTerm(e.target.value)}
                      placeholder="🔍 Filtrează activ după Serie (SN), Marcă, Model, Dimensiune, Cod..."
                      className="w-full pl-9 pr-8 py-2.5 bg-white border-2 border-sapphire-300 rounded-xl text-xs font-bold text-sapphire-900 placeholder:text-sage-400 placeholder:font-normal focus:outline-hidden focus:border-sapphire-500 focus:ring-2 focus:ring-sapphire-500/20"
                    />
                    {stocSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setStocSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sapphire-900 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* LISTĂ ACTIVĂ DE ANVELOPE FILTRATE */}
                  {stocAnvelope.length > 0 ? (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {stocAnvelopeFiltrate.length > 0 ? (
                        stocAnvelopeFiltrate.map((a: any) => {
                          const isSelected = selectedAnvelopaDinStocId === a.id;
                          const isSerialized = a.tipSursa === 'ANVELOPA_RULATA' || a.tipSursa === 'ANVELOPA_INDIVIDUALA';
                          return (
                            <div
                              key={a.id}
                              onClick={() => handleSelectStocItem(a.id)}
                              className={`p-3 rounded-xl border transition cursor-pointer text-xs ${
                                isSelected
                                  ? 'bg-sapphire-500 text-white border-sapphire-600 shadow-md ring-2 ring-sapphire-400/40'
                                  : 'bg-white border-morning-200 hover:border-sapphire-300 hover:bg-sapphire-50/50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase font-mono tracking-wider ${
                                    isSelected 
                                      ? 'bg-white/20 text-white' 
                                      : isSerialized 
                                        ? 'bg-amber-100 text-amber-900 border border-amber-300' 
                                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  }`}>
                                    {isSerialized ? `🏷️ SN: ${a.serieAnvelopa}` : `📦 Lot Stoc (${a.stocDisponibil} buc)`}
                                  </span>
                                  <span className={`font-mono font-bold text-[11px] ${isSelected ? 'text-sapphire-100' : 'text-sapphire-800'}`}>
                                    {a.dimensiune}
                                  </span>
                                </div>
                                <div className="font-mono font-extrabold text-[11px]">
                                  {Number(a.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                                </div>
                              </div>

                              <div className="mt-1.5 flex items-center justify-between">
                                <p className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-sapphire-950'}`}>
                                  {a.marca} {a.model}
                                </p>
                                <span className={`text-[10px] font-medium ${isSelected ? 'text-sapphire-100' : 'text-sage-600'}`}>
                                  📍 {a.depozitNume || 'Depozit Central'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-4 bg-white border border-morning-200 rounded-xl text-center text-sage-600">
                          <p className="font-bold text-xs">Nicio anvelopă nu corespunde căutării „{stocSearchTerm}”.</p>
                          <p className="text-[11px] text-sage-500 mt-0.5">Încercați după seria unică (SN), dimensiune sau marcă.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-bold flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Nu există nicio anvelopă disponibilă în stoc în acest moment. Puteți înregistra o anvelopă nouă folosind opțiunea „Anvelopă Nouă”.</span>
                    </div>
                  )}

                  {/* DETALII ANVELOPĂ SELECTATĂ ȘI AJUSTARE SERIE / DOT */}
                  {selectedAnvelopaDinStocId && (
                    <div className="mt-3 p-3.5 bg-white border-2 border-sapphire-400 rounded-xl space-y-2.5 text-xs shadow-xs">
                      <div className="flex items-center justify-between border-b border-morning-200 pb-2">
                        <div className="flex items-center space-x-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <p className="font-extrabold text-sapphire-900 text-xs">
                            Anvelopă Selectată: <span className="text-sapphire-600 font-bold">{newMarca} {newModel}</span>
                          </p>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-sapphire-100 text-sapphire-900 font-mono font-bold text-[11px]">
                          {newDimensiune}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-slate-700">
                        <div>
                          <label className="text-[10px] text-sage-700 font-bold block mb-1">
                            Serie Unică (SN) de pe anvelopă: *
                          </label>
                          <input
                            required
                            value={newSerie}
                            onChange={(e) => setNewSerie(e.target.value)}
                            placeholder="ex: SN-12345678"
                            className="bg-morning-50 border border-morning-300 rounded-lg p-2 font-mono font-bold text-sapphire-900 text-xs w-full focus:bg-white focus:border-sapphire-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-sage-700 font-bold block mb-1">
                            Cod DOT / Fabricație:
                          </label>
                          <input
                            value={newCodDot}
                            onChange={(e) => setNewCodDot(e.target.value)}
                            placeholder="ex: 2425"
                            className="bg-morning-50 border border-morning-300 rounded-lg p-2 font-mono text-sapphire-900 text-xs w-full focus:bg-white focus:border-sapphire-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div>
                          <label className="text-[10px] text-sage-600 font-bold block mb-1">
                            Profil la Montare (mm):
                          </label>
                          <input
                            type="number"
                            value={newAdancimeCurenta}
                            onChange={(e) => setNewAdancimeCurenta(Number(e.target.value))}
                            className="bg-morning-50 border border-morning-200 rounded-lg p-2 font-mono font-bold text-sapphire-900 text-xs w-full"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-sage-600 font-bold block mb-1">
                            Cost Achiziție:
                          </label>
                          <div className="bg-morning-100 border border-morning-200 rounded-lg p-2 font-mono font-bold text-slate-800 text-xs">
                            {Number(newPretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* OPȚIUNEA 2: CREARE ANVELOPĂ NOUĂ */
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

      {/* MODAL DEMONTARE / CASARE ANVELOPĂ */}
      {showDemountModal && demountPozitie && demountPozitie.anvelopa && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                {demountActiune === 'CASARE_DIRECTA' ? (
                  <>
                    <Trash2 className="w-5 h-5 text-terracotta-500" />
                    <span>Casare Anvelopă (Deșeu / Explozie) 🗑️</span>
                  </>
                ) : (
                  <>
                    <PackageCheck className="w-5 h-5 text-amber-500" />
                    <span>Demontare Anvelopă 📦</span>
                  </>
                )}
              </h3>
              <button onClick={() => setShowDemountModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-4 bg-morning-100 rounded-2xl border border-morning-200 text-xs space-y-1.5">
              <p className="font-extrabold text-sapphire-900 text-sm">{demountPozitie.anvelopa.marca} {demountPozitie.anvelopa.model} ({demountPozitie.anvelopa.dimensiune})</p>
              <p className="text-sage-700 font-mono"><strong>Serie:</strong> {demountPozitie.anvelopa.serieAnvelopa} | <strong>Poziție curentă:</strong> {getLabelPozitie(demountPozitie).titlu} ({getLabelPozitie(demountPozitie).descriere})</p>
              <p className="text-sage-700 font-mono"><strong>Index Montare inițial:</strong> {demountPozitie.anvelopa.kilometrajMontare || 0} KM</p>
            </div>

            <form onSubmit={handleConfirmDemount} className="space-y-3 text-xs">
              {/* SELECTOR DESTINAȚIE / ACȚIUNE */}
              <div>
                <label className="text-sage-700 block mb-1.5 font-extrabold text-sapphire-900">
                  Destinație / Acțiune Demontare: *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDemountActiune('DEMONTARE_IN_STOC');
                      setDemountObservatii('Înlocuire de sezon / Demontare în stoc');
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition flex flex-col items-center justify-center space-y-1 ${
                      demountActiune === 'DEMONTARE_IN_STOC'
                        ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                        : 'bg-morning-100 border-morning-200 text-sage-700 hover:bg-morning-200'
                    }`}
                  >
                    <span>📦 În Stoc Depozit</span>
                    <span className="text-[10px] font-medium text-sage-600">(Refolosibilă)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDemountActiune('CASARE_DIRECTA');
                      setDemountObservatii('Explozie în mers / Casare definitivă');
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition flex flex-col items-center justify-center space-y-1 ${
                      demountActiune === 'CASARE_DIRECTA'
                        ? 'bg-roseash-100 border-terracotta-500 text-terracotta-900 shadow-xs'
                        : 'bg-morning-100 border-morning-200 text-sage-700 hover:bg-morning-200'
                    }`}
                  >
                    <span>🗑️ Casare / Deșeu</span>
                    <span className="text-[10px] font-medium text-terracotta-600">(Explozie / Uzată)</span>
                  </button>
                </div>
              </div>

              {/* DACĂ E CASARE, CÂMP PENTRU MOTIVUL CASĂRII */}
              {demountActiune === 'CASARE_DIRECTA' && (
                <div className="p-3 bg-roseash-50 border border-roseash-200 rounded-xl space-y-2">
                  <label className="text-terracotta-900 block font-extrabold text-xs">
                    Motiv Casare & Înregistrare în Rapoarte: *
                  </label>
                  <select
                    value={demountMotivCasare}
                    onChange={(e) => setDemountMotivCasare(e.target.value)}
                    className="w-full bg-white border border-roseash-300 rounded-lg p-2 text-terracotta-900 font-bold text-xs"
                  >
                    <option value="EXPLOZIE_PUNCTURA">💥 Explozie / Punctură ireparabilă (Explozie în mers)</option>
                    <option value="UZURA_FINITA">⚠️ Uzură completă / Limită profil atinsă (End-of-life)</option>
                    <option value="TAIETURA_STRUCTURA">✂️ Tăietură laterală / Deformare cordon structură</option>
                    <option value="UZURA_NEUNIFORMA">📐 Uzură neuniformă / Problemă geometrie axă</option>
                    <option value="ALTELE">📝 Alt motiv specific de casare</option>
                  </select>
                  <p className="text-[10px] text-terracotta-700 font-medium">
                    ℹ️ Datele vor fi transferate automat în modulul <strong>Rapoarte & Analitică (TCO)</strong> pentru analiza defecțiunilor și a calității mărcilor.
                  </p>
                </div>
              )}

              {/* DACĂ E DEMONTARE ÎN STOC, CÂMP PENTRU ALEGEREA DEPOZITULUI */}
              {demountActiune === 'DEMONTARE_IN_STOC' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                  <label className="text-amber-950 block font-extrabold text-xs">
                    Depozit de Destinație (Unde intră anvelopa): *
                  </label>
                  <select
                    required
                    value={demountDepozitId}
                    onChange={(e) => setDemountDepozitId(e.target.value)}
                    className="w-full bg-white border border-amber-300 rounded-lg p-2 text-sapphire-900 font-bold text-xs"
                  >
                    {depoziteList.map((dep: any) => (
                      <option key={dep.id} value={dep.id}>
                        🏢 {dep.nume} {dep.responsabil ? `(Resp: ${dep.responsabil})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-amber-800 font-medium">
                    📦 Anvelopa va fi înregistrată automat în gestiunea stocului din acest depozit.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Data Intervenție: *</label>
                  <input
                    type="date"
                    required
                    value={demountData}
                    onChange={(e) => setDemountData(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Mecanic / Operator: *</label>
                  <select
                    required
                    value={demountOperator}
                    onChange={(e) => setDemountOperator(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {mecaniciList.map((m: any) => (
                      <option key={m.id} value={m.nume}>
                        👨‍🔧 {m.nume}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-extrabold text-sapphire-900">
                  Index Contor la Intervenție (KM / mTH): *
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  value={demountContor}
                  onChange={(e) => setDemountContor(Number(e.target.value))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-extrabold text-sm"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] font-bold text-sapphire-800 bg-sapphire-50 p-2 rounded-lg border border-sapphire-200">
                  <span>📊 KM rulați pe acest vehicul:</span>
                  <span className="font-mono font-extrabold">+{Math.max(0, demountContor - (demountPozitie.anvelopa.kilometrajMontare || 0)).toLocaleString('ro-RO')} KM</span>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Notă Tehnică:</label>
                <input
                  value={demountObservatii}
                  onChange={(e) => setDemountObservatii(e.target.value)}
                  placeholder="ex: Schimb sezonier, depozitare pe termen lung..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowDemountModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                {demountActiune === 'CASARE_DIRECTA' ? (
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold shadow-md shadow-terracotta-500/20">
                    🗑️ Confirmă Casarea & Transmite în Rapoarte
                  </button>
                ) : (
                  <button type="submit" className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20">
                    📦 Confirmă Depozitarea în {depoziteList.find((d) => d.id === demountDepozitId)?.nume || 'Stoc'}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ISTORIC COMPLET RULAJ & VEHICULE PER ANVELOPĂ */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-3xl space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-sapphire-500" />
                <h3 className="text-base font-bold text-sapphire-900">
                  Istoric Complet Rulaj & Utilizare Anvelopă
                </h3>
              </div>
              <button onClick={() => setShowHistoryModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {historyLoading ? (
              <div className="py-12 text-center text-xs font-bold text-sage-600 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-sapphire-500" />
                <span>Se încarcă istoricul anvelopei...</span>
              </div>
            ) : historyTireData ? (
              <div className="space-y-4">
                {/* Header Anvelopă */}
                <div className="p-4 bg-morning-100 rounded-2xl border border-morning-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-extrabold text-sapphire-900">
                      {historyTireData.anvelopa?.marca} {historyTireData.anvelopa?.model}
                    </h4>
                    <div className="flex items-center space-x-3 text-xs text-sage-700 font-mono mt-1 flex-wrap">
                      <span><strong>Dimensiune:</strong> {historyTireData.anvelopa?.dimensiune}</span>
                      <span>•</span>
                      <span><strong>Serie:</strong> {historyTireData.anvelopa?.serieAnvelopa}</span>
                      <span>•</span>
                      <span><strong>DOT:</strong> {historyTireData.anvelopa?.codDot}</span>
                    </div>
                  </div>

                  <span className={`px-3 py-1 rounded-full text-xs font-bold self-start sm:self-center ${
                    historyTireData.anvelopa?.stare === 'MONTATA'
                      ? 'bg-sapphire-500 text-white shadow-xs'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}>
                    {historyTireData.anvelopa?.stare === 'MONTATA'
                      ? `MONTATĂ pe ${historyTireData.anvelopa?.vehicul?.numarIntern || ''} (${getLabelPozitie(historyTireData.anvelopa?.pozitieAx).titlu})`
                      : '📦 ÎN STOC DEPOZIT'}
                  </span>
                </div>

                {/* KPI Rulaj */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3.5 bg-sapphire-50 border border-sapphire-200 rounded-xl">
                    <p className="text-[10px] font-extrabold text-sapphire-900 uppercase tracking-wider">Rulaj Total Istoric</p>
                    <p className="text-xl font-extrabold text-sapphire-900 font-mono mt-0.5">
                      {Math.round(historyTireData.anvelopa?.rulajTotalCalculat || 0).toLocaleString('ro-RO')} KM
                    </p>
                    <p className="text-[10px] text-sage-600">Cumulat pe toate vehiculele</p>
                  </div>

                  <div className="p-3.5 bg-morning-100 border border-morning-200 rounded-xl">
                    <p className="text-[10px] font-extrabold text-sage-700 uppercase tracking-wider">Rulaj Pe Sesiunea Curentă</p>
                    <p className="text-xl font-extrabold text-sapphire-900 font-mono mt-0.5">
                      {Math.round(historyTireData.anvelopa?.kmRulatiCurenti || 0).toLocaleString('ro-RO')} KM
                    </p>
                    <p className="text-[10px] text-sage-600">
                      {historyTireData.anvelopa?.stare === 'MONTATA' ? 'În exploatare activă' : 'Demontată în stoc'}
                    </p>
                  </div>

                  <div className="p-3.5 bg-morning-100 border border-morning-200 rounded-xl">
                    <p className="text-[10px] font-extrabold text-sage-700 uppercase tracking-wider">Cost Achiziție</p>
                    <p className="text-xl font-extrabold text-sapphire-900 font-mono mt-0.5">
                      {Number(historyTireData.anvelopa?.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                    </p>
                    <p className="text-[10px] text-sage-600">TCO investiție inițială</p>
                  </div>
                </div>

                {/* Tabel Cronologic Montări & Permutări */}
                <div className="space-y-2">
                  <h5 className="text-xs font-extrabold text-sapphire-900 uppercase tracking-wider">
                    Jurnal Cronologic Utilizare per Vehicul & Permutări ({historyTireData.istoric?.length || 0})
                  </h5>

                  {historyTireData.istoric && historyTireData.istoric.length > 0 ? (
                    <div className="border border-morning-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold">
                          <tr>
                            <th className="p-2.5">Data</th>
                            <th className="p-2.5">Vehicul / Utilaj</th>
                            <th className="p-2.5">Traseu Poziții</th>
                            <th className="p-2.5 font-mono">Index Contor</th>
                            <th className="p-2.5">Operator</th>
                            <th className="p-2.5">Observații</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-200">
                          {historyTireData.istoric.map((h: any) => (
                            <tr key={h.id} className="hover:bg-morning-50 transition">
                              <td className="p-2.5 text-sage-700 font-medium whitespace-nowrap font-mono">
                                {new Date(h.dataPermutare).toLocaleDateString('ro-RO')}
                              </td>
                              <td className="p-2.5 font-extrabold text-sapphire-900">
                                {h.vehiculNumarIntern} <span className="text-[11px] font-normal text-sage-600 font-mono">({h.vehiculInmatriculare})</span>
                              </td>
                              <td className="p-2.5 font-mono font-bold text-sapphire-900 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded bg-morning-200">{h.pozitieSursaCod}</span> ➔ <span className="px-2 py-0.5 rounded bg-sapphire-100 text-sapphire-900">{h.pozitieDestCod}</span>
                              </td>
                              <td className="p-2.5 font-mono font-extrabold text-sapphire-900">
                                {h.valoareContor?.toLocaleString('ro-RO')} KM
                              </td>
                              <td className="p-2.5 font-semibold text-slate-700">
                                {h.operator}
                              </td>
                              <td className="p-2.5 text-sage-600 font-medium">
                                {h.observatii || '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-4 bg-morning-50 border border-morning-200 rounded-xl text-center text-xs text-sage-600 font-medium">
                      Nu există încă înregistrări istorice salvate pentru această anvelopă.
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-xs transition"
              >
                Închide
              </button>
            </div>
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
              <p className="font-extrabold text-sapphire-900 text-sm">Rotire între Poziția {getLabelPozitie(pozitieA).titlu} ↔️ Poziția {getLabelPozitie(pozitieB).titlu}</p>
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
