export function getLabelPozitie(poz: any, totalRoti: number = 2) {
  const ax = poz?.numarAx || 1;
  const cod = (poz?.codPozitie || '').toUpperCase().trim();

  const isDual =
    totalRoti > 2 ||
    cod.includes('INT') ||
    cod.includes('EXT') ||
    cod.endsWith('SI') ||
    cod.endsWith('DI');

  if (isDual) {
    if (
      cod.includes('STG/EXT') ||
      cod.includes('ST_EXT') ||
      cod.includes('ST-EXT') ||
      cod.endsWith('SS') ||
      cod === 'STANGA_EXTERIOR' ||
      cod === 'L1'
    ) {
      return { titlu: `${ax}/STG/EXT`, descriere: `Axa ${ax} Stânga Exterior`, descriereCurata: `Axa ${ax} Stânga Exterior` };
    }
    if (
      cod.includes('STG/INT') ||
      cod.includes('ST_INT') ||
      cod.includes('ST-INT') ||
      cod.endsWith('SI') ||
      cod === 'STANGA_INTERIOR' ||
      cod === 'L2'
    ) {
      return { titlu: `${ax}/STG/INT`, descriere: `Axa ${ax} Stânga Interior`, descriereCurata: `Axa ${ax} Stânga Interior` };
    }
    if (
      cod.includes('DR/INT') ||
      cod.includes('DR_INT') ||
      cod.includes('DR-INT') ||
      cod.endsWith('DI') ||
      cod === 'DREAPTA_INTERIOR' ||
      cod === 'R1'
    ) {
      return { titlu: `${ax}/DR/INT`, descriere: `Axa ${ax} Dreapta Interior`, descriereCurata: `Axa ${ax} Dreapta Interior` };
    }
    if (
      cod.includes('DR/EXT') ||
      cod.includes('DR_EXT') ||
      cod.includes('DR-EXT') ||
      cod.endsWith('DS') ||
      cod === 'DREAPTA_EXTERIOR' ||
      cod === 'R2'
    ) {
      return { titlu: `${ax}/DR/EXT`, descriere: `Axa ${ax} Dreapta Exterior`, descriereCurata: `Axa ${ax} Dreapta Exterior` };
    }
  }

  if (cod.includes('ST') || cod.includes('STANGA') || cod.endsWith('SS') || cod.includes('-S') || cod === 'L' || cod === 'L1') {
    return { titlu: `${ax}/STG`, descriere: `Axa ${ax} Stânga`, descriereCurata: `Axa ${ax} Stânga` };
  }
  if (cod.includes('DR') || cod.includes('DREAPTA') || cod.endsWith('DS') || cod.includes('-D') || cod === 'R' || cod === 'R1') {
    return { titlu: `${ax}/DR`, descriere: `Axa ${ax} Dreapta`, descriereCurata: `Axa ${ax} Dreapta` };
  }

  return { titlu: poz?.codPozitie || `${ax}`, descriere: `Axa ${ax} Poziția ${poz?.codPozitie || ''}`, descriereCurata: `Axa ${ax} Poziția ${poz?.codPozitie || ''}` };
}
