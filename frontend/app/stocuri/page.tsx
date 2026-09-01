"use client";

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  PackageCheck, ShieldAlert, FileText, Wrench, AlertTriangle, CheckCircle, Plus,
  Filter, Edit3, X, ShoppingCart, History, Trash2, Search, Building2, Layers, AlertCircle,
  ArrowRight, ShieldCheck, ArrowLeftRight, CircleDot, Tag, Truck, RotateCcw, CheckCircle2
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';

function StocuriGarantiiContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  const [stocuri, setStocuri] = useState<any[]>([]);
  const [componente, setComponente] = useState<any[]>([]);
  const [intrariHistory, setIntrariHistory] = useState<any[]>([]);
  const [categorii, setCategorii] = useState<any[]>([]);
  const [depozite, setDepozite] = useState<any[]>([]);
  const [stocuriCritice, setStocuriCritice] = useState<any[]>([]);
  const [transferuriHistory, setTransferuriHistory] = useState<any[]>([]);
  const [mecanici, setMecanici] = useState<any[]>([]);

  // Stoc Anvelope Serializate pe Bucată (Magazie Anvelope)
  const [anvelopeStocList, setAnvelopeStocList] = useState<any[]>([]);
  const [anvelopeStocSearch, setAnvelopeStocSearch] = useState('');
  const [anvelopeStocFilterState, setAnvelopeStocFilterState] = useState<'ALL' | 'NOUA' | 'RULATA'>('ALL');
  const [anvelopeStocDepozitFilter, setAnvelopeStocDepozitFilter] = useState('');
  const [editingAnvelopaStoc, setEditingAnvelopaStoc] = useState<any>(null);
  const [showAddAnvelopeStocModal, setShowAddAnvelopeStocModal] = useState(false);
  const [newBatchAnv, setNewBatchAnv] = useState<any>({
    marca: 'BENCHMARK',
    model: 'KMD406 TRACTION',
    dimensiune: '315/80 R22.5',
    codDot: '2625',
    adancimeMm: 16,
    pretAchizitie: 1286.59,
    depozitId: '',
    cantitate: 4,
    serii: ['', '', '', ''],
  });

  // Filtre Multi-Criteriu Stoc Piese
  const [hideZeroStock, setHideZeroStock] = useState(true);
  const [selectedCategorieFilter, setSelectedCategorieFilter] = useState('');
  const [selectedSubcategorieFilter, setSelectedSubcategorieFilter] = useState('');
  const [selectedDepozitFilter, setSelectedDepozitFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TOATE'); // TOATE, CRITIC, IN_STOC
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'stoc' | 'anvelope_stoc' | 'depozite' | 'componente'>('stoc');

  // Ascultăm schimbarea tab-ului din URL / Sidebar
  useEffect(() => {
    if (tabParam && ['stoc', 'anvelope_stoc', 'depozite', 'componente'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  // Modale
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [showAddSubcatModal, setShowAddSubcatModal] = useState(false);
  const [showAddDepozitModal, setShowAddDepozitModal] = useState(false);
  const [editingDepozit, setEditingDepozit] = useState<any>(null);

  // Modál Transfer Parțial
  const [transferArticol, setTransferArticol] = useState<any>(null);
  const [transferDepozitDestinatieId, setTransferDepozitDestinatieId] = useState('');
  const [transferCantitate, setTransferCantitate] = useState(1);
  const [transferOperator, setTransferOperator] = useState('Brașoveanu Virgil (Șef Atelier)');
  const [transferObservatii, setTransferObservatii] = useState('');

  // Stare Creare Articol Simplu
  const [codArticol, setCodArticol] = useState('');
  const [denumire, setDenumire] = useState('');
  const [categorie, setCategorie] = useState('Anvelope');
  const [subcategorie, setSubcategorie] = useState('');
  const [depozitId, setDepozitId] = useState('');
  const [stocCurent, setStocCurent] = useState(10);
  const [stocMinim, setStocMinim] = useState(5);
  const [pretUnitar, setPretUnitar] = useState(100);
  const [unitateMasura, setUnitateMasura] = useState('buc');

  // Stare Creare Categorie / Subcategorie Nouă
  const [numeCategorieNoua, setNumeCategorieNoua] = useState('');
  const [descriereCatNoua, setDescriereCatNoua] = useState('');
  const [stocMinimImplicitCat, setStocMinimImplicitCat] = useState(5);
  const [numeSubcatNoua, setNumeSubcatNoua] = useState('');
  const [targetCatForSubcat, setTargetCatForSubcat] = useState('Anvelope');

  // Stare Creare / Editare Depozit Nou
  const [numeDepozitNou, setNumeDepozitNou] = useState('');
  const [adresaDepozitNou, setAdresaDepozitNou] = useState('');
  const [responsabilDepozitNou, setResponsabilDepozitNou] = useState('');

  // Stare Formular Recepție Marfă pe Factură
  const [bevCodArticol, setBevCodArticol] = useState('');
  const [bevDenumire, setBevDenumire] = useState('');
  const [bevCategorie, setBevCategorie] = useState('Anvelope');
  const [bevSubcategorie, setBevSubcategorie] = useState('');
  const [bevDepozitId, setBevDepozitId] = useState('');
  const [bevTipLichid, setBevTipLichid] = useState('NICIUNUL');
  const [bevMarcaUlei, setBevMarcaUlei] = useState('');
  const [bevFurnizor, setBevFurnizor] = useState('');
  const [bevNumarFactura, setBevNumarFactura] = useState('');
  const [bevDataFactura, setBevDataFactura] = useState(new Date().toISOString().split('T')[0]);
  const [bevCantitate, setBevCantitate] = useState(10);
  const [bevPretTotal, setBevPretTotal] = useState(1500);
  const [bevUM, setBevUM] = useState('buc');
  const [bevObservatii, setBevObservatii] = useState('');

  // Garanție la Recepție
  const [bevAreGarantie, setBevAreGarantie] = useState(false);
  const [bevSerieUnica, setBevSerieUnica] = useState('');
  const [bevDurataGarantieLuni, setBevDurataGarantieLuni] = useState(24);
  const [bevDurataGarantieRulaj, setBevDurataGarantieRulaj] = useState(2000);

  // Editare & Demontare Modale
  const [editingArticol, setEditingArticol] = useState<any>(null);
  const [selectedComp, setSelectedComp] = useState<any>(null);
  const [motivDemontare, setMotivDemontare] = useState('');
  const [popupGarantie, setPopupGarantie] = useState<any>(null);

  const fetchData = async () => {
    try {
      // Fetch Depozite
      const resDep = await fetch('http://localhost:3001/stocuri-garantii/depozite');
      if (resDep.ok) {
        const depData = await resDep.json();
        setDepozite(depData);
        if (depData.length > 0 && !depozitId) setDepozitId(depData[0].id);
        if (depData.length > 0 && !bevDepozitId) setBevDepozitId(depData[0].id);
        if (depData.length > 1 && !transferDepozitDestinatieId) setTransferDepozitDestinatieId(depData[1].id);
      }

      // Fetch Categorii
      const resCat = await fetch('http://localhost:3001/stocuri-garantii/categorii');
      if (resCat.ok) {
        const catData = await resCat.json();
        setCategorii([...catData.categoriiImplicite, ...catData.categoriiCustom]);
      }

      // Fetch Stocuri Critice
      const resCrit = await fetch('http://localhost:3001/stocuri-garantii/stocuri-critice');
      if (resCrit.ok) {
        const critData = await resCrit.json();
        setStocuriCritice(critData.articoleCritice || []);
      }

      // Fetch Stocuri cu Filtre Multi-Criteriu
      let queryParams = new URLSearchParams();
      if (selectedCategorieFilter) queryParams.append('categorie', selectedCategorieFilter);
      if (selectedSubcategorieFilter) queryParams.append('subcategorie', selectedSubcategorieFilter);
      if (selectedDepozitFilter) queryParams.append('depozitId', selectedDepozitFilter);
      if (selectedStatusFilter !== 'TOATE') queryParams.append('statusStoc', selectedStatusFilter);
      if (searchQuery) queryParams.append('cautare', searchQuery);

      const resStoc = await fetch(`http://localhost:3001/stocuri-garantii/stocuri?${queryParams.toString()}`);
      if (resStoc.ok) setStocuri(await resStoc.json());

      // Fetch Istoric Intrări (Facturi)
      const resIntrari = await fetch('http://localhost:3001/stocuri-garantii/intrare-stoc');
      if (resIntrari.ok) setIntrariHistory(await resIntrari.json());

      // Fetch Istoric Transferuri
      const resTrans = await fetch('http://localhost:3001/stocuri-garantii/istoric-transferuri');
      if (resTrans.ok) setTransferuriHistory(await resTrans.json());

      // Fetch Componente Serializate în Garanție
      const resComp = await fetch('http://localhost:3001/stocuri-garantii/componente-serializate');
      if (resComp.ok) setComponente(await resComp.json());

      // Fetch Mecanici Atelier
      const resMecanici = await fetch('http://localhost:3001/mentenanta/mecanici');
      if (resMecanici.ok) {
        const mecData = await resMecanici.json();
        setMecanici(mecData);
      }

      // Fetch Magazie Anvelope Serializate din Depozite
      const resAnvStoc = await fetch('http://localhost:3001/anvelope/depozit-stoc');
      if (resAnvStoc.ok) {
        setAnvelopeStocList(await resAnvStoc.json());
      }
    } catch (e) {
      console.log('Error fetching stock data', e);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedCategorieFilter, selectedSubcategorieFilter, selectedDepozitFilter, selectedStatusFilter, searchQuery]);

  const getSubcategoriiPentruCategorie = (catNume: string) => {
    const foundCat = categorii.find((c: any) => c.nume?.toLowerCase() === catNume?.toLowerCase());
    return foundCat?.subcategorii || [];
  };

  const handleCreateSubcategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeSubcatNoua || !targetCatForSubcat) return;
    try {
      const res = await fetch('http://localhost:3001/stocuri-garantii/subcategorii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorieNume: targetCatForSubcat,
          nume: numeSubcatNoua,
        }),
      });
      if (res.ok) {
        alert('✅ Subcategoria a fost adăugată cu succes!');
        setShowAddSubcatModal(false);
        setNumeSubcatNoua('');
        fetchData();
      }
    } catch (e) {
      alert('Eroare la adăugarea subcategoriei.');
    }
  };

  const handleOpenDepozitStoc = (depId: string) => {
    setSelectedDepozitFilter(depId);
    setActiveTab('stoc');
  };

  // Handler Execuție Transfer Parțial Între Depozite (Requested by User)
  const handleExecutaTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferArticol) return;

    try {
      const res = await fetch('http://localhost:3001/stocuri-garantii/transfer-stoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articolStocId: transferArticol.id,
          depozitDestinatieId: transferDepozitDestinatieId,
          cantitate: Number(transferCantitate),
          operator: transferOperator,
          observatii: transferObservatii,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj);
        setTransferArticol(null);
        setTransferObservatii('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare transfer: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la executarea transferului parțial.');
    }
  };

  // Creare Categorie Nouă cu Stoc Minim Implicit
  const handleCreateCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/stocuri-garantii/categorii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeCategorieNoua,
          descriere: descriereCatNoua,
          stocMinimImplicit: Number(stocMinimImplicitCat),
        }),
      });

      if (res.ok) {
        setShowAddCatModal(false);
        setNumeCategorieNoua('');
        setDescriereCatNoua('');
        fetchData();
        alert(`Categorie nouă "${numeCategorieNoua}" creată cu stoc minim implicit de ${stocMinimImplicitCat}!`);
      }
    } catch (e) {
      alert('Eroare la crearea categoriei.');
    }
  };

  // Creare Depozit Nou
  const handleCreateDepozit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/stocuri-garantii/depozite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeDepozitNou,
          adresa: adresaDepozitNou,
          responsabil: responsabilDepozitNou,
        }),
      });

      if (res.ok) {
        setShowAddDepozitModal(false);
        setNumeDepozitNou('');
        setAdresaDepozitNou('');
        setResponsabilDepozitNou('');
        fetchData();
        alert(`Depozit nou "${numeDepozitNou}" creat cu succes!`);
      }
    } catch (e) {
      alert('Eroare la crearea depozitului.');
    }
  };

  // Editare Depozit
  const handleUpdateDepozit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDepozit) return;

    try {
      const res = await fetch(`http://localhost:3001/stocuri-garantii/depozite/${editingDepozit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingDepozit),
      });

      if (res.ok) {
        setEditingDepozit(null);
        fetchData();
        alert('Datele depozitului au fost actualizate!');
      }
    } catch (e) {
      alert('Eroare la actualizarea depozitului.');
    }
  };

  // Ștergere Depozit
  const handleDeleteDepozit = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Depozit',
      'Sigur doriți să ștergeți acest depozit?',
      'Da, șterge depozitul',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`http://localhost:3001/stocuri-garantii/depozite/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEditingDepozit(null);
        fetchData();
        alert('Depozit șters.');
      }
    } catch (e) {
      alert('Eroare la ștergerea depozitului.');
    }
  };

  // Salvare Articol Simplu
  const handleCreateArticol = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/stocuri-garantii/stocuri', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codArticol,
          denumire,
          categorie,
          subcategorie,
          depozitId,
          stocCurent: Number(stocCurent),
          stocMinim: Number(stocMinim),
          pretUnitar: Number(pretUnitar),
          unitateMasura,
        }),
      });

      if (res.ok) {
        setShowAddModal(false);
        setCodArticol('');
        setDenumire('');
        setSubcategorie('');
        fetchData();
        alert('Articol adăugat în stoc cu succes!');
      }
    } catch (e) {
      alert('Eroare la adăugarea articolului.');
    }
  };

  // Salvare Recepție Marfă pe Factură
  const handleBevetelez = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/stocuri-garantii/intrare-stoc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codArticol: bevCodArticol,
          denumire: bevDenumire,
          categorie: bevCategorie,
          subcategorie: bevSubcategorie,
          depozitId: bevDepozitId,
          tipLichid: bevTipLichid !== 'NICIUNUL' ? bevTipLichid : undefined,
          marcaUlei: bevMarcaUlei || undefined,
          furnizor: bevFurnizor,
          numarFactura: bevNumarFactura,
          dataFactura: bevDataFactura,
          cantitate: Number(bevCantitate),
          pretTotal: Number(bevPretTotal),
          unitateMasura: bevUM,
          observatii: bevObservatii,

          areGarantie: bevAreGarantie,
          serieUnica: bevSerieUnica || undefined,
          durataGarantieLuni: Number(bevDurataGarantieLuni),
          durataGarantieRulaj: Number(bevDurataGarantieRulaj),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj);
        fetchData();
        setActiveTab(bevAreGarantie ? 'componente' : 'stoc');
        setBevCodArticol('');
        setBevDenumire('');
        setBevFurnizor('');
        setBevNumarFactura('');
        setBevSerieUnica('');
        setBevAreGarantie(false);
      }
    } catch (e) {
      alert('Eroare la recepția mărfii.');
    }
  };

  const handleUpdateArticol = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticol) return;
    try {
      const payload = {
        ...editingArticol,
        pretUnitar: Number(Number(editingArticol.pretUnitar || 0).toFixed(2)),
        stocCurent: Number(Number(editingArticol.stocCurent || 0).toFixed(2)),
        stocMinim: Number(Number(editingArticol.stocMinim || 0).toFixed(2)),
      };
      const res = await fetch(`http://localhost:3001/stocuri-garantii/stocuri/${editingArticol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingArticol(null);
        fetchData();
        alert('Datele articolului au fost actualizate!');
      }
    } catch (e) {
      alert('Eroare la salvarea modificărilor.');
    }
  };

  const handleDeleteArticol = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Articol din Stoc',
      'Sigur doriți să ștergeți acest articol din stoc?',
      'Da, șterge articolul',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`http://localhost:3001/stocuri-garantii/stocuri/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEditingArticol(null);
        fetchData();
        alert('Articol șters din stoc.');
      }
    } catch (e) {
      alert('Eroare la ștergerea articolului.');
    }
  };

  // Actualizare Anvelopă Serializată
  const handleUpdateAnvelopaStoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnvelopaStoc) return;
    try {
      const payload = {
        serieAnvelopa: editingAnvelopaStoc.serieAnvelopa,
        codDot: editingAnvelopaStoc.codDot,
        marca: editingAnvelopaStoc.marca,
        model: editingAnvelopaStoc.model,
        dimensiune: editingAnvelopaStoc.dimensiune,
        adancimeCurentaMm: Number(editingAnvelopaStoc.adancimeCurentaMm),
        adancimeInitialaMm: Number(editingAnvelopaStoc.adancimeInitialaMm || 16),
        pretAchizitie: Number(Number(editingAnvelopaStoc.pretAchizitie || 0).toFixed(2)),
        depozitId: editingAnvelopaStoc.depozitId,
      };
      const res = await fetch(`http://localhost:3001/anvelope/${editingAnvelopaStoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setEditingAnvelopaStoc(null);
        fetchData();
        alert('Datele anvelopei au fost actualizate!');
      }
    } catch (e) {
      alert('Eroare la salvarea anvelopei.');
    }
  };

  // Eliminare / Casare Anvelopă din Magazie
  const handleDeleteAnvelopaStoc = async (id: string, serie: string) => {
    const confirmed = await showConfirm(
      'Eliminare Anvelopă din Magazie',
      `Sigur doriți să eliminați definitiv anvelopa ${serie} din stoc?`,
      'Da, elimină',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`http://localhost:3001/anvelope/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEditingAnvelopaStoc(null);
        fetchData();
        alert('Anvelopa a fost eliminată din magazie.');
      }
    } catch (e) {
      alert('Eroare la eliminarea anvelopei.');
    }
  };

  // Adăugare Lot Anvelope Serializate în Magazie
  const handleAddAnvelopeBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchAnv.depozitId && depozite.length > 0) {
      newBatchAnv.depozitId = depozite[0].id;
    }
    try {
      const res = await fetch('http://localhost:3001/anvelope/adauga-stoc-serializat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newBatchAnv,
          pretAchizitie: Number(Number(newBatchAnv.pretAchizitie || 0).toFixed(2)),
          adancimeMm: Number(newBatchAnv.adancimeMm || 16),
          cantitate: Number(newBatchAnv.cantitate || 1),
        }),
      });
      if (res.ok) {
        setShowAddAnvelopeStocModal(false);
        fetchData();
        alert('Anvelopele au fost înregistrate individual cu succes!');
      }
    } catch (e) {
      alert('Eroare la adăugarea anvelopelor.');
    }
  };

  const handleConfirmDemonteaza = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComp) return;
    try {
      const res = await fetch(`http://localhost:3001/stocuri-garantii/demonteaza-componenta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentaId: selectedComp.id,
          motivDemontare,
        }),
      });
      if (res.ok) {
        setSelectedComp(null);
        setMotivDemontare('');
        fetchData();
        alert('Componenta a fost demontată și garanția verificată!');
      }
    } catch (e) {
      alert('Eroare la demontarea componentei.');
    }
  };

  const pretUnitarKiszamolva = (bevPretTotal / Math.max(1, bevCantitate)).toFixed(2);

  // Filtrare stocuri disponibile vs stoc 0
  const countZeroStock = stocuri.filter((s) => (s.stocCurent || 0) <= 0).length;
  const stocuriAfisate = stocuri.filter((s) => {
    if (hideZeroStock && (s.stocCurent || 0) <= 0) return false;
    return true;
  });

  // Filtrare anvelope serializate din magazie
  const anvelopeStocFiltrate = anvelopeStocList.filter((a) => {
    const isNoua = (a.adancimeCurentaMm || 16) >= 15;
    if (anvelopeStocFilterState === 'NOUA' && !isNoua) return false;
    if (anvelopeStocFilterState === 'RULATA' && isNoua) return false;
    if (anvelopeStocDepozitFilter && a.depozitId !== anvelopeStocDepozitFilter) return false;
    if (anvelopeStocSearch.trim()) {
      const q = anvelopeStocSearch.toLowerCase();
      const match =
        (a.serieAnvelopa || '').toLowerCase().includes(q) ||
        (a.marca || '').toLowerCase().includes(q) ||
        (a.model || '').toLowerCase().includes(q) ||
        (a.dimensiune || '').toLowerCase().includes(q) ||
        (a.codDot || '').toLowerCase().includes(q) ||
        (a.depozit?.nume || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const totalValoareAnvelopeStoc = anvelopeStocList.reduce((acc, a) => acc + (a.pretAchizitie || 0), 0);
  const countAnvelopeNoi = anvelopeStocList.filter((a) => (a.adancimeCurentaMm || 16) >= 15).length;
  const countAnvelopeRulate = anvelopeStocList.length - countAnvelopeNoi;

  return (
    <div className="space-y-6">
      {/* Antet Titlu & Acțiuni - 100% PURE ROMANIAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <PackageCheck className="w-6 h-6 text-sapphire-500" />
            <span>Gestiune Stocuri, Depozite & Transferuri</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Gestiune depozite, inventar anvelope serializate pe bucată, transferuri parțiale și garanții</p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <Link
            href="/efactura?tab=manual"
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Recepție Marfă pe Factură</span>
          </Link>
        </div>
      </div>

      {/* SELECTOR TABURI PRINCIPALE (CU CONTOR LIVE) */}
      <div className="flex items-center space-x-2 border-b border-morning-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('stoc')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'stoc'
              ? 'bg-sapphire-500 text-white shadow-xs'
              : 'bg-morning-100 text-slate-700 hover:bg-morning-200 hover:text-sapphire-900'
          }`}
        >
          <PackageCheck className="w-4 h-4" />
          <span>1. Gestiune Piese & Consumabile</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'stoc' ? 'bg-white/20 text-white' : 'bg-morning-200 text-sage-600'}`}>
            {stocuriAfisate.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('anvelope_stoc')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'anvelope_stoc'
              ? 'bg-sapphire-500 text-white shadow-xs'
              : 'bg-morning-100 text-slate-700 hover:bg-morning-200 hover:text-sapphire-900'
          }`}
        >
          <CircleDot className="w-4 h-4" />
          <span>2. Magazie Centrală Anvelope (Serializat)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${activeTab === 'anvelope_stoc' ? 'bg-emerald-400 text-slate-900' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}`}>
            {anvelopeStocList.length} buc
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('depozite')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'depozite'
              ? 'bg-sapphire-500 text-white shadow-xs'
              : 'bg-morning-100 text-slate-700 hover:bg-morning-200 hover:text-sapphire-900'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>3. Depozite Flotă & Transferuri</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'depozite' ? 'bg-white/20 text-white' : 'bg-morning-200 text-sage-600'}`}>
            {depozite.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('componente')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'componente'
              ? 'bg-sapphire-500 text-white shadow-xs'
              : 'bg-morning-100 text-slate-700 hover:bg-morning-200 hover:text-sapphire-900'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>4. Garanții Componente</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${activeTab === 'componente' ? 'bg-white/20 text-white' : 'bg-morning-200 text-sage-600'}`}>
            {componente.length}
          </span>
        </button>
      </div>

      {/* TAB 1: GESTIUNE PIESE, FLUIDE & CONSUMABILE */}
      {activeTab === 'stoc' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          {/* Panou Filtre & Căutare Rapidă */}
          <div className="p-4 rounded-2xl bg-morning-100 border border-morning-200 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Căutare rapidă după denumire, cod articol, marcă ulei..."
                  className="w-full bg-white border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 font-bold focus:border-sapphire-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs flex-wrap">
                {/* Filtru Categorie */}
                <select
                  value={selectedCategorieFilter}
                  onChange={(e) => {
                    setSelectedCategorieFilter(e.target.value);
                    setSelectedSubcategorieFilter('');
                  }}
                  className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">Toate Categoriile</option>
                  {categorii.map((c, idx) => (
                    <option key={idx} value={c.nume}>{c.nume}</option>
                  ))}
                </select>

                {/* Filtru Subcategorie */}
                {selectedCategorieFilter && (
                  <select
                    value={selectedSubcategorieFilter}
                    onChange={(e) => setSelectedSubcategorieFilter(e.target.value)}
                    className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="">Toate Subcategoriile ({selectedCategorieFilter})</option>
                    {getSubcategoriiPentruCategorie(selectedCategorieFilter).map((sub: any, idx: number) => (
                      <option key={idx} value={sub.nume}>{sub.nume}</option>
                    ))}
                  </select>
                )}

                {/* Filtru Depozit */}
                <select
                  value={selectedDepozitFilter}
                  onChange={(e) => setSelectedDepozitFilter(e.target.value)}
                  className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="">Toate Depozitele</option>
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </select>

                {/* Filtru Stare Stoc */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
                >
                  <option value="TOATE">Toate Stările</option>
                  <option value="CRITIC">⚠️ Doar Stoc Critic (Sub Minim)</option>
                  <option value="IN_STOC">✅ Doar Stoc Optim (În Grafic)</option>
                </select>

                {/* Comutator Filtrare Stoc Zero (0) */}
                <button
                  type="button"
                  onClick={() => setHideZeroStock(!hideZeroStock)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold transition flex items-center space-x-1.5 ${
                    hideZeroStock
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                      : 'bg-morning-200 border-morning-300 text-slate-700'
                  }`}
                  title="Comută afișarea articolelor cu stoc 0"
                >
                  <span>{hideZeroStock ? '✓ Doar Stoc Disponibil (>0)' : '👁️ Include Stoc Zero (0)'}</span>
                </button>

                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-xs transition"
                >
                  + Adaugă Articol
                </button>
              </div>
            </div>

            {selectedDepozitFilter && (
              <div className="flex items-center space-x-2 pt-1 border-t border-morning-200 text-xs text-sapphire-600 font-bold">
                <span>Filtru activ Depozit: {depozite.find(d => d.id === selectedDepozitFilter)?.nume}</span>
                <button onClick={() => setSelectedDepozitFilter('')} className="underline text-terracotta-600 hover:text-terracotta-700 ml-2">Șterge Filtru Depozit</button>
              </div>
            )}
          </div>

          {/* Banner Notificare Articole cu Stoc Zero ascunse */}
          {hideZeroStock && countZeroStock > 0 && (
            <div className="p-3 bg-sapphire-50/70 border border-sapphire-200 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-sapphire-900 font-medium">
                <AlertCircle className="w-4 h-4 text-sapphire-500 shrink-0" />
                <span>
                  Sunt ascunse <strong>{countZeroStock} articole</strong> cu stoc zero (epuizate) pentru a păstra tabelul curat.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHideZeroStock(false)}
                className="text-xs font-bold text-sapphire-700 hover:text-sapphire-900 hover:underline px-2 py-0.5"
              >
                Afișează-le în tabel
              </button>
            </div>
          )}

          {/* Tabel Stocuri */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Cod Articol</th>
                  <th className="p-3">Denumire Articol / Ulei</th>
                  <th className="p-3">Categorie & Subcategorie</th>
                  <th className="p-3">Depozit Curent</th>
                  <th className="p-3">Stoc Curent / Minim</th>
                  <th className="p-3 font-mono">Preț Unitar</th>
                  <th className="p-3 text-right">Acțiuni Stoc & Transfer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {stocuriAfisate.map((s) => {
                  const esteCritic = s.stocCurent <= s.stocMinim;
                  const isAnvelopa = (s.categorie || '').toLowerCase().includes('anvelop') || (s.codArticol || '').startsWith('ANV');
                  return (
                    <tr key={s.id} className={`hover:bg-morning-50 transition ${esteCritic ? 'bg-roseash-50' : ''}`}>
                      <td className="p-3 font-mono text-sapphire-600 font-bold flex items-center space-x-1">
                        {esteCritic && <AlertCircle className="w-3.5 h-3.5 text-terracotta-500" />}
                        <span>{s.codArticol}</span>
                      </td>
                      <td className="p-3 font-bold text-sapphire-900">
                        {s.denumire}
                        {s.marcaUlei && <span className="text-[10px] text-sage-600 font-medium block">Marcă: {s.marcaUlei}</span>}
                        {isAnvelopa && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => setActiveTab('anvelope_stoc')}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold hover:bg-emerald-100 transition"
                            >
                              <CircleDot className="w-3 h-3 text-emerald-600" />
                              <span>🛞 Vezi Serii în Magazie Anvelope ({s.stocCurent} buc)</span>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center space-x-1 flex-wrap gap-1">
                          <span className="px-2.5 py-0.5 rounded bg-morning-200 text-slate-700 text-[10px] font-semibold">
                            {s.categorie}
                          </span>
                          {s.subcategorie && (
                            <span className="px-2.5 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-700 text-[10px] font-bold">
                              ▸ {s.subcategorie}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-semibold text-slate-800">
                        <button
                          onClick={() => handleOpenDepozitStoc(s.depozitId || '')}
                          className="flex items-center space-x-1 hover:text-sapphire-600 hover:underline text-left cursor-pointer"
                        >
                          <Building2 className="w-3.5 h-3.5 text-sapphire-500" />
                          <span>{s.depozit?.nume || 'Depozit Central'}</span>
                        </button>
                      </td>
                      <td className="p-3 font-bold font-mono">
                        <span className={esteCritic ? 'text-terracotta-600 font-extrabold text-sm' : 'text-sage-700'}>
                          {s.stocCurent} {s.unitateMasura}
                        </span>
                        <span className="text-sage-500 font-normal text-[10px] ml-1">(min {s.stocMinim})</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-sapphire-900">
                        {Number(s.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON / {s.unitateMasura}
                      </td>
                      <td className="p-3 text-right space-x-1.5">
                        <button
                          onClick={() => {
                            setTransferArticol(s);
                            setTransferCantitate(1);
                            const altDep = depozite.find(d => d.id !== s.depozitId);
                            if (altDep) setTransferDepozitDestinatieId(altDep.id);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-periwinkle-100 hover:bg-periwinkle-300 text-periwinkle-700 text-[11px] font-bold border border-periwinkle-300 transition"
                          title="Transferă parțial în alt depozit"
                        >
                          <span className="flex items-center space-x-1">
                            <ArrowLeftRight className="w-3.5 h-3.5" />
                            <span>Transfer Parțial</span>
                          </span>
                        </button>

                        <button
                          onClick={() => setEditingArticol({
                            ...s,
                            pretUnitar: Number(Number(s.pretUnitar || 0).toFixed(2)),
                            stocCurent: Number(Number(s.stocCurent || 0).toFixed(2)),
                            stocMinim: Number(Number(s.stocMinim || 0).toFixed(2)),
                          })}
                          className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-[11px] font-semibold border border-morning-200 transition"
                        >
                          Editează
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



      {/* TAB 2: MAGAZIE CENTRALĂ ANVELOPE (SERIALIZAT & BUCATĂ CU BUCATĂ) */}
      {activeTab === 'anvelope_stoc' && (
        <div className="space-y-4">
          {/* Carduri KPI Statistica Magazie Anvelope */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl">
                <CircleDot className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">Total Anvelope în Stoc</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">{anvelopeStocList.length} buc</p>
                <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Disponibile pentru montaj</p>
              </div>
            </div>

            <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-sapphire-100 text-sapphire-800 rounded-xl">
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">Anvelope Noi (Profil 16mm)</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">{countAnvelopeNoi} buc</p>
                <p className="text-[10px] text-sapphire-600 font-semibold mt-0.5">Nerulate / Achiziții noi</p>
              </div>
            </div>

            <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-amber-100 text-amber-900 rounded-xl">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">Rulate / Rezervă</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">{countAnvelopeRulate} buc</p>
                <p className="text-[10px] text-amber-700 font-semibold mt-0.5">Demontate & refolosibile</p>
              </div>
            </div>

            <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="p-3 bg-periwinkle-100 text-periwinkle-800 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">Valoare Totală Stoc</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">
                  {Number(totalValoareAnvelopeStoc).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                </p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Inventar magazie</p>
              </div>
            </div>
          </div>

          {/* Panou Filtre & Căutare Magazie Anvelope */}
          <div className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  type="text"
                  value={anvelopeStocSearch}
                  onChange={(e) => setAnvelopeStocSearch(e.target.value)}
                  placeholder="🔍 Caută anvelopă după Serie (SN), Marcă, Model, Dimensiune, DOT, Depozit..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-sapphire-900 font-bold focus:bg-white focus:border-sapphire-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 text-xs flex-wrap">
                {/* Filtru Stare Anvelopă */}
                <div className="flex items-center space-x-1 bg-morning-100 p-1 rounded-xl border border-morning-200">
                  <button
                    type="button"
                    onClick={() => setAnvelopeStocFilterState('ALL')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      anvelopeStocFilterState === 'ALL' ? 'bg-white text-sapphire-900 shadow-xs' : 'text-sage-600 hover:text-sapphire-900'
                    }`}
                  >
                    Toate ({anvelopeStocList.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnvelopeStocFilterState('NOUA')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      anvelopeStocFilterState === 'NOUA' ? 'bg-emerald-500 text-white shadow-xs' : 'text-sage-600 hover:text-emerald-800'
                    }`}
                  >
                    ✨ Noi ({countAnvelopeNoi})
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnvelopeStocFilterState('RULATA')}
                    className={`px-3 py-1 rounded-lg font-bold transition ${
                      anvelopeStocFilterState === 'RULATA' ? 'bg-amber-500 text-white shadow-xs' : 'text-sage-600 hover:text-amber-800'
                    }`}
                  >
                    📦 Rulate ({countAnvelopeRulate})
                  </button>
                </div>

                {/* Filtru Depozit */}
                <select
                  value={anvelopeStocDepozitFilter}
                  onChange={(e) => setAnvelopeStocDepozitFilter(e.target.value)}
                  className="bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold text-xs focus:bg-white cursor-pointer"
                >
                  <option value="">Toate Depozitele ({depozite.length})</option>
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddAnvelopeStocModal(true)}
                  className="px-3.5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-xs transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Adaugă Anvelope Noi</span>
                </button>
              </div>
            </div>
          </div>

          {/* Grid Carduri Anvelope Serializate */}
          {anvelopeStocFiltrate.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {anvelopeStocFiltrate.map((a: any) => {
                const isNoua = (a.adancimeCurentaMm || 16) >= 15;
                const procentProfil = Math.min(100, Math.round(((a.adancimeCurentaMm || 16) / 16) * 100));

                return (
                  <div
                    key={a.id}
                    className="pleasant-card bg-white p-4 rounded-2xl border border-morning-200 hover:border-sapphire-300 hover:shadow-md transition space-y-3 text-xs"
                  >
                    {/* Header Card */}
                    <div className="flex items-center justify-between border-b border-morning-100 pb-2.5">
                      <div className="flex items-center space-x-1.5">
                        <span className="px-2.5 py-1 rounded-lg bg-sapphire-900 text-white font-mono font-black text-xs tracking-wide shadow-xs">
                          🏷️ {a.serieAnvelopa}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isNoua
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          {isNoua ? '✨ NOUĂ' : '📦 RULATĂ'}
                        </span>
                      </div>

                      <span className="font-mono font-black text-sapphire-900 text-xs bg-sapphire-50 px-2 py-1 rounded-lg border border-sapphire-100">
                        {Number(a.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </span>
                    </div>

                    {/* Detalii Anvelopă */}
                    <div className="space-y-1.5">
                      <p className="font-extrabold text-sapphire-900 text-sm">{a.marca} {a.model}</p>
                      <div className="flex items-center justify-between text-slate-700 font-semibold">
                        <span className="bg-morning-100 px-2 py-0.5 rounded-md font-mono text-[11px] text-sapphire-800">
                          {a.dimensiune}
                        </span>
                        <span className="text-[11px] font-mono text-sage-600">
                          DOT: <strong className="text-sapphire-900">{a.codDot || '2625'}</strong>
                        </span>
                      </div>
                    </div>

                    {/* Bară Profil & Depozit */}
                    <div className="p-2.5 bg-morning-50 rounded-xl border border-morning-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-sage-600 font-medium">Adâncime Profil:</span>
                        <span className="font-mono font-extrabold text-sapphire-900">
                          {a.adancimeCurentaMm} mm <span className="text-sage-400 font-normal text-[10px]">/ 16mm</span>
                        </span>
                      </div>
                      <div className="w-full bg-morning-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-1.5 rounded-full ${
                            procentProfil > 60 ? 'bg-emerald-500' : procentProfil > 30 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${procentProfil}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-sage-600 font-medium flex items-center space-x-1 pt-0.5">
                        <Building2 className="w-3 h-3 text-sapphire-500" />
                        <span>Locație: <strong>{a.depozit?.nume || 'Depozit Central'}</strong></span>
                      </p>
                    </div>

                    {/* Butoane Acțiuni Rapide */}
                    <div className="flex items-center justify-between pt-1 border-t border-morning-100 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingAnvelopaStoc({
                          ...a,
                          pretAchizitie: Number(Number(a.pretAchizitie || 0).toFixed(2)),
                        })}
                        className="flex-1 py-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 text-sapphire-900 font-bold text-[11px] border border-morning-200 transition text-center"
                      >
                        ✏️ Editează
                      </button>

                      <Link
                        href="/anvelope"
                        className="flex-1 py-1.5 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-[11px] shadow-xs transition text-center flex items-center justify-center space-x-1"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Montează</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => handleDeleteAnvelopaStoc(a.id, a.serieAnvelopa)}
                        className="p-1.5 rounded-lg bg-roseash-100 hover:bg-roseash-200 text-terracotta-600 border border-roseash-300 transition"
                        title="Elimină din stoc"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="pleasant-card bg-white p-8 rounded-2xl border border-morning-200 text-center space-y-2">
              <CircleDot className="w-10 h-10 text-sage-300 mx-auto" />
              <h3 className="font-bold text-sapphire-900 text-sm">Nicio anvelopă nu corespunde filtrelor selectate</h3>
              <p className="text-xs text-sage-500">
                Puteți reseta căutarea sau înregistra anvelope noi folosind butonul de mai sus.
              </p>
              {anvelopeStocSearch && (
                <button
                  type="button"
                  onClick={() => setAnvelopeStocSearch('')}
                  className="px-3 py-1.5 rounded-lg bg-morning-200 text-sapphire-900 font-bold text-xs hover:bg-morning-300"
                >
                  Resetează căutarea
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DEPOZITE FLOTĂ */}
      {activeTab === 'depozite' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-sapphire-500" />
                <span>Gestiune Depozite (Faceți clic pe un depozit pentru a vedea stocul conținut)</span>
              </h2>
              <p className="text-xs text-sage-700 font-medium">Faceți clic pe orice depozit pentru a deschide automat stocul conținut!</p>
            </div>

            <button onClick={() => setShowAddDepozitModal(true)} className="px-3.5 py-2 rounded-xl bg-sapphire-500 text-white font-bold text-xs shadow-xs">
              + Depozit Nou
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {depozite.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-white border border-morning-200 hover:border-sapphire-500 space-y-3 shadow-xs hover:shadow-md transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 cursor-pointer" onClick={() => handleOpenDepozitStoc(d.id)}>
                    <Building2 className="w-5 h-5 text-sapphire-500 group-hover:scale-110 transition-transform" />
                    <h3 className="font-extrabold text-sapphire-900 text-sm group-hover:text-sapphire-600 transition">{d.nume}</h3>
                  </div>

                  <button
                    onClick={() => setEditingDepozit(d)}
                    className="p-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 text-slate-600 text-xs font-semibold"
                    title="Editează Depozit"
                  >
                    <Edit3 className="w-4 h-4 text-sapphire-600" />
                  </button>
                </div>

                <p className="text-xs text-sage-700 font-medium">Adresă: <span className="font-semibold text-slate-800">{d.adresa || 'N/A'}</span></p>
                <p className="text-xs text-sage-700 font-medium">Responsabil: <span className="font-semibold text-slate-800">{d.responsabil || 'N/A'}</span></p>

                <div className="pt-2 border-t border-morning-200 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-sapphire-50 text-sapphire-600 font-extrabold text-[10px]">
                      {d._count?.articoleStoc || 0} piese
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-extrabold text-[10px]">
                      🛞 {d._count?.anvelope || 0} anvelope
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenDepozitStoc(d.id)}
                    className="flex items-center space-x-1 text-xs font-bold text-sapphire-600 hover:text-sapphire-800"
                  >
                    <span>Vezi Stoc Depozit</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: COMPONENTE SERIALIZATE & GARANȚII ACTIVE */}
      {activeTab === 'componente' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-sapphire-500" />
                <span>Garanții Componente Active în Registru ({componente.length})</span>
              </h2>
              <p className="text-xs text-sage-700 font-medium">Lista centralizată a tuturor pieselor achiziționate care beneficiază de garanție de la producător.</p>
            </div>

            <span className="px-3 py-1 rounded-full bg-sapphire-50 border border-sapphire-100 text-sapphire-600 font-extrabold text-xs">
              🛡️ {componente.length} Componente în Garanție
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Componentă / Serie Unică (SN)</th>
                  <th className="p-3">Furnizor & Factură</th>
                  <th className="p-3">Utilaj Montat</th>
                  <th className="p-3">Durată Garanție (Luni / Rulaj)</th>
                  <th className="p-3">Stare Garanție</th>
                  <th className="p-3 text-right">Acțiune Atelier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {componente.map((c) => (
                  <tr key={c.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-bold text-sapphire-900">
                      {c.articolStoc?.denumire || 'Componentă'}
                      <div className="text-[10px] text-sapphire-600 font-mono font-bold">Serie: {c.serieUnica}</div>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      {c.articolStoc?.intrariStoc?.[0]?.furnizor || c.furnizor || 'Furnizor e-Factura'}
                      <div className="text-[10px] text-sage-700 font-mono">Factură: {c.articolStoc?.intrariStoc?.[0]?.numarFactura || c.numarFactura || '-'}</div>
                    </td>
                    <td className="p-3 font-bold text-sage-700">
                      {c.vehicul?.numarIntern ? `${c.vehicul.numarIntern} (${c.vehicul.numarInmatriculare})` : `În Stoc (${c.articolStoc?.depozit?.nume || 'Depozit Central'})`}
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-800">
                      {c.luniGarantie || c.garantieProducatorLuni || 24} Luni / {c.kilometriGarantie || c.garantieProducatorKm || 2000} km/mTH
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-1 rounded-full bg-sapphire-50 border border-sapphire-200 text-sapphire-700 text-[10px] font-bold">
                        ✅ În Garanție Activă
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedComp(c)}
                        className="px-3 py-1.5 rounded-lg bg-roseash-100 hover:bg-roseash-300 text-terracotta-600 border border-roseash-300 text-[11px] font-bold transition"
                      >
                        Demontează Piesă (Verifică Garanție)
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODÁL TRANSFER PARȚIAL ÎNTRE DEPOZITE (USER REQUESTED FEATURE) */}
      {transferArticol && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900 flex items-center space-x-2">
                <ArrowLeftRight className="w-5 h-5 text-periwinkle-700" />
                <span>Transfer Parțial Între Depozite</span>
              </h3>
              <button onClick={() => setTransferArticol(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecutaTransfer} className="space-y-3 text-xs">
              <div className="p-3 bg-morning-100 rounded-xl border border-morning-200 space-y-1">
                <p className="font-extrabold text-sapphire-900">{transferArticol.denumire} ({transferArticol.codArticol})</p>
                <p className="text-sage-700 font-medium">
                  Depozit Sursă: <span className="font-bold text-slate-800">{transferArticol.depozit?.nume || 'Depozit Central'}</span>
                </p>
                <p className="text-sage-700 font-medium">
                  Stoc Disponibil: <span className="font-mono font-extrabold text-sapphire-600">{transferArticol.stocCurent} {transferArticol.unitateMasura}</span>
                </p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Depozit Destinație:</label>
                <select
                  required
                  value={transferDepozitDestinatieId}
                  onChange={(e) => setTransferDepozitDestinatieId(e.target.value)}
                  className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite
                    .filter((d) => d.id !== transferArticol.depozitId)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.nume}</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Cantitate de Transferat ({transferArticol.unitateMasura}):</label>
                <input
                  type="number"
                  min="1"
                  max={transferArticol.stocCurent}
                  required
                  value={transferCantitate}
                  onChange={(e) => setTransferCantitate(Number(e.target.value))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-extrabold text-sm"
                />
                <p className="text-[10px] text-sage-500 mt-1">Ex: Din cele {transferArticol.stocCurent} bucăți, câte transferați în depozitul destinație?</p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Operator / Mecanic:</label>
                <input
                  value={transferOperator}
                  onChange={(e) => setTransferOperator(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-semibold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații & Notițe Transfer:</label>
                <input
                  value={transferObservatii}
                  onChange={(e) => setTransferObservatii(e.target.value)}
                  placeholder="ex: Transfer 2 buc filtre ulei la șantier A3"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setTransferArticol(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Execută Transfer Parțial</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL EDITARE DEPOZIT */}
      {editingDepozit && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Editare Date Depozit ({editingDepozit.nume})</h3>
              <button onClick={() => setEditingDepozit(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateDepozit} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Depozit:</label>
                <input required value={editingDepozit.nume} onChange={(e) => setEditingDepozit({ ...editingDepozit, nume: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Adresă / Locație:</label>
                <input value={editingDepozit.adresa || ''} onChange={(e) => setEditingDepozit({ ...editingDepozit, adresa: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Responsabil Depozit (din Mecanici / Personal):</label>
                {mecanici.length > 0 ? (
                  <select
                    value={editingDepozit.responsabil || ''}
                    onChange={(e) => setEditingDepozit({ ...editingDepozit, responsabil: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Fără Responsabil Desemnat --</option>
                    {mecanici.map((m) => (
                      <option key={m.id} value={m.nume}>
                        👨‍🔧 {m.nume} {m.functie ? `(${m.functie})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={editingDepozit.responsabil || ''}
                    onChange={(e) => setEditingDepozit({ ...editingDepozit, responsabil: e.target.value })}
                    placeholder="ex: Brașoveanu Virgil (Șef Atelier)"
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold"
                  />
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => handleDeleteDepozit(editingDepozit.id)}
                  className="px-3 py-1.5 rounded-lg bg-roseash-100 text-terracotta-600 hover:bg-terracotta-100 border border-roseash-300 text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Șterge Depozit</span>
                </button>

                <div className="flex space-x-2">
                  <button type="button" onClick={() => setEditingDepozit(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Modificările</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL GESTIONARE CATEGORII & SUBCATEGORII */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-sapphire-900">Gestiune Categorii & Subcategorii Stoc</h3>
                <p className="text-xs text-sage-600 font-medium">Configurați structura de categorii ➔ subcategorii a flotei</p>
              </div>
              <button onClick={() => setShowAddCatModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* LISTĂ CATEGORII EXISTENTE CU SUBCATEGORII */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold text-sapphire-900 uppercase tracking-wider">Categorii Existente ({categorii.length}):</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto p-2 bg-morning-100/50 rounded-xl border border-morning-200">
                {categorii.map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white border border-morning-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-sapphire-900">{c.nume}</span>
                      <button
                        onClick={() => {
                          setTargetCatForSubcat(c.nume);
                          setShowAddSubcatModal(true);
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded bg-sapphire-50 border border-sapphire-200 text-sapphire-700 hover:bg-sapphire-100 transition"
                      >
                        + Adaugă Subcategorie
                      </button>
                    </div>
                    {c.descriere && <p className="text-[11px] text-sage-600">{c.descriere}</p>}
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(c.subcategorii || []).length > 0 ? (
                        c.subcategorii.map((sub: any, sIdx: number) => (
                          <span key={sIdx} className="px-2 py-0.5 rounded-md bg-morning-200 text-sapphire-900 font-bold text-[10px]">
                            • {sub.nume}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-sage-400 italic">Fără subcategorii definite</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* FORMULAR ADĂUGARE CATEGORIE NOUĂ */}
            <form onSubmit={handleCreateCategorie} className="space-y-3 text-xs border-t border-morning-200 pt-3">
              <h4 className="text-xs font-extrabold text-sapphire-900 uppercase tracking-wider">+ Creează Categorie Nouă:</h4>
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Categorie:</label>
                <input required value={numeCategorieNoua} onChange={(e) => setNumeCategorieNoua(e.target.value)} placeholder="ex: Componente Hidraulice" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Categorie:</label>
                <input value={descriereCatNoua} onChange={(e) => setDescriereCatNoua(e.target.value)} placeholder="ex: Pompe, distribuitoare, furtunuri" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Stoc Minim Implicit per Categorie:</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={stocMinimImplicitCat}
                  onChange={(e) => setStocMinimImplicitCat(Number(e.target.value))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-extrabold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={() => setShowAddCatModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Închide</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Categorie</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL CREARE DEPOZIT NOU */}
      {showAddDepozitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Creare Depozit Nou</h3>
              <button onClick={() => setShowAddDepozitModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDepozit} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Depozit (ex: Depozit Șantier A3):</label>
                <input required value={numeDepozitNou} onChange={(e) => setNumeDepozitNou(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Adresă / Locație:</label>
                <input value={adresaDepozitNou} onChange={(e) => setAdresaDepozitNou(e.target.value)} placeholder="ex: Șantier Autostradă KM 45" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Responsabil Depozit (din Mecanici Înregistrați): *</label>
                {mecanici.length > 0 ? (
                  <select
                    required
                    value={responsabilDepozitNou}
                    onChange={(e) => setResponsabilDepozitNou(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Selectează Responsabil Depozit --</option>
                    {mecanici.map((m) => (
                      <option key={m.id} value={m.nume}>
                        👨‍🔧 {m.nume} {m.functie ? `(${m.functie})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={responsabilDepozitNou}
                    onChange={(e) => setResponsabilDepozitNou(e.target.value)}
                    placeholder="ex: Brașoveanu Virgil (Șef Atelier)"
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold"
                  />
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddDepozitModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Depozit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL ADĂUGARE ARTICOL SIMPLU */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Adăugare Articol Nou în Stoc</h3>
              <button onClick={() => setShowAddModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateArticol} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod Articol</label>
                  <input required value={codArticol} onChange={(e) => setCodArticol(e.target.value)} placeholder="ex: FLT-009" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Depozit</label>
                  <select value={depozitId} onChange={(e) => setDepozitId(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold">
                    {depozite.map((d) => (
                      <option key={d.id} value={d.id}>{d.nume}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Articol</label>
                <input required value={denumire} onChange={(e) => setDenumire(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie Principală</label>
                  <select
                    value={categorie}
                    onChange={(e) => {
                      setCategorie(e.target.value);
                      setSubcategorie('');
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold"
                  >
                    {categorii.map((c, idx) => (
                      <option key={idx} value={c.nume}>{c.nume}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sage-700 font-bold">Subcategorie</label>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetCatForSubcat(categorie);
                        setShowAddSubcatModal(true);
                      }}
                      className="text-[10px] font-bold text-sapphire-600 hover:underline"
                    >
                      + Subcategorie
                    </button>
                  </div>
                  <select
                    value={subcategorie}
                    onChange={(e) => setSubcategorie(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Fără Subcategorie --</option>
                    {getSubcategoriiPentruCategorie(categorie).map((sub: any, idx: number) => (
                      <option key={idx} value={sub.nume}>{sub.nume}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Inițial</label>
                  <input type="number" value={stocCurent} onChange={(e) => setStocCurent(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Minim</label>
                  <input type="number" value={stocMinim} onChange={(e) => setStocMinim(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar</label>
                  <input type="number" value={pretUnitar} onChange={(e) => setPretUnitar(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Articol</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL CREARE SUBCATEGORIE NOUĂ */}
      {showAddSubcatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-lg font-bold text-sapphire-900">Adăugare Subcategorie Nouă</h3>
              <button onClick={() => setShowAddSubcatModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubcategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Categorie Părinte:</label>
                <select
                  value={targetCatForSubcat}
                  onChange={(e) => setTargetCatForSubcat(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-bold"
                >
                  {categorii.map((c, idx) => (
                    <option key={idx} value={c.nume}>{c.nume}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Subcategorie (ex: anv. remorcă, injectoare):</label>
                <input
                  required
                  value={numeSubcatNoua}
                  onChange={(e) => setNumeSubcatNoua(e.target.value)}
                  placeholder="ex: anv. remorcă, injectoare..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddSubcatModal(false)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Subcategorie</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL EDITARE ARTICOL */}
      {editingArticol && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl border border-morning-200">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900">Editare Articol Stoc ({editingArticol.codArticol})</h3>
              <button onClick={() => setEditingArticol(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateArticol} className="space-y-3.5 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Articol: *</label>
                <input
                  required
                  value={editingArticol.denumire || ''}
                  onChange={(e) => setEditingArticol({ ...editingArticol, denumire: e.target.value })}
                  placeholder="ex: Filtru ulei, Anvelopă 385/65R22.5, etc."
                  className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold text-xs focus:ring-2 focus:ring-sapphire-500/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie Stoc: *</label>
                  <select
                    required
                    value={editingArticol.categorie || ''}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setEditingArticol({
                        ...editingArticol,
                        categorie: newCat,
                        subcategorie: '',
                      });
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Alege Categorie --</option>
                    {categorii.map((c, idx) => (
                      <option key={c.id || c.nume || idx} value={c.nume}>
                        {c.nume}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Subcategorie Stoc:</label>
                  <select
                    value={editingArticol.subcategorie || ''}
                    onChange={(e) => setEditingArticol({ ...editingArticol, subcategorie: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Fără Subcategorie --</option>
                    {getSubcategoriiPentruCategorie(editingArticol.categorie || '').map((sub: any, idx: number) => (
                      <option key={sub.id || sub.nume || idx} value={sub.nume}>
                        📁 {sub.nume}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Depozit Stoc: *</label>
                <select
                  required
                  value={editingArticol.depozitId || ''}
                  onChange={(e) => setEditingArticol({ ...editingArticol, depozitId: e.target.value })}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume} ({d.adresa || 'Atelier'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Curent</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingArticol.stocCurent}
                    onChange={(e) => setEditingArticol({ ...editingArticol, stocCurent: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Minim</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingArticol.stocMinim}
                    onChange={(e) => setEditingArticol({ ...editingArticol, stocMinim: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-extrabold text-terracotta-600"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar (RON)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingArticol.pretUnitar}
                    onChange={(e) => setEditingArticol({ ...editingArticol, pretUnitar: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => handleDeleteArticol(editingArticol.id)}
                  className="px-3 py-1.5 rounded-lg bg-roseash-100 text-terracotta-600 hover:bg-terracotta-100 border border-roseash-300 text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Șterge Articol</span>
                </button>

                <div className="flex space-x-2">
                  <button type="button" onClick={() => setEditingArticol(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Modificările</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITARE ANVELOPĂ SERIALIZATĂ DIN MAGAZIE */}
      {editingAnvelopaStoc && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl border border-morning-200">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <CircleDot className="w-5 h-5 text-sapphire-500" />
                <h3 className="text-base font-bold text-sapphire-900">
                  Editare Anvelopă Serializată ({editingAnvelopaStoc.serieAnvelopa})
                </h3>
              </div>
              <button onClick={() => setEditingAnvelopaStoc(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAnvelopaStoc} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Serie Unică (SN): *</label>
                  <input
                    required
                    value={editingAnvelopaStoc.serieAnvelopa || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, serieAnvelopa: e.target.value })}
                    className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-black text-xs focus:ring-2 focus:ring-sapphire-500/20"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod DOT / Fabricație:</label>
                  <input
                    value={editingAnvelopaStoc.codDot || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, codDot: e.target.value })}
                    placeholder="ex: 2625"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Marcă: *</label>
                  <input
                    required
                    value={editingAnvelopaStoc.marca || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, marca: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Model:</label>
                  <input
                    value={editingAnvelopaStoc.model || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, model: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Dimensiune: *</label>
                  <input
                    required
                    value={editingAnvelopaStoc.dimensiune || ''}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, dimensiune: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Adâncime Profil Curentă (mm):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingAnvelopaStoc.adancimeCurentaMm || 16}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, adancimeCurentaMm: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Achiziție (RON):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingAnvelopaStoc.pretAchizitie || 0}
                    onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, pretAchizitie: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Depozit / Locație Depozitare: *</label>
                <select
                  value={editingAnvelopaStoc.depozitId || ''}
                  onChange={(e) => setEditingAnvelopaStoc({ ...editingAnvelopaStoc, depozitId: e.target.value })}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume} ({d.adresa || 'Atelier'})</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => handleDeleteAnvelopaStoc(editingAnvelopaStoc.id, editingAnvelopaStoc.serieAnvelopa)}
                  className="px-3 py-1.5 rounded-lg bg-roseash-100 text-terracotta-600 hover:bg-terracotta-100 border border-roseash-300 text-xs font-bold flex items-center space-x-1"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Elimină din Magazie</span>
                </button>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditingAnvelopaStoc(null)}
                    className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20"
                  >
                    Salvează Modificările
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ÎNREGISTRARE LOT NOU ANVELOPE SERIALIZATE */}
      {showAddAnvelopeStocModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl border border-morning-200">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5 text-sapphire-500" />
                <h3 className="text-base font-bold text-sapphire-900">
                  Adăugare Anvelope Noi pe Serii în Magazie
                </h3>
              </div>
              <button onClick={() => setShowAddAnvelopeStocModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAnvelopeBatchSubmit} className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Marcă: *</label>
                  <input
                    required
                    value={newBatchAnv.marca}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, marca: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Model:</label>
                  <input
                    value={newBatchAnv.model}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, model: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Dimensiune: *</label>
                  <input
                    required
                    value={newBatchAnv.dimensiune}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, dimensiune: e.target.value })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cantitate (Buc): *</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={newBatchAnv.cantitate}
                    onChange={(e) => {
                      const count = Math.max(1, Number(e.target.value));
                      const newSerii = Array(count).fill('').map((_, i) => newBatchAnv.serii[i] || '');
                      setNewBatchAnv({ ...newBatchAnv, cantitate: count, serii: newSerii });
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-black"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod DOT:</label>
                  <input
                    value={newBatchAnv.codDot}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, codDot: e.target.value })}
                    placeholder="2625"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar (RON):</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newBatchAnv.pretAchizitie}
                    onChange={(e) => setNewBatchAnv({ ...newBatchAnv, pretAchizitie: Number(e.target.value) })}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Depozit Destinație: *</label>
                <select
                  value={newBatchAnv.depozitId || ''}
                  onChange={(e) => setNewBatchAnv({ ...newBatchAnv, depozitId: e.target.value })}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume} ({d.adresa || 'Atelier'})</option>
                  ))}
                </select>
              </div>

              {/* Serii Individuale per Bucată */}
              <div className="p-3 bg-morning-50 rounded-xl border border-morning-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sapphire-900 text-xs">
                    Serii Individuale per Bucată ({newBatchAnv.cantitate} buc):
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const prefix = (newBatchAnv.marca.slice(0, 3) || 'ANV').toUpperCase();
                      const genSerii = Array(newBatchAnv.cantitate).fill('').map((_, i) => `${prefix}-${Date.now().toString().slice(-4)}${i + 1}`);
                      setNewBatchAnv({ ...newBatchAnv, serii: genSerii });
                    }}
                    className="text-[10px] text-sapphire-600 hover:underline font-bold"
                  >
                    ⚡ Generează Serii Automate
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                  {Array.from({ length: newBatchAnv.cantitate }).map((_, idx) => (
                    <div key={idx} className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-sage-500 font-mono w-5">#{idx + 1}</span>
                      <input
                        value={newBatchAnv.serii[idx] || ''}
                        onChange={(e) => {
                          const sCopy = [...newBatchAnv.serii];
                          sCopy[idx] = e.target.value;
                          setNewBatchAnv({ ...newBatchAnv, serii: sCopy });
                        }}
                        placeholder={`Serie bucata ${idx + 1}`}
                        className="w-full bg-white border border-morning-200 rounded-lg p-1.5 font-mono font-bold text-sapphire-900 text-[11px]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowAddAnvelopeStocModal(false)}
                  className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  Înregistrează {newBatchAnv.cantitate} Anvelope
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODÁL DEMONTARE COMPONENTĂ */}
      {selectedComp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Demontare Componentă ({selectedComp.serieUnica})</h3>
              <button onClick={() => setSelectedComp(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDemonteaza} className="space-y-3 text-xs">
              <div className="p-3 bg-morning-100 rounded-xl border border-morning-200">
                <p className="font-bold text-sapphire-600">{selectedComp.articolStoc?.denumire}</p>
                <p className="text-sage-700 font-medium">Furnizor: {selectedComp.furnizor} (Factură: {selectedComp.numarFactura})</p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Motiv Demontare / Defecțiune Constatată:</label>
                <textarea
                  required
                  rows={3}
                  value={motivDemontare}
                  onChange={(e) => setMotivDemontare(e.target.value)}
                  placeholder="ex: Pierderi de presiune, joc excesiv în bucșă/ax"
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setSelectedComp(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-terracotta-500 hover:bg-terracotta-600 text-white font-bold shadow-md shadow-terracotta-500/20">Demontează & Verifică Garanție</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StocuriGarantiiPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Se încarcă modulul Stocuri & Garanții...</div>}>
      <StocuriGarantiiContent />
    </Suspense>
  );
}
