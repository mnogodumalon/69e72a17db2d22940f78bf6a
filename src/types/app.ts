// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
export type GeoLocation = { lat: number; long: number; info?: string };

export interface Unternehmensstammdaten {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    unternehmensname?: string;
    rechtsform?: LookupValue;
    branche?: LookupValue;
    handelsregisternummer?: string;
    steuernummer?: string;
    strasse?: string;
    hausnummer?: string;
    plz?: string;
    ort?: string;
    land?: string;
    ansprechpartner_vorname?: string;
    ansprechpartner_nachname?: string;
    ansprechpartner_email?: string;
    ansprechpartner_telefon?: string;
    bemerkungen?: string;
  };
}

export interface Bilanz {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    bilanz_unternehmen?: string; // applookup -> URL zu 'Unternehmensstammdaten' Record
    geschaeftsjahr?: string;
    bilanzstichtag?: string; // Format: YYYY-MM-DD oder ISO String
    waehrung?: LookupValue;
    einheit?: LookupValue;
    immaterielle_vermoegensgegenstaende?: number;
    immaterielle_vermoegensgegenstaende_vj?: number;
    sachanlagen?: number;
    sachanlagen_vj?: number;
    finanzanlagen?: number;
    finanzanlagen_vj?: number;
    anlagevermoegen_gesamt?: number;
    anlagevermoegen_gesamt_vj?: number;
    vorraethe?: number;
    vorraethe_vj?: number;
    forderungen_llg?: number;
    forderungen_llg_vj?: number;
    sonstige_forderungen?: number;
    sonstige_forderungen_vj?: number;
    kassenbestand?: number;
    kassenbestand_vj?: number;
    umlaufvermoegen_gesamt?: number;
    umlaufvermoegen_gesamt_vj?: number;
    rechnungsabgrenzung_aktiva?: number;
    rechnungsabgrenzung_aktiva_vj?: number;
    bilanzsumme_aktiva?: number;
    bilanzsumme_aktiva_vj?: number;
    gezeichnetes_kapital?: number;
    gezeichnetes_kapital_vj?: number;
    kapitalruecklagen?: number;
    kapitalruecklagen_vj?: number;
    gewinnruecklagen?: number;
    gewinnruecklagen_vj?: number;
    jahresueberschuss_bilanz?: number;
    jahresueberschuss_bilanz_vj?: number;
    eigenkapital_gesamt?: number;
    eigenkapital_gesamt_vj?: number;
    rueckstellungen?: number;
    rueckstellungen_vj?: number;
    verbindlichkeiten_kreditinstitute?: number;
    verbindlichkeiten_kreditinstitute_vj?: number;
    verbindlichkeiten_llg?: number;
    verbindlichkeiten_llg_vj?: number;
    sonstige_verbindlichkeiten?: number;
    sonstige_verbindlichkeiten_vj?: number;
    fremdkapital_gesamt?: number;
    fremdkapital_gesamt_vj?: number;
    rechnungsabgrenzung_passiva?: number;
    rechnungsabgrenzung_passiva_vj?: number;
    bilanzsumme_passiva?: number;
    bilanzsumme_passiva_vj?: number;
    bilanz_anmerkungen?: string;
  };
}

export interface GewinnUndVerlustrechnung {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    ebit_vj?: number;
    guv_unternehmen?: string; // applookup -> URL zu 'Unternehmensstammdaten' Record
    guv_geschaeftsjahr?: string;
    guv_waehrung?: LookupValue;
    guv_einheit?: LookupValue;
    umsatzerloese?: number;
    umsatzerloese_vj?: number;
    bestandsveraenderungen?: number;
    bestandsveraenderungen_vj?: number;
    sonstige_betriebliche_ertraege?: number;
    sonstige_betriebliche_ertraege_vj?: number;
    gesamtleistung?: number;
    gesamtleistung_vj?: number;
    materialaufwand?: number;
    materialaufwand_vj?: number;
    personalaufwand?: number;
    personalaufwand_vj?: number;
    abschreibungen?: number;
    abschreibungen_vj?: number;
    sonstige_betriebliche_aufwendungen?: number;
    sonstige_betriebliche_aufwendungen_vj?: number;
    ebitda?: number;
    ebitda_vj?: number;
    ebit?: number;
    zinsertraege?: number;
    zinsertraege_vj?: number;
    zinsaufwendungen?: number;
    zinsaufwendungen_vj?: number;
    ebt?: number;
    ebt_vj?: number;
    steuern?: number;
    steuern_vj?: number;
    jahresueberschuss_guv?: number;
    jahresueberschuss_guv_vj?: number;
    guv_anmerkungen?: string;
  };
}

