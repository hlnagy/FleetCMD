"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck, Plus, Edit3, Clock, DollarSign, Calendar, Layers, Search, CheckCircle2,
  FileText, CircleDot, Droplets, PieChart, Wrench, X, Eye, Settings, ShieldAlert,
  AlertTriangle, RotateCcw, Filter, Check, ShieldCheck, ArrowRight, Printer
} from 'lucide-react';
import VehicleSelector from '../../components/VehicleSelector';

export default function FisaTehnicaPage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [fisaData, setFisaData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'piloni' | 'comenzi' | 'anvelope' | 'lichide' | 'mentenanta'>('piloni');

  // MODAL PREVIZUALIZARE FIȘĂ A4 (DEVIZ / COMANDĂ DE LUCRU)
  const [showViewModal, setShowViewModal] = useState<any>(null);


  // MOD VIZUALIZARE: LISTĂ TABEL PE CATEGORII VS FIȘĂ DEDICATĂ
  const [viewMode, setViewMode] = useState<'lista_tabel' | 'fisa_dedicata'>('lista_tabel');

  // FILTRE TABEL FLOTĂ
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const [searchQueryFleet, setSearchQueryFleet] = useState('');

  // MODAL VEHICUL NOU
  const [showAddModal, setShowAddModal] = useState(false);
  const [numarIntern, setNumarIntern] = useState('');
  const [numarInmatriculare, setNumarInmatriculare] = useState('');
  const [categorieEnum, setCategorieEnum] = useState('CAP_TRACTOR');
  const [marca, setMarca] = useState('');
  const [model, setModel] = useState('');
  const [anFabricatie, setAnFabricatie] = useState(new Date().getFullYear());
  const [serieSasiu, setSerieSasiu] = useState('');
  const [tipMasurare, setTipMasurare] = useState('KM');
  const [valoareContorInitial, setValoareContorInitial] = useState(0);
  const [valoareContorCurent, setValoareContorCurent] = useState(0);
  const [tarifOrar, setTarifOrar] = useState(0);

  // CONFIGURARE AXE & ROȚI LA CREARE
  const [modConfigurareAxe, setModConfigurareAxe] = useState<'AUTOMAT' | 'MANUAL'>('AUTOMAT');
  const [rotiPerAxList, setRotiPerAxList] = useState<number[]>([2, 4]);

  // MODAL EDITARE VEHICUL
  const [showEditModal, setShowEditModal] = useState(false);
  const [editModConfigurareAxe, setEditModConfigurareAxe] = useState<'AUTOMAT' | 'MANUAL'>('AUTOMAT');
  const [editRotiPerAxList, setEditRotiPerAxList] = useState<number[]>([2, 4]);

  // MODAL ÎNREGISTRARE RAPIDĂ CONTOARE (BATCH & GPS)
  const [showContorModal, setShowContorModal] = useState(false);
  const [dataOperareContor, setDataOperareContor] = useState(new Date().toISOString().split('T')[0]);
  const [operatorContor, setOperatorContor] = useState('Șofer / Mecanic Atelier');
  const [observatiiContor, setObservatiiContor] = useState('');
  const [searchContorModal, setSearchContorModal] = useState('');
  const [contoareEditMap, setContoareEditMap] = useState<{ [vehiculId: string]: number }>({});
  const [istoricContoare, setIstoricContoare] = useState<any[]>([]);
  const [tabContorModal, setTabContorModal] = useState<'batch' | 'gps' | 'istoric'>('batch');
  const [gpsRawText, setGpsRawText] = useState('');

  // BASELINES / VALORI DE BAZĂ ALERTE PER VEHICUL
  const [baselinesList, setBaselinesList] = useState<any[]>([]);
  const [showBaselineModal, setShowBaselineModal] = useState<any>(null);
  const [baselineContor, setBaselineContor] = useState<number>(0);
  const [baselineData, setBaselineData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [baselineObs, setBaselineObs] = useState<string>('');
  const [baselineMecanic, setBaselineMecanic] = useState<string>('');

  // REZOLVARE RAPIDĂ (pentru operațiuni simple: Suflare filtru aer etc.)
  const [showRezolvatRapidModal, setShowRezolvatRapidModal] = useState<any>(null);
  const [rzData, setRzData] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rzContor, setRzContor] = useState<number>(0);
  const [rzMecanic, setRzMecanic] = useState<string>('');
  const [rzObs, setRzObs] = useState<string>('');

  // DESCHIDERE COMANDĂ DE LUCRU (pentru operațiuni complexe: Schimb ulei motor etc.)
  const [showComandaRapidaModal, setShowComandaRapidaModal] = useState<any>(null);
  const [cmdContor, setCmdContor] = useState<number>(0);
  const [cmdMecanic, setCmdMecanic] = useState<string>('');
  const [cmdObs, setCmdObs] = useState<string>('');

  // ALERTE CENTRALIZATE (FOR FLEET OVERVIEW COUNTERS)
  const [alerteMap, setAlerteMap] = useState<{ [vehId: string]: number }>({});

  const fetchVehicule = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/vehicule');
      if (res.ok) {
        const data = await res.json();
        setVehicule(data);
        if (data.length > 0 && !selectedId) {
          setSelectedId(data[0].id);
        }

        // Pre-fill contor map for batch modal
        const initialMap: { [id: string]: number } = {};
        data.forEach((v: any) => {
          initialMap[v.id] = v.valoareContorCurent;
        });
        setContoareEditMap(initialMap);
      }

      // Fetch active alerts count per vehicle
      const resAlerte = await fetch('http://localhost:3001/anomalii/alerte-centralizate');
      if (resAlerte.ok) {
        const listAlerte = await resAlerte.json();
        const map: { [vehId: string]: number } = {};
        listAlerte.forEach((a: any) => {
          if (a.vehiculId) {
            map[a.vehiculId] = (map[a.vehiculId] || 0) + 1;
          }
        });
        setAlerteMap(map);
      }
    } catch (e) {
      console.log('Error fetching vehicule', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFisa = async (id: string) => {
    if (!id) return;
    try {
      const res = await fetch(`http://localhost:3001/vehicule/${id}/fisa-tehnica`);
      if (res.ok) {
        const data = await res.json();
        setFisaData(data);

        // Pre-fill edit modal form
        if (data.vehicul) {
          const v = data.vehicul;
          setNumarIntern(v.numarIntern || '');
          setNumarInmatriculare(v.numarInmatriculare || '');
          setCategorieEnum(v.categorieEnum || 'CAP_TRACTOR');
          setMarca(v.marca || '');
          setModel(v.model || '');
          setAnFabricatie(v.anFabricatie || new Date().getFullYear());
          setSerieSasiu(v.serieSasiu || v.vin || '');
          setTipMasurare(v.tipMasurare || 'KM');
          setValoareContorInitial(v.valoareContorInitial || 0);
          setValoareContorCurent(v.valoareContorCurent || 0);
          setTarifOrar(v.tarifOrarManoperaAtelier || 0);

          if (v.pozitiiAxe && v.pozitiiAxe.length > 0) {
            setEditModConfigurareAxe('MANUAL');
            const axMap: { [ax: number]: number } = {};
            v.pozitiiAxe.forEach((p: any) => {
              axMap[p.numarAx] = (axMap[p.numarAx] || 0) + 1;
            });
            const list = Object.keys(axMap).sort((a, b) => Number(a) - Number(b)).map(k => axMap[Number(k)]);
            setEditRotiPerAxList(list.length > 0 ? list : [2, 4]);
          } else {
            setEditModConfigurareAxe('AUTOMAT');
          }
        }
      }
    } catch (e) {
      console.log('Error fetching fisa', e);
    }
  };

  const fetchBaselines = async (vehId: string) => {
    if (!vehId) return;
    try {
      const res = await fetch(`http://localhost:3001/anomalii/baselines-vehicul/${vehId}`);
      if (res.ok) {
        setBaselinesList(await res.json());
      }
    } catch (e) {
      console.log('Error fetching baselines', e);
    }
  };

  const fetchIstoricContoare = async () => {
    try {
      const res = await fetch('http://localhost:3001/vehicule/istoric-contoare');
      if (res.ok) setIstoricContoare(await res.json());
    } catch (e) {
      console.log('Error fetching istoric contoare', e);
    }
  };

  useEffect(() => {
    fetchVehicule();
    fetchIstoricContoare();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchFisa(selectedId);
      fetchBaselines(selectedId);
    }
  }, [selectedId]);

  const handleOpenContorModal = () => {
    const map: { [id: string]: number } = {};
    vehicule.forEach((v) => {
      map[v.id] = v.valoareContorCurent;
    });
    setContoareEditMap(map);
    setShowContorModal(true);
  };

  const handlePrintDocument = () => {
    const printContent = document.getElementById('printable-a4-area');
    if (!printContent) return;

    const winPrint = window.open('', '', 'left=0,top=0,width=900,height=900,toolbar=0,scrollbars=0,status=0');
    if (!winPrint) return;

    winPrint.document.write(`
      <html>
        <head>
          <title>Comanda_de_Lucru_${showViewModal?.numarComanda || 'Print'}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { margin: 0; padding: 20px; -webkit-print-color-adjust: exact; }
              #printable-a4-area { border: none !important; box-shadow: none !important; }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div style="max-width: 800px; margin: 0 auto;">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);
    winPrint.document.close();
    winPrint.focus();
  };

  // SAVE BASELINE PER VEHICLE & ALERT RULE
  const handleSaveBaseline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBaselineModal || !selectedId) return;

    try {
      const res = await fetch('http://localhost:3001/anomalii/setare-baseline-vehicul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedId,
          regulaAlertaId: showBaselineModal.regulaId,
          ultimulSchimbContor: Number(baselineContor),
          ultimulSchimbData: baselineData,
          observatii: `${baselineMecanic ? baselineMecanic + ' — ' : ''}${baselineObs}`.trim(),
        }),
      });

      if (res.ok) {
        alert('✅ Valoarea de bază a fost salvată cu succes!');
        setShowBaselineModal(null);
        fetchBaselines(selectedId);
        fetchVehicule();
      }
    } catch (e) {
      alert('Eroare la salvarea valorii de bază.');
    }
  };

  // REZOLVARE RAPIDĂ (pentru ZILE-trigger: Suflare filtru aer, etc.)
  const handleRezolvatRapid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRezolvatRapidModal || !selectedId) return;

    try {
      const res = await fetch('http://localhost:3001/anomalii/setare-baseline-vehicul', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedId,
          regulaAlertaId: showRezolvatRapidModal.regulaId,
          ultimulSchimbContor: Number(rzContor),
          ultimulSchimbData: rzData,
          observatii: `Rezolvat de: ${rzMecanic || 'Mecanic Atelier'}. ${rzObs}`.trim(),
        }),
      });

      if (res.ok) {
        alert(`✅ ${showRezolvatRapidModal.denumireOperatiune} marcat ca REZOLVAT! Contorul a fost resetat.`);
        setShowRezolvatRapidModal(null);
        setRzData(new Date().toISOString().split('T')[0]);
        setRzContor(0);
        setRzMecanic('');
        setRzObs('');
        fetchBaselines(selectedId);
        fetchVehicule();
      }
    } catch (e) {
      alert('Eroare la marcarea ca rezolvat.');
    }
  };

  // DESCHIDE COMANDĂ DE LUCRU RAPIDĂ (pentru KM/MTH-trigger: Schimb ulei motor etc.)
  const handleCreazaComandaRapida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showComandaRapidaModal || !selectedId) return;

    const vehiculActiv = vehicule.find(v => v.id === selectedId);
    if (!vehiculActiv) return;

    try {
      const res = await fetch('http://localhost:3001/mentenanta/comenzi-lucru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedId,
          mecanicResponsabil: cmdMecanic || 'Mecanic Atelier',
          descriereProblema: showComandaRapidaModal.denumireOperatiune,
          valoareContorLaExecutie: Number(cmdContor) || vehiculActiv.valoareContorCurent,
          observatii: cmdObs || '',
          tipLucrare: 'MENTENANTA_PLANIFICATA',
        }),
      });

      if (res.ok) {
        const comanda = await res.json();
        alert(`✅ Comandă de Lucru ${comanda.numarComanda} creată! Mergeți la secțiunea Comenzi de Lucru pentru a adăuga piesele.`);
        setShowComandaRapidaModal(null);
        setCmdContor(0);
        setCmdMecanic('');
        setCmdObs('');
        fetchFisa(selectedId);
        setActiveTab('comenzi');
      }
    } catch (e) {
      alert('Eroare la crearea comenzii de lucru.');
    }
  };

  const handleSaveContorSingle = async (vehiculId: string) => {
    const nouaValoare = contoareEditMap[vehiculId];
    const veh = vehicule.find((v) => v.id === vehiculId);
    if (!veh || nouaValoare === undefined) return;

    if (nouaValoare < veh.valoareContorCurent) {
      alert(`Valoarea contorului nu poate fi mai mică decât contorul curent (${veh.valoareContorCurent} ${veh.tipMasurare})!`);
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/vehicule/inregistrare-contor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId,
          valoareContor: Number(nouaValoare),
          dataInregistrare: dataOperareContor,
          operator: operatorContor,
          observatii: observatiiContor || 'Actualizare manuală rapidă contor',
        }),
      });

      if (res.ok) {
        alert(`✅ Contor actualizat cu succes pentru ${veh.numarIntern}!`);
        fetchVehicule();
        if (selectedId) fetchFisa(selectedId);
        fetchIstoricContoare();
      }
    } catch (e) {
      alert('Eroare la salvarea contorului.');
    }
  };

  const handleSaveContoareBatch = async () => {
    const entries: any[] = [];

    vehicule.forEach((v) => {
      const editVal = contoareEditMap[v.id];
      if (editVal !== undefined && editVal > v.valoareContorCurent) {
        entries.push({
          vehiculId: v.id,
          valoareContor: Number(editVal),
          dataInregistrare: dataOperareContor,
          operator: operatorContor,
          observatii: observatiiContor || 'Actualizare în lot (Batch)',
        });
      }
    });

    if (entries.length === 0) {
      alert('Nu există contoare modificate cu valori mai mari decât cele curente!');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/vehicule/inregistrare-contoare-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });

      if (res.ok) {
        alert(`🚀 Cele ${entries.length} contoare au fost actualizate cu succes!`);
        fetchVehicule();
        if (selectedId) fetchFisa(selectedId);
        fetchIstoricContoare();
      }
    } catch (e) {
      alert('Eroare la salvarea contoarelor în lot.');
    }
  };

  const handleImportGpsText = async () => {
    if (!gpsRawText.trim()) {
      alert('Vă rugăm introduceți datele GPS / CSV!');
      return;
    }

    const lines = gpsRawText.trim().split('\n');
    const records: any[] = [];

    for (const line of lines) {
      if (!line.trim() || line.startsWith('#') || line.toLowerCase().includes('numar')) continue;
      const parts = line.split(/[,;\t]/).map(p => p.trim());
      if (parts.length >= 2) {
        const numInt = parts[0];
        const val = parseFloat(parts[1]);
        const dataStr = parts[2] || dataOperareContor;
        if (numInt && !isNaN(val)) {
          records.push({
            numarIntern: numInt,
            valoareContor: val,
            dataInregistrare: dataStr,
            sursaGps: 'IMPORT_GPS_CSV',
            observatii: 'Sincronizare automatizată telematică GPS din fișier'
          });
        }
      }
    }

    if (records.length === 0) {
      alert('Nu s-au putut procesa linii valide! Format așteptat: NUMAR_INTERN;VALOARE_CONTOR;DATA');
      return;
    }

    try {
      const res = await fetch('http://localhost:3001/vehicule/import-gps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.mesaj}`);
        setGpsRawText('');
        fetchVehicule();
        if (selectedId) fetchFisa(selectedId);
        fetchIstoricContoare();
      }
    } catch (e) {
      alert('Eroare la importul datelor GPS.');
    }
  };

  // Add new vehicle
  const handleAddVehicul = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/vehicule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numarIntern,
          numarInmatriculare,
          categorieEnum,
          marca,
          model,
          anFabricatie: Number(anFabricatie),
          serieSasiu,
          tipMasurare,
          valoareContorInitial: Number(valoareContorInitial),
          valoareContorCurent: Number(valoareContorCurent),
          tarifOrarManoperaAtelier: Number(tarifOrar),
          modConfigurareAxe,
          rotiPerAxList: modConfigurareAxe === 'MANUAL' ? rotiPerAxList : undefined,
        }),
      });

      if (res.ok) {
        const vNou = await res.json();
        setShowAddModal(false);
        fetchVehicule();
        setSelectedId(vNou.id);
        setViewMode('fisa_dedicata');
        alert(`Vehicul ${vNou.numarIntern} adăugat cu succes!`);
      }
    } catch (e) {
      alert('Eroare la crearea vehiculului.');
    }
  };

  // Update existing vehicle
  const handleUpdateVehicul = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;

    try {
      const res = await fetch(`http://localhost:3001/vehicule/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numarIntern,
          numarInmatriculare,
          categorieEnum,
          marca,
          model,
          anFabricatie: Number(anFabricatie),
          serieSasiu,
          tipMasurare,
          valoareContorInitial: Number(valoareContorInitial),
          valoareContorCurent: Number(valoareContorCurent),
          tarifOrarManoperaAtelier: Number(tarifOrar),
          modConfigurareAxe: editModConfigurareAxe,
          rotiPerAxList: editModConfigurareAxe === 'MANUAL' ? editRotiPerAxList : undefined,
        }),
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchVehicule();
        fetchFisa(selectedId);
        alert('Datele vehiculului au fost actualizate!');
      }
    } catch (e) {
      alert('Eroare la actualizarea vehiculului.');
    }
  };

  const piloni = fisaData?.costuri || fisaData?.piloniCost || {
    costPieseStoc: 0,
    costPieseDirecte: 0,
    costServiciiExterne: 0,
    costManoperaInterna: 0,
    costTotalGneral: 0,
  };

  const vehicul = fisaData?.vehicul;
  const costTotal = piloni.costTotalGrajd || piloni.costTotalGneral || 0;
  const kpiCostPer1000Km = Number(((costTotal / Math.max(1, vehicul?.valoareContorCurent || 1)) * 1000).toFixed(2));
  const kpiCostPer10Ore = Number(((costTotal / Math.max(1, vehicul?.valoareContorCurent || 1)) * 10).toFixed(2));

  const vehiculeFiltrate = vehicule.filter((v) => {
    const matchCat = selectedCatFilter ? v.categorieEnum === selectedCatFilter : true;
    if (searchQueryFleet) {
      const q = searchQueryFleet.toLowerCase();
      const matchSearch = v.numarIntern?.toLowerCase().includes(q) || v.numarInmatriculare?.toLowerCase().includes(q) || v.marca?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    }
    return matchCat;
  });

  const categoriiDisponibile = Array.from(new Set(vehicule.map((v) => v.categorieEnum)));

  return (
    <div className="space-y-6 max-w-7xl">
      {/* ANTET TITLU & BUTOANE GENERAL FLOTĂ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-sapphire-900 tracking-tight flex items-center space-x-2">
            <Truck className="w-7 h-7 text-sapphire-500" />
            <span>Vehicule & Flotă (Fișă Tehnică Digitală & Alerte)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium mt-1">
            Registrul centralizat al parcului auto, evidență pe categorii, valori de bază alerte și istoric tehnic
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleOpenContorModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-terracotta-500 hover:bg-terracotta-600 text-white text-xs font-bold shadow-md shadow-terracotta-500/20 transition"
          >
            <Clock className="w-4 h-4" />
            <span>⏱️ Înregistrare Rapidă Contoare (KM / mTH)</span>
          </button>
        </div>
      </div>

      {/* BARĂ COMUTARE MOD VIZUALIZARE: TABEL PE CATEGORII VS FIȘĂ DEDICATĂ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-morning-100 p-2 rounded-2xl border border-morning-200">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('lista_tabel')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition ${
              viewMode === 'lista_tabel' ? 'bg-sapphire-500 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-morning-50 border border-morning-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>📋 Tabel Întreaga Flotă pe Categorii ({vehiculeFiltrate.length})</span>
          </button>

          <button
            onClick={() => setViewMode('fisa_dedicata')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-extrabold transition ${
              viewMode === 'fisa_dedicata' ? 'bg-sapphire-500 text-white shadow-md' : 'bg-white text-slate-700 hover:bg-morning-50 border border-morning-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>🚗 Fișă Tehnică Dedicată ({vehicul ? vehicul.numarIntern : 'Selectează'})</span>
          </button>
        </div>

        {viewMode === 'fisa_dedicata' && (
          <div className="w-full sm:w-auto">
            <VehicleSelector
              selectedId={selectedId}
              onSelect={(v) => setSelectedId(v.id)}
              vehicule={vehicule}
            />
          </div>
        )}
      </div>

      {/* ─── VIZUALIZARE 1: TABEL ÎNTREAGA FLOTĂ PE CATEGORII ─── */}
      {viewMode === 'lista_tabel' && (
        <div className="pleasant-card rounded-2xl p-6 bg-white border border-morning-200 space-y-4 shadow-sm">
          {/* BARĂ FILTRARE PE CATEGORII & CĂUTARE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-morning-200 pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-sapphire-900 flex items-center space-x-1">
                <Filter className="w-4 h-4 text-sapphire-500" />
                <span>Categorii:</span>
              </span>

              <button
                onClick={() => setSelectedCatFilter('')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedCatFilter === '' ? 'bg-sapphire-500 text-white shadow-xs' : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
                }`}
              >
                Toate Categoriile ({vehicule.length})
              </button>

              {categoriiDisponibile.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCatFilter(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    selectedCatFilter === cat ? 'bg-sapphire-500 text-white shadow-xs' : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
                  }`}
                >
                  {cat} ({vehicule.filter(v => v.categorieEnum === cat).length})
                </button>
              ))}
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-sage-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQueryFleet}
                onChange={(e) => setSearchQueryFleet(e.target.value)}
                placeholder="🔍 Căutare cod, număr, marcă..."
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-sapphire-900 font-bold focus:bg-white transition"
              />
            </div>
          </div>

          {/* TABEL CENTRALIZAT FLOTĂ */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="p-3">Cod Intern Utilaj</th>
                  <th className="p-3">Înmatriculare</th>
                  <th className="p-3">Categorie & Marcă / Model</th>
                  <th className="p-3 font-mono">Contor Curent</th>
                  <th className="p-3">Stare Operativă</th>
                  <th className="p-3 text-center">Status Alerte Active</th>
                  <th className="p-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200 font-medium">
                {vehiculeFiltrate.map((v) => {
                  const numAlerte = alerteMap[v.id] || 0;
                  return (
                    <tr key={v.id} className="hover:bg-morning-50 transition">
                      <td className="p-3 font-black text-sapphire-900 text-sm">{v.numarIntern}</td>
                      <td className="p-3 font-bold font-mono text-slate-800">{v.numarInmatriculare}</td>
                      <td className="p-3">
                        <span className="font-extrabold text-sapphire-900">{v.marca} {v.model}</span>
                        <span className="block text-[10px] text-sage-600 font-bold">{v.categorieEnum}</span>
                      </td>
                      <td className="p-3 font-mono font-extrabold text-sapphire-700">
                        {v.valoareContorCurent} {v.tipMasurare}
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sage-100 text-sage-700">
                          {v.stare || 'ACTIV'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {numAlerte > 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-roseash-200 text-terracotta-700 border border-terracotta-400 animate-pulse">
                            🚨 {numAlerte} Alerte Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sage-100 text-sage-700">
                            🟢 Flotă Optimă
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => {
                            setSelectedId(v.id);
                            setViewMode('fisa_dedicata');
                          }}
                          className="px-3 py-1.5 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Deschide Fișă Tehnică</span>
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

      {/* ─── VIZUALIZARE 2: FIȘĂ TEHNICĂ DEDICATĂ PE VEHICUL ─── */}
      {viewMode === 'fisa_dedicata' && vehicul && (
        <div className="pleasant-card p-6 rounded-2xl bg-white border border-morning-200 space-y-4 shadow-sm">
          {/* ANTET VEHICUL DEDICAT */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-morning-200 pb-4">
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-extrabold text-sapphire-900 tracking-tight">{vehicul.numarIntern}</h2>
                <span className="px-3 py-1 rounded-xl bg-sapphire-50 border border-sapphire-100 text-sapphire-600 text-xs font-extrabold uppercase">
                  {vehicul.categorieEnum}
                </span>
                <span className="px-3 py-1 rounded-xl bg-sage-100 text-sage-700 text-xs font-bold flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-sage-600" />
                  <span>Stare: ACTIV</span>
                </span>
              </div>
              <p className="text-xs text-sage-700 font-medium mt-1">
                {vehicul.marca} {vehicul.model} (An Fabricatie: {vehicul.anFabricatie}) | Serie Șasiu / VIN: <span className="font-mono text-sapphire-900 font-bold">{vehicul.serieSasiu || vehicul.vin || 'N/A'}</span>
              </p>
            </div>

            <div className="flex items-center space-x-6 text-right">
              <div>
                <p className="text-[10px] text-sage-700 font-bold uppercase tracking-wider">Înmatriculare</p>
                <p className="text-sm font-bold text-sapphire-900 font-mono">{vehicul.numarInmatriculare}</p>
              </div>

              <div className="h-8 w-px bg-morning-200"></div>

              <div>
                <p className="text-[10px] text-sage-700 font-bold uppercase tracking-wider">Contor Inițial</p>
                <p className="text-xs font-bold text-slate-800 font-mono">
                  {vehicul.valoareContorInitial || 0} {vehicul.tipMasurare}
                </p>
              </div>

              <div className="h-8 w-px bg-morning-200"></div>

              <div>
                <p className="text-[10px] text-sage-700 font-bold uppercase tracking-wider">Contor Curent</p>
                <p className="text-base font-extrabold text-sapphire-700 font-mono">
                  {vehicul.valoareContorCurent} {vehicul.tipMasurare}
                </p>
              </div>

              <div className="h-8 w-px bg-morning-200"></div>

              <button
                onClick={() => setShowEditModal(true)}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-morning-100 border border-morning-200 text-xs font-bold text-sapphire-900 shadow-xs transition flex items-center space-x-1"
              >
                <Edit3 className="w-4 h-4 text-sapphire-500" />
                <span>Editează Date</span>
              </button>
            </div>
          </div>

          {/* MENIU TABS FIȘĂ DEDICATĂ */}
          <div className="flex items-center space-x-2 pt-2 border-b border-morning-200 overflow-x-auto">
            <button
              onClick={() => setActiveTab('piloni')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'piloni' ? 'bg-sapphire-500 text-white shadow-md' : 'text-sage-700 hover:bg-morning-100 hover:text-sapphire-900'
              }`}
            >
              <PieChart className="w-4 h-4" />
              <span>Sumar Costuri & KPI</span>
            </button>

            <button
              onClick={() => setActiveTab('mentenanta')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'mentenanta' ? 'bg-sapphire-500 text-white shadow-md' : 'text-sage-700 hover:bg-morning-100 hover:text-sapphire-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span>⚙️ Mentenanță Preventivă & Alerte Bază ({baselinesList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('comenzi')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'comenzi' ? 'bg-sapphire-500 text-white shadow-md' : 'text-sage-700 hover:bg-morning-100 hover:text-sapphire-900'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Comenzi de Lucru & Facturi ({vehicul.comenziLucru?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('anvelope')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'anvelope' ? 'bg-sapphire-500 text-white shadow-md' : 'text-sage-700 hover:bg-morning-100 hover:text-sapphire-900'
              }`}
            >
              <CircleDot className="w-4 h-4" />
              <span>Stare Anvelope & Axe ({vehicul.anvelope?.length || 0})</span>
            </button>

            <button
              onClick={() => setActiveTab('lichide')}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'lichide' ? 'bg-sapphire-500 text-white shadow-md' : 'text-sage-700 hover:bg-morning-100 hover:text-sapphire-900'
              }`}
            >
              <Droplets className="w-4 h-4" />
              <span>Uleiuri & Fluide ({vehicul.completariLichid?.length || 0})</span>
            </button>
          </div>

          {/* TAB 1: PILONI DE COST & KPI */}
          {activeTab === 'piloni' && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-morning-50 border border-morning-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Cost Total Istoric</p>
                    <p className="text-xl font-black text-sapphire-900 font-mono mt-1">{costTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} RON</p>
                  </div>
                  <DollarSign className="w-7 h-7 text-sapphire-500" />
                </div>

                <div className="p-4 rounded-xl bg-morning-50 border border-morning-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">KPI Cost / 1000 KM</p>
                    <p className="text-xl font-black text-slate-800 font-mono mt-1">{kpiCostPer1000Km} RON</p>
                  </div>
                  <Clock className="w-7 h-7 text-sage-500" />
                </div>

                <div className="p-4 rounded-xl bg-morning-50 border border-morning-200 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">KPI Cost / 10 Ore Marș</p>
                    <p className="text-xl font-black text-slate-800 font-mono mt-1">{kpiCostPer10Ore} RON</p>
                  </div>
                  <Wrench className="w-7 h-7 text-sage-500" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MENTENANȚĂ PREVENTIVĂ & BASELINE DATA PER VEHICLE */}
          {activeTab === 'mentenanta' && (
            <div className="pleasant-card rounded-2xl p-6 space-y-4 bg-white border border-morning-200">
              <div className="flex items-center justify-between border-b border-morning-200 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-sapphire-900">
                    ⚙️ Valori de Bază (Ultimul Schimb) & Monitorizare Alerte Mentenanță
                  </h3>
                  <p className="text-xs text-sage-600 font-medium">
                    Setați contorul sau data ultimului schimb pentru fiecare operațiune. Din aceste date de bază sistemul calculează automat alertarea!
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Operațiune Mentenanță</th>
                      <th className="p-3 font-mono">Limită Maximă</th>
                      <th className="p-3 font-mono bg-sapphire-50 text-sapphire-900">Valoare de Bază (Ultimul Schimb)</th>
                      <th className="p-3 font-mono">Contor Curent Utilaj</th>
                      <th className="p-3 font-mono">Rulaj Parcurs de la Schimb</th>
                      <th className="p-3 font-mono">Rămas până la Alertă</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Actiune</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200 font-medium">
                    {baselinesList.map((b) => (
                      <tr key={b.regulaId} className={`hover:bg-morning-50 transition ${b.esteDepasit ? 'bg-roseash-100/40' : b.esteInPrag ? 'bg-amber-50/40' : ''}`}>
                        <td className="p-3 font-extrabold text-sapphire-900 whitespace-nowrap">{b.denumireOperatiune}</td>
                        <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {b.valoareMaxima} {b.tipTrigger}
                        </td>
                        {/* CLICKABLE baseline cell */}
                        <td
                          className="p-3 font-mono font-extrabold text-sapphire-900 bg-sapphire-50 cursor-pointer hover:bg-sapphire-100 transition group"
                          title="Click pentru a seta valoarea de baza"
                          onClick={() => {
                            setShowBaselineModal(b);
                            setBaselineContor(b.ultimulSchimbContor || 0);
                            setBaselineData(b.ultimulSchimbData ? new Date(b.ultimulSchimbData).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                            setBaselineObs('');
                            setBaselineMecanic('');
                          }}
                        >
                          <span className="flex items-center space-x-1">
                            <span>{b.ultimulSchimbContor} {b.tipTrigger}</span>
                            <Edit3 className="w-3 h-3 text-sapphire-400 opacity-0 group-hover:opacity-100 transition" />
                          </span>
                          <span className="block text-[10px] text-sage-600 font-normal">
                            {new Date(b.ultimulSchimbData).toLocaleDateString('ro-RO')}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {b.valoareContorCurent} {b.tipMasurareVehicul}
                        </td>
                        <td className="p-3 font-mono font-black text-sapphire-700 whitespace-nowrap">
                          {b.rulajEfectiv} {b.tipTrigger}
                        </td>
                        <td className="p-3 font-mono font-extrabold text-slate-700 whitespace-nowrap">
                          {b.ramase} {b.tipTrigger}
                        </td>
                        <td className="p-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black whitespace-nowrap ${
                            b.statusBadge === 'CRITIC' ? 'bg-terracotta-600 text-white animate-pulse' :
                            b.statusBadge === 'AVERTIZARE' ? 'bg-amber-500 text-white' :
                            'bg-sage-100 text-sage-800'
                          }`}>
                            {b.statusBadge === 'CRITIC' ? 'DEPAŞIT' : b.statusBadge === 'AVERTIZARE' ? 'AVERTIZARE' : 'OK'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            {b.tipTrigger === 'ZILE' ? (
                              <button
                                onClick={() => {
                                  setShowRezolvatRapidModal(b);
                                  setRzData(new Date().toISOString().split('T')[0]);
                                  setRzContor(b.valoareContorCurent || 0);
                                  setRzMecanic('');
                                  setRzObs('');
                                }}
                                className="px-3 py-1.5 bg-sage-600 hover:bg-sage-700 text-white font-bold text-[11px] rounded-xl shadow-xs transition whitespace-nowrap flex items-center space-x-1"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Marcat Rezolvat</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setShowComandaRapidaModal(b);
                                  setCmdContor(b.valoareContorCurent || 0);
                                  setCmdMecanic('');
                                  setCmdObs('');
                                }}
                                className="px-3 py-1.5 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-[11px] rounded-xl shadow-xs transition whitespace-nowrap flex items-center space-x-1"
                              >
                                <Wrench className="w-3.5 h-3.5" />
                                <span>Creeaza Comanda Lucru</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}


          {/* TAB 3: COMENZI DE LUCRU */}
          {activeTab === 'comenzi' && (
            <div className="pleasant-card rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-sapphire-900">Istoric Comenzi de Lucru & Facturi Intervenții</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Număr Comandă</th>
                      <th className="p-3">Dată Deschidere / Închidere</th>
                      <th className="p-3">Stare</th>
                      <th className="p-3">Mecanic Responsabil</th>
                      <th className="p-3 text-right">Cost Total Intervenție</th>
                      <th className="p-3 text-right">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200">
                    {vehicul?.comenziLucru?.map((cl: any) => {
                      const sumEl = cl.elementeComanda?.reduce((s: number, el: any) => s + (el.costTotal || 0), 0) || 0;
                      return (
                        <tr key={cl.id} className="hover:bg-morning-50 transition">
                          <td className="p-3 font-extrabold text-sapphire-900 font-mono">{cl.numarComanda}</td>
                          <td className="p-3 text-sage-700 font-medium">
                            {new Date(cl.dataDeschidere).toLocaleDateString('ro-RO')}
                            {cl.dataFinalizare && ` - ${new Date(cl.dataFinalizare).toLocaleDateString('ro-RO')}`}
                          </td>
                          <td className="p-3">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              cl.stare === 'FINALIZAT' ? 'bg-sapphire-50 text-sapphire-600 border border-sapphire-100' : 'bg-periwinkle-100 text-periwinkle-700'
                            }`}>
                              {cl.stare}
                            </span>
                          </td>
                          <td className="p-3 font-bold text-slate-800">{cl.mecanicResponsabil || 'Atelier'}</td>
                          <td className="p-3 text-right font-mono font-extrabold text-sapphire-900">{sumEl} RON</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setShowViewModal({
                                ...cl,
                                vehiculNumarIntern: vehicul.numarIntern,
                                vehiculInmatriculare: vehicul.numarInmatriculare,
                                vehiculMarca: vehicul.marca,
                                vehiculModel: vehicul.model,
                                vehiculSerieSasiu: vehicul.serieSasiu || vehicul.vin,
                                vehiculTipMasurare: vehicul.tipMasurare || 'KM/mTH',
                              })}
                              className="px-3 py-1.5 bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 font-bold text-[11px] rounded-xl border border-sapphire-200 transition flex items-center space-x-1.5 ml-auto"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Vizualizare</span>
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

          {/* TAB 4: STARE ANVELOPE */}
          {activeTab === 'anvelope' && (
            <div className="pleasant-card rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-sapphire-900">Anvelope Montate pe Șasiu Utilaj</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {vehicul?.anvelope?.map((anv: any) => (
                  <div key={anv.id} className="p-4 rounded-xl border border-morning-200 bg-white flex justify-between items-center">
                    <div>
                      <p className="font-extrabold text-sapphire-900 text-xs">{anv.marca} {anv.model} ({anv.dimensiune})</p>
                      <p className="text-[10px] text-sage-600 font-mono">Serie: {anv.serieAnvelopa} | Poziție: {anv.pozitieAx?.codPozitie || 'Șasiu'}</p>
                    </div>
                    <div className="text-right font-mono">
                      <p className="text-xs font-extrabold text-sapphire-700">{anv.adancimeCurentaMm} mm</p>
                      <p className="text-[10px] text-sage-500">Profil măsurat</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: LICHIDE & SCURGERI */}
          {activeTab === 'lichide' && (
            <div className="pleasant-card rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-sapphire-900">Jurnal Completări Ulei & Detector Anomalii Scurgeri</h3>
              <div className="space-y-2">
                {vehicul?.completariLichid?.map((lic: any) => (
                  <div key={lic.id} className="p-3 rounded-xl bg-morning-50 border border-morning-200 text-xs flex justify-between items-center">
                    <div>
                      <p className="font-bold text-sapphire-900">{lic.tipLichid?.replace(/_/g, ' ')} ({lic.tipOperatiune})</p>
                      <p className="text-[10px] text-sage-600 font-mono">Dată: {new Date(lic.dataCompletare).toLocaleDateString('ro-RO')} | Mecanic: {lic.mecanic}</p>
                    </div>
                    <div className="font-mono text-right font-bold text-sapphire-900">
                      {lic.cantitateLitri} Litri
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL SETARE VALOARE DE BAZA (EDITARE MANUALA) */}
      {showBaselineModal && (
        <div className="fixed inset-0 bg-sapphire-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-morning-200 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="font-extrabold text-sapphire-900 text-base flex items-center space-x-2">
                <Clock className="w-5 h-5 text-sapphire-500" />
                <span>Setare Valoare de Baza (Ultimul Schimb)</span>
              </h3>
              <button onClick={() => setShowBaselineModal(null)} className="text-sage-400 hover:text-sapphire-900 font-bold">X</button>
            </div>
            <form onSubmit={handleSaveBaseline} className="space-y-4 text-xs">
              <div className="p-3 bg-sapphire-50 border border-sapphire-200 rounded-xl space-y-1">
                <p className="font-extrabold text-sapphire-900">{showBaselineModal.denumireOperatiune}</p>
                <p className="text-[11px] text-sage-700 font-medium">
                  Setarea contorului sau datei ultimului schimb efectuat. Din aceasta valoare sistemul masoara exact parcursul!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-sapphire-900 block mb-1">
                    Contor Ultimul Schimb ({showBaselineModal.tipTrigger}): *
                  </label>
                  <input
                    type="number"
                    required
                    value={baselineContor}
                    onChange={(e) => setBaselineContor(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-mono font-bold text-sapphire-900"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-sapphire-900 block mb-1">Data Ultimului Schimb: *</label>
                  <input
                    type="date"
                    required
                    value={baselineData}
                    onChange={(e) => setBaselineData(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                  />
                </div>
              </div>
              <div>
                <label className="font-extrabold text-sapphire-900 block mb-1">Mecanic / Efectuat de:</label>
                <input
                  type="text"
                  placeholder="ex: Mec. Ion Popescu"
                  value={baselineMecanic}
                  onChange={(e) => setBaselineMecanic(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                />
              </div>
              <div>
                <label className="font-extrabold text-sapphire-900 block mb-1">Observatii / Factura Schimb:</label>
                <input
                  type="text"
                  placeholder="ex: Schimb efectuat in reprezentanta..."
                  value={baselineObs}
                  onChange={(e) => setBaselineObs(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowBaselineModal(null)} className="px-4 py-2 bg-morning-200 text-slate-700 font-bold rounded-xl">Renunta</button>
                <button type="submit" className="px-5 py-2 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold rounded-xl shadow-xs">Salveaza Valoarea de Baza</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REZOLVARE RAPIDA (ZILE-trigger: Suflare filtru aer etc.) */}
      {showRezolvatRapidModal && (
        <div className="fixed inset-0 bg-sapphire-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-morning-200 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="font-extrabold text-sapphire-900 text-base flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-sage-500" />
                <span>Marcare Rezolvat: {showRezolvatRapidModal.denumireOperatiune}</span>
              </h3>
              <button onClick={() => setShowRezolvatRapidModal(null)} className="text-sage-400 hover:text-sapphire-900 font-bold">X</button>
            </div>
            <form onSubmit={handleRezolvatRapid} className="space-y-4 text-xs">
              <div className="p-3 bg-sage-50 border border-sage-200 rounded-xl space-y-1">
                <p className="font-extrabold text-sage-900">{showRezolvatRapidModal.denumireOperatiune}</p>
                <p className="text-[11px] text-sage-700 font-medium">
                  Marcarea ca rezolvat va reseta contorul. Sistemul va incepe masurarea de la aceasta data!
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-sapphire-900 block mb-1">Data Efectuarii: *</label>
                  <input
                    type="date"
                    required
                    value={rzData}
                    onChange={(e) => setRzData(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-sapphire-900 block mb-1">Contor la Efectuare (KM / mTH):</label>
                  <input
                    type="number"
                    value={rzContor}
                    onChange={(e) => setRzContor(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-mono font-bold text-sapphire-900"
                  />
                </div>
              </div>
              <div>
                <label className="font-extrabold text-sapphire-900 block mb-1">Efectuat de (Mecanic): *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Mec. Vasile Ionescu"
                  value={rzMecanic}
                  onChange={(e) => setRzMecanic(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                />
              </div>
              <div>
                <label className="font-extrabold text-sapphire-900 block mb-1">Observatii:</label>
                <input
                  type="text"
                  placeholder="ex: Suflare efectuata cu compresor atelier..."
                  value={rzObs}
                  onChange={(e) => setRzObs(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowRezolvatRapidModal(null)} className="px-4 py-2 bg-morning-200 text-slate-700 font-bold rounded-xl">Renunta</button>
                <button type="submit" className="px-5 py-2 bg-sage-600 hover:bg-sage-700 text-white font-bold rounded-xl shadow-xs">Confirm Rezolvat &amp; Resetare Contor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREARE COMANDA DE LUCRU RAPIDA (KM/MTH-trigger: Schimb ulei motor etc.) */}
      {showComandaRapidaModal && (
        <div className="fixed inset-0 bg-sapphire-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-morning-200 p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="font-extrabold text-sapphire-900 text-base flex items-center space-x-2">
                <Wrench className="w-5 h-5 text-sapphire-500" />
                <span>Creare Comanda de Lucru: {showComandaRapidaModal.denumireOperatiune}</span>
              </h3>
              <button onClick={() => setShowComandaRapidaModal(null)} className="text-sage-400 hover:text-sapphire-900 font-bold">X</button>
            </div>
            <form onSubmit={handleCreazaComandaRapida} className="space-y-4 text-xs">
              <div className="p-3 bg-sapphire-50 border border-sapphire-200 rounded-xl space-y-1">
                <p className="font-extrabold text-sapphire-900">{showComandaRapidaModal.denumireOperatiune}</p>
                <p className="text-[11px] text-sage-700 font-medium">
                  Se va crea o Comanda de Lucru noua. Acolo veti putea adauga piesele si efectua schimbul complet.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-extrabold text-sapphire-900 block mb-1">Contor Curent la Executare: *</label>
                  <input
                    type="number"
                    required
                    value={cmdContor}
                    onChange={(e) => setCmdContor(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-mono font-bold text-sapphire-900"
                  />
                </div>
                <div>
                  <label className="font-extrabold text-sapphire-900 block mb-1">Mecanic Responsabil: *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Mec. Ion Popescu"
                    value={cmdMecanic}
                    onChange={(e) => setCmdMecanic(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                  />
                </div>
              </div>
              <div>
                <label className="font-extrabold text-sapphire-900 block mb-1">Observatii Initiale:</label>
                <input
                  type="text"
                  placeholder="ex: Schimb ulei motor + filtru la 150.000 KM"
                  value={cmdObs}
                  onChange={(e) => setCmdObs(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 font-bold text-sapphire-900"
                />
              </div>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium">
                Dupa creare veti fi redirectionat automat catre tab-ul "Comenzi de Lucru" pentru adaugarea pieselor si finalizarii!
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setShowComandaRapidaModal(null)} className="px-4 py-2 bg-morning-200 text-slate-700 font-bold rounded-xl">Renunta</button>
                <button type="submit" className="px-5 py-2 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold rounded-xl shadow-xs">Creeaza Comanda de Lucru</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIZUALIZARE FIȘĂ A4 (COMANDĂ DE LUCRU & DEVIZ) */}

      {showViewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900/90 text-slate-100 p-6 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl border border-slate-700">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center space-x-2 text-white font-bold">
                <FileText className="w-5 h-5 text-sapphire-400" />
                <span>Previzualizare Fișă A4 (Comandă {showViewModal.numarComanda})</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrintDocument}
                  className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md flex items-center space-x-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ Printează / Salvează PDF</span>
                </button>

                <button onClick={() => setShowViewModal(null)} className="text-slate-400 hover:text-white">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 📄 PRINTABLE A4 SHEET VIEW 📄 */}
            <div id="printable-a4-area" className="p-8 bg-white text-slate-800 rounded-xl space-y-6 font-sans">
              {/* Document Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                <div>
                  <h2 className="text-2xl font-extrabold tracking-wider text-slate-900 uppercase">FleetCMD CMMS Enterprise</h2>
                  <p className="text-xs font-semibold text-slate-600">Sistem de Gestiune Flotă, Mentenanță & Atelier Intern</p>
                  <p className="text-[11px] text-slate-500 mt-1">Departament Tehnic | Șantier Central</p>
                </div>

                <div className="text-right">
                  <div className="inline-block px-3 py-1 rounded bg-slate-100 border border-slate-300 text-slate-900 font-mono font-extrabold text-lg">
                    {showViewModal.numarComanda}
                  </div>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    Stare: <span className="uppercase">{showViewModal.stare}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Dată Emitere: {new Date(showViewModal.dataDeschidere).toLocaleDateString('ro-RO')}
                  </p>
                </div>
              </div>

              <div className="text-center my-2">
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-widest border-b border-slate-300 pb-1 inline-block">
                  FIȘĂ COMANDĂ DE LUCRU & DEVIZ SERVIZ
                </h3>
              </div>

              {/* Section I: Date Utilaj */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">I. Date Utilaj / Vehicul</p>
                  <p><strong>Număr Intern:</strong> {showViewModal.vehiculNumarIntern}</p>
                  <p><strong>Număr Înmatriculare:</strong> {showViewModal.vehiculInmatriculare}</p>
                  <p><strong>Marcă & Model:</strong> {showViewModal.vehiculMarca} {showViewModal.vehiculModel}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">Date Tehnice Execuție</p>
                  <p><strong>Serie Șasiu / VIN:</strong> {showViewModal.vehiculSerieSasiu}</p>
                  <p><strong>Contor la Execuție:</strong> {showViewModal.valoareContorLaExecutie} {showViewModal.vehiculTipMasurare}</p>
                  <p><strong>Dată Finalizare:</strong> {showViewModal.dataFinalizare ? new Date(showViewModal.dataFinalizare).toLocaleDateString('ro-RO') : 'În Desfășurare'}</p>
                </div>
              </div>

              {/* Section II: Echipa Atelier */}
              <div className="text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider mb-1">II. Informații Atelier & Mecanici Responsabili</p>
                <p><strong>Mecanic(i) Responsabil(i):</strong> {showViewModal.mecanicResponsabil || 'Atelier Intern'}</p>
                {showViewModal.observatii && <p className="mt-1"><strong>Observații / Motiv Intervenție:</strong> {showViewModal.observatii}</p>}
              </div>

              {/* Section III: Tabel Elemente & Piese Consumate */}
              <div className="space-y-2">
                <p className="font-bold text-slate-900 uppercase text-[10px] tracking-wider">III. Desfășurător Elemente, Piese Schimb & Manoperă</p>

                <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-300">
                  <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-r border-slate-300">#</th>
                      <th className="p-2 border-r border-slate-300">Pilon Cost / Proveniență</th>
                      <th className="p-2 border-r border-slate-300">Descriere Operațiune / Piesă</th>
                      <th className="p-2 border-r border-slate-300 text-center">Cant.</th>
                      <th className="p-2 border-r border-slate-300 text-right">Preț Unitar</th>
                      <th className="p-2 text-right">Total (RON)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(showViewModal.elementeComanda || []).map((el: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-200 font-mono text-center">{idx + 1}</td>
                        <td className="p-2 border-r border-slate-200 font-semibold">{el.pilonCost || 'PIESA_STOC'}</td>
                        <td className="p-2 border-r border-slate-200">{el.descriere}</td>
                        <td className="p-2 border-r border-slate-200 font-mono text-center">{el.cantitate}</td>
                        <td className="p-2 border-r border-slate-200 font-mono text-right">{el.pretUnitar} RON</td>
                        <td className="p-2 font-mono font-bold text-right">{el.costTotal} RON</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Section IV: Total Deviz */}
              <div className="flex justify-end pt-2">
                <div className="w-64 bg-slate-100 p-3 rounded-lg border border-slate-300 text-xs space-y-1 text-right">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-700">Subtotal Piese & Servicii:</span>
                    <span className="font-mono font-bold">
                      {showViewModal.elementeComanda?.reduce((sum: number, el: any) => sum + (el.costTotal || 0), 0) || 0} RON
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600 text-[11px]">
                    <span>TVA (0% scurtcircuit intern):</span>
                    <span>0 RON</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-400 pt-1 text-sm font-extrabold text-slate-900">
                    <span>TOTAL GENERAL DEVIZ:</span>
                    <span className="font-mono text-sapphire-900">
                      {(showViewModal.elementeComanda?.reduce((sum: number, el: any) => sum + (el.costTotal || 0), 0) || 0)
                        .toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} RON
                    </span>
                  </div>
                </div>
              </div>

              {/* Section V: Semnături */}
              <div className="grid grid-cols-2 gap-8 pt-8 border-t border-slate-300 text-xs text-center">
                <div className="space-y-8">
                  <p className="font-bold text-slate-800">Semnătură Executant / Mecanic Responsabil</p>
                  <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                  <p className="text-[10px] text-slate-500">Data: ____ / ____ / ________</p>
                </div>

                <div className="space-y-8">
                  <p className="font-bold text-slate-800">Semnătură Receptionat / Șef Flotă & Atelier</p>
                  <div className="border-b border-dashed border-slate-400 w-3/4 mx-auto"></div>
                  <p className="text-[10px] text-slate-500">Data: ____ / ____ / ________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

