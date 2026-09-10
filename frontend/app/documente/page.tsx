"use client";

import { API_BASE_URL } from '@/lib/api';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FileCheck, FileText, AlertTriangle, CheckCircle2, Clock, X,
  Search, RotateCcw, Plus, Download, Eye, Upload, Trash2, Edit3,
  RefreshCw, ShieldAlert, Truck, ExternalLink, Calendar, DollarSign,
  Filter, Paperclip, ChevronRight, Check, ArrowUp, ArrowDown, ArrowUpDown,
  Image as ImageIcon
} from 'lucide-react';
import { showConfirm, showSuccess, showError } from '@/lib/swal';
import { useAuth } from '@/lib/AuthContext';

// Tipuri de documente suportate și configurarea lor vizuală
const DOC_TYPES_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  TOATE:                { label: 'Toate Actele',         bg: 'bg-slate-100',    text: 'text-slate-700',      border: 'border-slate-300' },
  ITP:                  { label: 'I.T.P.',               bg: 'bg-blue-100',     text: 'text-blue-800',       border: 'border-blue-300' },
  RCA:                  { label: 'Asigurare RCA',        bg: 'bg-emerald-100',  text: 'text-emerald-800',    border: 'border-emerald-300' },
  ROVINIETA:            { label: 'Rovinietă',            bg: 'bg-amber-100',    text: 'text-amber-800',      border: 'border-amber-300' },
  COPIE_CONFORMA:       { label: 'Copie Conformă',       bg: 'bg-purple-100',   text: 'text-purple-800',     border: 'border-purple-300' },
  VERIFICARE_TAHOGRAF:  { label: 'Tahograf',             bg: 'bg-cyan-100',     text: 'text-cyan-800',       border: 'border-cyan-300' },
  CASCO:                { label: 'Poliță CASCO',         bg: 'bg-indigo-100',   text: 'text-indigo-800',     border: 'border-indigo-300' },
  ALTELE:               { label: 'Alte Documente',       bg: 'bg-morning-200',  text: 'text-sapphire-800',   border: 'border-morning-300' },
};

