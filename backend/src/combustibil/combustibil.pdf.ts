import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');

function resolveFontPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'assets', 'fonts', 'arial_report.ttf'),
    path.join(process.cwd(), 'backend', 'assets', 'fonts', 'arial_report.ttf'),
    path.join(__dirname, '..', '..', 'assets', 'fonts', 'arial_report.ttf'),
    path.join(__dirname, '..', '..', '..', 'assets', 'fonts', 'arial_report.ttf'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function fmtNum(val: number, decimals = 2): string {
  const n = Number(val || 0);
  const fixed = n.toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return decimals > 0 ? parts.join(',') : parts[0];
}

function fmtDateRo(d: Date | string): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = dt.getUTCFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function fmtDateTimeRo(d: Date | string): string {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return '-';
  const hh = String(dt.getUTCHours()).padStart(2, '0');
  const mi = String(dt.getUTCMinutes()).padStart(2, '0');
  return `${fmtDateRo(dt)} ${hh}:${mi}`;
}

export function cleanFileToken(val: string): string {
  if (!val) return '';
  return String(val)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/*?:"<>|]/g, '_')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[._]+|[._]+$/g, '');
}

function createPdfBuffer(
  options: any,
  render: (doc: any, setFont: (bold?: boolean) => void) => void,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ bufferPages: true, ...options });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const fontPath = resolveFontPath();
    if (fontPath) {
      try {
        doc.registerFont('RoRegular', fontPath);
        doc.registerFont('RoBold', fontPath);
      } catch {
        // fallback to Helvetica
      }
    }

    const setFont = (bold = false) => {
      if (fontPath) {
        doc.font(bold ? 'RoBold' : 'RoRegular');
      } else {
        doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');
      }
    };

    try {
      render(doc, setFont);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export interface BonuriPdfPayload {
  gestiuneNume: string;
  tipCombustibil: string;
  bonNumber: string;
  transactions: Array<{
    id: number;
    data: Date;
    cantitate: number;
    numarAuto: string;
    companieNume: string;
    companieCui?: string | null;
    companieAdresa?: string | null;
    codProdus?: string | null;
  }>;
}

export async function generateBonuriPdf(payload: BonuriPdfPayload): Promise<Buffer> {
  return createPdfBuffer({ size: 'A4', margin: 45 }, (doc, setFont) => {
    payload.transactions.forEach((t, idx) => {
      if (idx > 0) doc.addPage();

      const compName = t.companieNume || 'NECUNOSCUT';
      const seria = t.codProdus || '---';
      const nrAnexa = String(idx + 1).padStart(3, '0');
      const pageW = doc.page.width - 90;

      // Top header card
      doc.rect(45, 45, pageW, 74).fillAndStroke('#f8fafc', '#cbd5e1');
      setFont(true);
      doc.fillColor('#0f172a').fontSize(14).text(compName, 58, 56, { width: pageW - 180 });
      setFont(false);
      doc.fillColor('#475569').fontSize(9.5);
      doc.text(`CUI: ${t.companieCui || '—'}   |   Gestiune: ${payload.gestiuneNume}`, 58, 76);
      doc.text(`Adresa: ${t.companieAdresa || '—'}`, 58, 92, { width: pageW - 180 });

      setFont(true);
      doc.fillColor('#1e293b').fontSize(9.5).text(`Data: ${fmtDateRo(t.data)}`, 45, 58, {
        width: pageW - 14,
        align: 'right',
      });
      setFont(false);
      doc.fillColor('#64748b').fontSize(8.5).text(`Ora: ${fmtDateTimeRo(t.data).slice(11)}`, 45, 74, {
        width: pageW - 14,
        align: 'right',
      });

      // Title
      setFont(true);
      doc.fillColor('#0f172a').fontSize(16).text('BON DE ALIMENTARE COMBUSTIBIL', 45, 142, {
        width: pageW,
        align: 'center',
      });
      setFont(false);
      doc.fillColor('#334155').fontSize(10).text(
        `Seria ${seria}   |   Număr Anexă: ${nrAnexa}   |   Atașat la Bon Consum: ${payload.bonNumber || '—'}`,
        45,
        166,
        { width: pageW, align: 'center' },
      );

      // Table Header
      const tableTop = 205;
      const cols = [
        { label: 'Data / Ora', x: 45, w: 105, align: 'left' },
        { label: 'Vehicul / Utilaj', x: 150, w: 130, align: 'left' },
        { label: 'Produs', x: 280, w: 120, align: 'left' },
        { label: 'U.M.', x: 400, w: 55, align: 'center' },
        { label: 'Cantitate', x: 455, w: 95, align: 'right' },
      ];

      doc.rect(45, tableTop, pageW, 26).fill('#1e293b');
      setFont(true);
      doc.fillColor('#ffffff').fontSize(9.5);
      for (const c of cols) {
        doc.text(c.label, c.x + 6, tableTop + 8, { width: c.w - 12, align: c.align as any });
      }

      // Row
      const rowY = tableTop + 26;
      doc.rect(45, rowY, pageW, 30).fillAndStroke('#ffffff', '#cbd5e1');
      setFont(false);
      doc.fillColor('#0f172a').fontSize(10);
      doc.text(fmtDateTimeRo(t.data), cols[0].x + 6, rowY + 9, { width: cols[0].w - 12 });
      setFont(true);
      doc.text(t.numarAuto || 'N/A', cols[1].x + 6, rowY + 9, { width: cols[1].w - 12 });
      setFont(false);
      doc.text(payload.tipCombustibil || 'Motorină', cols[2].x + 6, rowY + 9, { width: cols[2].w - 12 });
      doc.text('Litru', cols[3].x + 6, rowY + 9, { width: cols[3].w - 12, align: 'center' });
      setFont(true);
      doc.fillColor('#1d4ed8').text(`${fmtNum(t.cantitate, 2)} L`, cols[4].x + 6, rowY + 9, {
        width: cols[4].w - 12,
        align: 'right',
      });

      // Signatures
      const sigY = rowY + 75;
      setFont(false);
      doc.fillColor('#334155').fontSize(10);
      doc.text('Semnătură Gestionar:', 55, sigY);
      doc.text('..........................................', 55, sigY + 26);

      doc.text('Semnătură Șofer / Primitor:', 330, sigY);
      doc.text('..........................................', 330, sigY + 26);

      // Footer
      doc.fillColor('#94a3b8').fontSize(8).text(
        `Preț unitar: 0,00 RON | Valoare: 0,00 RON  •  FleetCMD Combustibil  •  Pagina ${idx + 1} / ${payload.transactions.length}`,
        45,
        doc.page.height - 50,
        { width: pageW, align: 'center' },
      );
    });
  });
}

export interface MonthlyReportPayload {
  gestiuneNume: string;
  startDate: Date;
  endDate: Date;
  initialSeries: number;
  finalSeries: number;
  summaryRows: Array<{
    firma: string;
    stocInitial: number;
    totalIntrat: number;
    totalIesit: number;
    stocFinal: number;
  }>;
  totals: {
    stocInitial: number;
    totalIntrat: number;
    totalIesit: number;
    stocFinal: number;
  };
  chronological: Array<{
    data: Date;
    tip: string;
    firma: string;
    detalii: string;
    cantitate: number;
  }>;
}

export async function generateRaportLunarPdf(payload: MonthlyReportPayload): Promise<Buffer> {
  return createPdfBuffer({ size: 'A4', margin: 40 }, (doc, setFont) => {
    const pageW = doc.page.width - 80;
    const seriesDiff = Number((payload.finalSeries - payload.initialSeries).toFixed(2));
    const discrepancy = Number((seriesDiff - payload.totals.totalIesit).toFixed(2));
    const isOk = Math.abs(discrepancy) <= 5;

    // Header
    setFont(true);
    doc.fillColor('#0f172a').fontSize(16).text(`Raport Lunar - Gestiune Motorină (${payload.gestiuneNume})`, 40, 40, {
      width: pageW,
      align: 'center',
    });
    setFont(false);
    doc.fillColor('#475569').fontSize(10).text(
      `Perioada: ${fmtDateTimeRo(payload.startDate)} — ${fmtDateTimeRo(payload.endDate)}`,
      40,
      62,
      { width: pageW, align: 'center' },
    );

    // 1. Sumar Statistic
    let y = 92;
    setFont(true);
    doc.fillColor('#1e293b').fontSize(11).text('1. Sumar Statistic per Firmă', 40, y);
    y += 18;

    const sumCols = [
      { label: 'Firmă', x: 40, w: 155, align: 'left' },
      { label: 'Stoc Inițial', x: 195, w: 90, align: 'right' },
      { label: 'Total Intrat', x: 285, w: 90, align: 'right' },
      { label: 'Total Ieșit', x: 375, w: 90, align: 'right' },
      { label: 'Stoc Final', x: 465, w: 90, align: 'right' },
    ];
    doc.rect(40, y, pageW, 22).fill('#1e293b');
    doc.fillColor('#ffffff').fontSize(8.5);
    for (const c of sumCols) {
      doc.text(c.label, c.x + 5, y + 6, { width: c.w - 10, align: c.align as any });
    }
    y += 22;

    payload.summaryRows.forEach((r, i) => {
      doc.rect(40, y, pageW, 20).fillAndStroke(i % 2 === 0 ? '#ffffff' : '#f8fafc', '#e2e8f0');
      setFont(false);
      doc.fillColor('#0f172a').fontSize(8.5);
      doc.text(r.firma, sumCols[0].x + 5, y + 5, { width: sumCols[0].w - 10 });
      doc.text(`${fmtNum(r.stocInitial)} L`, sumCols[1].x + 5, y + 5, { width: sumCols[1].w - 10, align: 'right' });
      doc.fillColor('#15803d').text(`+${fmtNum(r.totalIntrat)} L`, sumCols[2].x + 5, y + 5, { width: sumCols[2].w - 10, align: 'right' });
      doc.fillColor('#b91c1c').text(`-${fmtNum(r.totalIesit)} L`, sumCols[3].x + 5, y + 5, { width: sumCols[3].w - 10, align: 'right' });
      setFont(true);
      doc.fillColor('#0f172a').text(`${fmtNum(r.stocFinal)} L`, sumCols[4].x + 5, y + 5, { width: sumCols[4].w - 10, align: 'right' });
      y += 20;
    });

    // Total General row
    doc.rect(40, y, pageW, 22).fillAndStroke('#e2e8f0', '#94a3b8');
    setFont(true);
    doc.fillColor('#0f172a').fontSize(9);
    doc.text('TOTAL GENERAL', sumCols[0].x + 5, y + 6, { width: sumCols[0].w - 10 });
    doc.text(`${fmtNum(payload.totals.stocInitial)} L`, sumCols[1].x + 5, y + 6, { width: sumCols[1].w - 10, align: 'right' });
    doc.text(`+${fmtNum(payload.totals.totalIntrat)} L`, sumCols[2].x + 5, y + 6, { width: sumCols[2].w - 10, align: 'right' });
    doc.text(`-${fmtNum(payload.totals.totalIesit)} L`, sumCols[3].x + 5, y + 6, { width: sumCols[3].w - 10, align: 'right' });
    doc.text(`${fmtNum(payload.totals.stocFinal)} L`, sumCols[4].x + 5, y + 6, { width: sumCols[4].w - 10, align: 'right' });
    y += 34;

    // 2. Verificare Contoare Pompă
    setFont(true);
    doc.fillColor('#1e293b').fontSize(11).text('2. Verificare Contoare Pompă', 40, y);
    y += 18;

    doc.rect(40, y, pageW, 72).fillAndStroke(isOk ? '#f0fdf4' : '#fef2f2', isOk ? '#86efac' : '#fca5a5');
    setFont(false);
    doc.fillColor('#1e293b').fontSize(9.5);
    doc.text(`Serie Inițială: ${fmtNum(payload.initialSeries)}`, 54, y + 12);
    doc.text(`Serie Finală: ${fmtNum(payload.finalSeries)}`, 220, y + 12);
    setFont(true);
    doc.text(`Diferență Serii: ${fmtNum(seriesDiff)} L`, 385, y + 12);
    setFont(false);
    doc.text(`Total Ieșit (Calculat din sistem): ${fmtNum(payload.totals.totalIesit)} L`, 54, y + 34);
    setFont(true);
    doc.fillColor(isOk ? '#15803d' : '#b91c1c').text(
      isOk
        ? `Status: OK (Diferență: ${fmtNum(discrepancy)} L)`
        : `Status: DISCREPANȚĂ (Diferență: ${fmtNum(discrepancy)} L)`,
      54,
      y + 52,
    );
    y += 88;

    // 3. Istoric Cronologic
    setFont(true);
    doc.fillColor('#1e293b').fontSize(11).text(`3. Istoric Cronologic (${payload.chronological.length} înregistrări)`, 40, y);
    y += 18;

    const cCols = [
      { label: 'Data / Ora', x: 40, w: 92, align: 'left' },
      { label: 'Tip', x: 132, w: 68, align: 'center' },
      { label: 'Firmă', x: 200, w: 115, align: 'left' },
      { label: 'Vehicul / Detalii', x: 315, w: 155, align: 'left' },
      { label: 'Cantitate', x: 470, w: 85, align: 'right' },
    ];

    const drawChronoHeader = () => {
      doc.rect(40, y, pageW, 20).fill('#334155');
      setFont(true);
      doc.fillColor('#ffffff').fontSize(8);
      for (const c of cCols) {
        doc.text(c.label, c.x + 4, y + 5, { width: c.w - 8, align: c.align as any });
      }
      y += 20;
    };

    drawChronoHeader();
    payload.chronological.forEach((row, idx) => {
      if (y > doc.page.height - 65) {
        doc.addPage();
        y = 45;
        drawChronoHeader();
      }
      doc.rect(40, y, pageW, 18).fillAndStroke(idx % 2 === 0 ? '#ffffff' : '#f8fafc', '#e2e8f0');
      setFont(false);
      doc.fillColor('#0f172a').fontSize(8);
      doc.text(fmtDateTimeRo(row.data), cCols[0].x + 4, y + 4, { width: cCols[0].w - 8 });
      doc.fillColor(row.tip === 'CONSUM' || row.tip === 'OUT' ? '#b91c1c' : '#15803d').text(
        row.tip,
        cCols[1].x + 4,
        y + 4,
        { width: cCols[1].w - 8, align: 'center' },
      );
      doc.fillColor('#334155').text(row.firma || 'Nealocat', cCols[2].x + 4, y + 4, { width: cCols[2].w - 8 });
      doc.fillColor('#0f172a').text(row.detalii || '—', cCols[3].x + 4, y + 4, { width: cCols[3].w - 8 });
      setFont(true);
      doc.text(`${fmtNum(row.cantitate)} L`, cCols[4].x + 4, y + 4, { width: cCols[4].w - 8, align: 'right' });
      y += 18;
    });

    // Page footers
    const range = doc.bufferedPageRange();
    for (let p = 0; p < range.count; p++) {
      doc.switchToPage(p);
      setFont(false);
      doc.fillColor('#94a3b8').fontSize(8).text(
        `FleetCMD Combustibil • Gestiune ${payload.gestiuneNume} • Pagina ${p + 1} / ${range.count}`,
        40,
        doc.page.height - 30,
        { width: pageW, align: 'center' },
      );
    }
  });
}

export interface AnalysisPdfPayload {
  gestiuneNume: string;
  startDate: string;
  endDate: string;
  netFuelBudila: number;
  mcVanduti: number;
  mcSortati: number;
  effVanduti: number;
  effSortati: number;
  budilaRows: Array<{
    category: string;
    fuel: number;
    mcVal: number;
    basisLabel: string;
    efficiency: number;
  }>;
  ghidfalauNetFuel: number;
  mcGhidfalau: number;
  effGhidfalau: number;
  ghidfalauRows: Array<{
    category: string;
    fuel: number;
    mcVal: number;
    basisLabel: string;
    efficiency: number;
  }>;
}

export async function generateAnalizaPdf(payload: AnalysisPdfPayload): Promise<Buffer> {
  return createPdfBuffer({ size: 'A4', layout: 'landscape', margin: 36 }, (doc, setFont) => {
    const pageW = doc.page.width - 72;

    const drawHeader = (subtitle: string) => {
      setFont(true);
      doc.fillColor('#0f172a').fontSize(16).text(`RAPORT ANALIZĂ EFICIENȚĂ — ${subtitle}`, 36, 34, {
        width: pageW,
        align: 'center',
      });
      setFont(false);
      doc.fillColor('#475569').fontSize(9.5).text(
        `Gestiune: ${payload.gestiuneNume}   •   Perioada: ${payload.startDate.replace('T', ' ')} — ${payload.endDate.replace('T', ' ')}   •   Generat: ${fmtDateTimeRo(new Date())}`,
        36,
        56,
        { width: pageW, align: 'center' },
      );
    };

    const drawTable = (
      startY: number,
      accentHex: string,
      title: string,
      rows: Array<{ category: string; fuel: number; mcVal: number; basisLabel: string; efficiency: number }>,
    ) => {
      let y = startY;
      doc.rect(36, y, 4, 22).fill(accentHex);
      doc.rect(40, y, pageW - 4, 22).fill('#f1f5f9');
      setFont(true);
      doc.fillColor('#0f172a').fontSize(10.5).text(title, 48, y + 5);
      y += 28;

      const cols = [
        { label: 'Categorie Utilaj', x: 36, w: 200, align: 'left' },
        { label: 'Litri Consumați', x: 236, w: 120, align: 'right' },
        { label: 'Valoare Bază (MC)', x: 356, w: 120, align: 'right' },
        { label: 'Baza de calcul selectată', x: 476, w: 185, align: 'left' },
        { label: 'Eficiență (L/MC)', x: 661, w: 108, align: 'right' },
      ];
      doc.rect(36, y, pageW, 22).fill('#334155');
      doc.fillColor('#ffffff').fontSize(8.5);
      for (const c of cols) {
        doc.text(c.label, c.x + 6, y + 6, { width: c.w - 12, align: c.align as any });
      }
      y += 22;

      rows.forEach((r, idx) => {
        doc.rect(36, y, pageW, 22).fillAndStroke(idx % 2 === 0 ? '#ffffff' : '#f8fafc', '#e2e8f0');
        setFont(true);
        doc.fillColor('#0f172a').fontSize(9);
        doc.text(r.category, cols[0].x + 6, y + 6, { width: cols[0].w - 12 });
        setFont(false);
        doc.text(`${fmtNum(r.fuel, 1)} L`, cols[1].x + 6, y + 6, { width: cols[1].w - 12, align: 'right' });
        doc.text(`${fmtNum(r.mcVal, 1)} MC`, cols[2].x + 6, y + 6, { width: cols[2].w - 12, align: 'right' });
        doc.fillColor('#475569').fontSize(8.5).text(r.basisLabel, cols[3].x + 6, y + 6, { width: cols[3].w - 12 });
        setFont(true);
        doc.fillColor(accentHex).fontSize(9.5).text(fmtNum(r.efficiency, 4), cols[4].x + 6, y + 6, {
          width: cols[4].w - 12,
          align: 'right',
        });
        y += 22;
      });
    };

    // Page 1: Budila
    drawHeader('BUDILA / GENERAL');
    const kpiY = 82;
    const boxW = (pageW - 24) / 3;
    const kpis = [
      { label: 'CONSUM TOTAL (NET)', val: `${fmtNum(payload.netFuelBudila, 1)} LTR`, sub: 'Consum net utilaje Budila', color: '#0f172a' },
      { label: 'SCOR / TOTAL MC VÂNDUȚI', val: `${fmtNum(payload.effVanduti, 4)} L/MC`, sub: `Baza: ${fmtNum(payload.mcVanduti, 0)} MC`, color: '#2563eb' },
      { label: 'SCOR / TOTAL BALAST SORTAT', val: `${fmtNum(payload.effSortati, 4)} L/MC`, sub: `Baza: ${fmtNum(payload.mcSortati, 0)} MC`, color: '#2563eb' },
    ];
    kpis.forEach((k, i) => {
      const bx = 36 + i * (boxW + 12);
      doc.rect(bx, kpiY, boxW, 66).fillAndStroke('#f8fafc', '#cbd5e1');
      doc.rect(bx, kpiY, boxW, 3).fill(k.color);
      setFont(true);
      doc.fillColor('#64748b').fontSize(8).text(k.label, bx + 12, kpiY + 10);
      doc.fillColor(k.color).fontSize(15).text(k.val, bx + 12, kpiY + 24);
      setFont(false);
      doc.fillColor('#64748b').fontSize(8).text(k.sub, bx + 12, kpiY + 48);
    });

    drawTable(168, '#2563eb', 'DETALIU CATEGORII — BUDILA', payload.budilaRows);

    // Page 2: Ghidfalău (if any)
    if (payload.ghidfalauRows.length > 0) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 36 });
      drawHeader('GHIDFALĂU');
      const gBoxW = (pageW - 12) / 2;
      const gKpis = [
        { label: 'CONSUM NET GHIDFALĂU', val: `${fmtNum(payload.ghidfalauNetFuel, 1)} LTR`, sub: 'Consum utilaje Ghidfalău', color: '#d97706' },
        { label: 'SCOR / NISIP EXPLOATAT GHIDFALĂU', val: `${fmtNum(payload.effGhidfalau, 4)} L/MC`, sub: `Baza: ${fmtNum(payload.mcGhidfalau, 0)} MC`, color: '#d97706' },
      ];
      gKpis.forEach((k, i) => {
        const bx = 36 + i * (gBoxW + 12);
        doc.rect(bx, kpiY, gBoxW, 66).fillAndStroke('#fffbeb', '#fcd34d');
        doc.rect(bx, kpiY, gBoxW, 3).fill(k.color);
        setFont(true);
        doc.fillColor('#92400e').fontSize(8).text(k.label, bx + 12, kpiY + 10);
        doc.fillColor(k.color).fontSize(15).text(k.val, bx + 12, kpiY + 24);
        setFont(false);
        doc.fillColor('#92400e').fontSize(8).text(k.sub, bx + 12, kpiY + 48);
      });
      drawTable(168, '#d97706', 'DETALIU CATEGORII — GHIDFALĂU', payload.ghidfalauRows);
    }
  });
}
