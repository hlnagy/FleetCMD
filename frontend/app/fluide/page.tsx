"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import {
  Droplets, Plus, ShieldAlert, AlertTriangle, RefreshCw, ShoppingCart, Clock, Calendar,
  CheckCircle2, X, Filter, Sliders, ArrowUpRight, Search, Layers, Database, Truck, ChevronDown, ChevronUp, Check, Wrench, ShieldCheck, Activity, FileText,
  Edit3, Trash2, DollarSign, TrendingDown, Gauge
} from 'lucide-react';
import VehicleSelector from '@/components/VehicleSelector';
import { showConfirm } from '@/lib/swal';

export default function FluidePage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [activeTab, setActiveTab] = useState<'flota' | 'stocuri' | 'config' | 'anomalii'>('flota');
  const [stocUleiuri, setStocUleiuri] = useState<any[]>([]);
  const [flotaFluide, setFlotaFluide] = useState<any[]>([]);
  const [statusSchimburi, setStatusSchimburi] = useState<any[]>([]);
  const [alerte, setAlerte] = useState<any[]>([]);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);
  const [isAlerteCollapsed, setIsAlerteCollapsed] = useState<boolean>(false);

  // Categorii & Depozite Fluide
  const [categoriiFluide, setCategoriiFluide] = useState<any[]>([]);
  const [depoziteList, setDepoziteList] = useState<any[]>([]);

  // Filtre Tab Stocuri Fluide
  const [searchStoc, setSearchStoc] = useState('');
  const [selectedDepozitStoc, setSelectedDepozitStoc] = useState('');
  const [selectedCategorieStoc, setSelectedCategorieStoc] = useState('');
  const [selectedStatusStoc, setSelectedStatusStoc] = useState<'TOATE' | 'CRITIC' | 'OPTIM'>('TOATE');

  // Modal Ajustare Prag Alertă Stoc Minim per Articol
  const [editingAlertArticol, setEditingAlertArticol] = useState<any>(null);
  const [newPragAlert, setNewPragAlert] = useState<number>(0);
  const [isSavingAlert, setIsSavingAlert] = useState<boolean>(false);

  // Modal Gestiune Categorie Fluid (CRUD)
  const [showAddCatModal, setShowAddCatModal] = useState<boolean>(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [catNume, setCatNume] = useState<string>('');
  const [catDescriere, setCatDescriere] = useState<string>('');
  const [catStocMinim, setCatStocMinim] = useState<number>(20);

  // Modal Gestiune Subcategorie Fluid (CRUD)
  const [showAddSubcatModal, setShowAddSubcatModal] = useState<boolean>(false);
  const [editingSubcat, setEditingSubcat] = useState<any>(null);
  const [targetCatForSubcat, setTargetCatForSubcat] = useState<string>('');
  const [subcatNume, setSubcatNume] = useState<string>('');
  const [subcatDescriere, setSubcatDescriere] = useState<string>('');

  // Modal Trasabilitate Loturi FIFO
  const [viewingFifoArticol, setViewingFifoArticol] = useState<any>(null);
  const [fifoLoturiList, setFifoLoturiList] = useState<any[]>([]);
  const [loadingFifoLoturi, setLoadingFifoLoturi] = useState<boolean>(false);

  // Modal Înregistrare Completare Ulei (Top-up)
  const [showCompletareModal, setShowCompletareModal] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('fluide_alerte_collapsed');
      if (saved !== null) {
        setIsAlerteCollapsed(saved === 'true');
      }
    } catch (e) {}
  }, []);

  const toggleAlerteCollapse = () => {
    setIsAlerteCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('fluide_alerte_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Filtre Tab Flotă
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TOATE'); // TOATE, DEPASITE, AVERTIZARE, OK
  const [selectedTipLichidFilter, setSelectedTipLichidFilter] = useState('');

  // Stare Formular Ieșiri Ulei (Completare pe vehicul)
  const [iesireTipLichid, setIesireTipLichid] = useState('ULEI_MOTOR');
  const [iesireOperatiune, setIesireOperatiune] = useState('COMPLETARE_ULEI');
  const [selectedArticolStocId, setSelectedArticolStocId] = useState('');
  const [iesireMarca, setIesireMarca] = useState('Mobil1');
  const [iesireCantitate, setIesireCantitate] = useState(5);
  const [iesireContor, setIesireContor] = useState(0);
  const [iesireData, setIesireData] = useState(new Date().toISOString().split('T')[0]);
  const [iesireMecanic, setIesireMecanic] = useState('Brașoveanu Virgil (Șef Atelier)');
  const [iesireObservatii, setIesireObservatii] = useState('');

  // Stare Formular Configurare Intervale (Reguli mTH, KM, Luni)
  const [cfgTipLichid, setCfgTipLichid] = useState('ULEI_MOTOR');
  const [cfgIntervalMth, setCfgIntervalMth] = useState(250);
  const [cfgIntervalKm, setCfgIntervalKm] = useState(15000);
  const [cfgIntervalLuni, setCfgIntervalLuni] = useState(24);
  const [cfgPragMth, setCfgPragMth] = useState(50);
  const [cfgPragKm, setCfgPragKm] = useState(1000);
  const [cfgPragLuni, setCfgPragLuni] = useState(1);

  // Modal Rezolvare Alertă
  const [solvingAlerta, setSolvingAlerta] = useState<any>(null);
  const [solutieRezolvare, setSolutieRezolvare] = useState('Constatare și reparație scurgere în atelier');

  const fetchInitialData = async () => {
    try {
      const resFlota = await fetch(`${API_BASE_URL}/anomalii/flota-fluide`);
      if (resFlota.ok) setFlotaFluide(await resFlota.json());

      const resMec = await fetch(`${API_BASE_URL}/mentenanta/mecanici`);
      if (resMec.ok) {
        const dataMec = await resMec.json();
        setMecaniciList(dataMec);
        if (dataMec.length > 0) setIesireMecanic(dataMec[0].nume);
      }

      const resVeh = await fetch(`${API_BASE_URL}/vehicule`);
      if (resVeh.ok) {
        const dataVeh = await resVeh.json();
        setVehicule(dataVeh);
        if (dataVeh.length > 0 && !selectedVehiculId) {
          setSelectedVehiculId(dataVeh[0].id);
          setIesireContor(dataVeh[0].valoareContorCurent || 0);
        }
      }

      const resStoc = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri`);
      if (resStoc.ok) {
        const dataStoc = await resStoc.json();
        const lubeStoc = dataStoc.filter((s: any) => {
          const cat = (s.categorie || '').toLowerCase();
          const den = (s.denumire || '').toLowerCase();
          const sub = (s.subcategorie || '').toLowerCase();
          const isFilter = cat.includes('filtr') || den.includes('filtr') || cat === 'filtre';
          const isFluid =
            cat.includes('lubrifian') ||
            cat.includes('ulei') ||
            cat.includes('fluid') ||
            cat.includes('antigel') ||
            cat.includes('racire') ||
            cat.includes('adblue') ||
            sub.includes('antigel') ||
            sub.includes('g12') ||
            sub.includes('g11') ||
            sub.includes('adblue') ||
            s.unitateMasura === 'L' ||
            s.unitateMasura === 'Litri' ||
            den.includes('antigel') ||
            den.includes('adblue');
          return isFluid && !isFilter;
        });
        setStocUleiuri(lubeStoc);
        if (lubeStoc.length > 0 && !selectedArticolStocId) {
          setSelectedArticolStocId(lubeStoc[0].id);
          setIesireMarca(lubeStoc[0].marcaUlei || lubeStoc[0].denumire);
        }
      }

      const resAlert = await fetch(`${API_BASE_URL}/anomalii/alerte`);
      if (resAlert.ok) {
        const rawAlerts = await resAlert.json();
        const lubeAlerts = rawAlerts.filter((a: any) =>
          a.categorieAlert === 'SCURGERI_ULEI' ||
          a.titlu?.toLowerCase().includes('ulei') ||
          a.titlu?.toLowerCase().includes('fluid') ||
          a.titlu?.toLowerCase().includes('lichid') ||
          a.mesaj?.toLowerCase().includes('ulei')
        );
        setAlerte(lubeAlerts);
      }

      // Fetch Categorii Fluide
      const resCat = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`);
      if (resCat.ok) {
        const catData = await resCat.json();
        const allCats = [
          ...(Array.isArray(catData.categoriiImplicite) ? catData.categoriiImplicite : []),
          ...(Array.isArray(catData.categoriiCustom) ? catData.categoriiCustom : []),
        ];
        const fluidsOnly = allCats.filter((c: any) =>
          c.esteFluid === true ||
          /lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(c.nume || '')
        );
        setCategoriiFluide(fluidsOnly);
        if (fluidsOnly.length > 0) {
          setTargetCatForSubcat((prev) => prev || fluidsOnly[0].nume);
        }
      }

      // Fetch Depozite
      const resDep = await fetch(`${API_BASE_URL}/stocuri-garantii/depozite`);
      if (resDep.ok) {
        const depData = await resDep.json();
        setDepoziteList(Array.isArray(depData) ? depData : []);
      }
    } catch (e) {
      console.log('Error fetching initial data for fluids', e);
    }
  };

  // Ascultăm schimbarea tab-ului din URL (?tab=stocuri)
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const t = params.get('tab');
        if (t === 'stocuri' || t === 'flota' || t === 'config' || t === 'anomalii') {
          setActiveTab(t as any);
        }
      }
    } catch (e) {}
  }, []);

  // Handlers Modificare Prag Alertă per Articol
  const handleOpenEditAlert = (art: any) => {
    setEditingAlertArticol(art);
    setNewPragAlert(art.stocMinim || 0);
  };

  const handleSavePragAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlertArticol) return;
    setIsSavingAlert(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${editingAlertArticol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stocMinim: Number(newPragAlert) }),
      });
      if (res.ok) {
        alert(`Pragul minim de alertă pentru "${editingAlertArticol.denumire}" a fost setat la ${newPragAlert} ${editingAlertArticol.unitateMasura || 'L'}.`);
        setEditingAlertArticol(null);
        fetchInitialData();
      } else {
        alert('Eroare la actualizarea pragului de alertă.');
      }
    } catch (e) {
      alert('Eroare de rețea la actualizarea pragului.');
    } finally {
      setIsSavingAlert(false);
    }
  };

  // Handlers CRUD Categorii Fluide
  const openAddCat = () => {
    setEditingCat(null);
    setCatNume('');
    setCatDescriere('');
    setCatStocMinim(20);
    setShowAddCatModal(true);
  };

  const openEditCat = (c: any) => {
    setEditingCat(c);
    setCatNume(c.nume || '');
    setCatDescriere(c.descriere || '');
    setCatStocMinim(c.stocMinimImplicit || 20);
    setShowAddCatModal(true);
  };

  const handleSaveFluidCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNume.trim()) {
      alert('Vă rugăm introduceți denumirea categoriei de fluid!');
      return;
    }
    try {
      const url = editingCat
        ? `${API_BASE_URL}/stocuri-garantii/categorii/${editingCat.id}`
        : `${API_BASE_URL}/stocuri-garantii/categorii`;
      const method = editingCat ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: catNume.trim(),
          descriere: catDescriere.trim() || null,
          stocMinimImplicit: Number(catStocMinim),
          esteFluid: true,
        }),
      });

      if (res.ok) {
        alert(`Categoria de fluid "${catNume.trim()}" a fost ${editingCat ? 'actualizată' : 'creată'} cu succes!`);
        setShowAddCatModal(false);
        setEditingCat(null);
        setCatNume('');
        setCatDescriere('');
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea categoriei de fluid.');
    }
  };

  const handleDeleteFluidCategorie = async (id: string, nume: string) => {
    const confirmed = await showConfirm(
      'Ștergere Categorie Fluid',
      `Sigur doriți să ștergeți categoria de fluide "${nume}" și toate subtipurile acesteia?\n\nArticolele existente în stoc își vor păstra denumirile.`,
      'Da, șterge categoria',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`Categoria de fluid "${nume}" a fost ștearsă.`);
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge categoria'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea categoriei.');
    }
  };

  // Handlers CRUD Subcategorii Fluide
  const openAddSubcat = (catNumeParam?: string) => {
    setEditingSubcat(null);
    setTargetCatForSubcat(catNumeParam || (categoriiFluide[0]?.nume || ''));
    setSubcatNume('');
    setSubcatDescriere('');
    setShowAddSubcatModal(true);
  };

  const openEditSubcat = (sc: any, catNumeParam: string) => {
    setEditingSubcat(sc);
    setTargetCatForSubcat(catNumeParam);
    setSubcatNume(sc.nume || '');
    setSubcatDescriere(sc.descriere || '');
    setShowAddSubcatModal(true);
  };

  const handleSaveFluidSubcategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subcatNume.trim() || !targetCatForSubcat) {
      alert('Vă rugăm selectați Categoria de fluid și introduceți numele Subcategoriei!');
      return;
    }
    try {
      const url = editingSubcat
        ? `${API_BASE_URL}/stocuri-garantii/subcategorii/${editingSubcat.id}`
        : `${API_BASE_URL}/stocuri-garantii/subcategorii`;
      const method = editingSubcat ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorieNume: targetCatForSubcat,
          nume: subcatNume.trim(),
          descriere: subcatDescriere.trim() || null,
        }),
      });

      if (res.ok) {
        alert(`Subcategoria de fluid "${subcatNume.trim()}" a fost ${editingSubcat ? 'actualizată' : 'salvată'} cu succes!`);
        setShowAddSubcatModal(false);
        setEditingSubcat(null);
        setSubcatNume('');
        setSubcatDescriere('');
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea subcategoriei.');
    }
  };

  const handleDeleteFluidSubcategorie = async (id: string, nume: string) => {
    const confirmed = await showConfirm(
      'Ștergere Subcategorie Fluid',
      `Sigur doriți să ștergeți subcategoria de fluid "${nume}"?`,
      'Da, șterge',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/subcategorii/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`Subcategoria "${nume}" a fost ștearsă.`);
        fetchInitialData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge subcategoria'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea subcategoriei.');
    }
  };

  // Handler Deschidere Loturi FIFO
  const handleOpenFifoLoturi = async (articol: any) => {
    setViewingFifoArticol(articol);
    setLoadingFifoLoturi(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri/${articol.id}/loturi`);
      if (res.ok) {
        setFifoLoturiList(await res.json());
      } else {
        setFifoLoturiList([]);
      }
    } catch (e) {
      console.error('Eroare la încărcare loturi FIFO:', e);
      setFifoLoturiList([]);
    } finally {
      setLoadingFifoLoturi(false);
    }
  };

  const fetchStatusSchimburi = async (vId: string) => {
    if (!vId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/status-schimburi/${vId}`);
      if (res.ok) setStatusSchimburi(await res.json());
    } catch (e) {
      console.log('Error fetching vehicle oil status', e);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedVehiculId) {
      fetchStatusSchimburi(selectedVehiculId);
      const v = vehicule.find(item => item.id === selectedVehiculId);
      if (v) setIesireContor(v.valoareContorCurent || 0);
    }
  }, [selectedVehiculId]);

  const handleOpenCompletare = (vehiculId?: string, tipLichid?: string) => {
    if (vehiculId) setSelectedVehiculId(vehiculId);
    if (tipLichid) setIesireTipLichid(tipLichid);
    setIesireOperatiune('COMPLETARE_ULEI');
    setShowCompletareModal(true);
  };

  const handleIesireUlei = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/iesire-ulei`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedVehiculId,
          tipLichid: iesireTipLichid,
          tipOperatiune: iesireOperatiune,
          articolStocId: selectedArticolStocId || undefined,
          marcaUlei: iesireMarca,
          cantitateLitri: Number(iesireCantitate),
          valoareContor: Number(iesireContor),
          dataOperatiune: iesireData,
          mecanic: iesireMecanic,
          observatii: iesireObservatii,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Înregistrare completare salvată cu succes! Stocul de ulei a fost scăzut automat.');
        setShowCompletareModal(false);
        fetchInitialData();
        fetchStatusSchimburi(selectedVehiculId);
      } else {
        const err = await res.json();
        alert(`Eroare la salvare: ${err.message || 'Verificați datele introduse'}`);
      }
    } catch (e) {
      alert('Eroare la procesarea cererii de completare ulei.');
    }
  };

  const handleSalveazaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/configurare-ulei`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedVehiculId,
          tipLichid: cfgTipLichid,
          intervalMth: Number(cfgIntervalMth),
          intervalKm: Number(cfgIntervalKm),
          intervalLuni: Number(cfgIntervalLuni),
          pragAvertizareMth: Number(cfgPragMth),
          pragAvertizareKm: Number(cfgPragKm),
          pragAvertizareLuni: Number(cfgPragLuni),
        }),
      });

      if (res.ok) {
        alert('Normă de interval și prag salvate cu succes!');
        fetchStatusSchimburi(selectedVehiculId);
        fetchInitialData();
      }
    } catch (e) {
      alert('Eroare la salvarea normelor de interval.');
    }
  };

  const handleRezolvaAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!solvingAlerta) return;

    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/alerte/${solvingAlerta.id}/rezolva`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutie: solutieRezolvare }),
      });
      if (res.ok) {
        alert('Alertă marcată ca REZOLVATĂ!');
        setSolvingAlerta(null);
        fetchInitialData();
      }
    } catch (e) {
      alert('Eroare la rezolvarea alertei.');
    }
  };

  // Calcul Statistici Flotă Fluide
  const totalPuncte = flotaFluide.length;
  const numDepasite = flotaFluide.filter(f => f.esteDepasit).length;
  const numAvertizari = flotaFluide.filter(f => f.esteInPragAvertizare && !f.esteDepasit).length;

  const fluideFiltrate = flotaFluide.filter((f) => {
    const matchStatus = 
      selectedStatusFilter === 'TOATE' ? true :
      selectedStatusFilter === 'DEPASITE' ? f.esteDepasit :
      selectedStatusFilter === 'AVERTIZARE' ? f.esteInPragAvertizare && !f.esteDepasit :
      selectedStatusFilter === 'OK' ? !f.esteDepasit && !f.esteInPragAvertizare : true;

    const matchLichid = selectedTipLichidFilter ? f.tipLichid === selectedTipLichidFilter : true;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const mIntern = f.vehiculNumarIntern?.toLowerCase().includes(q);
      const mInmat = f.vehiculInmatriculare?.toLowerCase().includes(q);
      const mLichid = f.tipLichid?.toLowerCase().includes(q);
      const mMarca = f.vehiculMarca?.toLowerCase().includes(q);
      return matchStatus && matchLichid && (mIntern || mInmat || mLichid || mMarca);
    }
    return matchStatus && matchLichid;
  });

  // Calcule & Filtrare Stocuri Fluide
  const totalVolumFluide = stocUleiuri.reduce((acc, s) => acc + (Number(s.stocCurent) || 0), 0);
  const totalValoareFluide = stocUleiuri.reduce((acc, s) => acc + ((Number(s.stocCurent) || 0) * (Number(s.pretUnitar) || 0)), 0);
  const fluideCriticeCount = stocUleiuri.filter((s) => (Number(s.stocCurent) || 0) <= (Number(s.stocMinim) || 0)).length;
  const totalSubcategoriiFluide = categoriiFluide.reduce((acc, c) => acc + (c.subcategorii?.length || 0), 0);

  const stocUleiuriFiltrate = stocUleiuri.filter((s) => {
    // Filtru căutare text
    if (searchStoc.trim()) {
      const q = searchStoc.toLowerCase();
      const den = (s.denumire || '').toLowerCase();
      const cod = (s.codArticol || '').toLowerCase();
      const marca = (s.marcaUlei || '').toLowerCase();
      const sub = (s.subcategorie || '').toLowerCase();
      const cat = (s.categorie || '').toLowerCase();
      if (!den.includes(q) && !cod.includes(q) && !marca.includes(q) && !sub.includes(q) && !cat.includes(q)) {
        return false;
      }
    }
    // Filtru depozit
    if (selectedDepozitStoc && s.depozitId !== selectedDepozitStoc) {
      return false;
    }
    // Filtru categorie fluid
    if (selectedCategorieStoc && s.categorie !== selectedCategorieStoc) {
      return false;
    }
    // Filtru stare
    if (selectedStatusStoc === 'CRITIC') {
      if ((Number(s.stocCurent) || 0) > (Number(s.stocMinim) || 0)) return false;
    } else if (selectedStatusStoc === 'OPTIM') {
      if ((Number(s.stocCurent) || 0) <= (Number(s.stocMinim) || 0)) return false;
    }
    return true;
  });

  const currentVehicul = vehicule.find((v) => v.id === selectedVehiculId);

  return (
    <div className="space-y-6">
      {/* ANTET TITLU & ACȚIUNI PRINCIPALE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
              <Droplets className="w-6 h-6" />
            </div>
            <span>Gestiune Fluide & Lubrifianți Flotă</span>
          </h1>
          <p className="text-xs text-sage-600 font-medium mt-1">
            Monitorizare preventivă niveluri, intervale schimb, detecție automată scurgeri și scăderi din stoc
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <a
            href="/comenzi-lucru"
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold transition border border-morning-300"
          >
            <FileText className="w-4 h-4 text-sapphire-600" />
            <span>Comenzi de Lucru (Revizii)</span>
          </a>

          <button
            onClick={() => handleOpenCompletare()}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Înregistrează Completare Ulei</span>
          </button>
        </div>
      </div>

      {/* BANNER ALERTE ACTIVE SCHIMB ULEI & FLUIDE */}
      {alerte.length > 0 && (
        <div className="p-4 rounded-2xl bg-roseash-100 border-2 border-roseash-300 space-y-3 shadow-xs transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-terracotta-700 font-extrabold text-xs uppercase tracking-wider">
              <ShieldAlert className="w-5 h-5 text-terracotta-600 animate-bounce" />
              <span>Alerte Active Schimb Ulei & Fluide ({alerte.length} active):</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-[10px] bg-terracotta-600 text-white font-bold px-2.5 py-1 rounded-full uppercase">
                Acțiune Necesară
              </span>

              <button
                type="button"
                onClick={toggleAlerteCollapse}
                className="px-3 py-1 bg-white hover:bg-roseash-50 text-terracotta-700 border border-roseash-300 text-xs font-bold rounded-xl shadow-xs transition flex items-center space-x-1"
                title={isAlerteCollapsed ? 'Extinde Panou' : 'Restrânge Panou'}
              >
                <span>{isAlerteCollapsed ? 'Extinde Panou' : 'Restrânge Panou'}</span>
                {isAlerteCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!isAlerteCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {alerte.map((a: any) => (
                <div
                  key={a.id}
                  className="p-3.5 rounded-xl bg-white border border-roseash-300 flex flex-col justify-between text-xs shadow-2xs space-y-2 hover:border-roseash-400 transition"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <span className="px-2.5 py-0.5 rounded-lg bg-sapphire-100 border border-sapphire-200 text-sapphire-900 font-black text-[11px] font-mono shrink-0">
                           {a.vehiculNumar || 'Utilaj'}
                        </span>
                        <span className="font-extrabold text-slate-900 text-xs leading-snug break-words">
                          {a.titlu}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 whitespace-nowrap ${
                        a.urgenta === 'CRITIC' ? 'bg-roseash-200 text-terracotta-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a.urgenta || 'CRITIC'}
                      </span>
                    </div>

                    <p className="text-terracotta-700 font-bold text-[11px] leading-snug">{a.mesaj}</p>

                    <div className="flex items-center space-x-2 text-[10px] text-sage-600 font-mono pt-0.5">
                      <span>• {a.modCalcul || (a.dataReferinta ? `Data referință: ${new Date(a.dataReferinta).toLocaleDateString('ro-RO')}` : 'Dată nespecificată')}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1 border-t border-morning-100">
                    <button
                      type="button"
                      onClick={() => handleOpenCompletare(a.vehiculId, a.tipLichid)}
                      className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-[11px] font-bold transition flex items-center space-x-1"
                    >
                      <Droplets className="w-3 h-3 text-sapphire-600" />
                      <span>Completare Nivel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSolvingAlerta(a)}
                      className="px-3 py-1 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold shadow-xs transition"
                    >
                      Rezolvă Alertă
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MENIU TABS PROFESIONAL (FĂRĂ NUMERE) */}
      <div className="flex space-x-2 border-b border-morning-300 pb-1">
        <button
          onClick={() => setActiveTab('flota')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'flota'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Monitorizare Flotă & Nivel Uleiuri</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'flota' ? 'bg-white/20 text-white' : 'bg-morning-200 text-slate-700'
          }`}>
            {flotaFluide.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stocuri')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'stocuri'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Stocuri & Categorii Fluide</span>
          {fluideCriticeCount > 0 ? (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'stocuri' ? 'bg-roseash-200 text-terracotta-800' : 'bg-roseash-100 text-terracotta-700 border border-roseash-300'
            }`}>
              {fluideCriticeCount} alertă
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'stocuri' ? 'bg-white/20 text-white' : 'bg-morning-200 text-slate-700'
            }`}>
              {stocUleiuri.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('config')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'config'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Norme & Configurare Intervale</span>
        </button>

        <button
          onClick={() => setActiveTab('anomalii')}
          className={`flex items-center space-x-2 px-5 py-3 text-xs font-extrabold rounded-xl transition ${
            activeTab === 'anomalii'
              ? 'bg-sapphire-500 text-white shadow-md shadow-sapphire-500/20'
              : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span>Detecție Anomalii & Scurgeri</span>
          {alerte.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-terracotta-500 text-white">
              {alerte.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: MONITORIZARE FLOTĂ & NIVEL ULEIURI */}
      {activeTab === 'flota' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm">
          {/* BARA DE FILTRARE & CĂUTARE */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-morning-100 rounded-2xl border border-morning-200">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Căutare utilaj, număr intern, înmatriculare, tip ulei..."
                className="w-full bg-white border border-morning-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-sapphire-900 font-bold focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs flex-wrap">
              <select
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
                className="bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="TOATE">Toate Stările</option>
                <option value="DEPASITE">Doar Schimburi Depășite</option>
                <option value="AVERTIZARE"> Doar În Prag Avertizare</option>
                <option value="OK">Doar În Grafic (OK)</option>
              </select>

              <select
                value={selectedTipLichidFilter}
                onChange={(e) => setSelectedTipLichidFilter(e.target.value)}
                className="bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
              >
                <option value="">Toate Tipurile de Fluide & Lubrifianți</option>
                <option value="ULEI_MOTOR">Ulei Motor</option>
                <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                <option value="ULEI_TRANSMISIE">Ulei Transmisie & Diferențial</option>
                <option value="ANTIGEL_G12">Antigel G12+ (Lichid Răcire Roz)</option>
                <option value="ANTIGEL_G11">Antigel G11 (Lichid Răcire Albastru)</option>
                <option value="ADBLUE">AdBlue (Uree 32.5%)</option>
                <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
              </select>
            </div>
          </div>

          {/* TABEL CENTRALIZATOR STARE ULEIURI */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Utilaj / Vehicul</th>
                  <th className="p-3">Tip Lubrifiant</th>
                  <th className="p-3 font-mono">Ultimul Schimb</th>
                  <th className="p-3 font-mono">Rulaj Curent / Limită</th>
                  <th className="p-3">Consum Interval</th>
                  <th className="p-3">Stare Schimb</th>
                  <th className="p-3 text-right">Acțiuni Operative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {fluideFiltrate.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-sage-500 font-medium">
                      Nu s-au găsit înregistrări conform filtrelor aplicate.
                    </td>
                  </tr>
                ) : (
                  fluideFiltrate.map((f: any, idx: number) => {
                    const limit = f.limitInterval || (f.tipMasurare === 'MTH' ? 250 : 15000);
                    const pct = Math.min(100, Math.round((f.rulajDeLaUltimulSchimb / limit) * 100));

                    return (
                      <tr key={idx} className={`hover:bg-morning-50 transition ${f.esteDepasit ? 'bg-roseash-50/60' : ''}`}>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className="p-1.5 rounded-lg bg-morning-200 text-sapphire-800">
                              <Truck className="w-4 h-4" />
                            </span>
                            <div>
                              <span className="font-black text-sapphire-900 block text-xs">{f.vehiculNumarIntern}</span>
                              <span className="text-[10px] text-sage-600 block font-medium">
                                {f.vehiculMarca} {f.vehiculModel} ({f.vehiculInmatriculare})
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-lg bg-sapphire-50 border border-sapphire-200 text-sapphire-900 font-bold text-[11px]">
                            {f.tipLichid?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-sage-700 font-semibold">
                          {f.ultimulSchimbContor} {f.tipMasurare}
                          {f.ultimulSchimbData && (
                            <span className="text-[10px] text-sage-500 block">
                              {new Date(f.ultimulSchimbData).toLocaleDateString('ro-RO')}
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-mono">
                          <span className={`font-bold ${f.esteDepasit ? 'text-terracotta-600' : 'text-slate-800'}`}>
                            {f.rulajDeLaUltimulSchimb} {f.tipMasurare}
                          </span>
                          <span className="text-sage-500 text-[10px] block">/ {limit} {f.tipMasurare}</span>
                        </td>
                        <td className="p-3">
                          <div className="w-28 bg-morning-200 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                f.esteDepasit ? 'bg-terracotta-500' : f.esteInPragAvertizare ? 'bg-amber-500' : 'bg-sage-500'
                              }`}
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                          <span className="text-[10px] font-mono text-sage-600 font-bold mt-0.5 block">{pct}% consumat</span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1 w-fit ${
                            f.esteDepasit ? 'bg-roseash-200 text-terracotta-700' :
                            f.esteInPragAvertizare ? 'bg-amber-100 text-amber-800' :
                            'bg-sage-100 text-sage-700'
                          }`}>
                            {f.esteDepasit ? (
                              <>
                                <AlertTriangle className="w-3 h-3 text-terracotta-600" />
                                <span>DEPĂȘIT</span>
                              </>
                            ) : f.esteInPragAvertizare ? (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" />
                                <span>ÎN PRAG</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-sage-600" />
                                <span>ÎN GRAFIC</span>
                              </>
                            )}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => handleOpenCompletare(f.vehiculId, f.tipLichid)}
                              className="px-3 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1"
                              title="Înregistrează completare rapidă de ulei"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Completare</span>
                            </button>

                            <a
                              href={`/comenzi-lucru?vehiculId=${f.vehiculId}`}
                              className="px-2.5 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 font-bold text-xs transition border border-morning-300"
                              title="Deschide comandă de lucru pentru revizie completă"
                            >
                              Revizie
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STOCURI & CATEGORII FLUIDE */}
      {/* ========================================================================= */}
      {activeTab === 'stocuri' && (
        <div className="space-y-6">
          {/* 1. STATISTICI RAPIDE KPI STOC FLUIDE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Total Volum */}
            <div className="pleasant-card p-5 rounded-2xl border border-morning-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sage-600 uppercase tracking-wider">Total Volum Fluide</span>
                <div className="p-2.5 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <Droplets className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-sapphire-900 font-mono">
                  {totalVolumFluide.toLocaleString('ro-RO', { maximumFractionDigits: 1 })}
                </span>
                <span className="text-xs font-bold text-sage-600 uppercase">Litri / Unități</span>
              </div>
              <p className="text-[11px] text-sage-500 font-medium">Stoc fizic cumulat în toate depozitele flotei</p>
            </div>

            {/* Card 2: Valoare Totală Inventar */}
            <div className="pleasant-card p-5 rounded-2xl border border-morning-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sage-600 uppercase tracking-wider">Valoare Inventar Fluide</span>
                <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                  <Database className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-emerald-800 font-mono">
                  {totalValoareFluide.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-bold text-emerald-700 uppercase font-mono">RON</span>
              </div>
              <p className="text-[11px] text-sage-500 font-medium">Valoare de achiziție calculată FIFO</p>
            </div>

            {/* Card 3: Alerte Sub Stoc Minim */}
            <div className={`pleasant-card p-5 rounded-2xl border shadow-2xs space-y-2 ${
              fluideCriticeCount > 0 ? 'bg-roseash-50/70 border-roseash-300 ring-1 ring-terracotta-300' : 'border-morning-200'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  fluideCriticeCount > 0 ? 'text-terracotta-700 font-extrabold' : 'text-sage-600'
                }`}>
                  Alerte Sub Limita Minimă
                </span>
                <div className={`p-2.5 rounded-xl ${
                  fluideCriticeCount > 0 ? 'bg-roseash-200 text-terracotta-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {fluideCriticeCount > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className={`text-2xl font-black font-mono ${
                  fluideCriticeCount > 0 ? 'text-terracotta-700' : 'text-emerald-700'
                }`}>
                  {fluideCriticeCount}
                </span>
                <span className="text-xs font-bold uppercase text-sage-600">Articole sub prag</span>
              </div>
              <p className={`text-[11px] font-medium ${
                fluideCriticeCount > 0 ? 'text-terracotta-700 font-bold' : 'text-sage-500'
              }`}>
                {fluideCriticeCount > 0 ? 'Aprovizionare urgentă recomandată!' : 'Toate stocurile de fluide sunt optime'}
              </p>
            </div>

            {/* Card 4: Categorii & Subtipuri Active */}
            <div className="pleasant-card p-5 rounded-2xl border border-morning-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-sage-600 uppercase tracking-wider">Categorii & Subtipuri</span>
                <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-black text-purple-900 font-mono">
                  {categoriiFluide.length}
                </span>
                <span className="text-xs font-bold text-sage-600 uppercase">
                  categorii / {totalSubcategoriiFluide} subtipuri
                </span>
              </div>
              <p className="text-[11px] text-sage-500 font-medium">Clasificare tehnică dedicată doar fluidelor</p>
            </div>
          </div>

          {/* 2. TABEL CENTRALIZAT STOCURI FLUIDE & NOTIFICARE STOC MINIM */}
          <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm border border-morning-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-morning-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                  <Droplets className="w-5 h-5 text-sapphire-600" />
                  <span>Stocuri Curente de Fluide & Praguri Minime de Notificare</span>
                </h3>
                <p className="text-xs text-sage-600 font-medium mt-0.5">
                  Evidență clară a cantităților din depozit și ajustarea valorii minime sub care sistemul emite alertă
                </p>
              </div>

              <button
                onClick={() => handleOpenCompletare()}
                className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1.5 shrink-0 self-start md:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Înregistrează Ieșire / Completare</span>
              </button>
            </div>

            {/* BARA DE FILTRARE & CĂUTARE */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-morning-100 rounded-2xl border border-morning-200">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  placeholder="Caută fluid după denumire, marcă (Mobil, Castrol), cod articol, subcategorie..."
                  value={searchStoc}
                  onChange={(e) => setSearchStoc(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-medium text-sapphire-900 focus:outline-none focus:border-sapphire-500 shadow-2xs"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filtru Depozit */}
                <select
                  value={selectedDepozitStoc}
                  onChange={(e) => setSelectedDepozitStoc(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="">Toate Depozitele</option>
                  {depoziteList.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </select>

                {/* Filtru Categorie Fluid */}
                <select
                  value={selectedCategorieStoc}
                  onChange={(e) => setSelectedCategorieStoc(e.target.value)}
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="">Toate Categoriile de Fluide</option>
                  {categoriiFluide.map((c: any) => (
                    <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                  ))}
                </select>

                {/* Filtru Stare Alertă */}
                <select
                  value={selectedStatusStoc}
                  onChange={(e) => setSelectedStatusStoc(e.target.value as any)}
                  className="px-3 py-2 bg-white rounded-xl border border-morning-300 text-xs font-bold text-sapphire-900 shadow-2xs"
                >
                  <option value="TOATE">Toate Stările</option>
                  <option value="CRITIC">Doar Alerte (Sub Stoc Minim)</option>
                  <option value="OPTIM">Doar Stoc Optim</option>
                </select>
              </div>
            </div>

            {/* TABEL STOCURI FLUIDE */}
            <div className="overflow-x-auto rounded-2xl border border-morning-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider">
                    <th className="p-3">Articol Fluid & Marcă</th>
                    <th className="p-3">Categorie & Subtip</th>
                    <th className="p-3">Depozit Gestiune</th>
                    <th className="p-3 text-right">Stoc Curent</th>
                    <th className="p-3 text-right">Prag Alertă (Minim)</th>
                    <th className="p-3 text-center">Stare Stoc</th>
                    <th className="p-3 text-right">Acțiuni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                  {stocUleiuriFiltrate.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-xs text-sage-500 italic">
                        Niciun articol de fluid sau lubrifiant găsit conform filtrelor aplicate.
                      </td>
                    </tr>
                  ) : (
                    stocUleiuriFiltrate.map((s: any) => {
                      const stocNum = Number(s.stocCurent) || 0;
                      const minimNum = Number(s.stocMinim) || 0;
                      const esteCritic = stocNum <= minimNum;
                      const esteEpuizat = stocNum <= 0;
                      const lipsa = Math.max(0, minimNum - stocNum);
                      const unitate = s.unitateMasura || 'L';

                      return (
                        <tr
                          key={s.id}
                          className={`transition ${
                            esteCritic
                              ? 'bg-roseash-50/50 hover:bg-roseash-50 dark:!bg-rose-950/20'
                              : 'hover:bg-morning-50'
                          }`}
                        >
                          {/* 1. Articol & Cod */}
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="font-extrabold text-sapphire-900 text-xs">{s.denumire}</span>
                                {s.marcaUlei && (
                                  <span className="px-2 py-0.2 rounded-md bg-morning-200 text-sapphire-800 text-[10px] font-bold">
                                    {s.marcaUlei}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-sage-500 font-mono">Cod: {s.codArticol}</p>
                            </div>
                          </td>

                          {/* 2. Categorie & Subcategorie */}
                          <td className="p-3">
                            <div className="space-y-0.5">
                              <span className="px-2 py-0.5 rounded-lg bg-sapphire-100 text-sapphire-900 font-bold text-[10px]">
                                {s.categorie}
                              </span>
                              {s.subcategorie && (
                                <p className="text-[11px] text-sage-600 font-medium">
                                  ▸ {s.subcategorie}
                                </p>
                              )}
                            </div>
                          </td>

                          {/* 3. Depozit */}
                          <td className="p-3 font-semibold text-slate-800">
                            {s.depozit?.nume || 'Depozit Central'}
                          </td>

                          {/* 4. Stoc Curent */}
                          <td className="p-3 text-right">
                            <div className="space-y-1 inline-block text-right">
                              <span
                                className={`font-mono font-black text-sm ${
                                  esteEpuizat
                                    ? 'text-terracotta-700'
                                    : esteCritic
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                {stocNum.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} {unitate}
                              </span>
                              <div className="w-24 h-1.5 bg-morning-200 rounded-full overflow-hidden ml-auto">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    esteEpuizat ? 'bg-terracotta-600' : esteCritic ? 'bg-amber-500' : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Math.max(10, (stocNum / Math.max(1, minimNum * 2)) * 100))}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* 5. Prag Alertă Stoc Minim */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <span className="font-mono font-bold text-sapphire-900 text-xs">
                                {minimNum.toLocaleString('ro-RO', { maximumFractionDigits: 1 })} {unitate}
                              </span>
                              <button
                                onClick={() => handleOpenEditAlert(s)}
                                title="Modifică valoarea minimă de alertă"
                                className="p-1 text-sage-500 hover:text-sapphire-600 hover:bg-sapphire-50 rounded-lg transition"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>

                          {/* 6. Stare Alertă */}
                          <td className="p-3 text-center">
                            {esteEpuizat ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-terracotta-600 text-white">
                                <AlertTriangle className="w-3 h-3 mr-0.5" />
                                <span>EPUIZAT (0 {unitate})</span>
                              </span>
                            ) : esteCritic ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-roseash-200 text-terracotta-800 border border-roseash-300">
                                <AlertTriangle className="w-3 h-3 mr-0.5 text-terracotta-600" />
                                <span>SUB MINIM (+{lipsa} {unitate})</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-0.5 text-emerald-600" />
                                <span>OPTIM</span>
                              </span>
                            )}
                          </td>

                          {/* 7. Acțiuni */}
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              <button
                                onClick={() => handleOpenEditAlert(s)}
                                className="px-2.5 py-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 text-sapphire-900 font-bold text-[11px] transition flex items-center space-x-1 border border-morning-300"
                                title="Setează pragul minim de alertă"
                              >
                                <Sliders className="w-3 h-3 text-sapphire-600" />
                                <span>Prag Alertă</span>
                              </button>

                              <button
                                onClick={() => handleOpenFifoLoturi(s)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] transition flex items-center space-x-1 border border-emerald-200"
                                title="Vizualizează loturile FIFO de achiziție"
                              >
                                <Layers className="w-3 h-3 text-emerald-600" />
                                <span>Loturi FIFO</span>
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedArticolStocId(s.id);
                                  setIesireMarca(s.marcaUlei || s.denumire);
                                  handleOpenCompletare();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-[11px] shadow-xs transition flex items-center space-x-1"
                                title="Înregistrează completare ulei pe utilaj"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Ieșire</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. GESTIUNE CATEGORII PRINCIPALE & SUBTIPURI SPECIFICE DE FLUIDE */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-morning-200 shadow-xs">
              <div>
                <h3 className="font-extrabold text-sapphire-900 text-base flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-periwinkle-700" />
                  <span>Categorii Principale & Subtipuri Specifice de Fluide</span>
                </h3>
                <p className="text-xs text-sage-600 font-medium mt-0.5">
                  Definiți categoriile și subtipurile dedicate gestiunii lubrifianților, uleiurilor și fluidelor tehnice
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={openAddCat}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Categorie Fluid Nouă</span>
                </button>

                <button
                  onClick={() => openAddSubcat()}
                  className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-morning-200 hover:bg-morning-300 text-sapphire-900 text-xs font-bold shadow-xs transition"
                >
                  <Layers className="w-4 h-4 text-periwinkle-700" />
                  <span>+ Subtip / Subcategorie</span>
                </button>
              </div>
            </div>

            {/* GRID CARDURI CATEGORII FLUIDE (STILUL EXACT DIN SCREENSHOT-UL UTILIZATORULUI) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoriiFluide.map((c: any) => (
                <div
                  key={c.id || c.nume}
                  className="pleasant-card p-5 rounded-2xl border border-morning-200 space-y-3 shadow-2xs hover:shadow-xs transition bg-white"
                >
                  <div className="flex items-center justify-between border-b border-morning-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-sapphire-50 text-sapphire-700 rounded-lg">
                        <Layers className="w-5 h-5 text-periwinkle-700" />
                      </div>
                      <h4 className="font-extrabold text-sapphire-900 text-base">{c.nume}</h4>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => openEditCat(c)}
                        title="Editare Categorie Fluid"
                        className="p-1.5 text-sage-600 hover:text-sapphire-600 hover:bg-sapphire-50 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteFluidCategorie(c.id, c.nume)}
                        title="Ștergere Categorie Fluid"
                        className="p-1.5 text-terracotta-600 hover:text-terracotta-700 hover:bg-roseash-100 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-sage-700">{c.descriere || 'Fără descriere adițională.'}</p>

                  <div className="pt-2 border-t border-morning-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-extrabold text-sage-700 uppercase tracking-wider">
                        SUBCATEGORII INCLUSE ({c.subcategorii?.length || 0}):
                      </p>
                      <button
                        onClick={() => openAddSubcat(c.nume)}
                        className="text-[11px] font-extrabold text-sapphire-600 hover:text-sapphire-800 hover:bg-sapphire-50 px-2.5 py-1 rounded-lg border border-sapphire-200 transition flex items-center space-x-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Adaugă Subcategorie</span>
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {c.subcategorii && c.subcategorii.length > 0 ? (
                        c.subcategorii.map((sc: any) => (
                          <div
                            key={sc.id || sc.nume}
                            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-morning-100 border border-morning-200 text-[11px] font-bold text-sapphire-900 shadow-2xs group hover:border-sapphire-300 transition"
                            title={sc.descriere || sc.nume}
                          >
                            <span>{sc.nume}</span>
                            <button
                              onClick={() => openEditSubcat(sc, c.nume)}
                              title="Editare Subcategorie"
                              className="p-0.5 text-sage-400 hover:text-sapphire-600 hover:bg-white rounded transition"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteFluidSubcategorie(sc.id, sc.nume)}
                              title="Ștergere Subcategorie"
                              className="p-0.5 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 rounded transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-sage-500 italic">Niciun subtip definit</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: NORME & CONFIGURARE INTERVALE */}
      {activeTab === 'config' && (
        <div className="space-y-4">
          {/* SELECTOR UTILAJ INTEGRAT */}
          <VehicleSelector
            selectedId={selectedVehiculId}
            onSelect={(v) => setSelectedVehiculId(v.id)}
            vehicule={vehicule}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 pleasant-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-morning-200 pb-2">
                <h2 className="text-base font-bold text-sapphire-900">Configurare Normă Nouă</h2>
                <p className="text-xs text-sage-600 font-medium">Setare intervale recomandate de producător</p>
              </div>

              <form onSubmit={handleSalveazaConfig} className="space-y-3 text-xs">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Utilaj Selectat:</label>
                  <input
                    type="text"
                    disabled
                    value={currentVehicul ? `${currentVehicul.numarIntern} (${currentVehicul.numarInmatriculare})` : 'Alege utilajul de sus'}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Lubrifiant / Fluid:</label>
                  <select
                    value={cfgTipLichid}
                    onChange={(e) => setCfgTipLichid(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="ULEI_MOTOR">Ulei Motor</option>
                    <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                    <option value="ULEI_TRANSMISIE">Ulei Transmisie & Diferențial</option>
                    <option value="ANTIGEL_G12">Antigel G12+ (Lichid Răcire Roz)</option>
                    <option value="ANTIGEL_G11">Antigel G11 (Lichid Răcire Albastru)</option>
                    <option value="ADBLUE">AdBlue (Uree 32.5%)</option>
                    <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                    <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                    <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                    <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
                  </select>
                </div>

                <div className="p-3.5 bg-morning-100 rounded-xl border border-morning-200 space-y-2">
                  <p className="font-bold text-sapphire-900 text-xs">1. Limite Schimb Standard:</p>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Interval mTH (Ore):</label>
                    <input
                      type="number"
                      value={cfgIntervalMth}
                      onChange={(e) => setCfgIntervalMth(Number(e.target.value))}
                      className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Interval KM:</label>
                    <input
                      type="number"
                      value={cfgIntervalKm}
                      onChange={(e) => setCfgIntervalKm(Number(e.target.value))}
                      className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Interval Luni (Timp):</label>
                    <input
                      type="number"
                      value={cfgIntervalLuni}
                      onChange={(e) => setCfgIntervalLuni(Number(e.target.value))}
                      className="w-full bg-white border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-roseash-50 rounded-xl border border-roseash-200 space-y-2">
                  <p className="font-bold text-terracotta-700 text-xs">2. Marjă Avertizare Înainte:</p>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Avertizare mTH Înainte:</label>
                    <input
                      type="number"
                      value={cfgPragMth}
                      onChange={(e) => setCfgPragMth(Number(e.target.value))}
                      className="w-full bg-white border border-roseash-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Avertizare KM Înainte:</label>
                    <input
                      type="number"
                      value={cfgPragKm}
                      onChange={(e) => setCfgPragKm(Number(e.target.value))}
                      className="w-full bg-white border border-roseash-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-medium">Avertizare Luni Înainte:</label>
                    <input
                      type="number"
                      value={cfgPragLuni}
                      onChange={(e) => setCfgPragLuni(Number(e.target.value))}
                      className="w-full bg-white border border-roseash-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20 transition"
                >
                  Salvează Regulă Interval
                </button>
              </form>
            </div>

            <div className="md:col-span-2 pleasant-card rounded-2xl p-6 space-y-4">
              <div className="border-b border-morning-200 pb-2">
                <h2 className="text-base font-bold text-sapphire-900">
                  Norme Active pe Utilajul {currentVehicul?.numarIntern || ''} ({statusSchimburi.length})
                </h2>
                <p className="text-xs text-sage-600 font-medium">Situația consumului curent raportat la limitele setate</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
                  <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                    <tr>
                      <th className="p-3">Tip Lubrifiant</th>
                      <th className="p-3 font-mono">Interval Normat</th>
                      <th className="p-3 font-mono">Rulaj Curent</th>
                      <th className="p-3 font-mono">Prag Avertizare</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200">
                    {statusSchimburi.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-sage-500">
                          Nu există norme configurate manual pentru acest utilaj. Se aplică intervalele implicite de 250 mTH / 15.000 KM.
                        </td>
                      </tr>
                    ) : (
                      statusSchimburi.map((cfg: any, idx: number) => (
                        <tr key={idx} className="hover:bg-morning-50">
                          <td className="p-3 font-bold text-sapphire-900">{cfg.tipLichid?.replace(/_/g, ' ')}</td>
                          <td className="p-3 font-mono text-slate-800 font-semibold">
                            {cfg.intervalMth ? `${cfg.intervalMth} mTH` : `${cfg.intervalKm} KM`}
                          </td>
                          <td className="p-3 font-mono font-bold text-sapphire-700">
                            {cfg.rulajCurent} {cfg.tipMasurare}
                          </td>
                          <td className="p-3 font-mono text-sage-700">
                            {cfg.pragAvertizareMth ? `${cfg.pragAvertizareMth} mTH` : `${cfg.pragAvertizareKm} KM`}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              cfg.esteDepasit ? 'bg-roseash-200 text-terracotta-700' :
                              cfg.esteInPragAvertizare ? 'bg-amber-100 text-amber-800' :
                              'bg-sapphire-50 text-sapphire-700'
                            }`}>
                              {cfg.esteDepasit ? 'DEPAȘIT' : cfg.esteInPragAvertizare ? 'AVERTIZARE' : 'OK'}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DETECȚIE ANOMALII & SCURGERI */}
      {activeTab === 'anomalii' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-morning-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-terracotta-500" />
                <span>Centralizator Alerte Mentenanță & Scurgeri Ulei</span>
              </h2>
              <p className="text-xs text-sage-600 font-medium">
                Algoritmul monitorizează depășirile de intervale și completările anormale de ulei pe termen scurt
              </p>
            </div>
          </div>

          {alerte.length === 0 ? (
            <div className="p-8 text-center bg-morning-100 rounded-2xl space-y-2">
              <ShieldCheck className="w-10 h-10 text-sapphire-500 mx-auto" />
              <h3 className="font-extrabold text-sapphire-900 text-sm">Nu există alerte active în flotă!</h3>
              <p className="text-xs text-sage-600">Toate intervalele și completările de ulei se încadrează în limitele normale admise.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerte.map((a: any) => (
                <div key={a.id} className="p-4 rounded-2xl bg-white border-2 border-roseash-300 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-terracotta-500 text-white font-extrabold text-[10px] uppercase">
                        {a.categorieText || ' Alertă Activă'}
                      </span>
                      <span className="font-extrabold text-sapphire-900 text-sm"> {a.vehiculNumar || 'Utilaj'}</span>
                      <span className="text-xs text-slate-700 font-bold">• {a.titlu}</span>
                    </div>
                    <p className="text-xs text-terracotta-700 font-bold">{a.mesaj}</p>
                    <p className="text-[11px] text-sage-600 font-mono">
                      {a.modCalcul || (a.dataReferinta ? `Data referință: ${new Date(a.dataReferinta).toLocaleDateString('ro-RO')}` : '')}
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleOpenCompletare(a.vehiculId, a.tipLichid)}
                      className="px-3 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold transition flex items-center space-x-1"
                    >
                      <Droplets className="w-3.5 h-3.5 text-sapphire-600" />
                      <span>Completare Nivel</span>
                    </button>

                    <button
                      onClick={() => setSolvingAlerta(a)}
                      className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 whitespace-nowrap"
                    >
                      Rezolvă Alertă
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL RAPID: ÎNREGISTRARE COMPLETĂRI ULEI (TOP-UP) */}
      {showCompletareModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-xl space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <Droplets className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">Înregistrare Completare Ulei (Top-up)</h3>
                  <p className="text-[11px] text-sage-600 font-medium">Scădere automată din stocul de lubrifianți</p>
                </div>
              </div>
              <button
                onClick={() => setShowCompletareModal(false)}
                className="text-sage-500 hover:text-sapphire-900 p-1 rounded-lg hover:bg-morning-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* AVERTIZARE PENTRU REVIZIE COMPLETĂ */}
            <div className="p-3 bg-sapphire-50 border border-sapphire-200 rounded-xl flex items-center justify-between gap-3 text-xs">
              <span className="text-slate-600 font-medium">
                Schimbați și filtrele (revizie completă)?
              </span>
              <a
                href={`/comenzi-lucru?vehiculId=${selectedVehiculId}`}
                className="px-3 py-1 bg-sapphire-500 text-white rounded-lg font-bold text-[11px] hover:bg-sapphire-600 whitespace-nowrap"
              >
                Deschide Comandă de Lucru →
              </a>
            </div>

            <form onSubmit={handleIesireUlei} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Utilaj Destinație:</label>
                  <select
                    value={selectedVehiculId}
                    onChange={(e) => setSelectedVehiculId(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {vehicule.map((v) => (
                      <option key={v.id} value={v.id}>
                         {v.numarIntern} ({v.numarInmatriculare}) - {v.marca}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Operațiune:</label>
                  <select
                    value={iesireOperatiune}
                    onChange={(e) => setIesireOperatiune(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="COMPLETARE_ULEI">Completare Nivel (Top-up)</option>
                    <option value="SCHIMB_ULEI">Schimb Complet (Înlocuire & Resetare Contor)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Fluid / Lubrifiant:</label>
                  <select
                    value={iesireTipLichid}
                    onChange={(e) => setIesireTipLichid(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="ULEI_MOTOR">Ulei Motor</option>
                    <option value="ULEI_HIDRAULIC">Ulei Hidraulic</option>
                    <option value="ULEI_TRANSMISIE">Ulei Transmisie & Diferențial</option>
                    <option value="ANTIGEL_G12">Antigel G12+ (Lichid Răcire Roz)</option>
                    <option value="ANTIGEL_G11">Antigel G11 (Lichid Răcire Albastru)</option>
                    <option value="ADBLUE">AdBlue (Uree 32.5%)</option>
                    <option value="ULEI_LIEBHERR_PUNTE">Ulei Punte Liebherr</option>
                    <option value="ULEI_LIEBHERR_CUTIE">Ulei Cutie Liebherr</option>
                    <option value="ULEI_CUTIE_MANUALA">Ulei Cutie Manuală</option>
                    <option value="ULEI_CUTIE_AUTOMATA">Ulei Cutie Automată</option>
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Articol Fluid / Ulei din Stoc:</label>
                  <select
                    value={selectedArticolStocId}
                    onChange={(e) => {
                      setSelectedArticolStocId(e.target.value);
                      const item = stocUleiuri.find((s: any) => s.id === e.target.value);
                      if (item) setIesireMarca(item.marcaUlei || item.denumire);
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  >
                    {stocUleiuri.length === 0 ? (
                      <option value="">Fără fluide în stoc (Se introduce manual)</option>
                    ) : (
                      stocUleiuri.map((s: any) => (
                        <option key={s.id} value={s.id}>
                           {s.denumire} {s.subcategorie ? `(${s.subcategorie})` : ''} • Stoc: {s.stocCurent} {s.unitateMasura || 'L'} • {s.pretUnitar} RON/L
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="md:col-span-2 p-2.5 bg-sapphire-50 border border-sapphire-200 rounded-xl text-[11px] text-sapphire-900 flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-sapphire-600 shrink-0" />
                  <span>
                    <b>Consum Automat FIFO:</b> Cantitatea consumată va fi dedusă automat din cele mai vechi loturi de intrare din depozit, la costul real ponderat de achiziție.
                  </span>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cantitate Completată (Litri): *</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    required
                    value={iesireCantitate}
                    onChange={(e) => setIesireCantitate(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Index Contor Utilaj la Completare:</label>
                  <input
                    type="number"
                    value={iesireContor}
                    onChange={(e) => setIesireContor(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Mecanic / Responsabil: *</label>
                  <select
                    value={iesireMecanic}
                    onChange={(e) => setIesireMecanic(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    {mecaniciList.map((m: any) => (
                      <option key={m.id} value={m.nume}>
                         {m.nume} ({m.functie || 'Mecanic'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Notițe Atelier:</label>
                <input
                  value={iesireObservatii}
                  onChange={(e) => setIesireObservatii(e.target.value)}
                  placeholder="ex: Completat 2L ulei motor înainte de plecare pe șantier"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowCompletareModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  Salvează Completarea & Scade din Stoc
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL REZOLVARE ALERTĂ */}
      {solvingAlerta && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-lg font-bold text-sapphire-900">Remediere Alertă ({solvingAlerta.vehiculNumar || solvingAlerta.titlu})</h3>
              <button onClick={() => setSolvingAlerta(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRezolvaAlerta} className="space-y-3 text-xs">
              <div className="p-3 bg-roseash-50 border border-roseash-200 rounded-xl space-y-1">
                <p className="font-extrabold text-terracotta-700">{solvingAlerta.mesaj}</p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Soluție Rezolvare / Constatare Atelier: *</label>
                <textarea
                  required
                  rows={3}
                  value={solutieRezolvare}
                  onChange={(e) => setSolutieRezolvare(e.target.value)}
                  placeholder="ex: Schimbat garnitură baie ulei, efectuat revizie completă"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setSolvingAlerta(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Confirmă Remedierea Alertei</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: AJUSTARE PRAG ALERTĂ STOC MINIM */}
      {/* ========================================================================= */}
      {editingAlertArticol && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl border border-morning-200">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-sapphire-900">Configurare Prag Alertă Stoc Minim</h3>
                  <p className="text-xs text-sage-600 font-medium">Notificare automată la scădere stoc</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAlertArticol(null)}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePragAlert} className="space-y-4 text-xs">
              <div className="p-3 bg-morning-100/70 border border-morning-200 rounded-xl space-y-1">
                <p className="font-extrabold text-sapphire-900 text-xs">{editingAlertArticol.denumire}</p>
                <div className="flex items-center justify-between text-[11px] text-sage-600">
                  <span>Cod: <strong className="font-mono text-sapphire-800">{editingAlertArticol.codArticol}</strong></span>
                  <span>Stoc Curent: <strong className="font-mono text-emerald-700">{editingAlertArticol.stocCurent} {editingAlertArticol.unitateMasura || 'L'}</strong></span>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">
                  Prag Minim de Alertă ({editingAlertArticol.unitateMasura || 'L'}): *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={newPragAlert}
                  onChange={(e) => setNewPragAlert(Number(e.target.value))}
                  placeholder="ex: 50"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold text-sm focus:outline-none focus:border-sapphire-500"
                />
                <p className="text-[11px] text-sage-500 mt-1">
                  Când cantitatea disponibilă în depozit scade sub acest nivel, sistemul va marca automat articolul ca <strong>Stoc Critic</strong> și va genera alertă în dashboard.
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setEditingAlertArticol(null)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={isSavingAlert}
                  className="px-5 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20 disabled:opacity-50"
                >
                  {isSavingAlert ? 'Se salvează...' : 'Salvează Pragul de Alertă'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREARE / EDITARE CATEGORIE FLUID */}
      {/* ========================================================================= */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl border border-morning-200">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <Droplets className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-sapphire-900">
                  {editingCat ? `Editare Categorie (${editingCat.nume})` : 'Creează Categorie Nouă de Fluid'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAddCatModal(false); setEditingCat(null); }}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFluidCategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Categorie Fluid: *</label>
                <input
                  required
                  value={catNume}
                  onChange={(e) => setCatNume(e.target.value)}
                  placeholder="ex: Ulei Motor, Ulei Hidraulic, Antigel, AdBlue"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>


              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Categorie Fluid:</label>
                <input
                  value={catDescriere}
                  onChange={(e) => setCatDescriere(e.target.value)}
                  placeholder="ex: Ulei motor mineral și sintetic pentru camioane grele"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => { setShowAddCatModal(false); setEditingCat(null); }}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  {editingCat ? 'Salvează Modificările' : 'Creează Categorie Fluid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREARE / EDITARE SUBCATEGORIE FLUID */}
      {/* ========================================================================= */}
      {showAddSubcatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-periwinkle-100 text-periwinkle-700">
                  <Layers className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-sapphire-900">
                  {editingSubcat ? `Editare Subtip (${editingSubcat.nume})` : 'Adaugă Subtip / Subcategorie Fluid'}
                </h3>
              </div>
              <button
                onClick={() => { setShowAddSubcatModal(false); setEditingSubcat(null); }}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFluidSubcategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Categoria de Fluid: *</label>
                <select
                  value={targetCatForSubcat}
                  onChange={(e) => setTargetCatForSubcat(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {categoriiFluide.map((c) => (
                    <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Subtip Fluid: *</label>
                <input
                  required
                  value={subcatNume}
                  onChange={(e) => setSubcatNume(e.target.value)}
                  placeholder="ex: 10W-40 Low-SAPS, HLP 46, G12+ Roz, Vaselină EP2"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere / Specificație (opțional):</label>
                <input
                  value={subcatDescriere}
                  onChange={(e) => setSubcatDescriere(e.target.value)}
                  placeholder="ex: Recomandat pentru camioane Euro 6"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => { setShowAddSubcatModal(false); setEditingSubcat(null); }}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  {editingSubcat ? 'Salvează Modificările' : 'Salvează Subtip Fluid'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TRASABILITATE LOTURI FIFO */}
      {/* ========================================================================= */}
      {viewingFifoArticol && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-4xl space-y-4 shadow-2xl max-h-[90vh] flex flex-col bg-white">
            <div className="flex items-center justify-between pb-3 border-b border-morning-200">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Layers className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">
                    Trasabilitate Loturi de Intrare (FIFO) — {viewingFifoArticol.denumire}
                  </h3>
                  <p className="text-xs text-sage-600 font-medium mt-0.5">
                    Depozit: <strong>{viewingFifoArticol.depozit?.nume || 'Depozit Central'}</strong> | Categorie: <strong>{viewingFifoArticol.categorie}</strong> {viewingFifoArticol.subcategorie && <span>▸ <strong>{viewingFifoArticol.subcategorie}</strong></span>} | Stoc Total: <strong className="text-emerald-700 font-mono">{viewingFifoArticol.stocCurent} {viewingFifoArticol.unitateMasura || 'L'}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingFifoArticol(null)}
                className="p-1.5 rounded-lg text-sage-500 hover:text-sapphire-900 hover:bg-morning-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Banner explicativ FIFO */}
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Regula FIFO (First-In, First-Out) Activă:</p>
                <p className="text-emerald-800 text-[11px] mt-0.5">
                  Consumul la completări de fluide sau revizii descarcă automat cel mai vechi lot recepționat cu cantitate disponibilă. După epuizarea unui lot, sistemul trece la următorul lot, calculând prețul real de achiziție.
                </p>
              </div>
            </div>

            {/* Corp modal: tabel loturi */}
            <div className="flex-1 overflow-y-auto pr-1">
              {loadingFifoLoturi ? (
                <div className="py-12 text-center text-xs font-bold text-slate-500 animate-pulse">
                  Se încarcă istoricul loturilor FIFO...
                </div>
              ) : fifoLoturiList.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <Layers className="w-8 h-8 text-sage-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-600">Nu există loturi de recepție pe factură înregistrate pentru acest articol.</p>
                  <p className="text-[11px] text-sage-500">Stocul curent ({viewingFifoArticol.stocCurent} {viewingFifoArticol.unitateMasura || 'L'}) provine din inițializarea stocului sau recepție fără factură detaliată.</p>
                </div>
              ) : (
                (() => {
                  const firstActiveIdx = fifoLoturiList.findIndex(
                    (l) => (l.cantitateRamasa ?? l.cantitateIntrata) > 0
                  );
                  const totalRamas = fifoLoturiList.reduce(
                    (acc, l) => acc + (l.cantitateRamasa ?? l.cantitateIntrata),
                    0
                  );

                  return (
                    <div className="space-y-3">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200 sticky top-0">
                          <tr>
                            <th className="p-2.5">Ordine FIFO</th>
                            <th className="p-2.5">Dată Factură</th>
                            <th className="p-2.5">Nr. Factură & Furnizor</th>
                            <th className="p-2.5 font-mono">Cantitate Intrată</th>
                            <th className="p-2.5 font-mono">Cantitate Rămasă</th>
                            <th className="p-2.5 font-mono">Preț Unitar Achiziție</th>
                            <th className="p-2.5 font-mono">Valoare Rămasă</th>
                            <th className="p-2.5 text-center">Stare Lot</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-200">
                          {fifoLoturiList.map((lot, idx) => {
                            const cantRamas = lot.cantitateRamasa ?? lot.cantitateIntrata;
                            const isExhausted = cantRamas <= 0;
                            const isPriority = idx === firstActiveIdx;

                            return (
                              <tr
                                key={lot.id}
                                className={`transition ${
                                  isPriority
                                    ? 'bg-emerald-50/70 font-semibold text-emerald-950 border-l-4 border-l-emerald-500'
                                    : isExhausted
                                    ? 'bg-morning-50/50 text-slate-400'
                                    : 'hover:bg-morning-50'
                                }`}
                              >
                                <td className="p-2.5 font-mono font-bold">
                                  #{idx + 1}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  {lot.dataFactura ? new Date(lot.dataFactura).toLocaleDateString('ro-RO') : 'Nespecificat'}
                                </td>
                                <td className="p-2.5">
                                  <div className="font-bold text-sapphire-900">{lot.numarFactura || 'Fără Număr'}</div>
                                  <div className="text-[10px] text-sage-600">{lot.furnizor || 'Furnizor Nespecificat'}</div>
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  {lot.cantitateIntrata} {viewingFifoArticol.unitateMasura || 'L'}
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  <span className={isExhausted ? 'text-slate-400 line-through' : 'text-emerald-700'}>
                                    {cantRamas} {viewingFifoArticol.unitateMasura || 'L'}
                                  </span>
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  {Number(lot.pretUnitar || 0).toFixed(2)} RON
                                </td>
                                <td className="p-2.5 font-mono font-bold">
                                  {(cantRamas * Number(lot.pretUnitar || 0)).toFixed(2)} RON
                                </td>
                                <td className="p-2.5 text-center">
                                  {isPriority ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-600 text-white shadow-xs">
                                      Prioritar La Consum
                                    </span>
                                  ) : isExhausted ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-morning-200 text-slate-500">
                                      Epuizat
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                                      În Așteptare
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  );
                })()
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => setViewingFifoArticol(null)}
                className="px-5 py-2 rounded-xl bg-morning-200 text-slate-700 font-bold text-xs hover:bg-morning-300 transition"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
