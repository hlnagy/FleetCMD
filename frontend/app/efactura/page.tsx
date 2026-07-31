"use client";

import { useState, useEffect } from 'react';
import {
  FileText, RefreshCw, CheckCircle2, AlertTriangle, Download, Plus, Search,
  Settings, Clock, Building2, Layers, Check, X, ShieldCheck, ArrowRight,
  PackageCheck, Trash2, ChevronRight, Eye, Code, ExternalLink, Calendar, Zap,
  HelpCircle, BookOpen, Key, CheckCircle, Shield
} from 'lucide-react';

import { API_BASE_URL } from '@/lib/api';

export default function EFacturaPage() {
  const [facturi, setFacturi] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [depozite, setDepozite] = useState<any[]>([]);
  const [categoriiStoc, setCategoriiStoc] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedZile, setSelectedZile] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [stareFilter, setStareFilter] = useState('TOATE');

  // MODALS
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showHelpGuideModal, setShowHelpGuideModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [showRawXml, setShowRawXml] = useState(false);

  // IMPORT ITEM TO STOCK MODAL
  const [importingItem, setImportingItem] = useState<any>(null);
  const [targetDepozitId, setTargetDepozitId] = useState('');
  const [targetCategorie, setTargetCategorie] = useState('PIESE_AUTO');
  const [targetSubcategorie, setTargetSubcategorie] = useState('');
  const [codArticolCalculat, setCodArticolCalculat] = useState('');

  // CONFIG FORM STATE
  const [cifFirma, setCifFirma] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [redirectUri, setRedirectUri] = useState('http://localhost:3000/efactura');
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [stareCronAuto, setStareCronAuto] = useState(true);

  // OAUTH2 CODE EXCHANGE STATE
  const [authCodeInput, setAuthCodeInput] = useState('');
  const [exchangingCode, setExchangingCode] = useState(false);

  // FETCH DATA FROM BACKEND
  const fetchData = async () => {
    try {
      setLoading(true);
      const resConfig = await fetch(`${API_BASE_URL}/efactura/config`);
      if (resConfig.ok) {
        const cfg = await resConfig.json();
        setConfig(cfg);
        setCifFirma(cfg.cifFirma || '');
        setClientId(cfg.clientId || '');
        setClientSecret(cfg.clientSecret || '');
        setRedirectUri(cfg.redirectUri || 'http://localhost:3000/efactura');
        setAccessToken(cfg.accessToken || '');
        setRefreshToken(cfg.refreshToken || '');
        setStareCronAuto(cfg.stareCronAuto ?? true);
      }

      const resFact = await fetch(`${API_BASE_URL}/efactura/facturi`);
      if (resFact.ok) {
        const list = await resFact.json();
        setFacturi(Array.isArray(list) ? list : []);
      }

      const resDep = await fetch(`${API_BASE_URL}/stocuri-garantii/depozite`);
      if (resDep.ok) {
        const dList = await resDep.json();
        setDepozite(Array.isArray(dList) ? dList : []);
        if (dList.length > 0 && !targetDepozitId) setTargetDepozitId(dList[0].id);
      }

      const resCat = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`);
      if (resCat.ok) {
        const cData = await resCat.json();
        const merged = [
          ...(Array.isArray(cData.categoriiImplicite) ? cData.categoriiImplicite : []),
          ...(Array.isArray(cData.categoriiCustom) ? cData.categoriiCustom : []),
        ];
        setCategoriiStoc(merged);
      }
    } catch (e) {
      console.log('Eroare la încărcarea datelor e-Factura:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // HANDLER: OPEN AUTHORIZE URL (Pasul 2)
  const handleOpenAuthorizeUrl = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/efactura/oauth/authorize-url`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la generarea URL-ului de autorizare ANAF.');
    }
  };

  // HANDLER: EXCHANGE CODE FOR JWT TOKENS (Pasul 3)
  const handleExchangeCode = async () => {
    if (!authCodeInput.trim()) {
      alert('Vă rugăm să introduceți codul de autorizare primit de la ANAF (din parametrul ?code=...)!');
      return;
    }
    try {
      setExchangingCode(true);
      const res = await fetch(`${API_BASE_URL}/efactura/oauth/exchange-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: authCodeInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.mesaj}`);
        setAuthCodeInput('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare Schimb Cod: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la schimbul de cod pe token-uri JWT.');
    } finally {
      setExchangingCode(false);
    }
  };

  // FORCE SYNC HANDLER (MANUAL SYNCHRONIZATION WITH ANAF SPV)
  const handleForceSync = async () => {
    try {
      setSyncing(true);
      const res = await fetch(`${API_BASE_URL}/efactura/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zile: Number(selectedZile) }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(`✅ ${data.mesaj}`);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare Sincronizare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la sincronizarea cu ANAF SPV.');
    } finally {
      setSyncing(false);
    }
  };

  // UPDATE CONFIG HANDLER
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/efactura/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cifFirma,
          clientId,
          clientSecret,
          redirectUri,
          accessToken,
          refreshToken,
          stareCronAuto,
        }),
      });

      if (res.ok) {
        alert('⚙️ Configurația ANAF e-Factura a fost salvată cu succes!');
        setShowConfigModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la salvarea configurației.');
    }
  };

  // OPEN IMPORT MODAL FOR A SINGLE ITEM
  const openImportItemModal = (item: any) => {
    setImportingItem(item);
    setCodArticolCalculat(item.codArticolFurnizor || `ART-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // EXECUTE ITEM IMPORT INTO INVENTORY (DEPOZITFLOTA)
  const handleConfirmImportItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importingItem) return;

    try {
      const res = await fetch(`${API_BASE_URL}/efactura/items/${importingItem.id}/importa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depozitId: targetDepozitId,
          categorieNume: targetCategorie,
          subcategorieNume: targetSubcategorie,
          codArticolCalculat,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Articol importat cu succes în stoc!');
        setImportingItem(null);
        fetchData();

        if (selectedFactura) {
          const updatedFact = await (await fetch(`${API_BASE_URL}/efactura/facturi/${selectedFactura.id}`)).json();
          setSelectedFactura(updatedFact);
        }
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la importul articolului în stoc.');
    }
  };

  // EXECUTE ITEM DISCARD (EXCLUDERE REZSHI / SERVICII)
  const handleEliminaItem = async (itemId: string, descriere: string) => {
    if (!confirm(`Doriți să EXCLUDEȚI linia "${descriere}"?\nAceasta reprezintă o cheltuială de rezhit/serviciu și NU va fi adăugată în stoc.`)) return;

    try {
      const res = await fetch(`${API_BASE_URL}/efactura/items/${itemId}/elimina`, {
        method: 'POST',
      });

      if (res.ok) {
        alert(`Linia "${descriere}" a fost marcată ca Exclusă / Rezhit.`);
        fetchData();
        if (selectedFactura) {
          const updatedFact = await (await fetch(`${API_BASE_URL}/efactura/facturi/${selectedFactura.id}`)).json();
          setSelectedFactura(updatedFact);
        }
      }
    } catch (e) {
      alert('Eroare la eliminarea liniei.');
    }
  };

  // FILTERED INVOICES
  const facturiFiltrate = facturi.filter((f) => {
    const matchesSearch =
      f.numeVanzator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.cifVanzator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.numarFactura?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (stareFilter === 'TOATE') return true;
    return f.stare === stareFilter;
  });

  const totalFacturiValoare = facturi.reduce((acc, f) => acc + (f.valoareTotala || 0), 0);
  const facturiNeprocesateCount = facturi.filter((f) => f.stare === 'NEPROCESAT').length;

  return (
    <div className="space-y-6">
      {/* ANTET PAGINĂ ANAF E-FACTURA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <FileText className="w-6 h-6 text-sapphire-500" />
            <span>ANAF RO e-Factura Hibrid (UBL 2.1)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">
            Sincronizare automată și receptare facturi din ANAF SPV. Import articole direct în stoc sau excludere servicii/rezhit.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-morning-100 border border-morning-200 text-xs font-bold text-sapphire-900 shadow-xs transition"
          >
            <Settings className="w-4 h-4 text-sage-500" />
            <span>Configurare Token OAuth2</span>
          </button>

          <button
            onClick={fetchData}
            className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-white hover:bg-morning-100 border border-morning-200 text-xs font-bold text-sapphire-900 shadow-xs transition"
          >
            <RefreshCw className={`w-4 h-4 text-sapphire-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Reîmprospătează Listă</span>
          </button>
        </div>
      </div>

      {/* STATISTICI & BARĂ SINCRONIZARE HIBRIDĂ (FORCE SYNC) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="pleasant-card p-4 rounded-2xl border border-morning-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sage-700 tracking-wider">Total Facturi Primite</p>
            <p className="text-2xl font-extrabold text-sapphire-900 font-mono mt-0.5">{facturi.length}</p>
            <p className="text-[10px] text-sage-500 font-medium font-mono">Valoare: {totalFacturiValoare.toLocaleString('ro-RO')} RON</p>
          </div>
          <FileText className="w-8 h-8 text-sapphire-500" />
        </div>

        <div className="pleasant-card p-4 rounded-2xl border border-morning-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-amber-700 tracking-wider">Facturi Neprocesate</p>
            <p className="text-2xl font-extrabold text-amber-900 font-mono mt-0.5">{facturiNeprocesateCount}</p>
            <p className="text-[10px] text-amber-700 font-medium">Așteaptă receptare/import în stoc</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>

        <div className="pleasant-card p-4 rounded-2xl border border-morning-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sage-700 tracking-wider">Stare Cron Job Orar</p>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${config?.stareCronAuto ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-xs font-bold text-sapphire-900">{config?.stareCronAuto ? 'ACTIV (Orar)' : 'DEZACTIVAT'}</span>
            </div>
            <p className="text-[10px] text-sage-500 mt-0.5 font-mono">
              {config?.ultimulSyncSucces ? `Ultimul sync: ${new Date(config.ultimulSyncSucces).toLocaleTimeString('ro-RO')}` : 'Fără sync înregistrat'}
            </p>
          </div>
          <Clock className="w-8 h-8 text-periwinkle-600" />
        </div>

        {/* FORCE SYNC BOX */}
        <div className="p-4 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-sapphire-900 flex items-center space-x-1">
              <Zap className="w-4 h-4 text-sapphire-500" />
              <span>Sincronizare Manuális (Force Sync)</span>
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={selectedZile}
              onChange={(e) => setSelectedZile(Number(e.target.value))}
              className="bg-white border border-sapphire-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-sapphire-900"
            >
              <option value={15}>Ultimile 15 Zile</option>
              <option value={30}>Ultimile 30 Zile</option>
              <option value={60}>Ultimile 60 Zile (Max ANAF)</option>
            </select>

            <button
              onClick={handleForceSync}
              disabled={syncing}
              className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Se descarcă...' : 'Sync Acum'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTRARE & CĂUTARE FACTURI */}
      <div className="pleasant-card p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-sage-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Caută factură după furnizor, CUI sau număr factură..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-sapphire-900"
            />
          </div>

          <div className="flex items-center space-x-1.5 bg-morning-100 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setStareFilter('TOATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${stareFilter === 'TOATE' ? 'bg-sapphire-500 text-white' : 'text-sage-700 hover:bg-morning-200'}`}
            >
              Toate ({facturi.length})
            </button>
            <button
              onClick={() => setStareFilter('NEPROCESAT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${stareFilter === 'NEPROCESAT' ? 'bg-amber-500 text-white' : 'text-amber-700 hover:bg-amber-100'}`}
            >
              Neprocesate ({facturiNeprocesateCount})
            </button>
            <button
              onClick={() => setStareFilter('IMPORTAT_TOTAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${stareFilter === 'IMPORTAT_TOTAL' ? 'bg-emerald-600 text-white' : 'text-emerald-700 hover:bg-emerald-100'}`}
            >
              Importate în Stoc
            </button>
            <button
              onClick={() => setStareFilter('ELIMINAT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${stareFilter === 'ELIMINAT' ? 'bg-slate-600 text-white' : 'text-slate-700 hover:bg-morning-200'}`}
            >
              Excluse / Servicii
            </button>
          </div>
        </div>

        {/* TABEL FACTURI PRIMITE */}
        <div className="bg-white rounded-2xl border border-morning-200 overflow-hidden shadow-xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider">
                <th className="p-3">Furnizor & CUI</th>
                <th className="p-3">Număr Factură</th>
                <th className="p-3">Data Emiterii</th>
                <th className="p-3">Valoare Totală</th>
                <th className="p-3">Stare Procesare</th>
                <th className="p-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
              {facturiFiltrate.length > 0 ? (
                facturiFiltrate.map((f) => (
                  <tr key={f.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-extrabold text-sapphire-900">
                      <div>{f.numeVanzator}</div>
                      <div className="text-[10px] text-sage-500 font-mono">CUI: {f.cifVanzator}</div>
                    </td>
                    <td className="p-3 font-mono font-bold text-sapphire-700">{f.numarFactura}</td>
                    <td className="p-3 font-mono text-sage-600">
                      {new Date(f.dataFactura).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="p-3 font-mono font-extrabold text-sapphire-900">
                      {f.valoareTotala?.toLocaleString('ro-RO')} {f.moneda}
                    </td>
                    <td className="p-3">
                      {f.stare === 'NEPROCESAT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
                          Neprocesat ({f.articole?.filter((a: any) => a.stare === 'NEPROCESAT').length || 0} articole)
                        </span>
                      )}
                      {f.stare === 'IMPORTAT_PARȚIAL' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-900 border border-blue-300">
                          Importat Parțial
                        </span>
                      )}
                      {f.stare === 'IMPORTAT_TOTAL' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Importat în Stoc
                        </span>
                      )}
                      {f.stare === 'ELIMINAT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                          Exclus / Rezhit
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedFactura(f)}
                        className="px-3 py-1.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 font-bold transition border border-sapphire-200 text-xs flex items-center space-x-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspectează Linii Factură</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sage-500 font-bold">
                    Nicio factură e-Factura găsită pe criteriile selectate.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: INSPECTARE FACTURĂ & ARTICOLE (IMPORT / EXCLUDERE) */}
      {/* ========================================================================= */}
      {selectedFactura && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-4xl space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-sapphire-900 flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-sapphire-500" />
                  <span>Factura {selectedFactura.numarFactura} - {selectedFactura.numeVanzator}</span>
                </h3>
                <p className="text-xs text-sage-600 font-medium">
                  CUI Furnizor: {selectedFactura.cifVanzator} | Data: {new Date(selectedFactura.dataFactura).toLocaleDateString('ro-RO')} | Total: <strong className="text-sapphire-900 font-mono">{selectedFactura.valoareTotala?.toLocaleString('ro-RO')} {selectedFactura.moneda}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRawXml(!showRawXml)}
                  className="px-3 py-1.5 rounded-lg bg-morning-100 hover:bg-morning-200 text-slate-700 font-bold text-xs flex items-center space-x-1"
                >
                  <Code className="w-3.5 h-3.5 text-sapphire-600" />
                  <span>{showRawXml ? 'Ascunde XML' : 'Vezi Raw UBL XML'}</span>
                </button>

                <button onClick={() => { setSelectedFactura(null); setShowRawXml(false); }} className="text-sage-500 hover:text-sapphire-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* RAW UBL 2.1 XML VIEW */}
            {showRawXml && (
              <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60 border border-slate-800">
                <pre>{selectedFactura.xmlRawContent || 'XML indisponibil'}</pre>
              </div>
            )}

            {/* TABEL ARTICOLE DIN FACTURĂ */}
            <div className="space-y-2">
              <span className="text-[11px] font-extrabold text-sage-700 uppercase tracking-wider block">
                Linii Factură / Articole extrase din UBL 2.1:
              </span>

              <div className="border border-morning-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase">
                      <th className="p-2.5">#</th>
                      <th className="p-2.5">Descriere Piesă / Serviciu</th>
                      <th className="p-2.5">Cod Furnizor</th>
                      <th className="p-2.5">Cantitate</th>
                      <th className="p-2.5">Preț Unitar</th>
                      <th className="p-2.5">Total fără TVA</th>
                      <th className="p-2.5">Stare Articol</th>
                      <th className="p-2.5 text-right">Acțiune Articol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                    {selectedFactura.articole?.map((art: any) => (
                      <tr key={art.id} className="hover:bg-morning-50 transition">
                        <td className="p-2.5 font-bold text-sage-500">{art.numarLinie}</td>
                        <td className="p-2.5 font-bold text-sapphire-900">{art.descrierePiesa}</td>
                        <td className="p-2.5 font-mono text-sage-600">{art.codArticolFurnizor || '-'}</td>
                        <td className="p-2.5 font-mono font-bold text-sapphire-900">
                          {art.cantitate} {art.unitateMasura}
                        </td>
                        <td className="p-2.5 font-mono text-slate-800">{art.pretUnitar?.toLocaleString('ro-RO')} RON</td>
                        <td className="p-2.5 font-mono font-extrabold text-sapphire-900">{art.valoareFaraTVA?.toLocaleString('ro-RO')} RON</td>
                        <td className="p-2.5">
                          {art.stare === 'NEPROCESAT' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900">Neprocesat</span>
                          )}
                          {art.stare === 'IMPORTAT' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 flex items-center space-x-1 w-fit">
                              <Check className="w-3 h-3" />
                              <span>Importat în Stoc</span>
                            </span>
                          )}
                          {art.stare === 'ELIMINAT' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600">Exclus / Rezhit</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right space-x-1.5 whitespace-nowrap">
                          {art.stare !== 'IMPORTAT' && (
                            <button
                              onClick={() => openImportItemModal(art)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[11px] shadow-xs transition"
                            >
                              📦 Importă în Stoc
                            </button>
                          )}
                          {art.stare === 'NEPROCESAT' && (
                            <button
                              onClick={() => handleEliminaItem(art.id, art.descrierePiesa)}
                              className="px-2.5 py-1 rounded-lg bg-morning-200 hover:bg-roseash-200 text-slate-700 hover:text-rose-700 font-bold text-[11px] transition"
                            >
                              🗑️ Exclude (Servicii)
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => { setSelectedFactura(null); setShowRawXml(false); }}
                className="px-5 py-2 rounded-xl bg-morning-200 text-slate-700 font-bold text-xs"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: IMPORT ARTICOL ÎN STOC (SELECTARE DEPOZIT & CATEGORIE) */}
      {/* ========================================================================= */}
      {importingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>Import Articol în Stoc</span>
              </h3>
              <button onClick={() => setImportingItem(null)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleConfirmImportItem} className="space-y-3 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <p className="font-extrabold text-emerald-900">{importingItem.descrierePiesa}</p>
                <p className="text-[11px] text-emerald-700 font-mono">
                  Cantitate: {importingItem.cantitate} {importingItem.unitateMasura} | Preț Unitar: {importingItem.pretUnitar} RON
                </p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Depozit Stoc Target: *</label>
                <select
                  required
                  value={targetDepozitId}
                  onChange={(e) => setTargetDepozitId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {depozite.map((d) => (
                    <option key={d.id} value={d.id}>{d.nume} ({d.adresa || 'Atelier'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Categorie Stoc: *</label>
                <select
                  value={targetCategorie}
                  onChange={(e) => setTargetCategorie(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
                  {categoriiStoc.length > 0 ? (
                    categoriiStoc.map((c) => (
                      <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                    ))
                  ) : (
                    <>
                      <option value="PIESE_AUTO">PIESE AUTO & UTILAJE</option>
                      <option value="FILTRE">FILTRE & ULEIURI</option>
                      <option value="CONSUMABILE">CONSUMABILE ATELIER</option>
                      <option value="ANVELOPE">ANVELOPE & ROȚI</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Cod Articol în Stoc (Cod furnizor sau intern): *</label>
                <input
                  required
                  value={codArticolCalculat}
                  onChange={(e) => setCodArticolCalculat(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setImportingItem(null)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20">Confirmă Importul în Stoc</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CONFIGURARE OAUTH2 & TOKEN ANAF (CU ICONIȚĂ DE AJUTOR ?) */}
      {/* ========================================================================= */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-sapphire-500" />
                <span>Configurare Token OAuth2 ANAF SPV</span>
              </h3>

              {/* BUTON DE AJUTOR ? LÂNGĂ BUTONUL DE ÎNCHIDERE X */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowHelpGuideModal(true)}
                  title="Ghid pas cu pas: Cum te conectezi la ANAF SPV OAuth2"
                  className="w-8 h-8 rounded-xl bg-sapphire-100 hover:bg-sapphire-200 text-sapphire-700 flex items-center justify-center font-bold text-sm transition shadow-xs border border-sapphire-200"
                >
                  <HelpCircle className="w-5 h-5 text-sapphire-600" />
                </button>

                <button onClick={() => setShowConfigModal(false)} className="text-sage-500 hover:text-sapphire-900 p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-3 text-xs max-h-[75vh] overflow-y-auto pr-1">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">CUI / CIF Firmă (ex: RO12345678): *</label>
                <input required value={cifFirma} onChange={(e) => setCifFirma(e.target.value)} placeholder="RO12345678" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Client ID OAuth2 ANAF:</label>
                  <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="Client ID" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono text-[11px]" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Client Secret OAuth2:</label>
                  <input type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder="Client Secret" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono text-[11px]" />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Redirect URI (Callback URL înregistrat în SPV):</label>
                <input value={redirectUri} onChange={(e) => setRedirectUri(e.target.value)} placeholder="http://localhost:3000/efactura" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono text-[11px]" />
              </div>

              {/* OAUTH2 CODE EXCHANGE WIZARD */}
              <div className="p-3 bg-sapphire-50 border border-sapphire-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-sapphire-900 text-xs flex items-center space-x-1">
                    <ExternalLink className="w-4 h-4 text-sapphire-600" />
                    <span>Wizard Generare Token-uri JWT (Pasul 2 & Pasul 3)</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowHelpGuideModal(true)}
                    className="text-[11px] font-bold text-sapphire-600 underline hover:text-sapphire-800"
                  >
                    Vezi Ghid Detaliat (?)
                  </button>
                </div>
                <p className="text-[11px] text-sage-600">
                  Cu token-ul fizic USB introdus în calculator, obțineți codul de autorizare și schimbați-l pe Token-uri Access (90 zile) & Refresh (365 zile).
                </p>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleOpenAuthorizeUrl}
                    className="flex-1 px-3 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-[11px] shadow-xs transition flex items-center justify-center space-x-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>1. Deschide URL Autorizare ANAF</span>
                  </button>
                </div>

                <div className="pt-2 space-y-1.5 border-t border-sapphire-200">
                  <label className="text-sage-700 block font-bold text-[11px]">Introduceți Codul de Autorizare (?code=XYZ...):</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={authCodeInput}
                      onChange={(e) => setAuthCodeInput(e.target.value)}
                      placeholder="Lipește codul scurt din URL..."
                      className="flex-1 bg-white border border-sapphire-200 rounded-xl px-2.5 py-1.5 text-sapphire-900 font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={handleExchangeCode}
                      disabled={exchangingCode}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition shadow-xs disabled:opacity-50"
                    >
                      {exchangingCode ? 'Se schimbă...' : '2. Schimbă pe Token-uri JWT'}
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sage-700 font-bold">Access Token ANAF (90 Zile):</label>
                  {config?.accessTokenExpiresAt && (
                    <span className="text-[10px] font-mono font-bold text-emerald-700">
                      Expiră la: {new Date(config.accessTokenExpiresAt).toLocaleDateString('ro-RO')}
                    </span>
                  )}
                </div>
                <textarea rows={2} value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="Access Token JWT..." className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono text-[10px]" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sage-700 font-bold">Refresh Token ANAF (365 Zile):</label>
                  {config?.refreshTokenExpiresAt && (
                    <span className="text-[10px] font-mono font-bold text-purple-700">
                      Expiră la: {new Date(config.refreshTokenExpiresAt).toLocaleDateString('ro-RO')}
                    </span>
                  )}
                </div>
                <textarea rows={2} value={refreshToken} onChange={(e) => setRefreshToken(e.target.value)} placeholder="Refresh Token..." className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono text-[10px]" />
              </div>

              <div className="p-3 bg-morning-100 rounded-xl border border-morning-200 flex items-center justify-between">
                <label className="flex items-center space-x-2 text-xs font-bold text-sapphire-900 cursor-pointer">
                  <input type="checkbox" checked={stareCronAuto} onChange={(e) => setStareCronAuto(e.target.checked)} className="w-4 h-4 text-sapphire-500 rounded" />
                  <span>Sincronizare automată Orară (Cron Job + Auto-refresh 48h în prealabil)</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowConfigModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Configurația Token</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: GHID PAS CU PAS CONECTARE ANAF SPV (LÂNGĂ X ?) */}
      {/* ========================================================================= */}
      {showHelpGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-9 h-9 rounded-xl bg-sapphire-100 flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-sapphire-600" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">
                    Ghid Pas cu Pas: Conectare & Autentificare ANAF SPV OAuth2
                  </h3>
                  <p className="text-xs text-sage-600 font-medium">
                    Procedura completă pentru obținerea și configurarea token-urilor JWT e-Factura.
                  </p>
                </div>
              </div>

              <button onClick={() => setShowHelpGuideModal(false)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
              {/* PASUL 1 */}
              <div className="p-3.5 bg-morning-100 rounded-xl border border-morning-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sapphire-500 text-white font-extrabold text-xs flex items-center justify-center">1</span>
                  <h4 className="font-extrabold text-sapphire-900 text-xs">Pregătire Token Fizic USB (Certificat Digital Calificat)</h4>
                </div>
                <p className="pl-8 text-sage-700">
                  Introduceți stick-ul USB cu semnătura electronică calificată (eliberată de CertSign, DigiSign, TransSped etc.) în calculator. Asigurați-vă că driver-ul token-ului este activ.
                </p>
              </div>

              {/* PASUL 2 */}
              <div className="p-3.5 bg-morning-100 rounded-xl border border-morning-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sapphire-500 text-white font-extrabold text-xs flex items-center justify-center">2</span>
                  <h4 className="font-extrabold text-sapphire-900 text-xs">Înregistrare Aplicație pe Portalul ANAF OAuth</h4>
                </div>
                <p className="pl-8 text-sage-700">
                  Accesați portalul oficial ANAF: <a href="https://www.anaf.ro/InregOauth/index.xhtml" target="_blank" rel="noreferrer" className="text-sapphire-600 underline font-bold">https://www.anaf.ro/InregOauth/index.xhtml</a> cu token-ul conectat și înregistrați aplicația FleetCMD.<br />
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block my-1">
                    💡 Notă: Dacă aveți deja un cont în SPV cu username și parolă, dați click pe link-ul <i>"click aici"</i> din susul paginii ANAF pentru conectare rapidă!
                  </span><br />
                  Setați <strong>Redirect URI</strong> la <code>http://localhost:3000/efactura</code> (sau adresa dvs. din browser).<br />
                  Veți primi un <strong>Client ID</strong> și un <strong>Client Secret</strong> pe care le introduceți în câmpurile din stânga.
                </p>
              </div>

              {/* PASUL 3 */}
              <div className="p-3.5 bg-morning-100 rounded-xl border border-morning-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-sapphire-500 text-white font-extrabold text-xs flex items-center justify-center">3</span>
                  <h4 className="font-extrabold text-sapphire-900 text-xs">Autorizare în SPV și Copiere Cod</h4>
                </div>
                <p className="pl-8 text-sage-700">
                  Apăsați butonul <strong>`1. Deschide URL Autorizare ANAF`</strong>. Se va deschide o pagină securizată ANAF unde veți confirma autentificarea cu token-ul fizic USB.<br />
                  După autorizare, ANAF vă va retrimite pe pagina FleetCMD având la finalul adresei web un cod scurt:<br />
                  <code className="bg-white px-2 py-0.5 border border-morning-300 rounded font-mono text-[10px] text-sapphire-900 block mt-1">
                    http://localhost:3000/efactura?code=<b>XYZ123456789...</b>
                  </code>
                  Copiați acel cod din bara de adrese a browser-ului.
                </p>
              </div>

              {/* PASUL 4 */}
              <div className="p-3.5 bg-morning-100 rounded-xl border border-morning-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-extrabold text-xs flex items-center justify-center">4</span>
                  <h4 className="font-extrabold text-sapphire-900 text-xs">Schimbare Cod pe Token-uri JWT (Access & Refresh)</h4>
                </div>
                <p className="pl-8 text-sage-700">
                  Lipiți codul copiat în caseta <code>Introduceți Codul de Autorizare (?code=XYZ...)</code> și apăsați butonul <strong>`2. Schimbă pe Token-uri JWT`</strong>.<br />
                  Sistemul va genera automat un <strong>Access Token (valabil 90 zile)</strong> și un <strong>Refresh Token (valabil 365 zile)</strong> și le va salva în baza de date.
                </p>
              </div>

              {/* PASUL 5 - AUTOMATIZARE */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-extrabold text-emerald-900 text-xs">Reînnoire Automată (Fără beavatkozare ulterioară!)</h4>
                </div>
                <p className="pl-7 text-emerald-800 text-[11px]">
                  Cron Job-ul din FleetCMD va reînnoi automat Access Token-ul cu <strong>48 de ore înainte de expirarea celor 90 de zile</strong> folosind Refresh Token-ul. Nu va mai fi nevoie să conectați stick-ul USB timp de 1 an întreg!
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => setShowHelpGuideModal(false)}
                className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs shadow-md shadow-sapphire-500/20"
              >
                Am înțeles ghidul
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
