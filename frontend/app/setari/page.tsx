"use client";

import { API_BASE_URL } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Settings, Save, Bell, FileText, ShieldAlert, Plus, Trash2, Edit3, CheckCircle2,
  Clock, Truck, RotateCcw, AlertTriangle, Calendar, Layers, ShieldCheck, Edit,
  Users, Building2, PackageCheck, Search, X, ChevronRight, UserCheck, Wrench,
  ArrowUpDown, ArrowUp, ArrowDown, Shield, Key, Eye, EyeOff, Lock, History, Filter, UserX, Check
} from 'lucide-react';
import { showConfirm } from '@/lib/swal';

function SetariContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const { user: authUser, isAdmin, isOperator, isViewer, canEdit, authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'vehicule' | 'mecanici' | 'depozite' | 'categorii' | 'reguli' | 'documente' | 'personalizate' | 'utilizatori' | 'audit'
  >('vehicule');

  // Ascultăm schimbarea tab-ului din URL / Sidebar (cu protecție strictă Admin pentru utilizatori și audit)
  useEffect(() => {
    if (tabParam && ['vehicule', 'mecanici', 'depozite', 'categorii', 'reguli', 'documente', 'personalizate', 'utilizatori', 'audit'].includes(tabParam)) {
      if ((tabParam === 'utilizatori' || tabParam === 'audit') && !isAdmin) {
        setActiveTab('vehicule');
      } else {
        setActiveTab(tabParam as any);
        if (tabParam === 'utilizatori') fetchUsers();
        if (tabParam === 'audit') fetchAuditLogs();
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
  // 6. STATE DOCUMENTE VEHICULE
  // ==========================================
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<any>(null);
  const [docVehiculId, setDocVehiculId] = useState('');
  const [docTip, setDocTip] = useState('ITP');
  const [docDataExpirare, setDocDataExpirare] = useState('');
  const [docZileAvertizare, setDocZileAvertizare] = useState(30);
  const [docSerie, setDocSerie] = useState('');
  const [docEmitent, setDocEmitent] = useState('');

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

      const resCust = await fetch(`${API_BASE_URL}/anomalii/alerte-personalizate`);
      if (resCust.ok) {
        const custList = await resCust.json();
        setAlertePersonalizate(Array.isArray(custList) ? custList : []);
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
    setEditingVehiculCat({ ...c });
  };

  const handleUpdateVehiculCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehiculCat) return;
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule/categorii/${editingVehiculCat.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: editingVehiculCat.nume,
          descriere: editingVehiculCat.descriere,
        }),
      });

      if (res.ok) {
        alert(` Categoria "${editingVehiculCat.nume}" a fost actualizată!`);
        setEditingVehiculCat(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
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
      const res = await fetch(`${API_BASE_URL}/vehicule/categorii/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        alert(`Categoria "${nume}" a fost ștearsă. Vehiculele asignate au fost marcate ca "Nealocat".`);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
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
    setStocMinimImplicitCat(c.stocMinimImplicit || 5);
    setShowAddCatModal(true);
  };

  const handleSaveCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numeCategorieNoua.trim()) {
      alert('Vă rugăm introduceți numele categoriei!');
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
          stocMinimImplicit: Number(stocMinimImplicitCat),
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
    setTargetCatForSubcat(catNume || (categorii[0]?.nume || ''));
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

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categorieNume: targetCatForSubcat,
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

  const openAddDoc = () => {
    setEditingDoc(null);
    setDocTip('ITP');
    setDocDataExpirare('');
    setDocZileAvertizare(30);
    setDocSerie('');
    setDocEmitent('');
    setShowAddDocModal(true);
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
        alert('Document salvat cu succes!');
        setShowAddDocModal(false);
        fetchData();
      }
    } catch (e) {
      alert('Eroare la salvarea documentului.');
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
          <span>Categorii Stoc Piese ({categorii.length})</span>
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
              return (
                <button
                  key={c.id || c.nume}
                  onClick={() => setSelectedCatFilter(isSelected ? 'TOATE' : c.nume)}
                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 ${
                    isSelected
                      ? 'bg-sapphire-500 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-morning-200 hover:bg-morning-100 hover:text-sapphire-900'
                  }`}
                >
                  <span>{c.nume}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-morning-200 text-sage-700'
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
                        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-sapphire-900 text-white font-mono font-black text-xs shadow-2xs">
                          <Truck className="w-3.5 h-3.5 text-sapphire-300" />
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
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-sapphire-100 text-sapphire-900 border border-sapphire-200 inline-block">
                          {v.categorieEnum || 'Nealocat'}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categorii.map((c: any) => (
              <div key={c.id || c.nume} className="pleasant-card p-5 rounded-2xl border border-morning-200 space-y-3 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between border-b border-morning-200 pb-2">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-5 h-5 text-periwinkle-700" />
                    <h4 className="font-extrabold text-sapphire-900 text-base">{c.nume}</h4>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-morning-200 text-sapphire-900">
                      Stoc Min: {c.stocMinimImplicit || 5} buc
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
      {/* TAB 6: DOCUMENTE VEHICULE */}
      {/* ========================================================================= */}
      {activeTab === 'documente' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-morning-200 shadow-xs">
            <div>
              <h3 className="font-extrabold text-sapphire-900 text-base">Evidență Documente Vehicule (ITP, RCA, Rovinietă)</h3>
              <p className="text-xs text-sage-700">Monitorizarea scadențelor pentru actele vehiculelor</p>
            </div>
            <button
              onClick={openAddDoc}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white text-xs font-bold shadow-md shadow-sapphire-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Adaugă Document Vehicul</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-morning-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-xs min-w-[850px]">
              <thead>
                <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider">
                  <th className="p-3">Vehicul</th>
                  <th className="p-3">Tip Document</th>
                  <th className="p-3">Data Expirare</th>
                  <th className="p-3">Notificare (Zile Înainte)</th>
                  <th className="p-3">Serie / Emitent</th>
                  <th className="p-3 text-right">Acțiuni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-morning-200 font-medium text-slate-700">
                {documente.map((d) => (
                  <tr key={d.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-extrabold text-sapphire-900 font-mono">
                      {d.vehicul?.numarIntern || d.vehiculId} ({d.vehicul?.numarInmatriculare || ''})
                    </td>
                    <td className="p-3 font-bold text-slate-800">{d.tipDocument}</td>
                    <td className="p-3 font-mono font-bold text-terracotta-700">
                      {new Date(d.dataExpirare).toLocaleDateString('ro-RO')}
                    </td>
                    <td className="p-3 font-mono text-sage-700 font-bold">{d.zileAvertizareInainte} zile</td>
                    <td className="p-3 text-sage-600">{d.serieDocument || d.emitent || '-'}</td>
                    <td className="p-3 text-right space-x-2">
                      <button onClick={() => handleDeleteDoc(d.id)} className="p-1.5 text-terracotta-600 hover:bg-roseash-100 rounded-lg">
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
              <button
                onClick={fetchAuditLogs}
                className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 text-sapphire-900 text-xs font-bold border border-morning-200 transition"
              >
                <RotateCcw className={`w-4 h-4 text-sapphire-600 ${auditLoading ? 'animate-spin' : ''}`} />
                <span>Reîmprospătează Jurnal</span>
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

              <div className="flex items-center space-x-2 overflow-x-auto text-xs font-bold">
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

          {/* Tabel Jurnal Audit */}
          <div className="bg-white rounded-2xl border border-morning-200 overflow-x-auto shadow-xs">
            <table className="w-full text-left border-collapse text-xs min-w-[900px]">
              <thead>
                <tr className="bg-morning-100 border-b border-morning-200 text-sage-700 font-extrabold uppercase tracking-wider">
                  <th className="p-3">Dată & Oră</th>
                  <th className="p-3">Utilizator / Autor</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Acțiune</th>
                  <th className="p-3">Modul</th>
                  <th className="p-3">Detalii Modificare</th>
                  <th className="p-3 text-right">Inspecție</th>
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
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-lg bg-sapphire-100 text-sapphire-800 font-black text-xs flex items-center justify-center">
                              {log.userNume ? log.userNume.charAt(0) : 'U'}
                            </div>
                            <div>
                              <p className="font-extrabold text-sapphire-900 leading-tight">{log.userNume || 'Sistem'}</p>
                              <p className="text-[10px] text-sage-500 font-mono">{log.userEmail || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
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
                        <td className="p-3">
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
                        <td className="p-3 font-extrabold text-slate-800 text-[11px]">{log.modul}</td>
                        <td className="p-3 text-[11px] text-slate-700 max-w-xs truncate" title={log.detalii || ''}>
                          {log.detalii || '-'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="px-2.5 py-1 rounded-lg bg-morning-100 hover:bg-sapphire-50 hover:text-sapphire-600 text-slate-700 font-extrabold text-[11px] transition"
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
        </div>
      ))}

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
      {/* MODAL 1.D: EDITARE CATEGORIE VEHICUL */}
      {/* ========================================================================= */}
      {editingVehiculCat && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-sapphire-500" />
                <span>Editare Categorie Vehicul ({editingVehiculCat.nume})</span>
              </h3>
              <button onClick={() => setEditingVehiculCat(null)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleUpdateVehiculCat} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume / Denumire Categorie: *</label>
                <input
                  required
                  value={editingVehiculCat.nume || ''}
                  onChange={(e) => setEditingVehiculCat({ ...editingVehiculCat, nume: e.target.value })}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Descriere Categorie:</label>
                <input
                  value={editingVehiculCat.descriere || ''}
                  onChange={(e) => setEditingVehiculCat({ ...editingVehiculCat, descriere: e.target.value })}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setEditingVehiculCat(null)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Modificările</button>
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
                    return (
                      <div key={c.id || c.nume} className="p-3 bg-white hover:bg-morning-50 flex items-center justify-between transition">
                        <div className="space-y-0.5 min-w-0 pr-3">
                          <div className="flex items-center space-x-2">
                            <span className="font-extrabold text-sapphire-900 text-xs truncate">{c.nume}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sapphire-100 text-sapphire-900 border border-sapphire-200 shrink-0">
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
                <label className="text-sage-700 block mb-1 font-bold">Stoc Minim Implicit (Avertizare automat):</label>
                <input type="number" value={stocMinimImplicitCat} onChange={(e) => setStocMinimImplicitCat(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold" />
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
                  {categorii.map((c) => (
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
                <span>Adăugare Document Vehicul (ITP, RCA, Rovinietă)</span>
              </h3>
              <button onClick={() => setShowAddDocModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Selectează Vehicul: *</label>
                <select value={docVehiculId} onChange={(e) => setDocVehiculId(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                  {vehicule.map((v) => (
                    <option key={v.id} value={v.id}>{v.numarIntern} ({v.numarInmatriculare})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Tip Document: *</label>
                  <select value={docTip} onChange={(e) => setDocTip(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold">
                    <option value="ITP">ITP (Inspecție Tehnică Periodic)</option>
                    <option value="RCA">RCA (Asigurare Obligatorie)</option>
                    <option value="ROVINIETA">Rovinietă (Ttaxă Drum)</option>
                    <option value="COPIE_CONFORMA">Copie Conformă Transport</option>
                    <option value="VERIFICARE_TAHOGRAF">Verificare Tahograf</option>
                  </select>
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Data Expirare: *</label>
                  <input type="date" required value={docDataExpirare} onChange={(e) => setDocDataExpirare(e.target.value)} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Notificare În Prealabil Cu (Zile):</label>
                  <input type="number" value={docZileAvertizare} onChange={(e) => setDocZileAvertizare(Number(e.target.value))} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-terracotta-700 font-mono font-bold" />
                </div>

                <div>
                  <label className="text-sage-700 block mb-1 font-bold">Serie Document:</label>
                  <input value={docSerie} onChange={(e) => setDocSerie(e.target.value)} placeholder="ex: RO-981241" className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddDocModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Document</button>
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
