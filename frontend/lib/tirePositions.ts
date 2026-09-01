export function getLabelPozitie(poz: any, totalRoti: number = 2) {
  const ax = poz?.numarAx || 1;
  const cod = (poz?.codPozitie || '').toUpperCase();

  if (totalRoti > 2 || cod.includes('INT') || cod.includes('EXT')) {
    if (cod.includes('ST_EXT') || cod === 'ST_EXT' || cod === 'STANGA_EXTERIOR' || cod === 'L1') {
      return { titlu: `Axa ${ax} St.Ext`, descriere: `Axa ${ax} Stânga Exterior`, descriereCurata: `Axa ${ax} Stânga Exterior` };
    }
    if (cod.includes('ST_INT') || cod === 'ST_INT' || cod === 'STANGA_INTERIOR' || cod === 'L2') {
      return { titlu: `Axa ${ax} St.Int`, descriere: `Axa ${ax} Stânga Interior`, descriereCurata: `Axa ${ax} Stânga Interior` };
    }
    if (cod.includes('DR_INT') || cod === 'DR_INT' || cod === 'DREAPTA_INTERIOR' || cod === 'R1') {
      return { titlu: `Axa ${ax} Dr.Int`, descriere: `Axa ${ax} Dreapta Interior`, descriereCurata: `Axa ${ax} Dreapta Interior` };
    }
    if (cod.includes('DR_EXT') || cod === 'DR_EXT' || cod === 'DREAPTA_EXTERIOR' || cod === 'R2') {
      return { titlu: `Axa ${ax} Dr.Ext`, descriere: `Axa ${ax} Dreapta Exterior`, descriereCurata: `Axa ${ax} Dreapta Exterior` };
    }
  }

  if (cod.includes('ST') || cod.includes('STANGA') || cod === 'L' || cod === 'L1') {
    return { titlu: `Axa ${ax} St`, descriere: `Axa ${ax} Stânga`, descriereCurata: `Axa ${ax} Stânga` };
  }
  if (cod.includes('DR') || cod.includes('DREAPTA') || cod === 'R' || cod === 'R1') {
    return { titlu: `Axa ${ax} Dr`, descriere: `Axa ${ax} Dreapta`, descriereCurata: `Axa ${ax} Dreapta` };
  }

  return { titlu: `Axa ${ax} ${poz?.codPozitie || ''}`, descriere: `Axa ${ax} Poziția ${poz?.codPozitie || ''}`, descriereCurata: `Axa ${ax} Poziția ${poz?.codPozitie || ''}` };
}
