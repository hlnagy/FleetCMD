"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Truck, AlertTriangle, Droplets, AlertCircle, Plus, CheckCircle2, RefreshCw,
  Filter, Edit3, Trash2, Clock, DollarSign, TrendingUp, ShieldAlert, ArrowUpRight, Wrench, X, Calendar, Layers, UserCheck, Users, Search, Phone, Settings
} from 'lucide-react';

export default function DashboardPage() {
  const [vehicule, setVehicule] = useState<any[]>([]);
  const [alerteScurgeri, setAlerteScurgeri] = useState<any[]>([]);
  const [selectedCategorieFilter, setSelectedCategorieFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Stare Mecanici & Registru Servicii per Mecanic
  const [mecanici, setMecanici] = useState<any[]>([]);
  const [istoricServicii, setIstoricServicii] = useState<any[]>([]);
  const [selectedMecanicFilter, setSelectedMecanicFilter] = useState('');
  const [selectedTipServiciuFilter, setSelectedTipServiciuFilter] = useState('');
  const [searchQueryServicii, setSearchQueryServicii] = useState('');

  // Modal Înregistrare Mecanic Nou
  const [showAddMecanicModal, setShowAddMecanicModal] = useState(false);
  const [newMecanicNume, setNewMecanicNume] = useState('');
  const [newMecanicFunctie, setNewMecanicFunctie] = useState('Mecanic Atelier');
  const [newMecanicTelefon, setNewMecanicTelefon] = useState('');

  // Modal State Editare Vehicul
  const [editingVehicul, setEditingVehicul] = useState<any>(null);

  // Form State Categorie Noua
  const [showAddCatModal, setShowAddCatModal] = useState(false);
  const [numeCategorie, setNumeCategorie] = useState('');
  const [descriereCategorie, setDescriereCategorie] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const url = selectedCategorieFilter
        ? `http://localhost:3001/vehicule?categorie=${selectedCategorieFilter}`
        : 'http://localhost:3001/vehicule';
      const resVeh = await fetch(url);
      if (resVeh.ok) setVehicule(await resVeh.json());

      const resAlert = await fetch('http://localhost:3001/anomalii/alerte');
      if (resAlert.ok) setAlerteScurgeri(await resAlert.json());

      fetchMecanici();
      fetchIstoricServicii();
    } catch (e) {
      console.log('Fără conexiune backend live. Afișare date demo.', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMecanici = async () => {
    try {
      const res = await fetch('http://localhost:3001/mentenanta/mecanici');
      if (res.ok) setMecanici(await res.json());
    } catch (e) {
      console.log('Error fetching mecanici', e);
    }
  };

  const fetchIstoricServicii = async (mecNume?: string) => {
    try {
      const url = mecNume
        ? `http://localhost:3001/mentenanta/istoric-servicii-mecanic?mecanic=${encodeURIComponent(mecNume)}`
        : 'http://localhost:3001/mentenanta/istoric-servicii-mecanic';
      const res = await fetch(url);
      if (res.ok) setIstoricServicii(await res.json());
    } catch (e) {
      console.log('Error fetching istoric servicii mecanic', e);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [selectedCategorieFilter]);

  useEffect(() => {
    fetchIstoricServicii(selectedMecanicFilter);
  }, [selectedMecanicFilter]);

  const handleCreateMecanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMecanicNume) return;
    try {
      const res = await fetch('http://localhost:3001/mentenanta/mecanici', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nume: newMecanicNume,
          functie: newMecanicFunctie,
          telefon: newMecanicTelefon,
        }),
      });

      if (res.ok) {
        alert('✅ Mecanic înregistrat cu succes în echipa atelierului!');
        setShowAddMecanicModal(false);
        setNewMecanicNume('');
        setNewMecanicFunctie('Mecanic Atelier');
        setNewMecanicTelefon('');
        fetchMecanici();
      } else {
        const err = await res.json();
        alert(`Eroare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la înregistrarea mecanicui.');
    }
  };

  const handleUpdateVehicul = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicul) return;
    try {
      const res = await fetch(`http://localhost:3001/vehicule/${editingVehicul.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingVehicul),
      });
      if (res.ok) {
        setEditingVehicul(null);
        fetchDashboard();
        alert('Vehicul actualizat cu succes!');
      } else {
        const err = await res.json();
        alert(`Eroare la actualizare: ${err.message}`);
      }
    } catch (e) {
      alert('Eroare la actualizarea vehiculului.');
    }
  };

  const handleDeleteVehicul = async (id: string) => {
    if (!confirm('Sigur doriți să ștergeți acest vehicul?')) return;
    try {
      const res = await fetch(`http://localhost:3001/vehicule/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDashboard();
        alert('Vehicul șters din sistem.');
      }
    } catch (e) {
      alert('Eroare la ștergerea vehiculului.');
    }
  };

  const handleCreateCategorie = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3001/vehicule/categorii', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nume: numeCategorie, descriere: descriereCategorie }),
      });
      if (res.ok) {
        setShowAddCatModal(false);
        setNumeCategorie('');
        setDescriereCategorie('');
        alert('Categorie nouă creată cu succes!');
      }
    } catch (e) {
      alert('Eroare la crearea categoriei.');
    }
  };

  // Filtrare Servicii Mecanic
  const serviciiFiltrate = istoricServicii.filter((s) => {
    const matchTip = selectedTipServiciuFilter ? s.tip === selectedTipServiciuFilter : true;
    if (searchQueryServicii) {
      const q = searchQueryServicii.toLowerCase();
      const mMec = s.mecanic?.toLowerCase().includes(q);
      const mTitlu = s.titlu?.toLowerCase().includes(q);
      const mVeh = s.vehicul?.toLowerCase().includes(q);
      const mDet = s.detalii?.toLowerCase().includes(q);
      return matchTip && (mMec || mTitlu || mVeh || mDet);
    }
    return matchTip;
  });

  const totalVehicule = vehicule.length;

  return (
    <div className="space-y-6">
      {/* Header Titlu & Acțiuni */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight">Dashboard Principal & Management Atelier</h1>
          <p className="text-xs text-sage-700 font-medium">Sumar operațiuni, evidență mecanici și istoric servicii per mecanic | FleetCMD</p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/setari"
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-morning-100 border border-morning-200 text-xs font-semibold text-sapphire-900 shadow-xs transition"
          >
            <Settings className="w-4 h-4 text-sapphire-500" />
            <span>Setări Sistem</span>
          </Link>
        </div>
      </div>

      {/* KPI STATISTICI PRINCIPALE */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sage-700 tracking-wider">Vehicule Active</p>
            <p className="text-3xl font-black text-sapphire-900 font-mono mt-1">{totalVehicule}</p>
            <p className="text-[11px] text-sage-600 font-semibold mt-0.5">în flota operativă</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sapphire-50 border border-sapphire-200 flex items-center justify-center text-sapphire-600 shadow-2xs">
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center justify-between border-l-4 border-l-terracotta-500">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-terracotta-600 tracking-wider">Alerte Active</p>
            <p className="text-3xl font-black text-terracotta-600 font-mono mt-1">{alerteScurgeri.length}</p>
            <p className="text-[11px] text-sage-600 font-semibold mt-0.5">anomalii ulei / scurgeri</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-roseash-100 border border-roseash-300 flex items-center justify-center text-terracotta-600 shadow-2xs">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-periwinkle-700 tracking-wider">Echipă Atelier</p>
            <p className="text-3xl font-black text-periwinkle-700 font-mono mt-1">{mecanici.length}</p>
            <p className="text-[11px] text-sage-600 font-semibold mt-0.5">mecanici & tehnicieni</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-periwinkle-100 border border-periwinkle-200 flex items-center justify-center text-periwinkle-700 shadow-2xs">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="pleasant-card pleasant-card-hover p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-extrabold text-sage-700 tracking-wider">Total Servicii Executate</p>
            <p className="text-3xl font-black text-sapphire-900 font-mono mt-1">{istoricServicii.length}</p>
            <p className="text-[11px] text-sage-600 font-semibold mt-0.5">reparații, uleiuri, rotiri</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-morning-100 border border-morning-200 flex items-center justify-center text-sapphire-600 shadow-2xs">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SECTIUNEA 1: ECHIPĂ ATELIER & MUNCĂ REGISTRATĂ PER MECANIC */}
      <div className="pleasant-card p-6 rounded-2xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-morning-200 pb-4">
          <div>
            <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-sapphire-500" />
              <span>Echipa Atelier & Registru Servicii per Mecanic (Evidență Activitate Mecanici)</span>
            </h2>
            <p className="text-xs text-sage-700 font-medium">Toate lucrările (reparații, schimburi anvelope, dopări ulei) sunt asociate muncii efectuate de mecanic</p>
          </div>
        </div>

        {/* GRID MECANICI REGISTRAȚI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {mecanici.map((m: any) => {
            const isSelected = selectedMecanicFilter === m.nume;
            return (
              <div
                key={m.id}
                onClick={() => setSelectedMecanicFilter(isSelected ? '' : m.nume)}
                className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                  isSelected
                    ? 'bg-sapphire-50 border-2 border-sapphire-500 shadow-md'
                    : 'bg-white border-morning-200 hover:border-sapphire-300 hover:bg-morning-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sapphire-900 text-xs block">{m.nume}</span>
                  <span className="px-2 py-0.5 rounded-full bg-sapphire-100 text-sapphire-800 text-[10px] font-mono font-bold">
                    {m.totalLucrari || 0} lucrări
                  </span>
                </div>
                <p className="text-[11px] text-sage-600 font-medium mt-1">{m.functie || 'Mecanic Atelier'}</p>
                {m.telefon && (
                  <p className="text-[10px] font-mono text-sage-500 mt-1 flex items-center space-x-1">
                    <Phone className="w-3 h-3 text-sage-400 inline" />
                    <span>{m.telefon}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* FILTRE & CAUTARE ISTORIC MUNCĂ PER MECANIC */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 bg-morning-100 rounded-2xl border border-morning-200">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
            <input
              type="text"
              value={searchQueryServicii}
              onChange={(e) => setSearchQueryServicii(e.target.value)}
              placeholder="Căutare după mecanic, utilaj, titlu lucrare sau filtru..."
              className="w-full bg-white border border-morning-200 rounded-xl pl-9 pr-4 py-2 text-xs text-sapphire-900 font-bold focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <select
              value={selectedMecanicFilter}
              onChange={(e) => setSelectedMecanicFilter(e.target.value)}
              className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
            >
              <option value="">Toți Mecanicii ({istoricServicii.length} servicii total)</option>
              {mecanici.map((m) => (
                <option key={m.id} value={m.nume}>👨‍🔧 {m.nume} ({m.totalLucrari || 0} lucrări)</option>
              ))}
            </select>

            <select
              value={selectedTipServiciuFilter}
              onChange={(e) => setSelectedTipServiciuFilter(e.target.value)}
              className="bg-white border border-morning-200 rounded-xl p-2 text-sapphire-900 font-bold focus:outline-none cursor-pointer"
            >
              <option value="">Toate Tipurile de Lucrări</option>
              <option value="COMANDA_LUCRU">🛠️ Comenzi de Lucru / Reparații</option>
              <option value="SCHIMB_ULEI">🛢️ Schimb Complet Ulei</option>
              <option value="COMPLETARE_ULEI">💧 Completare / Dopare Ulei</option>
              <option value="ROTIRE_ANVELOPA">🛞 Rotiri & Permutări Anvelope</option>
              <option value="MASURARE_PROFIL">📏 Măsurători Profil Anvelope</option>
            </select>
          </div>
        </div>

        {/* TABELA CENTRALIZATĂ ISTORIC SERVICII */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
              <tr>
                <th className="p-3">Data Operare</th>
                <th className="p-3">Mecanic Executant</th>
                <th className="p-3">Tip Serviciu & Titlu</th>
                <th className="p-3">Utilaj / Vehicul</th>
                <th className="p-3">Detalii Execuție / Odometer</th>
                <th className="p-3 text-right">Cost Total (RON)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-morning-200">
              {serviciiFiltrate.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-sage-500 font-medium">
                    Nu s-a găsit nicio lucrare pentru criteriile de căutare selectate.
                  </td>
                </tr>
              ) : (
                serviciiFiltrate.map((s: any) => (
                  <tr key={s.id} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-mono text-sage-700">
                      {new Date(s.data).toLocaleDateString('ro-RO')}
                      <span className="text-[10px] text-sage-400 block">{new Date(s.data).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="p-3 font-extrabold text-sapphire-900">
                      <span className="px-2.5 py-1 rounded-lg bg-sapphire-50 border border-sapphire-200 text-sapphire-800 text-[11px] inline-block">
                        👨‍🔧 {s.mecanic}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold mr-2 ${
                        s.tip === 'COMANDA_LUCRU' ? 'bg-periwinkle-100 text-periwinkle-900 border border-periwinkle-300' :
                        s.tip === 'SCHIMB_ULEI' ? 'bg-roseash-200 text-terracotta-800 border border-terracotta-300' :
                        s.tip === 'COMPLETARE_ULEI' ? 'bg-morning-200 text-sapphire-900' :
                        'bg-sage-100 text-sage-900 border border-sage-300'
                      }`}>
                        {s.tip?.replace(/_/g, ' ')}
                      </span>
                      {s.titlu}
                    </td>
                    <td className="p-3 font-bold text-sapphire-900">{s.vehicul}</td>
                    <td className="p-3 text-sage-700 font-medium">{s.detalii}</td>
                    <td className="p-3 font-mono font-extrabold text-right text-sapphire-900">
                      {s.costTotal ? `${s.costTotal} RON` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTIUNEA 2: REGISTRU VEHICULE */}
      <div className="pleasant-card p-6 rounded-2xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-sapphire-900">Registrul Vehiculelor (Fișă Tehnică Dedicată per Utilaj)</h2>
            <p className="text-xs text-sage-700">Gestionare de la preluare contor inițial până la istoricul complet al costurilor</p>
          </div>

          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-sage-500" />
            <select
              value={selectedCategorieFilter}
              onChange={(e) => setSelectedCategorieFilter(e.target.value)}
              className="bg-morning-100 border border-morning-200 rounded-xl px-3 py-1.5 text-xs text-sapphire-900 font-bold focus:outline-none"
            >
              <option value="">Toate Categoriile</option>
              <option value="CAP_TRACTOR">Cap Tractor</option>
              <option value="REMORCA">Remorcă / Semiremorcă</option>
              <option value="BASCULANTA">Basculantă</option>
              <option value="EXCAVATOR">Excavator</option>
              <option value="INCARCATOR_FRONTAL">Încărcător Frontal</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
              <tr>
                <th className="p-3">Utilaj / Număr Intern</th>
                <th className="p-3">Înmatriculare / VIN</th>
                <th className="p-3">Categorie & Configurație Axe</th>
                <th className="p-3 font-mono">Contor Curent</th>
                <th className="p-3 font-mono">Contor Inițial & Dată</th>
                <th className="p-3 text-right">Acțiuni Management</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-morning-200">
              {vehicule.map((v) => (
                <tr key={v.id} className="hover:bg-morning-50 transition">
                  <td className="p-3 font-extrabold text-sapphire-900">
                    <Link href={`/fisa-tehnica?id=${v.id}`} className="hover:text-sapphire-500 transition">
                      {v.numarIntern}
                    </Link>
                    <div className="text-[10px] text-sage-600 font-normal">{v.marca} {v.model} ({v.anFabricatie})</div>
                  </td>
                  <td className="p-3 font-semibold text-slate-800">
                    {v.numarInmatriculare}
                    <div className="text-[10px] font-mono text-sage-500">{v.serieSasiu || v.vin || '-'}</div>
                  </td>
                  <td className="p-3">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-morning-200 text-sapphire-900 border border-morning-300">
                      {v.categorieEnum}
                    </span>
                    <p className="text-[10px] text-sage-600 mt-1 font-semibold">
                      {v.pozitiiAxe?.length || 4} Roți montate pe șasiu
                    </p>
                  </td>
                  <td className="p-3 font-mono font-bold text-sapphire-900">
                    {v.valoareContorCurent} {v.tipMasurare}
                  </td>
                  <td className="p-3 font-mono text-sage-700">
                    {v.valoareContorInitial || 0} {v.tipMasurare}
                    <div className="text-[10px] text-sage-500 font-normal">
                      {v.dataInregistrareContor ? new Date(v.dataInregistrareContor).toLocaleDateString('ro-RO') : '-'}
                    </div>
                  </td>
                  <td className="p-3 text-right space-x-2">
                    <Link
                      href={`/fisa-tehnica?id=${v.id}`}
                      className="px-3 py-1.5 rounded-lg bg-sapphire-500 text-white text-xs font-bold transition hover:bg-sapphire-600 shadow-xs inline-block"
                    >
                      Fișă Tehnică
                    </Link>
                    <button
                      onClick={() => handleDeleteVehicul(v.id)}
                      className="px-3 py-1.5 rounded-lg bg-roseash-200 hover:bg-roseash-300 text-terracotta-600 text-xs font-bold transition"
                    >
                      Șterge
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL ADĂUGARE MECANIC NOU */}
      {showAddMecanicModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <h3 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
                <Users className="w-5 h-5 text-sapphire-500" />
                <span>Înregistrare Mecanic Nou în Atelier</span>
              </h3>
              <button onClick={() => setShowAddMecanicModal(false)} className="text-sage-500 hover:text-sapphire-900"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleCreateMecanic} className="space-y-3 text-xs">
              <div>
                <label className="text-sage-700 block mb-1 font-bold">Nume & Prenume Mecanic / Tehnician: *</label>
                <input
                  required
                  value={newMecanicNume}
                  onChange={(e) => setNewMecanicNume(e.target.value)}
                  placeholder="ex: Alexandru Popa (Atelier)"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                />
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Funcție / Specialitate: *</label>
                <select
                  value={newMecanicFunctie}
                  onChange={(e) => setNewMecanicFunctie(e.target.value)}
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-bold"
                >
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
                <input
                  value={newMecanicTelefon}
                  onChange={(e) => setNewMecanicTelefon(e.target.value)}
                  placeholder="ex: 0722111222"
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2.5 text-sapphire-900 font-mono font-bold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-morning-200">
                <button type="button" onClick={() => setShowAddMecanicModal(false)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Mecanic</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITARE VEHICUL */}
      {editingVehicul && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-lg space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Editare Vehicul ({editingVehicul.numarIntern})</h3>
              <button onClick={() => setEditingVehicul(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateVehicul} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sage-700 block mb-1 font-semibold">Număr Intern</label>
                  <input required value={editingVehicul.numarIntern} onChange={(e) => setEditingVehicul({ ...editingVehicul, numarIntern: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-semibold" />
                </div>
                <div>
                  <label className="text-sage-700 block mb-1 font-semibold">Număr Înmatriculare</label>
                  <input value={editingVehicul.numarInmatriculare || ''} onChange={(e) => setEditingVehicul({ ...editingVehicul, numarInmatriculare: e.target.value })} className="w-full bg-morning-100 border border-morning-200 rounded-xl p-2 text-sapphire-900 font-semibold" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setEditingVehicul(null)} className="px-4 py-2 rounded-xl bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-5 py-2.5 rounded-xl bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează Modificări</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
