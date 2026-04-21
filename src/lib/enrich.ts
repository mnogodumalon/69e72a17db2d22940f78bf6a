import type { EnrichedBilanz, EnrichedGewinnUndVerlustrechnung, EnrichedKennzahlenanalyse } from '@/types/enriched';
import type { Bilanz, GewinnUndVerlustrechnung, Kennzahlenanalyse, Unternehmensstammdaten } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BilanzMaps {
  unternehmensstammdatenMap: Map<string, Unternehmensstammdaten>;
}

export function enrichBilanz(
  bilanz: Bilanz[],
  maps: BilanzMaps
): EnrichedBilanz[] {
  return bilanz.map(r => ({
    ...r,
    bilanz_unternehmenName: resolveDisplay(r.fields.bilanz_unternehmen, maps.unternehmensstammdatenMap, 'unternehmensname'),
  }));
}

interface GewinnUndVerlustrechnungMaps {
  unternehmensstammdatenMap: Map<string, Unternehmensstammdaten>;
}

export function enrichGewinnUndVerlustrechnung(
  gewinnUndVerlustrechnung: GewinnUndVerlustrechnung[],
  maps: GewinnUndVerlustrechnungMaps
): EnrichedGewinnUndVerlustrechnung[] {
  return gewinnUndVerlustrechnung.map(r => ({
    ...r,
    guv_unternehmenName: resolveDisplay(r.fields.guv_unternehmen, maps.unternehmensstammdatenMap, 'unternehmensname'),
  }));
}

interface KennzahlenanalyseMaps {
  bilanzMap: Map<string, Bilanz>;
  gewinnUndVerlustrechnungMap: Map<string, GewinnUndVerlustrechnung>;
}

export function enrichKennzahlenanalyse(
  kennzahlenanalyse: Kennzahlenanalyse[],
  maps: KennzahlenanalyseMaps
): EnrichedKennzahlenanalyse[] {
  return kennzahlenanalyse.map(r => ({
    ...r,
    kz_bilanzName: resolveDisplay(r.fields.kz_bilanz, maps.bilanzMap, 'geschaeftsjahr'),
    kz_guvName: resolveDisplay(r.fields.kz_guv, maps.gewinnUndVerlustrechnungMap, 'guv_geschaeftsjahr'),
  }));
}
