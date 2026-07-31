"use client";

import { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle2, Droplets, CircleDot, Clock, X } from 'lucide-react';

export default function AlertePage() {
  const [alerteScurgeri, setAlerteScurgeri] = useState<any[]>([]);
  const [selectedAlerta, setSelectedAlerta] = useState<any>(null);
  const [solutie, setSolutie] = useState('');

  const fetchAlerte = async () => {
    try {
      const res = await fetch('http://localhost:3001/anomalii/alerte');
      if (res.ok) setAlerteScurgeri(await res.json());
    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchAlerte();
  }, []);

  const handleRezolvaAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAlerta) return;

    try {
      const res = await fetch(`http://localhost:3001/anomalii/alerte/${selectedAlerta.id}/rezolva`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solutie }),
      });

      if (res.ok) {
        alert('Alertă rezolvată și eliminată din lista activă!');
        setSelectedAlerta(null);
        setSolutie('');
        fetchAlerte();
      }
    } catch (e) {
      alert('Eroare la rezolvarea alertei.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <ShieldAlert className="w-6 h-6 text-terracotta-500" />
            <span>Alerte Active Flotă & Anomalii de Exploatare</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Toate avertismentele active: Scurgeri ulei, aliniere axă și rezolvare intervenții</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Alerte Scurgeri */}
        <div className="pleasant-card p-6 rounded-2xl space-y-3 border-l-4 border-l-terracotta-500">
          <h2 className="text-base font-bold text-terracotta-600 flex items-center space-x-2">
            <Droplets className="w-5 h-5 text-terracotta-500" />
            <span>Alerte Scurgeri Ulei & Consum Anormal</span>
          </h2>

          {alerteScurgeri.length > 0 ? (
            alerteScurgeri.map((a) => (
              <div key={a.id} className="p-4 bg-roseash-100 border border-roseash-300 rounded-xl flex items-center justify-between text-xs text-sapphire-900 shadow-xs">
                <div>
                  <p className="font-bold text-terracotta-600">{a.vehicul}</p>
                  <p className="mt-1 font-medium">{a.mesaj}</p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-white text-terracotta-600 font-mono font-extrabold rounded-lg border border-roseash-300">
                    {a.cantitateLitri} L
                  </span>
                  <button
                    onClick={() => setSelectedAlerta(a)}
                    className="px-3 py-1 bg-sapphire-500 hover:bg-sapphire-600 text-white font-bold text-xs rounded-lg shadow-sm"
                  >
                    Marchează ca Rezolvat
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 bg-sage-100 border border-sage-300 rounded-xl text-xs text-sage-700 font-bold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-sage-500" />
              <span>Nu există alerte active de scurgeri de ulei în flotă! Totul este în parametri optimi.</span>
            </div>
          )}
        </div>

        {/* Alerte Geometrie */}
        <div className="pleasant-card p-6 rounded-2xl space-y-3 border-l-4 border-l-periwinkle-500">
          <h2 className="text-base font-bold text-periwinkle-700 flex items-center space-x-2">
            <CircleDot className="w-5 h-5 text-periwinkle-700" />
            <span>Avertismente Aliniere Axă & Geometrie Direcție</span>
          </h2>
          <div className="p-4 bg-periwinkle-100 border border-periwinkle-300 rounded-xl text-xs text-sapphire-900 font-medium flex items-center justify-between">
            <span>Alertă Geometrie Axa 1 (MAN 8x4): Risc de aliniere incorectă / direcție defectuoasă între T1-SS (14.0mm) și T1-DS (9.0mm). Diferență uzură &gt; 30%!</span>
            <button
              onClick={() => alert('Constatare geometrie înregistrată. Vizitați meniul Anvelope.')}
              className="px-3 py-1 bg-periwinkle-700 hover:bg-periwinkle-800 text-white font-bold text-xs rounded-lg ml-4 shrink-0 shadow-sm"
            >
              Rezolvă Geometrie
            </button>
          </div>
        </div>

        {/* Alerte Revizii Depășite */}
        <div className="pleasant-card p-6 rounded-2xl space-y-3 border-l-4 border-l-sage-500">
          <h2 className="text-base font-bold text-sage-700 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-sage-700" />
            <span>Sarcini Mentenanță Depășite</span>
          </h2>
          <div className="p-4 bg-morning-100 border border-morning-200 rounded-xl text-xs text-sapphire-900 font-medium">
            Suflare Filtru Aer & Gresare Articulații (UTIL-01 Volvo A40G) – Depășit cu 50 mTH!
          </div>
        </div>
      </div>

      {/* Modal Rezolvare Alertă Scurgere cu X button */}
      {selectedAlerta && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedAlerta(null)}>
          <div className="pleasant-card p-6 rounded-2xl w-full max-w-md space-y-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-sapphire-900">Rezolvare Alertă Scurgere Ulei</h3>
              <button onClick={() => setSelectedAlerta(null)} className="text-sage-500 hover:text-sapphire-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRezolvaAlerta} className="space-y-3 text-xs">
              <div className="p-3 bg-roseash-100 border border-roseash-300 rounded-xl">
                <p className="font-bold text-terracotta-600">{selectedAlerta.vehicul}</p>
                <p className="text-slate-800 font-medium">{selectedAlerta.mesaj}</p>
              </div>

              <div>
                <label className="text-sage-700 block mb-1 font-bold">Soluție Reclamare / Reparație Efectuată:</label>
                <textarea
                  required
                  rows={3}
                  value={solutie}
                  onChange={(e) => setSolutie(e.target.value)}
                  placeholder="ex: Furtun hidraulic înlocuit pe șantier, strâns garnitură baie ulei"
                  className="w-full bg-morning-100 border border-morning-200 rounded-lg p-2.5 text-sapphire-900 font-semibold"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={() => setSelectedAlerta(null)} className="px-4 py-2 rounded-lg bg-morning-200 text-slate-700 font-semibold">Anulează</button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-sapphire-500 text-white font-bold shadow-md shadow-sapphire-500/20">Salvează & Închide Alertă</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
