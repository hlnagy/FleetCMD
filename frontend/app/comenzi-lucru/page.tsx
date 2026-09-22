"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect } from 'react';
import {
  Wrench, Plus, CheckCircle2, DollarSign, Filter, Search, FileText, X, Trash2,
  ShieldAlert, UserPlus, Users, Check, Clock, PackageCheck, Printer, Eye, Edit3,
  Unlock, RotateCcw, Calendar, Truck, Loader2, Package, Minus, AlertCircle, Info,
  ShoppingCart, RefreshCw, GripHorizontal, Maximize2, Minimize2
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';
import DraggableModal from '@/components/DraggableModal';

export default function ComenziLucruPage() {
  const [comenzi, setComenzi] = useState<any[]>([]);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [stocuri, setStocuri] = useState<any[]>([]);
  const [mecaniciList, setMecaniciList] = useState<any[]>([]);
  const [isCreating, setIsCreating] = useState(false);

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

  // Stare Căutare & Filtrare Járművek (Vehicle Selection)
  const [vehiculSearchQuery, setVehiculSearchQuery] = useState('');
  const [vehiculCategoryFilter, setVehiculCategoryFilter] = useState('TOATE');
  const [isVehiculSearchOpen, setIsVehiculSearchOpen] = useState(false);

  // Single initial element state (Alapértelmezetten false - tiszta deviz indul)
  const [hasInitialPart, setHasInitialPart] = useState(false);
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

  // Quick-Add Bar State pentru Editor Munkalap & Alkatrész Kereső
  const [quickPilonCost, setQuickPilonCost] = useState<'PIESA_STOC' | 'PIESA_DEZMEMBRATA' | 'PIESA_DIRECTA' | 'MANOPERA_INTERNA' | 'PRESTATIE_EXTERNA'>('PIESA_STOC');
  const [quickSearchQuery, setQuickSearchQuery] = useState('');
  const [quickSelectedCategory, setQuickSelectedCategory] = useState('TOATE');
  const [quickSelectedArticol, setQuickSelectedArticol] = useState<any | null>(null);
  const [quickDescriere, setQuickDescriere] = useState('');
  const [quickCantitate, setQuickCantitate] = useState<number>(1);
  const [quickPretUnitar, setQuickPretUnitar] = useState<number>(0);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [isSavingAndFinalizing, setIsSavingAndFinalizing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch Vehicule & Comenzi
      const resVeh = await fetch(`${API_BASE_URL}/vehicule`);
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

        // Întotdeauna cele mai noi comenzi în capul listei
        allCL.sort((a: any, b: any) => {
          const timeA = new Date(a.createdAt || a.dataDeschidere).getTime();
          const timeB = new Date(b.createdAt || b.dataDeschidere).getTime();
          if (timeB !== timeA) return timeB - timeA;
          return (b.numarComanda || '').localeCompare(a.numarComanda || '', undefined, { numeric: true });
        });

        setComenzi(allCL);
      }

      // Fetch Stocuri
      const resStoc = await fetch(`${API_BASE_URL}/stocuri-garantii/stocuri`);
      if (resStoc.ok) {
        const stData = await resStoc.json();
        setStocuri(stData);
      }

      // Fetch Mecanici
      const resMec = await fetch(`${API_BASE_URL}/mentenanta/mecanici`);
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

  const formatContorDate = (dateVal: string | Date | undefined | null) => {
    if (!dateVal) return null;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getVehiculContorDate = (v: any) => {
    if (!v) return null;
    const rawDate = v.istoricContor?.[0]?.dataInregistrare || v.dataInregistrareContor || v.updatedAt;
    return formatContorDate(rawDate);
  };

  const getCategoryLabel = (catEnum: string) => {
    const c = (catEnum || '').toUpperCase();
    if (c.includes('CAP_TRACTOR') || c.includes('TRACTOR')) return 'Cap Tractor';
    if (c.includes('SEMIREMORCA') || c.includes('REMORCA')) return 'Semiremorcă';
    if (c.includes('BASCULANT') || c.includes('BASCULA')) return 'Basculantă';
    if (c.includes('EXCAVATOR')) return 'Excavator';
    if (c.includes('INCARCATOR')) return 'Încărcător';
    if (c.includes('BULLDOZER')) return 'Bulldozer';
    if (c.includes('AUTOVALT') || c.includes('COMPACTOR')) return 'Compactor';
    if (c.includes('AUTOUTILITARA') || c.includes('VAN')) return 'Autoutilitară';
    if (c.includes('TURISM') || c.includes('AUTO')) return 'Turism';
    return catEnum || 'Utilaj';
  };

  const getCategoryIcon = (catEnum: string) => {
    const c = (catEnum || '').toUpperCase();
    if (c.includes('CAP_TRACTOR') || c.includes('TRACTOR')) return '🚛';
    if (c.includes('SEMIREMORCA') || c.includes('REMORCA')) return '🏁';
    if (c.includes('BASCULANT') || c.includes('BASCULA')) return '🚚';
    if (c.includes('EXCAVATOR') || c.includes('INCARCATOR') || c.includes('BULLDOZER')) return '🚜';
    if (c.includes('AUTOUTILITARA') || c.includes('TURISM') || c.includes('AUTO')) return '🚗';
    return '⚙️';
  };

  const handleSelectVehicul = (vId: string) => {
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
  };

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
      const res = await fetch(`${API_BASE_URL}/mentenanta/mecanici`, {
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
      alert('Index KM Obligatoriu pentru Semiremorci!\n\nSemiremorcile nu au contor propriu. Vă rugăm să introduceți indexul kilometrajului al capului tractor care tractează semiremorca!');
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

    // Notă: Comanda nouă pornește cu deviz curat (elemente: []).
    // Piesele și manopera se adaugă direct în editorul comenzi-lucru prin bara Quick-Add.

    setIsCreating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru`, {
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
        const selV = vehicule.find((v) => v.id === selectedVehiculId);
        const enrichedCom = {
          ...com,
          vehiculNumarIntern: com.vehicul?.numarIntern || selV?.numarIntern,
          vehiculInmatriculare: com.vehicul?.numarInmatriculare || selV?.numarInmatriculare,
          vehiculMarca: com.vehicul?.marca || selV?.marca,
          vehiculModel: com.vehicul?.model || selV?.model,
          vehiculSerieSasiu: com.vehicul?.serieSasiu || com.vehicul?.vin || selV?.serieSasiu || 'N/A',
          vehiculValoareContor: com.vehicul?.valoareContorCurent || selV?.valoareContorCurent || 0,
          vehiculTipMasurare: com.vehicul?.tipMasurare || selV?.tipMasurare || 'KM',
        };

        setShowAddModal(false);
        await fetchData();

        if (autoFinalize) {
          await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${com.id}/finalizeaza`, { method: 'PATCH' });
          await fetchData();
          setShowViewModal(enrichedCom);
        } else {
          // Deschide imediat comanda de lucru nou creată în modalul de editare/completare
          openEditModal(enrichedCom);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Eroare la crearea comenzii de lucru: ${errData.message || res.statusText || 'Verificați datele introduse.'}`);
      }
    } catch (e: any) {
      alert(`Eroare la crearea comenzii de lucru: ${e.message || e}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAddElementToOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddElementModal) return;

    if (elemPilonCost === 'PIESA_STOC' && elemArticolStocId) {
      const itemStoc = stocuri.find((s) => s.id === elemArticolStocId);
      if (itemStoc && Number(elemCantitate) > itemStoc.stocCurent) {
        alert(` Stoc Insuficient!\n\nNu puteți adăuga ${elemCantitate} bucăți din articolul "${itemStoc.denumire}".\nStocul maxim disponibil în magazie este: ${itemStoc.stocCurent} ${itemStoc.unitateMasura || 'buc'}.`);
        return;
      }
    }

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${showAddElementModal.id}/adauga-element`, {
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
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${id}/finalizeaza`, { method: 'PATCH' });
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

  const handleAnuleazaComanda = async (cl: any) => {
    const pieseStoc = (cl.elementeComanda || []).filter(
      (el: any) => el.pilonCost === 'PIESA_STOC' && el.articolStocId
    );

    let pieseMsg = '';
    if (pieseStoc.length > 0) {
      const lista = pieseStoc.map((el: any) => `• ${el.cantitate} buc — ${el.descriere}`).join('\n');
      pieseMsg = `\n\nA munkalapon nyilvántartott alábbi raktári alkatrészek visszakerülnek a raktárba / felszabadulnak a készletben:\n${lista}\n\nA tételek azonnal újra elérhetővé válnak a raktárkészletben!`;
    } else {
      pieseMsg = '\n\nA munkalap nem tartalmaz raktárból levont alkatrészt.';
    }

    const confirmed = await showConfirm(
      `Anulare Comandă de Lucru ${cl.numarComanda}`,
      `Biztosan ANULÁLNI (érvényteleníteni) szeretné a(z) ${cl.numarComanda} munkalapot?${pieseMsg}`,
      'Da, anulează comanda',
      'Mégse'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${cl.id}/anuleaza`, { method: 'PATCH' });
      if (res.ok) {
        await fetchData();
        alert(`Comanda ${cl.numarComanda} a fost ANULATĂ cu succes!\n\nA lefoglalt/felhasznált alkatrészek visszakerültek a raktárba.`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare la anularea comandei: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare la anularea comandei: ${e.message || e}`);
    }
  };

  // Re-deschide comanda anulată (reactivare în stare IN_LUCRU)
  const handleRedeschideComanda = async (id: string, numarComanda: string) => {
    const confirmed = await showConfirm(
      'Re-deschidere Comandă de Lucru',
      `Doriți să reactivați comanda de lucru ${numarComanda} în starea ÎN LUCRU?`,
      'Da, reactivează comanda',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${id}/redeschide`, { method: 'PATCH' });
      if (res.ok) {
        const comUpdated = await res.json();
        await fetchData();
        const v = vehicule.find((vh) => vh.id === comUpdated.vehiculId);
        const enriched = {
          ...comUpdated,
          vehiculNumarIntern: comUpdated.vehicul?.numarIntern || v?.numarIntern,
          vehiculInmatriculare: comUpdated.vehicul?.numarInmatriculare || v?.numarInmatriculare,
          vehiculMarca: comUpdated.vehicul?.marca || v?.marca,
          vehiculModel: comUpdated.vehicul?.model || v?.model,
          vehiculSerieSasiu: comUpdated.vehicul?.serieSasiu || v?.serieSasiu || 'N/A',
          vehiculValoareContor: comUpdated.vehicul?.valoareContorCurent || v?.valoareContorCurent || 0,
          vehiculTipMasurare: comUpdated.vehicul?.tipMasurare || v?.tipMasurare || 'KM',
        };
        openEditModal(enriched);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare la reactivarea comenzii: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare la reactivarea comenzii de lucru: ${e.message || e}`);
    }
  };

  // Ștergere comandă de lucru
  const handleDeleteComanda = async (cl: any) => {
    const pieseStoc = (cl.elementeComanda || []).filter(
      (el: any) => el.pilonCost === 'PIESA_STOC' && el.articolStocId
    );

    let pieseMsg = '';
    if (pieseStoc.length > 0) {
      const lista = pieseStoc.map((el: any) => `• ${el.cantitate} buc — ${el.descriere}`).join('\n');
      pieseMsg = `\n\nFIGYELEM: A munkalapon nyilvántartott raktári alkatrészek visszakerülnek a raktárba:\n${lista}`;
    }

    const confirmed = await showConfirm(
      `Ștergere Definitivă ${cl.numarComanda}`,
      `Biztosan VÉGLEGESEN TÖRÖLNI szeretné a(z) ${cl.numarComanda} munkalapot az adatbázisból?${pieseMsg}\n\nEz a művelet visszafordíthatatlan, a munkalap törlődik a jármű történetéből!`,
      'Da, șterge definitiv',
      'Mégse'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${cl.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchData();
        alert(`Comanda ${cl.numarComanda} a fost ștearsă definitiv din baza de date.`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Eroare la ștergere: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare la ștergerea comenzii: ${e.message || e}`);
    }
  };

  //  DEVALIDARE COMANDĂ DE LUCRU (Re-opens work order, restores stock & reveals EDIT / ANULARE buttons)
  const handleDevalideazaComanda = async (id: string, numarComanda: string) => {
    const confirmed = await showConfirm(
      'Devalidare Comandă de Lucru',
      `Doriți să DEVALIDAȚI Comanda de Lucru ${numarComanda}?\n\nAcțiunea va debloca comanda, va stabili starea DEVALIDAT și va permite editarea sau anularea acesteia!`,
      'Da, devalidează',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${id}/devalideaza`, { method: 'PATCH' });
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
    // Reset quick-add state
    setQuickPilonCost('PIESA_STOC');
    setQuickSearchQuery('');
    setQuickSelectedCategory('TOATE');
    setQuickSelectedArticol(null);
    setQuickDescriere('');
    setQuickCantitate(1);
    setQuickPretUnitar(0);
    setIsSearchDropdownOpen(false);
  };

  // Save Edit Work Order
  const handleSaveEdit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!showEditModal) return;

    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${showEditModal.id}/update`, {
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
        await fetchData();
        alert('Modificările pe comanda de lucru au fost salvate cu succes!');
      } else {
        alert('Eroare la salvarea modificărilor.');
      }
    } catch (e) {
      alert('Eroare la salvarea modificărilor.');
    }
  };

  // Add Quick Element in Edit Modal
  const handleAddQuickElement = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quickPilonCost === 'PIESA_STOC') {
      if (!quickSelectedArticol) {
        alert('Vă rugăm să alegeți un articol din stoc din lista de căutare!');
        return;
      }
      if (Number(quickCantitate) <= 0) {
        alert('Cantitatea trebuie să fie de minim 1!');
        return;
      }
      if (Number(quickCantitate) > Number(quickSelectedArticol.stocCurent || 0)) {
        alert(`Stoc Insuficient!\n\nArticolul "${quickSelectedArticol.denumire}" are doar ${quickSelectedArticol.stocCurent} ${quickSelectedArticol.unitateMasura || 'buc'} disponibile în stoc.`);
        return;
      }
      setEditElemente([
        ...editElemente,
        {
          pilonCost: 'PIESA_STOC',
          descriere: quickSelectedArticol.denumire,
          cantitate: Number(quickCantitate),
          pretUnitar: Number(quickPretUnitar !== undefined && quickPretUnitar !== null ? quickPretUnitar : (quickSelectedArticol.pretUnitar || 0)),
          articolStocId: quickSelectedArticol.id,
          codArticol: quickSelectedArticol.codArticol,
          unitateMasura: quickSelectedArticol.unitateMasura || 'buc',
          provenienta: quickSelectedArticol.depozit?.nume || 'Magazie Centrală',
        },
      ]);
    } else if (quickPilonCost === 'PIESA_DEZMEMBRATA') {
      if (!quickDescriere.trim()) {
        alert('Vă rugăm să introduceți denumirea piesei din dezmembrări!');
        return;
      }
      setEditElemente([
        ...editElemente,
        {
          pilonCost: 'PIESA_DEZMEMBRATA',
          descriere: quickDescriere.trim(),
          cantitate: Number(quickCantitate) || 1,
          pretUnitar: 0,
          articolStocId: null,
          unitateMasura: 'buc',
          provenienta: 'Dezmembrări Parcul Propriu',
        },
      ]);
    } else {
      if (!quickDescriere.trim()) {
        alert('Vă rugăm să introduceți denumirea piesei sau a operațiunii de manoperă!');
        return;
      }
      setEditElemente([
        ...editElemente,
        {
          pilonCost: quickPilonCost,
          descriere: quickDescriere.trim(),
          cantitate: Number(quickCantitate) || 1,
          pretUnitar: Number(quickPretUnitar) || 0,
          articolStocId: null,
          unitateMasura: quickPilonCost === 'MANOPERA_INTERNA' ? 'ore' : 'buc',
          provenienta:
            quickPilonCost === 'PIESA_DIRECTA'
              ? 'Achiziție Directă'
              : quickPilonCost === 'MANOPERA_INTERNA'
              ? 'Manoperă Atelier'
              : 'Prestație Externă',
        },
      ]);
    }

    // Reset quick add form smoothly
    setQuickSearchQuery('');
    setQuickSelectedArticol(null);
    setQuickDescriere('');
    setQuickCantitate(1);
    setQuickPretUnitar(0);
    setIsSearchDropdownOpen(false);
  };

  // Inline table updates
  const handleUpdateEditElementQty = (idx: number, delta: number) => {
    const updated = [...editElemente];
    const current = Number(updated[idx].cantitate) || 1;
    const next = Math.max(1, current + delta);
    if (updated[idx].pilonCost === 'PIESA_STOC' && updated[idx].articolStocId) {
      const item = stocuri.find((s) => s.id === updated[idx].articolStocId);
      if (item && next > item.stocCurent) {
        alert(`Atenție: Stocul maxim disponibil pentru "${item.denumire}" este ${item.stocCurent} ${item.unitateMasura || 'buc'}`);
        return;
      }
    }
    updated[idx].cantitate = next;
    setEditElemente(updated);
  };

  const handleUpdateEditElementPrice = (idx: number, price: number) => {
    const updated = [...editElemente];
    updated[idx].pretUnitar = Math.max(0, price);
    setEditElemente(updated);
  };

  const handleUpdateEditElementDesc = (idx: number, desc: string) => {
    const updated = [...editElemente];
    updated[idx].descriere = desc;
    setEditElemente(updated);
  };

  // Remove Element in Edit Modal
  const handleRemoveEditElement = (index: number) => {
    setEditElemente(editElemente.filter((_, i) => i !== index));
  };

  // Save and Finalize in 1-Click
  const handleSaveAndFinalize = async () => {
    if (!showEditModal) return;

    for (const el of editElemente) {
      if (el.pilonCost === 'PIESA_STOC' && el.articolStocId) {
        const item = stocuri.find((s) => s.id === el.articolStocId);
        if (item && Number(el.cantitate) > item.stocCurent) {
          alert(
            `Nu se poate finaliza comanda!\n\nPiesa "${item.denumire}" depășește stocul disponibil: solicitat ${el.cantitate}, disponibil în magazie ${item.stocCurent} ${item.unitateMasura || 'buc'}.`
          );
          return;
        }
      }
    }

    const confirmed = await showConfirm(
      'Salvare & Finalizare Imediată',
      `Doriți să salvați toate modificările și să FINALIZEZI imediat Comanda de Lucru ${showEditModal.numarComanda}?\n\n• Se vor scădea automat piesele din stoc conform metodei FIFO.\n• Comanda va primi starea FINALIZAT.\n• Se vor actualiza costurile de mentenanță.`,
      'Da, salvează și finalizează',
      'Anulează'
    );
    if (!confirmed) return;

    setIsSavingAndFinalizing(true);
    try {
      // 1. Update command
      const resUpdate = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${showEditModal.id}/update`, {
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

      if (!resUpdate.ok) {
        alert('Eroare la salvarea modificărilor comenzii.');
        setIsSavingAndFinalizing(false);
        return;
      }

      // 2. Finalize
      const resFinalize = await fetch(`${API_BASE_URL}/mentenanta/comanda-lucru/${showEditModal.id}/finalizeaza`, {
        method: 'PATCH',
      });

      if (resFinalize.ok) {
        setShowEditModal(null);
        await fetchData();
        alert(`Comanda de Lucru ${showEditModal.numarComanda} a fost salvată și FINALIZATĂ cu succes!\n\nPiesele au fost scăzute din stoc FIFO.`);
      } else {
        const err = await resFinalize.json().catch(() => ({}));
        alert(`Comanda a fost salvată, dar finalizarea a eșuat: ${err.message || 'Verificați datele.'}`);
        await fetchData();
      }
    } catch (e: any) {
      alert(`Eroare la procesare: ${e.message || e}`);
    } finally {
      setIsSavingAndFinalizing(false);
    }
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

  // Calcul Categorii Magazie & Listă Piese Filtrate pentru Editor
  const availableStockCategories = [
    'TOATE',
    ...Array.from(new Set(stocuri.map((s: any) => s.categorie).filter(Boolean))),
  ];

  const filteredStockList = stocuri
    .filter((item: any) => {
      if (quickSelectedCategory !== 'TOATE') {
        if ((item.categorie || '').toLowerCase() !== quickSelectedCategory.toLowerCase()) {
          return false;
        }
      }
      if (quickSearchQuery.trim()) {
        const q = quickSearchQuery.toLowerCase().trim();
        const mCod = (item.codArticol || '').toLowerCase().includes(q);
        const mDen = (item.denumire || '').toLowerCase().includes(q);
        const mCat = (item.categorie || '').toLowerCase().includes(q);
        const mSub = (item.subcategorie || '').toLowerCase().includes(q);
        const mDep = (item.depozit?.nume || '').toLowerCase().includes(q);
        if (!mCod && !mDen && !mCat && !mSub && !mDep) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const stockA = Number(a.stocCurent || 0);
      const stockB = Number(b.stocCurent || 0);
      if (stockA > 0 && stockB <= 0) return -1;
      if (stockB > 0 && stockA <= 0) return 1;
      return (a.denumire || '').localeCompare(b.denumire || '');
    });

  // Calcul Deviz în Timp Real pentru Munkalap Editor
  const totalDevizPieseStoc = editElemente
    .filter((el) => el.pilonCost === 'PIESA_STOC')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0), 0);

  const bucatiDevizStoc = editElemente
    .filter((el) => el.pilonCost === 'PIESA_STOC')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0), 0);

  const bucatiDevizDezmembrari = editElemente
    .filter((el) => el.pilonCost === 'PIESA_DEZMEMBRATA')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0), 0);

  const totalDevizDirecte = editElemente
    .filter((el) => el.pilonCost === 'PIESA_DIRECTA')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0), 0);

  const totalDevizManopera = editElemente
    .filter((el) => el.pilonCost === 'MANOPERA_INTERNA' || el.pilonCost === 'PRESTATIE_EXTERNA')
    .reduce((acc, el) => acc + (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0), 0);

  const totalGeneralDeviz = editElemente.reduce(
    (acc, el) => acc + (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0),
    0
  );

  // Calcul Categorii Járművek & Listă Utilaje Filtrate pentru Deschidere Comandă Nouă
  const availableVehiculeCategories = [
    'TOATE',
    ...Array.from(new Set(vehicule.map((v) => v.categorieEnum).filter(Boolean))),
  ];

  const filteredVehiculeList = vehicule.filter((v: any) => {
    if (vehiculCategoryFilter !== 'TOATE') {
      if ((v.categorieEnum || '').toUpperCase() !== vehiculCategoryFilter.toUpperCase()) {
        return false;
      }
    }
    if (vehiculSearchQuery.trim()) {
      const q = vehiculSearchQuery.toLowerCase().trim();
      const mPlate = (v.numarInmatriculare || '').toLowerCase().includes(q);
      const mIntern = (v.numarIntern || '').toLowerCase().includes(q);
      const mMarca = (v.marca || '').toLowerCase().includes(q);
      const mModel = (v.model || '').toLowerCase().includes(q);
      const mCat = (v.categorieEnum || '').toLowerCase().includes(q);
      const mCatLabel = getCategoryLabel(v.categorieEnum).toLowerCase().includes(q);
      if (!mPlate && !mIntern && !mMarca && !mModel && !mCat && !mCatLabel) return false;
    }
    return true;
  });

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
          onClick={() => {
            setShowAddModal(true);
            setVehiculSearchQuery('');
            setVehiculCategoryFilter('TOATE');
            setIsVehiculSearchOpen(false);
          }}
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
              placeholder="Nr. Comandă, utilaj, mecanic, piesă..."
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
              <option value="IN_LUCRU">ÎN LUCRU</option>
              <option value="FINALIZAT">FINALIZAT</option>
              <option value="DEVALIDAT">DEVALIDAT</option>
              <option value="ANULAT">ANULAT</option>
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
              {vehicule.map((v) => {
                const hasDiff = v.numarIntern && v.numarIntern !== v.numarInmatriculare;
                const plateStr = hasDiff ? `${v.numarIntern} (${v.numarInmatriculare})` : (v.numarInmatriculare || v.numarIntern);
                return (
                  <option key={v.id} value={v.id}>
                    {getCategoryIcon(v.categorieEnum)} {plateStr} {v.marca ? `— ${v.marca}` : ''}
                  </option>
                );
              })}
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
                   {m.nume}
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
          <table className="w-full text-left text-xs text-slate-700 min-w-[1100px]">
            <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
              <tr>
                <th className="p-3">Număr Comandă</th>
                <th className="p-3">Utilaj Greu</th>
                <th className="p-3">Mecanici Responsabili</th>
                <th className="p-3">Dată Deschidere / Finalizare</th>
                <th className="p-3">Elemente & Piese Consumate</th>
                <th className="p-3">Stare Comandă</th>
                <th className="p-3 font-mono text-right">Valoare Totală</th>
                <th className="p-3 text-right whitespace-nowrap min-w-[280px]">Acțiuni Management</th>
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
                        <div className="text-terracotta-600 font-bold">DEVALIDAT (În Ediție)</div>
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
                            onClick={() => openEditModal(cl)}
                            className="text-[10px] font-bold text-sapphire-600 hover:underline flex items-center space-x-1 pt-1"
                          >
                            <Plus className="w-3 h-3 text-sapphire-500" />
                            <span>+ Adaugă piesă / deviz</span>
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
                        {cl.stare === 'IN_LUCRU' ? 'ÎN LUCRU' : cl.stare === 'DEVALIDAT' ? 'DEVALIDAT' : cl.stare}
                      </span>
                    </td>

                    <td className="p-3 text-right font-extrabold text-sapphire-900 font-mono text-sm">
                      {Number(totalCost || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                    </td>

                    {/* ─── ACȚIUNI MANAGEMENT (USER STRICT LOGIC) ─── */}
                    <td className="p-3 text-right space-x-1 flex items-center justify-end whitespace-nowrap min-w-[280px]">
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
                            onClick={() => handleAnuleazaComanda(cl)}
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
                             Finalizează
                          </button>
                        </>
                      )}

                      {/* ACȚIUNI PENTRU COMENZI ANULATE */}
                      {cl.stare === 'ANULAT' && (
                        <>
                          <button
                            onClick={() => handleRedeschideComanda(cl.id, cl.numarComanda)}
                            title="Re-deschide și reactivează această comandă de lucru în starea ÎN LUCRU"
                            className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold border border-emerald-300 flex items-center space-x-1 transition"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Re-deschide</span>
                          </button>

                          <button
                            onClick={() => handleDeleteComanda(cl)}
                            title="Șterge definitiv această comandă anulată din registru"
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-roseash-100 text-slate-600 hover:text-terracotta-700 text-[11px] font-bold border border-slate-300 flex items-center space-x-1 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Șterge</span>
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

      {/* ─── MODAL EDITARE COMANDĂ DE LUCRU (MODERN WORKSHOP DEVIZ EDITOR) ─── */}
      {showEditModal && (
        <DraggableModal
          isOpen={!!showEditModal}
          onClose={() => setShowEditModal(null)}
          defaultWidth={1150}
          defaultHeight={820}
          minWidth={550}
          minHeight={420}
          customHeader={({ isMaximized, toggleMaximize, onClose }) => (
            <div className="flex flex-col md:flex-row md:items-center justify-between p-4 sm:p-5 border-b border-morning-200 gap-3 bg-gradient-to-r from-morning-50 via-white to-morning-50 select-none">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center space-x-2.5 flex-wrap">
                  <div className="p-1 text-slate-400 hover:text-sapphire-600 transition flex items-center" title="Trage pentru a muta fereastra (Dublu-click pentru mărire)">
                    <GripHorizontal className="w-4 h-4" />
                  </div>
                  <div className="p-2 rounded-xl bg-sapphire-50 text-sapphire-600 border border-sapphire-100">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-sapphire-900 tracking-tight truncate">
                    Comandă de Lucru {showEditModal.numarComanda}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    showEditModal.stare === 'FINALIZAT' ? 'bg-sapphire-50 text-sapphire-700 border border-sapphire-200' :
                    showEditModal.stare === 'DEVALIDAT' ? 'bg-roseash-100 text-terracotta-700 border border-roseash-300' :
                    'bg-periwinkle-100 text-periwinkle-700 border border-periwinkle-300'
                  }`}>
                    {showEditModal.stare === 'IN_LUCRU' ? '● ÎN LUCRU' : showEditModal.stare}
                  </span>
                </div>

                {/* VEHICLE QUICK BADGE */}
                <div className="flex items-center space-x-2 text-xs font-semibold text-slate-600 flex-wrap pt-0.5">
                  <span className="px-2 py-0.5 rounded-lg bg-morning-200 text-sapphire-900 font-extrabold">
                    🚜 {showEditModal.vehiculNumarIntern || showEditModal.vehiculInmatriculare || 'Utilaj'}
                  </span>
                  {showEditModal.vehiculInmatriculare && showEditModal.vehiculNumarIntern && (
                    <span className="text-slate-500 font-mono">({showEditModal.vehiculInmatriculare})</span>
                  )}
                  {(showEditModal.vehiculMarca || showEditModal.vehiculModel) && (
                    <span className="text-slate-700 font-bold">
                      {showEditModal.vehiculMarca} {showEditModal.vehiculModel}
                    </span>
                  )}
                  {showEditModal.valoareContorLaExecutie > 0 && (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-mono font-bold border border-emerald-200">
                      ⚡ Contor: {showEditModal.valoareContorLaExecutie.toLocaleString('ro-RO')} {showEditModal.vehiculTipMasurare || 'KM'}
                    </span>
                  )}
                </div>
              </div>

              {/* QUICK HEADER ACTIONS */}
              <div className="flex items-center space-x-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setShowViewModal({
                      ...showEditModal,
                      mecanicResponsabil: editMecanici.join(', '),
                      observatii: editObservatii,
                      elementeComanda: editElemente,
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold border border-morning-300 flex items-center space-x-1.5 transition shadow-2xs"
                  title="Previzualizează fișa de atelier A4"
                >
                  <Printer className="w-3.5 h-3.5 text-sapphire-600" />
                  <span className="hidden sm:inline">Previzualizare A4</span>
                </button>

                <button
                  type="button"
                  onClick={toggleMaximize}
                  className="p-1.5 rounded-xl text-sage-500 hover:text-slate-800 hover:bg-morning-200 transition"
                  title={isMaximized ? 'Restaurează dimensiunea inițială' : 'Maximizează pe tot ecranul'}
                >
                  {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl text-sage-500 hover:text-rose-600 hover:bg-rose-50 transition"
                  title="Închide fereastra"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          bodyClassName="p-4 sm:p-6 space-y-5"
        >

            {/* MECANICI & OBSERVAȚII ACCORDION / BOX */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              {/* MECANICI */}
              <div className="lg:col-span-5 p-3.5 bg-morning-100/70 border border-morning-200 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sapphire-900 font-black text-xs flex items-center space-x-1.5">
                    <Users className="w-4 h-4 text-sapphire-500" />
                    <span>Mecanici Responsabili:</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddMecanicModal(true)}
                    className="text-[10px] text-sapphire-600 hover:underline font-bold flex items-center space-x-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>+ Mecanic</span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {mecaniciList.map((m) => {
                    const isSelected = editMecanici.includes(m.nume);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleEditMecanicSelection(m.nume)}
                        className={`px-2.5 py-1 rounded-xl font-bold text-[11px] flex items-center space-x-1 transition shadow-2xs ${
                          isSelected
                            ? 'bg-sapphire-500 text-white'
                            : 'bg-white text-slate-700 border border-morning-200 hover:bg-morning-200'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{m.nume}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* OBSERVAȚII */}
              <div className="lg:col-span-7 p-3.5 bg-morning-100/70 border border-morning-200 rounded-2xl space-y-1.5">
                <label className="text-sapphire-900 font-black text-xs block">
                  Descriere Lucrare / Observații Intervenție:
                </label>
                <textarea
                  rows={2}
                  value={editObservatii}
                  onChange={(e) => setEditObservatii(e.target.value)}
                  placeholder="ex: Schimb filtre și ulei, verificare frâne, constatare joc articulație dreapta..."
                  className="w-full bg-white border border-morning-200 rounded-xl p-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-sapphire-400 placeholder:text-sage-400"
                />
              </div>
            </div>

            {/* ─── BARA RAPIDĂ DE ADĂUGARE (QUICK-ADD TOOLBAR) ─── */}
            <div className="p-4 bg-gradient-to-br from-morning-100 via-white to-morning-100 border-2 border-sapphire-200/60 rounded-3xl space-y-3 shadow-sm">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <span className="p-1 rounded-lg bg-sapphire-500 text-white">
                    <Plus className="w-3.5 h-3.5" />
                  </span>
                  <span className="text-xs font-black text-sapphire-900 uppercase tracking-wider">
                    Adaugă Rapid Piese sau Manoperă pe Munkalap
                  </span>
                </div>
                <span className="text-[11px] text-sage-600 font-medium">
                  Selectați sursa, tastați denumirea și apăsați Enter sau „+ Adaugă”
                </span>
              </div>

              {/* TABS SURSĂ / PILON COST */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setQuickPilonCost('PIESA_STOC');
                    setQuickPretUnitar(quickSelectedArticol?.pretUnitar || 0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition ${
                    quickPilonCost === 'PIESA_STOC'
                      ? 'bg-sapphire-500 text-white shadow-sm shadow-sapphire-500/20'
                      : 'bg-white text-slate-600 border border-morning-200 hover:bg-morning-200'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>📦 Piesă din Stoc (FIFO)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickPilonCost('PIESA_DEZMEMBRATA');
                    setQuickSelectedArticol(null);
                    setQuickPretUnitar(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition ${
                    quickPilonCost === 'PIESA_DEZMEMBRATA'
                      ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                      : 'bg-white text-slate-600 border border-morning-200 hover:bg-morning-200'
                  }`}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>♻️ Dezmembrări (0 RON)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickPilonCost('PIESA_DIRECTA');
                    setQuickSelectedArticol(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition ${
                    quickPilonCost === 'PIESA_DIRECTA'
                      ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/20'
                      : 'bg-white text-slate-600 border border-morning-200 hover:bg-morning-200'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>🛒 Achiziție Directă</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickPilonCost('MANOPERA_INTERNA');
                    setQuickSelectedArticol(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition ${
                    quickPilonCost === 'MANOPERA_INTERNA'
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                      : 'bg-white text-slate-600 border border-morning-200 hover:bg-morning-200'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>👨‍🔧 Manoperă Atelier</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setQuickPilonCost('PRESTATIE_EXTERNA');
                    setQuickSelectedArticol(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5 transition ${
                    quickPilonCost === 'PRESTATIE_EXTERNA'
                      ? 'bg-slate-700 text-white shadow-sm shadow-slate-700/20'
                      : 'bg-white text-slate-600 border border-morning-200 hover:bg-morning-200'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>🏢 Prestație Externă</span>
                </button>
              </div>

              {/* INPUT BAR ROW */}
              <div className="space-y-2">
                {/* Category Chips when in Stock mode */}
                {quickPilonCost === 'PIESA_STOC' && (
                  <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-sage-600 font-bold flex-shrink-0 mr-1">Categorie:</span>
                    {availableStockCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setQuickSelectedCategory(cat)}
                        className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition ${
                          quickSelectedCategory === cat
                            ? 'bg-sapphire-600 text-white shadow-2xs'
                            : 'bg-white text-slate-600 border border-morning-200 hover:bg-morning-200'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
                  {/* MAIN INPUT / SEARCH COMBOBOX */}
                  <div className="md:col-span-6 relative">
                    <label className="text-[11px] font-bold text-sapphire-900 block mb-1">
                      {quickPilonCost === 'PIESA_STOC' ? '🔍 Caută Piesă în Magazia de Stoc:' :
                       quickPilonCost === 'PIESA_DEZMEMBRATA' ? '♻️ Denumire Piesă din Dezmembrări:' :
                       quickPilonCost === 'PIESA_DIRECTA' ? '🛒 Denumire Piesă Achiziționată Direct:' :
                       quickPilonCost === 'MANOPERA_INTERNA' ? '👨‍🔧 Denumire Operațiune / Lucrare:' :
                       '🏢 Denumire Serviciu Extern:'}
                    </label>

                    {quickPilonCost === 'PIESA_STOC' ? (
                      <div className="relative">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 pointer-events-none" />
                          <input
                            type="text"
                            value={quickSearchQuery}
                            onChange={(e) => {
                              setQuickSearchQuery(e.target.value);
                              setIsSearchDropdownOpen(true);
                            }}
                            onFocus={() => setIsSearchDropdownOpen(true)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (filteredStockList.length > 0) {
                                  const topItem = filteredStockList[0];
                                  setQuickSelectedArticol(topItem);
                                  setQuickDescriere(topItem.denumire);
                                  setQuickPretUnitar(topItem.pretUnitar || 0);
                                  setQuickSearchQuery(`${topItem.codArticol} — ${topItem.denumire}`);
                                  setIsSearchDropdownOpen(false);
                                }
                              }
                            }}
                            placeholder="Gépelj be nevet vagy cikkszámot (pl: LF16015, ulei, plăcuțe)..."
                            className="w-full pl-9 pr-8 py-2 bg-white border border-morning-300 rounded-xl text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 placeholder:text-sage-400 shadow-2xs"
                          />
                          {quickSearchQuery && (
                            <button
                              type="button"
                              onClick={() => {
                                setQuickSearchQuery('');
                                setQuickSelectedArticol(null);
                              }}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-slate-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* FLOATING SMART AUTOCOMPLETE DROPDOWN */}
                        {isSearchDropdownOpen && (
                          <>
                            <div
                              className="fixed inset-0 z-40"
                              onClick={() => setIsSearchDropdownOpen(false)}
                            />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-morning-200 rounded-2xl shadow-2xl max-h-72 overflow-y-auto divide-y divide-morning-100">
                              {filteredStockList.length > 0 ? (
                                filteredStockList.slice(0, 30).map((st) => {
                                  const inStock = Number(st.stocCurent || 0) > 0;
                                  const isSelected = quickSelectedArticol?.id === st.id;
                                  return (
                                    <div
                                      key={st.id}
                                      onClick={() => {
                                        setQuickSelectedArticol(st);
                                        setQuickDescriere(st.denumire);
                                        setQuickPretUnitar(st.pretUnitar || 0);
                                        setQuickSearchQuery(`${st.codArticol} — ${st.denumire}`);
                                        setIsSearchDropdownOpen(false);
                                      }}
                                      className={`p-2.5 cursor-pointer transition flex items-center justify-between hover:bg-sapphire-50/70 ${
                                        isSelected ? 'bg-sapphire-50 border-l-4 border-sapphire-500' : ''
                                      }`}
                                    >
                                      <div className="min-w-0 flex-1 mr-3 space-y-0.5">
                                        <div className="flex items-center space-x-2">
                                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono font-black text-[10px] border border-slate-200">
                                            {st.codArticol}
                                          </span>
                                          <span className="font-bold text-sapphire-900 text-xs truncate">
                                            {st.denumire}
                                          </span>
                                        </div>
                                        <div className="flex items-center space-x-2 text-[10px] text-sage-600">
                                          <span className="bg-morning-200 px-1.5 py-0.2 rounded font-medium">
                                            {st.categorie} {st.subcategorie ? `▸ ${st.subcategorie}` : ''}
                                          </span>
                                          {st.depozit?.nume && (
                                            <span>📍 {st.depozit.nume}</span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="text-right flex-shrink-0 space-y-0.5">
                                        <div>
                                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                                            inStock
                                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                                          }`}>
                                            {inStock ? `🟢 ${st.stocCurent} ${st.unitateMasura || 'buc'}` : '🔴 Epuizat (0)'}
                                          </span>
                                        </div>
                                        <div className="text-[11px] font-mono font-bold text-slate-700">
                                          {Number(st.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="p-4 text-center text-xs text-sage-500 font-medium">
                                  Nu s-au găsit piese în stoc pentru căutarea selectată.
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={quickDescriere}
                        onChange={(e) => setQuickDescriere(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddQuickElement();
                          }
                        }}
                        placeholder={
                          quickPilonCost === 'PIESA_DEZMEMBRATA' ? 'ex: Pompă servo recuperată din parc' :
                          quickPilonCost === 'PIESA_DIRECTA' ? 'ex: Set garnituri chiulasă (factură Bardi)' :
                          quickPilonCost === 'MANOPERA_INTERNA' ? 'ex: Înlocuire garnituri + aerisire sistem' :
                          'ex: Rectificare chiulasă atelier extern'
                        }
                        className="w-full px-3 py-2 bg-white border border-morning-300 rounded-xl text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 placeholder:text-sage-400 shadow-2xs"
                      />
                    )}
                  </div>

                  {/* CANTITATE STEPPER */}
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-sapphire-900 block mb-1">
                      Cantitate:
                    </label>
                    <div className="flex items-center bg-white border border-morning-300 rounded-xl shadow-2xs overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuickCantitate((prev) => Math.max(1, prev - 1))}
                        className="px-2 py-2 text-slate-500 hover:bg-morning-200 hover:text-slate-800 transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={quickCantitate}
                        onChange={(e) => setQuickCantitate(Math.max(1, Number(e.target.value)))}
                        className="w-full text-center py-1.5 font-mono font-extrabold text-xs text-sapphire-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (quickPilonCost === 'PIESA_STOC' && quickSelectedArticol) {
                            if (quickCantitate >= quickSelectedArticol.stocCurent) {
                              alert(`Stoc maxim atins: ${quickSelectedArticol.stocCurent} ${quickSelectedArticol.unitateMasura || 'buc'}`);
                              return;
                            }
                          }
                          setQuickCantitate((prev) => prev + 1);
                        }}
                        className="px-2 py-2 text-slate-500 hover:bg-morning-200 hover:text-slate-800 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* PREȚ UNITAR */}
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-bold text-sapphire-900 block mb-1">
                      Preț (RON):
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        disabled={quickPilonCost === 'PIESA_DEZMEMBRATA'}
                        value={quickPilonCost === 'PIESA_DEZMEMBRATA' ? 0 : quickPretUnitar}
                        onChange={(e) => setQuickPretUnitar(Number(e.target.value))}
                        className="w-full py-2 pl-2.5 pr-8 bg-white border border-morning-300 rounded-xl text-xs font-mono font-extrabold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 disabled:bg-slate-100 disabled:text-slate-400 shadow-2xs"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-sage-500 pointer-events-none">
                        RON
                      </span>
                    </div>
                  </div>

                  {/* SUBMIT QUICK ADD BUTTON */}
                  <div className="md:col-span-2">
                    <button
                      type="button"
                      onClick={() => handleAddQuickElement()}
                      className="w-full py-2 px-3 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-black text-xs shadow-md shadow-sapphire-500/20 flex items-center justify-center space-x-1.5 transition active:scale-98"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Adaugă</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── TABEL DEVIZ / ELEMENTE DE LUCRU ─── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-sapphire-600" />
                  <h3 className="text-xs font-black text-sapphire-900 uppercase tracking-wider">
                    Deviz Munkalap & Elemente Înregistrate ({editElemente.length})
                  </h3>
                </div>
                <span className="text-[11px] text-sage-600 font-semibold">
                  Toate elementele pot fi ajustate inline (cantitate, preț sau descriere)
                </span>
              </div>

              <div className="border border-morning-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-morning-100/90 sticky top-0 z-10 border-b border-morning-200 text-slate-700 font-extrabold">
                      <tr>
                        <th className="p-2.5 w-10 text-center">#</th>
                        <th className="p-2.5 w-44">Tip / Proveniență</th>
                        <th className="p-2.5">Descriere Piesă & Operațiune</th>
                        <th className="p-2.5 w-32 text-center">Cantitate</th>
                        <th className="p-2.5 w-28 text-right">Preț Unitar</th>
                        <th className="p-2.5 w-32 text-right">Total Rând</th>
                        <th className="p-2.5 w-12 text-center">Șterge</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-morning-100">
                      {editElemente.length > 0 ? (
                        editElemente.map((el, idx) => {
                          const stockItem = el.articolStocId ? stocuri.find((s) => s.id === el.articolStocId) : null;
                          const isExceeded = el.pilonCost === 'PIESA_STOC' && stockItem && el.cantitate > stockItem.stocCurent;
                          const rowTotal = (Number(el.cantitate) || 0) * (Number(el.pretUnitar) || 0);

                          return (
                            <tr
                              key={idx}
                              className={`hover:bg-morning-50/80 transition ${
                                isExceeded ? 'bg-rose-50/60' : ''
                              }`}
                            >
                              <td className="p-2.5 text-center font-bold text-slate-400 text-[11px]">
                                {idx + 1}
                              </td>

                              {/* PILON COST BADGE */}
                              <td className="p-2.5">
                                {el.pilonCost === 'PIESA_STOC' && (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-sapphire-50 text-sapphire-700 border border-sapphire-200 inline-flex items-center space-x-1">
                                    <span>📦 Stoc Intern</span>
                                  </span>
                                )}
                                {el.pilonCost === 'PIESA_DEZMEMBRATA' && (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center space-x-1">
                                    <span>♻️ Dezmembrări (0 RON)</span>
                                  </span>
                                )}
                                {el.pilonCost === 'PIESA_DIRECTA' && (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center space-x-1">
                                    <span>🛒 Achiziție Directă</span>
                                  </span>
                                )}
                                {el.pilonCost === 'MANOPERA_INTERNA' && (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 inline-flex items-center space-x-1">
                                    <span>👨‍🔧 Manoperă Atelier</span>
                                  </span>
                                )}
                                {el.pilonCost === 'PRESTATIE_EXTERNA' && (
                                  <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700 border border-slate-300 inline-flex items-center space-x-1">
                                    <span>🏢 Service Extern</span>
                                  </span>
                                )}
                              </td>

                              {/* DESCRIERE */}
                              <td className="p-2.5">
                                <div className="space-y-0.5">
                                  <input
                                    type="text"
                                    value={el.descriere}
                                    onChange={(e) => handleUpdateEditElementDesc(idx, e.target.value)}
                                    className="w-full font-bold text-sapphire-900 bg-transparent border-b border-transparent hover:border-morning-300 focus:border-sapphire-400 focus:outline-none text-xs"
                                  />
                                  {stockItem && (
                                    <div className="flex items-center space-x-2 text-[10px] text-sage-600">
                                      <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                                        COD: {stockItem.codArticol}
                                      </span>
                                      <span>📍 {stockItem.depozit?.nume || 'Magazie Centrală'}</span>
                                      <span className={stockItem.stocCurent > 0 ? 'text-emerald-700 font-semibold' : 'text-rose-700 font-semibold'}>
                                        (Disponibil: {stockItem.stocCurent} {stockItem.unitateMasura || 'buc'})
                                      </span>
                                    </div>
                                  )}
                                  {isExceeded && (
                                    <p className="text-[10px] text-rose-600 font-extrabold">
                                      ⚠️ Atenție: Cantitatea solicitată depășește stocul disponibil ({stockItem?.stocCurent})!
                                    </p>
                                  )}
                                </div>
                              </td>

                              {/* CANTITATE STEPPER INLINE */}
                              <td className="p-2.5 text-center">
                                <div className="inline-flex items-center bg-white border border-morning-300 rounded-lg overflow-hidden shadow-2xs">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateEditElementQty(idx, -1)}
                                    className="px-1.5 py-1 text-slate-500 hover:bg-morning-200 transition"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <input
                                    type="number"
                                    min="1"
                                    value={el.cantitate}
                                    onChange={(e) => {
                                      const updated = [...editElemente];
                                      updated[idx].cantitate = Math.max(1, Number(e.target.value));
                                      setEditElemente(updated);
                                    }}
                                    className="w-12 text-center py-1 font-mono font-bold text-xs text-sapphire-900 focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateEditElementQty(idx, 1)}
                                    className="px-1.5 py-1 text-slate-500 hover:bg-morning-200 transition"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>

                              {/* PREȚ UNITAR */}
                              <td className="p-2.5 text-right">
                                {el.pilonCost === 'PIESA_DEZMEMBRATA' ? (
                                  <span className="text-[11px] font-mono text-slate-400 font-bold">0,00 RON</span>
                                ) : (
                                  <div className="inline-flex items-center space-x-1 justify-end">
                                    <input
                                      type="number"
                                      value={el.pretUnitar}
                                      onChange={(e) => handleUpdateEditElementPrice(idx, Number(e.target.value))}
                                      className="w-20 text-right py-1 px-1.5 bg-white border border-morning-200 rounded-lg text-xs font-mono font-bold text-sapphire-900 focus:outline-none focus:ring-1 focus:ring-sapphire-400"
                                    />
                                    <span className="text-[10px] text-sage-500 font-bold">RON</span>
                                  </div>
                                )}
                              </td>

                              {/* TOTAL RÂND */}
                              <td className="p-2.5 text-right font-mono font-black text-sapphire-900 text-xs whitespace-nowrap">
                                {rowTotal.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                              </td>

                              {/* TRASH BUTTON */}
                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveEditElement(idx)}
                                  className="p-1.5 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 rounded-lg transition"
                                  title="Șterge tétel din deviz"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={7} className="p-8 text-center text-sage-500 space-y-2">
                            <Package className="w-8 h-8 text-sage-300 mx-auto" />
                            <p className="font-bold text-xs">Nicio piesă sau manoperă adăugată pe acest munkalap.</p>
                            <p className="text-[11px] text-sage-400">
                              Folosiți bara rapidă de mai sus pentru a adăuga piese din depozit, piese din dezmembrări sau manoperă.
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ─── TOTAL DEVIZ ÖSSZESÍTŐ SÁV (REAL-TIME SUMMARY) ─── */}
            <div className="p-4 bg-morning-100/90 border border-morning-200 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto text-xs">
                <div className="bg-white p-2.5 rounded-xl border border-morning-200">
                  <span className="text-[10px] text-sage-600 font-bold block uppercase tracking-wider">📦 Piese Stoc ({bucatiDevizStoc} buc):</span>
                  <span className="font-mono font-black text-sapphire-900 text-xs">
                    {totalDevizPieseStoc.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-morning-200">
                  <span className="text-[10px] text-sage-600 font-bold block uppercase tracking-wider">♻️ Dezmembrări ({bucatiDevizDezmembrari} buc):</span>
                  <span className="font-mono font-black text-emerald-700 text-xs">
                    0,00 RON <span className="text-[10px] font-normal text-emerald-600">(Recuperat)</span>
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-morning-200">
                  <span className="text-[10px] text-sage-600 font-bold block uppercase tracking-wider">🛒 Achiziții Directe:</span>
                  <span className="font-mono font-black text-amber-800 text-xs">
                    {totalDevizDirecte.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                  </span>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-morning-200">
                  <span className="text-[10px] text-sage-600 font-bold block uppercase tracking-wider">👨‍🔧 Manoperă Atelier:</span>
                  <span className="font-mono font-black text-indigo-900 text-xs">
                    {totalDevizManopera.toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                  </span>
                </div>
              </div>

              {/* VÉGÖSSZEG KIEMELT DOBOZ */}
              <div className="bg-sapphire-900 text-white px-5 py-3 rounded-2xl shadow-md text-right w-full md:w-auto flex-shrink-0 flex md:flex-col items-center md:end justify-between">
                <span className="text-[10px] text-sapphire-200 font-extrabold uppercase tracking-widest block">
                  Total General Comandă:
                </span>
                <span className="text-xl font-black font-mono tracking-tight text-white">
                  {totalGeneralDeviz.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                </span>
              </div>
            </div>

            {/* ─── LÁBLÉC MŰVELETI GOMBOK (FOOTER ACTIONS) ─── */}
            <div className="flex flex-col sm:flex-row items-center justify-between pt-3 border-t border-morning-200 gap-3">
              <div className="text-[11px] text-sage-600 font-medium">
                {editElemente.length > 0
                  ? `Comanda conține ${editElemente.length} poziții în deviz.`
                  : 'Nicio poziție înregistrată încă.'}
              </div>

              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end flex-wrap gap-y-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(null)}
                  className="px-4 py-2 rounded-xl bg-morning-200 hover:bg-morning-300 text-slate-700 font-bold text-xs transition"
                >
                  Anulează
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-white border border-sapphire-400 text-sapphire-700 hover:bg-sapphire-50 font-black text-xs shadow-2xs flex items-center space-x-1.5 transition"
                >
                  <span>💾 Salvează ca Piszkozat</span>
                </button>

                <button
                  type="button"
                  disabled={isSavingAndFinalizing}
                  onClick={handleSaveAndFinalize}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition active:scale-98"
                >
                  {isSavingAndFinalizing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Se finalizează...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Salvează & Finalizează (FIFO)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
        </DraggableModal>
      )}

      {/* ─── MODAL VIZUALIZARE & NYOMTATÁS A4 (PDF PRINT TEMPLATE) ─── */}
      {showViewModal && (
        <DraggableModal
          isOpen={!!showViewModal}
          onClose={() => setShowViewModal(null)}
          defaultWidth={960}
          defaultHeight={820}
          minWidth={550}
          minHeight={400}
          title={`Previzualizare Fișă A4 (Comandă ${showViewModal.numarComanda})`}
          icon={<FileText className="w-5 h-5 text-sapphire-500" />}
          headerActions={
            <button
              type="button"
              onClick={handlePrintDocument}
              className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 flex items-center space-x-2 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Printează / Salvează PDF</span>
            </button>
          }
          bodyClassName="p-4 sm:p-6 bg-slate-100/60"
        >
          {/*  PRINTABLE A4 SHEET VIEW  */}
          <div id="printable-a4-area" className="p-8 bg-white border border-slate-200 rounded-xl space-y-6 text-slate-800 font-sans shadow-xs">
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
        </DraggableModal>
      )}

      {/* MODAL ADĂUGARE PIESĂ SUPLIMENTARĂ */}
      {showAddElementModal && (
        <DraggableModal
          isOpen={!!showAddElementModal}
          onClose={() => setShowAddElementModal(null)}
          defaultWidth={520}
          defaultHeight={540}
          minWidth={380}
          minHeight={320}
          title={`Adăugare Piesă pe Comanda ${showAddElementModal.numarComanda}`}
          icon={<Package className="w-5 h-5 text-sapphire-600" />}
          bodyClassName="p-5"
        >
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
                            <span>Stoc insuficient! Disponibil: {currentElemStockItem.stocCurent} {currentElemStockItem.unitateMasura || 'buc'}</span>
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
        </DraggableModal>
      )}

      {/* Modal Adaugă Comandă de Lucru Nouă */}
      {showAddModal && (
        <DraggableModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          defaultWidth={720}
          defaultHeight={780}
          minWidth={440}
          minHeight={380}
          title="Deschidere Comandă de Lucru Nouă"
          icon={<Truck className="w-5 h-5 text-sapphire-600" />}
          bodyClassName="p-5 sm:p-6"
        >
          <form onSubmit={handleCreateComanda} className="space-y-3 text-xs">
              {/* ─── SELECTOR INTELIGENT UTILAJ (SMART VEHICLE SELECTOR) ─── */}
              {(() => {
                const selectedVehicul = vehicule.find((v) => v.id === selectedVehiculId);
                return (
                  <div className="p-3.5 bg-morning-100/90 border border-morning-200 rounded-2xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-sapphire-900 font-extrabold flex items-center space-x-1.5 text-xs">
                        <Truck className="w-4 h-4 text-sapphire-500" />
                        <span>Selectează Utilaj din Flotă:</span>
                      </label>
                      {selectedVehicul && (
                        <button
                          type="button"
                          onClick={() => setIsVehiculSearchOpen(!isVehiculSearchOpen)}
                          className="text-[11px] font-bold text-sapphire-600 hover:text-sapphire-800 hover:underline flex items-center space-x-1"
                        >
                          <Search className="w-3.5 h-3.5" />
                          <span>{isVehiculSearchOpen ? 'Închide căutarea' : 'Schimbă utilajul'}</span>
                        </button>
                      )}
                    </div>

                    {/* KÁRTYA: KIVÁLASZTOTT JÁRMŰ (ha nincs megnyitva a kereső) */}
                    {selectedVehicul && !isVehiculSearchOpen ? (
                      <div
                        onClick={() => setIsVehiculSearchOpen(true)}
                        className="p-3 bg-white border border-morning-300 hover:border-sapphire-400 rounded-xl flex items-center justify-between shadow-2xs cursor-pointer transition group"
                        title="Kattintson az utilaj módosításához"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-sapphire-50 group-hover:bg-sapphire-100 text-sapphire-600 border border-sapphire-200 flex items-center justify-center text-xl flex-shrink-0 transition">
                            {getCategoryIcon(selectedVehicul.categorieEnum)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-black text-sapphire-900 text-sm">
                                {selectedVehicul.numarInmatriculare || selectedVehicul.numarIntern}
                              </span>
                              {selectedVehicul.numarIntern && selectedVehicul.numarIntern !== selectedVehicul.numarInmatriculare && (
                                <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono font-bold">
                                  Nr. {selectedVehicul.numarIntern}
                                </span>
                              )}
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-morning-200 text-slate-700">
                                {getCategoryLabel(selectedVehicul.categorieEnum)}
                              </span>
                            </div>
                            <p className="text-xs text-sage-600 font-medium truncate">
                              {selectedVehicul.marca} {selectedVehicul.model} {selectedVehicul.anFabricatie ? `(${selectedVehicul.anFabricatie})` : ''}
                            </p>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0 ml-3 space-y-0.5">
                          <div className="text-xs font-mono font-black text-sapphire-900">
                            {Number(selectedVehicul.valoareContorCurent || 0).toLocaleString('ro-RO')} {selectedVehicul.tipMasurare || 'KM'}
                          </div>
                          {getVehiculContorDate(selectedVehicul) && (
                            <div className="text-[10px] text-sage-600 font-bold">
                              (înregistrat: {getVehiculContorDate(selectedVehicul)})
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      /* KERESŐ ÉS KATEGÓRIA VÁLASZTÓ DOBOZ */
                      <div className="space-y-2.5 pt-1">
                        {/* Kategória gyorsszűrő gombok */}
                        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px]">
                          <span className="text-sage-600 font-bold flex-shrink-0 mr-1">Categorie:</span>
                          {availableVehiculeCategories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => setVehiculCategoryFilter(cat)}
                              className={`px-2 py-0.5 rounded-lg font-bold whitespace-nowrap transition ${
                                vehiculCategoryFilter === cat
                                  ? 'bg-sapphire-600 text-white shadow-2xs'
                                  : 'bg-white text-slate-600 border border-morning-200 hover:bg-morning-200'
                              }`}
                            >
                              {cat === 'TOATE' ? 'Toate Flota' : `${getCategoryIcon(cat)} ${getCategoryLabel(cat)}`}
                            </button>
                          ))}
                        </div>

                        {/* Élő kereső mező */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400 pointer-events-none" />
                          <input
                            type="text"
                            value={vehiculSearchQuery}
                            onChange={(e) => setVehiculSearchQuery(e.target.value)}
                            placeholder="Caută după număr înmatriculare, număr intern sau marcă (ex: CV 06 BNW, MAN, Fabia)..."
                            autoFocus
                            className="w-full pl-9 pr-8 py-2 bg-white border border-morning-300 rounded-xl text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-400 placeholder:text-sage-400 shadow-2xs"
                          />
                          {vehiculSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setVehiculSearchQuery('')}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sage-400 hover:text-slate-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Találati lista */}
                        <div className="max-h-52 overflow-y-auto divide-y divide-morning-100 bg-white border border-morning-200 rounded-xl shadow-inner">
                          {filteredVehiculeList.length > 0 ? (
                            filteredVehiculeList.map((v) => {
                              const isSelected = v.id === selectedVehiculId;
                              const vDate = getVehiculContorDate(v);
                              return (
                                <div
                                  key={v.id}
                                  onClick={() => {
                                    handleSelectVehicul(v.id);
                                    setIsVehiculSearchOpen(false);
                                  }}
                                  className={`p-2.5 cursor-pointer transition flex items-center justify-between hover:bg-sapphire-50/70 ${
                                    isSelected ? 'bg-sapphire-50 border-l-4 border-sapphire-500 font-bold' : ''
                                  }`}
                                >
                                  <div className="flex items-center space-x-2.5 min-w-0 mr-2">
                                    <span className="text-lg flex-shrink-0">{getCategoryIcon(v.categorieEnum)}</span>
                                    <div className="min-w-0 space-y-0.5">
                                      <div className="flex items-center space-x-2">
                                        <span className="font-black text-sapphire-900 text-xs">
                                          {v.numarInmatriculare || v.numarIntern}
                                        </span>
                                        {v.numarIntern && v.numarIntern !== v.numarInmatriculare && (
                                          <span className="text-[10px] px-1 py-0.2 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono font-bold">
                                            Nr. {v.numarIntern}
                                          </span>
                                        )}
                                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-morning-200 text-slate-700">
                                          {getCategoryLabel(v.categorieEnum)}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-sage-600 font-medium truncate">
                                        {v.marca} {v.model}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right flex-shrink-0 space-y-0.5">
                                    <div className="font-mono font-extrabold text-sapphire-900 text-xs">
                                      {Number(v.valoareContorCurent || 0).toLocaleString('ro-RO')} {v.tipMasurare || 'KM'}
                                    </div>
                                    {vDate && (
                                      <div className="text-[10px] text-sage-500 font-medium">
                                        ({vDate})
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center text-xs text-sage-500 font-medium">
                              Nu s-a găsit niciun utilaj conform căutării.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* INDEX KM / ORE FUNCȚIONARE CÂMP OBLIGATORIU (CU SUPORT DEDICAT SEMIREMORCI) */}
              {(() => {
                const selV = vehicule.find((v) => v.id === selectedVehiculId);
                const isTrailer = selV?.categorieEnum === 'REMORCA' || selV?.categorieEnum === 'SEMIREMORCA' || selV?.categorieEnum?.includes('REMORCA');
                const coupledTractor = selV?.cuplariSemiremorca?.[0]?.capTractor;
                const currentContor = selV?.valoareContorCurent || 0;
                const selVDate = getVehiculContorDate(selV);
                const isLower = selV && !isTrailer && valoareContorExecutie > 0 && Number(valoareContorExecutie) < currentContor;

                return (
                  <div className="space-y-2">
                    {isTrailer && (
                      <div className="p-3 rounded-2xl border bg-amber-50/90 border-amber-300 space-y-2 text-xs">
                        <div className="flex items-center space-x-2 text-amber-900 font-extrabold">
                          <Truck className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span>Semiremorcă / Remorcă (Fără odometru propriu pe șasiu)</span>
                        </div>

                        {coupledTractor ? (
                          <div className="p-2.5 bg-white rounded-xl border border-amber-200 flex items-center justify-between shadow-xs">
                            <div>
                              <p className="text-[10px] text-sage-600 font-bold uppercase tracking-wider"> Cuplat Activ la Cap Tractor:</p>
                              <p className="font-extrabold text-sapphire-900">
                                {coupledTractor.numarInmatriculare || coupledTractor.numarIntern} {coupledTractor.numarIntern && coupledTractor.numarIntern !== coupledTractor.numarInmatriculare ? `(Nr. ${coupledTractor.numarIntern})` : ''} — {coupledTractor.marca} {coupledTractor.model}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setValoareContorExecutie(coupledTractor.valoareContorCurent || 0)}
                              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold shadow-xs transition flex items-center space-x-1"
                            >
                              <span>Preia KM: {Number(coupledTractor.valoareContorCurent || 0).toLocaleString('ro-RO')} KM</span>
                              {getVehiculContorDate(coupledTractor) && (
                                <span className="opacity-90 font-normal">({getVehiculContorDate(coupledTractor)})</span>
                              )}
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
                              .map((tr) => {
                                const trDate = getVehiculContorDate(tr);
                                const trPlate = tr.numarIntern && tr.numarIntern !== tr.numarInmatriculare
                                  ? `${tr.numarInmatriculare} (Nr. ${tr.numarIntern})`
                                  : (tr.numarInmatriculare || tr.numarIntern);
                                return (
                                  <option key={tr.id} value={tr.id}>
                                    {trPlate} — {tr.marca} {tr.model} • Contor: {Number(tr.valoareContorCurent || 0).toLocaleString('ro-RO')} KM {trDate ? `(${trDate})` : ''}
                                  </option>
                                );
                              })}
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
                        {!isTrailer && (
                          <span className="font-extrabold text-sapphire-700">
                            {Number(currentContor || 0).toLocaleString('ro-RO')} {selV?.tipMasurare || 'KM/mTH'}
                            {selVDate && <span className="text-slate-600 font-bold ml-1 font-sans">(înregistrat la: {selVDate})</span>}
                          </span>
                        )}
                      </p>
                      {isLower && (
                        <div className="mt-1.5 p-2 bg-amber-100 border border-amber-300 rounded-xl text-amber-900 text-xs font-bold flex items-center space-x-1.5 animate-pulse">
                          <span>ATENȚIE: Valoarea introdusă ({valoareContorExecutie} {selV?.tipMasurare}) este MAI MICĂ decât ultimul contor înregistrat ({currentContor} {selV?.tipMasurare})! Se va salva ca o corecție manuală.</span>
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


              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 disabled:opacity-50 text-white font-bold shadow-md shadow-sapphire-500/20 flex items-center space-x-2 transition"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Se deschide comanda...</span>
                    </>
                  ) : (
                    <span>Deschide comanda de lucru</span>
                  )}
                </button>
              </div>
            </form>
        </DraggableModal>
      )}

      {/* Modal Adaugă Mecanic Nou */}
      {showAddMecanicModal && (
        <DraggableModal
          isOpen={showAddMecanicModal}
          onClose={() => setShowAddMecanicModal(false)}
          defaultWidth={460}
          defaultHeight={360}
          minWidth={360}
          minHeight={280}
          title="Adăugare Mecanic Nou"
          icon={<UserPlus className="w-5 h-5 text-sapphire-600" />}
          bodyClassName="p-5"
        >
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
        </DraggableModal>
      )}
    </div>
  );
}