export interface Kennzahlenanalyse {
  record_id: string;
  createdat: string;
  updatedat: string | null;
  fields: {
    kz_bilanz?: string; // applookup -> URL zu 'Bilanz' Record
    kz_guv?: string; // applookup -> URL zu 'GewinnUndVerlustrechnung' Record
    eigenkapitalquote?: number;
    fremdkapitalquote?: number;
    verschuldungsgrad?: number;
    anlagendeckungsgrad_1?: number;
    anlagendeckungsgrad_2?: number;
    liquiditaet_1?: number;
    liquiditaet_2?: number;
    liquiditaet_3?: number;
    working_capital?: number;
    eigenkapitalrendite?: number;
    gesamtkapitalrendite?: number;
    umsatzrendite?: number;
    ebit_marge?: number;
    ebitda_marge?: number;
    kapitalumschlag?: number;
    debitorenlaufzeit?: number;
    kreditorenlaufzeit?: number;
    lagerdauer?: number;
    cashflow_operativ?: number;
    bonitaetsbewertung?: LookupValue;
    staerken?: string;
    schwaechen?: string;
    gesamtkommentar?: string;
    analyst_vorname?: string;
    analyst_nachname?: string;
    analysedatum?: string; // Format: YYYY-MM-DD oder ISO String
  };
}

