"use client";

import { useState, useEffect } from 'react';
import {
  Wrench, Plus, CheckCircle2, DollarSign, Filter, Search, FileText, X, Trash2,
  ShieldAlert, UserPlus, Users, Check, Clock, PackageCheck, Printer, Eye, Edit3,
  Unlock, RotateCcw, Calendar, Truck
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';

export default function ComenziLucruPage() {
  const [comenzi, setComenzi] = useState<any[]>([]);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [stocuri, setStocuri] = useState<any[]>([]);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);

  // Filtre
  const [searchQuery, setSearchQuery] = useState('');
  const [stareFilter, setStareFilter] = useState('TOATE');
  const [vehiculFilter, setVehiculFilter] = useState('TOATE');
  const [mecanicFilter, setMecanicFilter] = useState('TOATE');
  const [dateStartFilter, setDateStartFilter] = useState('');
  const [dateEndFilter, setDateEndFilter] = useState('');

  // Modale
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddMecanicModal, setShowAddMecanicModal] = useState(false);
  const [showAddElementModal, setShowAddElementModal] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState<any>(null);

  // Form State Comandă Lucru Nouă
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [valoareContorExecutie, setValoareContorExecutie] = useState<number>(0);
  const [selectedMecanici, setSelectedMecanici] = useState<string[]>([]);
  const [observatii, setObservatii] = useState('');
  const [autoFinalize, setAutoFinalize] = useState(false);

  // Single initial element state (Opțional)
  const [hasInitialPart, setHasInitialPart] = useState(true);
  const [pilonCost, setPilonCost] = useState('PIESA_STOC');
  const [descrierePiesa, setDescrierePiesa] = useState('');
  const [selectedArticolStocId, setSelectedArticolStocId] = useState('');
  const [cantitate, setCantitate] = useState(1);
  const [pretUnitar, setPretUnitar] = useState<number>(0);
  const [provenienta, setProvenienta] = useState('Stoc Intern');

  // Form State Adăugare Element Suplimentar pe Comandă Deschisă
  const [elemPilonCost, setElemPilonCost] = useState('PIESA_STOC');
  const [elemDescriere, setElemDescriere] = useState('');
  const [elemArticolStocId, setElemArticolStocId] = useState('');
  const [elemCantitate, setElemCantitate] = useState(1);
  const [elemPretUnitar, setElemPretUnitar] = useState<number>(0);

  // Form State Creare Mecanic Nou
  const [numeMecanicNou, setNumeMecanicNou] = useState('');
  const [functieMecanicNou, setFunctieMecanicNou] = useState('Mecanic Atelier');
  const [telefonMecanicNou, setTelefonMecanicNou] = useState('');

  // Form State Editare Comandă Lucru (SZERKESZTÉS)
  const [editMecanici, setEditMecanici] = useState<string[]>([]);
  const [editObservatii, setEditObservatii] = useState('');
  const [editElemente, setEditElemente] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      // Fetch Vehicule & Comenzi
      const resVeh = await fetch('http://localhost:3001/vehicule');
      if (resVeh.ok) {
        const data = await resVeh.json();
        setVehicule(data);
        if (data.length > 0 && !selectedVehiculId) {
          setSelectedVehiculId(data[0].id);
          setValoareContorExecutie(data[0].valoareContorCurent || 0);
        }

        const allCL = data.flatMap((v: any) =>
          (v.comenziLucru || []).map((cl: any) => ({
            ...cl,
            vehiculNumarIntern: v.numarIntern,
            vehiculInmatriculare: v.numarInmatriculare,
            vehiculMarca: v.marca,
            vehiculModel: v.model,
            vehiculSerieSasiu: v.serieSasiu || v.vin || 'N/A',
            vehiculValoareContor: v.valoareContorCurent || 0,
            vehiculTipMasurare: v.tipMasurare || 'KM',
          }))
        );

        setComenzi(
          allCL.sort((a: any, b: any) => {
            if (a.stare === 'IN_LUCRU' && b.stare !== 'IN_LUCRU') return -1;
            if (a.stare !== 'IN_LUCRU' && b.stare === 'IN_LUCRU') return 1;
            return new Date(b.dataDeschidere).getTime() - new Date(a.dataDeschidere).getTime();
          })
        );
      }

      // Fetch Stocuri
      const resStoc = await fetch('http://localhost:3001/stocuri-garantii/stocuri');
      if (resStoc.ok) {
        const stData = await resStoc.json();
        setStocuri(stData);
        if (stData.length > 0 && !selectedArticolStocId) {
          setSelectedArticolStocId(stData[0].id);
          setPretUnitar(stData[0].pretUnitar || 0);
          setDescrierePiesa(stData[0].denumire || '');
        }
      }

      // Fetch Mecanici
      const resMec = await fetch('http://localhost:3001/mentenanta/mecanici');
      if (resMec.ok) {
        const mecData = await resMec.json();
        setMecaniciList(mecData);
        if (mecData.length > 0 && selectedMecanici.length === 0) {
          setSelectedMecanici([mecData[0].nume]);
        }
      }
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSelectArticolStoc = (articolId: string) => {
    setSelectedArticolStocId(articolId);
    const item = stocuri.find((s) => s.id === articolId);
    if (item) {
      setPretUnitar(item.pretUnitar || 0);
      setDescrierePiesa(item.denumire);
    }
  };

  const handleSelectElemArticolStoc = (articolId: string) => {
    setElemArticolStocId(articolId);
    const item = stocuri.find((s) => s.id === articolId);
    if (item) {
      setElemPretUnitar(item.pretUnitar || 0);
      setElemDescriere(item.denumire);
    }
  };

  const toggleMecanicSelection = (nume: string) => {
    if (selectedMecanici.includes(nume)) {
      if (selectedMecanici.length > 1) {
        setSelectedMecanici(selectedMecanici.filter((m) => m !== nume));
      }
    } else {
      setSelectedMecanici([...selectedMecanici, nume]);
    }
  };

  const toggleEditMecanicSelection = (nume: string) => {
    if (editMecanici.includes(nume)) {
      if (editMecanici.length > 1) {
        setEditMecanici(editMecanici.filter((m) => m !== nume));
      }
    } else {
      setEditMecanici([...editMecanici, nume]);
    }
  };

  const handleCreateMecanic = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/mentenanta/mecanici', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeMecanicNou,
          functie: functieMecanicNou,
          telefon: telefonMecanicNou,
        }),
      });

      if (res.ok) {
        const nou = await res.json();
        setShowAddMecanicModal(false);
        setNumeMecanicNou('');
        setSelectedMecanici((prev) => [...prev, nou.nume]);
        fetchData();
        alert(`Mecanic nou "${nou.nume}" adăugat cu succes în registru!`);
      }
    } catch (e) {
      alert('Eroare la adăugarea mecanicui.');
    }
  };

  const handleCreateComanda = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehiculId) return;

    const selV = vehicule.find((v) => v.id === selectedVehiculId);
    const isTrailer = selV?.categorieEnum === 'REMORCA' || selV?.categorieEnum === 'SEMIREMORCA' || selV?.categorieEnum?.includes('REMORCA');

    if (isTrailer && (!valoareContorExecutie || Number(valoareContorExecutie) <= 0)) {
      alert('⛔ Index KM Obligatoriu pentru Semiremorci!\n\nSemiremorcile nu au contor propriu. Vă rugăm să introduceți indexul kilometrajului al capului tractor care tractează semiremorca!');
      return;
    }

    if (selV && !isTrailer && Number(valoareContorExecutie) > 0 && Number(valoareContorExecutie) < selV.valoareContorCurent) {
      const confirmed = await showConfirm(
        'Atenție Index Contor',
        `Valoarea introdusă (${valoareContorExecutie} ${selV.tipMasurare}) este MAI MICĂ decât ultimul contor înregistrat pe vehicul (${selV.valoareContorCurent} ${selV.tipMasurare}).\n\nSunteți sigur că este o corecție manuală / schimbare de bord?`,
        'Da, confirmă valoarea',
        'Anulează'
      );
      if (!confirmed) {
        return;
      }
    }

    const mecanicFinal = selectedMecanici.join(', ');
    const elemente: any[] = [];

    if (hasInitialPart) {
      if (pilonCost === 'PIESA_STOC' && selectedArticolStocId) {
        const itemStoc = stocuri.find((s) => s.id === selectedArticolStocId);
        if (itemStoc && Number(cantitate) > itemStoc.stocCurent) {
          alert(`⛔ Stoc Insuficient!\n\nNu puteți folosi ${cantitate} bucăți din articolul "${itemStoc.denumire}".\nStocul maxim disponibil în magazie este: ${itemStoc.stocCurent} ${itemStoc.unitateMasura || 'buc'}.`);
          return;
        }
      }

      elemente.push({
        pilonCost,
        descriere: descrierePiesa || (pilonCost === 'PIESA_DEZMEMBRATA' ? 'Piesă din dezmembrări / Parc Propriu' : 'Schimb piesă'),
        cantitate: Number(cantitate),
        pretUnitar: Number(pretUnitar),
        provenienta: pilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : provenienta,
        articolStocId: pilonCost === 'PIESA_STOC' ? selectedArticolStocId : null,
      });
    }

    try {
      const res = await fetch('http://localhost:3001/mentenanta/comanda-lucru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: selectedVehiculId,
          mecanicResponsabil: mecanicFinal,
          valoareContorLaExecutie: Number(valoareContorExecutie),
          observatii,
          elemente,
        }),
      });

      if (res.ok) {
        const com = await res.json();

        if (autoFinalize) {
          await fetch(`http://localhost:3001/mentenanta/comanda-lucru/${com.id}/finalizeaza`, { method: 'PATCH' });
          alert(`Comandă de lucru ${com.numarComanda} creată și FINALIZATĂ direct!`);
        } else {
          alert(`Comandă de lucru ${com.numarComanda} deschisă în atelier pe starea ÎN LUCRU (Dată deschidere: ${new Date().toLocaleDateString('ro-RO')})! Puteți adăuga piese suplimentare mai jos.`);
        }

        setShowAddModal(false);
        fetchData();
      }
    } catch (e) {
      alert('Eroare la crearea comandei de lucru.');
    }
  };

  const handleAddElementToOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddElementModal) return;

    if (elemPilonCost === 'PIESA_STOC' && elemArticolStocId) {
      const itemStoc = stocuri.find((s) => s.id === elemArticolStocId);
      if (itemStoc && Number(elemCantitate) > itemStoc.stocCurent) {
        alert(`⛔ Stoc Insuficient!\n\nNu puteți adăuga ${elemCantitate} bucăți din articolul "${itemStoc.denumire}".\nStocul maxim disponibil în magazie este: ${itemStoc.stocCurent} ${itemStoc.unitateMasura || 'buc'}.`);
        return;
      }
    }

    try {
      const res = await fetch(`http://localhost:3001/mentenanta/comanda-lucru/${showAddElementModal.id}/adauga-element`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilonCost: elemPilonCost,
          descriere: elemDescriere || 'Piesă / Serviciu adăugat în atelier',
          cantitate: Number(elemCantitate),
          pretUnitar: Number(elemPretUnitar),
          provenienta: elemPilonCost === 'PIESA_DEZMEMBRATA' ? 'Dezmembrări Parcul Propriu' : 'Stoc Intern',
          articolStocId: elemPilonCost === 'PIESA_STOC' ? elemArticolStocId : null,
        }),
      });

      if (res.ok) {
        setShowAddElementModal(null);
        fetchData();
        alert('Element / piesă adăugată pe comanda de lucru!');
      }
    } catch (e) {
      alert('Eroare la adăugarea piesei pe comandă.');
    }
  };

  const handleFinalizeazaComanda = async (id: string, numarComanda: string) => {
    const confirmed = await showConfirm(
      'Finalizare Comandă de Lucru',
      `Doriți să finalizați Comanda de Lucru ${numarComanda}? Aceasta va scădea stocul pieselor și va înregistra data finalizării!`,
      'Da, finalizează comanda',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:3001/mentenanta/comanda-lucru/${id}/finalizeaza`, { method: 'PATCH' });
      if (res.ok) {
        fetchData();
        alert(`Comanda ${numarComanda} a fost FINALIZATĂ! Data finalizării a fost înregistrată, iar stocul a fost actualizat.`);
      } else {
        const err = await res.json();
        alert(`Eroare finalizare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la finalizarea comandei.');
    }
  };

  const handleAnuleazaComanda = async (id: string) => {
    const confirmed = await showConfirm(
      'Anulare Comandă de Lucru',
      'Anularea acestei comenzi de lucru va RESTAURA automat stocul pieselor în magazie. Continuați?',
      'Da, anulează comanda',
      'Înapoi'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`http://localhost:3001/mentenanta/comanda-lucru/${id}/anuleaza`, { method: 'PATCH' });
      if (res.ok) {
        fetchData();
        alert('Comandă anulată. Stocul a fost restaurat cu succes în gestiunea internă!');
      }
    } catch (e) {
      alert('Eroare la anularea comandei.');
    }
  };

  // 🔓 DEVALIDARE COMANDĂ DE LUCRU (Re-opens work order, restores stock & reveals EDIT / ANULARE buttons)
  const handleDevalideazaComanda = async (id: string, numarComanda: string) => {
    const confirmed = await showConfirm(
      'Devalidare Comandă de Lucru',
      `Doriți să DEVALIDAȚI Comanda de Lucru ${numarComanda}?\n\nAcțiunea va debloca comanda, va stabili starea DEVALIDAT și va permite editarea sau anularea acesteia!`,
      'Da, devalidează',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`http://localhost:3001/mentenanta/comanda-lucru/${id}/devalideaza`, { method: 'PATCH' });
      if (res.ok) {
        fetchData();
        alert(`Comanda ${numarComanda} a fost DEVALIDATĂ cu succes!\n\nAcum sunt disponibile opțiunile "Editare" și "Anulare".`);
      } else {
        alert('Eroare la devalidarea comandei.');
      }
    } catch (e) {
      alert('Eroare la devalidarea comandei.');
    }
  };

  // Open Edit Modal
  const openEditModal = (cl: any) => {
    setShowEditModal(cl);
    const mecArr = cl.mecanicResponsabil ? cl.mecanicResponsabil.split(',').map((s: string) => s.trim()) : [];
    setEditMecanici(mecArr);
    setEditObservatii(cl.observatii || '');
    setEditElemente((cl.elementeComanda || []).map((el: any) => ({ ...el })));
  };

  // Save Edit Work Order
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEditModal) return;

    try {
      const res = await fetch(`http://localhost:3001/mentenanta/comanda-lucru/${showEditModal.id}/update`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mecanicResponsabil: editMecanici.join(', '),
          observatii: editObservatii,
          elementeComanda: editElemente.map((el) => ({
            pilonCost: el.pilonCost || 'PIESA_STOC',
            descriere: el.descriere || 'Piesă / Serviciu',
            cantitate: Number(el.cantitate || 1),
            pretUnitar: Number(el.pretUnitar || 0),
            articolStocId: el.articolStocId || null,
          })),
        }),
      });

      if (res.ok) {
        setShowEditModal(null);
        fetchData();
        alert('Modificările pe comanda de lucru au fost salvate cu succes!');
      } else {
        alert('Eroare la salvarea modificărilor.');
      }
    } catch (e) {
      alert('Eroare la salvarea modificărilor.');
    }
  };

  // Add Element in Edit Modal
  const handleAddEditElement = () => {
    setEditElemente([
      ...editElemente,
      {
        pilonCost: 'PIESA_STOC',
        descriere: 'Piesă nouă adăugată',
        cantitate: 1,
        pretUnitar: 0,
        articolStocId: stocuri.length > 0 ? stocuri[0].id : null,
      },
    ]);
  };

  // Remove Element in Edit Modal
  const handleRemoveEditElement = (index: number) => {
    setEditElemente(editElemente.filter((_, i) => i !== index));
  };

  // Print A4 Document
  const handlePrintDocument = () => {
    window.print();
  };

  // Filtering Logic
  const filteredComenzi = comenzi.filter((cl) => {
    // Search Query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNum = cl.numarComanda?.toLowerCase().includes(q);
      const matchVeh = cl.vehiculNumarIntern?.toLowerCase().includes(q) || cl.vehiculInmatriculare?.toLowerCase().includes(q);
      const matchMec = cl.mecanicResponsabil?.toLowerCase().includes(q);
      const matchObs = cl.observatii?.toLowerCase().includes(q);
      const matchElem = cl.elementeComanda?.some((el: any) => el.descriere?.toLowerCase().includes(q));
      if (!matchNum && !matchVeh && !matchMec && !matchObs && !matchElem) return false;
    }

    // Stare Filter
    if (stareFilter !== 'TOATE') {
      if (cl.stare !== stareFilter) return false;
    }

    // Vehicul Filter
    if (vehiculFilter !== 'TOATE') {
      if (cl.vehiculId !== vehiculFilter) return false;
    }

    // Mecanic Filter
    if (mecanicFilter !== 'TOATE') {
      if (!cl.mecanicResponsabil?.includes(mecanicFilter)) return false;
    }

    // Date Range Filter
    if (dateStartFilter) {
      const clDate = new Date(cl.dataDeschidere).getTime();
      const sDate = new Date(dateStartFilter).getTime();
      if (clDate < sDate) return false;
    }

    if (dateEndFilter) {
      const clDate = new Date(cl.dataDeschidere).getTime();
      const eDate = new Date(dateEndFilter).getTime() + 86400000; // end of day
      if (clDate > eDate) return false;
    }

    return true;
  });

  const comenziInLucruCount = comenzi.filter((c) => c.stare === 'IN_LUCRU' || c.stare === 'DEVALIDAT').length;
  const comenziFinalizateCount = comenzi.filter((c) => c.stare === 'FINALIZAT').length;

  return (
    <div className="space-y-6">
      {/* ─── PRINT ONLY STYLES ─── */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-a4-area, #printable-a4-area * {
            visibility: visible;
          }
          #printable-a4-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20px !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <Wrench className="w-6 h-6 text-sapphire-500" />
            <span>Registru Comenzi de Lucru (Atelier)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">
            Ciclu complet: ÎN LUCRU $\rightarrow$ FINALIZAT $\rightarrow$ DEVALIDARE (Editare & Anulare) $\rightarrow$ Vizualizare / Print A4 PDF
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Deschide Comandă de Lucru Nouă</span>
        </button>
      </div>

      {/* KPI STATUS COMENZI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-periwinkle-100 border border-periwinkle-300 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-periwinkle-700 tracking-wider">Comenzi Deschise / Devalidate</p>
            <p className="text-2xl font-extrabold text-periwinkle-700 font-mono mt-0.5">{comenziInLucruCount}</p>
            <p className="text-[10px] text-sage-600 font-medium">În Desfășurare sau Devalidate pentru Ediție</p>
          </div>
          <Wrench className="w-8 h-8 text-periwinkle-600 animate-pulse" />
        </div>

        <div className="p-4 rounded-2xl bg-sapphire-50 border border-sapphire-100 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sapphire-600 tracking-wider">Comenzi Finalizate & Închise</p>
            <p className="text-2xl font-extrabold text-sapphire-900 font-mono mt-0.5">{comenziFinalizateCount}</p>
            <p className="text-[10px] text-sage-600 font-medium">stoc scos & contoare actualizate</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-sapphire-500" />
        </div>

        <div className="p-4 rounded-2xl bg-white border border-morning-200 flex items-center justify-between shadow-xs">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sage-700 tracking-wider">Total Înregistrate</p>
            <p className="text-2xl font-extrabold text-sapphire-900 font-mono mt-0.5">{comenzi.length}</p>
            <p className="text-[10px] text-sage-600 font-medium">istoric complet atelier</p>
          </div>
          <FileText className="w-8 h-8 text-sage-500" />
        </div>
      </div>

      {/* ─── PANOU ADVANCED FILTERS ─── */}
      <div className="pleasant-card rounded-2xl p-4 bg-white border border-morning-200 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-sapphire-900 font-extrabold text-xs">
            <Filter className="w-4 h-4 text-sapphire-500" />
            <span>Filtrare Avansată Registru Comenzi ({filteredComenzi.length} / {comenzi.length} Afișate)</span>
          </div>

          {(searchQuery || stareFilter !== 'TOATE' || vehiculFilter !== 'TOATE' || mecanicFilter !== 'TOATE' || dateStartFilter || dateEndFilter) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStareFilter('TOATE');
                setVehiculFilter('TOATE');
                setMecanicFilter('TOATE');
                setDateStartFilter('');
                setDateEndFilter('');
              }}
              className="text-[11px] font-bold text-terracotta-600 hover:underline flex items-center space-x-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Resetează Filtrele</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 text-xs">
          {/* Search Box */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-sage-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Nr. Comandă, utilaj, mecanic, piesă..."
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-sapphire-900 font-medium focus:bg-white transition"
            />
          </div>

          {/* Stare Filter */}
          <div>
            <select
              value={stareFilter}
              onChange={(e) => setStareFilter(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
            >
              <option value="TOATE">Stare: Toate Stările</option>
              <option value="IN_LUCRU">⚙️ ÎN LUCRU</option>
              <option value="FINALIZAT">✅ FINALIZAT</option>
              <option value="DEVALIDAT">🔓 DEVALIDAT</option>
              <option value="ANULAT">❌ ANULAT</option>
            </select>
          </div>

          {/* Vehicul Filter */}
          <div>
            <select
              value={vehiculFilter}
              onChange={(e) => setVehiculFilter(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
            >
              <option value="TOATE">Utilaj: Toate Flota</option>
              {vehicule.map((v) => (
                <option key={v.id} value={v.id}>
                  🚜 {v.numarIntern} ({v.numarInmatriculare})
                </option>
              ))}
            </select>
          </div>

          {/* Mecanic Filter */}
          <div>
            <select
              value={mecanicFilter}
              onChange={(e) => setMecanicFilter(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
            >
              <option value="TOATE">Mecanic: Toți Mecanicii</option>
              {mecaniciList.map((m) => (
                <option key={m.id} value={m.nume}>
                  👨‍🔧 {m.nume}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex space-x-1.5">
            <input
              type="date"
              value={dateStartFilter}
              onChange={(e) => setDateStartFilter(e.target.value)}
              title="Dată Deschidere De la"
              className="w-1/2 bg-morning-100 border border-morning-200 rounded-xl p-1.5 text-[11px] text-sapphire-900 font-bold"
            />
            <input
              type="date"
              value={dateEndFilter}
              onChange={(e) => setDateEndFilter(e.target.value)}
              title="Dată Deschidere Până la"
              className="w-1/2 bg-morning-100 border border-morning-200 rounded-xl p-1.5 text-[11px] text-sapphire-900 font-bold"
            />
          </div>
        </div>
      </div>

      {/* TABEL COMENZI DE LUCRU */}
      <div className="pleasant-card rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-base font-bold text-sapphire-900">Registrul Comenzilor de Lucru & Atelier</h2>
          <span className="text-xs font-semibold text-sage-700">{filteredComenzi.length} Comenzi Afișate</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
              <tr>
                <th className="p-3">Număr Comandă</th>
                <th className="p-3">Utilaj Greu</th>
                <th className="p-3">Mecanici Responsabili</th>
                <th className="p-3">Dată Deschidere / Finalizare</th>
                <th className="p-3">Elemente & Piese Consumate</th>
                <th className="p-3">Stare Comandă</th>
                <th className="p-3 font-mono text-right">Valoare Totală</th>
                <th className="p-3 text-right">Acțiuni Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-morning-200">
              {filteredComenzi.map((cl) => {
                const totalCost = cl.elementeComanda?.reduce((sum: number, el: any) => sum + (el.costTotal || 0), 0) || 0;
                const esteInLucru = cl.stare === 'IN_LUCRU' || cl.stare === 'DEVALIDAT';
                const esteFinalizat = cl.stare === 'FINALIZAT';

                return (
                  <tr key={cl.id} className={`hover:bg-morning-50 transition ${cl.stare === 'DEVALIDAT' ? 'bg-roseash-50/40' : esteInLucru ? 'bg-periwinkle-50/50' : ''}`}>
                    <td className="p-3 font-extrabold text-sapphire-900 font-mono">
                      {cl.numarComanda}
                      {cl.observatii && <div className="text-[10px] text-sage-600 font-normal truncate max-w-xs">{cl.observatii}</div>}
                    </td>

                    <td className="p-3 font-bold text-sapphire-700">
                      {cl.vehiculNumarIntern}
                      <div className="text-[10px] text-sage-500 font-normal">{cl.vehiculInmatriculare} ({cl.vehiculMarca} {cl.vehiculModel})</div>
                    </td>

                    <td className="p-3 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-morning-200 text-sapphire-900 font-bold text-[11px]">
                        {cl.mecanicResponsabil}
                      </span>
                    </td>

                    <td className="p-3 text-sage-700 text-[11px]">
                      <div><strong>Deschidere:</strong> {new Date(cl.dataDeschidere).toLocaleDateString('ro-RO')}</div>
                      {cl.dataFinalizare ? (
                        <div className="text-sapphire-600 font-semibold"><strong>Finalizat:</strong> {new Date(cl.dataFinalizare).toLocaleDateString('ro-RO')}</div>
                      ) : cl.stare === 'DEVALIDAT' ? (
                        <div className="text-terracotta-600 font-bold">🔓 DEVALIDAT (În Ediție)</div>
                      ) : (
                        <div className="text-periwinkle-700 font-bold">În Desfășurare</div>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="space-y-1">
                        {cl.elementeComanda && cl.elementeComanda.length > 0 ? (
                          cl.elementeComanda.map((el: any) => (
                            <div key={el.id} className="text-[11px] font-medium text-slate-800 flex items-center justify-between">
                              <span>• {el.descriere} ({el.cantitate} buc)</span>
                              <span className="font-mono text-sage-600 ml-2">{el.costTotal} RON</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Fără piese (Doar descriere intervenție)</span>
                        )}

                        {esteInLucru && (
                          <button
                            onClick={() => {
                              setShowAddElementModal(cl);
                              setElemDescriere('');
                              if (stocuri.length > 0) {
                                setElemArticolStocId(stocuri[0].id);
                                setElemPretUnitar(stocuri[0].pretUnitar || 0);
                                setElemDescriere(stocuri[0].denumire);
                              }
                            }}
                            className="text-[10px] font-bold text-sapphire-600 hover:underline flex items-center space-x-1 pt-1"
                          >
                            <Plus className="w-3 h-3 text-sapphire-500" />
                            <span>+ Adaugă piesă</span>
                          </button>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        cl.stare === 'FINALIZAT' ? 'bg-sapphire-50 text-sapphire-600 border border-sapphire-100' :
                        cl.stare === 'DEVALIDAT' ? 'bg-roseash-100 text-terracotta-700 border border-roseash-300 font-extrabold' :
                        cl.stare === 'ANULAT' ? 'bg-slate-100 text-slate-500 border border-slate-300' :
                        'bg-periwinkle-100 text-periwinkle-700 border border-periwinkle-300 animate-pulse'
                      }`}>
                        {cl.stare === 'IN_LUCRU' ? '⚙️ ÎN LUCRU' : cl.stare === 'DEVALIDAT' ? '🔓 DEVALIDAT' : cl.stare}
                      </span>
                    </td>

                    <td className="p-3 text-right font-extrabold text-sapphire-900 font-mono text-sm">
                      {Number(totalCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                    </td>

                    {/* ─── ACȚIUNI MANAGEMENT (USER STRICT LOGIC) ─── */}
                    <td className="p-3 text-right space-x-1 flex items-center justify-end">
                      {/* VIZUALIZARE (A4 Printable PDF Modal) */}
                      <button
                        onClick={() => setShowViewModal(cl)}
                        title="Vizualizare Fișă A4 & Export PDF"
                        className="px-2 py-1 rounded-lg bg-morning-200 hover:bg-morning-300 text-sapphire-900 text-[11px] font-bold flex items-center space-x-1 transition"
                      >
                        <Eye className="w-3.5 h-3.5 text-sapphire-600" />
                        <span>Vizualizare</span>
                      </button>

                      {/* CAN ONLY DEVALIDATE WHEN FINALIZAT */}
                      {esteFinalizat && (
                        <button
                          onClick={() => handleDevalideazaComanda(cl.id, cl.numarComanda)}
                          title="Devalidează comanda pentru a permite editarea sau anularea"
                          className="px-2.5 py-1 rounded-lg bg-terracotta-500 hover:bg-terracotta-600 text-white text-[11px] font-bold shadow-xs flex items-center space-x-1 transition"
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Devalidare</span>
                        </button>
                      )}

                      {/* EDITARE & ANULARE ONLY APPEAR WHEN OPEN OR DEVALIDATED! */}
                      {esteInLucru && (
                        <>
                          <button
                            onClick={() => openEditModal(cl)}
                            title="Editare Comandă de Lucru"
                            className="px-2.5 py-1 rounded-lg bg-periwinkle-100 hover:bg-periwinkle-200 text-periwinkle-700 text-[11px] font-bold border border-periwinkle-300 flex items-center space-x-1 transition"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editare</span>
                          </button>

                          <button
                            onClick={() => handleAnuleazaComanda(cl.id)}
                            title="Anulare Comandă & Restaurează Stoc"
                            className="px-2.5 py-1 rounded-lg bg-roseash-100 hover:bg-roseash-200 text-terracotta-600 text-[11px] font-bold border border-roseash-300 transition"
                          >
                            Anulare
                          </button>

                          <button
                            onClick={() => handleFinalizeazaComanda(cl.id, cl.numarComanda)}
                            title="Finalizează & Închide Comanda"
                            className="px-2.5 py-1 rounded-lg bg-sapphire-500 hover:bg-sapphire-600 text-white text-[11px] font-bold shadow-xs transition"
                          >
                            ✅ Finalizează
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── MODAL EDITARE COMANDĂ DE LUCRU ─── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-2xl bg-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2 text-sapphire-900 font-bold">
                <Edit3 className="w-5 h-5 text-sapphire-500" />
                <span>Editare Comandă de Lucru {showEditModal.numarComanda}</span>
              </div>
              <button onClick={() => setShowEditModal(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              {/* MECANICI SELECTION */}
              <div className="p-3 bg-morning-100 border border-morning-200 rounded-2xl space-y-2">
                <label className="text-sapphire-900 font-extrabold flex items-center space-x-1">
                  <Users className="w-4 h-4 text-sapphire-500" />
                  <span>Modifică Mecanici Responsabili:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {mecaniciList.map((m) => {
                    const isSelected = editMecanici.includes(m.nume);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleEditMecanicSelection(m.nume)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition ${
                          isSelected ? 'bg-sapphire-500 text-white' : 'bg-white text-slate-700 border border-morning-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{m.nume}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OBSERVAȚII */}
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Descriere Intervenție:</label>
                <textarea
                  rows={2}
                  value={editObservatii}
                  onChange={(e) => setEditObservatii(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              {/* TABEL PIESE / ELEMENTE DE EDITAT CU PILON COST & SELECȚIE STOC */}
              <div className="space-y-3 pt-2 border-t border-morning-200">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sapphire-900 font-extrabold text-xs block">
                      ⚙️ Felszerelés / Elemente & Piese pe Comandă ({editElemente.length}):
                    </label>
                    <span className="text-[11px] text-sage-600 font-medium">
                      Puteți adăuga piese noi, alege pilonul de cost și conecta articole din stocul intern
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditElement}
                    className="px-3 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-xs flex items-center space-x-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Felszerelés / Adaugă Piesă</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-72 overflow-y-auto p-1 pr-1">
                  {editElemente.length > 0 ? (
                    editElemente.map((el, idx) => (
                      <div key={idx} className="p-3 bg-morning-100 rounded-2xl border border-morning-200 space-y-2 text-xs shadow-2xs">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          {/* TIP PILON COST */}
                          <div className="md:col-span-5">
                            <label className="text-[10px] text-sage-700 font-bold block mb-0.5">Tip Pilon Cost / Proveniență:</label>
                            <select
                              value={el.pilonCost || 'PIESA_STOC'}
                              onChange={(e) => {
                                const updated = [...editElemente];
                                updated[idx].pilonCost = e.target.value;
                                if (e.target.value === 'PIESA_DEZMEMBRATA') {
                                  updated[idx].pretUnitar = 0;
                                  updated[idx].provenienta = 'Dezmembrări Parcul Propriu';
                                }
                                setEditElemente(updated);
                              }}
                              className="w-full bg-white border border-morning-200 rounded-xl p-1.5 font-bold text-sapphire-900 text-[11px]"
                            >
                              <option value="PIESA_STOC">1. PIESĂ STOC INTERN (Scade din stoc FIFO)</option>
                              <option value="PIESA_DEZMEMBRATA">1b. PIESĂ DEZMEMBRĂRI (0 RON / 0 stoc scăzut)</option>
                              <option value="PIESA_DIRECTA">2. ACHIZIȚIE DIRECTĂ PIESĂ</option>
                              <option value="MANOPERA_INTERNA">3. MANOPERĂ INTERNĂ ATELIER</option>
                              <option value="PRESTATIE_EXTERNA">4. PRESTAȚIE EXTERNĂ SERVICE</option>
                            </select>
                          </div>

                          {/* SELECȚIE ARTICOL STOC (când pilonCost === 'PIESA_STOC') */}
                          <div className="md:col-span-7">
                            {el.pilonCost === 'PIESA_STOC' ? (
                              <div>
                                <label className="text-[10px] text-sage-700 font-bold block mb-0.5">Alege Din Depozit Intern:</label>
                                <select
                                  value={el.articolStocId || ''}
                                  onChange={(e) => {
                                    const updated = [...editElemente];
                                    const selectedId = e.target.value;
                                    updated[idx].articolStocId = selectedId;
                                    const item = stocuri.find((s) => s.id === selectedId);
                                    if (item) {
                                      updated[idx].descriere = item.denumire;
                                      updated[idx].pretUnitar = item.pretUnitar || 0;
                                    }
                                    setEditElemente(updated);
                                  }}
                                  className="w-full bg-white border border-morning-200 rounded-xl p-1.5 font-bold text-sapphire-900 text-[11px]"
                                >
                                  <option value="">-- Alege articol din stoc --</option>
                                  {stocuri.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.codArticol} - {s.denumire} (Stoc: {s.stocCurent} {s.unitateMasura} • {s.pretUnitar} RON/buc)
                                    </option>
                                  ))}
                                </select>
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                          {/* DESCRIERE PIESĂ */}
                          <div className="md:col-span-5">
                            <label className="text-[10px] text-sage-700 font-bold block mb-0.5">Descriere Operațiune / Piesă:</label>
                            <input
                              type="text"
                              value={el.descriere}
                              onChange={(e) => {
                                const updated = [...editElemente];
                                updated[idx].descriere = e.target.value;
                                setEditElemente(updated);
                              }}
                              placeholder="ex: Filtru ulei, Plăcuțe frână..."
                              className="w-full bg-white border border-morning-200 rounded-xl p-1.5 text-sapphire-900 font-bold"
                            />
                          </div>

                          {/* CANTITATE */}
                          <div className="md:col-span-2">
                            <label className="text-[10px] text-sage-700 font-bold block mb-0.5">Cantitate:</label>
                            <input
                              type="number"
                              min="1"
                              value={el.cantitate}
                              onChange={(e) => {
                                const updated = [...editElemente];
                                updated[idx].cantitate = Number(e.target.value);
                                setEditElemente(updated);
                              }}
                              className="w-full bg-white border border-morning-200 rounded-xl p-1.5 text-sapphire-900 font-mono font-bold"
                            />
                          </div>

                          {/* PREȚ UNITAR */}
                          <div className="md:col-span-3">
                            <label className="text-[10px] text-sage-700 font-bold block mb-0.5">Preț Unitar (RON):</label>
                            <input
                              type="number"
                              disabled={el.pilonCost === 'PIESA_DEZMEMBRATA'}
                              value={el.pretUnitar}
                              onChange={(e) => {
                                const updated = [...editElemente];
                                updated[idx].pretUnitar = Number(e.target.value);
                                setEditElemente(updated);
                              }}
                              className="w-full bg-white border border-morning-200 rounded-xl p-1.5 text-sapphire-900 font-mono font-bold disabled:bg-slate-100"
                            />
                          </div>

                          {/* BUTON ȘTERGERE */}
                          <div className="md:col-span-2 text-right pt-3">
                            <button
                              type="button"
                              onClick={() => handleRemoveEditElement(idx)}
                              className="p-1.5 text-terracotta-600 hover:bg-roseash-100 rounded-xl transition flex items-center space-x-1 justify-end ml-auto"
                              title="Șterge rând"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span className="text-[10px] font-bold">Șterge</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-morning-100 border border-morning-200 rounded-2xl text-center text-xs text-sage-600 font-semibold">
                      Nu există încă piese felszerelte pe această comandă. Apăsați "+ Felszerelés / Adaugă Piesă" mai sus!
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowEditModal(null)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Modificările</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL VIZUALIZARE & NYOMTATÁS A4 (PDF PRINT TEMPLATE) ─── */}
      {showViewModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl p-6 space-y-6 my-8 no-print-wrapper max-h-[92vh] overflow-y-auto">
            {/* TOP ACTIONS (Screen Only) */}
            <div className="flex items-center justify-between border-b border-morning-200 pb-3 no-print">
              <div className="flex items-center space-x-2 text-sapphire-900 font-bold">
                <FileText className="w-5 h-5 text-sapphire-500" />
                <span>Previzualizare Fișă A4 (Comandă {showViewModal.numarComanda})</span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handlePrintDocument}
                  className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 flex items-center space-x-2 transition"
                >
                  <Printer className="w-4 h-4" />
                  <span>🖨️ Printează / Salvează PDF</span>
                </button>

                <button onClick={() => setShowViewModal(null)} className="text-sage-500 hover:text-sapphire-900">
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* 📄 PRINTABLE A4 SHEET VIEW 📄 */}
            <div id="printable-a4-area" className="p-8 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-800 font-sans">
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
                      {Number(showViewModal.elementeComanda?.reduce((sum: number, el: any) => sum + (el.costTotal || 0), 0) || 0)
                        .toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
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

      {/* MODAL ADĂUGARE PIESĂ SUPLIMENTARĂ */}
      {showAddElementModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Adăugare Piesă pe Comanda {showAddElementModal.numarComanda}</h3>
              <button onClick={() => setShowAddElementModal(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddElementToOrder} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Tip Pilon Cost / Proveniență:</label>
                <select
                  value={elemPilonCost}
                  onChange={(e) => setElemPilonCost(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  <option value="PIESA_STOC">1. PIESĂ STOC INTERN (Scade din stoc FIFO)</option>
                  <option value="PIESA_DEZMEMBRATA">1b. PIESĂ DEZMEMBRĂRI / PARC PROPRIU (0 RON / 0 stoc scăzut)</option>
                  <option value="PIESA_DIRECTA">2. ACHIZIȚIE DIRECTĂ PIESĂ</option>
                  <option value="MANOPERA_INTERNA">3. MANOPERĂ INTERNĂ ATELIER</option>
                </select>
              </div>

              {elemPilonCost === 'PIESA_STOC' && (
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Selectează Articol din Stoc:</label>
                  <select
                    value={elemArticolStocId}
                    onChange={(e) => handleSelectElemArticolStoc(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                  >
                    {stocuri.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.denumire} (Stoc: {st.stocCurent} {st.unitateMasura} - {st.pretUnitar} RON)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Piesă / Operațiune:</label>
                <input
                  required
                  value={elemDescriere}
                  onChange={(e) => setElemDescriere(e.target.value)}
                  placeholder="ex: Ulei Hidraulic 15L sau Filtru Aer"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  {(() => {
                    const currentElemStockItem = stocuri.find((st) => st.id === elemArticolStocId);
                    const isElemExceeded = elemPilonCost === 'PIESA_STOC' && currentElemStockItem && elemCantitate > currentElemStockItem.stocCurent;
                    return (
                      <>
                        <label className="text-sage-700 block mb-1 font-bold">Cantitate:</label>
                        <input
                          type="number"
                          min="1"
                          max={elemPilonCost === 'PIESA_STOC' && currentElemStockItem ? currentElemStockItem.stocCurent : undefined}
                          value={elemCantitate}
                          onChange={(e) => setElemCantitate(Number(e.target.value))}
                          className={`w-full border rounded-xl p-2.5 text-sapphire-900 font-mono font-bold ${
                            isElemExceeded ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-morning-100 border-morning-200'
                          }`}
                        />
                        {isElemExceeded && (
                          <p className="text-[11px] font-extrabold text-rose-600 mt-1 flex items-center space-x-1">
                            <span>⚠️ Stoc insuficient! Disponibil: {currentElemStockItem.stocCurent} {currentElemStockItem.unitateMasura || 'buc'}</span>
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Preț Unitar (RON):</label>
                  <input
                    type="number"
                    value={elemPretUnitar}
                    onChange={(e) => setElemPretUnitar(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddElementModal(null)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Piesă pe Comandă</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adaugă Comandă de Lucru Nouă */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Deschidere Comandă de Lucru Nouă</h3>
              <button onClick={() => setShowAddModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateComanda} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Utilaj:</label>
                <select
                  value={selectedVehiculId}
                  onChange={(e) => {
                    const vId = e.target.value;
                    setSelectedVehiculId(vId);
                    const sel = vehicule.find((v) => v.id === vId);
                    if (sel) {
                      const isTrailer = sel.categorieEnum === 'REMORCA' || sel.categorieEnum === 'SEMIREMORCA' || sel.categorieEnum?.includes('REMORCA');
                      if (isTrailer) {
                        const coupled = sel.cuplariSemiremorca?.[0]?.capTractor;
                        if (coupled) {
                          setValoareContorExecutie(coupled.valoareContorCurent || 0);
                        } else {
                          const firstTractor = vehicule.find((v) => v.categorieEnum === 'CAP_TRACTOR');
                          setValoareContorExecutie(firstTractor ? firstTractor.valoareContorCurent : 0);
                        }
                      } else {
                        setValoareContorExecutie(sel.valoareContorCurent || 0);
                      }
                    }
                  }}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {vehicule.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern} ({v.numarInmatriculare}) - {v.marca} {v.model}
                    </option>
                  ))}
                </select>
              </div>

              {/* KM INDEX / MUNKAÓRA KÖTELEZŐ MEZŐ (CU SUPORT DEDICAT SEMIREMORCI) */}
              {(() => {
                const selV = vehicule.find((v) => v.id === selectedVehiculId);
                const isTrailer = selV?.categorieEnum === 'REMORCA' || selV?.categorieEnum === 'SEMIREMORCA' || selV?.categorieEnum?.includes('REMORCA');
                const coupledTractor = selV?.cuplariSemiremorca?.[0]?.capTractor;
                const currentContor = selV?.valoareContorCurent || 0;
                const isLower = selV && !isTrailer && valoareContorExecutie > 0 && Number(valoareContorExecutie) < currentContor;

                return (
                  <div className="space-y-2">
                    {isTrailer && (
                      <div className="p-3 rounded-2xl border bg-amber-50/90 border-amber-300 space-y-2 text-xs">
                        <div className="flex items-center space-x-2 text-amber-900 font-extrabold">
                          <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>🚛 Semiremorcă / Remorcă (Fără odometru propriu pe șasiu)</span>
                        </div>

                        {coupledTractor ? (
                          <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between shadow-xs">
                            <div>
                              <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider">🔗 Cuplat Activ la Cap Tractor:</p>
                              <p className="font-extrabold text-sapphire-900">
                                {coupledTractor.numarIntern} ({coupledTractor.numarInmatriculare}) - {coupledTractor.marca}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setValoareContorExecutie(coupledTractor.valoareContorCurent || 0)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold shadow-xs transition"
                            >
                              Preia KM: {coupledTractor.valoareContorCurent} KM
                            </button>
                          </div>
                        ) : (
                          <p className="text-[11px] text-amber-800 font-medium">
                            Semiremorca nu este cuplată momentan. Selectați capul tractor care o tractează pentru preluarea kilometrajului:
                          </p>
                        )}

                        <div>
                          <label className="text-[10px] text-sage-700 font-bold block mb-1">
                            Alege Cap Tractor din flotă care tractează semiremorca:
                          </label>
                          <select
                            onChange={(e) => {
                              const tr = vehicule.find((v) => v.id === e.target.value);
                              if (tr) setValoareContorExecutie(tr.valoareContorCurent || 0);
                            }}
                            className="w-full bg-white border border-amber-300 rounded-xl p-2 font-bold text-sapphire-900 text-xs"
                          >
                            <option value="">-- Selectează Cap Tractor --</option>
                            {vehicule
                              .filter((v) => v.categorieEnum === 'CAP_TRACTOR')
                              .map((tr) => (
                                <option key={tr.id} value={tr.id}>
                                  🚚 {tr.numarIntern} ({tr.numarInmatriculare}) - {tr.marca} • Contor Curent: {tr.valoareContorCurent} KM
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>
                    )}

                    <div className="p-3 bg-morning-100 border border-morning-200 rounded-2xl space-y-1">
                      <label className="text-sapphire-900 font-extrabold block text-xs">
                        {isTrailer ? 'Index KM Cap Tractor la Execuție (Obligatoriu): *' : 'Index Contor (KM / mTH) la Execuție: *'}
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={valoareContorExecutie}
                        onChange={(e) => setValoareContorExecutie(Number(e.target.value))}
                        placeholder={isTrailer ? 'Introduceți KM cap tractor...' : 'ex: 125000'}
                        className={`w-full border rounded-xl p-2.5 text-sapphire-900 font-mono font-extrabold text-sm ${
                          isLower ? 'bg-amber-50 border-amber-400 text-amber-900' : 'bg-white border-morning-200'
                        }`}
                      />
                      <p className="text-[10px] text-sage-600 font-medium">
                        {isTrailer
                          ? '• Pentru semiremorci este obligatoriu indexul kilometrajului capului tractor la momentul intervenției.'
                          : '• Valoarea contorului curent înregistrată pe utilaj: '}
                        {!isTrailer && <span className="font-extrabold text-sapphire-700">{currentContor} {selV?.tipMasurare || 'KM/mTH'}</span>}
                      </p>
                      {isLower && (
                        <div className="mt-1.5 p-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold flex items-center space-x-1.5 animate-pulse">
                          <span>⚠️ ATENȚIE: Valoarea introdusă ({valoareContorExecutie} {selV?.tipMasurare}) este MAI MICĂ decât ultimul contor înregistrat ({currentContor} {selV?.tipMasurare})! Se va salva ca o corecție manuală.</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* SELECȚIE MULTIPLĂ MECANICI */}
              <div className="p-3 bg-morning-100 border border-morning-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sapphire-900 font-extrabold flex items-center space-x-1">
                    <Users className="w-4 h-4 text-sapphire-500" />
                    <span>Mecanici Responsabili:</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowAddMecanicModal(true)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-morning-200 text-[11px] font-bold text-sapphire-600"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>+ Mecanic Nou</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {mecaniciList.map((m) => {
                    const isSelected = selectedMecanici.includes(m.nume);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleMecanicSelection(m.nume)}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition ${
                          isSelected ? 'bg-sapphire-500 text-white' : 'bg-white text-slate-700 border border-morning-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                        <span>{m.nume}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OPCIONAL: ADĂUGARE PIESĂ INIȚIALĂ SAU DOAR DESCRIERE */}
              <div className="p-3 bg-morning-100 border border-morning-200 rounded-2xl space-y-2">
                <label className="flex items-center space-x-2 font-bold text-sapphire-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasInitialPart}
                    onChange={(e) => setHasInitialPart(e.target.checked)}
                    className="w-4 h-4 text-sapphire-500 rounded"
                  />
                  <span>Adaugă o piesă inițială acum (Opțional)</span>
                </label>

                {hasInitialPart && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <label className="text-sage-700 block mb-1 font-bold">Tip Pilon Cost:</label>
                      <select
                        value={pilonCost}
                        onChange={(e) => setPilonCost(e.target.value)}
                        className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold"
                      >
                        <option value="PIESA_STOC">1. PIESĂ STOC INTERN (Scade din stoc FIFO)</option>
                        <option value="PIESA_DEZMEMBRATA">1b. PIESĂ DEZMEMBRĂRI (0 RON / 0 stoc scăzut)</option>
                        <option value="PIESA_DIRECTA">2. ACHIZIȚIE DIRECTĂ PIESĂ</option>
                        <option value="MANOPERA_INTERNA">3. MANOPERĂ INTERNĂ ATELIER</option>
                      </select>
                    </div>

                    {pilonCost === 'PIESA_STOC' && (
                      <div>
                        <label className="text-sage-700 block mb-1 font-bold">Selectează Articol din Stoc:</label>
                        <select
                          value={selectedArticolStocId}
                          onChange={(e) => handleSelectArticolStoc(e.target.value)}
                          className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-semibold"
                        >
                          {stocuri.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.denumire} (Stoc: {st.stocCurent} {st.unitateMasura} - {st.pretUnitar} RON)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        {(() => {
                          const currentStockItem = stocuri.find((st) => st.id === selectedArticolStocId);
                          const isExceeded = pilonCost === 'PIESA_STOC' && currentStockItem && cantitate > currentStockItem.stocCurent;
                          return (
                            <>
                              <label className="text-sage-700 block mb-1 font-bold">Cantitate:</label>
                              <input
                                type="number"
                                min="1"
                                max={pilonCost === 'PIESA_STOC' && currentStockItem ? currentStockItem.stocCurent : undefined}
                                value={cantitate}
                                onChange={(e) => setCantitate(Number(e.target.value))}
                                className={`w-full border rounded-xl p-2 text-sapphire-900 font-mono font-bold ${
                                  isExceeded ? 'bg-rose-50 border-rose-500 text-rose-900' : 'bg-white border-morning-200'
                                }`}
                              />
                              {isExceeded && (
                                <p className="text-[11px] font-extrabold text-rose-600 mt-1 flex items-center space-x-1">
                                  <span>⚠️ Stoc insuficient! Disponibil: {currentStockItem.stocCurent} {currentStockItem.unitateMasura || 'buc'}</span>
                                </p>
                              )}
                            </>
                          );
                        })()}
                      </div>

                      <div>
                        <label className="text-sage-700 block mb-1 font-bold">Preț Unitar (RON):</label>
                        <input
                          type="number"
                          value={pretUnitar}
                          onChange={(e) => setPretUnitar(Number(e.target.value))}
                          className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono font-bold"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Descriere Intervenție:</label>
                <textarea
                  value={observatii}
                  onChange={(e) => setObservatii(e.target.value)}
                  rows={2}
                  placeholder="ex: Schimb ulei hidraulic, reparare cilindru și înlocuire garnituri"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900"
                />
              </div>

              <div className="p-3 bg-morning-100 border border-morning-200 rounded-2xl flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-bold text-sapphire-900 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoFinalize}
                    onChange={(e) => setAutoFinalize(e.target.checked)}
                    className="w-4 h-4 text-sapphire-500 rounded"
                  />
                  <span>Finalizează direct comanda la salvare (Scade stocul acum)</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Comandă de Lucru</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Adaugă Mecanic Nou */}
      {showAddMecanicModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Adăugare Mecanic Nou</h3>
              <button onClick={() => setShowAddMecanicModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMecanic} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume & Prenume Mecanic:</label>
                <input
                  required
                  value={numeMecanicNou}
                  onChange={(e) => setNumeMecanicNou(e.target.value)}
                  placeholder="ex: Ion Popescu (Atelier)"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Funcție / Specializare:</label>
                <input
                  value={functieMecanicNou}
                  onChange={(e) => setFunctieMecanicNou(e.target.value)}
                  placeholder="ex: Mecanică Grea / Electrician Auto"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddMecanicModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Mecanic</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
