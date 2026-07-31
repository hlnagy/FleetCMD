"use client";

import { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, DollarSign, PieChart, Layers, BarChart2 } from 'lucide-react';

export default function RapoartePage() {
  const [tcoBrands, setTcoBrands] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:3001/anvelope/comparatie-tco')
      .then((res) => res.json())
      .then((data) => setTcoBrands(data))
      .catch((e) => console.log(e));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-sapphire-900 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-6 h-6 text-sapphire-500" />
            <span>Rapoarte & Analitică Flotă (TCO)</span>
          </h1>
          <p className="text-xs text-sage-700 font-medium">Analize TCO, comparații mărci piese/anvelope și structura celor 4 piloni</p>
        </div>
      </div>

      {/* KPI Cards Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="pleasant-card p-5 rounded-2xl border-sapphire-100 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sapphire-600">Cheltuieli Totale Flotă</span>
            <DollarSign className="w-5 h-5 text-sapphire-500" />
          </div>
          <p className="text-3xl font-extrabold text-sapphire-900 font-mono">4.290 RON</p>
          <p className="text-[11px] text-sage-700 font-medium mt-1">Toate intervențiile și piesele înregistrate</p>
        </div>

        <div className="pleasant-card p-5 rounded-2xl border-periwinkle-300 bg-periwinkle-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-periwinkle-700">Cost Mediu / 1000 KM</span>
            <Layers className="w-5 h-5 text-periwinkle-700" />
          </div>
          <p className="text-3xl font-extrabold text-periwinkle-700 font-mono">30.1 RON</p>
          <p className="text-[11px] text-sage-700 font-medium mt-1">Cost exploatare la 1.000 KM parcurși</p>
        </div>

        <div className="pleasant-card p-5 rounded-2xl border-roseash-300 bg-roseash-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-terracotta-600">Cost Mediu / 10 Ore Marș</span>
            <TrendingUp className="w-5 h-5 text-terracotta-500" />
          </div>
          <p className="text-3xl font-extrabold text-terracotta-600 font-mono">8.85 RON</p>
          <p className="text-[11px] text-sage-700 font-medium mt-1">Cost exploatare la 10 Ore Funcționare (mTH)</p>
        </div>
      </div>

      {/* Comparație Randament Anvelope Márkák szerint */}
      <div className="pleasant-card rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-bold text-sapphire-900 flex items-center space-x-2">
          <BarChart2 className="w-5 h-5 text-sapphire-500" />
          <span>Analiză Comparativă Mărci Anvelope (Cost / 1000 KM)</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-morning-100 text-sage-700 uppercase text-[10px] tracking-wider font-bold border-b border-morning-200">
              <tr>
                <th className="p-3">Marcă Anvelopă</th>
                <th className="p-3">Număr Anvelope în Flotă</th>
                <th className="p-3">Cost Mediu Achiziție</th>
                <th className="p-3">Rulaj Mediu Estimat (KM)</th>
                <th className="p-3 font-mono text-right">TCO (Cost / 1000 KM)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-morning-200">
              {tcoBrands.length > 0 ? (
                tcoBrands.map((b, idx) => (
                  <tr key={idx} className="hover:bg-morning-50 transition">
                    <td className="p-3 font-extrabold text-sapphire-900">{b.marca}</td>
                    <td className="p-3 font-semibold">{b.numarAnvelope} buc</td>
                    <td className="p-3 font-semibold">{b.costMediuAchizitie} RON</td>
                    <td className="p-3 font-mono font-bold text-sage-700">{(b.rulajMediuKm || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} km</td>
                    <td className="p-3 text-right font-extrabold text-sapphire-600 font-mono text-sm">
                      {b.tcoPer1000Km} RON
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  <tr className="hover:bg-morning-50">
                    <td className="p-3 font-extrabold text-sapphire-900">MICHELIN</td>
                    <td className="p-3 font-semibold">12 buc</td>
                    <td className="p-3 font-semibold">2.400 RON</td>
                    <td className="p-3 font-mono font-bold text-sage-700">85.000 km</td>
                    <td className="p-3 text-right font-extrabold text-sapphire-600 font-mono text-sm">28.2 RON</td>
                  </tr>
                  <tr className="hover:bg-morning-50">
                    <td className="p-3 font-extrabold text-sapphire-900">BRIDGESTONE</td>
                    <td className="p-3 font-semibold">8 buc</td>
                    <td className="p-3 font-semibold">2.100 RON</td>
                    <td className="p-3 font-mono font-bold text-sage-700">70.000 km</td>
                    <td className="p-3 text-right font-extrabold text-sapphire-600 font-mono text-sm">30.0 RON</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
