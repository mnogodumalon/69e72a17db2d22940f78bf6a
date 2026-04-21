import type { Bilanz, GewinnUndVerlustrechnung, Kennzahlenanalyse } from './app';

export type EnrichedBilanz = Bilanz & {
  bilanz_unternehmenName: string;
};

export type EnrichedGewinnUndVerlustrechnung = GewinnUndVerlustrechnung & {
  guv_unternehmenName: string;
};

export type EnrichedKennzahlenanalyse = Kennzahlenanalyse & {
  kz_bilanzName: string;
  kz_guvName: string;
};
