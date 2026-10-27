"use client";

import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Settings, Save, Bell, FileText, ShieldAlert, Plus, Trash2, Edit3, CheckCircle2,
  Clock, Truck, RotateCcw, AlertTriangle, Calendar, Layers, ShieldCheck, Edit,
  Users, Building2, PackageCheck, Search, X, ChevronRight, ChevronLeft, UserCheck, Wrench,
  ArrowUpDown, ArrowUp, ArrowDown, Shield, Key, Eye, EyeOff, Lock, History, Filter, UserX, Check,
  Sun, Moon, Monitor, Palette, Droplets, ArrowUpRight, Sparkles, Type, Maximize2, Minimize2,
  Sliders, LayoutList, LayoutGrid, Receipt, ExternalLink, HelpCircle, BookOpen, RefreshCw, Zap,
  Database, Download, HardDrive, CheckCircle
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';
import { useTheme } from '@/lib/ThemeContext';
import { getCategoryColor } from '@/lib/categoryColors';

function SetariContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const { user: authUser, isAdmin, isOperator, isViewer, canEdit, authFetch, updateCurrentUser } = useAuth();
  const { theme, resolvedTheme, setTheme, fontSize, setFontSize } = useTheme();

  const [activeTab, setActiveTab] = useState<
    'vehicule' | 'mecanici' | 'depozite' | 'categorii' | 'reguli' | 'documente' | 'personalizate' | 'utilizatori' | 'audit' | 'aspect' | 'efactura' | 'backup'
  >('vehicule');

  // Ascultăm schimbarea tab-ului din URL / Sidebar (cu protecție strictă Admin pentru utilizatori, audit și efactura)
  useEffect(() => {
    if (tabParam && ['vehicule', 'mecanici', 'depozite', 'categorii', 'reguli', 'documente', 'personalizate', 'utilizatori', 'audit', 'aspect', 'efactura', 'backup'].includes(tabParam)) {
      if ((tabParam === 'utilizatori' || tabParam === 'audit' || tabParam === 'efactura' || tabParam === 'backup') && !isAdmin) {
        setActiveTab('vehicule');
      } else {
        setActiveTab(tabParam as any);
        if (tabParam === 'utilizatori') fetchUsers();
        if (tabParam === 'audit') fetchAuditLogs();
        if (tabParam === 'backup') fetchBackupStats();
      }
    }
  }, [tabParam, isAdmin]);
  const [loading, setLoading] = useState(false);

  // DATA STATES
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [categoriiVehicul, setCategoriiVehicul] = useState<any[]>([]);
  const [mecanici, setMecanici] = useState<any[]>([]);
  const [depozite, setDepozite] = useState<any[]>([]);
  const [categorii, setCategorii] = useState<any[]>([]);
  const [reguli, setReguli] = useState<any[]>([]);
  const [documente, setDocumente] = useState<any[]>([]);
  const [alertePersonalizate, setAlertePersonalizate] = useState<any[]>([]);

  // SEARCH STATES
  const [searchVehicule, setSearchVehicule] = useState('');
  const [searchMecanici, setSearchMecanici] = useState('');
  const [searchDepozite, setSearchDepozite] = useState('');

  // SORTING STATE VEHICULE
  const [sortField, setSortField] = useState<'numarIntern' | 'numarInmatriculare' | 'categorieEnum' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('TOATE');
  const [showCatManagerModal, setShowCatManagerModal] = useState<boolean>(false);

  // ==========================================
  // 1. STATE VEHICUL NOU & EDITARE & CATEGORIE VEHICUL
  // ==========================================
  const [showAddVehiculModal, setShowAddVehiculModal] = useState(false);
  const [editingVehicul, setEditingVehicul] = useState<any>(null);

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
  const [modConfigurareAxe, setModConfigurareAxe] = useState<'AUTOMAT' | 'MANUAL'>('AUTOMAT');
  const [rotiPerAxList, setRotiPerAxList] = useState<number[]>([2, 4]);

  // Categorie Vehicul Nouă & Editare State
  const [showAddVehiculCatModal, setShowAddVehiculCatModal] = useState(false);
  const [editingVehiculCat, setEditingVehiculCat] = useState<any>(null);
  const [numeCatVehiculNou, setNumeCatVehiculNou] = useState('');
  const [descriereCatVehiculNou, setDescriereCatVehiculNou] = useState('');

  // ==========================================
  // 2. STATE MECANIC NOU & EDITARE
  // ==========================================
  const [showAddMecanicModal, setShowAddMecanicModal] = useState(false);
  const [editingMecanic, setEditingMecanic] = useState<any>(null);
  const [newMecanicNume, setNewMecanicNume] = useState('');
  const [newMecanicFunctie, setNewMecanicFunctie] = useState('Mecanic Atelier');
  const [newMecanicTelefon, setNewMecanicTelefon] = useState('');

  // ==========================================
  // 3. STATE DEPOZIT NOU / EDITARE
  // ==========================================
  const [showAddDepozitModal, setShowAddDepozitModal] = useState(false);
  const [editingDepozit, setEditingDepozit] = useState<any>(null);
  const [numeDepozitNou, setNumeDepozitNou] = useState('');
  const [adresaDepozitNou, setAdresaDepozitNou] = useState('');
  const [responsabilDepozitNou, setResponsabilDepozitNou] = useState('');

  // ==========================================
  // 4. STATE CATEGORIE / SUBCATEGORIE STOC (FULL CRUD)
  // ==========================================
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<any>(null);
  const [numeCategorieNoua, setNumeCategorieNoua] = useState('');
  const [descriereCatNoua, setDescriereCatNoua] = useState('');
  const [stocMinimImplicitCat, setStocMinimImplicitCat] = useState(5);

  const [showAddSubcatModal, setShowAddSubcatModal] = useState(false);
  const [editingSubcat, setEditingSubcat] = useState<any>(null);
  const [targetCatForSubcat, setTargetCatForSubcat] = useState('');
  const [numeSubcatNoua, setNumeSubcatNoua] = useState('');
  const [descriereSubcatNoua, setDescriereSubcatNoua] = useState('');

  const [searchCategoriiText, setSearchCategoriiText] = useState('');
  const [sortCategoriiMod, setSortCategoriiMod] = useState<'alfabetic' | 'subcategorii' | 'stoc_minim'>('alfabetic');
  const [viewCategoriiMod, setViewCategoriiMod] = useState<'grid' | 'tabel'>('grid');

  // Categoriile de fluide & lubrifianți sunt gestionate dedicat în modulul /fluide
  const isFluidCategory = (c: any) => {
    if (c?.esteFluid) return true;
    const name = (c?.nume || '').toLowerCase();
    return /lubrifian|ulei|fluid|antigel|adblue|racire|lichid|vaselin/i.test(name);
  };

  const isGenericCategory = (nume: string) => {
    const n = (nume || '').toLowerCase().trim();
    return n === 'alte' || n === 'altele' || n === 'diverse' || n === 'general' || n.startsWith('alte ');
  };

  const sortedCategoriiPiese = useMemo(() => {
    let list = (categorii || [])
      .filter((c: any) => !isFluidCategory(c))
      .map((c: any) => ({
        ...c,
        subcategorii: [...(c.subcategorii || [])].sort((a: any, b: any) =>
          (a.nume || '').localeCompare(b.nume || '', 'ro', { sensitivity: 'base' })
        ),
      }));

    if (searchCategoriiText.trim()) {
      const q = searchCategoriiText.toLowerCase().trim();
      list = list.filter(
        (c: any) =>
          c.nume?.toLowerCase().includes(q) ||
          c.descriere?.toLowerCase().includes(q) ||
          (c.subcategorii || []).some(
            (sc: any) => sc.nume?.toLowerCase().includes(q) || sc.descriere?.toLowerCase().includes(q)
          )
      );
    }

    return list.sort((a: any, b: any) => {
      if (sortCategoriiMod === 'subcategorii') {
        const diff = (b.subcategorii?.length || 0) - (a.subcategorii?.length || 0);
        if (diff !== 0) return diff;
      } else if (sortCategoriiMod === 'stoc_minim') {
        const diff = (b.stocMinimImplicit || 0) - (a.stocMinimImplicit || 0);
        if (diff !== 0) return diff;
      }

      // Alfabetic, dar categoriile generice ("Alte", "Diverse") la sfârșitul listei!
      const aIsGen = isGenericCategory(a.nume);
      const bIsGen = isGenericCategory(b.nume);
      if (aIsGen && !bIsGen) return 1;
      if (!aIsGen && bIsGen) return -1;
      return (a.nume || '').localeCompare(b.nume || '', 'ro', { sensitivity: 'base' });
    });
  }, [categorii, searchCategoriiText, sortCategoriiMod]);

  const categoriiPiese = sortedCategoriiPiese;

  // ==========================================
  // 5. STATE REGULI MENTENANȚĂ
  // ==========================================
  const [showAddRegulaModal, setShowAddRegulaModal] = useState(false);
  const [editingRegula, setEditingRegula] = useState<any>(null);
  const [regulaOperatiune, setRegulaOperatiune] = useState('');
  const [regulaCategorieUtilaj, setRegulaCategorieUtilaj] = useState('TOATE');
  const [regulaTipTrigger, setRegulaTipTrigger] = useState<'KM' | 'MTH' | 'ZILE'>('KM');
  const [regulaValoareMaxima, setRegulaValoareMaxima] = useState<number>(30000);
  const [regulaAvertizareInainte, setRegulaAvertizareInainte] = useState<number>(2000);
  const [regulaStare, setRegulaStare] = useState('ACTIV');

  // ==========================================
  // 6. STATE DOCUMENTE VEHICULE & CATALOG TIPURI
  // ==========================================
  const [docViewMode, setDocViewMode] = useState<'matrice' | 'tipuri' | 'lista'>('matrice');
  const [tipuriDocumente, setTipuriDocumente] = useState<any[]>([
    { cod: 'ITP', label: 'Inspecție Tehnică Periodică (ITP)', zileAvertizare: 30, esteStandard: true, culoare: 'emerald' },
    { cod: 'RCA', label: 'Asigurare Obligatorie (RCA)', zileAvertizare: 30, esteStandard: true, culoare: 'blue' },
    { cod: 'ROVINIETA', label: 'Rovinietă (Taxă Drum)', zileAvertizare: 30, esteStandard: true, culoare: 'amber' },
    { cod: 'COPIE_CONFORMA', label: 'Copie Conformă Transport', zileAvertizare: 30, esteStandard: true, culoare: 'purple' },
    { cod: 'VERIFICARE_TAHOGRAF', label: 'Verificare Tahograf', zileAvertizare: 30, esteStandard: true, culoare: 'cyan' },
    { cod: 'CASCO', label: 'Asigurare Facultativă (CASCO)', zileAvertizare: 30, esteStandard: true, culoare: 'indigo' },
  ]);
  const [searchDocVehicul, setSearchDocVehicul] = useState('');
  const [filterDocCategorie, setFilterDocCategorie] = useState('TOATE');
  const [filterDocStatus, setFilterDocStatus] = useState('TOATE');
  const [ascundeFaraActe, setAscundeFaraActe] = useState<boolean>(true);
  const [docMatricePage, setDocMatricePage] = useState(1);
  const [docListaPage, setDocListaPage] = useState(1);

  // Stare Sortare Matrice Documente Flotă
  const [docSortCol, setDocSortCol] = useState<string>('vehicul'); // 'vehicul' sau codul tipului de document (ex. 'RCA', 'ITP')
  const [docVehiculSortMode, setDocVehiculSortMode] = useState<'abc' | 'categorie'>('abc');
  const [docSortDir, setDocSortDir] = useState<'asc' | 'desc'>('asc');

  // State Adăugare Tip Nou de Document
  const [showAddTipModal, setShowAddTipModal] = useState(false);
  const [newTipCod, setNewTipCod] = useState('');
  const [newTipLabel, setNewTipLabel] = useState('');
  const [newTipZile, setNewTipZile] = useState(30);
  const [newTipDescriere, setNewTipDescriere] = useState('');
  const [newTipCategorii, setNewTipCategorii] = useState<string[]>(['TOATE']);

  // State Adăugare / Editare Document
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [docVehiculId, setDocVehiculId] = useState('');
  const [docTip, setDocTip] = useState('ITP');
  const [docDataExpirare, setDocDataExpirare] = useState('');
  const [docZileAvertizare, setDocZileAvertizare] = useState(30);
  const [docSerie, setDocSerie] = useState('');
  const [docEmitent, setDocEmitent] = useState('');
  const [initializareRapidaLoading, setInitializareRapidaLoading] = useState(false);

  // Calcule KPI Documente
  const docKPIs = useMemo(() => {
    let total = documente.length;
    let expirate = 0;
    let avertizare = 0;
    let valide = 0;
    const now = new Date().getTime();

    documente.forEach((d) => {
      const exp = new Date(d.dataExpirare).getTime();
      const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        expirate++;
      } else if (diffDays <= (d.zileAvertizareInainte || 30)) {
        avertizare++;
      } else {
        valide++;
      }
    });

    return { total, expirate, avertizare, valide };
  }, [documente]);

  // Calcule Matrice Vehicule x Documente
  const vehiculeMatrice = useMemo(() => {
    const docMap = new Map<string, Record<string, any>>();
    documente.forEach((d) => {
      const vId = d.vehiculId;
      if (!docMap.has(vId)) {
        docMap.set(vId, {});
      }
      docMap.get(vId)![d.tipDocument] = d;
    });

    const now = new Date().getTime();

    const filtered = (vehicule || [])
      .map((v) => {
        const vDocs = docMap.get(v.id) || {};
        const docsList = Object.values(vDocs);
        let hasExpired = false;
        let hasWarning = false;
        let hasMissing = false;

        tipuriDocumente.forEach((t) => {
          const doc = vDocs[t.cod];
          if (!doc) {
            hasMissing = true;
          } else {
            const exp = new Date(doc.dataExpirare).getTime();
            const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) hasExpired = true;
            else if (diffDays <= (doc.zileAvertizareInainte || 30)) hasWarning = true;
          }
        });

        return {
          ...v,
          docs: vDocs,
          totalDocs: docsList.length,
          hasExpired,
          hasWarning,
          hasMissing,
        };
      })
      .filter((v) => {
        if (searchDocVehicul.trim()) {
          const q = searchDocVehicul.toLowerCase();
          const matchIntern = (v.numarIntern || '').toLowerCase().includes(q);
          const matchInmat = (v.numarInmatriculare || '').toLowerCase().includes(q);
          const matchMarca = (v.marca || '').toLowerCase().includes(q);
          if (!matchIntern && !matchInmat && !matchMarca) return false;
        }
        if (filterDocCategorie !== 'TOATE' && v.categorieEnum !== filterDocCategorie) {
          return false;
        }
        if (filterDocStatus === 'EXPIRATE' && !v.hasExpired) return false;
        if (filterDocStatus === 'AVERTIZARE' && !v.hasWarning) return false;
        if (filterDocStatus === 'LIPSA' && !v.hasMissing) return false;
        if (filterDocStatus === 'VALIDE' && (v.hasExpired || v.hasWarning)) return false;
        if (ascundeFaraActe && v.totalDocs === 0) return false;
        return true;
      });

    return [...filtered].sort((a, b) => {
      if (docSortCol === 'vehicul') {
        if (docVehiculSortMode === 'abc') {
          const codeA = (a.numarIntern || a.numarInmatriculare || '').toLowerCase();
          const codeB = (b.numarIntern || b.numarInmatriculare || '').toLowerCase();
          return codeA.localeCompare(codeB, 'ro', { numeric: true, sensitivity: 'base' });
        } else {
          // 'categorie'
          const catA = (a.categorieEnum || '').toLowerCase();
          const catB = (b.categorieEnum || '').toLowerCase();
          const catComp = catA.localeCompare(catB, 'ro');
          if (catComp !== 0) return catComp;
          const codeA = (a.numarIntern || a.numarInmatriculare || '').toLowerCase();
          const codeB = (b.numarIntern || b.numarInmatriculare || '').toLowerCase();
          return codeA.localeCompare(codeB, 'ro', { numeric: true, sensitivity: 'base' });
        }
      } else {
        // Sortare după un anumit tip de document (ex. RCA, ITP, etc.)
        const docA = a.docs[docSortCol];
        const docB = b.docs[docSortCol];

        if (!docA && !docB) {
          const codeA = (a.numarIntern || a.numarInmatriculare || '').toLowerCase();
          const codeB = (b.numarIntern || b.numarInmatriculare || '').toLowerCase();
          return codeA.localeCompare(codeB, 'ro', { numeric: true });
        }
        // Actele lipsă sunt plasate întotdeauna la final pentru a evidenția actele existente
        if (!docA) return 1;
        if (!docB) return -1;

        const timeA = new Date(docA.dataExpirare).getTime();
        const timeB = new Date(docB.dataExpirare).getTime();

        if (timeA !== timeB) {
          return docSortDir === 'asc' ? timeA - timeB : timeB - timeA;
        }

        const codeA = (a.numarIntern || a.numarInmatriculare || '').toLowerCase();
        const codeB = (b.numarIntern || b.numarInmatriculare || '').toLowerCase();
        return codeA.localeCompare(codeB, 'ro', { numeric: true });
      }
    });
  }, [vehicule, documente, tipuriDocumente, searchDocVehicul, filterDocCategorie, filterDocStatus, ascundeFaraActe, docSortCol, docVehiculSortMode, docSortDir]);

  // Calcule Listă Detaliată Documente
  const filteredDocumenteLista = useMemo(() => {
    return (documente || []).filter((d) => {
      if (searchDocVehicul.trim()) {
        const q = searchDocVehicul.toLowerCase();
        const vIntern = (d.vehicul?.numarIntern || '').toLowerCase();
        const vInmat = (d.vehicul?.numarInmatriculare || '').toLowerCase();
        const tip = (d.tipDocument || '').toLowerCase();
        const serie = (d.serieDocument || '').toLowerCase();
        const emitent = (d.emitent || '').toLowerCase();
        if (!vIntern.includes(q) && !vInmat.includes(q) && !tip.includes(q) && !serie.includes(q) && !emitent.includes(q)) return false;
      }
      if (filterDocCategorie !== 'TOATE') {
        const v = vehicule.find((veh) => veh.id === d.vehiculId);
        if (v && v.categorieEnum !== filterDocCategorie) return false;
      }
      if (filterDocStatus !== 'TOATE') {
        const now = new Date().getTime();
        const exp = new Date(d.dataExpirare).getTime();
        const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
        if (filterDocStatus === 'EXPIRATE' && diffDays >= 0) return false;
        if (filterDocStatus === 'AVERTIZARE' && (diffDays < 0 || diffDays > (d.zileAvertizareInainte || 30))) return false;
        if (filterDocStatus === 'VALIDE' && diffDays <= (d.zileAvertizareInainte || 30)) return false;
      }
      return true;
    });
  }, [documente, vehicule, searchDocVehicul, filterDocCategorie, filterDocStatus]);

  // ==========================================
  // 7. STATE ALERTE PERSONALIZATE
  // ==========================================
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [editingCustom, setEditingCustom] = useState<any>(null);
  const [customTitlu, setCustomTitlu] = useState('');
  const [customCategorie, setCustomCategorie] = useState('LICENTA_FIRMA');
  const [customDataExpirare, setCustomDataExpirare] = useState('');
  const [customZileAvertizare, setCustomZileAvertizare] = useState(30);
  const [customResponsabil, setCustomResponsabil] = useState('Brașoveanu Virgil');
  const [customStare, setCustomStare] = useState('ACTIV');

  // ==========================================
  // 8. STATE UTILIZATORI & ROLURI (RBAC)
  // ==========================================
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchUsers, setSearchUsers] = useState('');
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userNume, setUserNume] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userParola, setUserParola] = useState('');
  const [userRol, setUserRol] = useState<'ADMIN' | 'OPERATOR' | 'VIEWER'>('OPERATOR');
  const [userFunctie, setUserFunctie] = useState('Operator Flotă');
  const [userTelefon, setUserTelefon] = useState('');
  const [userActiv, setUserActiv] = useState(true);
  const [userConfirmParola, setUserConfirmParola] = useState('');
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [showUserConfirmPassword, setShowUserConfirmPassword] = useState(false);

  // Admin password reset
  const [resetPasswordUser, setResetPasswordUser] = useState<any>(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  // ==========================================
  // 9. STATE JURNAL AUDIT (AUDIT TRAIL)
  // ==========================================
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditTotal, setAuditTotal] = useState(0);
  const [auditFilterModul, setAuditFilterModul] = useState('TOATE');
  const [auditSearch, setAuditSearch] = useState('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [selectedAuditLog, setSelectedAuditLog] = useState<any>(null);
  const [auditViewMode, setAuditViewMode] = useState<'table' | 'cards'>('table');
  const [auditScrollPercent, setAuditScrollPercent] = useState(0);
  const [auditCanScroll, setAuditCanScroll] = useState(false);
  const auditTableContainerRef = useRef<HTMLDivElement>(null);

  const handleAuditTableScroll = () => {
    if (auditTableContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = auditTableContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 5) {
        setAuditCanScroll(true);
        setAuditScrollPercent(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
      } else {
        setAuditCanScroll(false);
      }
    }
  };

  const handleAuditSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setAuditScrollPercent(val);
    if (auditTableContainerRef.current) {
      const { scrollWidth, clientWidth } = auditTableContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      auditTableContainerRef.current.scrollLeft = (val / 100) * maxScroll;
    }
  };

  const scrollAuditBy = (delta: number) => {
    if (auditTableContainerRef.current) {
      auditTableContainerRef.current.scrollBy({ left: delta, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (activeTab === 'audit') {
      const timer = setTimeout(() => {
        handleAuditTableScroll();
      }, 150);
      window.addEventListener('resize', handleAuditTableScroll);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', handleAuditTableScroll);
      };
    }
  }, [activeTab, auditLogs, auditViewMode]);

  // ==========================================
  // 10. STATE & METODE ANAF E-FACTURA OAUTH2 (DOAR ADMIN)
  // ==========================================
  const [efacturaConfig, setEfacturaConfig] = useState<any | null>(null);
  const [efacturaCifFirma, setEfacturaCifFirma] = useState('');
  const [efacturaClientId, setEfacturaClientId] = useState('');
  const [efacturaClientSecret, setEfacturaClientSecret] = useState('');
  const [efacturaRedirectUri, setEfacturaRedirectUri] = useState('https://fleet-cmd.vercel.app/efactura');
  const [efacturaAccessToken, setEfacturaAccessToken] = useState('');
  const [efacturaRefreshToken, setEfacturaRefreshToken] = useState('');
  const [efacturaStareCronAuto, setEfacturaStareCronAuto] = useState(true);
  const [efacturaAuthCodeInput, setEfacturaAuthCodeInput] = useState('');
  const [efacturaExchangingCode, setEfacturaExchangingCode] = useState(false);
  const [efacturaLoading, setEfacturaLoading] = useState(false);
  const [efacturaSaving, setEfacturaSaving] = useState(false);
  const [efacturaSyncStatus, setEfacturaSyncStatus] = useState<any | null>(null);
  const [efacturaSyncing, setEfacturaSyncing] = useState(false);
  const [showEfacturaGuide, setShowEfacturaGuide] = useState(false);
  const [showEfacturaTokens, setShowEfacturaTokens] = useState(false);

  // Securitate & Step-Up Authentication: Deblocare cu parolă la intrarea pe tab-ul ANAF OAuth2
  const [efacturaUnlocked, setEfacturaUnlocked] = useState(false);
  const [efacturaPasswordPrompt, setEfacturaPasswordPrompt] = useState('');
  const [efacturaShowPassword, setEfacturaShowPassword] = useState(false);
  const [efacturaPasswordError, setEfacturaPasswordError] = useState('');
  const [efacturaVerifyingPassword, setEfacturaVerifyingPassword] = useState(false);

  // La părăsirea tab-ului ANAF, blocăm automat accesul pentru următoarea vizită
  useEffect(() => {
    if (activeTab !== 'efactura') {
      setEfacturaUnlocked(false);
      setEfacturaPasswordPrompt('');
      setEfacturaPasswordError('');
    }
  }, [activeTab]);

  const handleVerifyEfacturaPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!efacturaPasswordPrompt) {
      setEfacturaPasswordError('Vă rugăm să introduceți parola de administrator.');
      return;
    }

    try {
      setEfacturaVerifyingPassword(true);
      setEfacturaPasswordError('');

      const identifier = authUser?.username || authUser?.email || 'admin';
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          parola: efacturaPasswordPrompt,
        }),
      });

      if (res.ok) {
        setEfacturaUnlocked(true);
        setEfacturaPasswordPrompt('');
        setEfacturaPasswordError('');
        fetchEfacturaConfig();
      } else {
        const err = await res.json().catch(() => ({}));
        setEfacturaPasswordError(err.message || 'Parolă incorectă. Vă rugăm să încercați din nou.');
      }
    } catch (err) {
      setEfacturaPasswordError('Eroare de comunicare cu serverul de securitate.');
    } finally {
      setEfacturaVerifyingPassword(false);
    }
  };

  // Capturare automată ?code= din URL dacă utilizatorul este redirecționat de ANAF către /setari
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code && isAdmin) {
        setActiveTab('efactura');
        setEfacturaAuthCodeInput(code);
      }
    }
  }, [isAdmin]);

  const fetchEfacturaConfig = async () => {
    try {
      setEfacturaLoading(true);
      const [resConfig, resStatus] = await Promise.all([
        fetch(`${API_BASE_URL}/efactura/config`),
        fetch(`${API_BASE_URL}/efactura/sync/status`).catch(() => null),
      ]);
      if (resConfig.ok) {
        const cfg = await resConfig.json();
        setEfacturaConfig(cfg);
        setEfacturaCifFirma(cfg.cifFirma || '');
        setEfacturaClientId(cfg.clientId || '');
        setEfacturaClientSecret(cfg.clientSecret || '');
        setEfacturaRedirectUri(cfg.redirectUri || 'https://fleet-cmd.vercel.app/efactura');
        setEfacturaAccessToken(cfg.accessToken || '');
        setEfacturaRefreshToken(cfg.refreshToken || '');
        setEfacturaStareCronAuto(cfg.stareCronAuto ?? true);
      }
      if (resStatus && resStatus.ok) {
        const sData = await resStatus.json();
        setEfacturaSyncStatus(sData);
      }
    } catch (e) {
      console.error('Eroare la încărcarea configurației ANAF:', e);
    } finally {
      setEfacturaLoading(false);
    }
  };

  const handleSaveEfacturaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setEfacturaSaving(true);
      const res = await authFetch(`${API_BASE_URL}/efactura/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cifFirma: efacturaCifFirma.trim(),
          clientId: efacturaClientId.trim(),
          clientSecret: efacturaClientSecret.trim(),
          redirectUri: efacturaRedirectUri.trim(),
          accessToken: efacturaAccessToken.trim(),
          refreshToken: efacturaRefreshToken.trim(),
          stareCronAuto: efacturaStareCronAuto,
        }),
      });

      if (res.ok) {
        alert('Configurația ANAF e-Factura a fost salvată cu succes în baza de date Supabase!');
        fetchEfacturaConfig();
      } else {
        const err = await res.json();
        alert(`Eroare la salvare: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare de comunicare: ${e.message}`);
    } finally {
      setEfacturaSaving(false);
    }
  };

  const handleOpenEfacturaAuthorizeUrl = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/efactura/oauth/authorize-url`);
      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.open(data.url, '_blank');
        }
      } else {
        const err = await res.json();
        alert(`Eroare URL ANAF: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la obținerea URL-ului de autorizare ANAF.');
    }
  };

  const handleExchangeEfacturaCode = async () => {
    if (!efacturaAuthCodeInput.trim()) {
      alert('Vă rugăm să introduceți codul de autorizare primit de la ANAF (din parametrul ?code=...)!');
      return;
    }
    try {
      setEfacturaExchangingCode(true);
      const res = await authFetch(`${API_BASE_URL}/efactura/oauth/exchange-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: efacturaAuthCodeInput.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Token-uri obținute și salvate cu succes în Supabase!');
        setEfacturaAuthCodeInput('');
        fetchEfacturaConfig();
      } else {
        const err = await res.json();
        alert(`Eroare la schimbul de cod: ${err.message || 'Eroare necunoscută'}`);
      }
    } catch (e: any) {
      alert(`Eroare la schimbul de cod: ${e.message}`);
    } finally {
      setEfacturaExchangingCode(false);
    }
  };

  const handleTriggerEfacturaSync = async () => {
    try {
      setEfacturaSyncing(true);
      const res = await authFetch(`${API_BASE_URL}/efactura/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zile: 60 }),
      });
      if (res.ok) {
        alert('Sincronizarea ANAF SPV a fost lansată în fundal.');
        const poll = setInterval(async () => {
          try {
            const sRes = await authFetch(`${API_BASE_URL}/efactura/sync/status`);
            if (sRes.ok) {
              const sData = await sRes.json();
              setEfacturaSyncStatus(sData);
              if (!sData.inProgress) {
                clearInterval(poll);
                setEfacturaSyncing(false);
                fetchEfacturaConfig();
              }
            }
          } catch (err) {
            clearInterval(poll);
            setEfacturaSyncing(false);
          }
        }, 2000);
      } else {
        const err = await res.json();
        alert(`Eroare sincronizare: ${err.message}`);
        setEfacturaSyncing(false);
      }
    } catch (e) {
      alert('Eroare la pornirea sincronizării.');
      setEfacturaSyncing(false);
    }
  };


  // FETCH ALL SYSTEM SETTINGS & ENTITIES
  const fetchData = async () => {
    try {
      setLoading(true);
      const resVeh = await fetch(`${API_BASE_URL}/vehicule`);
      if (resVeh.ok) {
        const vList = await resVeh.json();
        const arr = Array.isArray(vList) ? vList : (vList?.data || vList?.items || []);
        setVehicule(arr);
        if (arr.length > 0 && !docVehiculId) setDocVehiculId(arr[0].id);
      }

      const resCatVeh = await fetch(`${API_BASE_URL}/vehicule/categorii`);
      if (resCatVeh.ok) {
        const cData = await resCatVeh.json();
        const merged = [
          ...(Array.isArray(cData.categoriiEnum) ? cData.categoriiEnum : []),
          ...(Array.isArray(cData.categoriiPersonalizate) ? cData.categoriiPersonalizate : []),
        ];
        setCategoriiVehicul(merged);
      }

      const resMec = await fetch(`${API_BASE_URL}/mentenanta/mecanici`);
      if (resMec.ok) {
        const mList = await resMec.json();
        setMecanici(Array.isArray(mList) ? mList : []);
      }

      const resDep = await fetch(`${API_BASE_URL}/stocuri-garantii/depozite`);
      if (resDep.ok) {
        const dList = await resDep.json();
        setDepozite(Array.isArray(dList) ? dList : []);
      }

      // Fetch Categorii cu retry pentru a tolera trezirea la rece pe serverul cloud
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const resCat = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii`);
          if (resCat.ok) {
            const cData = await resCat.json();
            const cArr = [
              ...(Array.isArray(cData.categoriiImplicite) ? cData.categoriiImplicite : []),
              ...(Array.isArray(cData.categoriiCustom) ? cData.categoriiCustom : []),
            ];
            if (cArr.length > 0) {
              setCategorii(cArr);
              break;
            }
          }
        } catch (err) {
          console.warn(`Tentativă ${attempt + 1} la încărcare categorii în setări:`, err);
        }
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const resReguli = await fetch(`${API_BASE_URL}/anomalii/reguli-mentenanta`);
      if (resReguli.ok) {
        const rList = await resReguli.json();
        setReguli(Array.isArray(rList) ? rList : []);
      }

      const resDocs = await fetch(`${API_BASE_URL}/anomalii/documente-vehicule`);
      if (resDocs.ok) {
        const docList = await resDocs.json();
        setDocumente(Array.isArray(docList) ? docList : []);
      }

      try {
        const resTipuri = await fetch(`${API_BASE_URL}/anomalii/tipuri-documente`);
        if (resTipuri.ok) {
          const tipList = await resTipuri.json();
          if (Array.isArray(tipList) && tipList.length > 0) {
            setTipuriDocumente(tipList);
          }
        }
      } catch (err) {
        console.warn('Tipuri documente fallback:', err);
      }

      const resCust = await fetch(`${API_BASE_URL}/anomalii/alerte-personalizate`);
      if (resCust.ok) {
        const custList = await resCust.json();
        setAlertePersonalizate(Array.isArray(custList) ? custList : []);
      }

      if (isAdmin) {
        fetchUsers();
      }
    } catch (e) {
      console.log('Eroare la încărcarea datelor din setări', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // SORT TOGGLE FUNCTION FOR VEHICLES
  const toggleSort = (field: 'numarIntern' | 'numarInmatriculare' | 'categorieEnum') => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // ------------------------------------------
  // HANDLERS VEHICUL & EDITARE & CATEGORIE VEHICUL (CRUD CATEGORIE)
  // ------------------------------------------
  const handleCreateVehicul = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numarIntern || !marca || !model) {
      alert('Vă rugăm să completați Codul intern, Marca și Modelul!');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule`, {
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
          rotiPerAxList: modConfigurareAxe === 'MANUAL' ? rotiPerAxList : undefined,
        }),
      });

      if (res.ok) {
        alert(` Vehiculul "${numarIntern}" a fost adăugat cu succes!`);
        setShowAddVehiculModal(false);
        setNumarIntern('');
        setNumarInmatriculare('');
        setMarca('');
        setModel('');
        setSerieSasiu('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la salvarea vehiculului.');
    }
  };

  const openEditVehicul = (v: any) => {
    setEditingVehicul({ ...v });
  };

  const handleUpdateVehicul = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicul) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/${editingVehicul.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numarIntern: editingVehicul.numarIntern,
          numarInmatriculare: editingVehicul.numarInmatriculare,
          categorieEnum: editingVehicul.categorieEnum,
          marca: editingVehicul.marca,
          model: editingVehicul.model,
          anFabricatie: Number(editingVehicul.anFabricatie),
          serieSasiu: editingVehicul.serieSasiu || editingVehicul.vin,
          tipMasurare: editingVehicul.tipMasurare,
          valoareContorCurent: Number(editingVehicul.valoareContorCurent),
          tarifOrarManoperaAtelier: Number(editingVehicul.tarifOrarManoperaAtelier || editingVehicul.tarifOrarStandard || 0),
        }),
      });

      if (res.ok) {
        alert(` Vehiculul "${editingVehicul.numarIntern}" a fost actualizat cu succes!`);
        setEditingVehicul(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare la actualizare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la actualizarea vehiculului.');
    }
  };

  const handleCreateVehiculCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeCatVehiculNou) {
      alert('Vă rugăm să introduceți denumirea categoriei de vehicul/utilaj!');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/categorii`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeCatVehiculNou,
          descriere: descriereCatVehiculNou,
        }),
      });

      if (res.ok) {
        const created = await res.json();
        alert(` Categorie vehicul nou/utilaj "${created.nume || numeCatVehiculNou}" creată cu succes!`);
        setShowAddVehiculCatModal(false);
        setNumeCatVehiculNou('');
        setDescriereCatVehiculNou('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la crearea categoriei de vehicul.');
    }
  };

  const openEditVehiculCat = (c: any) => {
    setEditingVehiculCat({ ...c, originalId: c.id, originalNume: c.nume });
  };

  const handleUpdateVehiculCat = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = editingVehiculCat.originalId || editingVehiculCat.id || editingVehiculCat.originalNume;
    if (!targetId) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/categorii/${encodeURIComponent(targetId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: editingVehiculCat.nume,
          descriere: editingVehiculCat.descriere,
        }),
      });

      if (res.ok) {
        alert(`Categoria "${editingVehiculCat.nume}" a fost actualizată cu succes!`);
        setEditingVehiculCat(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut actualiza categoria'}`);
      }
    } catch (e) {
      alert('Eroare la actualizarea categoriei.');
    }
  };

  const handleDeleteVehiculCat = async (id: string, nume: string) => {
    const confirmed = await showConfirm(
      'Ștergere Categorie Vehicul',
      `Sigur doriți să ștergeți categoria "${nume}"? Vehiculele din această categorie vor deveni "Nealocat".`,
      'Da, șterge categoria',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const target = id || nume;
      const res = await fetch(`${API_BASE_URL}/vehicule/categorii/${encodeURIComponent(target)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert(`Categoria "${nume}" a fost ștearsă. Vehiculele asignate au fost marcate ca "Nealocat".`);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge categoria'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea categoriei.');
    }
  };

  const handleDeleteVehicul = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Vehicul',
      'Sigur doriți să ștergeți acest vehicul din flotă?',
      'Da, șterge vehiculul',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Vehicul șters din sistem.');
        fetchData();
      }
    } catch (e) {
      alert('Eroare la ștergerea vehiculului.');
    }
  };

  // ------------------------------------------
  // HANDLERS MECANIC
  // ------------------------------------------
  const openAddMecanic = () => {
    setEditingMecanic(null);
    setNewMecanicNume('');
    setNewMecanicFunctie('Mecanic Atelier');
    setNewMecanicTelefon('');
    setShowAddMecanicModal(true);
  };

  const openEditMecanic = (m: any) => {
    setEditingMecanic(m);
    setNewMecanicNume(m.nume || '');
    setNewMecanicFunctie(m.functie || 'Mecanic Atelier');
    setNewMecanicTelefon(m.telefon || '');
    setShowAddMecanicModal(true);
  };

  const handleSaveMecanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMecanicNume) return;
    try {
      const url = editingMecanic
        ? `${API_BASE_URL}/mentenanta/mecanici/${editingMecanic.id}`
        : `${API_BASE_URL}/mentenanta/mecanici`;
      const method = editingMecanic ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: newMecanicNume,
          functie: newMecanicFunctie,
          telefon: newMecanicTelefon,
        }),
      });

      if (res.ok) {
        alert(editingMecanic ? ` Datele mecanicului "${newMecanicNume}" au fost actualizate!` : ' Mecanic înregistrat cu succes!');
        setShowAddMecanicModal(false);
        setEditingMecanic(null);
        setNewMecanicNume('');
        setNewMecanicTelefon('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut salva mecanicul'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea mecanicului.');
    }
  };

  const handleDeleteMecanic = async (id: string) => {
    const confirmed = await showConfirm(
      'Eliminare Mecanic Activ',
      'Sigur doriți să eliminați acest mecanic din lista mecanicilor activi?\n\nNotă: Toate lucrările și devizele efectuate anterior de acesta vor rămâne salvate intact în istoric.',
      'Da, elimină mecanicul',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/mentenanta/mecanici/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || 'Mecanic eliminat din lista activă.');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge mecanicul'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea mecanicui.');
    }
  };

  // ------------------------------------------
  // HANDLERS DEPOZIT
  // ------------------------------------------
  const handleSaveDepozit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeDepozitNou) return;
    try {
      const url = editingDepozit
        ? `${API_BASE_URL}/stocuri-garantii/depozite/${editingDepozit.id}`
        : `${API_BASE_URL}/stocuri-garantii/depozite`;
      const method = editingDepozit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: numeDepozitNou,
          adresa: adresaDepozitNou,
          responsabil: responsabilDepozitNou,
        }),
      });

      if (res.ok) {
        alert(` Depozit "${numeDepozitNou}" ${editingDepozit ? 'actualizat' : 'creat'} cu succes!`);
        setShowAddDepozitModal(false);
        setEditingDepozit(null);
        setNumeDepozitNou('');
        setAdresaDepozitNou('');
        setResponsabilDepozitNou('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la salvarea depozitului.');
    }
  };

  const openEditDepozit = (d: any) => {
    setEditingDepozit(d);
    setNumeDepozitNou(d.nume || '');
    setAdresaDepozitNou(d.adresa || '');
    setResponsabilDepozitNou(d.responsabil || '');
    setShowAddDepozitModal(true);
  };

  const openAddDepozit = () => {
    setEditingDepozit(null);
    setNumeDepozitNou('');
    setAdresaDepozitNou('');
    setResponsabilDepozitNou('');
    setShowAddDepozitModal(true);
  };

  const handleDeleteDepozit = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Depozit',
      'Sigur doriți să ștergeți acest depozit?',
      'Da, șterge depozitul',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/depozite/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Depozit șters.');
        fetchData();
      }
    } catch (e) {
      alert('Eroare la ștergerea depozitului.');
    }
  };

  // ------------------------------------------
  // HANDLERS CATEGORII & SUBCATEGORII STOC (FULL CRUD)
  // ------------------------------------------
  const openAddCat = () => {
    setEditingCat(null);
    setNumeCategorieNoua('');
    setDescriereCatNoua('');
    setStocMinimImplicitCat(5);
    setShowAddCatModal(true);
  };

  const openEditCat = (c: any) => {
    setEditingCat(c);
    setNumeCategorieNoua(c.nume || '');
    setDescriereCatNoua(c.descriere || '');
    setStocMinimImplicitCat(c.stocMinimImplicit !== undefined && c.stocMinimImplicit !== null ? Number(c.stocMinimImplicit) : 5);
    setShowAddCatModal(true);
  };

  const handleSaveCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeCategorieNoua.trim()) {
      alert('Vă rugăm introduceți numele categoriei!');
      return;
    }
    if (stocMinimImplicitCat < 0) {
      alert('Pragul de alertă stoc minim nu poate fi un număr negativ!');
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
          nume: numeCategorieNoua.trim(),
          descriere: descriereCatNoua.trim() || null,
          stocMinimImplicit: Math.max(0, Number(stocMinimImplicitCat) || 0),
        }),
      });

      if (res.ok) {
        alert(` Categorie "${numeCategorieNoua.trim()}" ${editingCat ? 'actualizată' : 'creată'} cu succes!`);
        setShowAddCatModal(false);
        setEditingCat(null);
        setNumeCategorieNoua('');
        setDescriereCatNoua('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea categoriei.');
    }
  };

  const handleDeleteCategorie = async (id: string, nume: string) => {
    const confirmed = await showConfirm(
      'Ștergere Categorie Stoc',
      `Sigur doriți să ștergeți categoria "${nume}" și toate subcategoriile asociate acesteia?\n\nArticolele din stoc asociate acestei categorii își vor păstra denumirea.`,
      'Da, șterge categoria',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/categorii/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`Categoria "${nume}" a fost ștearsă.`);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge categoria'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea categoriei.');
    }
  };

  const openAddSubcat = (catNume?: string) => {
    setEditingSubcat(null);
    setTargetCatForSubcat(catNume || (categoriiPiese[0]?.nume || categorii[0]?.nume || ''));
    setNumeSubcatNoua('');
    setDescriereSubcatNoua('');
    setShowAddSubcatModal(true);
  };

  const openEditSubcat = (sc: any, catNume: string) => {
    setEditingSubcat(sc);
    setTargetCatForSubcat(catNume);
    setNumeSubcatNoua(sc.nume || '');
    setDescriereSubcatNoua(sc.descriere || '');
    setShowAddSubcatModal(true);
  };

  const handleSaveSubcategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeSubcatNoua.trim() || !targetCatForSubcat) {
      alert('Vă rugăm selectați Categoria și introduceți numele Subcategoriei!');
      return;
    }
    try {
      const url = editingSubcat
        ? `${API_BASE_URL}/stocuri-garantii/subcategorii/${editingSubcat.id}`
        : `${API_BASE_URL}/stocuri-garantii/subcategorii`;
      const method = editingSubcat ? 'PATCH' : 'POST';

      const targetCatObj = categorii.find((c: any) => c.nume === targetCatForSubcat);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorieNume: targetCatForSubcat,
          categorieStocId: targetCatObj?.id,
          nume: numeSubcatNoua.trim(),
          descriere: descriereSubcatNoua.trim() || null,
        }),
      });

      if (res.ok) {
        alert(` Subcategorie "${numeSubcatNoua.trim()}" ${editingSubcat ? 'actualizată' : 'adăugată'} cu succes!`);
        setShowAddSubcatModal(false);
        setEditingSubcat(null);
        setNumeSubcatNoua('');
        setDescriereSubcatNoua('');
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Verificați datele'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea subcategoriei.');
    }
  };

  const handleDeleteSubcategorie = async (id: string, nume: string) => {
    const confirmed = await showConfirm(
      'Ștergere Subcategorie',
      `Sigur doriți să ștergeți subcategoria "${nume}"?`,
      'Da, șterge subcategoria',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/stocuri-garantii/subcategorii/${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`Subcategoria "${nume}" a fost ștearsă.`);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge subcategoria'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea subcategoriei.');
    }
  };

  // ------------------------------------------
  // HANDLERS REGULI & DOCUMENTE & ALERTE
  // ------------------------------------------
  const openAddRegula = () => {
    setEditingRegula(null);
    setRegulaOperatiune('');
    setRegulaCategorieUtilaj('TOATE');
    setRegulaTipTrigger('KM');
    setRegulaValoareMaxima(30000);
    setRegulaAvertizareInainte(2000);
    setRegulaStare('ACTIV');
    setShowAddRegulaModal(true);
  };

  const openEditRegula = (r: any) => {
    setEditingRegula(r);
    setRegulaOperatiune(r.denumireOperatiune);
    setRegulaCategorieUtilaj(r.categorieUtilaj || 'TOATE');
    setRegulaTipTrigger(r.tipTrigger || 'KM');
    setRegulaValoareMaxima(r.valoareMaxima || 0);
    setRegulaAvertizareInainte(r.avertizareInainte || 0);
    setRegulaStare(r.stare || 'ACTIV');
    setShowAddRegulaModal(true);
  };

  const handleSaveRegula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regulaOperatiune) return;
    try {
      const url = editingRegula
        ? `${API_BASE_URL}/anomalii/reguli-mentenanta/${editingRegula.id}`
        : `${API_BASE_URL}/anomalii/reguli-mentenanta`;
      const method = editingRegula ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          denumireOperatiune: regulaOperatiune,
          categorieUtilaj: regulaCategorieUtilaj,
          tipTrigger: regulaTipTrigger,
          valoareMaxima: Number(regulaValoareMaxima),
          avertizareInainte: Number(regulaAvertizareInainte),
          stare: regulaStare,
        }),
      });

      if (res.ok) {
        alert('Regulă de mentenanță salvată cu succes!');
        setShowAddRegulaModal(false);
        fetchData();
      }
    } catch (e) {
      alert('Eroare la salvarea regulii.');
    }
  };

  const handleDeleteRegula = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Regulă',
      'Sigur doriți să ștergeți această regulă?',
      'Da, șterge regula',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/reguli-mentenanta/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {
      alert('Eroare la ștergere.');
    }
  };

  const openAddDoc = (prefillVehId?: string, prefillTip?: string) => {
    setEditingDoc(null);
    setDocVehiculId(prefillVehId || (vehicule[0]?.id || ''));
    setDocTip(prefillTip || 'ITP');
    setDocDataExpirare('');
    setDocZileAvertizare(30);
    setDocSerie('');
    setDocEmitent('');
    setShowAddDocModal(true);
  };

  const openEditDocDirect = (doc: any) => {
    setEditingDoc(doc);
    setDocVehiculId(doc.vehiculId || doc.vehicul?.id || '');
    setDocTip(doc.tipDocument || 'ITP');
    setDocDataExpirare(doc.dataExpirare ? new Date(doc.dataExpirare).toISOString().split('T')[0] : '');
    setDocZileAvertizare(doc.zileAvertizareInainte || 30);
    setDocSerie(doc.serieDocument || '');
    setDocEmitent(doc.emitent || '');
    setShowAddDocModal(true);
  };

  const setQuickDateDoc = (months: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + months);
    setDocDataExpirare(d.toISOString().split('T')[0]);
  };

  const handleSaveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docVehiculId || !docDataExpirare) return;
    try {
      const url = editingDoc
        ? `${API_BASE_URL}/anomalii/documente-vehicule/${editingDoc.id}`
        : `${API_BASE_URL}/anomalii/documente-vehicule`;
      const method = editingDoc ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehiculId: docVehiculId,
          tipDocument: docTip,
          dataExpirare: docDataExpirare,
          zileAvertizareInainte: Number(docZileAvertizare),
          serieDocument: docSerie,
          emitent: docEmitent,
        }),
      });

      if (res.ok) {
        setShowAddDocModal(false);
        fetchData();
      } else {
        alert('Eroare la salvarea documentului.');
      }
    } catch (e) {
      alert('Eroare la salvarea documentului.');
    }
  };

  const handleSaveTipDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTipCod.trim() || !newTipLabel.trim()) {
      alert('Vă rugăm să introduceți codul și denumirea noului tip de document.');
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/tipuri-documente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cod: newTipCod.trim(),
          label: newTipLabel.trim(),
          zileAvertizare: Number(newTipZile) || 30,
          descriere: newTipDescriere.trim(),
          categorii: newTipCategorii,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTipuriDocumente(updated);
        setShowAddTipModal(false);
        setNewTipCod('');
        setNewTipLabel('');
        setNewTipDescriere('');
        alert('Tipul de document a fost adăugat cu succes!');
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut salva tipul de document'}`);
      }
    } catch (err) {
      alert('Eroare de conexiune la salvarea tipului de document.');
    }
  };

  const handleDeleteTipDocument = async (cod: string) => {
    const confirmed = await showConfirm(
      'Ștergere Tip Document',
      `Sigur doriți să ștergeți tipul de document "${cod}"?`,
      'Da, șterge',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/tipuri-documente/${cod}`, { method: 'DELETE' });
      if (res.ok) {
        const updated = await res.json();
        setTipuriDocumente(updated);
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge tipul de document'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea tipului de document.');
    }
  };

  const handleInitializareRapidaFlota = async () => {
    const confirmed = await showConfirm(
      'Inițializare Automată Acte Flotă',
      'Doriți să generați automat sloturile de documente lipsă pentru vehiculele din flotă conform categoriei lor (ITP, RCA, Rovinietă, Tahograf)?',
      'Da, inițializează automat',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      setInitializareRapidaLoading(true);
      const res = await fetch(`${API_BASE_URL}/anomalii/documente-vehicule/initializare-rapida`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Documentele au fost inițializate cu succes!');
        fetchData();
      } else {
        alert('Eroare la inițializarea automată a documentelor.');
      }
    } catch (err) {
      alert('Eroare de conexiune.');
    } finally {
      setInitializareRapidaLoading(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Document',
      'Sigur doriți să ștergeți acest document?',
      'Da, șterge documentul',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/documente-vehicule/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {
      alert('Eroare la ștergere.');
    }
  };

  const openAddCustom = () => {
    setEditingCustom(null);
    setCustomTitlu('');
    setCustomCategorie('LICENTA_FIRMA');
    setCustomDataExpirare('');
    setCustomZileAvertizare(30);
    setCustomResponsabil('Brașoveanu Virgil');
    setCustomStare('ACTIV');
    setShowAddCustomModal(true);
  };

  const handleSaveCustomAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitlu || !customDataExpirare) return;
    try {
      const url = editingCustom
        ? `${API_BASE_URL}/anomalii/alerte-personalizate/${editingCustom.id}`
        : `${API_BASE_URL}/anomalii/alerte-personalizate`;
      const method = editingCustom ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titlu: customTitlu,
          categorie: customCategorie,
          dataExpirare: customDataExpirare,
          zileAvertizareInainte: Number(customZileAvertizare),
          responsabil: customResponsabil,
          stare: customStare,
        }),
      });

      if (res.ok) {
        alert('Alertă personalizată salvată!');
        setShowAddCustomModal(false);
        fetchData();
      }
    } catch (e) {
      alert('Eroare la salvarea alertei.');
    }
  };

    // ------------------------------------------
  // ==========================================
  // 12. STATE & METODE COPIE DE SIGURANȚĂ (BACKUP & RESTORE)
  // ==========================================
  const [backupStats, setBackupStats] = useState<any>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupDownloading, setBackupDownloading] = useState(false);
  const [backupSuccessMessage, setBackupSuccessMessage] = useState<string | null>(null);

  const fetchBackupStats = async () => {
    setBackupLoading(true);
    try {
      const res = await authFetch(`${API_BASE_URL}/backup/stats`);
      if (res.ok) {
        const data = await res.json();
        setBackupStats(data);
      }
    } catch (e) {
      console.error('Eroare la încărcarea statisticilor bazei de date', e);
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDownloadBackup = async () => {
    setBackupDownloading(true);
    setBackupSuccessMessage(null);
    try {
      const res = await authFetch(`${API_BASE_URL}/backup/download`);
      if (!res.ok) {
        throw new Error('Serverul a returnat o eroare la generarea copiei de siguranță.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.href = url;
      a.download = `fleetcmd_backup_${nowStr}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setBackupSuccessMessage('Copie de siguranță descărcată cu succes pe calculatorul dumneavoastră!');
      setTimeout(() => setBackupSuccessMessage(null), 8000);
    } catch (e: any) {
      alert(`Eroare la descărcarea copiei de siguranță: ${e.message}`);
    } finally {
      setBackupDownloading(false);
    }
  };

  // HANDLERS UTILIZATORI & AUDIT
  // ------------------------------------------
  const fetchUsers = async () => {
    try {
      const res = await authFetch(`${API_BASE_URL}/auth/users`);
      if (res.ok) {
        const uList = await res.json();
        setUsersList(Array.isArray(uList) ? uList : []);
      }
    } catch (e) {
      console.log('Eroare la încărcarea utilizatorilor', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setAuditLoading(true);
      const params = new URLSearchParams();
      if (auditFilterModul !== 'TOATE') params.append('modul', auditFilterModul);
      if (auditSearch.trim()) params.append('search', auditSearch.trim());
      params.append('limit', '50');

      const res = await authFetch(`${API_BASE_URL}/audit/logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(Array.isArray(data.logs) ? data.logs : []);
        setAuditTotal(data.total || 0);
      }
    } catch (e) {
      console.log('Eroare la încărcarea jurnalului de audit', e);
    } finally {
      setAuditLoading(false);
    }
  };

  const openAddUser = () => {
    setEditingUser(null);
    setUserNume('');
    setUserUsername('');
    setUserParola('');
    setUserConfirmParola('');
    setShowUserPassword(false);
    setShowUserConfirmPassword(false);
    setUserRol('OPERATOR');
    setUserFunctie('Operator Flotă');
    setUserTelefon('');
    setUserActiv(true);
    setShowAddUserModal(true);
  };

  const openEditUser = (u: any) => {
    setEditingUser(u);
    setUserNume(u.nume || '');
    setUserUsername(u.username || '');
    setUserParola('');
    setUserConfirmParola('');
    setShowUserPassword(false);
    setShowUserConfirmPassword(false);
    setUserRol(u.rol || 'OPERATOR');
    setUserFunctie(u.functie || '');
    setUserTelefon(u.telefon || '');
    setUserActiv(u.activ !== false);
    setShowAddUserModal(true);
  };

  const openResetPasswordModal = (u: any) => {
    setResetPasswordUser(u);
    setResetNewPassword('');
    setResetConfirmPassword('');
    setShowResetPassword(false);
    setShowResetConfirmPassword(false);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser) return;
    if (!resetNewPassword) {
      alert('Vă rugăm să introduceți o nouă parolă.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      alert('Parolele introduse nu coincid! Vă rugăm să rescrieți parola.');
      return;
    }
    if (resetNewPassword.length < 4) {
      alert('Noua parolă trebuie să aibă minim 4 caractere!');
      return;
    }

    try {
      setResetLoading(true);
      const res = await authFetch(`${API_BASE_URL}/auth/users/${resetPasswordUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nouaParola: resetNewPassword }),
      });

      if (res.ok) {
        const data = await res.json();
        alert(data.mesaj || `Parola pentru "${resetPasswordUser.nume}" a fost resetată cu succes!`);
        setResetPasswordUser(null);
        setResetNewPassword('');
        setResetConfirmPassword('');
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut reseta parola'}`);
      }
    } catch (err) {
      alert('Eroare de conexiune la resetarea parolei.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userNume.trim()) {
      alert('Vă rugăm să completați Numele și Prenumele.');
      return;
    }
    if (!userUsername.trim()) {
      alert('Vă rugăm să introduceți Numele de Utilizator (Username).');
      return;
    }

    if (!editingUser) {
      if (!userParola) {
        alert('Vă rugăm să introduceți o parolă de acces.');
        return;
      }
      if (userParola !== userConfirmParola) {
        alert('Parolele introduse nu coincid! Vă rugăm să verificați câmpurile.');
        return;
      }
      if (userParola.length < 4) {
        alert('Parola trebuie să conțină minim 4 caractere!');
        return;
      }
    } else if (userParola) {
      if (userParola !== userConfirmParola) {
        alert('Parolele introduse nu coincid! Vă rugăm să verificați câmpurile.');
        return;
      }
      if (userParola.length < 4) {
        alert('Noua parolă trebuie să conțină minim 4 caractere!');
        return;
      }
    }

    try {
      const url = editingUser
        ? `${API_BASE_URL}/auth/users/${editingUser.id}`
        : `${API_BASE_URL}/auth/users`;
      const method = editingUser ? 'PATCH' : 'POST';

      const payload: any = {
        nume: userNume.trim(),
        username: userUsername.trim(),
        rol: userRol,
        functie: userFunctie,
        telefon: userTelefon,
        activ: userActiv,
      };
      if (userParola) payload.parola = userParola.trim();

      // Ensure admin cannot be demoted or deactivated
      if (editingUser && (editingUser.rol === 'ADMIN' || editingUser.username === 'admin')) {
        payload.rol = 'ADMIN';
        payload.activ = true;
      }

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert(editingUser ? `Utilizatorul "${userNume}" a fost actualizat!` : `Utilizatorul "${userNume}" a fost creat cu succes!`);
        if (authUser && editingUser && (authUser.id === editingUser.id || authUser.username === editingUser.username)) {
          updateCurrentUser({
            nume: userNume.trim(),
            username: userUsername.trim(),
            functie: userFunctie,
            telefon: userTelefon,
          });
        }
        setShowAddUserModal(false);
        setEditingUser(null);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut salva utilizatorul'}`);
      }
    } catch (e) {
      alert('Eroare la salvarea utilizatorului.');
    }
  };

  const handleDeleteUser = async (u: any) => {
    if (u.rol === 'ADMIN' || u.username === 'admin') {
      alert('Contul de administrator este protejat și nu poate fi șters din sistem!');
      return;
    }

    const confirmed = await showConfirm(
      'Ștergere Utilizator',
      `Sigur doriți să ștergeți utilizatorul "${u.nume}" (@${u.username})? Această acțiune este ireversibilă.`,
      'Da, șterge utilizatorul',
      'Anulează'
    );
    if (!confirmed) return;

    try {
      const res = await authFetch(`${API_BASE_URL}/auth/users/${u.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert(`Utilizatorul "${u.nume}" a fost șters.`);
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut șterge utilizatorul'}`);
      }
    } catch (e) {
      alert('Eroare la ștergerea utilizatorului.');
    }
  };

  const handleToggleUserActive = async (u: any) => {
    if ((u.rol === 'ADMIN' || u.username === 'admin') && u.activ) {
      alert('Contul de administrator este permanent activ și nu poate fi dezactivat!');
      return;
    }

    try {
      const res = await authFetch(`${API_BASE_URL}/auth/users/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activ: !u.activ }),
      });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message || 'Nu s-a putut schimba starea utilizatorului'}`);
      }
    } catch (e) {
      console.log('Eroare la schimbarea stării utilizatorului', e);
    }
  };

  const handleDeleteCustom = async (id: string) => {
    const confirmed = await showConfirm(
      'Ștergere Alertă Personalizată',
      'Sigur doriți să ștergeți această alertă?',
      'Da, șterge alerta',
      'Anulează'
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`${API_BASE_URL}/anomalii/alerte-personalizate/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (e) {
      alert('Eroare la ștergere.');
    }
  };

  // FILTERED AND SORTED VEHICLES LIST
  const vehiculeFiltrateSiSortate = [...vehicule]
    .filter((v) => {
      // 1. Filtru Categorie Selectată
      if (selectedCatFilter !== 'TOATE') {
        if ((v.categorieEnum || '').toUpperCase() !== selectedCatFilter.toUpperCase()) {
          return false;
        }
      }
      // 2. Căutare Text
      const q = searchVehicule.toLowerCase();
      return (
        !q ||
        v.numarIntern?.toLowerCase().includes(q) ||
        v.numarInmatriculare?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q) ||
        v.serieSasiu?.toLowerCase().includes(q) ||
        v.vin?.toLowerCase().includes(q) ||
        v.categorieEnum?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!sortField) return 0;
      let valA = '';
      let valB = '';

      if (sortField === 'numarIntern') {
        valA = (a.numarIntern || '').toLowerCase();
        valB = (b.numarIntern || '').toLowerCase();
      } else if (sortField === 'numarInmatriculare') {
        valA = (a.numarInmatriculare || '').toLowerCase();
        valB = (b.numarInmatriculare || '').toLowerCase();
      } else if (sortField === 'categorieEnum') {
        valA = (a.categorieEnum || '').toLowerCase();
        valB = (b.categorieEnum || '').toLowerCase();
      }

      const cmp = valA.localeCompare(valB, 'ro', { numeric: true, sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });

  const mecaniciFiltrati = mecanici.filter(
    (m) =>
      m.nume?.toLowerCase().includes(searchMecanici.toLowerCase()) ||
      m.functie?.toLowerCase().includes(searchMecanici.toLowerCase())
  );

  const depoziteFiltrate = depozite.filter(
    (d) =>
      d.nume?.toLowerCase().includes(searchDepozite.toLowerCase()) ||
      d.responsabil?.toLowerCase().includes(searchDepozite.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ANTET PAGINĂ SETĂRI */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <Settings className="w-6 h-6 text-sapphire-500" />
            <span>Setări Sistem & Administrare Entități</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">
            Panou centralizat pentru adăugarea autovehiculelor, editarea/ștergerea categoriilor, mecanicilor, depozitelor și regulilor de alerte.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchData}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-morning-100 border border-morning-200 text-xs font-bold text-sapphire-900 shadow-xs transition"
          >
            <RotateCcw className="w-4 h-4 text-sapphire-500" />
            <span>Reîmprospătează Datele</span>
          </button>
        </div>
      </div>

      {/* Meniu Tab-uri Administrare */}
      <div className="flex items-center space-x-2 border-b border-morning-200 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('vehicule')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
            activeTab === 'vehicule'
              ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
              : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
          }`}
        >
          <Truck className="w-4 h-4 text-sapphire-500" />
          <span>Flotă & Vehicule ({vehicule.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mecanici')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
            activeTab === 'mecanici'
              ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
              : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
          }`}
        >
          <Users className="w-4 h-4 text-periwinkle-600" />
          <span>Mecanici Atelier ({mecanici.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('depozite')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
            activeTab === 'depozite'
              ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
              : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
          }`}
        >
          <Building2 className="w-4 h-4 text-sapphire-500" />
          <span>Depozite Flotă ({depozite.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('categorii')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
            activeTab === 'categorii'
              ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
              : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
          }`}
        >
          <Layers className="w-4 h-4 text-periwinkle-700" />
          <span>Categorii Stoc Piese ({categoriiPiese.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('reguli')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
            activeTab === 'reguli'
              ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
              : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
          }`}
        >
          <Clock className="w-4 h-4 text-terracotta-600" />
          <span>Reguli Alerte ({reguli.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('documente')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
            activeTab === 'documente'
              ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
              : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
          }`}
        >
          <FileText className="w-4 h-4 text-sapphire-500" />
          <span>Documente Vehicule ({documente.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('personalizate')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
            activeTab === 'personalizate'
              ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
              : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-terracotta-500" />
          <span>Licențe & Alerte Firmă ({alertePersonalizate.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('aspect')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
            activeTab === 'aspect'
              ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
              : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
          }`}
        >
          <Palette className="w-4 h-4 text-sapphire-500" />
          <span>Aspect & Temă Vizuală</span>
        </button>

        {isAdmin && (
          <>
            <button
              onClick={() => { setActiveTab('utilizatori'); fetchUsers(); }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
                activeTab === 'utilizatori'
                  ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
                  : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
              }`}
            >
              <Users className="w-4 h-4 text-sapphire-600" />
              <span>Utilizatori & Roluri ({usersList.length})</span>
              <span className="px-1.5 py-0.2 rounded bg-sapphire-100 text-sapphire-800 text-[9px] font-black uppercase">Admin</span>
            </button>

            <button
              onClick={() => { setActiveTab('audit'); fetchAuditLogs(); }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
                activeTab === 'audit'
                  ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
                  : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
              }`}
            >
              <History className="w-4 h-4 text-periwinkle-700" />
              <span>Jurnal Audit ({auditTotal})</span>
              <span className="px-1.5 py-0.2 rounded bg-sapphire-100 text-sapphire-800 text-[9px] font-black uppercase">Admin</span>
            </button>

            <button
              onClick={() => { setActiveTab('efactura'); }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
                activeTab === 'efactura'
                  ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
                  : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
              }`}
            >
              <Receipt className="w-4 h-4 text-emerald-600" />
              <span>ANAF e-Factura OAuth2</span>
              <span className="px-1.5 py-0.2 rounded bg-sapphire-100 text-sapphire-800 text-[9px] font-black uppercase">Admin</span>
            </button>

            <button
              onClick={() => { setActiveTab('backup'); fetchBackupStats(); }}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-t-xl font-bold text-xs transition border-b-2 whitespace-nowrap ${
                activeTab === 'backup'
                  ? 'border-sapphire-500 text-sapphire-900 bg-white shadow-xs'
                  : 'border-transparent text-sage-700 hover:text-sapphire-900 hover:bg-morning-100'
              }`}
            >
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Copie de Siguranță & Bază de Date</span>
              <span className="px-1.5 py-0.2 rounded bg-sapphire-100 text-sapphire-800 text-[9px] font-black uppercase">Admin</span>
            </button>
          </>
        )}
      </div>

      {/* BANNER INFORMARE ROL & JOGOSULTSÁG */}
      {isViewer && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300 flex items-center space-x-3 text-amber-900 text-xs shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="font-extrabold">Mod Numai Citire (Viewer):</p>
            <p className="text-slate-700">Contul dumneavoastră are drepturi exclusive de vizualizare. Modificarea, crearea sau ștergerea parametrilor de configurare este restricționată.</p>
          </div>
        </div>
      )}

      {isOperator && (
        <div className="p-3.5 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center space-x-3 text-sapphire-900 text-xs shadow-xs">
          <ShieldCheck className="w-5 h-5 text-sapphire-600 shrink-0" />
          <div>
            <p className="font-extrabold">Mod Operator Flotă:</p>
            <p className="text-slate-700">Puteți consulta parametrii sistemului. Administrarea utilizatorilor și a regulilor critice este rezervată Administratorilor.</p>
          </div>
        </div>
      )}

      {activeTab === 'vehicule' && (
        <div className="space-y-4">
          {/* SEARCH & ACTIONS BAR */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div className="relative flex-1 max-w-lg">
              <Search className="w-4 h-4 text-sage-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Caută utilaj după cod intern, număr înmatriculare, VIN sau marcă..."
                value={searchVehicule}
                onChange={(e) => setSearchVehicule(e.target.value)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-10 pr-8 py-2.5 text-xs font-bold text-sapphire-900 placeholder:text-sage-500 focus:outline-none focus:border-sapphire-500 focus:bg-white transition"
              />
              {searchVehicule && (
                <button
                  onClick={() => setSearchVehicule('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-sage-400 hover:text-sapphire-900 font-bold"
                >
                  
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowCatManagerModal(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-sapphire-900 text-xs font-bold shadow-2xs transition"
                title="Deschide panoul de administrare a categoriilor de vehicule"
              >
                <Layers className="w-4 h-4 text-periwinkle-700" />
                <span>Gestiune Categorii ({categoriiVehicul.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddVehiculModal(true)}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Adaugă Vehicul Nou</span>
              </button>
            </div>
          </div>

          {/* CATEGORY FILTER CHIPS RIBBON */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs select-none">
            <button
              onClick={() => setSelectedCatFilter('TOATE')}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                selectedCatFilter === 'TOATE'
                  ? 'bg-sapphire-500 text-white shadow-sm'
                  : 'bg-white text-slate-700 border border-morning-200 hover:bg-morning-100 hover:text-sapphire-900'
              }`}
            >
              <span>Toate Echipamentele</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedCatFilter === 'TOATE' ? 'bg-white/20 text-white' : 'bg-morning-200 text-sage-700'
              }`}>
                {vehicule.length}
              </span>
            </button>

            {categoriiVehicul.map((c) => {
              const count = vehicule.filter(v => (v.categorieEnum || '').toUpperCase() === c.nume.toUpperCase()).length;
              const isSelected = selectedCatFilter.toUpperCase() === c.nume.toUpperCase();
              const catColor = getCategoryColor(c.nume);
              return (
                <button
                  key={c.id || c.nume}
                  onClick={() => setSelectedCatFilter(isSelected ? 'TOATE' : c.nume)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center space-x-2 border shadow-2xs ${
                    isSelected
                      ? catColor.chipActive
                      : catColor.chipInactive
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-white' : catColor.dot}`} />
                  <span>{c.nume}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                    isSelected ? catColor.countActive : catColor.countInactive
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* VEHICLES DATA TABLE */}
          <div className="bg-white rounded-2xl border border-morning-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-xs min-w-[950px]">
              <thead>
                <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider select-none">
                  {/* COD INTERN */}
                  <th
                    onClick={() => toggleSort('numarIntern')}
                    className="p-3.5 cursor-pointer hover:bg-morning-200 hover:text-sapphire-900 transition group"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Cod Intern</span>
                      {sortField === 'numarIntern' ? (
                        sortDirection === 'asc' ? (
                          <span className="text-sapphire-600 font-extrabold flex items-center space-x-0.5 bg-sapphire-50 px-1.5 py-0.5 rounded-md text-[10px]">
                            <ArrowUp className="w-3 h-3" />
                            <span>A-Z</span>
                          </span>
                        ) : (
                          <span className="text-sapphire-600 font-extrabold flex items-center space-x-0.5 bg-sapphire-50 px-1.5 py-0.5 rounded-md text-[10px]">
                            <ArrowDown className="w-3 h-3" />
                            <span>Z-A</span>
                          </span>
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 group-hover:text-sapphire-500 transition opacity-60 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* ÎNMATRICULARE & VIN */}
                  <th
                    onClick={() => toggleSort('numarInmatriculare')}
                    className="p-3.5 cursor-pointer hover:bg-morning-200 hover:text-sapphire-900 transition group"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Înmatriculare & VIN</span>
                      {sortField === 'numarInmatriculare' ? (
                        sortDirection === 'asc' ? (
                          <span className="text-sapphire-600 font-extrabold flex items-center space-x-0.5 bg-sapphire-50 px-1.5 py-0.5 rounded-md text-[10px]">
                            <ArrowUp className="w-3 h-3" />
                            <span>A-Z</span>
                          </span>
                        ) : (
                          <span className="text-sapphire-600 font-extrabold flex items-center space-x-0.5 bg-sapphire-50 px-1.5 py-0.5 rounded-md text-[10px]">
                            <ArrowDown className="w-3 h-3" />
                            <span>Z-A</span>
                          </span>
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 group-hover:text-sapphire-500 transition opacity-60 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  {/* CATEGORIE & MODEL */}
                  <th
                    onClick={() => toggleSort('categorieEnum')}
                    className="p-3.5 cursor-pointer hover:bg-morning-200 hover:text-sapphire-900 transition group"
                  >
                    <div className="flex items-center space-x-1.5">
                      <span>Categorie & Specificație</span>
                      {sortField === 'categorieEnum' ? (
                        sortDirection === 'asc' ? (
                          <span className="text-sapphire-600 font-extrabold flex items-center space-x-0.5 bg-sapphire-50 px-1.5 py-0.5 rounded-md text-[10px]">
                            <ArrowUp className="w-3 h-3" />
                            <span>A-Z</span>
                          </span>
                        ) : (
                          <span className="text-sapphire-600 font-extrabold flex items-center space-x-0.5 bg-sapphire-50 px-1.5 py-0.5 rounded-md text-[10px]">
                            <ArrowDown className="w-3 h-3" />
                            <span>Z-A</span>
                          </span>
                        )
                      ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 text-sage-400 group-hover:text-sapphire-500 transition opacity-60 group-hover:opacity-100" />
                      )}
                    </div>
                  </th>

                  <th className="p-3.5">Contor Curent</th>
                  <th className="p-3.5">Tarif Atelier</th>
                  <th className="p-3.5 text-right whitespace-nowrap min-w-[170px]">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                {vehiculeFiltrateSiSortate.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sage-500 font-medium">
                      Nu s-a găsit niciun vehicul conform filtrelor selectate.
                    </td>
                  </tr>
                ) : (
                  vehiculeFiltrateSiSortate.map((v) => (
                    <tr key={v.id} className="hover:bg-morning-50/80 transition">
                      {/* COD INTERN BADGE */}
                      <td className="p-3.5">
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-black text-xs shadow-2xs">
                          <Truck className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span>{v.numarIntern}</span>
                        </div>
                      </td>

                      {/* ÎNMATRICULARE & VIN */}
                      <td className="p-3.5">
                        <span className="font-extrabold text-sapphire-900 font-mono text-sm tracking-wide bg-morning-100 border border-morning-300 px-2.5 py-0.5 rounded-md inline-block">
                          {v.numarInmatriculare}
                        </span>
                        <div className="text-[10px] text-sage-500 font-mono mt-1 flex items-center space-x-1">
                          <span className="font-bold text-sage-400">VIN:</span>
                          <span>{v.serieSasiu || v.vin || '-'}</span>
                        </div>
                      </td>

                      {/* CATEGORIE & MODEL */}
                      <td className="p-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border inline-block ${getCategoryColor(v.categorieEnum).badge}`}>
                          {v.categorieEnum || 'NEALOCAT'}
                        </span>
                        <div className="text-xs font-bold text-slate-800 mt-1">
                          {v.marca} {v.model} <span className="text-sage-500 font-normal">({v.anFabricatie || '-'})</span>
                        </div>
                      </td>

                      {/* CONTOR CURENT */}
                      <td className="p-3.5 font-mono font-extrabold text-sapphire-900 text-sm">
                        <div className="flex items-center space-x-1.5">
                          <span>{Number(v.valoareContorCurent || 0).toLocaleString('ro-RO')}</span>
                          <span className="text-[10px] font-bold text-sage-500 bg-morning-200 px-1.5 py-0.5 rounded">
                            {v.tipMasurare || 'KM'}
                          </span>
                        </div>
                      </td>

                      {/* TARIF ORAR */}
                      <td className="p-3.5 font-mono text-sage-700 font-bold">
                        {v.tarifOrarManoperaAtelier || v.tarifOrarStandard ? (
                          <span className="text-sapphire-900">{v.tarifOrarManoperaAtelier || v.tarifOrarStandard} RON/h</span>
                        ) : (
                          <span className="text-sage-400">-</span>
                        )}
                      </td>

                      {/* ACȚIUNI */}
                      <td className="p-3.5 text-right space-x-2 whitespace-nowrap min-w-[170px]">
                        <button
                          onClick={() => openEditVehicul(v)}
                          className="px-3 py-1.5 rounded-xl bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-700 font-bold transition border border-sapphire-200 shadow-2xs inline-flex items-center space-x-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editează</span>
                        </button>
                        <button
                          onClick={() => handleDeleteVehicul(v.id)}
                          className="px-3 py-1.5 rounded-xl bg-roseash-100 hover:bg-roseash-200 text-terracotta-600 font-bold transition shadow-2xs inline-flex items-center space-x-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Șterge</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MECANICI & ECHIPĂ ATELIER */}
      {/* ========================================================================= */}
      {activeTab === 'mecanici' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-sage-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Caută mecanic după nume sau funcție..."
                value={searchMecanici}
                onChange={(e) => setSearchMecanici(e.target.value)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-sapphire-900"
              />
            </div>
            <button
              onClick={openAddMecanic}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
            >
              <Users className="w-4 h-4" />
              <span>+ Înregistrează Mecanic Nou</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {mecaniciFiltrati.map((m) => (
              <div key={m.id} className="pleasant-card p-4 rounded-2xl border border-morning-200 flex justify-between items-start space-x-3">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center text-sapphire-600 font-extrabold text-sm">
                    {m.nume?.charAt(0) || 'M'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sapphire-900 text-sm">{m.nume}</h3>
                    <p className="text-xs text-sage-700 font-bold">{m.functie}</p>
                    <p className="text-[11px] font-mono text-sage-500 mt-1">{m.telefon || 'Fără telefon'}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0">
                  <button
                    onClick={() => openEditMecanic(m)}
                    className="p-1.5 rounded-lg text-sage-600 hover:text-sapphire-600 hover:bg-sapphire-50 transition"
                    title="Editare Mecanic"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMecanic(m.id)}
                    className="p-1.5 rounded-lg text-roseash-600 hover:bg-roseash-100 transition"
                    title="Eliminare Mecanic"
                  >
                    <Trash2 className="w-4 h-4 text-terracotta-500" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DEPOZITE FLOTĂ */}
      {/* ========================================================================= */}
      {activeTab === 'depozite' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-sage-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Caută depozit după denumire sau responsabil..."
                value={searchDepozite}
                onChange={(e) => setSearchDepozite(e.target.value)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-sapphire-900"
              />
            </div>
            <button
              onClick={openAddDepozit}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
            >
              <Building2 className="w-4 h-4" />
              <span>+ Depozit Nou</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {depoziteFiltrate.map((d) => (
              <div key={d.id} className="pleasant-card p-5 rounded-2xl border border-morning-200 space-y-3">
                <div className="flex items-center justify-between border-b border-morning-200 pb-2">
                  <h3 className="font-extrabold text-sapphire-900 text-base flex items-center space-x-2">
                    <Building2 className="w-5 h-5 text-sapphire-500" />
                    <span>{d.nume}</span>
                  </h3>
                  <div className="flex space-x-1">
                    <button onClick={() => openEditDepozit(d)} className="p-1 text-sapphire-600 hover:bg-morning-100 rounded-lg">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteDepozit(d.id)} className="p-1 text-terracotta-600 hover:bg-roseash-100 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="text-xs space-y-1 text-slate-700">
                  <p><span className="font-bold text-sage-700">Adresă / Locație:</span> {d.adresa || 'Nespecificată'}</p>
                  <p><span className="font-bold text-sage-700">Responsabil Gestiune:</span> {d.responsabil || 'Nedesemnat'}</p>
                  <p className="text-[11px] text-sage-500 pt-1 font-mono">Articole stocate: {d._count?.articoleStoc ?? d.articoleStoc?.length ?? 0} articole</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CATEGORII & SUBCATEGORII STOC */}
      {/* ========================================================================= */}
      {activeTab === 'categorii' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sapphire-900 text-base">Structură Categorii & Subcategorii Piese</h3>
              <p className="text-xs text-sage-700 font-medium">Clasificarea articolelor de stoc cu praguri de stoc minim implicite și administrare completă</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={openAddCat}
                className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Categorie Nouă</span>
              </button>
              <button
                onClick={() => openAddSubcat()}
                className="flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-morning-200 hover:bg-morning-300 text-sapphire-900 text-xs font-bold shadow-xs transition"
              >
                <Layers className="w-4 h-4 text-periwinkle-700" />
                <span>+ Subcategorie Nouă</span>
              </button>
            </div>
          </div>

          {/* TOOLBAR CĂUTARE & SORTARE & MOD VIZUALIZARE CATEGORII */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-morning-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-sage-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Caută categorie sau subcategorie..."
                value={searchCategoriiText}
                onChange={(e) => setSearchCategoriiText(e.target.value)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-8 py-2 text-xs font-bold text-sapphire-900 focus:outline-none focus:border-sapphire-400"
              />
              {searchCategoriiText && (
                <button
                  onClick={() => setSearchCategoriiText('')}
                  className="absolute right-2.5 top-2.5 text-sage-400 hover:text-sapphire-900"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-3 shrink-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-sage-500 font-bold text-[11px] whitespace-nowrap">Sortare:</span>
                <select
                  value={sortCategoriiMod}
                  onChange={(e) => setSortCategoriiMod(e.target.value as any)}
                  className="bg-morning-100 border border-morning-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-sapphire-900 focus:outline-none focus:border-sapphire-400"
                >
                  <option value="alfabetic">Alfabetic (A-Z, diverse la final)</option>
                  <option value="subcategorii">Nr. Subcategorii (Multe → Puține)</option>
                  <option value="stoc_minim">Alertă Stoc Minim (Mare → Mic)</option>
                </select>
              </div>

              <div className="flex items-center bg-morning-100 p-0.5 rounded-xl border border-morning-200">
                <button
                  type="button"
                  onClick={() => setViewCategoriiMod('grid')}
                  title="Vizualizare Carduri"
                  className={`p-1.5 rounded-lg transition ${
                    viewCategoriiMod === 'grid'
                      ? 'bg-white shadow-xs text-sapphire-700 font-bold'
                      : 'text-sage-500 hover:text-sapphire-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewCategoriiMod('tabel')}
                  title="Vizualizare Tabel Sintetic"
                  className={`p-1.5 rounded-lg transition ${
                    viewCategoriiMod === 'tabel'
                      ? 'bg-white shadow-xs text-sapphire-700 font-bold'
                      : 'text-sage-500 hover:text-sapphire-900'
                  }`}
                >
                  <LayoutList className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {categoriiPiese.length === 0 ? (
            <div className="pleasant-card p-8 rounded-2xl border border-morning-200 text-center text-sage-600 space-y-2">
              <Layers className="w-8 h-8 text-sage-400 mx-auto" />
              <p className="font-bold text-sm text-sapphire-900">Nicio categorie găsită</p>
              <p className="text-xs">
                {searchCategoriiText
                  ? `Nu există rezultate pentru căutarea "${searchCategoriiText}". Încercați alt termen.`
                  : 'Nu există categorii de piese configurate.'}
              </p>
            </div>
          ) : viewCategoriiMod === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoriiPiese.map((c: any) => (
                <div key={c.id || c.nume} className="pleasant-card p-5 rounded-2xl border border-morning-200 space-y-3 shadow-2xs hover:shadow-xs transition">
                  <div className="flex items-center justify-between border-b border-morning-200 pb-2">
                    <div className="flex items-center space-x-2">
                      <Layers className="w-5 h-5 text-periwinkle-700" />
                      <h4 className="font-extrabold text-sapphire-900 text-base">{c.nume}</h4>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-morning-200 text-sapphire-900">
                        Alertă Stoc Min: {c.stocMinimImplicit !== undefined && c.stocMinimImplicit !== null ? c.stocMinimImplicit : 5} buc
                      </span>
                      <button
                        onClick={() => openEditCat(c)}
                        title="Editare Categorie"
                        className="p-1.5 text-sage-600 hover:text-sapphire-600 hover:bg-sapphire-50 rounded-lg transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategorie(c.id, c.nume)}
                        title="Ștergere Categorie"
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
                        Subcategorii incluse ({c.subcategorii?.length || 0}):
                      </p>
                      <button
                        onClick={() => openAddSubcat(c.nume)}
                        className="text-[11px] font-extrabold text-sapphire-600 hover:text-sapphire-800 hover:bg-sapphire-50 px-2 py-0.5 rounded-lg border border-sapphire-200 transition flex items-center space-x-1"
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
                              onClick={() => handleDeleteSubcategorie(sc.id, sc.nume)}
                              title="Ștergere Subcategorie"
                              className="p-0.5 text-sage-400 hover:text-terracotta-600 hover:bg-roseash-100 rounded transition"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <span className="text-[11px] text-sage-500 italic">Nicio subcategorie definită</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="pleasant-card rounded-2xl border border-morning-200 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-morning-100/80 border-b border-morning-200 text-sage-700 font-extrabold">
                      <th className="p-3">Categorie</th>
                      <th className="p-3 text-center">Alertă Stoc Min</th>
                      <th className="p-3">Subcategorii ({categoriiPiese.reduce((acc: number, cur: any) => acc + (cur.subcategorii?.length || 0), 0)})</th>
                      <th className="p-3 text-right">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200">
                    {categoriiPiese.map((c: any) => (
                      <tr key={c.id || c.nume} className="hover:bg-morning-50/50 transition">
                        <td className="p-3 align-top font-bold text-sapphire-900 min-w-[180px]">
                          <div className="flex items-center space-x-2">
                            <Layers className="w-4 h-4 text-periwinkle-700 shrink-0" />
                            <div>
                              <span>{c.nume}</span>
                              {c.descriere && (
                                <p className="text-[11px] font-normal text-sage-500">{c.descriere}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 align-top text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-morning-200 text-sapphire-900 font-mono">
                            {c.stocMinimImplicit !== undefined && c.stocMinimImplicit !== null ? c.stocMinimImplicit : 5} buc
                          </span>
                        </td>
                        <td className="p-3 align-top">
                          <div className="space-y-1.5">
                            <div className="flex flex-wrap gap-1">
                              {(c.subcategorii || []).map((sc: any) => (
                                <span
                                  key={sc.id || sc.nume}
                                  className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-morning-100 border border-morning-200 text-[10px] font-bold text-sapphire-900"
                                >
                                  <span>{sc.nume}</span>
                                  <button
                                    onClick={() => openEditSubcat(sc, c.nume)}
                                    title="Editare"
                                    className="p-0.5 text-sage-400 hover:text-sapphire-600"
                                  >
                                    <Edit3 className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteSubcategorie(sc.id, sc.nume)}
                                    title="Ștergere"
                                    className="p-0.5 text-sage-400 hover:text-terracotta-600"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))}
                              {(!c.subcategorii || c.subcategorii.length === 0) && (
                                <span className="text-[11px] text-sage-400 italic">Fără subcategorii</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-3 align-top text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => openAddSubcat(c.nume)}
                              title="Adaugă Subcategorie"
                              className="p-1.5 text-sapphire-600 hover:bg-sapphire-50 rounded-lg transition"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openEditCat(c)}
                              title="Editare Categorie"
                              className="p-1.5 text-sage-600 hover:text-sapphire-600 hover:bg-sapphire-50 rounded-lg transition"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategorie(c.id, c.nume)}
                              title="Ștergere Categorie"
                              className="p-1.5 text-terracotta-600 hover:text-terracotta-700 hover:bg-roseash-100 rounded-lg transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BANNER GESTIUNE DEDICATĂ FLUIDE (PLASAT LA BAZA PAGINII) */}
          <div className="pleasant-card p-4 rounded-2xl bg-sapphire-50/80 border border-sapphire-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs mt-2">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-sapphire-100 text-sapphire-700 shrink-0">
                <Droplets className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-extrabold text-sapphire-900 text-sm">Gestiune Separată & Detaliată: Uleiuri & Fluide</h4>
                <p className="text-xs text-sage-600">
                  Categoriile, subtipurile și stocurile de lubrifianți, uleiuri, antigel și AdBlue sunt gestionate dedicat în modulul Uleiuri & Fluide cu praguri minime de alertă.
                </p>
              </div>
            </div>
            <a
              href="/fluide?tab=stocuri"
              className="px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-xs shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1.5 shrink-0 self-start sm:self-auto"
            >
              <span>Deschide Gestiune Fluide</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REGULI ALERTE MENTENANȚĂ */}
      {/* ========================================================================= */}
      {activeTab === 'reguli' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sapphire-900 text-base">Reguli de Mentenanță Preventivă</h3>
              <p className="text-xs text-sage-700">Setează pragurile automate pentru schimburi de ulei, filtre, gresare etc.</p>
            </div>
            <button
              onClick={openAddRegula}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adaugă Regulă Nouă</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-morning-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]">
              <thead>
                <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider">
                  <th className="p-3">Operatiune</th>
                  <th className="p-3">Categorie Utilaj</th>
                  <th className="p-3">Trigger / Prag Maxim</th>
                  <th className="p-3">Avertizare ÎnPrealabil</th>
                  <th className="p-3">Stare</th>
                  <th className="p-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                {reguli.map((r) => (
                  <tr key={r.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-extrabold text-sapphire-900">{r.denumireOperatiune}</td>
                    <td className="p-3 font-bold text-slate-800">{r.categorieUtilaj}</td>
                    <td className="p-3 font-mono font-bold text-sapphire-900">
                      {r.valoareMaxima} {r.tipTrigger}
                    </td>
                    <td className="p-3 font-mono text-terracotta-700 font-bold">
                      {r.avertizareInainte} {r.tipTrigger}
                    </td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold ${r.stare === 'ACTIV' ? 'bg-emerald-100 text-emerald-800' : 'bg-morning-200 text-slate-600'}`}>
                        {r.stare}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => openEditRegula(r)} className="p-1.5 text-sapphire-600 hover:bg-morning-100 rounded-lg">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteRegula(r.id)} className="p-1.5 text-terracotta-600 hover:bg-roseash-100 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: DOCUMENTE VEHICULE (MATRICE FLOTĂ & NOMENCLATOR ACTE) */}
      {/* ========================================================================= */}
      {activeTab === 'documente' && (
        <div className="space-y-4">
          {/* 1. KPI STRIP */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-morning-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-sapphire-50 border border-sapphire-100 flex items-center justify-center text-sapphire-600 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-sage-600 truncate">Total Documente</p>
                <p className="text-xl font-black text-sapphire-900 font-mono">{docKPIs.total}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-emerald-700 truncate">Acte Valabile</p>
                <p className="text-xl font-black text-emerald-700 font-mono">{docKPIs.valide}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-amber-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-amber-700 truncate">În Scadență / Avertizare</p>
                <p className="text-xl font-black text-amber-700 font-mono">{docKPIs.avertizare}</p>
              </div>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-terracotta-200 shadow-xs flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-roseash-50 border border-terracotta-100 flex items-center justify-center text-terracotta-600 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase text-terracotta-700 truncate">Acte Expirate</p>
                <p className="text-xl font-black text-terracotta-700 font-mono">{docKPIs.expirate}</p>
              </div>
            </div>
          </div>

          {/* 2. SUB-VIEW CONTROLS & ACTIONS */}
          <div className="bg-white p-4 rounded-2xl border border-morning-200 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Selector Mod Vizualizare */}
              <div className="flex items-center space-x-1.5 p-1 bg-morning-100 rounded-xl border border-morning-200 self-start">
                <button
                  type="button"
                  onClick={() => setDocViewMode('matrice')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    docViewMode === 'matrice'
                      ? 'bg-sapphire-500 text-white shadow-xs'
                      : 'text-sage-700 hover:text-sapphire-900 hover:bg-morning-200'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Matrice Flotă ({vehiculeMatrice.length} utilaje)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocViewMode('tipuri')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    docViewMode === 'tipuri'
                      ? 'bg-sapphire-500 text-white shadow-xs'
                      : 'text-sage-700 hover:text-sapphire-900 hover:bg-morning-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Nomenclator Tipuri Acte ({tipuriDocumente.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDocViewMode('lista')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-extrabold transition ${
                    docViewMode === 'lista'
                      ? 'bg-sapphire-500 text-white shadow-xs'
                      : 'text-sage-700 hover:text-sapphire-900 hover:bg-morning-200'
                  }`}
                >
                  <LayoutList className="w-3.5 h-3.5" />
                  <span>Listă Detaliată ({filteredDocumenteLista.length})</span>
                </button>
              </div>

              {/* Butoane Acțiuni Rapide */}
              <div className="flex items-center space-x-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleInitializareRapidaFlota}
                  disabled={initializareRapidaLoading}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold transition shadow-xs disabled:opacity-50"
                  title="Generează automat sloturile de documente lipsă conform categoriei fiecărui vehicul"
                >
                  <Zap className={`w-3.5 h-3.5 text-amber-600 ${initializareRapidaLoading ? 'animate-spin' : ''}`} />
                  <span>{initializareRapidaLoading ? 'Se inițializează...' : 'Inițializare Rapidă Flotă'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowAddTipModal(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-periwinkle-50 hover:bg-periwinkle-100 border border-periwinkle-300 text-periwinkle-900 text-xs font-bold transition shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5 text-periwinkle-700" />
                  <span>+ Tip Nou de Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => openAddDoc()}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Înregistrează Document</span>
                </button>
              </div>
            </div>

            {/* Rând Filtre & Căutare (vizibil pentru Matrice și Listă) */}
            {docViewMode !== 'tipuri' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-morning-200 items-center">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-sage-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrează vehicul (număr intern, înmatriculare, marcă)..."
                    value={searchDocVehicul}
                    onChange={(e) => {
                      setSearchDocVehicul(e.target.value);
                      setDocMatricePage(1);
                      setDocListaPage(1);
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-7 py-2 text-xs font-bold text-sapphire-900 placeholder:text-sage-500 focus:outline-none focus:border-sapphire-500"
                  />
                  {searchDocVehicul && (
                    <button
                      onClick={() => {
                        setSearchDocVehicul('');
                        setDocMatricePage(1);
                        setDocListaPage(1);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-sage-400 hover:text-sapphire-900 font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div>
                  <select
                    value={filterDocCategorie}
                    onChange={(e) => {
                      setFilterDocCategorie(e.target.value);
                      setDocMatricePage(1);
                      setDocListaPage(1);
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl px-3 py-2 text-xs font-bold text-sapphire-900 focus:outline-none focus:border-sapphire-500"
                  >
                    <option value="TOATE">Toate Categoriile de Vehicule</option>
                    {categoriiVehicul.map((c: any) => (
                      <option key={c.cod || c} value={c.cod || c}>
                        {c.label || c.nume || c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <select
                    value={filterDocStatus}
                    onChange={(e) => {
                      setFilterDocStatus(e.target.value);
                      setDocMatricePage(1);
                      setDocListaPage(1);
                    }}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl px-3 py-2 text-xs font-bold text-sapphire-900 focus:outline-none focus:border-sapphire-500"
                  >
                    <option value="TOATE">Toate Stările (Expirate, Scadențe, Valide)</option>
                    <option value="EXPIRATE">Doar cu Acte Expirate (Urgent)</option>
                    <option value="AVERTIZARE">Doar în Avertizare / Scadență</option>
                    <option value="LIPSA">Doar cu Documente Neînregistrate</option>
                    <option value="VALIDE">Doar Vehicule cu Toate Actele Valabile</option>
                  </select>
                </div>

                <label className="flex items-center space-x-2 text-xs font-bold text-sapphire-900 cursor-pointer select-none bg-morning-100 hover:bg-morning-200 border border-morning-200 px-3 py-2 rounded-xl transition">
                  <input
                    type="checkbox"
                    checked={ascundeFaraActe}
                    onChange={(e) => {
                      setAscundeFaraActe(e.target.checked);
                      setDocMatricePage(1);
                      setDocListaPage(1);
                    }}
                    className="w-4 h-4 rounded text-sapphire-600 focus:ring-sapphire-500 border-morning-300 cursor-pointer"
                  />
                  <span className="truncate">Ascunde vehiculele fără acte</span>
                </label>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------- */}
          {/* SUBVIEW 1: MATRICE FLOTĂ (SINTEZĂ PE VEHICUL)                 */}
          {/* ------------------------------------------------------------- */}
          {docViewMode === 'matrice' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-morning-200 overflow-auto max-h-[calc(100vh-270px)] shadow-xs relative">
                <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[950px]">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-morning-100 text-sage-700 font-extrabold uppercase tracking-wider text-[11px]">
                      <th
                        onClick={() => {
                          if (docSortCol !== 'vehicul') {
                            setDocSortCol('vehicul');
                            setDocVehiculSortMode('abc');
                          } else {
                            setDocVehiculSortMode((prev) => (prev === 'abc' ? 'categorie' : 'abc'));
                          }
                          setDocMatricePage(1);
                        }}
                        className={`p-3 sticky left-0 top-0 z-30 min-w-[220px] border-b border-r border-morning-200 shadow-[2px_2px_5px_-2px_rgba(0,0,0,0.06)] cursor-pointer select-none transition group ${
                          docSortCol === 'vehicul'
                            ? 'bg-morning-200/90 text-sapphire-950 font-black'
                            : 'bg-morning-100 hover:bg-morning-200'
                        }`}
                        title="Apasă pentru a schimba sortarea: Alfabetic (A-Z) ⟷ Categorie Flotă"
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="truncate">Vehicul & Categorie</span>
                          <span className="inline-flex items-center space-x-1 text-[10px] font-black tracking-normal px-2 py-0.5 rounded-md bg-white border border-morning-300 text-sapphire-800 shadow-xs shrink-0">
                            {docSortCol === 'vehicul' && docVehiculSortMode === 'abc' && (
                              <>
                                <ArrowUp className="w-3 h-3 text-sapphire-600" />
                                <span>Alfabetic A-Z</span>
                              </>
                            )}
                            {docSortCol === 'vehicul' && docVehiculSortMode === 'categorie' && (
                              <>
                                <Layers className="w-3 h-3 text-sapphire-600" />
                                <span>Categorie</span>
                              </>
                            )}
                            {docSortCol !== 'vehicul' && (
                              <span className="text-sage-500 font-normal group-hover:text-sapphire-800 flex items-center space-x-1">
                                <ArrowUpDown className="w-3 h-3" />
                                <span>Sortează</span>
                              </span>
                            )}
                          </span>
                        </div>
                      </th>
                      {tipuriDocumente.map((t) => {
                        const isSorted = docSortCol === t.cod;
                        return (
                          <th
                            key={t.cod}
                            onClick={() => {
                              if (docSortCol !== t.cod) {
                                setDocSortCol(t.cod);
                                setDocSortDir('asc');
                              } else {
                                setDocSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                              }
                              setDocMatricePage(1);
                            }}
                            className={`p-3 text-center min-w-[145px] sticky top-0 z-20 border-b border-morning-200 cursor-pointer select-none transition group ${
                              isSorted
                                ? 'bg-sapphire-100/80 border-b-2 border-b-sapphire-500 text-sapphire-950 font-black shadow-inner'
                                : 'bg-morning-100 hover:bg-morning-200/80'
                            }`}
                            title={`Apasă pentru a sorta vehiculele după data de expirare a documentului ${t.cod} (${isSorted && docSortDir === 'asc' ? 'Crescător: cele mai urgente întâi' : 'Descrescător: cele mai noi întâi'})`}
                          >
                            <div className="flex items-center justify-center space-x-1">
                              <span className="font-extrabold text-sapphire-900 group-hover:text-sapphire-600 transition">
                                {t.cod}
                              </span>
                              {isSorted ? (
                                docSortDir === 'asc' ? (
                                  <span className="inline-flex items-center text-[9px] font-black bg-sapphire-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                                    <ArrowUp className="w-2.5 h-2.5 mr-0.5" />
                                    Exp.
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center text-[9px] font-black bg-sapphire-600 text-white px-1.5 py-0.5 rounded shadow-2xs">
                                    <ArrowDown className="w-2.5 h-2.5 mr-0.5" />
                                    Exp.
                                  </span>
                                )
                              ) : (
                                <ArrowUpDown className="w-3 h-3 text-sage-400 opacity-0 group-hover:opacity-100 transition" />
                              )}
                            </div>
                            <div className="text-[10px] font-normal text-sage-500 truncate max-w-[130px] mx-auto mt-0.5" title={t.label}>
                              {t.label?.replace(/\([^)]*\)/g, '').trim()}
                            </div>
                          </th>
                        );
                      })}
                      <th className="p-3 text-right min-w-[90px] sticky top-0 bg-morning-100 z-20 border-b border-morning-200">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-slate-700">
                    {vehiculeMatrice.length === 0 ? (
                      <tr>
                        <td colSpan={tipuriDocumente.length + 2} className="p-8 text-center text-xs text-sage-500 font-bold border-b border-morning-200">
                          Nu a fost găsit niciun vehicul conform criteriilor de filtrare selectate.
                        </td>
                      </tr>
                    ) : (
                      vehiculeMatrice
                        .slice((docMatricePage - 1) * 20, docMatricePage * 20)
                        .map((v) => {
                          const catColor = getCategoryColor(v.categorieEnum);
                          return (
                            <tr key={v.id} className="hover:bg-morning-50 transition group">
                              {/* Coloană Vehicul (Sticky) */}
                              <td className="p-3 sticky left-0 bg-white group-hover:bg-morning-50 z-10 border-r border-b border-morning-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center space-x-2">
                                  <div className="font-mono font-black text-sapphire-900 text-xs">
                                    {v.numarIntern || 'FĂRĂ COD'}
                                  </div>
                                  <span className="font-mono font-bold text-slate-600 text-[11px]">
                                    ({v.numarInmatriculare || '-'})
                                  </span>
                                </div>
                                <div className="flex items-center space-x-1.5 mt-1">
                                  <span
                                    className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${catColor.badge}`}
                                  >
                                    {v.categorieEnum}
                                  </span>
                                  {v.marca && (
                                    <span className="text-[10px] text-sage-500 truncate max-w-[90px]">
                                      {v.marca} {v.model || ''}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Celule Tipuri Documente */}
                              {tipuriDocumente.map((t) => {
                                const isSortedCol = docSortCol === t.cod;
                                const doc = v.docs[t.cod];
                                if (!doc) {
                                  return (
                                    <td key={t.cod} className={`p-2 text-center border-b border-morning-200 ${isSortedCol ? 'bg-sapphire-50/30' : ''}`}>
                                      <button
                                        type="button"
                                        onClick={() => openAddDoc(v.id, t.cod)}
                                        className="w-full py-1.5 px-2 border border-dashed border-morning-300 hover:border-sapphire-400 hover:bg-sapphire-50 text-sage-400 hover:text-sapphire-700 rounded-lg text-[10px] font-bold transition flex items-center justify-center space-x-1"
                                        title={`Adaugă ${t.cod} pentru ${v.numarIntern}`}
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Lipsă</span>
                                      </button>
                                    </td>
                                  );
                                }

                                const exp = new Date(doc.dataExpirare);
                                const now = new Date().getTime();
                                const diffDays = Math.ceil((exp.getTime() - now) / (1000 * 60 * 60 * 24));
                                const isExpired = diffDays < 0;
                                const isWarning = !isExpired && diffDays <= (doc.zileAvertizareInainte || 30);

                                let badgeClasses = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';
                                if (isExpired) {
                                  badgeClasses = 'bg-roseash-50 text-terracotta-700 border-terracotta-300 hover:bg-roseash-100';
                                } else if (isWarning) {
                                  badgeClasses = 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
                                }

                                return (
                                  <td key={t.cod} className={`p-2 text-center border-b border-morning-200 ${isSortedCol ? 'bg-sapphire-50/30' : ''}`}>
                                    <button
                                      type="button"
                                      onClick={() => openEditDocDirect(doc)}
                                      className={`w-full py-1.5 px-2 rounded-lg border text-[11px] font-mono font-bold transition flex flex-col items-center justify-center ${badgeClasses}`}
                                      title={`Apasă pentru a edita sau șterge ${t.cod} (${doc.serieDocument || 'Fără serie'})`}
                                    >
                                      <div className="flex items-center space-x-1">
                                        {isExpired && <AlertTriangle className="w-3 h-3 text-terracotta-600 shrink-0" />}
                                        {isWarning && <Clock className="w-3 h-3 text-amber-600 shrink-0" />}
                                        {!isExpired && !isWarning && <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />}
                                        <span>{exp.toLocaleDateString('ro-RO')}</span>
                                      </div>
                                      <div className="text-[9px] font-normal opacity-85">
                                        {isExpired ? (
                                          <span className="font-bold text-terracotta-700">Expirat ({Math.abs(diffDays)}z)</span>
                                        ) : isWarning ? (
                                          <span className="font-bold text-amber-700">În {diffDays} zile</span>
                                        ) : (
                                          <span>Valabil</span>
                                        )}
                                      </div>
                                    </button>
                                  </td>
                                );
                              })}

                              {/* Coloană Acțiuni */}
                              <td className="p-3 text-right border-b border-morning-200">
                                <button
                                  type="button"
                                  onClick={() => openAddDoc(v.id)}
                                  className="p-1.5 text-sapphire-600 hover:bg-morning-100 rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                                  title={`Adaugă alt document pentru ${v.numarIntern}`}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Act</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginare Matrice */}
              {vehiculeMatrice.length > 20 && (
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-morning-200 text-xs text-sage-600">
                  <div>
                    Afișare {(docMatricePage - 1) * 20 + 1} -{' '}
                    {Math.min(docMatricePage * 20, vehiculeMatrice.length)} din {vehiculeMatrice.length} vehicule
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={docMatricePage <= 1}
                      onClick={() => setDocMatricePage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 disabled:opacity-40 text-sapphire-900 font-bold transition"
                    >
                      Anterior
                    </button>
                    <span className="font-bold text-sapphire-900">
                      Pagina {docMatricePage} din {Math.ceil(vehiculeMatrice.length / 20)}
                    </span>
                    <button
                      type="button"
                      disabled={docMatricePage >= Math.ceil(vehiculeMatrice.length / 20)}
                      onClick={() => setDocMatricePage((p) => p + 1)}
                      className="px-3 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 disabled:opacity-40 text-sapphire-900 font-bold transition"
                    >
                      Următor
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SUBVIEW 2: CATALOG TIPURI ACTE (NOMENCLATOR)                 */}
          {/* ------------------------------------------------------------- */}
          {docViewMode === 'tipuri' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-between text-sapphire-900 text-xs">
                <div>
                  <p className="font-extrabold text-sapphire-950">Nomenclator Tipuri Documente & Certificate Flotă</p>
                  <p className="text-sage-700 text-[11px]">
                    Fiecare tip de document configurat aici devine automat o coloană în matricea de monitorizare a flotei și o opțiune la înregistrarea actelor.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddTipModal(true)}
                  className="px-3.5 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold transition shrink-0 flex items-center space-x-1.5 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tip Nou</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {tipuriDocumente.map((t) => {
                  const countInFleet = documente.filter((d) => d.tipDocument === t.cod).length;
                  return (
                    <div
                      key={t.cod}
                      className="bg-white p-4 rounded-2xl border border-morning-200 shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-mono font-black text-sm text-sapphire-900 bg-morning-100 px-2.5 py-0.5 rounded-lg border border-morning-200">
                              {t.cod}
                            </span>
                          </div>
                          {t.esteStandard ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
                              Standard Sistem
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-periwinkle-100 text-periwinkle-800">
                              Personalizat
                            </span>
                          )}
                        </div>

                        <h4 className="font-extrabold text-slate-800 text-xs line-clamp-2" title={t.label}>
                          {t.label || t.cod}
                        </h4>

                        {t.descriere && (
                          <p className="text-[11px] text-sage-600 line-clamp-2">{t.descriere}</p>
                        )}
                      </div>

                      <div className="pt-2 border-t border-morning-200 space-y-2 text-xs">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-sage-600">Preaviz alertă:</span>
                          <span className="font-mono font-bold text-terracotta-700">
                            {t.zileAvertizare || 30} zile în avans
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-sage-600">Acte înregistrate:</span>
                          <span className="font-mono font-bold text-sapphire-900">
                            {countInFleet} vehicule
                          </span>
                        </div>

                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            type="button"
                            onClick={() => openAddDoc(undefined, t.cod)}
                            className="flex-1 py-1.5 px-2 bg-morning-100 hover:bg-sapphire-50 hover:text-sapphire-700 text-slate-700 rounded-lg text-xs font-bold transition flex items-center justify-center space-x-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Înregistrează</span>
                          </button>
                          {!t.esteStandard && (
                            <button
                              type="button"
                              onClick={() => handleDeleteTipDocument(t.cod)}
                              className="p-1.5 text-terracotta-600 hover:bg-roseash-100 rounded-lg transition"
                              title="Șterge acest tip de document personalizat"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------- */}
          {/* SUBVIEW 3: LISTĂ DETALIATĂ DOCUMENTE                          */}
          {/* ------------------------------------------------------------- */}
          {docViewMode === 'lista' && (
            <div className="space-y-3">
              <div className="bg-white rounded-2xl border border-morning-200 overflow-auto max-h-[calc(100vh-270px)] shadow-xs relative">
                <table className="w-full text-left border-separate border-spacing-0 text-xs min-w-[850px]">
                  <thead className="sticky top-0 z-20">
                    <tr className="bg-morning-100 text-sage-700 font-extrabold uppercase tracking-wider">
                      <th className="p-3 sticky top-0 bg-morning-100 z-20 border-b border-morning-200">Vehicul</th>
                      <th className="p-3 sticky top-0 bg-morning-100 z-20 border-b border-morning-200">Tip Document</th>
                      <th className="p-3 sticky top-0 bg-morning-100 z-20 border-b border-morning-200">Data Expirare</th>
                      <th className="p-3 sticky top-0 bg-morning-100 z-20 border-b border-morning-200">Status</th>
                      <th className="p-3 sticky top-0 bg-morning-100 z-20 border-b border-morning-200">Preaviz</th>
                      <th className="p-3 sticky top-0 bg-morning-100 z-20 border-b border-morning-200">Serie / Emitent</th>
                      <th className="p-3 text-right sticky top-0 bg-morning-100 z-20 border-b border-morning-200">Acțiuni</th>
                    </tr>
                  </thead>
                  <tbody className="font-medium text-slate-700">
                    {filteredDocumenteLista.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-sage-500 font-bold border-b border-morning-200">
                          Nu au fost găsite documente conform filtrării selectate.
                        </td>
                      </tr>
                    ) : (
                      filteredDocumenteLista
                        .slice((docListaPage - 1) * 25, docListaPage * 25)
                        .map((d) => {
                          const exp = new Date(d.dataExpirare);
                          const now = new Date().getTime();
                          const diffDays = Math.ceil((exp.getTime() - now) / (1000 * 60 * 60 * 24));
                          const isExpired = diffDays < 0;
                          const isWarning = !isExpired && diffDays <= (d.zileAvertizareInainte || 30);

                          return (
                            <tr key={d.id} className="hover:bg-morning-50 transition">
                              <td className="p-3 border-b border-morning-200">
                                <div className="font-extrabold text-sapphire-900 font-mono">
                                  {d.vehicul?.numarIntern || d.vehiculId}
                                </div>
                                <div className="text-[11px] text-slate-600 font-mono">
                                  {d.vehicul?.numarInmatriculare || '-'}
                                </div>
                              </td>
                              <td className="p-3 border-b border-morning-200">
                                <span className="font-bold text-slate-800 bg-morning-100 px-2 py-0.5 rounded border border-morning-200 font-mono">
                                  {d.tipDocument}
                                </span>
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-900 border-b border-morning-200">
                                {exp.toLocaleDateString('ro-RO')}
                              </td>
                              <td className="p-3 border-b border-morning-200">
                                {isExpired ? (
                                  <span className="px-2 py-0.5 rounded-full bg-roseash-100 text-terracotta-700 text-[10px] font-black uppercase">
                                    Expirat ({Math.abs(diffDays)}z)
                                  </span>
                                ) : isWarning ? (
                                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase">
                                    Scadent ({diffDays}z)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                                    Valabil ({diffDays}z)
                                  </span>
                                )}
                              </td>
                              <td className="p-3 font-mono text-sage-700 font-bold border-b border-morning-200">
                                {d.zileAvertizareInainte} zile
                              </td>
                              <td className="p-3 text-sage-600 border-b border-morning-200">
                                {d.serieDocument || d.emitent || '-'}
                              </td>
                              <td className="p-3 text-right space-x-1 border-b border-morning-200">
                                <button
                                  type="button"
                                  onClick={() => openEditDocDirect(d)}
                                  className="p-1.5 text-sapphire-600 hover:bg-morning-100 rounded-lg transition"
                                  title="Editează document"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDoc(d.id)}
                                  className="p-1.5 text-terracotta-600 hover:bg-roseash-100 rounded-lg transition"
                                  title="Șterge document"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Paginare Listă */}
              {filteredDocumenteLista.length > 25 && (
                <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-morning-200 text-xs text-sage-600">
                  <div>
                    Afișare {(docListaPage - 1) * 25 + 1} -{' '}
                    {Math.min(docListaPage * 25, filteredDocumenteLista.length)} din {filteredDocumenteLista.length} documente
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      disabled={docListaPage <= 1}
                      onClick={() => setDocListaPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 disabled:opacity-40 text-sapphire-900 font-bold transition"
                    >
                      Anterior
                    </button>
                    <span className="font-bold text-sapphire-900">
                      Pagina {docListaPage} din {Math.ceil(filteredDocumenteLista.length / 25)}
                    </span>
                    <button
                      type="button"
                      disabled={docListaPage >= Math.ceil(filteredDocumenteLista.length / 25)}
                      onClick={() => setDocListaPage((p) => p + 1)}
                      className="px-3 py-1 rounded-lg bg-morning-100 hover:bg-morning-200 disabled:opacity-40 text-sapphire-900 font-bold transition"
                    >
                      Următor
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: ALERTE PERSONALIZATE & LICENȚE FIRMĂ */}
      {/* ========================================================================= */}
      {activeTab === 'personalizate' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sapphire-900 text-base">Licențe Firmă & Atestate Personal</h3>
              <p className="text-xs text-sage-700">Alerte personalizate pentru transport, mediu, dispecerat</p>
            </div>
            <button
              onClick={openAddCustom}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adaugă Alertă Personalizată</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-morning-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]">
              <thead>
                <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider">
                  <th className="p-3">Titlu Alertă</th>
                  <th className="p-3">Categorie</th>
                  <th className="p-3">Data Expirare</th>
                  <th className="p-3">Zile Avertizare</th>
                  <th className="p-3">Responsabil</th>
                  <th className="p-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                {alertePersonalizate.map((a) => (
                  <tr key={a.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-extrabold text-sapphire-900">{a.titlu}</td>
                    <td className="p-3 font-bold text-slate-800">{a.categorie}</td>
                    <td className="p-3 font-mono font-bold text-terracotta-700">
                      {new Date(a.dataExpirare).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="p-3 font-mono text-sage-700 font-bold">{a.zileAvertizareInainte} zile</td>
                    <td className="p-3 text-sage-600">{a.responsabil || '-'}</td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => handleDeleteCustom(a.id)} className="p-1.5 text-terracotta-600 hover:bg-roseash-100 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 8: GESTIUNE UTILIZATORI & ROLURI (RBAC) */}
      {/* ========================================================================= */}
      {activeTab === 'utilizatori' && (
        !isAdmin ? (
          <div className="p-12 text-center bg-white border border-morning-200 rounded-3xl space-y-3 shadow-xs">
            <ShieldAlert className="w-12 h-12 text-terracotta-500 mx-auto" />
            <h3 className="text-base font-bold text-sapphire-900">Acces Restricționat</h3>
            <p className="text-xs text-sage-600">Gestiunea utilizatorilor și a rolurilor este rezervată exclusiv administratorilor de sistem.</p>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-sage-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Caută utilizator după nume, utilizator sau funcție..."
                value={searchUsers}
                onChange={(e) => setSearchUsers(e.target.value)}
                className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-sapphire-900"
              />
            </div>
            {isAdmin && (
              <button
                onClick={openAddUser}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Înregistrează Utilizator Nou</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {usersList
              .filter(
                (u) =>
                  !searchUsers.trim() ||
                  u.nume?.toLowerCase().includes(searchUsers.toLowerCase()) ||
                  u.username?.toLowerCase().includes(searchUsers.toLowerCase()) ||
                  u.rol?.toLowerCase().includes(searchUsers.toLowerCase()) ||
                  u.functie?.toLowerCase().includes(searchUsers.toLowerCase())
              )
              .map((u) => {
                const isUserAdmin = u.rol === 'ADMIN';
                const isUserOperator = u.rol === 'OPERATOR';
                const isUserViewer = u.rol === 'VIEWER';

                return (
                  <div
                    key={u.id}
                    className={`pleasant-card p-5 rounded-2xl border transition space-y-3 shadow-xs ${
                      !u.activ ? 'opacity-60 bg-morning-50 border-morning-300' : 'border-morning-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between border-b border-morning-200 pb-3">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-xs ${
                            isUserAdmin
                              ? 'bg-sapphire-600 ring-2 ring-sapphire-400/20'
                              : isUserOperator
                              ? 'bg-emerald-600'
                              : 'bg-amber-600'
                          }`}
                        >
                          {u.nume ? u.nume.split(' ').map((n: string) => n[0]).slice(0, 2).join('') : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <h3 className="font-extrabold text-sapphire-900 text-sm leading-snug">{u.nume}</h3>
                            {!u.activ && (
                              <span className="px-1.5 py-0.2 text-[9px] font-black bg-roseash-200 text-terracotta-700 rounded">
                                Inactiv
                              </span>
                            )}
                          </div>
                          <span
                            className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-md mt-0.5 ${
                              isUserAdmin
                                ? 'bg-sapphire-100 text-sapphire-800 border border-sapphire-300'
                                : isUserOperator
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {isUserAdmin ? 'ADMIN (Full Access)' : isUserOperator ? 'OPERATOR FLOTĂ' : 'VIEWER (Doar Citire)'}
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => openResetPasswordModal(u)}
                            className="p-1.5 rounded-lg text-sage-600 hover:text-amber-600 hover:bg-amber-50 transition"
                            title="Resetează Parola"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditUser(u)}
                            className="p-1.5 rounded-lg text-sage-600 hover:text-sapphire-600 hover:bg-sapphire-50 transition"
                            title="Editare Utilizator & Rol"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {!isUserAdmin && u.username !== 'admin' ? (
                            <>
                              <button
                                onClick={() => handleToggleUserActive(u)}
                                className={`p-1.5 rounded-lg transition ${
                                  u.activ
                                    ? 'text-sage-500 hover:text-amber-700 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={u.activ ? 'Dezactivează Cont' : 'Activează Cont'}
                              >
                                {u.activ ? <UserX className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg text-roseash-600 hover:bg-roseash-100 transition"
                                title="Ștergere Utilizator"
                              >
                                <Trash2 className="w-4 h-4 text-terracotta-500" />
                              </button>
                            </>
                          ) : (
                            <span
                              className="p-1.5 rounded-lg text-sapphire-600 bg-sapphire-50 flex items-center justify-center cursor-default"
                              title="Cont de administrator protejat (nu poate fi șters sau dezactivat)"
                            >
                              <Shield className="w-4 h-4 text-sapphire-600" />
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-xs space-y-1 text-slate-700 font-medium">
                      <p><span className="font-bold text-sage-700">Utilizator:</span> <span className="font-mono font-bold text-sapphire-900">@{u.username}</span></p>
                      <p><span className="font-bold text-sage-700">Funcție:</span> {u.functie || 'Nespecificată'}</p>
                      <p><span className="font-bold text-sage-700">Telefon:</span> {u.telefon || 'Nespecificat'}</p>
                      <p className="text-[11px] text-sage-500 pt-1 flex items-center justify-between font-mono">
                        <span>Acțiuni auditate: {u._count?.auditLogs ?? 0}</span>
                        <span>Creat: {new Date(u.createdAt).toLocaleDateString('ro-RO')}</span>
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      ))}

      {/* ========================================================================= */}
      {/* TAB 9: JURNAL AUDIT & ISTORIC MODIFICĂRI (AUDIT TRAIL) */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && (
        !isAdmin ? (
          <div className="p-12 text-center bg-white border border-morning-200 rounded-3xl space-y-3 shadow-xs">
            <ShieldAlert className="w-12 h-12 text-terracotta-500 mx-auto" />
            <h3 className="text-base font-bold text-sapphire-900">Acces Restricționat</h3>
            <p className="text-xs text-sage-600">Jurnalul de audit este rezervat exclusiv administratorilor de sistem.</p>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sapphire-900 text-base flex items-center space-x-2">
                <History className="w-5 h-5 text-sapphire-600" />
                <span>Jurnal Centralizat de Audit & Trasabilitate ({auditTotal} Evenimente)</span>
              </h3>
              <p className="text-xs text-sage-700 font-medium">
                Înregistrare detaliată a fiecărei acțiuni efectuate în sistem cu autorul, rolul și modificările aplicate
              </p>
            </div>

            <div className="flex items-center space-x-2">
              {/* Nézetváltó Gombok: Táblázat vs Kártyák */}
              <div className="flex items-center bg-morning-100 p-1 rounded-xl border border-morning-200">
                <button
                  type="button"
                  onClick={() => setAuditViewMode('table')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    auditViewMode === 'table' ? 'bg-white text-sapphire-900 shadow-xs' : 'text-sage-600 hover:text-sapphire-900'
                  }`}
                  title="Tabel clasic cu bară de derulare orizontală"
                >
                  <LayoutList className="w-3.5 h-3.5 text-sapphire-600" />
                  <span>Tabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAuditViewMode('cards')}
                  className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    auditViewMode === 'cards' ? 'bg-white text-sapphire-900 shadow-xs' : 'text-sage-600 hover:text-sapphire-900'
                  }`}
                  title="Carduri compacte optimizate pentru ecran mic și mobil"
                >
                  <LayoutGrid className="w-3.5 h-3.5 text-periwinkle-600" />
                  <span>Carduri / Mobil</span>
                </button>
              </div>

              <button
                onClick={fetchAuditLogs}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold border border-morning-200 transition"
              >
                <RotateCcw className={`w-4 h-4 text-sapphire-600 ${auditLoading ? 'animate-spin' : ''}`} />
                <span>Reîmprospătează</span>
              </button>
            </div>
          </div>

          {/* Filtre Audit */}
          <div className="pleasant-card p-4 rounded-2xl bg-white border border-morning-200 space-y-3 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-sage-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Caută în audit după utilizator, email, ID entitate sau detalii..."
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchAuditLogs()}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-3 py-2 text-xs font-bold text-sapphire-900"
                />
              </div>

              <div className="flex items-center space-x-2 overflow-x-auto text-xs font-bold pb-1">
                {['TOATE', 'VEHICULE', 'MENTENANTA', 'ALERTE_FLUIDE', 'ANVELOPE', 'STOCURI', 'UTILIZATORI', 'AUTENTIFICARE'].map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setAuditFilterModul(m);
                      setTimeout(fetchAuditLogs, 50);
                    }}
                    className={`px-3 py-1.5 rounded-xl whitespace-nowrap transition ${
                      auditFilterModul === m
                        ? 'bg-sapphire-500 text-white shadow-xs'
                        : 'bg-morning-100 hover:bg-morning-200 text-slate-700'
                    }`}
                  >
                    {m === 'TOATE' ? 'Toate Modulele' : m}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* NÉZET 1: TÁBLÁZAT OLDALCSÚSZKÁVAL (TABLE WITH SLIDER) */}
          {/* ========================================================= */}
          {auditViewMode === 'table' ? (
            <div className="space-y-2">
              {/* GLISOR ORIZONTAL PENTRU TABEL */}
              <div className="p-3 bg-gradient-to-r from-sapphire-50 via-white to-sapphire-50 rounded-2xl border border-sapphire-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-sapphire-900 font-extrabold shrink-0">
                  <Sliders className="w-4 h-4 text-sapphire-600 shrink-0" />
                  <span>Glisor Orizontal (Derulare tabel):</span>
                  <span className="text-[11px] font-medium text-sage-600 hidden md:inline">
                    Glisați bara sau faceți clic pe săgeți pentru a accesa toate coloanele
                  </span>
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto flex-1 max-w-lg justify-end">
                  <button
                    type="button"
                    onClick={() => scrollAuditBy(-250)}
                    className="p-2 rounded-xl bg-white border border-morning-200 hover:bg-morning-100 text-sapphire-900 transition shrink-0 shadow-xs active:scale-95"
                    title="Derulare la stânga"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="relative flex-1 flex items-center px-1">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={auditScrollPercent}
                      onChange={handleAuditSliderChange}
                      className="w-full h-2.5 bg-morning-200 rounded-lg appearance-none cursor-pointer accent-sapphire-600 transition"
                      aria-label="Glisor derulare orizontală tabel"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => scrollAuditBy(250)}
                    className="p-2 rounded-xl bg-white border border-morning-200 hover:bg-morning-100 text-sapphire-900 transition shrink-0 shadow-xs active:scale-95"
                    title="Derulare la dreapta"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (auditTableContainerRef.current) {
                        const target = auditScrollPercent > 50 ? 0 : auditTableContainerRef.current.scrollWidth;
                        auditTableContainerRef.current.scrollTo({ left: target, behavior: 'smooth' });
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-sapphire-100 hover:bg-sapphire-200 text-sapphire-900 font-extrabold text-[11px] shrink-0 transition"
                  >
                    {auditScrollPercent > 50 ? '⏮ Stânga' : 'Dreapta ⏭'}
                  </button>
                </div>
              </div>

              {/* Tabel Jurnal Audit */}
              <div
                ref={auditTableContainerRef}
                onScroll={handleAuditTableScroll}
                className="bg-white rounded-2xl border border-morning-200 overflow-x-auto shadow-xs"
                style={{
                  scrollbarWidth: 'auto',
                  scrollbarColor: '#2563eb #f1f5f9',
                  WebkitOverflowScrolling: 'touch',
                }}
              >
                <table className="w-full text-left border-collapse text-xs min-w-[950px]">
                  <thead>
                    <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider">
                      <th className="p-3 whitespace-nowrap">Dată & Oră</th>
                      <th className="p-3 whitespace-nowrap">Utilizator / Autor</th>
                      <th className="p-3 whitespace-nowrap">Rol</th>
                      <th className="p-3 whitespace-nowrap">Acțiune</th>
                      <th className="p-3 whitespace-nowrap">Modul</th>
                      <th className="p-3 min-w-[320px]">Detalii Modificare</th>
                      <th className="p-3 text-right whitespace-nowrap">Inspecție</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log) => {
                        const isCreate = log.actiune.includes('CREARE') || log.actiune.includes('POST');
                        const isDelete = log.actiune.includes('STERGERE') || log.actiune.includes('DELETE');
                        const isUpdate = log.actiune.includes('MODIFICARE') || log.actiune.includes('PATCH') || log.actiune.includes('PUT');
                        const isLogin = log.actiune.includes('LOGIN');

                        return (
                          <tr key={log.id} className="hover:bg-morning-50 transition">
                            <td className="p-3 font-mono text-[11px] text-sage-600 whitespace-nowrap font-bold">
                              {new Date(log.createdAt).toLocaleString('ro-RO')}
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-lg bg-sapphire-100 text-sapphire-800 font-black text-xs flex items-center justify-center shrink-0">
                                  {log.userNume ? log.userNume.charAt(0) : 'U'}
                                </div>
                                <div>
                                  <p className="font-extrabold text-sapphire-900 leading-tight">{log.userNume || 'Sistem'}</p>
                                  <p className="text-[10px] text-sage-500 font-mono">{log.userEmail || '-'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  log.userRol === 'ADMIN'
                                    ? 'bg-sapphire-100 text-sapphire-800'
                                    : log.userRol === 'OPERATOR'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {log.userRol || 'OPERATOR'}
                              </span>
                            </td>
                            <td className="p-3 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase whitespace-nowrap ${
                                  isCreate
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : isDelete
                                    ? 'bg-roseash-100 text-terracotta-700 border border-roseash-300'
                                    : isLogin
                                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                    : 'bg-sapphire-100 text-sapphire-800 border border-sapphire-300'
                                }`}
                              >
                                {log.actiune}
                              </span>
                            </td>
                            <td className="p-3 font-extrabold text-slate-800 text-[11px] whitespace-nowrap">{log.modul}</td>
                            <td className="p-3 text-[11px] text-slate-700 break-words leading-relaxed max-w-md" title={log.detalii || ''}>
                              {log.detalii || '-'}
                            </td>
                            <td className="p-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => setSelectedAuditLog(log)}
                                className="px-3 py-1.5 rounded-xl bg-morning-100 hover:bg-sapphire-50 hover:text-sapphire-600 text-slate-700 font-extrabold text-[11px] transition shadow-xs"
                              >
                                Detalii
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-xs text-sage-500 italic">
                          Nicio înregistrare de audit găsită conform filtrelor selectate.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ALSÓ OLDALCSÚSZKA (Hosszú lista esetén kéznél van lent is) */}
              {auditLogs.length > 5 && (
                <div className="p-2.5 bg-morning-50 rounded-xl border border-morning-200 flex items-center justify-between gap-3 text-xs">
                  <span className="text-[11px] font-bold text-sage-600 flex items-center space-x-1">
                    <Sliders className="w-3.5 h-3.5 text-sapphire-600" />
                    <span>Glisor inferior:</span>
                  </span>
                  <div className="flex items-center space-x-2 flex-1 max-w-sm">
                    <button
                      type="button"
                      onClick={() => scrollAuditBy(-200)}
                      className="p-1 rounded bg-white border border-morning-200 hover:bg-morning-100 text-sapphire-900"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={auditScrollPercent}
                      onChange={handleAuditSliderChange}
                      className="w-full h-2 bg-morning-200 rounded-lg appearance-none cursor-pointer accent-sapphire-600"
                    />
                    <button
                      type="button"
                      onClick={() => scrollAuditBy(200)}
                      className="p-1 rounded bg-white border border-morning-200 hover:bg-morning-100 text-sapphire-900"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================= */
            /* NÉZET 2: KÁRTYA / MOBILBARÁT NÉZET (RESPONSIVE CARDS) */
            /* ========================================================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => {
                  const isCreate = log.actiune.includes('CREARE') || log.actiune.includes('POST');
                  const isDelete = log.actiune.includes('STERGERE') || log.actiune.includes('DELETE');
                  const isLogin = log.actiune.includes('LOGIN');

                  return (
                    <div
                      key={log.id}
                      className="bg-white p-4 rounded-2xl border border-morning-200 hover:border-sapphire-300 hover:shadow-md transition space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-morning-100 pb-2.5">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-xl bg-sapphire-100 text-sapphire-800 font-black text-xs flex items-center justify-center shrink-0">
                            {log.userNume ? log.userNume.charAt(0) : 'U'}
                          </div>
                          <div>
                            <p className="font-extrabold text-sapphire-900 text-xs leading-tight">{log.userNume || 'Sistem'}</p>
                            <p className="text-[10px] text-sage-500 font-mono">{log.userEmail || '-'}</p>
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            log.userRol === 'ADMIN'
                              ? 'bg-sapphire-100 text-sapphire-800'
                              : log.userRol === 'OPERATOR'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {log.userRol || 'OPERATOR'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase ${
                            isCreate
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : isDelete
                              ? 'bg-roseash-100 text-terracotta-700 border border-roseash-300'
                              : isLogin
                              ? 'bg-purple-100 text-purple-800 border border-purple-300'
                              : 'bg-sapphire-100 text-sapphire-800 border border-sapphire-300'
                          }`}
                        >
                          {log.actiune}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-morning-100 text-slate-800 text-[11px] font-bold">
                          Modul: {log.modul}
                        </span>
                        <span className="text-[11px] text-sage-500 font-mono ml-auto font-bold">
                          {new Date(log.createdAt).toLocaleString('ro-RO')}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-morning-50 border border-morning-200/70 text-slate-700 text-xs font-mono leading-relaxed break-words">
                        {log.detalii || 'Fără detalii suplimentare'}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => setSelectedAuditLog(log)}
                          className="px-3.5 py-1.5 rounded-xl bg-sapphire-50 hover:bg-sapphire-100 text-sapphire-800 font-extrabold text-xs transition flex items-center space-x-1 shadow-xs"
                        >
                          <span>Detalii Complete</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full p-8 text-center text-xs text-sage-500 italic bg-white rounded-2xl border border-morning-200">
                  Nicio înregistrare de audit găsită conform filtrelor selectate.
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* ========================================================================= */}
      {/* TAB 10: ASPECT & TEMĂ VIZUALĂ (DARK / LIGHT / SISTEM) */}
      {/* ========================================================================= */}
      {activeTab === 'aspect' && (
        <div className="space-y-6 animate-fade-in">
          {/* Header Card */}
          <div className="pleasant-card bg-white p-6 rounded-3xl border border-morning-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-3.5 bg-sapphire-100 text-sapphire-800 rounded-2xl shrink-0">
                <Palette className="w-7 h-7 text-sapphire-700" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sapphire-900 text-lg">Personalizare Aspect & Temă Vizuală</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-sapphire-50 border border-sapphire-300 text-sapphire-800">
                    Theme Engine
                  </span>
                </div>
                <p className="text-xs text-sage-600 mt-1">
                  Alegeți modul de afișare preferat pentru FleetCMD. Preferința dumneavoastră este salvată local și aplicată instantaneu pe toate paginile și modulele.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 bg-morning-100 p-2 rounded-2xl border border-morning-200 shrink-0">
              <span className="text-[11px] font-bold text-sage-600 pl-2">Stare Curentă:</span>
              <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase flex items-center space-x-1.5 ${
                resolvedTheme === 'dark'
                  ? 'bg-sapphire-600 text-white shadow-xs'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                {resolvedTheme === 'dark' ? (
                  <>
                    <Moon className="w-3.5 h-3.5 mr-1" />
                    <span>Mod Întunecat (Activ)</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 mr-1 text-amber-600" />
                    <span>Mod Luminos (Activ)</span>
                  </>
                )}
              </span>
            </div>
          </div>

          {/* Selector 4 Teme Principale */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. MOD LUMINOS */}
            <div
              onClick={() => setTheme('light')}
              className={`pleasant-card rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-lg ${
                theme === 'light'
                  ? 'border-sapphire-500 bg-sapphire-50/20 shadow-md ring-2 ring-sapphire-500/20'
                  : 'border-morning-200 hover:border-sapphire-300 bg-white'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                    <Sun className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    theme === 'light'
                      ? 'bg-sapphire-500 text-white'
                      : 'bg-morning-200 text-sage-600'
                  }`}>
                    {theme === 'light' ? 'Activ' : 'Standard'}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-sapphire-900">Mod Luminos (Zi)</h4>
                  <p className="text-[11px] text-sage-600 mt-1 leading-relaxed">
                    Fundal aerisit, deschis, cu contrast ridicat pentru lizibilitate maximă în spații puternic iluminate natural.
                  </p>
                </div>

                {/* Previzualizare miniatură */}
                <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 space-y-1.5 pointer-events-none">
                  <div className="h-1.5 w-16 bg-slate-300 rounded" />
                  <div className="h-3.5 w-full bg-white rounded shadow-2xs border border-slate-200" />
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setTheme('light'); }}
                className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  theme === 'light'
                    ? 'bg-sapphire-600 text-white shadow-xs'
                    : 'bg-morning-100 hover:bg-morning-200 text-slate-700'
                }`}
              >
                {theme === 'light' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Temă Activă</span>
                  </>
                ) : (
                  <span>Selectează Luminos</span>
                )}
              </button>
            </div>

            {/* 2. GRIS TITAN MODERN (ÎNTRE LUMINOS ȘI ÎNTUNECAT) */}
            <div
              onClick={() => setTheme('gray')}
              className={`pleasant-card rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-lg relative overflow-hidden ${
                theme === 'gray'
                  ? 'border-sky-500 bg-sky-50/20 shadow-md ring-2 ring-sky-500/30'
                  : 'border-morning-200 hover:border-sky-400 bg-white'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-slate-800 text-sky-400 border border-slate-700 flex items-center justify-center shadow-xs">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    theme === 'gray'
                      ? 'bg-sky-500 text-white animate-pulse'
                      : 'bg-slate-800 text-sky-300 border border-slate-700'
                  }`}>
                    {theme === 'gray' ? 'Activ' : 'Nou & Modern'}
                  </span>
                </div>

                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-extrabold text-sm text-sapphire-900">Gris Titan Modern</h4>
                  </div>
                  <p className="text-[11px] text-sage-600 mt-1 leading-relaxed">
                    Echilibrul perfect între zi și noapte. Paletă Titanium Graphite cu finisaj mat ultramodern, contrast cald și aspect tehnologic de ultimă generație.
                  </p>
                </div>

                {/* Previzualizare miniatură Gris Titan */}
                <div className="p-2.5 rounded-xl bg-[#1E232B] border border-[#374151] space-y-1.5 pointer-events-none">
                  <div className="h-1.5 w-16 bg-[#38BDF8] rounded" />
                  <div className="h-3.5 w-full bg-[#272D37] rounded border border-[#374151]" />
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setTheme('gray'); }}
                className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  theme === 'gray'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-morning-100 hover:bg-morning-200 text-slate-700'
                }`}
              >
                {theme === 'gray' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Temă Activă</span>
                  </>
                ) : (
                  <span>Selectează Gris Modern</span>
                )}
              </button>
            </div>

            {/* 3. MOD ÎNTUNECAT */}
            <div
              onClick={() => setTheme('dark')}
              className={`pleasant-card rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-lg ${
                theme === 'dark'
                  ? 'border-sapphire-500 bg-sapphire-50/20 shadow-md ring-2 ring-sapphire-500/20'
                  : 'border-morning-200 hover:border-sapphire-300 bg-white'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-indigo-950 text-indigo-400 border border-indigo-800/40 flex items-center justify-center shadow-xs">
                    <Moon className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    theme === 'dark'
                      ? 'bg-sapphire-500 text-white'
                      : 'bg-indigo-100 text-indigo-900'
                  }`}>
                    {theme === 'dark' ? 'Activ' : 'Nocturn'}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-sapphire-900">Mod Întunecat (Noapte)</h4>
                  <p className="text-[11px] text-sage-600 mt-1 leading-relaxed">
                    Paletă Midnight Sapphire & Obsidian profundă. Reduce oboseala ochilor, optim pentru dispecerat, atelier și utilizare nocturnă.
                  </p>
                </div>

                {/* Previzualizare miniatură */}
                <div className="p-2.5 rounded-xl bg-[#0B131B] border border-[#1E3145] space-y-1.5 pointer-events-none">
                  <div className="h-1.5 w-16 bg-[#1E3145] rounded" />
                  <div className="h-3.5 w-full bg-[#111D28] rounded border border-[#1E3145]" />
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setTheme('dark'); }}
                className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  theme === 'dark'
                    ? 'bg-sapphire-600 text-white shadow-xs'
                    : 'bg-morning-100 hover:bg-morning-200 text-slate-700'
                }`}
              >
                {theme === 'dark' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Temă Activă</span>
                  </>
                ) : (
                  <span>Selectează Întunecat</span>
                )}
              </button>
            </div>

            {/* 4. SINCRONIZARE SISTEM */}
            <div
              onClick={() => setTheme('system')}
              className={`pleasant-card rounded-3xl p-5 border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 hover:shadow-lg ${
                theme === 'system'
                  ? 'border-sapphire-500 bg-sapphire-50/20 shadow-md ring-2 ring-sapphire-500/20'
                  : 'border-morning-200 hover:border-sapphire-300 bg-white'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-11 h-11 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center shadow-xs">
                    <Monitor className="w-5 h-5" />
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    theme === 'system'
                      ? 'bg-sapphire-500 text-white'
                      : 'bg-morning-200 text-sage-600'
                  }`}>
                    {theme === 'system' ? 'Activ' : 'Automat'}
                  </span>
                </div>

                <div>
                  <h4 className="font-extrabold text-sm text-sapphire-900">Automat (Sistem OS)</h4>
                  <p className="text-[11px] text-sage-600 mt-1 leading-relaxed">
                    Aplicația preia automat preferințele sistemului tău de operare (Windows / macOS / Android). Se comută sincronizat cu dispozitivul.
                  </p>
                </div>

                {/* Previzualizare miniatură split */}
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-slate-200 to-[#0B131B] border border-slate-300 space-y-1.5 pointer-events-none">
                  <div className="h-1.5 w-16 bg-slate-400 rounded" />
                  <div className="h-3.5 w-full bg-gradient-to-r from-white to-[#111D28] rounded border border-slate-300" />
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setTheme('system'); }}
                className={`w-full py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 ${
                  theme === 'system'
                    ? 'bg-sapphire-600 text-white shadow-xs'
                    : 'bg-morning-100 hover:bg-morning-200 text-slate-700'
                }`}
              >
                {theme === 'system' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>Sincronizare Activă</span>
                  </>
                ) : (
                  <span>Sincronizare Sistem</span>
                )}
              </button>
            </div>
          </div>

          {/* CONTROL MĂRIME TEXT / SCARĂ TIPOGRAFICĂ */}
          <div className="pleasant-card bg-white p-6 rounded-3xl border border-morning-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-sapphire-100 text-sapphire-800 rounded-2xl shadow-2xs">
                  <Type className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-base text-sapphire-900">Mărime Text & Lizibilitate Interfață</h4>
                  <p className="text-xs text-sage-600 mt-0.5">
                    Ajustați dimensiunea scrisului pentru a mări lizibilitatea sau pentru a afișa mai multe date pe ecran simultan.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 bg-morning-100 px-3 py-1.5 rounded-xl border border-morning-200">
                <span className="text-[11px] font-bold text-sage-600">Scară activă:</span>
                <span className="text-xs font-black uppercase text-sapphire-900">
                  {fontSize === 'compact' ? 'Compact (14px)' : fontSize === 'large' ? 'Generos (18px)' : 'Standard (16px)'}
                </span>
              </div>
            </div>

            {/* Cele 3 opțiuni de mărime */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. COMPACT */}
              <div
                onClick={() => setFontSize('compact')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  fontSize === 'compact'
                    ? 'border-sapphire-500 bg-sapphire-50/25 ring-2 ring-sapphire-500/20 shadow-xs'
                    : 'border-morning-200 hover:border-sapphire-300 bg-morning-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-sm text-sapphire-900 bg-morning-200 w-6 h-6 rounded flex items-center justify-center">A</span>
                    <span className="text-xs font-extrabold text-sapphire-900">Compact (Mic)</span>
                  </div>
                  {fontSize === 'compact' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sapphire-500 text-white">
                      Selectat
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-sage-600 leading-relaxed">
                  Densitate maximă. Afișează mai multe rânduri în tabele, stocuri și comenzi de lucru. Recomandat pentru ecrane mari.
                </p>
                <div className="text-[11px] font-mono font-bold text-sapphire-800 bg-morning-100 p-2 rounded-lg border border-morning-200 text-center">
                  Exemplu: 14px Text dens
                </div>
              </div>

              {/* 2. STANDARD */}
              <div
                onClick={() => setFontSize('standard')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  fontSize === 'standard'
                    ? 'border-sapphire-500 bg-sapphire-50/25 ring-2 ring-sapphire-500/20 shadow-xs'
                    : 'border-morning-200 hover:border-sapphire-300 bg-morning-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-base text-sapphire-900 bg-morning-200 w-6 h-6 rounded flex items-center justify-center">A</span>
                    <span className="text-xs font-extrabold text-sapphire-900">Standard (Mediu)</span>
                  </div>
                  {fontSize === 'standard' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sapphire-500 text-white">
                      Recomandat
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-sage-600 leading-relaxed">
                  Dimensiune echilibrată prestabilită. Oferă o experiență armonioasă și lizibilitate optimă pe laptopuri și monitoare.
                </p>
                <div className="text-xs font-mono font-bold text-sapphire-800 bg-morning-100 p-2 rounded-lg border border-morning-200 text-center">
                  Exemplu: 16px Text standard
                </div>
              </div>

              {/* 3. GENEROS */}
              <div
                onClick={() => setFontSize('large')}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  fontSize === 'large'
                    ? 'border-sapphire-500 bg-sapphire-50/25 ring-2 ring-sapphire-500/20 shadow-xs'
                    : 'border-morning-200 hover:border-sapphire-300 bg-morning-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-lg text-sapphire-900 bg-morning-200 w-6 h-6 rounded flex items-center justify-center">A</span>
                    <span className="text-xs font-extrabold text-sapphire-900">Generos (Mare)</span>
                  </div>
                  {fontSize === 'large' && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-sapphire-500 text-white">
                      Selectat
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-sage-600 leading-relaxed">
                  Lizibilitate sporită fără efort vizual. Ideal pentru tablete pe teren, ecrane tactile sau ateliere de mecanică.
                </p>
                <div className="text-sm font-mono font-bold text-sapphire-800 bg-morning-100 p-2 rounded-lg border border-morning-200 text-center">
                  Exemplu: 18px Text generos
                </div>
              </div>
            </div>
          </div>

          {/* Live Preview Box & Beneficii */}
          <div className="pleasant-card bg-white p-6 rounded-3xl border border-morning-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Palette className="w-5 h-5 text-sapphire-600" />
                <h4 className="font-extrabold text-sm text-sapphire-900">Previzualizare Elemente Interfață</h4>
              </div>
              <span className="text-[11px] text-sage-500 font-mono">Randat în timp real</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="p-4 rounded-2xl bg-morning-100 border border-morning-200 space-y-1">
                <span className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Flotă Activă</span>
                <p className="text-xl font-black text-sapphire-900 font-mono">100% (14/14)</p>
                <span className="text-[10px] text-emerald-700 font-semibold">Toate vehiculele operaționale</span>
              </div>

              <div className="p-4 rounded-2xl bg-morning-100 border border-morning-200 space-y-1">
                <span className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Comenzi Deschise</span>
                <p className="text-xl font-black text-sapphire-900 font-mono">3 Comenzi de lucru</p>
                <span className="text-[10px] text-sapphire-700 font-semibold">2 mecanici alocați</span>
              </div>

              <div className="p-4 rounded-2xl bg-morning-100 border border-morning-200 space-y-1">
                <span className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Stoc Fluide</span>
                <p className="text-xl font-black text-sapphire-900 font-mono">Consolidat FIFO</p>
                <span className="text-[10px] text-emerald-700 font-semibold">0 duplicate detectate</span>
              </div>

              <div className="p-4 rounded-2xl bg-morning-100 border border-morning-200 space-y-1">
                <span className="text-[10px] font-bold text-sage-600 uppercase tracking-wider">Alerte Critice</span>
                <p className="text-xl font-black text-sapphire-900 font-mono">0 Alerte</p>
                <span className="text-[10px] text-emerald-700 font-semibold">Sistem în parametri optimi</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-sapphire-50/70 border border-sapphire-200 text-xs text-sapphire-900 leading-relaxed flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-sapphire-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold">Tehnologie Zero-Flicker & Persistență Locală:</p>
                <p className="text-[11px] text-sapphire-800 mt-0.5">
                  Tema și mărimea fontului selectate se aplică instantaneu pe întregul sistem și sunt stocate în memoria locală a browserului. La fiecare navigare sau reîncărcare, interfața se inițializează instant conform preferințelor dumneavoastră.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 11: CONFIGURARE INTEGRARE ANAF RO E-FACTURA OAUTH2 (DOAR ADMIN) */}
      {/* ========================================================================= */}
      {activeTab === 'efactura' && (
        !isAdmin ? (
          <div className="p-12 text-center bg-white dark:bg-[#142232] border border-morning-200 dark:border-morning-200 rounded-3xl space-y-3 shadow-xs">
            <ShieldAlert className="w-12 h-12 text-terracotta-500 mx-auto" />
            <h3 className="text-base font-bold text-sapphire-900 dark:text-white">Acces Restricționat</h3>
            <p className="text-xs text-sage-600 dark:text-slate-400">Configurarea integrării ANAF e-Factura este rezervată exclusiv administratorilor de sistem.</p>
          </div>
        ) : !efacturaUnlocked ? (
          <div className="max-w-md mx-auto my-8 pleasant-card bg-white dark:bg-[#142232] border-2 border-sapphire-200 dark:border-sapphire-800/80 p-6 sm:p-8 rounded-3xl shadow-xl space-y-6 animate-fade-in">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-sapphire-50 dark:bg-sapphire-950/60 border border-sapphire-200 dark:border-sapphire-800 text-sapphire-600 dark:text-sapphire-400 flex items-center justify-center mx-auto shadow-inner">
                <Lock className="w-8 h-8 text-sapphire-600 dark:text-sapphire-400" />
              </div>
              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sapphire-100 dark:bg-sapphire-950/60 text-sapphire-800 dark:text-sapphire-300 border border-sapphire-200 dark:border-sapphire-800">
                  Zonă Securizată ANAF
                </span>
                <h3 className="text-lg font-black text-sapphire-900 dark:text-white">
                  Confirmare Parolă Administrator
                </h3>
                <p className="text-xs text-sage-600 dark:text-slate-400 leading-relaxed max-w-xs mx-auto">
                  Accesul la credențialele OAuth2, cheile SPV și generarea de token-uri e-Factura necesită reconfirmarea parolei de administrator.
                </p>
              </div>
            </div>

            {/* Profil utilizator curent */}
            <div className="p-3 bg-morning-100/70 dark:bg-[#101b27] border border-morning-200 dark:border-morning-200 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-sapphire-600 text-white font-black flex items-center justify-center text-xs">
                  {authUser?.nume ? authUser.nume.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <p className="font-extrabold text-sapphire-900 dark:text-white">{authUser?.nume || 'Administrator'}</p>
                  <p className="text-[11px] font-mono text-sage-500">@{authUser?.username || 'admin'}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                Admin Verificat
              </span>
            </div>

            {/* Formular introducere parolă */}
            <form onSubmit={handleVerifyEfacturaPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-sapphire-900 dark:text-white block mb-1.5">
                  Introduceți Parola Dvs.: *
                </label>
                <div className="relative">
                  <input
                    type={efacturaShowPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    value={efacturaPasswordPrompt}
                    onChange={(e) => {
                      setEfacturaPasswordPrompt(e.target.value);
                      if (efacturaPasswordError) setEfacturaPasswordError('');
                    }}
                    placeholder="••••••••••••"
                    className={`w-full bg-morning-100 dark:bg-[#101b27] border rounded-2xl pl-4 pr-11 py-3 text-xs text-sapphire-900 dark:text-white font-bold outline-none transition ${
                      efacturaPasswordError
                        ? 'border-red-400 dark:border-red-500 focus:ring-2 focus:ring-red-400'
                        : 'border-morning-200 dark:border-morning-200 focus:border-sapphire-500 focus:ring-2 focus:ring-sapphire-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setEfacturaShowPassword(!efacturaShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sapphire-900 dark:hover:text-white p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {efacturaShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {efacturaPasswordError && (
                  <p className="text-xs text-red-600 dark:text-red-400 font-semibold mt-1.5 flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{efacturaPasswordError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('vehicule')}
                  className="flex-1 py-3 rounded-2xl bg-white dark:bg-[#101b27] border border-morning-200 dark:border-morning-200 hover:bg-morning-100 text-slate-700 dark:text-slate-200 font-bold text-xs transition cursor-pointer text-center"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={efacturaVerifyingPassword || !efacturaPasswordPrompt}
                  className="flex-1 py-3 rounded-2xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-xs shadow-md shadow-sapphire-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  {efacturaVerifyingPassword ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Se verifică...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Deblochează</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* Header Card */}
            <div className="pleasant-card bg-white dark:bg-[#142232] p-6 rounded-3xl border border-morning-200 dark:border-morning-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="p-3.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 rounded-2xl shrink-0">
                  <Receipt className="w-7 h-7 text-emerald-700 dark:text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center space-x-2 flex-wrap">
                    <h3 className="font-extrabold text-sapphire-900 dark:text-white text-lg">Integrare ANAF RO e-Factura SPV</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300">
                      OAuth2 Hibrid UBL 2.1
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                      Supabase Cloud DB
                    </span>
                  </div>
                  <p className="text-xs text-sage-600 dark:text-slate-400 mt-1">
                    Gestiune securizată a credențialelor OAuth2, generare token-uri JWT calificate și sincronizare automată orară a facturilor în fundal.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setEfacturaUnlocked(false)}
                  className="px-3.5 py-2 rounded-xl bg-morning-100 dark:bg-morning-100/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 text-slate-700 dark:text-slate-200 border border-morning-200 dark:border-morning-200 font-bold text-xs transition flex items-center space-x-1.5"
                  title="Blochează accesul la datele confidențiale ANAF"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Blochează</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowEfacturaGuide(!showEfacturaGuide)}
                  className="px-3.5 py-2 rounded-xl bg-sapphire-50 dark:bg-sapphire-950/40 text-sapphire-700 dark:text-sapphire-300 border border-sapphire-200 dark:border-sapphire-800 font-bold text-xs hover:bg-sapphire-100 transition flex items-center space-x-1.5"
                >
                  <BookOpen className="w-4 h-4 text-sapphire-600" />
                  <span>{showEfacturaGuide ? 'Ascunde Ghid' : 'Ghid Pas cu Pas (?)'}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchEfacturaConfig}
                  disabled={efacturaLoading}
                  className="px-3.5 py-2 rounded-xl bg-morning-100 dark:bg-morning-100/50 hover:bg-morning-200 text-slate-700 dark:text-slate-200 border border-morning-200 dark:border-morning-200 font-bold text-xs transition flex items-center space-x-1.5 disabled:opacity-50"
                  title="Reîncarcă datele din baza de date Supabase"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${efacturaLoading ? 'animate-spin text-sapphire-600' : ''}`} />
                  <span>Reîmprospătează</span>
                </button>

                <button
                  type="button"
                  onClick={handleTriggerEfacturaSync}
                  disabled={efacturaSyncing || efacturaSyncStatus?.inProgress}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Zap className={`w-3.5 h-3.5 ${efacturaSyncing ? 'animate-bounce' : ''}`} />
                  <span>{efacturaSyncing ? 'Sincronizare în curs...' : 'Sincronizează SPV Acum'}</span>
                </button>
              </div>
            </div>

            {/* LIVE CONNECTION STATUS OVERVIEW (4 CARDS) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Card 1: Stare Conexiune & CIF */}
              <div className="pleasant-card bg-white dark:bg-[#142232] p-4 rounded-2xl border border-morning-200 dark:border-morning-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sage-600 dark:text-slate-400 uppercase tracking-wider">Stare Conexiune SPV</span>
                  {efacturaConfig?.accessToken ? (
                    <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-black text-[10px] border border-emerald-300 dark:border-emerald-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Conectat</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold text-[10px] border border-amber-300">
                      Neautorizat
                    </span>
                  )}
                </div>
                <p className="text-base font-black text-sapphire-900 dark:text-white font-mono">
                  {efacturaConfig?.cifFirma || efacturaCifFirma || 'CIF Nespecificat'}
                </p>
                <div className="text-[11px] text-sage-600 dark:text-slate-400 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="truncate">Stocat securizat în Supabase</span>
                </div>
              </div>

              {/* Card 2: Access Token (90 Zile) */}
              <div className="pleasant-card bg-white dark:bg-[#142232] p-4 rounded-2xl border border-morning-200 dark:border-morning-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sage-600 dark:text-slate-400 uppercase tracking-wider">Access Token (90 Zile)</span>
                  {efacturaConfig?.accessTokenExpiresAt ? (
                    (() => {
                      const diffDays = Math.ceil((new Date(efacturaConfig.accessTokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const isExpired = diffDays <= 0;
                      const isExpiringSoon = diffDays <= 10;
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          isExpired
                            ? 'bg-red-100 text-red-800 border border-red-300'
                            : isExpiringSoon
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        }`}>
                          {isExpired ? 'Expirat' : `${diffDays} zile active`}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-sage-400 text-[10px] font-bold">Lipsă</span>
                  )}
                </div>
                <p className="text-xs font-bold text-sapphire-900 dark:text-white">
                  {efacturaConfig?.accessTokenExpiresAt
                    ? `Expiră la: ${new Date(efacturaConfig.accessTokenExpiresAt).toLocaleDateString('ro-RO')}`
                    : 'Niciun token activ'}
                </p>
                <p className="text-[11px] text-sage-600 dark:text-slate-400">
                  {efacturaConfig?.accessToken ? 'Semnătură JWT validă SPV' : 'Necesită autorizare prin token fizic'}
                </p>
              </div>

              {/* Card 3: Refresh Token (365 Zile) */}
              <div className="pleasant-card bg-white dark:bg-[#142232] p-4 rounded-2xl border border-morning-200 dark:border-morning-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sage-600 dark:text-slate-400 uppercase tracking-wider">Refresh Token (365 Zile)</span>
                  {efacturaConfig?.refreshTokenExpiresAt ? (
                    (() => {
                      const diffDays = Math.ceil((new Date(efacturaConfig.refreshTokenExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border border-purple-300 font-black text-[10px]">
                          {diffDays > 0 ? `${diffDays} zile active` : 'Expirat'}
                        </span>
                      );
                    })()
                  ) : (
                    <span className="text-sage-400 text-[10px] font-bold">Lipsă</span>
                  )}
                </div>
                <p className="text-xs font-bold text-sapphire-900 dark:text-white">
                  {efacturaConfig?.refreshTokenExpiresAt
                    ? `Expiră la: ${new Date(efacturaConfig.refreshTokenExpiresAt).toLocaleDateString('ro-RO')}`
                    : 'Niciun refresh token'}
                </p>
                <p className="text-[11px] text-sage-600 dark:text-slate-400">
                  Reîmprospătare automată cu 48h înainte
                </p>
              </div>

              {/* Card 4: Sincronizare Cron & Ultimul Status */}
              <div className="pleasant-card bg-white dark:bg-[#142232] p-4 rounded-2xl border border-morning-200 dark:border-morning-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-sage-600 dark:text-slate-400 uppercase tracking-wider">Sincronizare Orară</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    efacturaConfig?.stareCronAuto !== false
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-morning-200 text-slate-700'
                  }`}>
                    {efacturaConfig?.stareCronAuto !== false ? 'Activă (Orară)' : 'Dezactivată'}
                  </span>
                </div>
                <p className="text-xs font-bold text-sapphire-900 dark:text-white truncate">
                  {efacturaConfig?.ultimulSyncSucces
                    ? new Date(efacturaConfig.ultimulSyncSucces).toLocaleString('ro-RO')
                    : 'Nicio sincronizare finalizată'}
                </p>
                <p className="text-[11px] text-sage-600 dark:text-slate-400">
                  {efacturaSyncStatus?.inProgress
                    ? 'Sync în curs în fundal...'
                    : efacturaSyncStatus?.errorMessage
                    ? `Eroare: ${efacturaSyncStatus.errorMessage}`
                    : 'Sistem stabil, fără erori'}
                </p>
              </div>
            </div>

            {/* GHID PAS CU PAS CONECTARE ANAF SPV (COLLAPSIBLE) */}
            {showEfacturaGuide && (
              <div className="pleasant-card bg-white dark:bg-[#142232] border-2 border-sapphire-200 dark:border-sapphire-800 p-6 rounded-3xl shadow-sm space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-morning-200 dark:border-morning-200 pb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-2xl bg-sapphire-100 dark:bg-sapphire-950/50 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-sapphire-600 dark:text-sapphire-400" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sapphire-900 dark:text-white text-sm">
                        Ghid Pas cu Pas: Conectare & Autorizare OAuth2 în Portalul ANAF SPV
                      </h4>
                      <p className="text-xs text-sage-600 dark:text-slate-400">
                        Urmați acești 5 pași simpli pentru a lega contul de firmă la serverele de facturare electronică ale Ministerului Finanțelor.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowEfacturaGuide(false)}
                    className="text-sage-400 hover:text-sapphire-900 dark:hover:text-white text-xs font-bold px-2.5 py-1 rounded-lg hover:bg-morning-100"
                  >
                    ✕ Închide Ghidul
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                  {/* Pas 1 */}
                  <div className="p-3.5 bg-morning-100 dark:bg-morning-100/40 rounded-2xl border border-morning-200 dark:border-morning-200 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="w-6 h-6 rounded-lg bg-sapphire-600 text-white font-black text-xs flex items-center justify-center">1</span>
                        <h5 className="font-extrabold text-sapphire-900 dark:text-white text-xs">Token USB Semnătură</h5>
                      </div>
                      <p className="text-sage-700 dark:text-slate-300 text-[11px] leading-relaxed">
                        Introduceți stick-ul USB cu certificatul digital calificat (CertSign, DigiSign, TransSped etc.) în calculator și verificați că aplicația token-ului este deschisă.
                      </p>
                    </div>
                    <span className="text-[10px] text-sapphire-700 dark:text-sapphire-300 font-bold bg-sapphire-50 dark:bg-sapphire-950/40 p-1.5 rounded-lg">
                      Condiție: Drepturi SPV pe CIF
                    </span>
                  </div>

                  {/* Pas 2 */}
                  <div className="p-3.5 bg-morning-100 dark:bg-morning-100/40 rounded-2xl border border-morning-200 dark:border-morning-200 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="w-6 h-6 rounded-lg bg-sapphire-600 text-white font-black text-xs flex items-center justify-center">2</span>
                        <h5 className="font-extrabold text-sapphire-900 dark:text-white text-xs">Înregistrare ANAF OAuth</h5>
                      </div>
                      <p className="text-sage-700 dark:text-slate-300 text-[11px] leading-relaxed">
                        Accesați portalul oficial <a href="https://www.anaf.ro/InregOauth/index.xhtml" target="_blank" rel="noreferrer" className="text-sapphire-600 underline font-bold">InregOauth</a>, autentificați-vă cu certificatul și copiați <strong>Client ID</strong> și <strong>Client Secret</strong>.
                      </p>
                    </div>
                    <span className="text-[10px] text-sage-600 font-mono bg-morning-200/60 p-1.5 rounded-lg truncate">
                      Callback: {efacturaRedirectUri}
                    </span>
                  </div>

                  {/* Pas 3 */}
                  <div className="p-3.5 bg-morning-100 dark:bg-morning-100/40 rounded-2xl border border-morning-200 dark:border-morning-200 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="w-6 h-6 rounded-lg bg-sapphire-600 text-white font-black text-xs flex items-center justify-center">3</span>
                        <h5 className="font-extrabold text-sapphire-900 dark:text-white text-xs">Deschidere URL Autorizare</h5>
                      </div>
                      <p className="text-sage-700 dark:text-slate-300 text-[11px] leading-relaxed">
                        Apăsați butonul <strong>`1. Deschide URL Autorizare ANAF`</strong> din vrăjitorul de mai jos, alegeți certificatul din dialogul browserului și introduceți codul PIN al token-ului.
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg">
                      Autorizare oficială securizată
                    </span>
                  </div>

                  {/* Pas 4 */}
                  <div className="p-3.5 bg-morning-100 dark:bg-morning-100/40 rounded-2xl border border-morning-200 dark:border-morning-200 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black text-xs flex items-center justify-center">4</span>
                        <h5 className="font-extrabold text-sapphire-900 dark:text-white text-xs">Schimb Cod pe Token-uri</h5>
                      </div>
                      <p className="text-sage-700 dark:text-slate-300 text-[11px] leading-relaxed">
                        Copiați parametrul <code>?code=...</code> din bara de adresă după redirecționare și apăsați <strong>`2. Schimbă pe Token-uri JWT`</strong>.
                      </p>
                    </div>
                    <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-1.5 rounded-lg">
                      Token-uri JWT generate
                    </span>
                  </div>

                  {/* Pas 5 */}
                  <div className="p-3.5 bg-morning-100 dark:bg-morning-100/40 rounded-2xl border border-morning-200 dark:border-morning-200 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">5</span>
                        <h5 className="font-extrabold text-sapphire-900 dark:text-white text-xs">Automatizare Supabase</h5>
                      </div>
                      <p className="text-sage-700 dark:text-slate-300 text-[11px] leading-relaxed">
                        Token-urile sunt salvate în baza de date Supabase. Sistemul descarcă automat facturile la fiecare oră și reînnoiește token-ul cu 48h înainte de expirare.
                      </p>
                    </div>
                    <span className="text-[10px] text-purple-700 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 p-1.5 rounded-lg">
                      100% Autonom & Permanent
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* OAUTH2 INTERACTIVE WIZARD & CODE EXCHANGE */}
            <div className="pleasant-card bg-gradient-to-br from-sapphire-50/70 via-white to-morning-100 dark:from-[#142232] dark:via-[#192b3f] dark:to-[#142232] border-2 border-sapphire-200 dark:border-sapphire-800 p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 rounded-xl bg-sapphire-600 text-white flex items-center justify-center">
                    <Key className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-sapphire-900 dark:text-white">
                      Vrăjitor Interactiv de Autorizare OAuth2 & Schimb Cod
                    </h4>
                    <p className="text-[11px] text-sage-600 dark:text-slate-400">
                      Asigurați-vă că stick-ul USB este introdus în calculator înainte de a iniția pasul 1.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEfacturaAuthorizeUrl}
                  className="px-4 py-2.5 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-xs shadow-md shadow-sapphire-600/20 transition flex items-center space-x-2 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>1. Deschide URL Autorizare ANAF</span>
                </button>
              </div>

              <div className="pt-3 border-t border-sapphire-100 dark:border-sapphire-800/60">
                <label className="text-xs font-bold text-sapphire-900 dark:text-white block mb-1.5">
                  Introduceți Codul de Autorizare primit din redirecționare (?code=XYZ...):
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={efacturaAuthCodeInput}
                    onChange={(e) => setEfacturaAuthCodeInput(e.target.value)}
                    placeholder="Lipiți aici codul primit în bara browserului după autorizare..."
                    className="flex-1 bg-white dark:bg-[#101b27] border border-sapphire-200 dark:border-sapphire-700 rounded-xl px-3.5 py-2.5 text-xs text-sapphire-900 dark:text-white font-mono font-bold placeholder-sage-400"
                  />
                  <button
                    type="button"
                    onClick={handleExchangeEfacturaCode}
                    disabled={efacturaExchangingCode || !efacturaAuthCodeInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{efacturaExchangingCode ? 'Se generează token-urile...' : '2. Schimbă pe Token-uri JWT'}</span>
                  </button>
                </div>
                <p className="text-[11px] text-sage-500 dark:text-slate-400 mt-1.5">
                  La apăsarea butonului, codul este transmis serverului, care va descărca direct de la ANAF un <strong>Access Token (90 zile)</strong> și un <strong>Refresh Token (365 zile)</strong> și le va persista în Supabase.
                </p>
              </div>
            </div>

            {/* FORMULAR CONFIGURARE DATE CREDENȚIALE & SPV */}
            <form onSubmit={handleSaveEfacturaConfig} className="pleasant-card bg-white dark:bg-[#142232] border border-morning-200 dark:border-morning-200 p-6 rounded-3xl shadow-xs space-y-5 text-xs">
              <div className="flex items-center justify-between border-b border-morning-200 dark:border-morning-200 pb-3">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-sapphire-600" />
                  <h4 className="font-extrabold text-sm text-sapphire-900 dark:text-white">
                    Parametri Aplicație SPV & Credențiale ANAF
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEfacturaTokens(!showEfacturaTokens)}
                  className="text-sapphire-600 dark:text-sapphire-400 font-bold hover:underline flex items-center space-x-1"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>{showEfacturaTokens ? 'Ascunde Token-uri JWT' : 'Afișează / Editează Token-uri JWT'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sage-700 dark:text-slate-300 block mb-1.5 font-bold">
                    CUI / CIF Firmă (cu sau fără prefixul RO): *
                  </label>
                  <input
                    required
                    value={efacturaCifFirma}
                    onChange={(e) => setEfacturaCifFirma(e.target.value)}
                    placeholder="RO25746805"
                    className="w-full bg-morning-100 dark:bg-[#101b27] border border-morning-200 dark:border-morning-200 rounded-xl p-3 text-sapphire-900 dark:text-white font-mono font-bold text-xs"
                  />
                  <span className="text-[10px] text-sage-500 mt-1 block">CIF-ul firmei pentru care se recepționează facturile electronice din SPV.</span>
                </div>

                <div>
                  <label className="text-sage-700 dark:text-slate-300 block mb-1.5 font-bold">
                    Redirect URI (Callback URL înregistrat în portalul SPV): *
                  </label>
                  <input
                    required
                    value={efacturaRedirectUri}
                    onChange={(e) => setEfacturaRedirectUri(e.target.value)}
                    placeholder="https://fleet-cmd.vercel.app/efactura"
                    className="w-full bg-morning-100 dark:bg-[#101b27] border border-morning-200 dark:border-morning-200 rounded-xl p-3 text-sapphire-900 dark:text-white font-mono text-xs font-semibold"
                  />
                  <span className="text-[10px] text-sage-500 mt-1 block">Trebuie să coincidă exact cu adresa configurată în portalul ANAF InregOauth.</span>
                </div>

                <div>
                  <label className="text-sage-700 dark:text-slate-300 block mb-1.5 font-bold">
                    Client ID OAuth2 ANAF:
                  </label>
                  <input
                    value={efacturaClientId}
                    onChange={(e) => setEfacturaClientId(e.target.value)}
                    placeholder="ex: 182a45..."
                    className="w-full bg-morning-100 dark:bg-[#101b27] border border-morning-200 dark:border-morning-200 rounded-xl p-3 text-sapphire-900 dark:text-white font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-sage-700 dark:text-slate-300 block mb-1.5 font-bold">
                    Client Secret OAuth2 ANAF:
                  </label>
                  <input
                    type="password"
                    value={efacturaClientSecret}
                    onChange={(e) => setEfacturaClientSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    className="w-full bg-morning-100 dark:bg-[#101b27] border border-morning-200 dark:border-morning-200 rounded-xl p-3 text-sapphire-900 dark:text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* TOKEN TEXTAREAS (COLLAPSIBLE / ADVANCED) */}
              {showEfacturaTokens && (
                <div className="space-y-4 pt-3 border-t border-morning-200 dark:border-morning-200 animate-fade-in">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sage-700 dark:text-slate-300 font-bold">Access Token ANAF (JWT 90 Zile):</label>
                      {efacturaConfig?.accessTokenExpiresAt && (
                        <span className="text-[10px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          Expiră la: {new Date(efacturaConfig.accessTokenExpiresAt).toLocaleString('ro-RO')}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={efacturaAccessToken}
                      onChange={(e) => setEfacturaAccessToken(e.target.value)}
                      placeholder="Access Token JWT..."
                      className="w-full bg-morning-100 dark:bg-[#101b27] border border-morning-200 dark:border-morning-200 rounded-xl p-2.5 text-sapphire-900 dark:text-white font-mono text-[10px]"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-sage-700 dark:text-slate-300 font-bold">Refresh Token ANAF (JWT 365 Zile):</label>
                      {efacturaConfig?.refreshTokenExpiresAt && (
                        <span className="text-[10px] font-mono font-bold text-purple-700 dark:text-purple-400">
                          Expiră la: {new Date(efacturaConfig.refreshTokenExpiresAt).toLocaleString('ro-RO')}
                        </span>
                      )}
                    </div>
                    <textarea
                      rows={3}
                      value={efacturaRefreshToken}
                      onChange={(e) => setEfacturaRefreshToken(e.target.value)}
                      placeholder="Refresh Token JWT..."
                      className="w-full bg-morning-100 dark:bg-[#101b27] border border-morning-200 dark:border-morning-200 rounded-xl p-2.5 text-sapphire-900 dark:text-white font-mono text-[10px]"
                    />
                  </div>
                </div>
              )}

              {/* CRON AUTO SYNC TOGGLE */}
              <div className="p-4 bg-morning-100 dark:bg-[#101b27] rounded-2xl border border-morning-200 dark:border-morning-200 flex items-center justify-between">
                <label className="flex items-center space-x-3 text-xs font-bold text-sapphire-900 dark:text-white cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={efacturaStareCronAuto}
                    onChange={(e) => setEfacturaStareCronAuto(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <span>Sincronizare automată orară în fundal (Cron Job) cu reîmprospătare token la fiecare 90 zile</span>
                </label>
                <span className="text-[10px] text-sage-500 font-mono hidden sm:inline">Rulează automat 24/7 pe server</span>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={efacturaSaving}
                  className="px-6 py-3 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-xs shadow-md shadow-sapphire-600/20 transition flex items-center space-x-2 disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{efacturaSaving ? 'Se salvează în Supabase...' : 'Salvează Configurația în Supabase'}</span>
                </button>
              </div>
            </form>
          </div>
        )
      )}

      {/* ========================================================================= */}
      {/* TAB 12: COPIE DE SIGURANȚĂ & BAZĂ DE DATE (BACKUP & RESTORE)               */}
      {/* ========================================================================= */}
      {activeTab === 'backup' && (
        <div className="space-y-5">
          {/* BANNER NOTIFICARE SUCCES */}
          {backupSuccessMessage && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center space-x-3 text-emerald-900 text-xs shadow-xs">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div className="font-bold">{backupSuccessMessage}</div>
            </div>
          )}

          {/* CARD 1: SUMAR STATUS CONEXIUNE & SERVER */}
          <div className="pleasant-card bg-white p-6 rounded-3xl border border-morning-200 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-morning-200 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-extrabold text-sapphire-900">
                      Baza de Date Operațională FleetCMD
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wider uppercase flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                      <span>ONLINE & ACTIV</span>
                    </span>
                  </div>
                  <p className="text-xs text-sage-600 mt-0.5">
                    Găzduit în cloud de înaltă disponibilitate cu stocare securizată și trafic lunar nelimitat (10 TB).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={fetchBackupStats}
                disabled={backupLoading}
                className="self-start lg:self-auto px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold transition flex items-center space-x-2 border border-morning-200"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${backupLoading ? 'animate-spin' : ''}`} />
                <span>Reîmprospătează Status</span>
              </button>
            </div>

            {/* METRICS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 pt-4">
              <div className="p-3.5 rounded-2xl bg-morning-100/60 border border-morning-200">
                <span className="text-[10px] font-extrabold text-sage-600 uppercase tracking-wider block">Furnizor Cloud</span>
                <span className="font-extrabold text-xs text-sapphire-900 mt-1 block">Oracle Cloud Infrastructure</span>
                <span className="text-[10px] text-emerald-600 font-bold font-mono">Frankfurt (eu-central-1)</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-morning-100/60 border border-morning-200">
                <span className="text-[10px] font-extrabold text-sage-600 uppercase tracking-wider block">Motor Bază de Date</span>
                <span className="font-extrabold text-xs text-sapphire-900 mt-1 block">PostgreSQL 17</span>
                <span className="text-[10px] text-sage-500 font-mono font-bold">Port standard 5432</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-morning-100/60 border border-morning-200">
                <span className="text-[10px] font-extrabold text-sage-600 uppercase tracking-wider block">Trafic Rețea Alocat</span>
                <span className="font-black text-sm text-sapphire-900 font-mono mt-0.5 block">10.000 GB / lună</span>
                <span className="text-[10px] text-emerald-600 font-bold">10 TB (Always Free)</span>
              </div>

              <div className="p-3.5 rounded-2xl bg-morning-100/60 border border-morning-200">
                <span className="text-[10px] font-extrabold text-sage-600 uppercase tracking-wider block">Securitate & Backup</span>
                <span className="font-extrabold text-xs text-sapphire-900 mt-1 block">Izolare Contênerizată</span>
                <span className="text-[10px] text-sage-500 font-mono font-bold">Docker Engine 29</span>
              </div>
            </div>
          </div>

          {/* CARD 2: DESCĂRCARE COPIE DE SIGURANȚĂ (ACTION HERO) */}
          <div className="pleasant-card bg-gradient-to-br from-sapphire-900 to-slate-900 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Siguranța Datelor Flotei Garantată</span>
                </div>
                <h3 className="text-xl font-black">
                  Descarcă o Copie de Siguranță Completă pe Calculator
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Puteți descărca oricând un fișier complet de rezervă care conține toate utilajele, actele, comenzile de lucru, anvelopele, stocurile, facturile ANAF și utilizatorii. Salvați acest fișier pe un stick USB, disc local sau arhivă externă.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={backupDownloading}
                className="px-6 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm shadow-xl hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center space-x-2.5 shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {backupDownloading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Se generează copia de siguranță...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    <span>Descarcă Backup Imediat (.json)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* CARD 3: REZUMAT DETALIAT ENTITĂȚI INCLUSE ÎN BACKUP */}
          <div className="pleasant-card bg-white p-6 rounded-3xl border border-morning-200 shadow-xs space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <PackageCheck className="w-4 h-4 text-sapphire-600" />
                <h4 className="font-extrabold text-sm text-sapphire-900">
                  Entități și Tabele Incluse în Salvare
                </h4>
              </div>
              <span className="text-[11px] font-mono text-sage-500 font-bold">36 tabele relaționale</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 text-center">
                <span className="text-xl font-black text-sapphire-900 font-mono block">
                  {backupStats?.counts?.vehicule ?? vehicule.length}
                </span>
                <span className="text-[11px] font-bold text-sage-600">Vehicule Flotă</span>
              </div>

              <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 text-center">
                <span className="text-xl font-black text-emerald-700 font-mono block">
                  {backupStats?.counts?.documenteVehicul ?? documente.length}
                </span>
                <span className="text-[11px] font-bold text-sage-600">Documente & Acte</span>
              </div>

              <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 text-center">
                <span className="text-xl font-black text-amber-700 font-mono block">
                  {backupStats?.counts?.articoleStoc ?? 33}
                </span>
                <span className="text-[11px] font-bold text-sage-600">Piese în Stoc</span>
              </div>

              <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 text-center">
                <span className="text-xl font-black text-periwinkle-700 font-mono block">
                  {backupStats?.counts?.comenziLucru ?? 11}
                </span>
                <span className="text-[11px] font-bold text-sage-600">Comenzi de Lucru</span>
              </div>

              <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 text-center">
                <span className="text-xl font-black text-sapphire-700 font-mono block">
                  {backupStats?.counts?.anvelope ?? 0}
                </span>
                <span className="text-[11px] font-bold text-sage-600">Anvelope Înregistrate</span>
              </div>

              <div className="p-3 rounded-xl bg-morning-100 border border-morning-200 text-center">
                <span className="text-xl font-black text-slate-800 font-mono block">
                  {backupStats?.counts?.utilizatori ?? usersList.length}
                </span>
                <span className="text-[11px] font-bold text-sage-600">Utilizatori & Drepturi</span>
              </div>
            </div>

            <div className="pt-2 text-[11px] text-sage-500 flex items-center space-x-1.5">
              <Shield className="w-3.5 h-3.5 text-sapphire-600 shrink-0" />
              <span>
                Fiecare salvare include metadate criptografice, data și ora exactă, precum și identitatea administratorului care a declanșat operațiunea de salvare în Jurnalul de Audit.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADĂUGARE VEHICUL NOU */}
      {/* ========================================================================= */}
      {showAddVehiculModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Truck className="w-5 h-5 text-sapphire-500" />
                <span>Adăugare Vehicul Nou în Flotă</span>
              </h3>
              <button onClick={() => setShowAddVehiculModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateVehicul} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod Intern (ex: UTIL-01): *</label>
                  <input required value={numarIntern} onChange={(e) => setNumarIntern(e.target.value)} placeholder="UTIL-01" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Nr. Înmatriculare: *</label>
                  <input required value={numarInmatriculare} onChange={(e) => setNumarInmatriculare(e.target.value)} placeholder="B-101-VLV" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie Utilaj: *</label>
                  <select value={categorieEnum} onChange={(e) => setCategorieEnum(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                    {categoriiVehicul.length > 0 ? (
                      categoriiVehicul.map((c) => (
                        <option key={c.id || c.nume} value={c.nume}>{c.nume} {c.descriere ? `(${c.descriere})` : ''}</option>
                      ))
                    ) : (
                      <>
                        <option value="CAP_TRACTOR">CAP TRACTOR</option>
                        <option value="BASCULANTA">BASCULANTĂ</option>
                        <option value="EXCAVATOR">EXCAVATOR</option>
                        <option value="INCARCATOR_FRONTAL">ÎNCĂRCĂTOR FRONTAL</option>
                        <option value="AUTOUTILITARA">AUTOUTILITARĂ</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Marcă: *</label>
                  <input required value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="VOLVO / MAN / CAT" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Model: *</label>
                  <input required value={model} onChange={(e) => setModel(e.target.value)} placeholder="FMX 500 / CAT 330" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">An Fabricație:</label>
                  <input type="number" value={anFabricatie} onChange={(e) => setAnFabricatie(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Serie Șasiu (VIN):</label>
                  <input value={serieSasiu} onChange={(e) => setSerieSasiu(e.target.value)} placeholder="WMA123456789" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Măsurare Contor:</label>
                  <select value={tipMasurare} onChange={(e) => setTipMasurare(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                    <option value="KM">KM (Kilometri)</option>
                    <option value="MTH">MTH (Ore Funcționare)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Contor Curent:</label>
                  <input type="number" value={valoareContorCurent} onChange={(e) => setValoareContorCurent(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddVehiculModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Adaugă Vehicul în Flotă</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1.B: EDITARE VEHICUL */}
      {/* ========================================================================= */}
      {editingVehicul && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sapphire-500" />
                <span>Editare Date Vehicul ({editingVehicul.numarIntern})</span>
              </h3>
              <button onClick={() => setEditingVehicul(null)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdateVehicul} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Cod Intern: *</label>
                  <input required value={editingVehicul.numarIntern || ''} onChange={(e) => setEditingVehicul({ ...editingVehicul, numarIntern: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Nr. Înmatriculare: *</label>
                  <input required value={editingVehicul.numarInmatriculare || ''} onChange={(e) => setEditingVehicul({ ...editingVehicul, numarInmatriculare: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie Utilaj: *</label>
                  <select value={editingVehicul.categorieEnum || 'CAP_TRACTOR'} onChange={(e) => setEditingVehicul({ ...editingVehicul, categorieEnum: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                    {categoriiVehicul.map((c) => (
                      <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Marcă: *</label>
                  <input required value={editingVehicul.marca || ''} onChange={(e) => setEditingVehicul({ ...editingVehicul, marca: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Model: *</label>
                  <input required value={editingVehicul.model || ''} onChange={(e) => setEditingVehicul({ ...editingVehicul, model: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">An Fabricație:</label>
                  <input type="number" value={editingVehicul.anFabricatie || 2024} onChange={(e) => setEditingVehicul({ ...editingVehicul, anFabricatie: Number(e.target.value) })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Serie Șasiu (VIN):</label>
                  <input value={editingVehicul.serieSasiu || editingVehicul.vin || ''} onChange={(e) => setEditingVehicul({ ...editingVehicul, serieSasiu: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Măsurare Contor:</label>
                  <select value={editingVehicul.tipMasurare || 'KM'} onChange={(e) => setEditingVehicul({ ...editingVehicul, tipMasurare: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                    <option value="KM">KM (Kilometri)</option>
                    <option value="MTH">MTH (Ore Funcționare)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Contor Curent:</label>
                  <input type="number" value={editingVehicul.valoareContorCurent || 0} onChange={(e) => setEditingVehicul({ ...editingVehicul, valoareContorCurent: Number(e.target.value) })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setEditingVehicul(null)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Modificările</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1.C: CREARE CATEGORIE VEHICUL NOUĂ */}
      {/* ========================================================================= */}
      {showAddVehiculCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-periwinkle-700" />
                <span>Adăugare Categorie Nouă Vehicul / Utilaj</span>
              </h3>
              <button onClick={() => setShowAddVehiculCatModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateVehiculCategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume / Denumire Categorie Utilaj: *</label>
                <input required value={numeCatVehiculNou} onChange={(e) => setNumeCatVehiculNou(e.target.value)} placeholder="ex: MACARA, CISTERNA, GREIDER" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Categorie:</label>
                <input value={descriereCatVehiculNou} onChange={(e) => setDescriereCatVehiculNou(e.target.value)} placeholder="ex: Macara mobilă cu braț telescopic" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddVehiculCatModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Categorie Vehicul</button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* ========================================================================= */}
      {/* MODAL 1.E: GESTIUNE CENTRALIZATĂ CATEGORII VEHICULE & UTILAJE */}
      {/* ========================================================================= */}
      {showCatManagerModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-2xl space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-periwinkle-100 flex items-center justify-center text-periwinkle-700 shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-sapphire-900">Gestiune Categorii Flotă & Echipamente</h3>
                  <p className="text-xs text-sage-600">Configurarea categoriilor pentru clasificarea parcului auto și utilajelor</p>
                </div>
              </div>
              <button
                onClick={() => setShowCatManagerModal(false)}
                className="p-1.5 rounded-lg text-sage-500 hover:text-sapphire-900 hover:bg-morning-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formular Adăugare Categorie Nouă */}
            <form onSubmit={handleCreateVehiculCategorie} className="bg-morning-50 p-4 rounded-xl border border-morning-200 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-extrabold text-sapphire-900 uppercase tracking-wider">Adăugare Categorie Nouă</p>
                <span className="text-[10px] font-bold text-sage-600">Total: {categoriiVehicul.length} categorii</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-sage-700 block mb-1">Nume Categorie: *</label>
                  <input
                    required
                    value={numeCatVehiculNou}
                    onChange={(e) => setNumeCatVehiculNou(e.target.value)}
                    placeholder="ex: MACARA, CISTERNĂ, AUTOGREDER"
                    className="w-full bg-white border border-morning-200 rounded-xl px-3 py-2 text-xs font-bold text-sapphire-900 focus:outline-none focus:border-sapphire-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-sage-700 block mb-1">Descriere (opțional):</label>
                  <input
                    value={descriereCatVehiculNou}
                    onChange={(e) => setDescriereCatVehiculNou(e.target.value)}
                    placeholder="ex: Utilaj greu pentru terasamente"
                    className="w-full bg-white border border-morning-200 rounded-xl px-3 py-2 text-xs font-medium text-sapphire-900 focus:outline-none focus:border-sapphire-500 transition"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Salvează Categoria</span>
                </button>
              </div>
            </form>

            {/* Listă Categorii Existente */}
            <div className="space-y-2">
              <p className="text-xs font-extrabold text-sage-700 uppercase tracking-wider">
                Categorii Definite ({categoriiVehicul.length})
              </p>
              <div className="border border-morning-200 rounded-xl overflow-hidden divide-y divide-morning-200 max-h-64 overflow-y-auto">
                {categoriiVehicul.length === 0 ? (
                  <div className="p-6 text-center text-xs text-sage-500">Nu este definită nicio categorie.</div>
                ) : (
                  categoriiVehicul.map((c) => {
                    const count = vehicule.filter(v => (v.categorieEnum || '').toUpperCase() === c.nume.toUpperCase()).length;
                    const catColor = getCategoryColor(c.nume);
                    return (
                      <div key={c.id || c.nume} className="p-3 bg-white hover:bg-morning-50 flex items-center justify-between transition">
                        <div className="space-y-0.5 min-w-0 pr-3">
                          <div className="flex items-center space-x-2">
                            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${catColor.dot}`} />
                            <span className="font-extrabold text-sapphire-900 text-xs truncate">{c.nume}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border shrink-0 ${catColor.badge}`}>
                              {count} {count === 1 ? 'vehicul' : 'vehicule'}
                            </span>
                          </div>
                          {c.descriere && (
                            <p className="text-[11px] text-sage-600 truncate">{c.descriere}</p>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditVehiculCat(c)}
                            className="p-1.5 rounded-lg text-sapphire-600 hover:bg-sapphire-50 border border-transparent hover:border-sapphire-200 transition"
                            title="Editare Categorie"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVehiculCat(c.id, c.nume)}
                            className="p-1.5 rounded-lg text-terracotta-600 hover:bg-roseash-100 border border-transparent hover:border-roseash-200 transition"
                            title="Ștergere Categorie"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => setShowCatManagerModal(false)}
                className="px-5 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold text-xs hover:bg-morning-300 transition"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1.D: EDITARE CATEGORIE VEHICUL */}
      {/* ========================================================================= */}
      {editingVehiculCat && (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sapphire-500" />
                <span>Editare Categorie ({editingVehiculCat.nume})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingVehiculCat(null)}
                className="text-sage-500 hover:text-sapphire-900 p-1 rounded-lg hover:bg-morning-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVehiculCat} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume / Denumire Categorie: *</label>
                <input
                  required
                  value={editingVehiculCat.nume || ''}
                  onChange={(e) => setEditingVehiculCat({ ...editingVehiculCat, nume: e.target.value })}
                  placeholder="ex: CAP_TRACTOR, BASCULANTA"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Categorie:</label>
                <input
                  value={editingVehiculCat.descriere || ''}
                  onChange={(e) => setEditingVehiculCat({ ...editingVehiculCat, descriere: e.target.value })}
                  placeholder="ex: Cap Tractor, Basculantă..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setEditingVehiculCat(null)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20"
                >
                  Salvează Modificările
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADĂUGARE / EDITARE MECANIC */}
      {/* ========================================================================= */}
      {showAddMecanicModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-sapphire-500" />
                <span>{editingMecanic ? `Editare Mecanic (${editingMecanic.nume})` : 'Înregistrare Mecanic Nou în Atelier'}</span>
              </h3>
              <button onClick={() => { setShowAddMecanicModal(false); setEditingMecanic(null); }} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveMecanic} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume & Prenume Mecanic / Tehnician: *</label>
                <input required value={newMecanicNume} onChange={(e) => setNewMecanicNume(e.target.value)} placeholder="ex: Alexandru Popa" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Funcție / Specialitate: *</label>
                <select value={newMecanicFunctie} onChange={(e) => setNewMecanicFunctie(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                  <option value="Mecanic Șef">Mecanic Șef</option>
                  <option value="Mecanic Atelier">Mecanic Atelier</option>
                  <option value="Mecanic Utilaje Grele">Mecanic Utilaje Grele</option>
                  <option value="Electrician Auto">Electrician Auto</option>
                  <option value="Vulcanizator">Vulcanizator / Anvelope</option>
                  <option value="Tinichigiu">Tinichigiu / Carosier</option>
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Număr Telefon Contact:</label>
                <input value={newMecanicTelefon} onChange={(e) => setNewMecanicTelefon(e.target.value)} placeholder="ex: 0722111222" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => { setShowAddMecanicModal(false); setEditingMecanic(null); }} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">
                  {editingMecanic ? 'Salvează Modificările' : 'Salvează Mecanic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ADĂUGARE / EDITARE DEPOZIT NOU */}
      {/* ========================================================================= */}
      {showAddDepozitModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-sapphire-500" />
                <span>{editingDepozit ? 'Editare Depozit' : 'Creare Depozit Nou'}</span>
              </h3>
              <button onClick={() => setShowAddDepozitModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveDepozit} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume Depozit: *</label>
                <input required value={numeDepozitNou} onChange={(e) => setNumeDepozitNou(e.target.value)} placeholder="ex: Depozit Cluj Central / Depozit Piese 1" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Adresă / Locație Physicală:</label>
                <input value={adresaDepozitNou} onChange={(e) => setAdresaDepozitNou(e.target.value)} placeholder="ex: Str. Industrială nr. 12, Cluj-Napoca" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Responsabil Depozit:</label>
                <input value={responsabilDepozitNou} onChange={(e) => setResponsabilDepozitNou(e.target.value)} placeholder="ex: Ion Popescu - Șef Depozit" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddDepozitModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Depozit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREARE / EDITARE CATEGORIE STOC */}
      {/* ========================================================================= */}
      {showAddCatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-periwinkle-700" />
                <span>{editingCat ? `Editare Categorie (${editingCat.nume})` : 'Creează Categorie Nouă Stoc'}</span>
              </h3>
              <button onClick={() => { setShowAddCatModal(false); setEditingCat(null); }} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveCategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Categorie: *</label>
                <input required value={numeCategorieNoua} onChange={(e) => setNumeCategorieNoua(e.target.value)} placeholder="ex: Filtre, Uleiuri, Frâne" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Stoc Minim Implicit (Avertizare automată stoc redus):</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={stocMinimImplicitCat}
                  onChange={(e) => setStocMinimImplicitCat(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                />
                <p className="text-[11px] text-sage-500 mt-1">Valoarea minimă este 0. La salvare, acest prag se va sincroniza și pe articolele de stoc existente din această categorie.</p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Categorie:</label>
                <input value={descriereCatNoua} onChange={(e) => setDescriereCatNoua(e.target.value)} placeholder="Descriere scurtă opțională" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => { setShowAddCatModal(false); setEditingCat(null); }} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">
                  {editingCat ? 'Salvează Modificările' : 'Creează Categorie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CREARE / EDITARE SUBCATEGORIE STOC */}
      {/* ========================================================================= */}
      {showAddSubcatModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-periwinkle-700" />
                <span>{editingSubcat ? `Editare Subcategorie (${editingSubcat.nume})` : 'Adaugă Subcategorie Nouă'}</span>
              </h3>
              <button onClick={() => { setShowAddSubcatModal(false); setEditingSubcat(null); }} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveSubcategorie} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Categoria Părinte: *</label>
                <select value={targetCatForSubcat} onChange={(e) => setTargetCatForSubcat(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                  {categoriiPiese.map((c) => (
                    <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Subcategorie: *</label>
                <input required value={numeSubcatNoua} onChange={(e) => setNumeSubcatNoua(e.target.value)} placeholder="ex: Filtre Ulei, Filtre Aer, Plăcuțe Frână" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Subcategorie:</label>
                <input value={descriereSubcatNoua} onChange={(e) => setDescriereSubcatNoua(e.target.value)} placeholder="Descriere scurtă" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => { setShowAddSubcatModal(false); setEditingSubcat(null); }} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">
                  {editingSubcat ? 'Salvează Modificările' : 'Salvează Subcategorie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: REGULĂ MENTENANȚĂ NOUĂ / EDITARE */}
      {/* ========================================================================= */}
      {showAddRegulaModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-terracotta-600" />
                <span>{editingRegula ? 'Editare Regulă Mentenanță' : 'Adăugare Regulă Nouă de Mentenanță'}</span>
              </h3>
              <button onClick={() => setShowAddRegulaModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveRegula} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Operațiune: *</label>
                <input required value={regulaOperatiune} onChange={(e) => setRegulaOperatiune(e.target.value)} placeholder="ex: Schimb Ulei Motor, Suflare Filtru Aer" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie Utilaj:</label>
                  <select value={regulaCategorieUtilaj} onChange={(e) => setRegulaCategorieUtilaj(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                    <option value="TOATE">TOATE CATEGORIILE</option>
                    {categoriiVehicul.map((c) => (
                      <option key={c.id || c.nume} value={c.nume}>{c.nume}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Trigger:</label>
                  <select value={regulaTipTrigger} onChange={(e) => setRegulaTipTrigger(e.target.value as any)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                    <option value="KM">KM (Kilometri)</option>
                    <option value="MTH">MTH (Ore Funcționare)</option>
                    <option value="ZILE">ZILE (Zile Calendaristice)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Prag Valoare Maximă: *</label>
                  <input type="number" required value={regulaValoareMaxima} onChange={(e) => setRegulaValoareMaxima(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Avertizare În Prealabil Cu: *</label>
                  <input type="number" required value={regulaAvertizareInainte} onChange={(e) => setRegulaAvertizareInainte(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-terracotta-700 font-mono font-bold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddRegulaModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Regulă</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: CREARE / EDITARE UTILIZATOR */}
      {/* ========================================================================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-sapphire-500" />
                <span>{editingUser ? `Editare Utilizator (${editingUser.nume})` : 'Înregistrare Utilizator Nou'}</span>
              </h3>
              <button onClick={() => { setShowAddUserModal(false); setEditingUser(null); }} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Nume & Prenume: *</label>
                  <input
                    required
                    value={userNume}
                    onChange={(e) => setUserNume(e.target.value)}
                    placeholder="ex: Popescu Ion"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Nume Utilizator (Username): *</label>
                  <input
                    required
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    placeholder="ex: ion.popescu"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Funcție / Poziție:</label>
                  <input
                    value={userFunctie}
                    onChange={(e) => setUserFunctie(e.target.value)}
                    placeholder="ex: Dispecer Flotă, Șef Atelier"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                  />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Număr Telefon:</label>
                  <input
                    value={userTelefon}
                    onChange={(e) => setUserTelefon(e.target.value)}
                    placeholder="ex: 0722111222"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">
                    {editingUser ? 'Schimbă Parola (opțional):' : 'Parolă Acces: *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showUserPassword ? 'text' : 'password'}
                      required={!editingUser}
                      value={userParola}
                      onChange={(e) => setUserParola(e.target.value)}
                      placeholder="Introduceți parola"
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 pr-10 text-sapphire-900 font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPassword(!showUserPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sapphire-900"
                    >
                      {showUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">
                    {editingUser ? 'Confirmare Parolă Nouă:' : 'Confirmare Parolă: *'}
                  </label>
                  <div className="relative">
                    <input
                      type={showUserConfirmPassword ? 'text' : 'password'}
                      required={!editingUser || !!userParola}
                      value={userConfirmParola}
                      onChange={(e) => setUserConfirmParola(e.target.value)}
                      placeholder="Reintroduceți parola"
                      className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 pr-10 text-sapphire-900 font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserConfirmPassword(!showUserConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sapphire-900"
                    >
                      {showUserConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Rol & Nivel Drepturi: *</label>
                  <select
                    value={userRol}
                    disabled={!!(editingUser && (editingUser.rol === 'ADMIN' || editingUser.username === 'admin'))}
                    onChange={(e) => setUserRol(e.target.value as any)}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold disabled:opacity-60"
                  >
                    <option value="ADMIN">ADMIN - Administrare completă (Acces total)</option>
                    <option value="OPERATOR">OPERATOR - Editare operațională (Fără acces Setări)</option>
                    <option value="VIEWER">VIEWER - Numai citire (Modificări restricționate)</option>
                  </select>
                  {editingUser && (editingUser.rol === 'ADMIN' || editingUser.username === 'admin') && (
                    <p className="text-[10px] text-sapphire-700 font-bold mt-1">Cont de administrator permanent protejat.</p>
                  )}
                </div>
                <div className="pt-6">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="userActivCheck"
                      disabled={!!(editingUser && (editingUser.rol === 'ADMIN' || editingUser.username === 'admin'))}
                      checked={userActiv}
                      onChange={(e) => setUserActiv(e.target.checked)}
                      className="w-4 h-4 rounded text-sapphire-600 focus:ring-sapphire-500 disabled:opacity-60"
                    />
                    <label htmlFor="userActivCheck" className="text-sage-700 font-bold cursor-pointer">
                      Cont Activ (permite autentificarea în sistem)
                    </label>
                  </div>
                </div>
              </div>



              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => { setShowAddUserModal(false); setEditingUser(null); }}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold hover:bg-morning-300 transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20 transition"
                >
                  {editingUser ? 'Salvează Modificările' : 'Creează Utilizator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL RESETARE PAROLĂ (DOAR ADMIN) */}
      {resetPasswordUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl animate-scale-up">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-500" />
                <span>Resetare Parolă: {resetPasswordUser.nume}</span>
              </h3>
              <button
                onClick={() => setResetPasswordUser(null)}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-sage-600">
              Setați o nouă parolă pentru contul <strong className="text-sapphire-900">@{resetPasswordUser.username}</strong> ({resetPasswordUser.nume}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Noua Parolă: *</label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Introduceți noua parolă (min. 4 caractere)"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 pr-10 text-sapphire-900 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sapphire-900"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Confirmare Noua Parolă: *</label>
                <div className="relative">
                  <input
                    type={showResetConfirmPassword ? 'text' : 'password'}
                    required
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Reintroduceți noua parolă"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 pr-10 text-sapphire-900 font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sage-400 hover:text-sapphire-900"
                  >
                    {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setResetPasswordUser(null)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold hover:bg-morning-300 transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md transition"
                >
                  {resetLoading ? 'Se resetează...' : 'Resetează Parola'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: DETALII EVENIMENT AUDIT */}
      {/* ========================================================================= */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-xl space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <History className="w-5 h-5 text-sapphire-500" />
                <span>Detalii Înregistrare Audit #{selectedAuditLog.id.slice(0, 8)}</span>
              </h3>
              <button onClick={() => setSelectedAuditLog(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-morning-50 rounded-xl border border-morning-200">
                <div>
                  <span className="text-sage-500 font-bold block">Autor Modificare:</span>
                  <span className="font-extrabold text-sapphire-900 text-sm">{selectedAuditLog.userNume || 'Sistem'}</span>
                  <span className="text-sage-600 font-mono block text-[11px]">{selectedAuditLog.userEmail || '-'}</span>
                </div>
                <div>
                  <span className="text-sage-500 font-bold block">Rol Autor:</span>
                  <span className="font-black px-2 py-0.5 rounded text-[10px] uppercase bg-sapphire-100 text-sapphire-800">
                    {selectedAuditLog.userRol || 'OPERATOR'}
                  </span>
                  <span className="text-sage-500 block text-[11px] mt-1">Data: {new Date(selectedAuditLog.createdAt).toLocaleString('ro-RO')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-sage-500 font-bold block">Măsură / Acțiune:</span>
                  <span className="font-extrabold text-sapphire-900">{selectedAuditLog.actiune}</span>
                </div>
                <div>
                  <span className="text-sage-500 font-bold block">Modul Sistem:</span>
                  <span className="font-extrabold text-slate-800">{selectedAuditLog.modul}</span>
                </div>
              </div>

              {selectedAuditLog.entitateId && (
                <div>
                  <span className="text-sage-500 font-bold block">ID Entitate Afectată:</span>
                  <span className="font-mono text-sapphire-900 font-bold bg-morning-100 px-2 py-1 rounded block mt-0.5">
                    {selectedAuditLog.entitateId}
                  </span>
                </div>
              )}

              <div>
                <span className="text-sage-500 font-bold block mb-1">Date & Parametri Modificare:</span>
                <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto max-h-60 leading-relaxed whitespace-pre-wrap">
                  {selectedAuditLog.detalii || 'Fără detalii adiționale'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-morning-200">
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-bold text-xs"
              >
                Închide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: DOCUMENT VEHICUL NOU */}
      {/* ========================================================================= */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <FileText className="w-5 h-5 text-sapphire-500" />
                <span>{editingDoc ? 'Editare Document Vehicul' : 'Înregistrare Document Vehicul'}</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowAddDocModal(false);
                  setEditingDoc(null);
                }}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-3.5 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Vehicul: *</label>
                <select
                  value={docVehiculId}
                  onChange={(e) => setDocVehiculId(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                >
                  {vehicule.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.numarIntern || 'FĂRĂ COD'} ({v.numarInmatriculare || '-'}) — {v.categorieEnum}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sage-700 font-bold">Tip Document: *</label>
                  <button
                    type="button"
                    onClick={() => setShowAddTipModal(true)}
                    className="text-[11px] font-bold text-sapphire-600 hover:text-sapphire-800 flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Definește Tip Nou</span>
                  </button>
                </div>
                <select
                  value={docTip}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDocTip(val);
                    const tipObj = tipuriDocumente.find((t) => t.cod === val);
                    if (tipObj?.zileAvertizare) {
                      setDocZileAvertizare(tipObj.zileAvertizare);
                    }
                  }}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                >
                  {tipuriDocumente.map((t) => (
                    <option key={t.cod} value={t.cod}>
                      {t.cod} — {t.label || t.cod}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-sage-700 font-bold">Data Expirare: *</label>
                  <div className="flex items-center space-x-1 text-[11px]">
                    <span className="text-sage-500 mr-1">Preset rapid:</span>
                    <button
                      type="button"
                      onClick={() => setQuickDateDoc(6)}
                      className="px-2 py-0.5 rounded bg-morning-100 hover:bg-morning-200 border border-morning-200 font-bold text-sapphire-900 transition"
                    >
                      +6 Luni
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDateDoc(12)}
                      className="px-2 py-0.5 rounded bg-morning-100 hover:bg-morning-200 border border-morning-200 font-bold text-sapphire-900 transition"
                    >
                      +1 An
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickDateDoc(24)}
                      className="px-2 py-0.5 rounded bg-morning-100 hover:bg-morning-200 border border-morning-200 font-bold text-sapphire-900 transition"
                    >
                      +2 Ani
                    </button>
                  </div>
                </div>
                <input
                  type="date"
                  required
                  value={docDataExpirare}
                  onChange={(e) => setDocDataExpirare(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Notificare În Prealabil (Zile):</label>
                  <input
                    type="number"
                    min="1"
                    max="180"
                    value={docZileAvertizare}
                    onChange={(e) => setDocZileAvertizare(Number(e.target.value))}
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-terracotta-700 font-mono font-bold focus:outline-none focus:border-sapphire-500"
                  />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Serie / Număr Document:</label>
                  <input
                    value={docSerie}
                    onChange={(e) => setDocSerie(e.target.value)}
                    placeholder="ex: RO-981241"
                    className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Emitent / Asigurător (Opțional):</label>
                <input
                  value={docEmitent}
                  onChange={(e) => setDocEmitent(e.target.value)}
                  placeholder="ex: Groupama, Omniasig, RAR, CNAIR"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-morning-200">
                {editingDoc ? (
                  <button
                    type="button"
                    onClick={() => {
                      handleDeleteDoc(editingDoc.id);
                      setShowAddDocModal(false);
                      setEditingDoc(null);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-roseash-100 hover:bg-roseash-200 text-terracotta-700 font-bold flex items-center space-x-1.5 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Șterge Document</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddDocModal(false);
                      setEditingDoc(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold hover:bg-morning-300 transition"
                  >
                    Anulează
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20 transition"
                  >
                    {editingDoc ? 'Salvează Modificările' : 'Înregistrează Document'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7.5: TIP NOU DE DOCUMENT (NOMENCLATOR FLOTĂ) */}
      {/* ========================================================================= */}
      {showAddTipModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Layers className="w-5 h-5 text-sapphire-500" />
                <span>+ Tip Nou de Document (Nomenclator)</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddTipModal(false)}
                className="text-sage-500 hover:text-sapphire-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTipDocument} className="space-y-3.5 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">
                  Cod Unic Document (ex: AGREERE_ADR, POLITA_CMR): *
                </label>
                <input
                  required
                  value={newTipCod}
                  onChange={(e) =>
                    setNewTipCod(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_'))
                  }
                  placeholder="ex: AGREERE_ADR"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold uppercase focus:outline-none focus:border-sapphire-500"
                />
                <p className="text-[10px] text-sage-500 mt-1">
                  Se folosește drept identificator de coloană în matricea flotei.
                </p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Denumire Completă / Etichetă: *</label>
                <input
                  required
                  value={newTipLabel}
                  onChange={(e) => setNewTipLabel(e.target.value)}
                  placeholder="ex: Certificat Agreere ADR Transport Mărfuri Periculoase"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Preaviz Alertă Scadență (Zile):</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={newTipZile}
                  onChange={(e) => setNewTipZile(Number(e.target.value))}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-terracotta-700 font-mono font-bold focus:outline-none focus:border-sapphire-500"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere / Observații (Opțional):</label>
                <textarea
                  rows={2}
                  value={newTipDescriere}
                  onChange={(e) => setNewTipDescriere(e.target.value)}
                  placeholder="ex: Necesar doar pentru camioanele ce transportă mărfuri periculoase conform legii."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-morning-200">
                <button
                  type="button"
                  onClick={() => setShowAddTipModal(false)}
                  className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold hover:bg-morning-300 transition"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20 transition"
                >
                  Salvează Tip Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: ALERTĂ PERSONALIZATĂ NOUĂ */}
      {/* ========================================================================= */}
      {showAddCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-terracotta-500" />
                <span>Adăugare Alertă Personalizată / Licență Firmă</span>
              </h3>
              <button onClick={() => setShowAddCustomModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveCustomAlerta} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Titlu Alertă / Licență: *</label>
                <input required value={customTitlu} onChange={(e) => setCustomTitlu(e.target.value)} placeholder="ex: Licență Firmă Transport, Atestat Șofer Popescu" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Categorie:</label>
                  <select value={customCategorie} onChange={(e) => setCustomCategorie(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                    <option value="LICENTA_FIRMA">Licență Firmă</option>
                    <option value="ATESTAT_SOFER">Atestat Șofer</option>
                    <option value="AUTORIZATIE_MEDIU">Autorizație Mediu</option>
                    <option value="CUSTOM">Altă Alertă</option>
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Data Expirare: *</label>
                  <input type="date" required value={customDataExpirare} onChange={(e) => setCustomDataExpirare(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Notificare În Prealabil (Zile):</label>
                  <input type="number" value={customZileAvertizare} onChange={(e) => setCustomZileAvertizare(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-terracotta-700 font-mono font-bold" />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Responsabil:</label>
                  <input value={customResponsabil} onChange={(e) => setCustomResponsabil(e.target.value)} placeholder="ex: Brașoveanu Virgil" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddVehiculCatModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Creează Alertă</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SetariPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Se încarcă Setări Sistem...</div>}>
      <SetariContent />
    </Suspense>
  );
}
