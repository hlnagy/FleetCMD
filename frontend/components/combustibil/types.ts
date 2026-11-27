import { API_BASE_URL } from '@/lib/api';

export interface CombustibilGestiune {
  id: number;
  nume: string;
  codPunctLucru?: string | null;
  tipCombustibil: string;
  capacitateBazin: number;
  compCount?: number;
  vehCount?: number;
  trCount?: number;
}

export interface DashboardCompanyStock {
  id: number;
  nume: string;
  cui?: string | null;
  codProdus?: string | null;
  color: string;
  colorHex: string;
  initial: number;
  refill: number;
  consumed: number;
  current: number;
  threshold: number;
  isLowStock: boolean;
  transCount: number;
  lastUpdate: string | null;
}

export interface CombustibilDashboardData {
  gestiune: CombustibilGestiune;
  tankCapacity: number;
  totalStock: number;
  freeSpace: number;
  totalPercent: number;
  displayPercent: number;
  isOverloaded: boolean;
  overloadQty: number;
  lastUpdate: string | null;
  stocks: DashboardCompanyStock[];
  unallocated: {
    count: number;
    consumed: number;
    lastUpdate: string | null;
  };
}

export interface StockHistoryItem {
  kind: 'op' | 'trans';
  id: number;
  date: string;
  type: string;
  quantity: number;
  description: string;
  category: string | null;
  isUnallocated: boolean;
  duplicateInfo: { otherId: number; plate: string; company: string } | null;
  vehiculId?: number | null;
  companieId: number | null;
}

export interface StockCompanyTab {
  id: number;
  nume: string;
  cui?: string | null;
  codProdus?: string | null;
  color: string;
  colorHex: string;
  initial: number;
  in: number;
  consumed: number;
  current: number;
  lastUpdate: string | null;
  history: StockHistoryItem[];
}

export interface CombustibilStocData {
  gestiuneId: number;
  companies: StockCompanyTab[];
  unallocated: {
    initial: number;
    in: number;
    consumed: number;
    current: number;
    lastUpdate: string | null;
    history: StockHistoryItem[];
  };
  duplicateCount: number;
  vehiclesList: Array<{ id: number; numarAuto: string; companieId: number | null }>;
  canUndo: boolean;
  canRedo: boolean;
}