export default function DocumenteVehiculePage() {
  const { authFetch } = useAuth();
  const safeFetch = authFetch || fetch;

  const [documente, setDocumente] = useState<any[]>([]);
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<any>(null);

  // Filtre
  const [selectedTip, setSelectedTip] = useState('TOATE');
  const [selectedStatus, setSelectedStatus] = useState<'TOATE' | 'EXPIRATE' | 'AVERTIZARE' | 'OPTIM'>('TOATE');
  const [selectedVehiculId, setSelectedVehiculId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Sortare
  const [sortField, setSortField] = useState<'vehicul' | 'tip' | 'serie' | 'expirare' | 'zile' | 'act'>('zile');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (field: 'vehicul' | 'tip' | 'serie' | 'expirare' | 'zile' | 'act') => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Modal Adăugare / Editare
  const [showModal, setShowModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [canChangeVehicul, setCanChangeVehicul] = useState(false);

  // Formular Document
  const [formVehiculId, setFormVehiculId] = useState('');
  const [formTip, setFormTip] = useState('ITP');
  const [formTipCustom, setFormTipCustom] = useState('');
  const [formSerie, setFormSerie] = useState('');
  const [formEmitent, setFormEmitent] = useState('');
  const [formDataEmitere, setFormDataEmitere] = useState('');
  const [formDataExpirare, setFormDataExpirare] = useState('');
  const [formZileAvertizare, setFormZileAvertizare] = useState(30);
  const [formCost, setFormCost] = useState<number | ''>('');
  const [formObservatii, setFormObservatii] = useState('');

  // Upload Fișier Scanat
  const [formFisierUrl, setFormFisierUrl] = useState('');
  const [formFisierNume, setFormFisierNume] = useState('');
  const [formFisierMarime, setFormFisierMarime] = useState<number | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const odsFileInputRef = useRef<HTMLInputElement>(null);

  // Modal Previzualizare Fișier
  const [previewFisier, setPreviewFisier] = useState<{
    docId?: string;
    url: string;
    nume: string;
    vehiculNumar?: string;
    tipDocument?: string;
  } | null>(null);
  const [isDeletingFisier, setIsDeletingFisier] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resDocs, resVeh] = await Promise.all([
        safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule`),
        safeFetch(`${API_BASE_URL}/vehicule`),
      ]);
      if (resDocs.ok) setDocumente(await resDocs.json());
      if (resVeh.ok) setVehicule(await resVeh.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Import automat din ODS local
  const handleImportOdsDefault = async () => {
    const confirmed = await showConfirm(
      'Import Documente din ODS',
      'Doriți să importați automat cele 202 documente de valabilitate din fișierul "Valabilitate acte masini 2025.ods" aflat în Downloads?',
      'Da, importă acum',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      setIsImporting(true);
      const res = await fetch(`${API_BASE_URL}/anomalii/documente-vehicule/import-ods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        const result = await res.json();
        setImportStatus(result);
        alert(`Import finalizat cu succes!\n- Vehicule noi create în flotă: ${result.vehiculeNoiCreate}\n- Documente noi importate: ${result.documenteNoiImportate}\n- Documente actualizate: ${result.documenteActualizate}`);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare la import: ${err.message || 'Verificați existența fișierului ODS'}`);
      }
    } catch (e) {
      alert('Eroare la comunicarea cu serverul pentru importul ODS.');
    } finally {
      setIsImporting(false);
    }
  };

  // Upload ODS file direct
  const handleUploadOdsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsImporting(true);
      const res = await fetch(`${API_BASE_URL}/anomalii/documente-vehicule/upload-ods`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const result = await res.json();
        setImportStatus(result);
        alert(`Import din fișier finalizat!\n- Vehicule noi: ${result.vehiculeNoiCreate}\n- Documente noi: ${result.documenteNoiImportate}\n- Documente actualizate: ${result.documenteActualizate}`);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut importa fișierul'}`);
      }
    } catch (e) {
      alert('Eroare la încărcarea fișierului ODS.');
    } finally {
      setIsImporting(false);
      if (odsFileInputRef.current) odsFileInputRef.current.value = '';
    }
  };

  // Upload fișier scanat atașat documentului
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadingFile(true);
      const res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule/upload`, {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormFisierUrl(data.fisierUrl);
        setFormFisierNume(data.fisierNume);
        setFormFisierMarime(data.fisierMarime);
      } else {
        await showError('Eroare Upload', 'Nu s-a putut încărca fișierul selectat.');
      }
    } catch (e) {
      await showError('Eroare Rețea', 'Eroare de rețea la încărcarea fișierului.');
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOpenAddModal = (vehiculIdParam?: string, tipParam?: string) => {
    setEditingDoc(null);
    setCanChangeVehicul(true);
    setFormVehiculId(vehiculIdParam || (vehicule[0]?.id || ''));
    setFormTip(tipParam || 'ITP');
    setFormTipCustom('');
    setFormSerie('');
    setFormEmitent('');
    setFormDataEmitere('');
    setFormDataExpirare('');
    setFormZileAvertizare(30);
    setFormCost('');
    setFormObservatii('');
    setFormFisierUrl('');
    setFormFisierNume('');
    setFormFisierMarime(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (doc: any) => {
    setEditingDoc(doc);
    setCanChangeVehicul(false);
    setFormVehiculId(doc.vehiculId);
    if (DOC_TYPES_CONFIG[doc.tipDocument]) {
      setFormTip(doc.tipDocument);
      setFormTipCustom('');
    } else {
      setFormTip('ALTELE');
      setFormTipCustom(doc.tipDocument);
    }
    setFormSerie(doc.serieDocument || '');
    setFormEmitent(doc.emitent || '');
    setFormDataEmitere(doc.dataEmitere ? doc.dataEmitere.split('T')[0] : '');
    setFormDataExpirare(doc.dataExpirare ? doc.dataExpirare.split('T')[0] : '');
    setFormZileAvertizare(doc.zileAvertizareInainte ?? 30);
    setFormCost(doc.cost !== null && doc.cost !== undefined ? doc.cost : '');
    setFormObservatii(doc.observatii || '');
    setFormFisierUrl(doc.fisierUrl || '');
    setFormFisierNume(doc.fisierNume || '');
    setFormFisierMarime(doc.fisierMarime || null);
    setShowModal(true);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehiculId || !formDataExpirare) {
      await showError('Date incomplete', 'Vă rugăm să selectați vehiculul și data expirării.');
      return;
    }

    const tipFinal = formTip === 'ALTELE' ? (formTipCustom.trim() || 'DOCUMENT') : formTip;

    try {
      const payload: any = {
        vehiculId: formVehiculId,
        tipDocument: tipFinal,
        dataExpirare: formDataExpirare,
        dataEmitere: formDataEmitere || null,
        zileAvertizareInainte: Number(formZileAvertizare),
        serieDocument: formSerie.trim() || null,
        emitent: formEmitent.trim() || null,
        cost: formCost !== '' ? Number(formCost) : null,
        observatii: formObservatii.trim() || null,
        fisierUrl: formFisierUrl || null,
        fisierNume: formFisierNume || null,
        fisierMarime: formFisierMarime || null,
      };

      let res;
      if (editingDoc) {
        res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule/${editingDoc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        await showSuccess(
          'Succes',
          `Documentul a fost ${editingDoc ? 'actualizat' : 'înregistrat'} cu succes!`
        );
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        await showError('Eroare', err.message || 'Verificați datele introduse');
      }
    } catch (e) {
      await showError('Eroare', 'Eroare la salvarea documentului.');
    }
  };

  // Ștergere întreg document (cu confirmare)
  const handleDeleteDoc = async (id: string, denumire: string) => {
    const confirmed = await showConfirm(
      'Ștergere Document',
      `Sigur doriți să ștergeți documentul "${denumire}"?\n\nBiztosan törölni szeretnéd ezt a dokumentumot?`,
      'Da, șterge',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (previewFisier?.docId === id) {
          setPreviewFisier(null);
        }
        await showSuccess('Document Șters', `Documentul "${denumire}" a fost șters cu succes!`);
        fetchData();
      } else {
        await showError('Eroare', 'Eroare la ștergerea documentului de pe server.');
      }
    } catch (e) {
      await showError('Eroare Conexiune', 'Eroare de conexiune la server.');
    }
  };

  // Ștergere fișier atașat de la document (cu confirmare)
  const handleDeleteFisier = async (docId: string, numeFisier: string) => {
    const confirmed = await showConfirm(
      'Ștergere Fișier Atașat',
      `Sigur doriți să ștergeți fișierul atașat "${numeFisier}"?\n\nBiztosan törölni szeretnéd a csatolt dokumentumot? Fișierul va fi șters definitiv de pe server.`,
      'Da, șterge fișierul',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      setIsDeletingFisier(true);
      const res = await safeFetch(`${API_BASE_URL}/anomalii/documente-vehicule/${docId}/fisier`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (previewFisier?.docId === docId) {
          setPreviewFisier(null);
        }
        await showSuccess('Fișier Șters', 'Fișierul atașat a fost șters cu succes de pe server.');
        fetchData();
      } else {
        await showError('Eroare', 'Nu s-a putut șterge fișierul de pe server.');
      }
    } catch (e) {
      await showError('Eroare Conexiune', 'A apărut o problemă la comunicarea cu serverul.');
    } finally {
      setIsDeletingFisier(false);
    }
  };

  // Calcule statistici
  const totalDocs = documente.length;
  const expirateDocs = documente.filter((d) => d.esteExpirat).length;
  const avertizareDocs = documente.filter((d) => d.esteInAvertizare || d.statusCalculat === 'CRITIC').length;
  const cuFisierDocs = documente.filter((d) => !!d.fisierUrl).length;

  // Filtrare lista
  const documenteFiltrate = documente.filter((d) => {
    const matchTip = selectedTip === 'TOATE' || d.tipDocument === selectedTip;
    let matchStatus = true;
    if (selectedStatus === 'EXPIRATE') matchStatus = d.esteExpirat;
    else if (selectedStatus === 'AVERTIZARE') matchStatus = d.esteInAvertizare || d.statusCalculat === 'CRITIC';
    else if (selectedStatus === 'OPTIM') matchStatus = d.statusCalculat === 'OPTIM';

    const matchVehicul = !selectedVehiculId || d.vehiculId === selectedVehiculId;

    const q = searchQuery.toLowerCase().trim();
    const matchSearch =
      !q ||
      (d.vehicul?.numarIntern || '').toLowerCase().includes(q) ||
      (d.vehicul?.numarInmatriculare || '').toLowerCase().includes(q) ||
      (d.tipDocument || '').toLowerCase().includes(q) ||
      (d.serieDocument || '').toLowerCase().includes(q) ||
      (d.emitent || '').toLowerCase().includes(q) ||
      (d.observatii || '').toLowerCase().includes(q);

    return matchTip && matchStatus && matchVehicul && matchSearch;
  });

  // Sortare vehicule
  const vehiculeSortate = [...vehicule].sort((a, b) => {
    const regA = (a.numarInmatriculare || a.numarIntern || '').toLowerCase();
    const regB = (b.numarInmatriculare || b.numarIntern || '').toLowerCase();
    return regA.localeCompare(regB, 'ro');
  });

  // Sortare lista
  const documenteSortate = [...documenteFiltrate].sort((a, b) => {
    let comparison = 0;
    if (sortField === 'vehicul') {
      const regA = (a.vehicul?.numarInmatriculare || a.vehicul?.numarIntern || '').toLowerCase();
      const regB = (b.vehicul?.numarInmatriculare || b.vehicul?.numarIntern || '').toLowerCase();
      comparison = regA.localeCompare(regB, 'ro');
    } else if (sortField === 'tip') {
      const tipA = (a.tipDocument || '').toLowerCase();
      const tipB = (b.tipDocument || '').toLowerCase();
      comparison = tipA.localeCompare(tipB, 'ro');
    } else if (sortField === 'serie') {
      const sA = (a.serieDocument || a.emitent || '').toLowerCase();
      const sB = (b.serieDocument || b.emitent || '').toLowerCase();
      comparison = sA.localeCompare(sB, 'ro');
    } else if (sortField === 'expirare') {
      const timeA = new Date(a.dataExpirare).getTime();
      const timeB = new Date(b.dataExpirare).getTime();
      comparison = timeA - timeB;
    } else if (sortField === 'zile') {
      comparison = (a.zileRamase ?? 0) - (b.zileRamase ?? 0);
    } else if (sortField === 'act') {
      const actA = a.fisierUrl ? 1 : 0;
      const actB = b.fisierUrl ? 1 : 0;
      comparison = actB - actA;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const renderSortIcon = (field: 'vehicul' | 'tip' | 'serie' | 'expirare' | 'zile' | 'act') => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 opacity-40 group-hover:opacity-100 transition shrink-0" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-sapphire-600 shrink-0" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-sapphire-600 shrink-0" />
    );
  };

  const hasActiveFilters = selectedTip !== 'TOATE' || selectedStatus !== 'TOATE' || selectedVehiculId || searchQuery;

  return (
    <div className="space-y-5">
      {/* ANTET PAGINĂ & ACȚIUNI RAPIDE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-sapphire-900 tracking-tight flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
              <FileCheck className="w-6 h-6" />
            </div>
            <span>Valabilitate Acte Mașini & Documente Flotă</span>
          </h1>
          <p className="text-xs text-sage-600 font-medium mt-1">
            Centralizator complet: ITP, Asigurare RCA, Rovinietă, Copie Conformă, Tahograf & Casco cu atașare acte scanate
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2 self-start md:self-auto">

          {/* Adăugare Document Manual */}
          <button
            type="button"
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>+ Adaugă Document Nou</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-sapphire-500">
          <div>
            <p className="text-[10px] uppercase font-black text-sapphire-700 tracking-wider">Total Documente</p>
            <p className="text-3xl font-black text-sapphire-900 font-mono mt-0.5">{totalDocs}</p>
            <p className="text-[11px] text-sage-600 font-semibold">monitorizate activ</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center text-sapphire-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-terracotta-500">
          <div>
            <p className="text-[10px] uppercase font-black text-terracotta-600 tracking-wider">Documente Expirate</p>
            <p className="text-3xl font-black text-terracotta-600 font-mono mt-0.5">{expirateDocs}</p>
            <p className="text-[11px] text-sage-600 font-semibold">acțiune imediată</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-roseash-100 border border-roseash-300 flex items-center justify-center text-terracotta-600">
            <AlertTriangle className="w-5 h-5 animate-bounce" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-amber-400">
          <div>
            <p className="text-[10px] uppercase font-black text-amber-700 tracking-wider">Expiră în Prealabil</p>
            <p className="text-3xl font-black text-amber-700 font-mono mt-0.5">{avertizareDocs}</p>
            <p className="text-[11px] text-sage-600 font-semibold">sub 30 de zile</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="pleasant-card p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-emerald-500">
          <div>
            <p className="text-[10px] uppercase font-black text-emerald-700 tracking-wider">Acte Scanate Atașate</p>
            <p className="text-3xl font-black text-emerald-800 font-mono mt-0.5">{cuFisierDocs}</p>
            <p className="text-[11px] text-sage-600 font-semibold">{totalDocs > 0 ? `${Math.round((cuFisierDocs / totalDocs) * 100)}% din total` : '0%'}</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
            <Paperclip className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* PANOU FILTRARE MODERN CU PIRULE */}
      <div className="pleasant-card rounded-2xl p-4 bg-white border border-morning-200 space-y-4 shadow-xs">
        {/* Căutare + Selector Utilaj */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Căutare utilaj, înmatriculare, serie document, emitent (RAR, Omniasig)..."
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-xs text-sapphire-900 font-bold focus:bg-white transition"
            />
          </div>

          <div>
            <select
              value={selectedVehiculId}
              onChange={(e) => setSelectedVehiculId(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-xs font-bold text-sapphire-900 cursor-pointer"
            >
              <option value="">Toate Utilajele & Mașinile ({vehicule.length})</option>
              {vehiculeSortate.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.numarInmatriculare || v.numarIntern} {v.numarIntern && v.numarIntern !== v.numarInmatriculare ? `(${v.numarIntern})` : ''} — {v.categorieEnum || 'Utilaj'}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setSelectedTip('TOATE');
                  setSelectedStatus('TOATE');
                  setSelectedVehiculId('');
                  setSearchQuery('');
                }}
                className="text-xs font-bold text-terracotta-600 hover:underline flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetează Filtrele</span>
              </button>
            )}
          </div>
        </div>

        {/* Pirule Tip Document */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-sage-500 uppercase tracking-wider">Tip Document</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(DOC_TYPES_CONFIG).map(([key, cfg]) => {
              const count = key === 'TOATE'
                ? documente.length
                : documente.filter((d) => d.tipDocument === key).length;
              const isActive = selectedTip === key;

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedTip(key)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none ${
                    isActive
                      ? `${cfg.bg} ${cfg.text} ${cfg.border} shadow-sm ring-2 ring-offset-1 ring-current`
                      : 'bg-white text-slate-500 border-morning-200 hover:border-morning-300 hover:bg-morning-50'
                  }`}
                >
                  <span>{cfg.label}</span>
                  {count > 0 && (
                    <span className={`px-1.5 rounded-full text-[10px] font-black leading-5 ${isActive ? 'bg-white/50' : 'bg-morning-100 text-slate-400'}`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pirule Stare Expirare */}
        <div className="space-y-1.5">
          <p className="text-[10px] font-black text-sage-500 uppercase tracking-wider">Stare Valabilitate</p>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'TOATE', label: 'Toate Stările', count: documente.length, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
              { id: 'EXPIRATE', label: 'Expirate', count: expirateDocs, bg: 'bg-roseash-100', text: 'text-terracotta-800', border: 'border-roseash-300' },
              { id: 'AVERTIZARE', label: 'Expiră Curând (< 30 zile)', count: avertizareDocs, bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
              { id: 'OPTIM', label: 'În Termen / Valabile', count: documente.filter((d) => d.statusCalculat === 'OPTIM').length, bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300' },
            ].map((st) => {
              const isActive = selectedStatus === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setSelectedStatus(st.id as any)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border transition select-none ${
                    isActive
                      ? `${st.bg} ${st.text} ${st.border} shadow-sm ring-2 ring-offset-1 ring-current`
                      : 'bg-white text-slate-500 border-morning-200 hover:border-morning-300 hover:bg-morning-50'
                  }`}
                >
                  <span>{st.label}</span>
                  {st.count > 0 && (
                    <span className={`px-1.5 rounded-full text-[10px] font-black leading-5 ${isActive ? 'bg-white/50' : 'bg-morning-100 text-slate-400'}`}>
                      {st.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-sage-400 font-medium pt-1 border-t border-morning-100">
          Afișare: {documenteFiltrate.length} din {documente.length} documente
        </p>
      </div>

      {/* TABEL CENTRALIZATOR DOCUMENTE */}
      <div className="pleasant-card rounded-2xl border border-morning-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-sage-500 font-bold text-xs animate-pulse">
            Se încarcă documentele de flotă...
          </div>
        ) : documenteFiltrate.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-sage-400 mx-auto" />
            <h3 className="font-extrabold text-sapphire-900 text-sm">Niciun document găsit pentru filtrele selectate</h3>
            <p className="text-xs text-sage-600 max-w-md mx-auto">
              Folosiți butonul de import pentru a încărca fișierul ODS sau adăugați manual documente noi.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-black uppercase text-[10px] tracking-wider select-none">
                  <th
                    className="p-3.5 cursor-pointer hover:bg-morning-200/80 transition group"
                    onClick={() => handleSort('vehicul')}
                    title="Click pentru sortare după număr înmatriculare / utilaj"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Vehicul / Rendszám</span>
                      {renderSortIcon('vehicul')}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-morning-200/80 transition group"
                    onClick={() => handleSort('tip')}
                    title="Click pentru sortare după tipul documentului"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Tip Document</span>
                      {renderSortIcon('tip')}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-morning-200/80 transition group"
                    onClick={() => handleSort('serie')}
                    title="Click pentru sortare după serie / emitent"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Serie & Emitent</span>
                      {renderSortIcon('serie')}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-morning-200/80 transition group"
                    onClick={() => handleSort('expirare')}
                    title="Click pentru sortare cronologică după data expirării"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Data Expirării</span>
                      {renderSortIcon('expirare')}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-morning-200/80 transition group text-center"
                    onClick={() => handleSort('zile')}
                    title="Click pentru sortare după zile rămase / urgență lejárat"
                  >
                    <div className="flex items-center justify-center space-x-1.5">
                      <span>Valabilitate / Lejárat</span>
                      {renderSortIcon('zile')}
                    </div>
                  </th>
                  <th
                    className="p-3.5 cursor-pointer hover:bg-morning-200/80 transition group text-center"
                    onClick={() => handleSort('act')}
                    title="Click pentru sortare după prezența actului scanat"
                  >
                    <div className="flex items-center justify-center space-x-1.5">
                      <span>Act Scanat</span>
                      {renderSortIcon('act')}
                    </div>
                  </th>
                  <th className="p-3.5 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                {documenteSortate.map((doc) => {
                  const dataExp = new Date(doc.dataExpirare);
                  const isExp = doc.esteExpirat;
                  const isCritic = doc.statusCalculat === 'CRITIC';
                  const isWarn = doc.esteInAvertizare;
                  const docCfg = DOC_TYPES_CONFIG[doc.tipDocument] || DOC_TYPES_CONFIG['ALTELE'];

                  return (
                    <tr
                      key={doc.id}
                      className={`transition ${
                        isExp
                          ? 'bg-roseash-50/40 hover:bg-roseash-50/70'
                          : isCritic
                          ? 'bg-roseash-50/20 hover:bg-roseash-50/50'
                          : isWarn
                          ? 'bg-amber-50/30 hover:bg-amber-50/60'
                          : 'hover:bg-morning-50'
                      }`}
                    >
                      {/* Vehicul */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono text-xs font-black text-sapphire-900 bg-white px-2 py-0.5 rounded border border-morning-200">
                              {doc.vehicul?.numarInmatriculare || doc.vehicul?.numarIntern || '—'}
                            </span>
                            {doc.vehicul?.numarIntern && doc.vehicul.numarIntern !== doc.vehicul.numarInmatriculare && (
                              <span className="text-[11px] font-bold text-slate-600">
                                {doc.vehicul.numarIntern}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-sage-500 font-semibold">
                            {doc.vehicul?.model || doc.vehicul?.categorieEnum || 'Utilaj'}
                          </p>
                        </div>
                      </td>

                      {/* Tip Document */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${docCfg.bg} ${docCfg.text} ${docCfg.border}`}>
                          {docCfg.label || doc.tipDocument}
                        </span>
                      </td>

                      {/* Serie & Emitent */}
                      <td className="p-3.5">
                        <div className="space-y-0.5">
                          <p className="font-bold text-sapphire-900 text-xs font-mono">
                            {doc.serieDocument || '—'}
                          </p>
                          {doc.emitent && (
                            <p className="text-[10px] text-sage-600 font-semibold">
                              Emitent: {doc.emitent}
                            </p>
                          )}
                          {doc.observatii && (
                            <p className="text-[10px] text-slate-500 italic max-w-xs truncate">
                              {doc.observatii}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Data Expirării */}
                      <td className="p-3.5 font-mono font-bold text-sapphire-900 text-xs">
                        {dataExp.toLocaleDateString('ro-RO')}
                        {doc.dataEmitere && (
                          <p className="text-[10px] font-normal text-sage-500">
                            Emis: {new Date(doc.dataEmitere).toLocaleDateString('ro-RO')}
                          </p>
                        )}
                      </td>

                      {/* Valabilitate / Zile Rămase */}
                      <td className="p-3.5 text-center">
                        {isExp ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-terracotta-600 text-white">
                            <AlertTriangle className="w-3 h-3 mr-0.5" />
                            <span>EXPIRAT ({Math.abs(doc.zileRamase)} ZILE)</span>
                          </span>
                        ) : isCritic ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-terracotta-500 text-white animate-pulse">
                            <Clock className="w-3 h-3 mr-0.5" />
                            <span>URGENT ({doc.zileRamase} ZILE)</span>
                          </span>
                        ) : isWarn ? (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-400 text-white">
                            <Clock className="w-3 h-3 mr-0.5" />
                            <span>EXPIRĂ ÎN {doc.zileRamase} ZILE</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 mr-0.5 text-emerald-600" />
                            <span>VALABIL ({doc.zileRamase} ZILE)</span>
                          </span>
                        )}
                      </td>

                      {/* Act Scanat / Atașament */}
                      <td className="p-3.5 text-center">
                        {doc.fisierUrl ? (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewFisier({
                                  docId: doc.id,
                                  url: `${API_BASE_URL}${doc.fisierUrl}`,
                                  nume: doc.fisierNume || 'Document Scanat',
                                  vehiculNumar: doc.vehicul?.numarInmatriculare,
                                  tipDocument: doc.tipDocument,
                                })
                              }
                              className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-200 transition flex items-center space-x-1 cursor-pointer"
                              title="Previzualizează documentul scanat (PDF sau Imagine)"
                            >
                              <Eye className="w-3 h-3 text-emerald-600" />
                              <span className="max-w-[95px] truncate">{doc.fisierNume || 'Vezi Act'}</span>
                            </button>
                            <a
                              href={`${API_BASE_URL}${doc.fisierUrl}`}
                              download={doc.fisierNume || 'document'}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 text-sage-400 hover:text-sapphire-600 hover:bg-sapphire-50 rounded transition"
                              title="Deschide în filă nouă / Descarcă"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDeleteFisier(doc.id, doc.fisierNume || 'Document Scanat')}
                              className="p-1 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-50 rounded transition cursor-pointer"
                              title="Șterge fișierul atașat (cu confirmare)"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-terracotta-500" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(doc)}
                            className="px-2 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 text-slate-500 font-bold text-[10px] border border-dashed border-morning-300 transition flex items-center space-x-1 mx-auto cursor-pointer"
                            title="Atașează o copie scanată sau o fotografie"
                          >
                            <Upload className="w-3 h-3 text-sage-400" />
                            <span>+ Atașează</span>
                          </button>
                        )}
                      </td>

                      {/* Acțiuni */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(doc)}
                            className="p-1.5 rounded-lg text-sage-500 hover:text-sapphire-600 hover:bg-sapphire-50 transition"
                            title="Editează date document"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDoc(doc.id, `${doc.tipDocument} - ${doc.vehicul?.numarInmatriculare}`)}
                            className="p-1.5 rounded-lg text-sage-400 hover:text-terracotta-600 hover:bg-roseash-50 transition"
                            title="Șterge document"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL ADĂUGARE / EDITARE DOCUMENT */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="pleasant-card bg-white p-6 rounded-2xl w-full max-w-xl space-y-4 shadow-2xl border border-morning-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-xl bg-sapphire-100 text-sapphire-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">
                    {editingDoc ? 'Editare Document Flotă' : 'Înregistrare Document Nou'}
                  </h3>
                  <p className="text-xs text-sage-600 font-medium">
                    Evidență ITP, RCA, Rovinietă, Tahograf & Casco
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-sage-400 hover:text-sapphire-900 p-1 rounded-lg hover:bg-morning-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-3.5 text-xs">
              {/* Utilaj / Vehicul Recunoscut sau Selectabil */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sage-700 font-bold block text-xs">
                    {editingDoc ? 'Vehicul / Rendszám (Recunoscut Automat):' : 'Selectează Utilaj / Vehicul: *'}
                  </label>
                  {editingDoc && (
                    <button
                      type="button"
                      onClick={() => setCanChangeVehicul(!canChangeVehicul)}
                      className="text-[11px] font-bold text-sapphire-600 hover:text-sapphire-800 hover:underline cursor-pointer"
                    >
                      {canChangeVehicul ? 'Păstrează vehiculul curent' : 'Schimbă alt vehicul'}
                    </button>
                  )}
                </div>

                {editingDoc && !canChangeVehicul ? (
                  (() => {
                    const currentVehicul = editingDoc.vehicul || vehicule.find((v) => v.id === formVehiculId);
                    const plate = currentVehicul?.numarInmatriculare || currentVehicul?.numarIntern || '—';
                    const intern = currentVehicul?.numarIntern;
                    const descriere = [currentVehicul?.marca, currentVehicul?.model].filter(Boolean).join(' ');

                    return (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-morning-100 border border-morning-300 shadow-2xs">
                        <div className="flex items-center space-x-3">
                          {/* Rendszám tábla dizájn */}
                          <div className="flex items-center bg-white rounded-md border-2 border-slate-700 shadow-xs overflow-hidden">
                            <div className="bg-blue-700 text-white font-black text-[9px] px-1.5 py-1.5 flex flex-col items-center justify-center leading-none">
                              <span>RO</span>
                            </div>
                            <span className="font-mono font-black text-sm text-slate-900 px-3 py-1 tracking-wider uppercase">
                              {plate}
                            </span>
                          </div>

                          <div>
                            <div className="flex items-center space-x-1.5">
                              <p className="text-xs font-black text-sapphire-900">
                                {intern && intern !== plate ? `${intern} ` : ''}
                                {descriere ? `(${descriere})` : ''}
                              </p>
                            </div>
                            <p className="text-[11px] text-sage-600 font-semibold">
                              Categorie: <span className="font-bold text-slate-700">{currentVehicul?.categorieEnum || 'Utilaj / Vehicul'}</span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                            <Check className="w-3 h-3 text-emerald-700 mr-0.5" />
                            <span>Auto Recunoscut</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="space-y-1">
                    <select
                      required
                      value={formVehiculId}
                      onChange={(e) => setFormVehiculId(e.target.value)}
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:bg-white focus:border-sapphire-500 transition cursor-pointer"
                    >
                      <option value="">Alege vehiculul...</option>
                      {vehiculeSortate.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.numarInmatriculare || v.numarIntern} {v.numarIntern && v.numarIntern !== v.numarInmatriculare ? `(${v.numarIntern})` : ''} — {v.categorieEnum || 'Utilaj'} {v.model ? `[${v.model}]` : ''}
                        </option>
                      ))}
                    </select>
                    {editingDoc && (
                      <p className="text-[10px] text-amber-700 italic font-medium">
                        * Ați activat schimbarea manuală a vehiculului asociat acestui document.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Tip Document */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Document: *</label>
                  <select
                    value={formTip}
                    onChange={(e) => setFormTip(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="ITP">I.T.P. (Inspecție Tehnică Periodică)</option>
                    <option value="RCA">Asigurare RCA</option>
                    <option value="ROVINIETA">Rovinietă (Taxă Drum)</option>
                    <option value="COPIE_CONFORMA">Copie Conformă</option>
                    <option value="VERIFICARE_TAHOGRAF">Verificare Tahograf</option>
                    <option value="CASCO">Poliță CASCO</option>
                    <option value="ALTELE">Alt Document Specific</option>
                  </select>
                </div>

                {formTip === 'ALTELE' && (
                  <div>
                    <label className="text-sage-700 block mb-1 font-bold">Denumire Document Specific:</label>
                    <input
                      type="text"
                      value={formTipCustom}
                      onChange={(e) => setFormTipCustom(e.target.value)}
                      placeholder="ex: Autorizație ISCIR, Certificat ADR"
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                    />
                  </div>
                )}

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Serie / Număr Document:</label>
                  <input
                    type="text"
                    value={formSerie}
                    onChange={(e) => setFormSerie(e.target.value)}
                    placeholder="ex: RO12345678, Poliță nr. 987654"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>
              </div>

              {/* Emitent & Cost */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Emitent / Companie:</label>
                  <input
                    type="text"
                    value={formEmitent}
                    onChange={(e) => setFormEmitent(e.target.value)}
                    placeholder="ex: Omniasig, RAR, CNAIR, Groupama"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cost Emitere / Reînnoire (RON):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="ex: 450.00"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Date Emitere & Expirare & Zile Alertă */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Data Emiterii (Opțional):</label>
                  <input
                    type="date"
                    value={formDataEmitere}
                    onChange={(e) => setFormDataEmitere(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Data Expirării: *</label>
                  <input
                    type="date"
                    required
                    value={formDataExpirare}
                    onChange={(e) => setFormDataExpirare(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Avertizare (Zile înainte):</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={formZileAvertizare}
                    onChange={(e) => setFormZileAvertizare(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Upload Act Scanat */}
              <div className="p-3 bg-morning-50 border border-morning-200 rounded-xl space-y-2">
                <label className="text-sage-700 block font-bold">Atașează Copie Scanată / Foto Document:</label>
                <div className="flex items-center space-x-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="px-3.5 py-2 rounded-xl bg-white border border-morning-300 hover:bg-morning-100 text-sapphire-900 font-bold transition flex items-center space-x-1.5 shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-sapphire-600" />
                    <span>{uploadingFile ? 'Se încarcă...' : 'Alege Fișier (PDF / Imagine)...'}</span>
                  </button>

                  {formFisierUrl && (
                    <div className="flex items-center space-x-2 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                      <Paperclip className="w-3 h-3 text-emerald-600" />
                      <span className="max-w-[180px] truncate">{formFisierNume || 'Fișier atașat'}</span>
                      <button
                        type="button"
                        onClick={async () => {
                          const confirmed = await showConfirm(
                            'Eliminare Fișier',
                            'Sigur doriți să eliminați acest fișier atașat?\n\nBiztosan el szeretnéd távolítani a csatolt dokumentumot?',
                            'Da, elimină',
                            'Anulează'
                          );
                          if (confirmed) {
                            setFormFisierUrl('');
                            setFormFisierNume('');
                            setFormFisierMarime(null);
                          }
                        }}
                        className="text-sage-400 hover:text-terracotta-600 ml-1 p-0.5 rounded hover:bg-emerald-100 transition cursor-pointer"
                        title="Șterge atașamentul"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Observații */}
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Observații / Mențiuni Speciale:</label>
                <textarea
                  rows={2}
                  value={formObservatii}
                  onChange={(e) => setFormObservatii(e.target.value)}
                  placeholder="ex: Plata efectuată în 2 rate, copie lăsată în torpedoul cabinei"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  {editingDoc ? 'Salvează Modificările' : 'Înregistrează Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PREVIZUALIZARE FIȘIER SCANAT (PDF & IMAGINE) */}
      {previewFisier && (() => {
        const isPdf =
          previewFisier.url.toLowerCase().split('?')[0].endsWith('.pdf') ||
          previewFisier.nume.toLowerCase().endsWith('.pdf');
        const isImage =
          /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFisier.url.split('?')[0]) ||
          /\.(png|jpe?g|webp|gif|svg)$/i.test(previewFisier.nume);

        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6"
            onClick={() => setPreviewFisier(null)}
          >
            <div
              className="bg-white rounded-2xl p-4 w-full max-w-5xl h-[88vh] flex flex-col space-y-3 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal Previzualizare */}
              <div className="flex items-center justify-between border-b border-morning-200 pb-3">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div
                    className={`p-2 rounded-xl shrink-0 ${
                      isPdf
                        ? 'bg-rose-50 text-rose-600'
                        : isImage
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-morning-100 text-slate-700'
                    }`}
                  >
                    {isPdf ? (
                      <FileText className="w-5 h-5" />
                    ) : isImage ? (
                      <ImageIcon className="w-5 h-5" />
                    ) : (
                      <Paperclip className="w-5 h-5" />
                    )}
                  </div>
                  <div className="truncate">
                    <h3 className="font-black text-sapphire-900 text-sm md:text-base truncate">
                      {previewFisier.nume}
                    </h3>
                    {(previewFisier.vehiculNumar || previewFisier.tipDocument) && (
                      <p className="text-[11px] font-bold text-sage-500 uppercase tracking-wider">
                        {previewFisier.vehiculNumar && <span>{previewFisier.vehiculNumar}</span>}
                        {previewFisier.vehiculNumar && previewFisier.tipDocument && <span> • </span>}
                        {previewFisier.tipDocument && <span>{previewFisier.tipDocument}</span>}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 md:space-x-2 shrink-0">
                  <a
                    href={previewFisier.url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1.5 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold transition flex items-center space-x-1"
                    title="Deschide documentul în filă separată"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Deschide separat</span>
                  </a>

                  <a
                    href={previewFisier.url}
                    download={previewFisier.nume}
                    className="px-3 py-1.5 rounded-xl bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 text-xs font-bold transition flex items-center space-x-1"
                    title="Descarcă fișierul"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Descarcă</span>
                  </a>

                  {previewFisier.docId && (
                    <button
                      type="button"
                      disabled={isDeletingFisier}
                      onClick={() => previewFisier.docId && handleDeleteFisier(previewFisier.docId, previewFisier.nume)}
                      className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-terracotta-700 text-xs font-bold transition flex items-center space-x-1 cursor-pointer"
                      title="Șterge acest fișier de pe server"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-terracotta-600" />
                      <span className="hidden sm:inline">Șterge Fișier</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setPreviewFisier(null)}
                    className="p-1.5 text-sage-400 hover:text-sapphire-900 rounded-lg hover:bg-morning-100 transition ml-1 cursor-pointer"
                    title="Închide fereastra"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Conținut Previzualizare */}
              <div className="flex-1 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-morning-200 p-1 relative">
                {isPdf ? (
                  <iframe
                    src={`${previewFisier.url}#toolbar=1&navpanes=0`}
                    className="w-full h-full rounded-lg border-0 bg-white"
                    title={previewFisier.nume}
                  />
                ) : isImage ? (
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-2 bg-slate-900/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewFisier.url}
                      alt={previewFisier.nume}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-sm"
                    />
                  </div>
                ) : (
                  <div className="text-center p-6 max-w-md">
                    <FileText className="w-12 h-12 text-sapphire-400 mx-auto mb-3" />
                    <h4 className="font-bold text-sapphire-900 mb-1">{previewFisier.nume}</h4>
                    <p className="text-xs text-sage-600 mb-4">
                      Previzualizarea directă nu este suportată pentru acest format de fișier.
                    </p>
                    <a
                      href={previewFisier.url}
                      download={previewFisier.nume}
                      className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs inline-flex items-center space-x-1.5 shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Descarcă fișierul</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
