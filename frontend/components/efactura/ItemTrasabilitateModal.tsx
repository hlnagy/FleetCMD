"use client";

import { useEffect, useState } from 'react';
import {
  X,
  Building2,
  Wrench,
  CircleDot,
  Package,
  ArrowRight,
  ExternalLink,
  Truck,
  Calendar,
  Layers,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { API_BASE_URL } from '@/lib/api';
import { getLabelPozitie } from '@/lib/tirePositions';
import { useTabWorkspace } from '@/lib/TabWorkspaceContext';

export interface ItemTrasabilitateModalProps {
  itemId: string;
  onClose: () => void;
}

export default function ItemTrasabilitateModal({ itemId, onClose }: ItemTrasabilitateModalProps) {
  const { openTab } = useTabWorkspace();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/efactura/items/${itemId}/trasabilitate`)
      .then(async (res) => {
        if (!res.ok) {
          const msg = await res.text();
          throw new Error(msg || 'Nu s-a putut încărca locația articolului.');
        }
        return res.json();
      })
      .then((json) => {
        if (active) setData(json);
      })
      .catch((err) => {
        if (active) setError(err?.message || 'Eroare la încărcarea datelor.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      active = false;
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [itemId, onClose]);

  const item = data?.item;
  const factura = data?.factura;
  const articolStoc = data?.articolStoc;
  const comandaLucruDirecta = data?.comandaLucruDirecta;
  const comenziLucruConsum: any[] = data?.comenziLucruConsum || [];
  const anvelope: any[] = data?.anvelope || [];
  const transferuri: any[] = data?.transferuri || [];

  const handleOpenInTab = (id: string, title: string, href: string, iconName: string) => {
    openTab({ id, title, href, iconName });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl bg-white dark:bg-[#111D28] border-2 border-sapphire-300 dark:border-sapphire-700 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-4 bg-morning-100 dark:bg-[#162535] border-b border-morning-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <Package className="w-5 h-5 text-sapphire-600 shrink-0" />
              <h3 className="text-sm sm:text-base font-extrabold text-sapphire-900 truncate">
                Locație &amp; Trasabilitate Articol
                {item?.descrierePiesa ? ` — ${item.descrierePiesa}` : ''}
              </h3>
            </div>
            {factura && item && (
              <p className="text-xs text-sage-700 font-medium mt-1">
                Factura <strong className="font-mono text-sapphire-900">{factura.numarFactura}</strong> • {factura.numeVanzator} •{' '}
                <span className="font-mono font-bold">
                  {item.cantitate} {item.unitateMasura} × {Number(item.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                </span>
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/80 hover:bg-morning-200 border border-morning-300 text-slate-700 transition cursor-pointer shrink-0"
            title="Închide și revino la factură (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-5 overflow-y-auto space-y-5 text-xs">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-sage-600 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-sapphire-500" />
              <span className="font-semibold">Se încarcă locația curentă a piesei...</span>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* 1. DEVIZ DE LUCRU DIRECT (alocat direct pe mașină) */}
              {comandaLucruDirecta && (
                <div className="rounded-2xl border border-sapphire-200 bg-sapphire-50/60 dark:bg-sapphire-950/30 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <Wrench className="w-4 h-4 text-sapphire-600" />
                      <span className="font-extrabold text-sapphire-900 uppercase tracking-wide text-[11px]">
                        Deviz de Lucru (Montat Direct pe Utilaj)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenInTab(
                          '/comenzi-lucru',
                          `Deviz: ${comandaLucruDirecta.numarComanda}`,
                          '/comenzi-lucru',
                          'Wrench'
                        )
                      }
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      <span>Deschide modulul Comenzi de Lucru</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111D28] border border-morning-200">
                      <div className="text-[10px] font-bold uppercase text-sage-600">Nr. Comandă</div>
                      <div className="font-mono font-extrabold text-sapphire-900 mt-0.5">{comandaLucruDirecta.numarComanda}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111D28] border border-morning-200">
                      <div className="text-[10px] font-bold uppercase text-sage-600">Utilaj / Vehicul</div>
                      <div className="font-extrabold text-sapphire-900 mt-0.5 flex items-center space-x-1">
                        <Truck className="w-3.5 h-3.5 text-sapphire-500 shrink-0" />
                        <span>{comandaLucruDirecta.vehicul?.numarIntern || '—'}</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111D28] border border-morning-200">
                      <div className="text-[10px] font-bold uppercase text-sage-600">Stare Deviz</div>
                      <div className="font-extrabold text-emerald-700 mt-0.5">{comandaLucruDirecta.stare}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111D28] border border-morning-200">
                      <div className="text-[10px] font-bold uppercase text-sage-600">Dată Deschidere</div>
                      <div className="font-mono font-bold text-sapphire-900 mt-0.5">
                        {comandaLucruDirecta.dataDeschidere
                          ? new Date(comandaLucruDirecta.dataDeschidere).toLocaleDateString('ro-RO')
                          : '—'}
                      </div>
                    </div>
                  </div>

                  {comandaLucruDirecta.descriereLucrari && (
                    <div className="text-[11px] text-slate-700 bg-white/80 dark:bg-[#111D28] px-3 py-2 rounded-xl border border-morning-200">
                      <span className="font-bold text-sage-700">Lucrare: </span>
                      {comandaLucruDirecta.descriereLucrari}
                    </div>
                  )}

                  {comandaLucruDirecta.elemente?.length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-morning-200 bg-white dark:bg-[#111D28]">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-morning-100 text-sage-700 uppercase text-[10px] font-extrabold border-b border-morning-200">
                            <th className="p-2">Piesă / Serviciu în Deviz</th>
                            <th className="p-2 text-right">Cant.</th>
                            <th className="p-2 text-right">Preț Unitar</th>
                            <th className="p-2 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-200">
                          {comandaLucruDirecta.elemente.map((el: any) => (
                            <tr key={el.id}>
                              <td className="p-2 font-bold text-sapphire-900">{el.descriere}</td>
                              <td className="p-2 text-right font-mono">{el.cantitate}</td>
                              <td className="p-2 text-right font-mono">{Number(el.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                              <td className="p-2 text-right font-mono font-extrabold text-sapphire-900">{Number(el.subtotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 2. STOC / DEPOZIT + LOTURI FIFO */}
              {articolStoc && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-emerald-600" />
                      <span className="font-extrabold text-sapphire-900 uppercase tracking-wide text-[11px]">
                        Stoc Curent în Depozit &amp; Loturi FIFO
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenInTab(
                          '/stocuri',
                          `Stoc: ${articolStoc.denumire}`,
                          `/stocuri?tab=stocuri&search=${encodeURIComponent(articolStoc.codArticol || articolStoc.denumire)}`,
                          'Package'
                        )
                      }
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      <span>Deschide în Depozite</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111D28] border border-morning-200">
                      <div className="text-[10px] font-bold uppercase text-sage-600">Depozit Curent</div>
                      <div className="font-extrabold text-sapphire-900 mt-0.5">{articolStoc.depozit?.nume || 'Depozit Central'}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111D28] border border-morning-200">
                      <div className="text-[10px] font-bold uppercase text-sage-600">Cod &amp; Categorie</div>
                      <div className="font-mono font-bold text-sapphire-900 mt-0.5 truncate" title={articolStoc.codArticol}>
                        {articolStoc.codArticol}
                      </div>
                      <div className="text-[10px] text-sage-600">{articolStoc.categorie}{articolStoc.subcategorie ? ` • ${articolStoc.subcategorie}` : ''}</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111D28] border border-morning-200">
                      <div className="text-[10px] font-bold uppercase text-sage-600">Stoc Disponibil</div>
                      <div className="font-mono font-black text-base text-emerald-700 mt-0.5">
                        {Number(articolStoc.stocCurent || 0).toLocaleString('ro-RO', { maximumFractionDigits: 2 })} {articolStoc.unitateMasura}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-[#111D28] border border-morning-200">
                      <div className="text-[10px] font-bold uppercase text-sage-600">Preț Mediu / Unitar</div>
                      <div className="font-mono font-extrabold text-sapphire-900 mt-0.5">
                        {Number(articolStoc.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} RON
                      </div>
                    </div>
                  </div>

                  {articolStoc.intrariStoc?.filter((l: any) => Number(l.cantitateRamasa ?? l.cantitateIntrata) > 0.001).length > 0 && (
                    <div className="overflow-x-auto rounded-xl border border-morning-200 bg-white dark:bg-[#111D28]">
                      <table className="w-full text-left border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-morning-100 text-sage-700 uppercase text-[10px] font-extrabold border-b border-morning-200">
                            <th className="p-2">Dată</th>
                            <th className="p-2">Nr. Factură &amp; Furnizor</th>
                            <th className="p-2 text-right">Intrat</th>
                            <th className="p-2 text-right">Rămas FIFO</th>
                            <th className="p-2 text-right">Preț Unitar</th>
                            <th className="p-2">Observații Lot</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-morning-200">
                          {articolStoc.intrariStoc
                            .filter((l: any) => Number(l.cantitateRamasa ?? l.cantitateIntrata) > 0.001)
                            .map((lot: any) => {
                            const isThisInvoice = lot.numarFactura === factura?.numarFactura;
                            return (
                              <tr
                                key={lot.id}
                                className={isThisInvoice ? 'bg-emerald-50/90 dark:bg-emerald-950/40 font-semibold' : ''}
                              >
                                <td className="p-2 font-mono whitespace-nowrap">
                                  {lot.dataFactura ? new Date(lot.dataFactura).toLocaleDateString('ro-RO') : '—'}
                                </td>
                                <td className="p-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono font-extrabold text-sapphire-900">{lot.numarFactura || '—'}</span>
                                    {isThisInvoice && (
                                      <span className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-extrabold uppercase">
                                        Această Factură
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-sage-600">{lot.furnizor}</div>
                                </td>
                                <td className="p-2 text-right font-mono">{lot.cantitateIntrata} {articolStoc.unitateMasura}</td>
                                <td className="p-2 text-right font-mono font-extrabold text-emerald-700">
                                  {Number(lot.cantitateRamasa ?? lot.cantitateIntrata).toLocaleString('ro-RO', { maximumFractionDigits: 2 })} {articolStoc.unitateMasura}
                                </td>
                                <td className="p-2 text-right font-mono">{Number(lot.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                                <td className="p-2 text-[10px] text-sage-700 max-w-[220px] break-words">{lot.observatii || '—'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 3. CONSUMURI PE DEVIZE DE LUCRU DIN ACEST ARTICOL STOC */}
              {comenziLucruConsum.length > 0 && (
                <div className="rounded-2xl border border-morning-200 bg-morning-50 p-4 space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <Wrench className="w-4 h-4 text-sapphire-600" />
                    <span className="font-extrabold text-sapphire-900 uppercase tracking-wide text-[11px]">
                      Devize de Lucru unde s-a consumat acest articol ({comenziLucruConsum.length})
                    </span>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-morning-200 bg-white dark:bg-[#111D28]">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-morning-100 text-sage-700 uppercase text-[10px] font-extrabold border-b border-morning-200">
                          <th className="p-2">Comandă</th>
                          <th className="p-2">Utilaj</th>
                          <th className="p-2">Dată</th>
                          <th className="p-2">Stare</th>
                          <th className="p-2 text-right">Cantitate</th>
                          <th className="p-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-200">
                        {comenziLucruConsum.map((c: any) => (
                          <tr key={c.id}>
                            <td className="p-2 font-mono font-extrabold text-sapphire-900">{c.comandaLucru?.numarComanda || '—'}</td>
                            <td className="p-2 font-bold text-sapphire-900">{c.comandaLucru?.vehicul?.numarIntern || '—'}</td>
                            <td className="p-2 font-mono">
                              {c.comandaLucru?.dataDeschidere ? new Date(c.comandaLucru.dataDeschidere).toLocaleDateString('ro-RO') : '—'}
                            </td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sapphire-50 text-sapphire-800 border border-sapphire-200">
                                {c.comandaLucru?.stare || '—'}
                              </span>
                            </td>
                            <td className="p-2 text-right font-mono font-bold">{c.cantitate}</td>
                            <td className="p-2 text-right font-mono font-extrabold text-sapphire-900">
                              {Number(c.subtotal || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 4. ANVELOPE SERIALIZATE */}
              {anvelope.length > 0 && (
                <div className="rounded-2xl border border-sapphire-200 bg-sapphire-50/40 dark:bg-sapphire-950/20 p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center space-x-2">
                      <CircleDot className="w-4 h-4 text-sapphire-600" />
                      <span className="font-extrabold text-sapphire-900 uppercase tracking-wide text-[11px]">
                        Anvelope Serializate din Factură ({anvelope.length} buc)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleOpenInTab('/anvelope', 'Anvelope', '/anvelope', 'CircleDot')}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-sapphire-600 hover:bg-sapphire-700 text-white font-bold text-[11px] transition cursor-pointer"
                    >
                      <span>Deschide Modul Anvelope</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-xl border border-morning-200 bg-white dark:bg-[#111D28]">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="bg-morning-100 text-sage-700 uppercase text-[10px] font-extrabold border-b border-morning-200">
                          <th className="p-2">Serie (SN)</th>
                          <th className="p-2">Marcă &amp; Dimensiune</th>
                          <th className="p-2">Locație Actuală</th>
                          <th className="p-2 text-right">Preț</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-morning-200">
                        {anvelope.map((anv: any) => (
                          <tr key={anv.id}>
                            <td className="p-2 font-mono font-extrabold text-sapphire-900">{anv.serieAnvelopa}</td>
                            <td className="p-2 font-bold text-slate-800">{anv.marca} {anv.dimensiune}</td>
                            <td className="p-2">
                              {anv.stare === 'MONTATA' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sapphire-100 text-sapphire-800 border border-sapphire-200">
                                  MONTATĂ • {anv.vehicul?.numarIntern || ''} {anv.pozitieAx ? `(${getLabelPozitie(anv.pozitieAx).titlu})` : ''}
                                </span>
                              ) : anv.stare === 'IN_STOC' ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  ÎN STOC • {anv.depozit?.nume || 'Magazie Anvelope'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                  {anv.stare}
                                </span>
                              )}
                            </td>
                            <td className="p-2 text-right font-mono">{Number(anv.pretAchizitie || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2 })} RON</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 5. TRANSFERURI ÎNTRE DEPOZITE */}
              {transferuri.length > 0 && (
                <div className="rounded-2xl border border-morning-200 bg-morning-50 p-4 space-y-2">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-sage-700" />
                    <span className="font-extrabold text-sapphire-900 uppercase tracking-wide text-[11px]">
                      Transferuri Recente între Depozite ({transferuri.length})
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {transferuri.map((tr: any) => (
                      <div key={tr.id} className="flex items-center justify-between gap-2 bg-white dark:bg-[#111D28] px-3 py-2 rounded-xl border border-morning-200 text-[11px]">
                        <div className="flex items-center space-x-1.5 font-semibold text-sapphire-900">
                          <Calendar className="w-3 h-3 text-sage-500" />
                          <span className="font-mono text-sage-700">{new Date(tr.dataTransfer).toLocaleDateString('ro-RO')}</span>
                          <span>{tr.depozitSursa?.nume || 'Sursă'}</span>
                          <ArrowRight className="w-3 h-3 text-sapphire-500" />
                          <span>{tr.depozitDestinatie?.nume || 'Destinație'}</span>
                        </div>
                        <span className="font-mono font-extrabold text-sapphire-900">{tr.cantitate} {articolStoc?.unitateMasura || 'buc'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!articolStoc && !comandaLucruDirecta && anvelope.length === 0 && (
                <div className="p-6 rounded-2xl border border-morning-200 bg-morning-50 text-center text-sage-700 font-semibold">
                  Această linie nu are un articol activ legat în stoc, deviz de lucru sau magazie anvelope
                  {item?.observatiiIntern ? ` (${item.observatiiIntern})` : ''}.
                </div>
              )}
            </>
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 bg-morning-100 dark:bg-[#162535] border-t border-morning-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sapphire-600 hover:bg-sapphire-700 text-white text-xs font-extrabold transition cursor-pointer"
          >
            Închide (Înapoi la Factură)
          </button>
        </div>
      </div>
    </div>
  );
}
