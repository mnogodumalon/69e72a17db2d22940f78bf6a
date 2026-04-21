import { useState, useMemo, useCallback } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import type { Unternehmensstammdaten, Bilanz, GewinnUndVerlustrechnung, Kennzahlenanalyse } from '@/types/app';
import { LivingAppsService, extractRecordId, cleanFieldsForApi } from '@/services/livingAppsService';
import { UnternehmensstammdatenDialog } from '@/components/dialogs/UnternehmensstammdatenDialog';
import { UnternehmensstammdatenViewDialog } from '@/components/dialogs/UnternehmensstammdatenViewDialog';
import { BilanzDialog } from '@/components/dialogs/BilanzDialog';
import { BilanzViewDialog } from '@/components/dialogs/BilanzViewDialog';
import { GewinnUndVerlustrechnungDialog } from '@/components/dialogs/GewinnUndVerlustrechnungDialog';
import { GewinnUndVerlustrechnungViewDialog } from '@/components/dialogs/GewinnUndVerlustrechnungViewDialog';
import { KennzahlenanalyseDialog } from '@/components/dialogs/KennzahlenanalyseDialog';
import { KennzahlenanalyseViewDialog } from '@/components/dialogs/KennzahlenanalyseViewDialog';
import { BulkEditDialog } from '@/components/dialogs/BulkEditDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconPencil, IconTrash, IconPlus, IconFilter, IconX, IconArrowsUpDown, IconArrowUp, IconArrowDown, IconSearch, IconCopy } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function fmtDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