export const APP_IDS = {
  UNTERNEHMENSSTAMMDATEN: '69e729e1f143a27105f81df5',
  BILANZ: '69e729e9f52a319fce1dfdd4',
  GEWINN_UND_VERLUSTRECHNUNG: '69e729ec39c67f031e5ee5d4',
  KENNZAHLENANALYSE: '69e729ee8e079415207da9c6',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'unternehmensstammdaten': {
    rechtsform: [{ key: "sonstige", label: "Sonstige" }, { key: "gmbh", label: "GmbH" }, { key: "ag", label: "AG" }, { key: "gmbh_co_kg", label: "GmbH & Co. KG" }, { key: "kg", label: "KG" }, { key: "ohg", label: "OHG" }, { key: "einzelunternehmen", label: "Einzelunternehmen" }, { key: "ug", label: "UG (haftungsbeschränkt)" }],
    branche: [{ key: "industrie", label: "Industrie / Produktion" }, { key: "handel", label: "Handel" }, { key: "dienstleistung", label: "Dienstleistung" }, { key: "bau", label: "Bau / Immobilien" }, { key: "it", label: "IT / Technologie" }, { key: "gesundheit", label: "Gesundheit / Pharma" }, { key: "transport", label: "Transport / Logistik" }, { key: "energie", label: "Energie / Versorgung" }, { key: "landwirtschaft", label: "Landwirtschaft" }, { key: "sonstige_branche", label: "Sonstige" }],
  },
  'bilanz': {
    waehrung: [{ key: "eur", label: "EUR (Euro)" }, { key: "usd", label: "USD (US-Dollar)" }, { key: "chf", label: "CHF (Schweizer Franken)" }, { key: "gbp", label: "GBP (Britisches Pfund)" }],
    einheit: [{ key: "euro", label: "Euro (volle Beträge)" }, { key: "teur", label: "Tausend Euro (TEUR)" }, { key: "meur", label: "Millionen Euro (MEUR)" }],
  },
  'gewinn__und_verlustrechnung': {
    guv_waehrung: [{ key: "eur", label: "EUR (Euro)" }, { key: "usd", label: "USD (US-Dollar)" }, { key: "chf", label: "CHF (Schweizer Franken)" }, { key: "gbp", label: "GBP (Britisches Pfund)" }],
    guv_einheit: [{ key: "euro", label: "Euro (volle Beträge)" }, { key: "teur", label: "Tausend Euro (TEUR)" }, { key: "meur", label: "Millionen Euro (MEUR)" }],
  },
  'kennzahlenanalyse': {
    bonitaetsbewertung: [{ key: "sehr_gut", label: "Sehr gut" }, { key: "gut", label: "Gut" }, { key: "befriedigend", label: "Befriedigend" }, { key: "ausreichend", label: "Ausreichend" }, { key: "mangelhaft", label: "Mangelhaft" }, { key: "kritisch", label: "Kritisch" }],
  },
};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'unternehmensstammdaten': {
    'unternehmensname': 'string/text',
    'rechtsform': 'lookup/select',
    'branche': 'lookup/select',
    'handelsregisternummer': 'string/text',
    'steuernummer': 'string/text',
    'strasse': 'string/text',
    'hausnummer': 'string/text',
    'plz': 'string/text',
    'ort': 'string/text',
    'land': 'string/text',
    'ansprechpartner_vorname': 'string/text',
    'ansprechpartner_nachname': 'string/text',
    'ansprechpartner_email': 'string/email',
    'ansprechpartner_telefon': 'string/tel',
    'bemerkungen': 'string/textarea',
  },
  'bilanz': {
    'bilanz_unternehmen': 'applookup/select',
    'geschaeftsjahr': 'string/text',
    'bilanzstichtag': 'date/date',
    'waehrung': 'lookup/select',
    'einheit': 'lookup/select',
    'immaterielle_vermoegensgegenstaende': 'number',
    'immaterielle_vermoegensgegenstaende_vj': 'number',
    'sachanlagen': 'number',
    'sachanlagen_vj': 'number',
    'finanzanlagen': 'number',
    'finanzanlagen_vj': 'number',
    'anlagevermoegen_gesamt': 'number',
    'anlagevermoegen_gesamt_vj': 'number',
    'vorraethe': 'number',
    'vorraethe_vj': 'number',
    'forderungen_llg': 'number',
    'forderungen_llg_vj': 'number',
    'sonstige_forderungen': 'number',
    'sonstige_forderungen_vj': 'number',
    'kassenbestand': 'number',
    'kassenbestand_vj': 'number',
    'umlaufvermoegen_gesamt': 'number',
    'umlaufvermoegen_gesamt_vj': 'number',
    'rechnungsabgrenzung_aktiva': 'number',
    'rechnungsabgrenzung_aktiva_vj': 'number',
    'bilanzsumme_aktiva': 'number',
    'bilanzsumme_aktiva_vj': 'number',
    'gezeichnetes_kapital': 'number',
    'gezeichnetes_kapital_vj': 'number',
    'kapitalruecklagen': 'number',
    'kapitalruecklagen_vj': 'number',
    'gewinnruecklagen': 'number',
    'gewinnruecklagen_vj': 'number',
    'jahresueberschuss_bilanz': 'number',
    'jahresueberschuss_bilanz_vj': 'number',
    'eigenkapital_gesamt': 'number',
    'eigenkapital_gesamt_vj': 'number',
    'rueckstellungen': 'number',
    'rueckstellungen_vj': 'number',
    'verbindlichkeiten_kreditinstitute': 'number',
    'verbindlichkeiten_kreditinstitute_vj': 'number',
    'verbindlichkeiten_llg': 'number',
    'verbindlichkeiten_llg_vj': 'number',
    'sonstige_verbindlichkeiten': 'number',
    'sonstige_verbindlichkeiten_vj': 'number',
    'fremdkapital_gesamt': 'number',
    'fremdkapital_gesamt_vj': 'number',
    'rechnungsabgrenzung_passiva': 'number',
    'rechnungsabgrenzung_passiva_vj': 'number',
    'bilanzsumme_passiva': 'number',
    'bilanzsumme_passiva_vj': 'number',
    'bilanz_anmerkungen': 'string/textarea',
  },
  'gewinn__und_verlustrechnung': {
    'ebit_vj': 'number',
    'guv_unternehmen': 'applookup/select',
    'guv_geschaeftsjahr': 'string/text',
    'guv_waehrung': 'lookup/select',
    'guv_einheit': 'lookup/select',
    'umsatzerloese': 'number',
    'umsatzerloese_vj': 'number',
    'bestandsveraenderungen': 'number',
    'bestandsveraenderungen_vj': 'number',
    'sonstige_betriebliche_ertraege': 'number',
    'sonstige_betriebliche_ertraege_vj': 'number',
    'gesamtleistung': 'number',
    'gesamtleistung_vj': 'number',
    'materialaufwand': 'number',
    'materialaufwand_vj': 'number',
    'personalaufwand': 'number',
    'personalaufwand_vj': 'number',
    'abschreibungen': 'number',
    'abschreibungen_vj': 'number',
    'sonstige_betriebliche_aufwendungen': 'number',
    'sonstige_betriebliche_aufwendungen_vj': 'number',
    'ebitda': 'number',
    'ebitda_vj': 'number',
    'ebit': 'number',
    'zinsertraege': 'number',
    'zinsertraege_vj': 'number',
    'zinsaufwendungen': 'number',
    'zinsaufwendungen_vj': 'number',
    'ebt': 'number',
    'ebt_vj': 'number',
    'steuern': 'number',
    'steuern_vj': 'number',
    'jahresueberschuss_guv': 'number',
    'jahresueberschuss_guv_vj': 'number',
    'guv_anmerkungen': 'string/textarea',
  },
  'kennzahlenanalyse': {
    'kz_bilanz': 'applookup/select',
    'kz_guv': 'applookup/select',
    'eigenkapitalquote': 'number',
    'fremdkapitalquote': 'number',
    'verschuldungsgrad': 'number',
    'anlagendeckungsgrad_1': 'number',
    'anlagendeckungsgrad_2': 'number',
    'liquiditaet_1': 'number',
    'liquiditaet_2': 'number',
    'liquiditaet_3': 'number',
    'working_capital': 'number',
    'eigenkapitalrendite': 'number',
    'gesamtkapitalrendite': 'number',
    'umsatzrendite': 'number',
    'ebit_marge': 'number',
    'ebitda_marge': 'number',
    'kapitalumschlag': 'number',
    'debitorenlaufzeit': 'number',
    'kreditorenlaufzeit': 'number',
    'lagerdauer': 'number',
    'cashflow_operativ': 'number',
    'bonitaetsbewertung': 'lookup/select',
    'staerken': 'string/textarea',
    'schwaechen': 'string/textarea',
    'gesamtkommentar': 'string/textarea',
    'analyst_vorname': 'string/text',
    'analyst_nachname': 'string/text',
    'analysedatum': 'date/date',
  },
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateUnternehmensstammdaten = StripLookup<Unternehmensstammdaten['fields']>;
export type CreateBilanz = StripLookup<Bilanz['fields']>;
export type CreateGewinnUndVerlustrechnung = StripLookup<GewinnUndVerlustrechnung['fields']>;
export type CreateKennzahlenanalyse = StripLookup<Kennzahlenanalyse['fields']>;