export function fmtNum(val: number | null | undefined, decimals = 2): string {
  const n = Number(val ?? 0);
  if (isNaN(n)) return decimals > 0 ? `0,${'0'.repeat(decimals)}` : '0';
  return n.toLocaleString('ro-RO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtDateRo(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

export function fmtTimeRo(iso: string | Date | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

export function fmtDateTimeRo(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  return `${fmtDateRo(iso)} ${fmtTimeRo(iso)}`.trim();
}

export function toDatetimeLocalValue(iso?: string | Date | null): string {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return '';
  if (iso) {
    return d.toISOString().slice(0, 16);
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getAuthHeaders(json = true): Record<string, string> {
  const headers: Record<string, string> = {};
  if (json) headers['Content-Type'] = 'application/json';
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fleetcmd_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function combustibilFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/combustibil${path}`, {
    ...init,
    headers: {
      ...getAuthHeaders(!(init?.body instanceof FormData)),
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let msg = `Eroare server (${res.status})`;
    try {
      const parsed = JSON.parse(raw);
      msg = Array.isArray(parsed.message) ? parsed.message.join(', ') : (parsed.message || parsed.error || msg);
    } catch {
      if (raw) msg = raw.slice(0, 200);
    }
    throw new Error(msg);
  }
  return res.json();
}

export async function downloadCombustibilPdf(path: string, body: Record<string, any>, fallbackName: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/combustibil${path}`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let msg = `Eroare la generarea PDF (${res.status})`;
    try {
      const parsed = JSON.parse(raw);
      msg = parsed.message || msg;
    } catch {
      if (raw) msg = raw.slice(0, 200);
    }
    throw new Error(msg);
  }
  const cd = res.headers.get('Content-Disposition') || '';
  const m = cd.match(/filename="?([^";]+)"?/i);
  const filename = m?.[1] || fallbackName;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return filename;
}

/**
 * Generates an ultra-crisp 2x Retina Executive Mobile Snapshot PNG via native HTML5 Canvas
 * (zero external html2canvas dependencies, pixel-perfect across all browsers & themes).
 */
export function generateMobileSnapshotPng(data: CombustibilDashboardData) {
  const scale = 2;
  const W = 430;
  const compRowH = 66;
  const H = 535 + data.stocks.length * compRowH + 55;

  const canvas = document.createElement('canvas');
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);

  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#0d1527');
  bg.addColorStop(0.55, '#070b14');
  bg.addColorStop(1, '#030610');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle ambient radial glows
  const g1 = ctx.createRadialGradient(W - 30, 30, 10, W - 30, 30, 180);
  g1.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
  g1.addColorStop(1, 'rgba(16, 185, 129, 0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(40, H - 140, 10, 40, H - 140, 200);
  g2.addColorStop(0, 'rgba(37, 99, 235, 0.15)');
  g2.addColorStop(1, 'rgba(37, 99, 235, 0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  // Header
  roundRect(24, 24, 44, 44, 12);
  ctx.fillStyle = 'rgba(245, 158, 11, 0.22)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⛽', 46, 53);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 19px "Segoe UI", Arial, sans-serif';
  ctx.fillText('Fuel Manager', 78, 44);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`RAPORT STOCURI • ${data.gestiune.nume.toUpperCase()}`, 78, 62);

  // Date pill
  const dtLabel = data.lastUpdate ? fmtDateTimeRo(data.lastUpdate) : 'Actualizat recent';
  roundRect(W - 155, 32, 131, 26, 13);
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  ctx.arc(W - 142, 45, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 10.5px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(dtLabel, W - 34, 49);

  // Hero Card: Capacitate Liberă
  const heroY = 90;
  const heroH = 215;
  roundRect(24, heroY, W - 48, heroH, 20);
  const heroGrad = ctx.createLinearGradient(24, heroY, W - 24, heroY + heroH);
  heroGrad.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
  heroGrad.addColorStop(0.55, 'rgba(13, 22, 40, 0.95)');
  heroGrad.addColorStop(1, 'rgba(6, 182, 212, 0.1)');
  ctx.fillStyle = heroGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.55)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Pill
  roundRect(W / 2 - 96, heroY + 18, 192, 26, 13);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.65)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#34d399';
  ctx.font = '800 11px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('DISPONIBIL DESCĂRCARE', W / 2, heroY + 35);

  // Massive number
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${fmtNum(data.freeSpace, 0)} L`, W / 2, heroY + 96);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
  ctx.fillText('CAPACITATE LIBERĂ ÎN REZERVOR', W / 2, heroY + 120);

  // Dual gauge labels
  const freePct = Math.max(0, Number((100 - data.displayPercent).toFixed(1)));
  ctx.textAlign = 'left';
  ctx.fillStyle = '#34d399';
  ctx.font = '700 11px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`■ Liber: ${fmtNum(data.freeSpace, 0)} L (${freePct}%)`, 44, heroY + 150);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`■ Ocupat: ${fmtNum(data.totalStock, 0)} L (${data.totalPercent}%)`, W - 44, heroY + 150);

  // Gauge bar
  const barX = 44;
  const barY = heroY + 160;
  const barW = W - 88;
  const barH = 12;
  roundRect(barX, barY, barW, barH, 6);
  ctx.fillStyle = '#1e293b';
  ctx.fill();

  const freeW = Math.max(0, Math.min(barW, (barW * freePct) / 100));
  if (freeW > 0) {
    roundRect(barX, barY, freeW, barH, 6);
    ctx.fillStyle = '#10b981';
    ctx.fill();
  }
  const usedW = barW - freeW;
  if (usedW > 0) {
    roundRect(barX + freeW, barY, usedW, barH, 6);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 10.5px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`Capacitate Totală Rezervor: ${fmtNum(data.tankCapacity, 0)} L`, W / 2, heroY + 195);

  // Two secondary metric tiles
  const tileY = heroY + heroH + 16;
  const tileW = (W - 60) / 2;
  const tileH = 92;

  roundRect(24, tileY, tileW, tileH, 16);
  ctx.fillStyle = 'rgba(13, 21, 39, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${fmtNum(data.totalStock, 0)} L`, 24 + tileW / 2, tileY + 46);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText('STOC TOTAL COMBUSTIBIL', 24 + tileW / 2, tileY + 70);

  roundRect(36 + tileW, tileY, tileW, tileH, 16);
  ctx.fillStyle = 'rgba(13, 21, 39, 0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${data.totalPercent}%`, 36 + tileW + tileW / 2, tileY + 46);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '700 10px "Segoe UI", Arial, sans-serif';
  ctx.fillText('GRAD DE OCUPARE', 36 + tileW + tileW / 2, tileY + 70);

  // Company breakdown header
  let cy = tileY + tileH + 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '800 11px "Segoe UI", Arial, sans-serif';
  ctx.fillText('REPARTIZARE PE FIRME', 28, cy);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#64748b';
  ctx.font = '600 10.5px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`${data.stocks.length} companii`, W - 28, cy);
  cy += 14;

  for (const s of data.stocks) {
    roundRect(24, cy, W - 48, 56, 13);
    ctx.fillStyle = 'rgba(13, 21, 39, 0.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Accent left strip
    roundRect(24, cy, 5, 56, 3);
    ctx.fillStyle = s.colorHex || '#38bdf8';
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 14px "Segoe UI", Arial, sans-serif';
    ctx.fillText(s.nume, 42, cy + 25);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 10px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`Intrări: +${fmtNum(s.refill, 0)} L  •  Consum: -${fmtNum(s.consumed, 0)} L`, 42, cy + 43);

    ctx.textAlign = 'right';
    ctx.fillStyle = s.isLowStock ? '#f87171' : '#34d399';
    ctx.font = '900 17px "Segoe UI", Arial, sans-serif';
    ctx.fillText(`${fmtNum(s.current, 1)} L`, W - 38, cy + 31);
    if (s.isLowStock) {
      ctx.fillStyle = '#fca5a5';
      ctx.font = '700 9px "Segoe UI", Arial, sans-serif';
      ctx.fillText('STOC SCĂZUT', W - 38, cy + 45);
    }

    cy += compRowH;
  }

  // Footer
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748b';
  ctx.font = '600 10.5px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`FleetCMD • Fuel Manager (${data.gestiune.nume})`, W / 2, H - 22);

  const link = document.createElement('a');
  link.download = `FuelStatus_${data.gestiune.nume}_${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
