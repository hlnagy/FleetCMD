"use client";

import { useState, useEffect } from 'react';
import {
  PackageCheck, ShieldAlert, FileText, Wrench, AlertTriangle, CheckCircle, Plus,
  Filter, Edit3, X, ShoppingCart, History, Trash2, Search, Building2, Layers, AlertCircle, ArrowRight, ShieldCheck, ArrowLeftRight
} from 'lucide-react';

export default function StocuriGarantiiPage() {
  const [stocuri, setStocuri] = useState<any[]>([]);
  const [componente, setComponente] = useState<any[]>([]);
  const [intrariHistory, setIntrariHistory] = useState<any[]>([]);
  const [categorii, setCategorii] = useState<any[]>([]);
  const [depozite, setDepozite] = useState<any[]>([]);
  const [stocuriCritice, setStocuriCritice] = useState<any[]>([]);
  const [transferuriHistory, setTransferuriHistory] = useState<any[]>([]);

  // Filtre Multi-Criteriu
  const [selectedCategorieFilter, setSelectedCategorieFilter] = useState('');
  const [selectedSubcategorieFilter, setSelectedSubcategorieFilter] = useState('');
  const [selectedDepozitFilter, setSelectedDepozitFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('TOATE'); // TOATE, CRITIC, IN_STOC
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'stoc' | 'bevetelez' | 'istoric' | 'depozite' | 'componente'>('stoc');

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
  const [transferOperator, setTransferOperator] = useState('Mihai Popa (Șef Atelier)');
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
    if (!confirm('Sigur doriți să ștergeți acest depozit?')) return;
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
      const res = await fetch(`http://localhost:3001/stocuri-garantii/stocuri/${editingArticol.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingArticol),
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
    if (!confirm('Sigur doriți să ștergeți acest articol din stoc?')) return;
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

  return (
    <div className="space-y-6">
      {/* Antet Titlu & Acțiuni - 100% PURE ROMANIAN */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <PackageCheck className="w-6 h-6 text-sapphire-500" />
            <span>Gestiune Stocuri, Depozite & Transferuri</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Gestiune depozite, transfer parțial de produse între depozite, recepție facturi și garanții</p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={() => setActiveTab('bevetelez')}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Recepție Marfă pe Factură</span>
          </button>
        </div>
      </div>

      {/* BANNER AVERTISMENT STOC CRITIC */}
      {stocuriCritice.length > 0 && (
        <div className="p-4 rounded-2xl bg-roseash-100 border-2 border-roseash-300 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-terracotta-600 font-extrabold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-5 h-5 text-terracotta-500 animate-bounce" />
              <span>⚠️ Avertisment Stoc Critic ({stocuriCritice.length} articole sub limita minimă!):</span>
            </div>
            <span className="text-[10px] bg-terracotta-500 text-white font-bold px-2 py-0.5 rounded-full uppercase">Reaprovizionare Urgentă</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {stocuriCritice.map((c) => (
              <div key={c.id} className="p-2.5 rounded-xl bg-white/80 border border-roseash-300 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-sapphire-900">{c.denumire}</span>
                  <span className="font-mono text-sage-600 ml-1">({c.codArticol})</span>
                  <p className="text-[10px] text-sage-700 font-medium">Depozit: <span className="font-bold">{c.depozit}</span></p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-terracotta-600 font-extrabold text-sm">{c.stocCurent} {c.unitateMasura}</span>
                  <p className="text-[10px] text-sage-500">Minim: {c.stocMinim} {c.unitateMasura}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigație File (Tabs) */}
      <div className="pleasant-card p-2 rounded-2xl flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('stoc')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'stoc' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          1. Gestiune Stoc Curent ({stocuri.length})
        </button>

        <button
          onClick={() => setActiveTab('bevetelez')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'bevetelez' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          2. Recepție Marfă pe Factură (Piese & Uleiuri)
        </button>

        <button
          onClick={() => setActiveTab('istoric')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'istoric' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          3. Căutare Facturi ({intrariHistory.length})
        </button>

        <button
          onClick={() => setActiveTab('depozite')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'depozite' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          4. Depozite Flotă ({depozite.length})
        </button>

        <button
          onClick={() => setActiveTab('componente')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition ${
            activeTab === 'componente' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-100'
          }`}
        >
          5. Garanții Componente ({componente.length})
        </button>
      </div>

      {/* TAB 1: GESTIUNE STOC CURENT, TRANSFER PARȚIAL & FILTRE MULTI-CRITERIU */}
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
                {stocuri.map((s) => {
                  const esteCritic = s.stocCurent <= s.stocMinim;
                  return (
                    <tr key={s.id} className={`hover:bg-morning-50 transition ${esteCritic ? 'bg-roseash-50' : ''}`}>
                      <td className="p-3 font-mono text-sapphire-600 font-bold flex items-center space-x-1">
                        {esteCritic && <AlertCircle className="w-3.5 h-3.5 text-terracotta-500" />}
                        <span>{s.codArticol}</span>
                      </td>
                      <td className="p-3 font-bold text-sapphire-900">
                        {s.denumire}
                        {s.marcaUlei && <span className="text-[10px] text-sage-600 font-medium block">Marcă: {s.marcaUlei}</span>}
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
                        {s.pretUnitar} RON / {s.unitateMasura}
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
                          onClick={() => setEditingArticol(s)}
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

      {/* TAB 2: RECEPȚIE MARFĂ PE FACTURĂ */}
      {activeTab === 'bevetelez' && (
        <div className="pleasant-card p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-sapphire-500" />
            <span>2. Recepție Marfă pe Factură Nouă (Piese, Consumabile & Uleiuri)</span>
          </h2>
          <p className="text-xs text-sage-700 font-medium">Introduceți Prețul Total al Facturii și Cantitatea, iar sistemul va calcula automat Prețul Unitar (RON/unitate)!</p>

          <form onSubmit={handleBevetelez} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Depozit Destinație:</label>
                <select
                  value={bevDepozitId}
                  onChange={(e) => setBevDepozitId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Cod Articol / Cod Piesă:</label>
                <input
                  required
                  value={bevCodArticol}
                  onChange={(e) => setBevCodArticol(e.target.value)}
                  placeholder="ex: OIL-HID-46 sau FLT-VOL-001"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Articol / Ulei:</label>
                <input
                  required
                  value={bevDenumire}
                  onChange={(e) => setBevDenumire(e.target.value)}
                  placeholder="ex: Ulei Hidraulic Mobil DTE 25 HLP 46"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Categorie Stoc:</label>
                <select
                  value={bevCategorie}
                  onChange={(e) => {
                    setBevCategorie(e.target.value);
                    setBevSubcategorie('');
                  }}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {categorii.map((c, idx) => (
                    <option key={idx} value={c.nume}>{c.nume}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Subcategorie Stoc:</label>
                <select
                  value={bevSubcategorie}
                  onChange={(e) => setBevSubcategorie(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="">-- Fără Subcategorie --</option>
                  {getSubcategoriiPentruCategorie(bevCategorie).map((sub: any, idx: number) => (
                    <option key={idx} value={sub.nume}>{sub.nume}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Suport Special Achiziție Uleiuri */}
            <div className="p-4 bg-morning-100 border border-morning-200 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sapphire-900 block mb-1 font-bold">Dacă este Achiziție Ulei, alegeți Tipul:</label>
                <select
                  value={bevTipLichid}
                  onChange={(e) => setBevTipLichid(e.target.value)}
                  className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-semibold"
                >
                  <option value="NICIUNUL">Nu este ulei (Piesă / Filtru / Consumabil)</option>
                  <option value="ULEI_MOTOR">Ulei motor</option>
                  <option value="ULEI_HIDRAULIC">Ulei hidraulic</option>
                  <option value="ULEI_LIEBHERR_PUNTE">Ulei - Liebherr Punte faţă + spate</option>
                  <option value="ULEI_LIEBHERR_CUTIE">Ulei - Liebherr Cutie Viteze</option>
                  <option value="ULEI_CUTIE_MANUALA">Ulei cutie manuală</option>
                  <option value="ULEI_CUTIE_AUTOMATA">Ulei cutie automată</option>
                </select>
              </div>

              <div>
                <label className="text-sapphire-900 block mb-1 font-bold">Marcă Ulei (Mobil, Castrol, Liebherr):</label>
                <input
                  value={bevMarcaUlei}
                  onChange={(e) => setBevMarcaUlei(e.target.value)}
                  placeholder="ex: Mobil1 Delvac / Castrol / Fuchs"
                  className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Furnizor (Companie / Producător):</label>
                <input
                  required
                  value={bevFurnizor}
                  onChange={(e) => setBevFurnizor(e.target.value)}
                  placeholder="ex: AUTONET SRL / LUBRICANTS ROMANIA"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Număr Factură și Dată:</label>
                <div className="flex space-x-2">
                  <input
                    required
                    value={bevNumarFactura}
                    onChange={(e) => setBevNumarFactura(e.target.value)}
                    placeholder="Factură: FACT-2026-99"
                    className="w-1/2 bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                  <input
                    type="date"
                    required
                    value={bevDataFactura}
                    onChange={(e) => setBevDataFactura(e.target.value)}
                    className="w-1/2 bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">UM (Unitate Măsură):</label>
                <select
                  value={bevUM}
                  onChange={(e) => setBevUM(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="buc">buc (Bucăți)</option>
                  <option value="L">L (Litri)</option>
                  <option value="kg">kg (Kilograme)</option>
                  <option value="set">set (Seturi)</option>
                </select>
              </div>
            </div>

            {/* PREȚ TOTAL FACTURĂ & CALCUL AUTOMAT PREȚ UNITAR */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-periwinkle-100 border border-periwinkle-300 rounded-2xl">
              <div>
                <label className="text-periwinkle-700 block mb-1 font-extrabold">1. Preț Total Factură (RON):</label>
                <input
                  type="number"
                  required
                  value={bevPretTotal}
                  onChange={(e) => setBevPretTotal(Number(e.target.value))}
                  placeholder="ex: 1500 RON"
                  className="w-full bg-white border border-periwinkle-300 rounded-xl p-2.5 text-sapphire-900 font-mono font-extrabold text-sm"
                />
              </div>

              <div>
                <label className="text-periwinkle-700 block mb-1 font-extrabold">2. Cantitate Recepționată:</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={bevCantitate}
                  onChange={(e) => setBevCantitate(Number(e.target.value))}
                  className="w-full bg-white border border-periwinkle-300 rounded-xl p-2.5 text-sapphire-900 font-mono font-extrabold text-sm"
                />
              </div>

              <div>
                <label className="text-periwinkle-700 block mb-1 font-extrabold">3. Calcul Automat Preț Unitar:</label>
                <input
                  disabled
                  value={`${pretUnitarKiszamolva} RON / ${bevUM}`}
                  className="w-full bg-white border border-periwinkle-300 rounded-xl p-2.5 text-sapphire-600 font-mono font-extrabold text-sm opacity-95"
                />
              </div>
            </div>

            {/* ÎNREGISTRARE GARANȚIE PRODUCĂTOR */}
            <div className="p-4 bg-morning-100 border border-morning-200 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="areGarantie"
                  checked={bevAreGarantie}
                  onChange={(e) => setBevAreGarantie(e.target.checked)}
                  className="w-4 h-4 rounded text-sapphire-500 cursor-pointer"
                />
                <label htmlFor="areGarantie" className="text-sapphire-900 font-extrabold text-xs cursor-pointer flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-sapphire-500" />
                  <span>Piesa / Componenta Are Garanție de la Producător? (Va fi salvată în "Garanții Componente")</span>
                </label>
              </div>

              {bevAreGarantie && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Serie Unică / SN (Serial Number):</label>
                    <input
                      value={bevSerieUnica}
                      onChange={(e) => setBevSerieUnica(e.target.value)}
                      placeholder="ex: SN-GARRETT-998822"
                      className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Durată Garanție (Luni):</label>
                    <input
                      type="number"
                      value={bevDurataGarantieLuni}
                      onChange={(e) => setBevDurataGarantieLuni(Number(e.target.value))}
                      placeholder="ex: 24 Luni"
                      className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Durată Garanție Rulaj (KM / mTH):</label>
                    <input
                      type="number"
                      value={bevDurataGarantieRulaj}
                      onChange={(e) => setBevDurataGarantieRulaj(Number(e.target.value))}
                      placeholder="ex: 2000 mTH sau 50000 KM"
                      className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="text-sage-700 block mb-1 font-bold">Observații & Notițe Recepție:</label>
              <input
                value={bevObservatii}
                onChange={(e) => setBevObservatii(e.target.value)}
                placeholder="ex: Recepție 200L hordó ulei hidraulic sau turbină în garanție"
                className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20"
              >
                Salvează Recepție Marfă pe Factură
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: CĂUTARE RETROACTIVĂ FACTURI */}
      {activeTab === 'istoric' && (
        <div className="pleasant-card rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
              <History className="w-5 h-5 text-sapphire-500" />
              <span>Istoric Recepții Marfă & Căutare Retroactivă Facturi</span>
            </h2>

            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Căutare după furnizor, număr factură..."
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 font-bold"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
                <tr>
                  <th className="p-3">Data Recepției</th>
                  <th className="p-3">Furnizor</th>
                  <th className="p-3">Număr Factură</th>
                  <th className="p-3">Articol Achiziționat</th>
                  <th className="p-3 font-mono">Cantitate</th>
                  <th className="p-3 font-mono">Preț Unitar</th>
                  <th className="p-3 font-mono text-right">Valoare Totală</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200">
                {intrariHistory.map((i) => (
                  <tr key={i.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-semibold text-sage-700">{new Date(i.dataFactura).toLocaleDateString('ro-RO')}</td>
                    <td className="p-3 font-bold text-sapphire-900">{i.furnizor}</td>
                    <td className="p-3 font-mono font-bold text-sapphire-600">{i.numarFactura}</td>
                    <td className="p-3 font-medium text-slate-800">{i.articolStoc?.denumire}</td>
                    <td className="p-3 font-mono font-bold text-sage-700">{i.cantitateIntrata} {i.articolStoc?.unitateMasura}</td>
                    <td className="p-3 font-mono text-slate-700">{i.pretUnitar} RON</td>
                    <td className="p-3 text-right font-extrabold text-sapphire-900 font-mono text-sm">{i.pretTotal.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} RON</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DEPOZITE FLOTĂ */}
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
                  <span className="px-2.5 py-1 rounded-full bg-sapphire-50 text-sapphire-600 font-extrabold text-[10px]">
                    {d._count?.articoleStoc || 0} articole în stoc
                  </span>

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
                      {c.furnizor}
                      <div className="text-[10px] text-sage-700 font-mono">Factură: {c.numarFactura}</div>
                    </td>
                    <td className="p-3 font-bold text-sage-700">
                      {c.vehicul?.numarIntern ? `${c.vehicul.numarIntern} (${c.vehicul.numarInmatriculare})` : 'În Stoc Depozit'}
                    </td>
                    <td className="p-3 font-mono font-semibold text-slate-800">
                      {c.garantieProducatorLuni || 24} Luni / {c.garantieProducatorKm || 2000} mTH/KM
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
                <label className="text-sage-700 block mb-1 font-bold">Responsabil Depozit:</label>
                <input value={editingDepozit.responsabil || ''} onChange={(e) => setEditingDepozit({ ...editingDepozit, responsabil: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold" />
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
                <label className="text-sage-700 block mb-1 font-bold">Responsabil Depozit:</label>
                <input value={responsabilDepozitNou} onChange={(e) => setResponsabilDepozitNou(e.target.value)} placeholder="ex: Mihai Popa (Șef Atelier)" className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold" />
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
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Editare Articol Stoc ({editingArticol.codArticol})</h3>
              <button onClick={() => setEditingArticol(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateArticol} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Articol</label>
                <input required value={editingArticol.denumire} onChange={(e) => setEditingArticol({ ...editingArticol, denumire: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Depozit Destinație</label>
                <select value={editingArticol.depozitId || ''} onChange={(e) => setEditingArticol({ ...editingArticol, depozitId: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-semibold">
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Curent</label>
                  <input type="number" value={editingArticol.stocCurent} onChange={(e) => setEditingArticol({ ...editingArticol, stocCurent: Number(e.target.value) })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Stoc Minim</label>
                  <input type="number" value={editingArticol.stocMinim} onChange={(e) => setEditingArticol({ ...editingArticol, stocMinim: Number(e.target.value) })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-extrabold text-terracotta-600" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar</label>
                  <input type="number" value={editingArticol.pretUnitar} onChange={(e) => setEditingArticol({ ...editingArticol, pretUnitar: Number(e.target.value) })} className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2 text-sapphire-900 font-mono font-bold" />
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
