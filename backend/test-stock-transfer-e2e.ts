import * as http from 'http';

function makeRequest(options: http.RequestOptions, postData?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function testStockTransfer() {
  console.log('--- STARTING E2E STOCK TRANSFER TEST ---');

  try {
    // 1. Get Depozite
    const depozite = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: '/stocuri-garantii/depozite',
      method: 'GET',
    });

    console.log(`✅ Depozite disponibile: ${depozite.length} (${depozite.map((d: any) => d.nume).join(', ')})`);

    if (depozite.length < 2) {
      throw new Error('Trebuie să fie cel puțin 2 depozite create.');
    }

    const depSursa = depozite[0];
    const depDestinatie = depozite[1];

    // 2. Create initial item in Depozit Sursă with 4 items (e.g. 4 Filtre Ulei)
    const codArticolTest = `FLT-TEST-${Date.now().toString().substring(7)}`;
    const itemSursa = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/stocuri-garantii/stocuri',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        codArticol: codArticolTest,
        denumire: 'Filtru Ulei Liebherr Test',
        categorie: 'Filtre',
        stocCurent: 4, // 4 items initial
        stocMinim: 1,
        pretUnitar: 120,
        unitateMasura: 'buc',
        depozitId: depSursa.id,
      }
    );

    console.log(`✅ Articol creat în ${depSursa.nume}: ${itemSursa.denumire} (${itemSursa.codArticol}) - Stoc inițial: ${itemSursa.stocCurent} buc`);

    // 3. Perform Partial Transfer of 2 items from Depozit Sursă to Depozit Destinație
    console.log(`🔄 Transferăm parțial 2 bucăți din ${depSursa.nume} în ${depDestinatie.nume}...`);
    const resTransfer = await makeRequest(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/stocuri-garantii/transfer-stoc',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        articolStocId: itemSursa.id,
        depozitDestinatieId: depDestinatie.id,
        cantitate: 2,
        operator: 'Mihai Popa (Șef Atelier)',
        observatii: 'Test transfer parțial 2 bucăți filtru ulei',
      }
    );

    console.log(`✅ Răspuns API Transfer:`, resTransfer.mesaj);

    // 4. Verify updated stocks
    const resStocSursa = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/stocuri-garantii/stocuri?depozitId=${depSursa.id}&cautare=${codArticolTest}`,
      method: 'GET',
    });

    const resStocDest = await makeRequest({
      hostname: 'localhost',
      port: 3001,
      path: `/stocuri-garantii/stocuri?depozitId=${depDestinatie.id}&cautare=${codArticolTest}`,
      method: 'GET',
    });

    const itemSursaUpd = resStocSursa[0];
    const itemDestUpd = resStocDest[0];

    console.log(`📊 REZULTAT VERIFICARE STOCURI:`);
    console.log(`- Stoc în ${depSursa.nume}: ${itemSursaUpd.stocCurent} buc (Așteptat: 2 buc)`);
    console.log(`- Stoc în ${depDestinatie.nume}: ${itemDestUpd.stocCurent} buc (Așteptat: 2 buc)`);

    if (itemSursaUpd.stocCurent === 2 && itemDestUpd.stocCurent === 2) {
      console.log('🎉 E2E TEST PASSED 100%! TRANSFERUL PARȚIAL A FUNCȚIONAT PERFECT!');
    } else {
      console.error('❌ STOCUL NU S-A ACTUALIZAT CORECT.');
    }
  } catch (err: any) {
    console.error('❌ E2E TEST FAILED:', err.message || err);
  }
}

testStockTransfer();