// Field metadata per entity for bulk edit and column filters
const UNTERNEHMENSSTAMMDATEN_FIELDS = [
  { key: 'unternehmensname', label: 'Unternehmensname', type: 'string/text' },
  { key: 'rechtsform', label: 'Rechtsform', type: 'lookup/select', options: [{ key: 'sonstige', label: 'Sonstige' }, { key: 'gmbh', label: 'GmbH' }, { key: 'ag', label: 'AG' }, { key: 'gmbh_co_kg', label: 'GmbH & Co. KG' }, { key: 'kg', label: 'KG' }, { key: 'ohg', label: 'OHG' }, { key: 'einzelunternehmen', label: 'Einzelunternehmen' }, { key: 'ug', label: 'UG (haftungsbeschränkt)' }] },
  { key: 'branche', label: 'Branche', type: 'lookup/select', options: [{ key: 'industrie', label: 'Industrie / Produktion' }, { key: 'handel', label: 'Handel' }, { key: 'dienstleistung', label: 'Dienstleistung' }, { key: 'bau', label: 'Bau / Immobilien' }, { key: 'it', label: 'IT / Technologie' }, { key: 'gesundheit', label: 'Gesundheit / Pharma' }, { key: 'transport', label: 'Transport / Logistik' }, { key: 'energie', label: 'Energie / Versorgung' }, { key: 'landwirtschaft', label: 'Landwirtschaft' }, { key: 'sonstige_branche', label: 'Sonstige' }] },
  { key: 'handelsregisternummer', label: 'Handelsregisternummer', type: 'string/text' },
  { key: 'steuernummer', label: 'Steuernummer / USt-IdNr.', type: 'string/text' },
  { key: 'strasse', label: 'Straße', type: 'string/text' },
  { key: 'hausnummer', label: 'Hausnummer', type: 'string/text' },
  { key: 'plz', label: 'Postleitzahl', type: 'string/text' },
  { key: 'ort', label: 'Ort', type: 'string/text' },
  { key: 'land', label: 'Land', type: 'string/text' },
  { key: 'ansprechpartner_vorname', label: 'Vorname Ansprechpartner', type: 'string/text' },
  { key: 'ansprechpartner_nachname', label: 'Nachname Ansprechpartner', type: 'string/text' },
  { key: 'ansprechpartner_email', label: 'E-Mail Ansprechpartner', type: 'string/email' },
  { key: 'ansprechpartner_telefon', label: 'Telefon Ansprechpartner', type: 'string/tel' },
  { key: 'bemerkungen', label: 'Bemerkungen', type: 'string/textarea' },
];
const BILANZ_FIELDS = [
  { key: 'bilanz_unternehmen', label: 'Unternehmen', type: 'applookup/select', targetEntity: 'unternehmensstammdaten', targetAppId: 'UNTERNEHMENSSTAMMDATEN', displayField: 'unternehmensname' },
  { key: 'geschaeftsjahr', label: 'Geschäftsjahr', type: 'string/text' },
  { key: 'bilanzstichtag', label: 'Bilanzstichtag', type: 'date/date' },
  { key: 'waehrung', label: 'Währung', type: 'lookup/select', options: [{ key: 'eur', label: 'EUR (Euro)' }, { key: 'usd', label: 'USD (US-Dollar)' }, { key: 'chf', label: 'CHF (Schweizer Franken)' }, { key: 'gbp', label: 'GBP (Britisches Pfund)' }] },
  { key: 'einheit', label: 'Einheit der Beträge', type: 'lookup/select', options: [{ key: 'euro', label: 'Euro (volle Beträge)' }, { key: 'teur', label: 'Tausend Euro (TEUR)' }, { key: 'meur', label: 'Millionen Euro (MEUR)' }] },
  { key: 'immaterielle_vermoegensgegenstaende', label: 'Immaterielle Vermögensgegenstände', type: 'number' },
  { key: 'immaterielle_vermoegensgegenstaende_vj', label: 'Immaterielle Vermögensgegenstände (Vorjahr)', type: 'number' },
  { key: 'sachanlagen', label: 'Sachanlagen', type: 'number' },
  { key: 'sachanlagen_vj', label: 'Sachanlagen (Vorjahr)', type: 'number' },
  { key: 'finanzanlagen', label: 'Finanzanlagen', type: 'number' },
  { key: 'finanzanlagen_vj', label: 'Finanzanlagen (Vorjahr)', type: 'number' },
  { key: 'anlagevermoegen_gesamt', label: 'Anlagevermögen gesamt', type: 'number' },
  { key: 'anlagevermoegen_gesamt_vj', label: 'Anlagevermögen gesamt (Vorjahr)', type: 'number' },
  { key: 'vorraethe', label: 'Vorräte', type: 'number' },
  { key: 'vorraethe_vj', label: 'Vorräte (Vorjahr)', type: 'number' },
  { key: 'forderungen_llg', label: 'Forderungen aus Lieferungen und Leistungen', type: 'number' },
  { key: 'forderungen_llg_vj', label: 'Forderungen aus Lieferungen und Leistungen (Vorjahr)', type: 'number' },
  { key: 'sonstige_forderungen', label: 'Sonstige Forderungen und Vermögensgegenstände', type: 'number' },
  { key: 'sonstige_forderungen_vj', label: 'Sonstige Forderungen und Vermögensgegenstände (Vorjahr)', type: 'number' },
  { key: 'kassenbestand', label: 'Kassenbestand / Bankguthaben', type: 'number' },
  { key: 'kassenbestand_vj', label: 'Kassenbestand / Bankguthaben (Vorjahr)', type: 'number' },
  { key: 'umlaufvermoegen_gesamt', label: 'Umlaufvermögen gesamt', type: 'number' },
  { key: 'umlaufvermoegen_gesamt_vj', label: 'Umlaufvermögen gesamt (Vorjahr)', type: 'number' },
  { key: 'rechnungsabgrenzung_aktiva', label: 'Aktive Rechnungsabgrenzungsposten', type: 'number' },
  { key: 'rechnungsabgrenzung_aktiva_vj', label: 'Aktive Rechnungsabgrenzungsposten (Vorjahr)', type: 'number' },
  { key: 'bilanzsumme_aktiva', label: 'Bilanzsumme Aktiva', type: 'number' },
  { key: 'bilanzsumme_aktiva_vj', label: 'Bilanzsumme Aktiva (Vorjahr)', type: 'number' },
  { key: 'gezeichnetes_kapital', label: 'Gezeichnetes Kapital', type: 'number' },
  { key: 'gezeichnetes_kapital_vj', label: 'Gezeichnetes Kapital (Vorjahr)', type: 'number' },
  { key: 'kapitalruecklagen', label: 'Kapitalrücklagen', type: 'number' },
  { key: 'kapitalruecklagen_vj', label: 'Kapitalrücklagen (Vorjahr)', type: 'number' },
  { key: 'gewinnruecklagen', label: 'Gewinnrücklagen', type: 'number' },
  { key: 'gewinnruecklagen_vj', label: 'Gewinnrücklagen (Vorjahr)', type: 'number' },
  { key: 'jahresueberschuss_bilanz', label: 'Jahresüberschuss / Jahresfehlbetrag', type: 'number' },
  { key: 'jahresueberschuss_bilanz_vj', label: 'Jahresüberschuss / Jahresfehlbetrag (Vorjahr)', type: 'number' },
  { key: 'eigenkapital_gesamt', label: 'Eigenkapital gesamt', type: 'number' },
  { key: 'eigenkapital_gesamt_vj', label: 'Eigenkapital gesamt (Vorjahr)', type: 'number' },
  { key: 'rueckstellungen', label: 'Rückstellungen', type: 'number' },
  { key: 'rueckstellungen_vj', label: 'Rückstellungen (Vorjahr)', type: 'number' },
  { key: 'verbindlichkeiten_kreditinstitute', label: 'Verbindlichkeiten gegenüber Kreditinstituten', type: 'number' },
  { key: 'verbindlichkeiten_kreditinstitute_vj', label: 'Verbindlichkeiten gegenüber Kreditinstituten (Vorjahr)', type: 'number' },
  { key: 'verbindlichkeiten_llg', label: 'Verbindlichkeiten aus Lieferungen und Leistungen', type: 'number' },
  { key: 'verbindlichkeiten_llg_vj', label: 'Verbindlichkeiten aus Lieferungen und Leistungen (Vorjahr)', type: 'number' },
  { key: 'sonstige_verbindlichkeiten', label: 'Sonstige Verbindlichkeiten', type: 'number' },
  { key: 'sonstige_verbindlichkeiten_vj', label: 'Sonstige Verbindlichkeiten (Vorjahr)', type: 'number' },
  { key: 'fremdkapital_gesamt', label: 'Fremdkapital gesamt', type: 'number' },
  { key: 'fremdkapital_gesamt_vj', label: 'Fremdkapital gesamt (Vorjahr)', type: 'number' },
  { key: 'rechnungsabgrenzung_passiva', label: 'Passive Rechnungsabgrenzungsposten', type: 'number' },
  { key: 'rechnungsabgrenzung_passiva_vj', label: 'Passive Rechnungsabgrenzungsposten (Vorjahr)', type: 'number' },
  { key: 'bilanzsumme_passiva', label: 'Bilanzsumme Passiva', type: 'number' },
  { key: 'bilanzsumme_passiva_vj', label: 'Bilanzsumme Passiva (Vorjahr)', type: 'number' },
  { key: 'bilanz_anmerkungen', label: 'Anmerkungen zur Bilanz', type: 'string/textarea' },
];
const GEWINNUNDVERLUSTRECHNUNG_FIELDS = [
  { key: 'ebit_vj', label: 'EBIT (Vorjahr)', type: 'number' },
  { key: 'guv_unternehmen', label: 'Unternehmen', type: 'applookup/select', targetEntity: 'unternehmensstammdaten', targetAppId: 'UNTERNEHMENSSTAMMDATEN', displayField: 'unternehmensname' },
  { key: 'guv_geschaeftsjahr', label: 'Geschäftsjahr', type: 'string/text' },
  { key: 'guv_waehrung', label: 'Währung', type: 'lookup/select', options: [{ key: 'eur', label: 'EUR (Euro)' }, { key: 'usd', label: 'USD (US-Dollar)' }, { key: 'chf', label: 'CHF (Schweizer Franken)' }, { key: 'gbp', label: 'GBP (Britisches Pfund)' }] },
  { key: 'guv_einheit', label: 'Einheit der Beträge', type: 'lookup/select', options: [{ key: 'euro', label: 'Euro (volle Beträge)' }, { key: 'teur', label: 'Tausend Euro (TEUR)' }, { key: 'meur', label: 'Millionen Euro (MEUR)' }] },
  { key: 'umsatzerloese', label: 'Umsatzerlöse', type: 'number' },
  { key: 'umsatzerloese_vj', label: 'Umsatzerlöse (Vorjahr)', type: 'number' },
  { key: 'bestandsveraenderungen', label: 'Bestandsveränderungen', type: 'number' },
  { key: 'bestandsveraenderungen_vj', label: 'Bestandsveränderungen (Vorjahr)', type: 'number' },
  { key: 'sonstige_betriebliche_ertraege', label: 'Sonstige betriebliche Erträge', type: 'number' },
  { key: 'sonstige_betriebliche_ertraege_vj', label: 'Sonstige betriebliche Erträge (Vorjahr)', type: 'number' },
  { key: 'gesamtleistung', label: 'Gesamtleistung', type: 'number' },
  { key: 'gesamtleistung_vj', label: 'Gesamtleistung (Vorjahr)', type: 'number' },
  { key: 'materialaufwand', label: 'Materialaufwand', type: 'number' },
  { key: 'materialaufwand_vj', label: 'Materialaufwand (Vorjahr)', type: 'number' },
  { key: 'personalaufwand', label: 'Personalaufwand', type: 'number' },
  { key: 'personalaufwand_vj', label: 'Personalaufwand (Vorjahr)', type: 'number' },
  { key: 'abschreibungen', label: 'Abschreibungen', type: 'number' },
  { key: 'abschreibungen_vj', label: 'Abschreibungen (Vorjahr)', type: 'number' },
  { key: 'sonstige_betriebliche_aufwendungen', label: 'Sonstige betriebliche Aufwendungen', type: 'number' },
  { key: 'sonstige_betriebliche_aufwendungen_vj', label: 'Sonstige betriebliche Aufwendungen (Vorjahr)', type: 'number' },
  { key: 'ebitda', label: 'EBITDA', type: 'number' },
  { key: 'ebitda_vj', label: 'EBITDA (Vorjahr)', type: 'number' },
  { key: 'ebit', label: 'EBIT (Betriebsergebnis)', type: 'number' },
  { key: 'zinsertraege', label: 'Zinserträge', type: 'number' },
  { key: 'zinsertraege_vj', label: 'Zinserträge (Vorjahr)', type: 'number' },
  { key: 'zinsaufwendungen', label: 'Zinsaufwendungen', type: 'number' },
  { key: 'zinsaufwendungen_vj', label: 'Zinsaufwendungen (Vorjahr)', type: 'number' },
  { key: 'ebt', label: 'EBT (Ergebnis vor Steuern)', type: 'number' },
  { key: 'ebt_vj', label: 'EBT (Vorjahr)', type: 'number' },
  { key: 'steuern', label: 'Steuern vom Einkommen und Ertrag', type: 'number' },
  { key: 'steuern_vj', label: 'Steuern vom Einkommen und Ertrag (Vorjahr)', type: 'number' },
  { key: 'jahresueberschuss_guv', label: 'Jahresüberschuss / Jahresfehlbetrag', type: 'number' },
  { key: 'jahresueberschuss_guv_vj', label: 'Jahresüberschuss / Jahresfehlbetrag (Vorjahr)', type: 'number' },
  { key: 'guv_anmerkungen', label: 'Anmerkungen zur GuV', type: 'string/textarea' },
];
const KENNZAHLENANALYSE_FIELDS = [
  { key: 'kz_bilanz', label: 'Zugehörige Bilanz', type: 'applookup/select', targetEntity: 'bilanz', targetAppId: 'BILANZ', displayField: 'geschaeftsjahr' },
  { key: 'kz_guv', label: 'Zugehörige Gewinn- und Verlustrechnung', type: 'applookup/select', targetEntity: 'gewinn__und_verlustrechnung', targetAppId: 'GEWINN_UND_VERLUSTRECHNUNG', displayField: 'guv_geschaeftsjahr' },
  { key: 'eigenkapitalquote', label: 'Eigenkapitalquote (%)', type: 'number' },
  { key: 'fremdkapitalquote', label: 'Fremdkapitalquote (%)', type: 'number' },
  { key: 'verschuldungsgrad', label: 'Verschuldungsgrad (FK/EK)', type: 'number' },
  { key: 'anlagendeckungsgrad_1', label: 'Anlagendeckungsgrad I (%)', type: 'number' },
  { key: 'anlagendeckungsgrad_2', label: 'Anlagendeckungsgrad II (%)', type: 'number' },
  { key: 'liquiditaet_1', label: 'Liquidität 1. Grades (%)', type: 'number' },
  { key: 'liquiditaet_2', label: 'Liquidität 2. Grades (%)', type: 'number' },
  { key: 'liquiditaet_3', label: 'Liquidität 3. Grades (%)', type: 'number' },
  { key: 'working_capital', label: 'Working Capital', type: 'number' },
  { key: 'eigenkapitalrendite', label: 'Eigenkapitalrendite (%)', type: 'number' },
  { key: 'gesamtkapitalrendite', label: 'Gesamtkapitalrendite (%)', type: 'number' },
  { key: 'umsatzrendite', label: 'Umsatzrendite (%)', type: 'number' },
  { key: 'ebit_marge', label: 'EBIT-Marge (%)', type: 'number' },
  { key: 'ebitda_marge', label: 'EBITDA-Marge (%)', type: 'number' },
  { key: 'kapitalumschlag', label: 'Kapitalumschlag', type: 'number' },
  { key: 'debitorenlaufzeit', label: 'Debitorenlaufzeit (Tage)', type: 'number' },
  { key: 'kreditorenlaufzeit', label: 'Kreditorenlaufzeit (Tage)', type: 'number' },
  { key: 'lagerdauer', label: 'Lagerdauer (Tage)', type: 'number' },
  { key: 'cashflow_operativ', label: 'Operativer Cashflow', type: 'number' },
  { key: 'bonitaetsbewertung', label: 'Bonitätsbewertung', type: 'lookup/select', options: [{ key: 'sehr_gut', label: 'Sehr gut' }, { key: 'gut', label: 'Gut' }, { key: 'befriedigend', label: 'Befriedigend' }, { key: 'ausreichend', label: 'Ausreichend' }, { key: 'mangelhaft', label: 'Mangelhaft' }, { key: 'kritisch', label: 'Kritisch' }] },
  { key: 'staerken', label: 'Stärken', type: 'string/textarea' },
  { key: 'schwaechen', label: 'Schwächen', type: 'string/textarea' },
  { key: 'gesamtkommentar', label: 'Gesamtkommentar / Fazit', type: 'string/textarea' },
  { key: 'analyst_vorname', label: 'Vorname Analyst', type: 'string/text' },
  { key: 'analyst_nachname', label: 'Nachname Analyst', type: 'string/text' },
  { key: 'analysedatum', label: 'Analysedatum', type: 'date/date' },
];

