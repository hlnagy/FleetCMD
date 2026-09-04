"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FileText, RefreshCw, CheckCircle2, AlertTriangle, Download, Plus, Search,
  Settings, Clock, Building2, Layers, Check, X, ShieldCheck, ArrowRight,
  PackageCheck, Trash2, ChevronRight, Eye, Code, ExternalLink, Calendar, Zap,
  HelpCircle, BookOpen, Key, CheckCircle, Shield, ArrowUpDown, ArrowUp, ArrowDown,
  ShoppingCart, History, Tag
} from 'lucide-react';

import { API_BASE_URL } from '@/lib/api';
import { showConfirm } from '@/lib/swal';
import { openFacturaPdf } from '@/lib/facturaPdf';

function EFacturaContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');

  const [activeTab, setActiveTab] = useState<'efactura' | 'manual' | 'istoric'>('efactura');

  // Ascultăm schimbarea tab-ului din URL / Sidebar
  useEffect(() => {
    if (tabParam && ['efactura', 'manual', 'istoric'].includes(tabParam)) {
      setActiveTab(tabParam as any);
    }
  }, [tabParam]);

  const [facturi, setFacturi] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [depozite, setDepozite] = useState<any[]>([]);
  const [categoriiStoc, setCategoriiStoc] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [selectedZile, setSelectedZile] = useState(15);
  const [searchQuery, setSearchQuery] = useState('');
  const [stareFilter, setStareFilter] = useState('NEPROCESAT');

  // STARE PENTRU RECEPȚIE MANUALĂ & ISTORIC FACTURI
  const [bevDepozitId, setBevDepozitId] = useState('');
  const [bevCodArticol, setBevCodArticol] = useState('');
  const [bevDenumire, setBevDenumire] = useState('');
  const [bevCategorie, setBevCategorie] = useState('PIESE_AUTO');
  const [bevSubcategorie, setBevSubcategorie] = useState('');
  const [bevTipLichid, setBevTipLichid] = useState('NICIUNUL');
  const [bevMarcaUlei, setBevMarcaUlei] = useState('');
  const [bevFurnizor, setBevFurnizor] = useState('');
  const [bevNumarFactura, setBevNumarFactura] = useState('');
  const [bevDataFactura, setBevDataFactura] = useState(new Date().toISOString().split('T')[0]);
  const [bevUM, setBevUM] = useState('buc');
  const [bevPretTotal, setBevPretTotal] = useState(1500);
  const [bevCantitate, setBevCantitate] = useState(10);
  const [bevAreGarantie, setBevAreGarantie] = useState(false);
  const [bevSerieUnica, setBevSerieUnica] = useState('');
  const [bevDurataGarantieLuni, setBevDurataGarantieLuni] = useState(24);
  const [bevDurataGarantieRulaj, setBevDurataGarantieRulaj] = useState(2000);
  const [bevObservatii, setBevObservatii] = useState('');
  const [intrariHistory, setIntrariHistory] = useState<any[]>([]);
  const [searchQueryHistory, setSearchQueryHistory] = useState('');

  // SORTING STATE (Alapértelmezett: Data Emiterii desc)
  const [sortKey, setSortKey] = useState<'furnizor' | 'numarFactura' | 'dataFactura' | 'valoareTotala'>('dataFactura');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // LIVE BACKGROUND SYNC STATUS
  const [syncStatusData, setSyncStatusData] = useState<{
    inProgress: boolean;
    zile: number;
    totalMessages: number;
    processed: number;
    downloaded: number;
    duplicates: number;
    errorMessage?: string | null;
  } | null>(null);

  // MULTI-SELECTION STATE
  const [selectedFacturaIds, setSelectedFacturaIds] = useState<string[]>([]);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // MODALS
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showHelpGuideModal, setShowHelpGuideModal] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [showRawXml, setShowRawXml] = useState(false);

  // IMPORT ITEM TO STOCK MODAL
  const [importingItem, setImportingItem] = useState<any>(null);
  const [isImportSerializat, setIsImportSerializat] = useState(false);
  const [seriiList, setSeriiList] = useState<Array<{ id: number; serie: string; dot: string }>>([]);
  const [targetDepozitId, setTargetDepozitId] = useState('');
  const [targetCategorie, setTargetCategorie] = useState('PIESE_AUTO');
  const [targetSubcategorie, setTargetSubcategorie] = useState('');
  const [codArticolCalculat, setCodArticolCalculat] = useState('');
  const [pretUnitarImport, setPretUnitarImport] = useState<number>(0);
  const [isGarantieGratuita, setIsGarantieGratuita] = useState<boolean>(false);
  const [areGarantieProducator, setAreGarantieProducator] = useState<boolean>(false);
  const [durataGarantieLuni, setDurataGarantieLuni] = useState<number>(24);
  const [durataGarantieKm, setDurataGarantieKm] = useState<number>(2000);
  const [serieUnicaCustom, setSerieUnicaCustom] = useState<string>('');
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatNume, setNewCatNume] = useState('');
  const [savingNewCat, setSavingNewCat] = useState(false);
  const [isAddingNewSubcat, setIsAddingNewSubcat] = useState(false);
  const [newSubcatNume, setNewSubcatNume] = useState('');
  const [savingNewSubcat, setSavingNewSubcat] = useState(false);

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

  // DIRECT XML / ZIP UPLOAD STATE
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploadingFiles(true);
    try {
      const payloadFiles: Array<{ numeFisier: string; continutBase64: string }> = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const res = reader.result as string;
            const base64Data = res.split(',')[1] || res;
            resolve(base64Data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        payloadFiles.push({
          numeFisier: file.name,
          continutBase64: base64,
        });
      }

      const res = await fetch(`${API_BASE_URL}/efactura/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payloadFiles }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare la importul fișierelor: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare la încărcarea fișierelor: ${e.message}`);
    } finally {
      setUploadingFiles(false);
      event.target.value = '';
    }
  };

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

      const resIntrari = await fetch(`${API_BASE_URL}/stocuri-garantii/intrare-stoc`);
      if (resIntrari.ok) {
        const iList = await resIntrari.json();
        setIntrariHistory(Array.isArray(iList) ? iList : []);
      }

      // Verificăm dacă o sincronizare este deja în curs pe server la încărcarea paginii
      const resSync = await fetch(`${API_BASE_URL}/efactura/sync/status`);
      if (resSync.ok) {
        const sData = await resSync.json();
        setSyncStatusData(sData);
        if (sData.inProgress) {
          setSyncing(true);
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await fetch(`${API_BASE_URL}/efactura/sync/status`);
              if (statusRes.ok) {
                const polled = await statusRes.json();
                setSyncStatusData(polled);
                if (!polled.inProgress) {
                  clearInterval(pollInterval);
                  setSyncing(false);
                  fetchData();
                }
              }
            } catch (e) {
              console.error(e);
            }
          }, 2000);
        } else if (config?.stareCronAuto && config?.accessToken) {
          // AUTO-SYNC INTELIGENT: Dacă ultimul sync a fost acum mai mult de 60 de minute (sau după weekend/inactivitate), pornim automat sync în fundal!
          const lastSyncTime = config?.ultimulSyncSucces ? new Date(config.ultimulSyncSucces).getTime() : 0;
          const oneHourMs = 60 * 60 * 1000;
          if (Date.now() - lastSyncTime > oneHourMs) {
            handleForceSync();
          }
        }
      }
    } catch (e) {
      console.log('Eroare la încărcarea datelor e-Factura:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleManualBevetelez = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/intrare-stoc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codArticol: bevCodArticol,
          denumire: bevDenumire,
          categorie: bevCategorie,
          subcategorie: bevSubcategorie,
          depozitId: bevDepozitId || (depozite[0]?.id || ''),
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
        alert(data.mesaj || 'Recepție marfă salvată cu succes în stoc!');
        fetchData();
        setBevCodArticol('');
        setBevDenumire('');
        setBevFurnizor('');
        setBevNumarFactura('');
        setBevSerieUnica('');
        setBevAreGarantie(false);
      } else {
        const err = await res.json();
        alert(`Eroare la recepție: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e) {
      alert('Eroare la recepția mărfii.');
    }
  };

  const getSubcategoriiPentruCategorie = (catNume: string) => {
    const cat = categoriiStoc.find((c) => c.nume === catNume);
    return cat?.subcategorii || [];
  };

  // DIAGNOSTIC STATE FOR ANAF URL ERRORS & SUCCESS CODES
  const [urlDiagnostic, setUrlDiagnostic] = useState<{
    type: 'error' | 'success';
    title: string;
    code?: string;
    description?: string;
    details: string;
    actionHint: string;
  } | null>(null);

  useEffect(() => {
    fetchData();

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error');
      const errDesc = params.get('error_description');
      const code = params.get('code');

      if (err) {
        let detailsText = '';
        let hintText = '';

        if (err === 'access_denied') {
          detailsText = 'ANAF a respins cererea de autorizare (access_denied). Cauza 1: În timpul redirecționării, browserul nu a solicitat certificatul digital / codul PIN al token-ului USB, sau a fost anulat dialogul de selectare a certificatului. Cauza 2: Utilizatorul conectat nu are drepturi SPV pentru CIF-ul selectat pe certificatul respectiv.';
          hintText = '1) Deschideți o fereastră Incognito / Private în browser. 2) Asigurați-vă că stick-ul USB cu certificatul digital este conectat și driverul (ex: SafeNet / Bit4id) rulează. 3) În fereastra apărută de la ANAF, selectați certificatul digital și introduceți codul PIN al token-ului.';
        } else if (err === 'invalid_request') {
          detailsText = `Parametri necorespunzători: ${errDesc || 'Redirect URI mismatch'}. Adresa Callback URL din aplicație nu este identică cu cea din portalul ANAF SPV.`;
          hintText = 'Verificați în profilul OAuth din ANAF ca adresa Callback URL să fie exact: https://fleet-cmd.vercel.app/efactura';
        } else {
          detailsText = `ANAF a returnat codul de eroare: ${errDesc || err}`;
          hintText = 'Verificați configurarea aplicației în portalul ANAF SPV.';
        }

        setUrlDiagnostic({
          type: 'error',
          title: `Diagnostic Eroare ANAF: ${err}`,
          code: err,
          description: errDesc || undefined,
          details: detailsText,
          actionHint: hintText,
        });
      } else if (code) {
        setAuthCodeInput(code);
        setShowConfigModal(true);
        setUrlDiagnostic({
          type: 'success',
          title: '🎉 Cod de Autorizare Capturat cu Succes!',
          details: `Codul autorizare (${code.substring(0, 15)}...) a fost extras automat din URL și introdus în formular.`,
          actionHint: 'Apăsați butonul verde "2. Schimbă pe Token-uri JWT" din fereastra deschisă pentru a finaliza!',
        });
      }
    }
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
        // Poll status every 2 seconds until complete
        const pollInterval = setInterval(async () => {
          try {
            const statusRes = await fetch(`${API_BASE_URL}/efactura/sync/status`);
            if (statusRes.ok) {
              const sData = await statusRes.json();
              setSyncStatusData(sData);
              if (!sData.inProgress) {
                clearInterval(pollInterval);
                setSyncing(false);
                fetchData();
              }
            }
          } catch (e) {
            console.error('Eroare polling status sync:', e);
          }
        }, 2000);
      } else {
        const err = await res.json();
        alert(`Eroare Sincronizare: ${err.message}`);
        setSyncing(false);
      }
    } catch (e) {
      alert('Eroare la pornirea sincronizării cu ANAF SPV.');
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

  // VERIFICARE DACĂ O LINIE REPREZINTĂ O REDUCERE COMERCIALĂ / GARANȚIE / STORNO
  const isReducereSauFinanciar = (art: any): boolean => {
    if (!art) return false;
    if (art.cantitate < 0 || art.valoareFaraTVA < 0) return true;
    const desc = (art.descrierePiesa || '').toLowerCase();
    return (
      desc.includes('reducere') ||
      desc.includes('discount') ||
      desc.includes('discont') ||
      desc.includes('storno') ||
      desc.includes('bonificatie') ||
      desc.includes('garantie acordata') ||
      desc.includes('rabat') ||
      desc.includes('remiza')
    );
  };

  // OPEN IMPORT MODAL FOR A SINGLE ITEM
  const openImportItemModal = (item: any, isSerializat = false) => {
    setImportingItem(item);
    const rawCode = item.codArticolFurnizor;
    const cleanCif = (selectedFactura?.cifVanzator || '').replace(/[^0-9]/g, '') || 'ART';
    const fallbackCode = `${cleanCif}-${item.numarLinie || 1}`;
    const code = rawCode || fallbackCode;

    setCodArticolCalculat(code);

    const isAnvelopaText = /anvelop|r22\.5|r17\.5|r20|r24|cauciuc/i.test(item.descrierePiesa) || (rawCode || '').toUpperCase().startsWith('ANV');
    if (isAnvelopaText) {
      setTargetCategorie('ANVELOPE');
    } else if (categoriiStoc.length > 0 && !targetCategorie) {
      setTargetCategorie(categoriiStoc[0].nume);
    }
    setTargetSubcategorie('');
    setIsAddingNewCat(false);
    setIsAddingNewSubcat(false);
    setNewCatNume('');
    setNewSubcatNume('');

    const isZeroFactura = (selectedFactura?.valoareTotala || 0) === 0 || (selectedFactura?.articole || []).some((a: any) => isReducereSauFinanciar(a));
    setIsGarantieGratuita(isZeroFactura);
    setPretUnitarImport(isZeroFactura ? 0 : (item.pretUnitar || 0));
    setAreGarantieProducator(isZeroFactura || isSerializat);
    setDurataGarantieLuni(24);
    setDurataGarantieKm(2000);
    setSerieUnicaCustom('');

    setIsImportSerializat(isSerializat || isAnvelopaText);
    
    // Inițializare listă de serii per bucată
    const count = Math.max(1, Math.ceil(item.cantitate || 1));
    const initialSerii = [];
    const timestampSuffix = Date.now().toString().slice(-4);
    for (let i = 1; i <= count; i++) {
      initialSerii.push({
        id: i,
        serie: `${code}-${timestampSuffix}-${String(i).padStart(2, '0')}`,
        dot: 'DOT-2026',
      });
    }
    setSeriiList(initialSerii);
  };

  // QUICK CREATE CATEGORY HANDLER
  const handleQuickCreateCategory = async () => {
    if (!newCatNume.trim()) return;
    setSavingNewCat(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nume: newCatNume.trim() }),
      });
      if (res.ok) {
        const created = await res.json();
        const newName = created.nume || newCatNume.trim();
        setTargetCategorie(newName);
        setTargetSubcategorie('');
        setIsAddingNewCat(false);
        setNewCatNume('');
        await fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare la crearea categoriei: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea noii categorii.');
    } finally {
      setSavingNewCat(false);
    }
  };

  // QUICK CREATE SUBCATEGORY HANDLER
  const handleQuickCreateSubcategory = async () => {
    if (!newSubcatNume.trim()) return;
    setSavingNewSubcat(true);
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/subcategorii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorieNume: targetCategorie,
          nume: newSubcatNume.trim(),
        }),
      });
      if (res.ok) {
        const created = await res.json();
        const newSubName = created.nume || newSubcatNume.trim();
        setTargetSubcategorie(newSubName);
        setIsAddingNewSubcat(false);
        setNewSubcatNume('');
        await fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare la crearea subcategoriei: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea noii subcategorii.');
    } finally {
      setSavingNewSubcat(false);
    }
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
          pretUnitarCustom: isGarantieGratuita ? 0 : Number(pretUnitarImport),
          areGarantie: areGarantieProducator || isImportSerializat,
          luniGarantie: areGarantieProducator ? Number(durataGarantieLuni) : undefined,
          kilometriGarantie: areGarantieProducator ? Number(durataGarantieKm) : undefined,
          serieUnica: areGarantieProducator ? serieUnicaCustom.trim() : undefined,
          esteAnvelopa: targetCategorie === 'ANVELOPE' || /anvelop|r22\.5|r17\.5|r20|r24|cauciuc/i.test(importingItem.descrierePiesa),
          seriiIndividuale: isImportSerializat ? seriiList.map((s) => ({ serie: s.serie, dot: s.dot })) : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Articol importat cu succes în stoc!');
        setImportingItem(null);
        fetchData();

        if (selectedFactura) {
          const updatedFact = await (await fetch(`${API_BASE_URL}/efactura/facturi/${selectedFactura.id}`)).json();
          const hasRemainingUnprocessed = updatedFact.articole?.some((a: any) => a.stare === 'NEPROCESAT');
          if (!hasRemainingUnprocessed) {
            setSelectedFactura(null);
          } else {
            setSelectedFactura(updatedFact);
          }
        }
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la importul articolului în stoc.');
    }
  };

  // EXECUTE ITEM DISCARD (EXCLUDERE SERVICII / REGIE)
  const handleEliminaItem = async (itemId: string, descriere: string) => {
    const confirmed = await showConfirm(
      'Confirmare Excludere Linie',
      `Doriți să EXCLUDEȚI linia "${descriere}"?\nAceasta reprezintă o cheltuială de servicii / regie și NU va fi adăugată în stoc.`,
      'Da, exclude linia',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/efactura/items/${itemId}/elimina`, {
        method: 'POST',
      });

      if (res.ok) {
        alert(`Linia "${descriere}" a fost marcată ca Exclusă / Servicii.`);
        fetchData();
        if (selectedFactura) {
          const updatedFact = await (await fetch(`${API_BASE_URL}/efactura/facturi/${selectedFactura.id}`)).json();
          const hasRemainingUnprocessed = updatedFact.articole?.some((a: any) => a.stare === 'NEPROCESAT');
          if (!hasRemainingUnprocessed) {
            setSelectedFactura(null);
          } else {
            setSelectedFactura(updatedFact);
          }
        }
      }
    } catch (e) {
      alert('Eroare la eliminarea liniei.');
    }
  };

  // EXECUTE FULL INVOICE DISCARD (EXCLUDERE TOATĂ FACTURA / SERVICII RAPID)
  const handleEliminaToataFactura = async (facturaId: string, numar: string, furnizor: string, totalLinii: number) => {
    const confirmed = await showConfirm(
      'Exclude Toată Factura (Servicii / Regie)',
      `Sigur doriți să excludeți factura "${numar} - ${furnizor}" (${totalLinii} linii)?\n\nToate articolele vor fi marcate ca Exclus / Servicii și nu vor fi introduse în stoc.`,
      'Da, exclude toată factura',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/efactura/facturi/${facturaId}/elimina-tot`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || `Factura ${numar} a fost exclusă complet.`);
        fetchData();
        if (selectedFactura?.id === facturaId) {
          setSelectedFactura(null);
        }
      } else {
        alert('Eroare la excluderea facturii.');
      }
    } catch (e) {
      alert('Eroare la procesarea excluderii facturii.');
    }
  };

  // SORT HANDLER (Toggle ASC/DESC or switch sort column)
  const handleSort = (key: 'furnizor' | 'numarFactura' | 'dataFactura' | 'valoareTotala') => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      // Pentru dată și valoare inițial descrescător (cel mai recent / cel mai mare primul), pentru text alfabetic A-Z
      setSortDirection(key === 'dataFactura' || key === 'valoareTotala' ? 'desc' : 'asc');
    }
  };

  // FILTERED & SORTED INVOICES
  const facturiFiltrate = facturi
    .filter((f) => {
      const matchesSearch =
        f.numeVanzator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.cifVanzator?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.numarFactura?.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;
      if (stareFilter === 'TOATE') return true;
      if (stareFilter === 'NEPROCESAT') {
        return (
          f.stare === 'NEPROCESAT' ||
          f.stare === 'IMPORTAT_PARȚIAL' ||
          (f.articole && f.articole.some((a: any) => a.stare === 'NEPROCESAT'))
        );
      }
      if (stareFilter === 'IMPORTAT_TOTAL') {
        return (
          f.stare === 'IMPORTAT_TOTAL' ||
          (f.articole && f.articole.some((a: any) => a.stare === 'IMPORTAT'))
        );
      }
      if (stareFilter === 'ELIMINAT') {
        return (
          f.stare === 'ELIMINAT' ||
          (f.articole && f.articole.some((a: any) => a.stare === 'ELIMINAT'))
        );
      }
      return f.stare === stareFilter;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortKey === 'furnizor') {
        comparison = (a.numeVanzator || '').localeCompare(b.numeVanzator || '', 'ro');
      } else if (sortKey === 'numarFactura') {
        comparison = (a.numarFactura || '').localeCompare(b.numarFactura || '', 'ro', { numeric: true });
      } else if (sortKey === 'dataFactura') {
        comparison = new Date(a.dataFactura).getTime() - new Date(b.dataFactura).getTime();
      } else if (sortKey === 'valoareTotala') {
        comparison = (a.valoareTotala || 0) - (b.valoareTotala || 0);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // MULTI-SELECTION HELPERS FOR INVOICES
  const eligibleFacturi = facturiFiltrate.filter(
    (f) => f.stare !== 'IMPORTAT_TOTAL' && f.stare !== 'ELIMINAT'
  );

  const toggleSelectFactura = (id: string) => {
    setSelectedFacturaIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFacturi = () => {
    if (selectedFacturaIds.length === eligibleFacturi.length && eligibleFacturi.length > 0) {
      setSelectedFacturaIds([]);
    } else {
      setSelectedFacturaIds(eligibleFacturi.map((f) => f.id));
    }
  };

  // BULK EXCLUDE INVOICES
  const handleBulkEliminaFacturi = async () => {
    if (selectedFacturaIds.length === 0) return;

    const confirmed = await showConfirm(
      'Exclude Facturile Selectate (Excludere în Masă)',
      `Sigur doriți să excludeți cele ${selectedFacturaIds.length} facturi selectate?\n\nToate articolele acestor facturi vor fi marcate ca Servicii / Cheltuieli operaționale și nu vor fi introduse în stoc.`,
      `Da, exclude ${selectedFacturaIds.length} facturi`,
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/efactura/facturi/bulk-elimina`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ facturaIds: selectedFacturaIds }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || `${selectedFacturaIds.length} facturi au fost excluse.`);
        setSelectedFacturaIds([]);
        fetchData();
      } else {
        alert('Eroare la excluderea în masă a facturilor.');
      }
    } catch (e) {
      alert('Eroare la procesarea excluderii în masă.');
    }
  };

  // MULTI-SELECTION HELPERS FOR MODAL ITEMS
  const eligibleItems = (selectedFactura?.articole || []).filter(
    (a: any) => a.stare === 'NEPROCESAT'
  );

  const toggleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllItems = () => {
    if (selectedItemIds.length === eligibleItems.length && eligibleItems.length > 0) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(eligibleItems.map((a: any) => a.id));
    }
  };

  // BULK EXCLUDE ITEMS IN MODAL
  const handleBulkEliminaItems = async () => {
    if (selectedItemIds.length === 0) return;

    const confirmed = await showConfirm(
      'Exclude Liniile Selectate (Excludere în Masă)',
      `Sigur doriți să excludeți cele ${selectedItemIds.length} linii selectate?\n\nAcestea vor fi marcate ca Servicii / Cheltuieli operaționale și nu vor fi adăugate în stoc.`,
      `Da, exclude ${selectedItemIds.length} linii`,
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`${API_BASE_URL}/efactura/items/bulk-elimina`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: selectedItemIds }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || `${selectedItemIds.length} linii au fost excluse.`);
        setSelectedItemIds([]);
        fetchData();
        if (selectedFactura) {
          const updatedFact = await (await fetch(`${API_BASE_URL}/efactura/facturi/${selectedFactura.id}`)).json();
          const hasRemainingUnprocessed = updatedFact.articole?.some((a: any) => a.stare === 'NEPROCESAT');
          if (!hasRemainingUnprocessed) {
            setSelectedFactura(null);
          } else {
            setSelectedFactura(updatedFact);
          }
        }
      } else {
        alert('Eroare la excluderea în masă a liniilor.');
      }
    } catch (e) {
      alert('Eroare la procesarea excluderii liniilor.');
    }
  };

  const totalFacturiValoare = facturi.reduce((acc, f) => acc + (f.valoareTotala || 0), 0);
  const facturiNeprocesateCount = facturi.filter(
    (f) =>
      f.stare === 'NEPROCESAT' ||
      f.stare === 'IMPORTAT_PARȚIAL' ||
      (f.articole && f.articole.some((a: any) => a.stare === 'NEPROCESAT'))
  ).length;

  const facturiImportateCount = facturi.filter(
    (f) =>
      f.stare === 'IMPORTAT_TOTAL' ||
      (f.articole && f.articole.some((a: any) => a.stare === 'IMPORTAT'))
  ).length;

  const facturiExcluseCount = facturi.filter(
    (f) =>
      f.stare === 'ELIMINAT' ||
      (f.articole && f.articole.some((a: any) => a.stare === 'ELIMINAT'))
  ).length;

  return (
    <div className="space-y-6">
      {activeTab === 'efactura' && (
        <>
          {/* ANTET PAGINĂ ANAF E-FACTURA */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
                <FileText className="w-6 h-6 text-sapphire-500" />
                <span>ANAF RO e-Factura Hibrid (UBL 2.1)</span>
              </h1>
          <p className="text-xs text-sage-700 font-medium">
            Sincronizare automată și receptare facturi din ANAF SPV. Import articole direct în stoc sau excludere servicii / cheltuieli operaționale.
          </p>
        </div>

        <div className="flex items-center space-x-2 flex-wrap">
          <label className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer">
            <Download className="w-4 h-4 rotate-180" />
            <span>{uploadingFiles ? 'Se procesează fișierele...' : '📤 Încarcă XML / ZIP din SPV'}</span>
            <input
              type="file"
              multiple
              accept=".xml,.zip"
              onChange={handleFileUpload}
              className="hidden"
              disabled={uploadingFiles}
            />
          </label>

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

      {/* DIAGNOSTIC ERROR / SUCCESS BANNER FOR ANAF URL PARAMS */}
      {urlDiagnostic && (
        <div className={`p-5 rounded-2xl border-2 shadow-md space-y-3 transition-all ${
          urlDiagnostic.type === 'error'
            ? 'bg-rose-50 border-rose-300 text-rose-950'
            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className={`w-6 h-6 ${urlDiagnostic.type === 'error' ? 'text-rose-600' : 'text-emerald-600'}`} />
              <h3 className="font-extrabold text-sm">{urlDiagnostic.title}</h3>
            </div>
            <button
              onClick={() => setUrlDiagnostic(null)}
              className="text-xs px-2.5 py-1 rounded-lg bg-black/5 hover:bg-black/10 font-bold"
            >
              Închide
            </button>
          </div>

          <div className="p-3 bg-white/80 rounded-xl border text-xs space-y-1 font-mono">
            {urlDiagnostic.code && <p><strong>Cod Eroare Brut (raw):</strong> {urlDiagnostic.code}</p>}
            {urlDiagnostic.description && <p><strong>Descriere ANAF:</strong> {urlDiagnostic.description}</p>}
            <p className="font-sans font-medium pt-1 text-slate-800"><strong>🔍 Cauză Diagnosticată:</strong> {urlDiagnostic.details}</p>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs">
            <p className="font-bold flex items-center space-x-1 text-slate-900">
              <span>💡 Soluție Recomandată:</span>
              <span className="font-normal">{urlDiagnostic.actionHint}</span>
            </p>

            <button
              onClick={() => setShowConfigModal(true)}
              className={`px-4 py-2 rounded-xl font-bold text-xs shadow-xs text-white ${
                urlDiagnostic.type === 'error' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              ⚙️ Deschide Configurare Token-uri
            </button>
          </div>
        </div>
      )}

      {/* STATISTICI & BARĂ SINCRONIZARE HIBRIDĂ (FORCE SYNC) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="pleasant-card p-4 rounded-2xl border border-morning-200 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sage-700 tracking-wider">Total Facturi Primite</p>
            <p className="text-2xl font-extrabold text-sapphire-900 font-mono mt-0.5">{facturi.length}</p>
            <p className="text-[10px] text-sage-500 font-medium font-mono">Valoare: {totalFacturiValoare.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</p>
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
              <span>Sincronizare Manuală (Force Sync)</span>
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

      {/* LIVE PROGRESS BANNER PENTRU SINCRONIZARE ANAF */}
      {(syncing || syncStatusData?.inProgress) && (
        <div className="p-4 rounded-2xl bg-sapphire-500 text-white shadow-md flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-3">
            <RefreshCw className="w-5 h-5 animate-spin text-white" />
            <div>
              <p className="text-xs font-black tracking-wide uppercase">Sincronizare ANAF SPV în desfășurare în fundal...</p>
              <p className="text-xs text-sapphire-100 font-medium">
                {syncStatusData?.totalMessages
                  ? `Progres: ${syncStatusData.processed} / ${syncStatusData.totalMessages} mesaje verificate • ${syncStatusData.downloaded} facturi noi descărcate • ${syncStatusData.duplicates} duplicate omise`
                  : `Se interoghează serverele ANAF pentru ultimele ${selectedZile} zile...`}
              </p>
            </div>
          </div>
          <span className="text-[10px] bg-white/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
            Non-blocant • 0-24h Cloud
          </span>
        </div>
      )}

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
              className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-sapphire-900 focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-sage-400 hover:text-slate-700 bg-morning-200 hover:bg-morning-300 rounded-full w-5 h-5 flex items-center justify-center text-xs transition"
                title="Șterge căutarea (Arată toate)"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center space-x-1.5 bg-morning-100 p-1 rounded-xl overflow-x-auto">
            <button
              onClick={() => setStareFilter('NEPROCESAT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${stareFilter === 'NEPROCESAT' ? 'bg-amber-500 text-white shadow-sm' : 'text-amber-700 hover:bg-amber-100'}`}
            >
              Neprocesate ({facturiNeprocesateCount})
            </button>
            <button
              onClick={() => setStareFilter('TOATE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${stareFilter === 'TOATE' ? 'bg-sapphire-500 text-white shadow-sm' : 'text-sage-700 hover:bg-morning-200'}`}
            >
              Toate ({facturi.length})
            </button>
            <button
              onClick={() => setStareFilter('IMPORTAT_TOTAL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${stareFilter === 'IMPORTAT_TOTAL' ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-100'}`}
            >
              Importate în Stoc ({facturiImportateCount})
            </button>
            <button
              onClick={() => setStareFilter('ELIMINAT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${stareFilter === 'ELIMINAT' ? 'bg-slate-600 text-white shadow-sm' : 'text-slate-700 hover:bg-morning-200'}`}
            >
              Excluse / Servicii ({facturiExcluseCount})
            </button>
          </div>
        </div>

        {/* BARA DE ACȚIUNI ÎN MASĂ (BULK ACTIONS PENTRU FACTURI SELECTATE) */}
        {selectedFacturaIds.length > 0 && (
          <div className="flex items-center justify-between p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl animate-fade-in shadow-xs">
            <div className="flex items-center space-x-2.5">
              <span className="px-3 py-1 rounded-xl bg-amber-500 text-white font-black text-xs shadow-xs">
                {selectedFacturaIds.length} facturi selectate
              </span>
              <span className="text-xs text-amber-950 font-bold hidden sm:inline">Gata pentru excludere / marcare ca servicii în masă</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleBulkEliminaFacturi}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Exclude Facturile Selectate ({selectedFacturaIds.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFacturaIds([])}
                className="px-3 py-2 rounded-xl bg-white hover:bg-morning-100 text-slate-700 font-bold text-xs border border-morning-200 transition"
              >
                Anulează
              </button>
            </div>
          </div>
        )}

        {/* TABEL FACTURI PRIMITE */}
        <div className="bg-white rounded-2xl border border-morning-200 overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse text-xs min-w-[1000px]">
            <thead>
              <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider text-[11px] select-none">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={eligibleFacturi.length > 0 && selectedFacturaIds.length === eligibleFacturi.length}
                    onChange={toggleSelectAllFacturi}
                    className="w-4 h-4 rounded border-morning-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                    title="Selectează / Deselectează toate facturile neprocesate"
                  />
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-morning-200/80 transition"
                  onClick={() => handleSort('furnizor')}
                  title="Sortează alfabetic după Furnizor (A-Z / Z-A)"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Furnizor & CUI</span>
                    {sortKey === 'furnizor' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sapphire-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-sapphire-600 font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-morning-200/80 transition"
                  onClick={() => handleSort('numarFactura')}
                  title="Sortează după Număr Factură"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Număr Factură</span>
                    {sortKey === 'numarFactura' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sapphire-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-sapphire-600 font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-morning-200/80 transition"
                  onClick={() => handleSort('dataFactura')}
                  title="Sortează după Data Emiterii (Cele mai recente / vechi)"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Data Emiterii</span>
                    {sortKey === 'dataFactura' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sapphire-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-sapphire-600 font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  className="p-3 cursor-pointer hover:bg-morning-200/80 transition"
                  onClick={() => handleSort('valoareTotala')}
                  title="Sortează după Valoare Totală"
                >
                  <div className="flex items-center space-x-1.5">
                    <span>Valoare Totală</span>
                    {sortKey === 'valoareTotala' ? (
                      sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-sapphire-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-sapphire-600 font-bold" />
                    ) : (
                      <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th className="p-3">Stare Procesare</th>
                <th className="p-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
              {facturiFiltrate.length > 0 ? (
                facturiFiltrate.map((f, index) => (
                  <tr
                    key={f.id}
                    className={`${index % 2 === 1 ? 'bg-slate-50/90' : 'bg-white'} hover:bg-sapphire-50/80 transition ${selectedFacturaIds.includes(f.id) ? '!bg-amber-50/80' : ''}`}
                  >
                    <td className="p-3 text-center">
                      {f.stare !== 'IMPORTAT_TOTAL' && f.stare !== 'ELIMINAT' ? (
                        <input
                          type="checkbox"
                          checked={selectedFacturaIds.includes(f.id)}
                          onChange={() => toggleSelectFactura(f.id)}
                          className="w-4 h-4 rounded border-morning-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                        />
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
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
                          Parțial procesat ({f.articole?.filter((a: any) => a.stare === 'NEPROCESAT').length || 0} rămase)
                        </span>
                      )}
                      {f.stare === 'IMPORTAT_TOTAL' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">
                          Importat în Stoc
                        </span>
                      )}
                      {f.stare === 'ELIMINAT' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700 border border-slate-300">
                          Exclus / Servicii
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => { setSelectedFactura(f); setSelectedItemIds([]); }}
                          className="px-3 py-1.5 rounded-lg bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 font-bold transition border border-sapphire-200 text-xs flex items-center space-x-1.5"
                          title="Inspectează și importă/exclude articole individuale"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspectează Linii Factură</span>
                        </button>

                        {f.stare !== 'IMPORTAT_TOTAL' && f.stare !== 'ELIMINAT' && (
                          <button
                            onClick={() => handleEliminaToataFactura(f.id, f.numarFactura, f.numeVanzator, f.articole?.length || 0)}
                            className="px-2.5 py-1.5 rounded-lg bg-morning-100 hover:bg-roseash-200 text-slate-700 hover:text-rose-700 font-bold transition border border-morning-200 hover:border-rose-200 text-xs flex items-center space-x-1"
                            title="Exclude toată factura dintr-un singur click (pentru servicii, utilități, telecom, chirii etc.)"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Exclude Factura</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sage-500 font-bold">
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
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-6xl xl:max-w-7xl space-y-4 shadow-2xl max-h-[92vh] overflow-y-auto">
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
                  type="button"
                  onClick={() => openFacturaPdf(selectedFactura, config)}
                  className="px-3.5 py-1.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs flex items-center space-x-1.5 shadow-sm shadow-sapphire-500/20 transition cursor-pointer"
                  title="Deschide și vizualizează factura fiscală în format PDF / A4 printabil"
                >
                  <FileText className="w-4 h-4 text-white" />
                  <span>Deschide Factură PDF</span>
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
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold text-sage-700 uppercase tracking-wider block">
                  Linii Factură / Articole extrase din UBL 2.1:
                </span>
                {eligibleItems.length > 1 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllItems}
                    className="text-[11px] text-sapphire-700 hover:text-sapphire-900 font-bold hover:underline"
                  >
                    {selectedItemIds.length === eligibleItems.length ? 'Deselectează toate liniile' : 'Selectează toate liniile'}
                  </button>
                )}
              </div>

              {/* BARA ACȚIUNI ÎN MASĂ PENTRU LINII FACTURĂ */}
              {selectedItemIds.length > 0 && (
                <div className="flex items-center justify-between p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-fade-in">
                  <div className="flex items-center space-x-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500 text-white font-extrabold text-xs">
                      {selectedItemIds.length} linii selectate
                    </span>
                    <span className="text-xs text-amber-950 font-bold hidden sm:inline">pentru excludere</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleBulkEliminaItems}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center space-x-1 shadow-xs transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Exclude Liniile Selectate ({selectedItemIds.length})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedItemIds([])}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-morning-100 text-slate-700 font-bold text-xs border border-morning-200 transition"
                    >
                      Anulează
                    </button>
                  </div>
                </div>
              )}

              <div className="border border-morning-200 rounded-xl overflow-x-auto shadow-2xs">
                <table className="w-full text-left border-collapse text-xs min-w-[1020px]">
                  <thead>
                    <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase">
                      <th className="p-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={eligibleItems.length > 0 && selectedItemIds.length === eligibleItems.length}
                          onChange={toggleSelectAllItems}
                          className="w-3.5 h-3.5 rounded border-morning-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                          title="Selectează / Deselectează toate liniile neprocesate"
                        />
                      </th>
                      <th className="p-2.5 w-10">#</th>
                      <th className="p-2.5 min-w-[200px]">Descriere Piesă / Serviciu</th>
                      <th className="p-2.5">Cod Furnizor</th>
                      <th className="p-2.5">Cantitate</th>
                      <th className="p-2.5">Preț Unitar</th>
                      <th className="p-2.5">Total fără TVA</th>
                      <th className="p-2.5">Stare Articol</th>
                      <th className="p-2.5 text-right min-w-[340px] pr-4">Acțiuni Articol</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                    {selectedFactura.articole?.map((art: any, artIdx: number) => (
                      <tr
                        key={art.id}
                        className={`${artIdx % 2 === 1 ? 'bg-slate-50/90' : 'bg-white'} hover:bg-sapphire-50/80 transition ${selectedItemIds.includes(art.id) ? '!bg-amber-50/80' : ''}`}
                      >
                        <td className="p-2.5 text-center">
                          {art.stare === 'NEPROCESAT' ? (
                            <input
                              type="checkbox"
                              checked={selectedItemIds.includes(art.id)}
                              onChange={() => toggleSelectItem(art.id)}
                              className="w-3.5 h-3.5 rounded border-morning-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-600"
                            />
                          ) : (
                            <span className="text-slate-300 text-[10px]">-</span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-sage-500">{art.numarLinie || artIdx + 1}</td>
                        <td className="p-2.5 font-bold text-sapphire-900">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span>{art.descrierePiesa}</span>
                            {isReducereSauFinanciar(art) && (
                              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-purple-100 text-purple-900 border border-purple-300 shadow-2xs">
                                🏷️ Reducere / Garanție
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2.5 font-mono text-sage-600">{art.codArticolFurnizor || '-'}</td>
                        <td className={`p-2.5 font-mono font-bold ${art.cantitate < 0 ? 'text-purple-700 font-extrabold' : 'text-sapphire-900'}`}>
                          {art.cantitate} {art.unitateMasura}
                        </td>
                        <td className="p-2.5 font-mono text-slate-800">{art.pretUnitar?.toLocaleString('ro-RO')} RON</td>
                        <td className={`p-2.5 font-mono font-extrabold ${(art.valoareFaraTVA || 0) < 0 ? 'text-purple-700' : 'text-sapphire-900'}`}>
                          {art.valoareFaraTVA?.toLocaleString('ro-RO')} RON
                        </td>
                        <td className="p-2.5">
                          {art.stare === 'NEPROCESAT' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-200">Neprocesat</span>
                          )}
                          {art.stare === 'IMPORTAT' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1 w-fit">
                              <Check className="w-3 h-3" />
                              <span>Importat în Stoc</span>
                            </span>
                          )}
                          {art.stare === 'ELIMINAT' && (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">Exclus / Servicii</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right min-w-[340px] pr-4">
                          {isReducereSauFinanciar(art) ? (
                            art.stare === 'NEPROCESAT' && (
                              <button
                                onClick={() => handleEliminaItem(art.id, art.descrierePiesa)}
                                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition inline-flex items-center space-x-1 cursor-pointer whitespace-nowrap"
                                title="Exclude această linie financiară / reducere comercială"
                              >
                                <span>💸 Exclude (Reducere)</span>
                              </button>
                            )
                          ) : (
                            <div className="flex items-center justify-end space-x-2 whitespace-nowrap">
                              {art.stare !== 'IMPORTAT' && (
                                <>
                                  <button
                                    onClick={() => openImportItemModal(art, false)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center space-x-1"
                                    title="Importă rapid toată cantitatea în stoc"
                                  >
                                    <span>📦 Importă în Stoc</span>
                                  </button>

                                  <button
                                    onClick={() => openImportItemModal(art, true)}
                                    className="px-3 py-1.5 rounded-lg bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center space-x-1"
                                    title="Importă bucată cu bucată cu introducerea seriilor unice (anvelope, baterii, garanții)"
                                  >
                                    <span>🏷️ Cu Serii</span>
                                  </button>
                                </>
                              )}
                              {art.stare === 'NEPROCESAT' && (
                                <button
                                  onClick={() => handleEliminaItem(art.id, art.descrierePiesa)}
                                  className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer flex items-center space-x-1"
                                  title="Exclude această linie (cheltuială/servicii)"
                                >
                                  <span>🗑️ Exclude</span>
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-morning-200">
              {selectedFactura.stare !== 'IMPORTAT_TOTAL' && selectedFactura.stare !== 'ELIMINAT' ? (
                <button
                  type="button"
                  onClick={() => handleEliminaToataFactura(selectedFactura.id, selectedFactura.numarFactura, selectedFactura.numeVanzator, selectedFactura.articole?.length || 0)}
                  className="px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-roseash-200 text-slate-700 hover:text-rose-700 font-bold text-xs flex items-center space-x-1.5 transition border border-morning-200 hover:border-rose-200"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Exclude Toată Factura (Servicii)</span>
                </button>
              ) : (
                <div />
              )}

              <button
                type="button"
                onClick={() => { setSelectedFactura(null); setShowRawXml(false); }}
                className="px-5 py-2 rounded-xl bg-morning-200 hover:bg-morning-300 text-slate-700 font-bold text-xs transition"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* TAB 2: RECEPȚIE MANUALĂ PE FACTURĂ NOUĂ */}
      {activeTab === 'manual' && (
        <div className="pleasant-card p-6 rounded-2xl space-y-4">
          <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
            <ShoppingCart className="w-5 h-5 text-sapphire-500" />
            <span>2. Recepție Marfă pe Factură Nouă (Piese, Consumabile & Uleiuri)</span>
          </h2>
          <p className="text-xs text-sage-700 font-medium">Introduceți Prețul Total al Facturii și Cantitatea, iar sistemul va calcula automat Prețul Unitar (RON/unitate)!</p>

          <form onSubmit={handleManualBevetelez} className="space-y-4 text-xs">
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
                  {categoriiStoc.map((c, idx) => (
                    <option key={idx} value={c.nume}>{c.nume}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  value={`${(bevPretTotal / Math.max(1, bevCantitate)).toFixed(2)} RON / ${bevUM}`}
                  className="w-full bg-white border border-periwinkle-300 rounded-xl p-2.5 text-sapphire-600 font-mono font-extrabold text-sm opacity-95"
                />
              </div>
            </div>

            {/* ÎNREGISTRARE GARANȚIE PRODUCĂTOR */}
            <div className="p-4 bg-morning-100 border border-morning-200 rounded-2xl space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="areGarantieManual"
                  checked={bevAreGarantie}
                  onChange={(e) => setBevAreGarantie(e.target.checked)}
                  className="w-4 h-4 rounded text-sapphire-500 cursor-pointer"
                />
                <label htmlFor="areGarantieManual" className="text-sapphire-900 font-extrabold text-xs cursor-pointer flex items-center space-x-1.5">
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
                placeholder="ex: Recepție 200L butoi ulei hidraulic sau turbină în garanție"
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
                value={searchQueryHistory}
                onChange={(e) => setSearchQueryHistory(e.target.value)}
                placeholder="Căutare după furnizor, număr factură..."
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 font-bold"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[850px]">
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
                {intrariHistory
                  .filter((i) => {
                    const q = searchQueryHistory.toLowerCase().trim();
                    if (!q) return true;
                    return (
                      i.furnizor?.toLowerCase().includes(q) ||
                      i.numarFactura?.toLowerCase().includes(q) ||
                      i.articolStoc?.denumire?.toLowerCase().includes(q) ||
                      i.articolStoc?.codArticol?.toLowerCase().includes(q)
                    );
                  })
                  .map((i) => (
                    <tr key={i.id} className="hover:bg-morning-50 transition">
                      <td className="p-3 font-semibold text-sage-700">{new Date(i.dataFactura).toLocaleDateString('ro-RO')}</td>
                      <td className="p-3 font-bold text-sapphire-900">{i.furnizor}</td>
                      <td className="p-3 font-mono font-bold text-sapphire-600">{i.numarFactura}</td>
                      <td className="p-3 font-medium text-slate-800">{i.articolStoc?.denumire}</td>
                      <td className="p-3 font-mono font-bold text-sage-700">{i.cantitateIntrata} {i.articolStoc?.unitateMasura}</td>
                      <td className="p-3 font-mono text-slate-700">{Number(i.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</td>
                      <td className="p-3 text-right font-extrabold text-sapphire-900 font-mono text-sm">
                        {Number(i.pretTotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: IMPORT ARTICOL ÎN STOC (SELECTARE DEPOZIT, CATEGORIE & SUBCATEGORIE) */}
      {/* ========================================================================= */}
      {importingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <PackageCheck className="w-5 h-5 text-emerald-600" />
                <span>Import Articol în Stoc</span>
              </h3>
              <button onClick={() => setImportingItem(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* TAB SELECTOR: IMPORT STANDARD VS CU SERII PER BUCATĂ */}
            <div className="flex items-center space-x-2 bg-morning-100 p-1.5 rounded-xl border border-morning-200">
              <button
                type="button"
                onClick={() => setIsImportSerializat(false)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  !isImportSerializat ? 'bg-emerald-600 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
                }`}
              >
                📦 Import Rapid În Vrac
              </button>

              <button
                type="button"
                onClick={() => setIsImportSerializat(true)}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                  isImportSerializat ? 'bg-sapphire-600 text-white shadow-xs' : 'text-sage-700 hover:bg-morning-200'
                }`}
              >
                🏷️ Import cu Serii / Bucată ({seriiList.length} buc)
              </button>
            </div>

            <form onSubmit={handleConfirmImportItem} className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <p className="font-extrabold text-emerald-950 text-xs truncate" title={importingItem.descrierePiesa}>
                  {importingItem.descrierePiesa}
                </p>
                <div className="flex items-center space-x-3 text-[11px] text-emerald-800 font-mono">
                  <span>Cantitate: <b>{importingItem.cantitate} {importingItem.unitateMasura || 'buc'}</b></span>
                  <span>•</span>
                  <span>Preț Unitar: <b>{Number(importingItem.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON</b></span>
                </div>
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

              {/* CATEGORIE STOC CU BUTON CREARE NOUĂ */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sage-700 font-bold">Categorie Stoc: *</label>
                  {!isAddingNewCat && (
                    <button
                      type="button"
                      onClick={() => { setIsAddingNewCat(true); setNewCatNume(''); }}
                      className="text-emerald-700 hover:text-emerald-800 font-bold text-[11px] flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Categorie Nouă</span>
                    </button>
                  )}
                </div>

                {isAddingNewCat ? (
                  <div className="p-2.5 bg-emerald-50/70 border border-emerald-300 rounded-xl space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={newCatNume}
                      onChange={(e) => setNewCatNume(e.target.value)}
                      placeholder="Nume categorie nouă (ex: Scule & Utilaje)..."
                      className="w-full bg-white border border-emerald-300 rounded-lg p-2 text-sapphire-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingNewCat(false)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-morning-200 text-slate-700 text-[11px] font-semibold"
                      >
                        Anulează
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickCreateCategory}
                        disabled={savingNewCat || !newCatNume.trim()}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs disabled:opacity-50"
                      >
                        {savingNewCat ? 'Se salvează...' : 'Salvează Categoria'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={targetCategorie}
                    onChange={(e) => {
                      setTargetCategorie(e.target.value);
                      setTargetSubcategorie('');
                    }}
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
                )}
              </div>

              {/* SUBCATEGORIE STOC CU BUTON CREARE NOUĂ */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sage-700 font-bold">Subcategorie Stoc (Opțional):</label>
                  {!isAddingNewSubcat && (
                    <button
                      type="button"
                      onClick={() => { setIsAddingNewSubcat(true); setNewSubcatNume(''); }}
                      className="text-sapphire-700 hover:text-sapphire-800 font-bold text-[11px] flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Subcategorie Nouă</span>
                    </button>
                  )}
                </div>

                {isAddingNewSubcat ? (
                  <div className="p-2.5 bg-sapphire-50/70 border border-sapphire-300 rounded-xl space-y-2">
                    <input
                      type="text"
                      autoFocus
                      value={newSubcatNume}
                      onChange={(e) => setNewSubcatNume(e.target.value)}
                      placeholder={`Subcategorie pentru "${targetCategorie}" (ex: Benzi transportoare)...`}
                      className="w-full bg-white border border-sapphire-300 rounded-lg p-2 text-sapphire-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-sapphire-500/20"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingNewSubcat(false)}
                        className="px-2.5 py-1 rounded-lg bg-white border border-morning-200 text-slate-700 text-[11px] font-semibold"
                      >
                        Anulează
                      </button>
                      <button
                        type="button"
                        onClick={handleQuickCreateSubcategory}
                        disabled={savingNewSubcat || !newSubcatNume.trim()}
                        className="px-3 py-1 rounded-lg bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-[11px] shadow-xs disabled:opacity-50"
                      >
                        {savingNewSubcat ? 'Se salvează...' : 'Salvează Subcategoria'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <select
                    value={targetSubcategorie}
                    onChange={(e) => setTargetSubcategorie(e.target.value)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  >
                    <option value="">-- Fără Subcategorie (Doar Categoria Principală) --</option>
                    {(() => {
                      const currentCatObj = categoriiStoc.find((c: any) => c.nume === targetCategorie || c.id === targetCategorie);
                      const availableSubcats = currentCatObj?.subcategorii || [];
                      return availableSubcats.map((sub: any) => (
                        <option key={sub.id || sub.nume} value={sub.nume}>
                          📁 {sub.nume} {sub.descriere ? `(${sub.descriere})` : ''}
                        </option>
                      ));
                    })()}
                  </select>
                )}
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

              {/* SECȚIUNE SERII INDIVIDUALE DACĂ ESTE ACTIVAT IMPORTUL SERIALIZAT */}
              {isImportSerializat ? (
                <div className="p-3.5 bg-gradient-to-br from-sapphire-50/90 via-morning-50 to-white border border-sapphire-300 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Tag className="w-4 h-4 text-sapphire-600" />
                      <p className="font-extrabold text-sapphire-900 text-xs">
                        Serii Unice per Bucată ({seriiList.length} bucăți în factură)
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const prefix = codArticolCalculat || 'SN';
                        const timestamp = Date.now().toString().slice(-4);
                        setSeriiList(
                          seriiList.map((s, idx) => ({
                            ...s,
                            serie: `${prefix}-${timestamp}-${String(idx + 1).padStart(2, '0')}`,
                            dot: s.dot || 'DOT-2026',
                          }))
                        );
                      }}
                      className="text-[11px] font-bold text-sapphire-700 hover:text-sapphire-900 bg-white border border-sapphire-200 px-2 py-1 rounded-lg shadow-2xs transition"
                    >
                      ⚡ Generează Serii Automate
                    </button>
                  </div>

                  <p className="text-[11px] text-sage-700 font-medium">
                    Introduceți seria fizică / codul de bare pentru fiecare bucată. Pentru anvelope, acestea vor apărea direct în gestiunea roților.
                  </p>

                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {seriiList.map((item, index) => (
                      <div key={item.id} className="p-2.5 bg-white border border-morning-200 rounded-xl flex items-center space-x-2 shadow-2xs">
                        <span className="w-6 h-6 rounded-lg bg-sapphire-100 text-sapphire-900 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <label className="text-[10px] text-sage-600 font-bold block">Serie Unică (SN):</label>
                          <input
                            type="text"
                            required
                            value={item.serie}
                            onChange={(e) => {
                              const updated = [...seriiList];
                              updated[index] = { ...updated[index], serie: e.target.value };
                              setSeriiList(updated);
                            }}
                            className="w-full bg-morning-100 border border-morning-200 rounded-lg p-1.5 font-mono font-bold text-sapphire-900 text-xs"
                          />
                        </div>
                        <div className="w-32">
                          <label className="text-[10px] text-sage-600 font-bold block">DOT / Garanție:</label>
                          <input
                            type="text"
                            value={item.dot}
                            onChange={(e) => {
                              const updated = [...seriiList];
                              updated[index] = { ...updated[index], dot: e.target.value };
                              setSeriiList(updated);
                            }}
                            placeholder="DOT-2026"
                            className="w-full bg-morning-100 border border-morning-200 rounded-lg p-1.5 font-mono text-sapphire-900 text-xs"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* SECȚIUNE GARANȚIE PRODUCĂTOR SIMPLĂ */
                <div className="p-3 bg-sapphire-50/70 border border-sapphire-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <ShieldCheck className="w-4 h-4 text-sapphire-600" />
                      <label className="text-sapphire-900 font-extrabold text-xs cursor-pointer select-none">
                        Garanție Producător / Componentă Serializată
                      </label>
                    </div>
                    <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-extrabold text-sapphire-900 bg-sapphire-100 hover:bg-sapphire-200 px-2.5 py-1 rounded-lg border border-sapphire-300 transition select-none">
                      <input
                        type="checkbox"
                        checked={areGarantieProducator}
                        onChange={(e) => setAreGarantieProducator(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-sapphire-300 text-sapphire-600 focus:ring-sapphire-500 cursor-pointer accent-sapphire-600"
                      />
                      <span>Înregistrează Garanție</span>
                    </label>
                  </div>

                  {areGarantieProducator && (
                    <div className="pt-2 border-t border-sapphire-200/80 space-y-2 animate-fade-in">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-sage-700 font-bold text-[11px] block mb-1">Durată Garanție (Luni):</label>
                          <input
                            type="number"
                            min="1"
                            max="120"
                            value={durataGarantieLuni}
                            onChange={(e) => setDurataGarantieLuni(Number(e.target.value))}
                            className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-sage-700 font-bold text-[11px] block mb-1">Limită Rulaj Garanție (km / ore):</label>
                          <input
                            type="number"
                            step="100"
                            value={durataGarantieKm}
                            onChange={(e) => setDurataGarantieKm(Number(e.target.value))}
                            className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-sage-700 font-bold text-[11px] block mb-1">
                          Serie Unică (SN) Piesă (Opțional):
                        </label>
                        <input
                          type="text"
                          placeholder="Lăsați liber pentru generare automată din cod și factură..."
                          value={serieUnicaCustom}
                          onChange={(e) => setSerieUnicaCustom(e.target.value)}
                          className="w-full bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-mono text-xs"
                        />
                      </div>

                      <p className="text-[10px] text-sapphire-800 font-medium">
                        🛡️ Componenta va fi adăugată automat în registrul <b>Garanții Componente</b> (Gestiune Stocuri), monitorizată la montajul pe utilaj.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* PREȚ UNITAR DE INTRARE ÎN STOC & OPȚIUNE GARANȚIE GRATUITĂ */}
              <div className="p-3 bg-purple-500/5 border border-purple-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sage-700 font-bold text-xs">Preț Unitar de Intrare în Stoc (RON):</label>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] font-extrabold text-purple-900 bg-purple-100 hover:bg-purple-200 px-2.5 py-1 rounded-lg border border-purple-300 transition select-none">
                    <input
                      type="checkbox"
                      checked={isGarantieGratuita}
                      onChange={(e) => {
                        setIsGarantieGratuita(e.target.checked);
                        if (e.target.checked) setPretUnitarImport(0);
                        else setPretUnitarImport(importingItem.pretUnitar || 0);
                      }}
                      className="w-3.5 h-3.5 rounded border-purple-300 text-purple-600 focus:ring-purple-500 cursor-pointer accent-purple-600"
                    />
                    <span>Garanție Gratuită (0 RON)</span>
                  </label>
                </div>

                {!isGarantieGratuita ? (
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={pretUnitarImport}
                    onChange={(e) => setPretUnitarImport(Number(e.target.value))}
                    className="w-full bg-white border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold font-mono text-xs focus:ring-2 focus:ring-sapphire-500/20"
                  />
                ) : (
                  <p className="text-[11px] text-purple-800 font-medium italic">
                    ℹ️ Articolul va fi introdus în stoc cu preț de 0 RON (nu va încărca costurile flotei).
                  </p>
                )}
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
                  <h4 className="font-extrabold text-emerald-900 text-xs">Reînnoire Automată (Fără intervenție manuală ulterioară!)</h4>
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

export default function EFacturaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Se încarcă Facturi & Recepție Marfă...</div>}>
      <EFacturaContent />
    </Suspense>
  );
}
