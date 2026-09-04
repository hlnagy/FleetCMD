"use client";

import { API_BASE_URL } from '@/lib/api';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Truck, Search, ChevronDown, Check, X } from 'lucide-react';

export interface VehicleData {
  id: string;
  numarIntern: string;
  numarInmatriculare: string;
  marca: string;
  model: string;
  categorieEnum: string;
  tipMasurare: string;
  valoareContorCurent: number;
  valoareContorInitial?: number;
  anFabricatie?: number;
  [key: string]: any;
}

interface VehicleSelectorProps {
  /** Called when a vehicle is selected. Receives the full vehicle object. */
  onSelect: (vehicul: VehicleData) => void;
  /** Currently selected vehicle ID (controlled externally) */
  selectedId?: string;
  /** Optional: pre-fetched vehicle list. If not provided, the component fetches its own list. */
  vehicule?: VehicleData[];
  /** Optional: callback after vehicles are fetched (if the parent wants access to the list) */
  onVehiculeFetched?: (vehicule: VehicleData[]) => void;
}

export default function VehicleSelector({ onSelect, selectedId, vehicule: externalVehicule, onVehiculeFetched }: VehicleSelectorProps) {
  const [internalVehicule, setInternalVehicule] = useState<VehicleData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Use external list if provided, otherwise fetch internally
  const vehicule = externalVehicule || internalVehicule;

  const fetchVehicule = useCallback(async () => {
    if (externalVehicule) return; // Don't fetch if parent supplies the list
    try {
      const res = await fetch(`${API_BASE_URL}/vehicule`);
      if (res.ok) {
        const data = await res.json();
        setInternalVehicule(data);
        onVehiculeFetched?.(data);
        // Auto-select first vehicle if none selected
        if (!selectedId && data.length > 0) {
          onSelect(data[0]);
        }
      }
    } catch (e) {
      console.log('VehicleSelector: Eroare la încărcarea vehiculelor', e);
    }
  }, [externalVehicule, selectedId]);

  useEffect(() => {
    fetchVehicule();
  }, []);

  // Auto-select first vehicle when external list is provided and no selection
  useEffect(() => {
    if (externalVehicule && externalVehicule.length > 0 && !selectedId) {
      onSelect(externalVehicule[0]);
    }
  }, [externalVehicule]);

  // Focus search when modal opens
  useEffect(() => {
    if (showModal) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
      setSelectedCatFilter('');
    }
  }, [showModal]);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showModal) {
        setShowModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showModal]);

  const currentVehicul = vehicule.find((v) => v.id === selectedId);

  const categoriiDisponibile = Array.from(new Set(vehicule.map((v) => v.categorieEnum).filter(Boolean)));

  const vehiculeFiltrate = vehicule.filter((v) => {
    const matchCat = selectedCatFilter ? v.categorieEnum === selectedCatFilter : true;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        v.numarIntern?.toLowerCase().includes(q) ||
        v.numarInmatriculare?.toLowerCase().includes(q) ||
        v.marca?.toLowerCase().includes(q) ||
        v.model?.toLowerCase().includes(q);
      return matchCat && matchSearch;
    }
    return matchCat;
  });

  const handleSelect = (v: VehicleData) => {
    onSelect(v);
    setShowModal(false);
  };

  return (
    <>
      {/* ─── COMPACT 1-LINE ACTIVE VEHICLE BAR ─── */}
      <div className="pleasant-card p-3 rounded-2xl bg-white border border-morning-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-sapphire-500 text-white flex items-center justify-center font-extrabold shadow-sm flex-shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-sm text-sapphire-900 font-mono truncate">
                {currentVehicul?.numarIntern || '— SELECTAȚI UTILAJ —'}
              </span>
              {currentVehicul && (
                <span className="px-2 py-0.5 rounded-full bg-sapphire-50 border border-sapphire-100 text-sapphire-600 text-[10px] font-extrabold uppercase flex-shrink-0">
                  {currentVehicul.categorieEnum}
                </span>
              )}
            </div>
            {currentVehicul ? (
              <p className="text-xs text-sage-700 font-bold truncate">
                {currentVehicul.numarInmatriculare} · {currentVehicul.marca} {currentVehicul.model} · Contor:{' '}
                <span className="font-mono text-sapphire-900">
                  {currentVehicul.valoareContorCurent || 0} {currentVehicul.tipMasurare || 'KM'}
                </span>
              </p>
            ) : (
              <p className="text-xs text-sage-500 font-medium">Selectați un utilaj din flotă</p>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-morning-100 hover:bg-morning-200 border border-morning-300 text-xs font-extrabold text-sapphire-900 shadow-xs transition flex-shrink-0"
        >
          <Search className="w-4 h-4 text-sapphire-500" />
          <span>Schimbă Utilaj ({vehicule.length})</span>
          <ChevronDown className="w-4 h-4 text-sage-500 ml-1" />
        </button>
      </div>

      {/* ─── FLEET PICKER MODAL ─── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="pleasant-card bg-white border border-morning-200 p-6 rounded-2xl w-full max-w-2xl space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-morning-200 pb-3">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-sapphire-500" />
                <h3 className="text-lg font-bold text-sapphire-900">
                  Selectare Utilaj din Flotă ({vehicule.length} Vehicule)
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-sage-500 hover:text-sapphire-900 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search + Category Filters */}
            <div className="space-y-2">
              <div className="relative text-xs">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sage-500" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tastați numărul intern, nr. înmatriculare sau marca..."
                  className="w-full bg-morning-100 border border-morning-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-sapphire-900 font-bold focus:outline-none focus:border-sapphire-500 focus:ring-1 focus:ring-sapphire-500/30 transition"
                />
              </div>

              {categoriiDisponibile.length > 1 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setSelectedCatFilter('')}
                    className={`px-3 py-1 rounded-lg font-bold text-[11px] transition whitespace-nowrap ${
                      selectedCatFilter === ''
                        ? 'bg-sapphire-500 text-white'
                        : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
                    }`}
                  >
                    Toate ({vehicule.length})
                  </button>
                  {categoriiDisponibile.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCatFilter(cat)}
                      className={`px-3 py-1 rounded-lg font-bold text-[11px] transition whitespace-nowrap ${
                        selectedCatFilter === cat
                          ? 'bg-sapphire-500 text-white'
                          : 'bg-morning-100 text-slate-700 hover:bg-morning-200'
                      }`}
                    >
                      {cat} ({vehicule.filter((v) => v.categorieEnum === cat).length})
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {vehiculeFiltrate.length === 0 && (
                <div className="text-center py-8 text-sage-500 text-sm font-medium">
                  Niciun utilaj găsit pentru căutarea „{searchQuery}"
                </div>
              )}
              {vehiculeFiltrate.map((v) => {
                const isSelected = v.id === selectedId;
                return (
                  <div
                    key={v.id}
                    onClick={() => handleSelect(v)}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isSelected
                        ? 'bg-sapphire-50 border-sapphire-300 ring-1 ring-sapphire-200'
                        : 'bg-white hover:bg-morning-50 border-morning-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                          isSelected ? 'bg-sapphire-500 text-white' : 'bg-morning-200 text-sapphire-900'
                        }`}
                      >
                        {v.numarIntern?.substring(0, 4)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-xs text-sapphire-900 font-mono">{v.numarIntern}</span>
                          <span className="px-2 py-0.5 rounded text-[9px] font-extrabold bg-morning-200 text-sage-700 flex-shrink-0">
                            {v.categorieEnum}
                          </span>
                        </div>
                        <p className="text-[11px] text-sage-700 font-medium truncate">
                          {v.numarInmatriculare} · {v.marca} {v.model}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-right flex-shrink-0">
                      <div className="text-xs font-mono">
                        <p className="font-bold text-sapphire-900">
                          {v.valoareContorCurent} {v.tipMasurare}
                        </p>
                        <p className="text-[10px] text-sage-500">Contor curent</p>
                      </div>

                      {isSelected ? (
                        <span className="p-1 rounded-full bg-sapphire-500 text-white">
                          <Check className="w-4 h-4" />
                        </span>
                      ) : (
                        <ChevronDown className="w-4 h-4 text-sage-400 -rotate-90" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
