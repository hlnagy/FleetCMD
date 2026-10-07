import { API_BASE_URL } from './api';

/**
 * Generator și Vizualizator PDF Oficial ANAF SPV / RO e-Factura
 * Solicită generarea PDF-ului oficial direct din API-ul ANAF SPV (FCTEL transformare FACT1)
 * și oferă fallback automat la formatul fiscal standardizat dacă serviciul este indisponibil.
 */
export async function openFacturaPdf(factura: any, configFirma?: any, customAuthFetch?: any) {
  if (!factura) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Vă rugăm să permiteți pop-up-urile în browser pentru a deschide factura PDF.');
    return;
  }

  // Ecran de încărcare profesional în noua filă în timp ce serverul solicită PDF-ul oficial de la ANAF SPV
  printWindow.document.open();
  printWindow.document.write(`
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Factura ${factura.numarFactura || ''} - Descărcare SPV Oficial</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      color: #1e293b;
    }
    .card {
      background: #ffffff;
      padding: 36px 44px;
      border-radius: 16px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.06), 0 8px 10px -6px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
      text-align: center;
      max-width: 480px;
    }
    .spinner {
      display: inline-block;
      width: 44px;
      height: 44px;
      border: 4px solid #e2e8f0;
      border-top-color: #0284c7;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 20px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 8px 0; font-size: 18px; font-weight: 800; color: #0f172a; }
    p { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
    .badge {
      display: inline-block;
      margin-top: 16px;
      padding: 6px 14px;
      border-radius: 8px;
      background: #f1f5f9;
      font-size: 12px;
      font-weight: 600;
      color: #334155;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="spinner"></div>
    <h2>Se generează Factura Oficială SPV...</h2>
    <p>Se descarcă documentul oficial cu macheta originală ANAF RO e-Factura din Spațiul Privat Virtual.</p>
    <div class="badge">Factura: <strong>${factura.numarFactura || '-'}</strong> • ${factura.numeVanzator || ''}</div>
  </div>
</body>
</html>
  `);
  printWindow.document.close();

  // 1. Încercare de obținere a PDF-ului oficial generat de ANAF SPV
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('fleetcmd_token') : null;
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fetchFn = customAuthFetch || fetch;
    const response = await fetchFn(`${API_BASE_URL}/efactura/facturi/${factura.id}/pdf`, {
      headers,
    });

    if (response.ok) {
      const blob = await response.blob();
      const pdfUrl = URL.createObjectURL(blob);
      printWindow.location.href = pdfUrl;
      return;
    }
    console.warn('Răspuns ANAF indisponibil, se generează macheta vizuală locală.');
  } catch (err) {
    console.warn('Eroare conectare API ANAF, se folosește generatorul de rezervă:', err);
  }

  // 2. Fallback: Dacă ANAF este offline sau nu s-a putut genera, afișăm macheta fiscală locală completă
  const totalFaraTva = (factura.articole || []).reduce((acc: number, a: any) => acc + (a.valoareFaraTVA || 0), 0);
  const totalTva = (factura.articole || []).reduce((acc: number, a: any) => acc + (a.valoareTVA || 0), 0);
  const totalGeneral = factura.valoareTotala || (totalFaraTva + totalTva);

  const formatUnit = (u: string) => {
    if (!u) return 'buc';
    const code = u.toUpperCase().trim();
    switch (code) {
      case 'H87':
      case 'C62':
      case 'PCE':
      case 'XPP':
      case 'NAR':
        return 'buc';
      case 'XBX':
      case 'BX':
      case 'PK':
      case 'PA':
        return 'cutie / pac';
      case 'SET':
        return 'set';
      case 'KGM':
        return 'kg';
      case 'LTR':
        return 'l';
      case 'MTR':
        return 'm';
      case 'MTK':
        return 'm²';
      case 'MTQ':
        return 'm³';
      case 'KWH':
        return 'kWh';
      case 'MWH':
        return 'MWh';
      case 'HUR':
        return 'ore';
      case 'DAY':
        return 'zile';
      case 'MON':
        return 'luni';
      default:
        return u;
    }
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <title>Factura ${factura.numarFactura} - ${factura.numeVanzator}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      margin: 0;
      padding: 24px;
      background: #f1f5f9;
    }
    .invoice-card {
      max-width: 860px;
      margin: 0 auto;
      background: #ffffff;
      padding: 36px 40px;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      border: 1px solid #e2e8f0;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e3a8a;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      color: #1e3a8a;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      background: #dbeafe;
      color: #1e40af;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .header .meta {
      text-align: right;
    }
    .header .meta p {
      margin: 3px 0;
      font-size: 13px;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .party-box {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    .party-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .party-name {
      font-size: 14px;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
      line-height: 1.3;
    }
    .party-detail {
      font-size: 12px;
      color: #475569;
      margin: 3px 0;
    }
    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
      font-size: 12px;
    }
    table.items-table th {
      background: #1e3a8a;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 9px 8px;
      border: 1px solid #1e3a8a;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table.items-table td {
      padding: 9px 8px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }
    table.items-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: 700; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    
    .totals-area {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 24px;
    }
    .totals-table {
      width: 340px;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      overflow: hidden;
      font-size: 12px;
    }
    .totals-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    .totals-table tr.grand-total {
      background: #0f172a;
      color: #ffffff;
      font-weight: 800;
      font-size: 13px;
    }
    .totals-table tr.grand-total td {
      color: #ffffff;
      border: none;
      padding: 10px 12px;
    }
    .footer {
      border-top: 1px dashed #cbd5e1;
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .toolbar {
      position: fixed;
      top: 16px;
      right: 24px;
      display: flex;
      gap: 10px;
      z-index: 1000;
    }
    .btn {
      padding: 10px 20px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      border: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print {
      background: #1e3a8a;
      color: #ffffff;
    }
    .btn-print:hover {
      background: #1e40af;
      transform: translateY(-1px);
    }
    @media print {
      body { background: white; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn btn-print" onclick="window.print()">🖨️ Printează / Salvează PDF</button>
  </div>

  <div class="invoice-card">
    <div class="header">
      <div>
        <h1>FACTURĂ FISCALĂ (REPREZENTARE VIZUALĂ)</h1>
        <span class="badge">Conform RO e-Factura UBL 2.1 • OUG 120/2021</span>
      </div>
      <div class="meta">
        <p><strong>Număr Factură:</strong> <span class="font-mono font-bold" style="color: #1e3a8a; font-size: 14px;">${factura.numarFactura}</span></p>
        <p><strong>Data Emiterii:</strong> ${new Date(factura.dataFactura).toLocaleDateString('ro-RO')}</p>
        <p><strong>Tip Document:</strong> ${factura.tipFactura || 'Factură'}</p>
        <p><strong>Monedă:</strong> <strong>${factura.moneda || 'RON'}</strong></p>
      </div>
    </div>

    <div class="parties">
      <div class="party-box">
        <div class="party-title">FURNIZOR / VÂNZĂTOR</div>
        <div class="party-name">${factura.numeVanzator || 'Furnizor Nespecificat'}</div>
        <p class="party-detail"><strong>CIF / CUI:</strong> <span class="font-mono font-bold">${factura.cifVanzator || '-'}</span></p>
      </div>

      <div class="party-box">
        <div class="party-title">CUMPĂRĂTOR / BENEFICIAR</div>
        <div class="party-name">${configFirma?.numeFirma || 'FLEETCMD PARC PROPRIU'}</div>
        <p class="party-detail"><strong>CIF / CUI:</strong> <span class="font-mono font-bold">${factura.cifCumparator || configFirma?.cifFirma || '-'}</span></p>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th class="text-center" style="width: 25px;">#</th>
          <th>Denumire Articol / Serviciu</th>
          <th class="text-center" style="width: 80px;">Cod Furnizor</th>
          <th class="text-center" style="width: 50px;">U.M.</th>
          <th class="text-right" style="width: 60px;">Cant.</th>
          <th class="text-right" style="width: 90px;">Preț fără TVA</th>
          <th class="text-right" style="width: 100px;">Valoare fără TVA</th>
          <th class="text-center" style="width: 50px;">TVA %</th>
          <th class="text-right" style="width: 90px;">Valoare TVA</th>
        </tr>
      </thead>
      <tbody>
        ${(factura.articole || []).map((art: any, idx: number) => `
          <tr>
            <td class="text-center font-bold" style="color: #64748b;">${idx + 1}</td>
            <td class="font-bold text-slate-900">${art.descrierePiesa}</td>
            <td class="text-center font-mono" style="font-size: 11px; color: #64748b;">${art.codArticolFurnizor || '-'}</td>
            <td class="text-center">${formatUnit(art.unitateMasura)}</td>
            <td class="text-right font-mono font-bold">${art.cantitate}</td>
            <td class="text-right font-mono">${(art.pretUnitar || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-right font-mono font-bold">${(art.valoareFaraTVA || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td class="text-center font-mono">${art.cotaTVA ?? 19}%</td>
            <td class="text-right font-mono">${(art.valoareTVA || 0).toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals-area">
      <table class="totals-table">
        <tr>
          <td>Total fără TVA:</td>
          <td class="text-right font-mono font-bold">${totalFaraTva.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${factura.moneda || 'RON'}</td>
        </tr>
        <tr>
          <td>Total TVA:</td>
          <td class="text-right font-mono font-bold">${totalTva.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${factura.moneda || 'RON'}</td>
        </tr>
        <tr class="grand-total">
          <td>TOTAL GENERAL (CU TVA):</td>
          <td class="text-right font-mono font-bold">${totalGeneral.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${factura.moneda || 'RON'}</td>
        </tr>
      </table>
    </div>

    <div class="footer">
      <span>FleetCMD Enterprise • Modul e-Factura ANAF</span>
      <span>Generat conform UBL 2.1 la data de ${new Date().toLocaleDateString('ro-RO')} ${new Date().toLocaleTimeString('ro-RO')}</span>
    </div>
  </div>
</body>
</html>
  `;

  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