const ENTITY_TABS = [
  { key: 'unternehmensstammdaten', label: 'Unternehmensstammdaten', pascal: 'Unternehmensstammdaten' },
  { key: 'bilanz', label: 'Bilanz', pascal: 'Bilanz' },
  { key: 'gewinn__und_verlustrechnung', label: 'Gewinn- und Verlustrechnung', pascal: 'GewinnUndVerlustrechnung' },
  { key: 'kennzahlenanalyse', label: 'Kennzahlenanalyse', pascal: 'Kennzahlenanalyse' },
] as const;

type EntityKey = typeof ENTITY_TABS[number]['key'];

export default function AdminPage() {
  const data = useDashboardData();
  const { loading, error, fetchAll } = data;

  const [activeTab, setActiveTab] = useState<EntityKey>('unternehmensstammdaten');
  const [selectedIds, setSelectedIds] = useState<Record<EntityKey, Set<string>>>(() => ({
    'unternehmensstammdaten': new Set(),
    'bilanz': new Set(),
    'gewinn__und_verlustrechnung': new Set(),
    'kennzahlenanalyse': new Set(),
  }));
  const [filters, setFilters] = useState<Record<EntityKey, Record<string, string>>>(() => ({
    'unternehmensstammdaten': {},
    'bilanz': {},
    'gewinn__und_verlustrechnung': {},
    'kennzahlenanalyse': {},
  }));
  const [showFilters, setShowFilters] = useState(false);
  const [dialogState, setDialogState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [createEntity, setCreateEntity] = useState<EntityKey | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<{ entity: EntityKey; ids: string[] } | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState<EntityKey | null>(null);
  const [viewState, setViewState] = useState<{ entity: EntityKey; record: any } | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');

  const getRecords = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmensstammdaten': return (data as any).unternehmensstammdaten as Unternehmensstammdaten[] ?? [];
      case 'bilanz': return (data as any).bilanz as Bilanz[] ?? [];
      case 'gewinn__und_verlustrechnung': return (data as any).gewinnUndVerlustrechnung as GewinnUndVerlustrechnung[] ?? [];
      case 'kennzahlenanalyse': return (data as any).kennzahlenanalyse as Kennzahlenanalyse[] ?? [];
      default: return [];
    }
  }, [data]);

  const getLookupLists = useCallback((entity: EntityKey) => {
    const lists: Record<string, any[]> = {};
    switch (entity) {
      case 'bilanz':
        lists.unternehmensstammdatenList = (data as any).unternehmensstammdaten ?? [];
        break;
      case 'gewinn__und_verlustrechnung':
        lists.unternehmensstammdatenList = (data as any).unternehmensstammdaten ?? [];
        break;
      case 'kennzahlenanalyse':
        lists.bilanzList = (data as any).bilanz ?? [];
        lists.gewinn__und_verlustrechnungList = (data as any).gewinnUndVerlustrechnung ?? [];
        break;
    }
    return lists;
  }, [data]);

  const getApplookupDisplay = useCallback((entity: EntityKey, fieldKey: string, url?: unknown) => {
    if (!url) return '—';
    const id = extractRecordId(url);
    if (!id) return '—';
    const lists = getLookupLists(entity);
    void fieldKey; // ensure used for noUnusedParameters
    if (entity === 'bilanz' && fieldKey === 'bilanz_unternehmen') {
      const match = (lists.unternehmensstammdatenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.unternehmensname ?? '—';
    }
    if (entity === 'gewinn__und_verlustrechnung' && fieldKey === 'guv_unternehmen') {
      const match = (lists.unternehmensstammdatenList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.unternehmensname ?? '—';
    }
    if (entity === 'kennzahlenanalyse' && fieldKey === 'kz_bilanz') {
      const match = (lists.bilanzList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.geschaeftsjahr ?? '—';
    }
    if (entity === 'kennzahlenanalyse' && fieldKey === 'kz_guv') {
      const match = (lists.gewinn__und_verlustrechnungList ?? []).find((r: any) => r.record_id === id);
      return match?.fields.guv_geschaeftsjahr ?? '—';
    }
    return String(url);
  }, [getLookupLists]);

  const getFieldMeta = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmensstammdaten': return UNTERNEHMENSSTAMMDATEN_FIELDS;
      case 'bilanz': return BILANZ_FIELDS;
      case 'gewinn__und_verlustrechnung': return GEWINNUNDVERLUSTRECHNUNG_FIELDS;
      case 'kennzahlenanalyse': return KENNZAHLENANALYSE_FIELDS;
      default: return [];
    }
  }, []);

  const getFilteredRecords = useCallback((entity: EntityKey) => {
    const records = getRecords(entity);
    const s = search.toLowerCase();
    const searched = !s ? records : records.filter((r: any) => {
      return Object.values(r.fields).some((v: any) => {
        if (v == null) return false;
        if (Array.isArray(v)) return v.some((item: any) => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
        if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
        return String(v).toLowerCase().includes(s);
      });
    });
    const entityFilters = filters[entity] ?? {};
    const fieldMeta = getFieldMeta(entity);
    return searched.filter((r: any) => {
      return fieldMeta.every((fm: any) => {
        const fv = entityFilters[fm.key];
        if (!fv || fv === '') return true;
        const val = r.fields?.[fm.key];
        if (fm.type === 'bool') {
          if (fv === 'true') return val === true;
          if (fv === 'false') return val !== true;
          return true;
        }
        if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
          const label = val && typeof val === 'object' && 'label' in val ? val.label : '';
          return String(label).toLowerCase().includes(fv.toLowerCase());
        }
        if (fm.type.includes('multiplelookup')) {
          if (!Array.isArray(val)) return false;
          return val.some((item: any) => String(item?.label ?? '').toLowerCase().includes(fv.toLowerCase()));
        }
        if (fm.type.includes('applookup')) {
          const display = getApplookupDisplay(entity, fm.key, val);
          return String(display).toLowerCase().includes(fv.toLowerCase());
        }
        return String(val ?? '').toLowerCase().includes(fv.toLowerCase());
      });
    });
  }, [getRecords, filters, getFieldMeta, getApplookupDisplay, search]);

  function toggleSort(key: string) {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortKey(''); setSortDir('asc'); }
    } else { setSortKey(key); setSortDir('asc'); }
  }

  function sortRecords<T extends { fields: Record<string, any> }>(recs: T[]): T[] {
    if (!sortKey) return recs;
    return [...recs].sort((a, b) => {
      let va: any = a.fields[sortKey], vb: any = b.fields[sortKey];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'object' && 'label' in va) va = va.label;
      if (typeof vb === 'object' && 'label' in vb) vb = vb.label;
      if (typeof va === 'number' && typeof vb === 'number') return sortDir === 'asc' ? va - vb : vb - va;
      return sortDir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
  }

  const toggleSelect = useCallback((entity: EntityKey, id: string) => {
    setSelectedIds(prev => {
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (next[entity].has(id)) next[entity].delete(id);
      else next[entity].add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((entity: EntityKey) => {
    const filtered = getFilteredRecords(entity);
    setSelectedIds(prev => {
      const allSelected = filtered.every((r: any) => prev[entity].has(r.record_id));
      const next = { ...prev, [entity]: new Set(prev[entity]) };
      if (allSelected) {
        filtered.forEach((r: any) => next[entity].delete(r.record_id));
      } else {
        filtered.forEach((r: any) => next[entity].add(r.record_id));
      }
      return next;
    });
  }, [getFilteredRecords]);

  const clearSelection = useCallback((entity: EntityKey) => {
    setSelectedIds(prev => ({ ...prev, [entity]: new Set() }));
  }, []);

  const getServiceMethods = useCallback((entity: EntityKey) => {
    switch (entity) {
      case 'unternehmensstammdaten': return {
        create: (fields: any) => LivingAppsService.createUnternehmensstammdatenEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateUnternehmensstammdatenEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteUnternehmensstammdatenEntry(id),
      };
      case 'bilanz': return {
        create: (fields: any) => LivingAppsService.createBilanzEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateBilanzEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteBilanzEntry(id),
      };
      case 'gewinn__und_verlustrechnung': return {
        create: (fields: any) => LivingAppsService.createGewinnUndVerlustrechnungEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateGewinnUndVerlustrechnungEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteGewinnUndVerlustrechnungEntry(id),
      };
      case 'kennzahlenanalyse': return {
        create: (fields: any) => LivingAppsService.createKennzahlenanalyseEntry(fields),
        update: (id: string, fields: any) => LivingAppsService.updateKennzahlenanalyseEntry(id, fields),
        remove: (id: string) => LivingAppsService.deleteKennzahlenanalyseEntry(id),
      };
      default: return null;
    }
  }, []);

  async function handleCreate(entity: EntityKey, fields: any) {
    const svc = getServiceMethods(entity);
    if (!svc) return;
    await svc.create(fields);
    fetchAll();
    setCreateEntity(null);
  }

  async function handleUpdate(fields: any) {
    if (!dialogState) return;
    const svc = getServiceMethods(dialogState.entity);
    if (!svc) return;
    await svc.update(dialogState.record.record_id, fields);
    fetchAll();
    setDialogState(null);
  }

  async function handleBulkDelete() {
    if (!deleteTargets) return;
    const svc = getServiceMethods(deleteTargets.entity);
    if (!svc) return;
    setBulkLoading(true);
    try {
      for (const id of deleteTargets.ids) {
        await svc.remove(id);
      }
      clearSelection(deleteTargets.entity);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setDeleteTargets(null);
    }
  }

  async function handleBulkClone() {
    const svc = getServiceMethods(activeTab);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const records = getRecords(activeTab);
      const ids = Array.from(selectedIds[activeTab]);
      for (const id of ids) {
        const rec = records.find((r: any) => r.record_id === id);
        if (!rec) continue;
        const clean = cleanFieldsForApi(rec.fields, activeTab);
        await svc.create(clean as any);
      }
      clearSelection(activeTab);
      fetchAll();
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkEdit(fieldKey: string, value: any) {
    if (!bulkEditOpen) return;
    const svc = getServiceMethods(bulkEditOpen);
    if (!svc) return;
    setBulkLoading(true);
    try {
      const ids = Array.from(selectedIds[bulkEditOpen]);
      for (const id of ids) {
        await svc.update(id, { [fieldKey]: value });
      }
      clearSelection(bulkEditOpen);
      fetchAll();
    } finally {
      setBulkLoading(false);
      setBulkEditOpen(null);
    }
  }

  function updateFilter(entity: EntityKey, fieldKey: string, value: string) {
    setFilters(prev => ({
      ...prev,
      [entity]: { ...prev[entity], [fieldKey]: value },
    }));
  }

  function clearEntityFilters(entity: EntityKey) {
    setFilters(prev => ({ ...prev, [entity]: {} }));
  }

  const activeFilterCount = useMemo(() => {
    const f = filters[activeTab] ?? {};
    return Object.values(f).filter(v => v && v !== '').length;
  }, [filters, activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <p className="text-destructive">{error.message}</p>
        <Button onClick={fetchAll}>Erneut versuchen</Button>
      </div>
    );
  }

  const filtered = getFilteredRecords(activeTab);
  const sel = selectedIds[activeTab];
  const allFiltered = filtered.every((r: any) => sel.has(r.record_id)) && filtered.length > 0;
  const fieldMeta = getFieldMeta(activeTab);

  return (
    <PageShell
      title="Verwaltung"
      subtitle="Alle Daten verwalten"
      action={
        <Button onClick={() => setCreateEntity(activeTab)} className="shrink-0">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="flex gap-2 flex-wrap">
        {ENTITY_TABS.map(tab => {
          const count = getRecords(tab.key).length;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); setSortKey(''); setSortDir('asc'); fetchAll(); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {tab.label}
              <Badge variant="secondary" className="ml-1 text-xs">{count}</Badge>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm">
            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Suchen..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(f => !f)} className="gap-2">
            <IconFilter className="h-4 w-4" />
            Filtern
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1">{activeFilterCount}</Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={() => clearEntityFilters(activeTab)}>
              Filter zurücksetzen
            </Button>
          )}
        </div>
        {sel.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap bg-muted/60 rounded-lg px-3 py-1.5">
            <span className="text-sm font-medium">{sel.size} ausgewählt</span>
            <Button variant="outline" size="sm" onClick={() => setBulkEditOpen(activeTab)}>
              <IconPencil className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Feld bearbeiten</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkClone()}>
              <IconCopy className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Kopieren</span>
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteTargets({ entity: activeTab, ids: Array.from(sel) })}>
              <IconTrash className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Ausgewählte löschen</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSelection(activeTab)}>
              <IconX className="h-3.5 w-3.5 sm:mr-1" /> <span className="hidden sm:inline">Auswahl aufheben</span>
            </Button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-4 rounded-lg border bg-muted/30">
          {fieldMeta.map((fm: any) => (
            <div key={fm.key} className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">{fm.label}</label>
              {fm.type === 'bool' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="true">Ja</SelectItem>
                    <SelectItem value="false">Nein</SelectItem>
                  </SelectContent>
                </Select>
              ) : fm.type === 'lookup/select' || fm.type === 'lookup/radio' ? (
                <Select value={filters[activeTab]?.[fm.key] ?? ''} onValueChange={v => updateFilter(activeTab, fm.key, v === 'all' ? '' : v)}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Alle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {fm.options?.map((o: any) => (
                      <SelectItem key={o.key} value={o.label}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-8 text-xs"
                  placeholder="Filtern..."
                  value={filters[activeTab]?.[fm.key] ?? ''}
                  onChange={e => updateFilter(activeTab, fm.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[27px] bg-card shadow-lg overflow-x-auto">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="w-10 px-6">
                <Checkbox
                  checked={allFiltered}
                  onCheckedChange={() => toggleSelectAll(activeTab)}
                />
              </TableHead>
              {fieldMeta.map((fm: any) => (
                <TableHead key={fm.key} className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort(fm.key)}>
                  <span className="inline-flex items-center gap-1">
                    {fm.label}
                    {sortKey === fm.key ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                  </span>
                </TableHead>
              ))}
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map((record: any) => (
              <TableRow key={record.record_id} className={`transition-colors cursor-pointer ${sel.has(record.record_id) ? "bg-primary/5" : "hover:bg-muted/50"}`} onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewState({ entity: activeTab, record }); }}>
                <TableCell>
                  <Checkbox
                    checked={sel.has(record.record_id)}
                    onCheckedChange={() => toggleSelect(activeTab, record.record_id)}
                  />
                </TableCell>
                {fieldMeta.map((fm: any) => {
                  const val = record.fields?.[fm.key];
                  if (fm.type === 'bool') {
                    return (
                      <TableCell key={fm.key}>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                          val ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                        }`}>
                          {val ? 'Ja' : 'Nein'}
                        </span>
                      </TableCell>
                    );
                  }
                  if (fm.type === 'lookup/select' || fm.type === 'lookup/radio') {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{val?.label ?? '—'}</span></TableCell>;
                  }
                  if (fm.type.includes('multiplelookup')) {
                    return <TableCell key={fm.key}>{Array.isArray(val) ? val.map((v: any) => v?.label ?? v).join(', ') : '—'}</TableCell>;
                  }
                  if (fm.type.includes('applookup')) {
                    return <TableCell key={fm.key}><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getApplookupDisplay(activeTab, fm.key, val)}</span></TableCell>;
                  }
                  if (fm.type.includes('date')) {
                    return <TableCell key={fm.key} className="text-muted-foreground">{fmtDate(val)}</TableCell>;
                  }
                  if (fm.type.startsWith('file')) {
                    return (
                      <TableCell key={fm.key}>
                        {val ? (
                          <div className="relative h-8 w-8 rounded bg-muted overflow-hidden">
                            <img src={val} alt="" className="h-full w-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          </div>
                        ) : '—'}
                      </TableCell>
                    );
                  }
                  if (fm.type === 'string/textarea') {
                    return <TableCell key={fm.key} className="max-w-xs"><span className="truncate block">{val ?? '—'}</span></TableCell>;
                  }
                  if (fm.type === 'geo') {
                    return (
                      <TableCell key={fm.key} className="max-w-[200px]">
                        <span className="truncate block" title={val ? `${val.lat}, ${val.long}` : undefined}>
                          {val?.info ?? (val ? `${val.lat?.toFixed(4)}, ${val.long?.toFixed(4)}` : '—')}
                        </span>
                      </TableCell>
                    );
                  }
                  return <TableCell key={fm.key}>{val ?? '—'}</TableCell>;
                })}
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setDialogState({ entity: activeTab, record })}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTargets({ entity: activeTab, ids: [record.record_id] })}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={fieldMeta.length + 2} className="text-center py-16 text-muted-foreground">
                  Keine Ergebnisse gefunden.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(createEntity === 'unternehmensstammdaten' || dialogState?.entity === 'unternehmensstammdaten') && (
        <UnternehmensstammdatenDialog
          open={createEntity === 'unternehmensstammdaten' || dialogState?.entity === 'unternehmensstammdaten'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'unternehmensstammdaten' ? handleUpdate : (fields: any) => handleCreate('unternehmensstammdaten', fields)}
          defaultValues={dialogState?.entity === 'unternehmensstammdaten' ? dialogState.record?.fields : undefined}
          enablePhotoScan={AI_PHOTO_SCAN['Unternehmensstammdaten']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmensstammdaten']}
        />
      )}
      {(createEntity === 'bilanz' || dialogState?.entity === 'bilanz') && (
        <BilanzDialog
          open={createEntity === 'bilanz' || dialogState?.entity === 'bilanz'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'bilanz' ? handleUpdate : (fields: any) => handleCreate('bilanz', fields)}
          defaultValues={dialogState?.entity === 'bilanz' ? dialogState.record?.fields : undefined}
          unternehmensstammdatenList={(data as any).unternehmensstammdaten ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Bilanz']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Bilanz']}
        />
      )}
      {(createEntity === 'gewinn__und_verlustrechnung' || dialogState?.entity === 'gewinn__und_verlustrechnung') && (
        <GewinnUndVerlustrechnungDialog
          open={createEntity === 'gewinn__und_verlustrechnung' || dialogState?.entity === 'gewinn__und_verlustrechnung'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'gewinn__und_verlustrechnung' ? handleUpdate : (fields: any) => handleCreate('gewinn__und_verlustrechnung', fields)}
          defaultValues={dialogState?.entity === 'gewinn__und_verlustrechnung' ? dialogState.record?.fields : undefined}
          unternehmensstammdatenList={(data as any).unternehmensstammdaten ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['GewinnUndVerlustrechnung']}
          enablePhotoLocation={AI_PHOTO_LOCATION['GewinnUndVerlustrechnung']}
        />
      )}
      {(createEntity === 'kennzahlenanalyse' || dialogState?.entity === 'kennzahlenanalyse') && (
        <KennzahlenanalyseDialog
          open={createEntity === 'kennzahlenanalyse' || dialogState?.entity === 'kennzahlenanalyse'}
          onClose={() => { setCreateEntity(null); setDialogState(null); }}
          onSubmit={dialogState?.entity === 'kennzahlenanalyse' ? handleUpdate : (fields: any) => handleCreate('kennzahlenanalyse', fields)}
          defaultValues={dialogState?.entity === 'kennzahlenanalyse' ? dialogState.record?.fields : undefined}
          bilanzList={(data as any).bilanz ?? []}
          gewinn__und_verlustrechnungList={(data as any).gewinnUndVerlustrechnung ?? []}
          enablePhotoScan={AI_PHOTO_SCAN['Kennzahlenanalyse']}
          enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlenanalyse']}
        />
      )}
      {viewState?.entity === 'unternehmensstammdaten' && (
        <UnternehmensstammdatenViewDialog
          open={viewState?.entity === 'unternehmensstammdaten'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'unternehmensstammdaten', record: r }); }}
        />
      )}
      {viewState?.entity === 'bilanz' && (
        <BilanzViewDialog
          open={viewState?.entity === 'bilanz'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'bilanz', record: r }); }}
          unternehmensstammdatenList={(data as any).unternehmensstammdaten ?? []}
        />
      )}
      {viewState?.entity === 'gewinn__und_verlustrechnung' && (
        <GewinnUndVerlustrechnungViewDialog
          open={viewState?.entity === 'gewinn__und_verlustrechnung'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'gewinn__und_verlustrechnung', record: r }); }}
          unternehmensstammdatenList={(data as any).unternehmensstammdaten ?? []}
        />
      )}
      {viewState?.entity === 'kennzahlenanalyse' && (
        <KennzahlenanalyseViewDialog
          open={viewState?.entity === 'kennzahlenanalyse'}
          onClose={() => setViewState(null)}
          record={viewState?.record}
          onEdit={(r: any) => { setViewState(null); setDialogState({ entity: 'kennzahlenanalyse', record: r }); }}
          bilanzList={(data as any).bilanz ?? []}
          gewinn__und_verlustrechnungList={(data as any).gewinnUndVerlustrechnung ?? []}
        />
      )}

      <BulkEditDialog
        open={!!bulkEditOpen}
        onClose={() => setBulkEditOpen(null)}
        onApply={handleBulkEdit}
        fields={bulkEditOpen ? getFieldMeta(bulkEditOpen) : []}
        selectedCount={bulkEditOpen ? selectedIds[bulkEditOpen].size : 0}
        loading={bulkLoading}
        lookupLists={bulkEditOpen ? getLookupLists(bulkEditOpen) : {}}
      />

      <ConfirmDialog
        open={!!deleteTargets}
        onClose={() => setDeleteTargets(null)}
        onConfirm={handleBulkDelete}
        title="Ausgewählte löschen"
        description={`Sollen ${deleteTargets?.ids.length ?? 0} Einträge wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden.`}
      />
    </PageShell>
  );
}