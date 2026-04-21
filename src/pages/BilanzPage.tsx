import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Bilanz, Unternehmensstammdaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { BilanzDialog } from '@/components/dialogs/BilanzDialog';
import { BilanzViewDialog } from '@/components/dialogs/BilanzViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function BilanzPage() {
  const [records, setRecords] = useState<Bilanz[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Bilanz | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bilanz | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Bilanz | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [unternehmensstammdatenList, setUnternehmensstammdatenList] = useState<Unternehmensstammdaten[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, unternehmensstammdatenData] = await Promise.all([
        LivingAppsService.getBilanz(),
        LivingAppsService.getUnternehmensstammdaten(),
      ]);
      setRecords(mainData);
      setUnternehmensstammdatenList(unternehmensstammdatenData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Bilanz['fields']) {
    await LivingAppsService.createBilanzEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Bilanz['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateBilanzEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteBilanzEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getUnternehmensstammdatenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return unternehmensstammdatenList.find(r => r.record_id === id)?.fields.unternehmensname ?? '—';
  }

  const filtered = records.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return Object.values(r.fields).some(v => {
      if (v == null) return false;
      if (Array.isArray(v)) return v.some(item => typeof item === 'object' && item !== null && 'label' in item ? String((item as any).label).toLowerCase().includes(s) : String(item).toLowerCase().includes(s));
      if (typeof v === 'object' && 'label' in (v as any)) return String((v as any).label).toLowerCase().includes(s);
      return String(v).toLowerCase().includes(s);
    });
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <PageShell
      title="Bilanz"
      subtitle={`${records.length} Bilanz im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Bilanz suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bilanz_unternehmen')}>
                <span className="inline-flex items-center gap-1">
                  Unternehmen
                  {sortKey === 'bilanz_unternehmen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('geschaeftsjahr')}>
                <span className="inline-flex items-center gap-1">
                  Geschäftsjahr
                  {sortKey === 'geschaeftsjahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bilanzstichtag')}>
                <span className="inline-flex items-center gap-1">
                  Bilanzstichtag
                  {sortKey === 'bilanzstichtag' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('waehrung')}>
                <span className="inline-flex items-center gap-1">
                  Währung
                  {sortKey === 'waehrung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('einheit')}>
                <span className="inline-flex items-center gap-1">
                  Einheit der Beträge
                  {sortKey === 'einheit' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('immaterielle_vermoegensgegenstaende')}>
                <span className="inline-flex items-center gap-1">
                  Immaterielle Vermögensgegenstände
                  {sortKey === 'immaterielle_vermoegensgegenstaende' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('immaterielle_vermoegensgegenstaende_vj')}>
                <span className="inline-flex items-center gap-1">
                  Immaterielle Vermögensgegenstände (Vorjahr)
                  {sortKey === 'immaterielle_vermoegensgegenstaende_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sachanlagen')}>
                <span className="inline-flex items-center gap-1">
                  Sachanlagen
                  {sortKey === 'sachanlagen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sachanlagen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Sachanlagen (Vorjahr)
                  {sortKey === 'sachanlagen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('finanzanlagen')}>
                <span className="inline-flex items-center gap-1">
                  Finanzanlagen
                  {sortKey === 'finanzanlagen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('finanzanlagen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Finanzanlagen (Vorjahr)
                  {sortKey === 'finanzanlagen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anlagevermoegen_gesamt')}>
                <span className="inline-flex items-center gap-1">
                  Anlagevermögen gesamt
                  {sortKey === 'anlagevermoegen_gesamt' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anlagevermoegen_gesamt_vj')}>
                <span className="inline-flex items-center gap-1">
                  Anlagevermögen gesamt (Vorjahr)
                  {sortKey === 'anlagevermoegen_gesamt_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('vorraethe')}>
                <span className="inline-flex items-center gap-1">
                  Vorräte
                  {sortKey === 'vorraethe' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('vorraethe_vj')}>
                <span className="inline-flex items-center gap-1">
                  Vorräte (Vorjahr)
                  {sortKey === 'vorraethe_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('forderungen_llg')}>
                <span className="inline-flex items-center gap-1">
                  Forderungen aus Lieferungen und Leistungen
                  {sortKey === 'forderungen_llg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('forderungen_llg_vj')}>
                <span className="inline-flex items-center gap-1">
                  Forderungen aus Lieferungen und Leistungen (Vorjahr)
                  {sortKey === 'forderungen_llg_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstige_forderungen')}>
                <span className="inline-flex items-center gap-1">
                  Sonstige Forderungen und Vermögensgegenstände
                  {sortKey === 'sonstige_forderungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstige_forderungen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Sonstige Forderungen und Vermögensgegenstände (Vorjahr)
                  {sortKey === 'sonstige_forderungen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kassenbestand')}>
                <span className="inline-flex items-center gap-1">
                  Kassenbestand / Bankguthaben
                  {sortKey === 'kassenbestand' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kassenbestand_vj')}>
                <span className="inline-flex items-center gap-1">
                  Kassenbestand / Bankguthaben (Vorjahr)
                  {sortKey === 'kassenbestand_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umlaufvermoegen_gesamt')}>
                <span className="inline-flex items-center gap-1">
                  Umlaufvermögen gesamt
                  {sortKey === 'umlaufvermoegen_gesamt' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umlaufvermoegen_gesamt_vj')}>
                <span className="inline-flex items-center gap-1">
                  Umlaufvermögen gesamt (Vorjahr)
                  {sortKey === 'umlaufvermoegen_gesamt_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rechnungsabgrenzung_aktiva')}>
                <span className="inline-flex items-center gap-1">
                  Aktive Rechnungsabgrenzungsposten
                  {sortKey === 'rechnungsabgrenzung_aktiva' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rechnungsabgrenzung_aktiva_vj')}>
                <span className="inline-flex items-center gap-1">
                  Aktive Rechnungsabgrenzungsposten (Vorjahr)
                  {sortKey === 'rechnungsabgrenzung_aktiva_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bilanzsumme_aktiva')}>
                <span className="inline-flex items-center gap-1">
                  Bilanzsumme Aktiva
                  {sortKey === 'bilanzsumme_aktiva' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bilanzsumme_aktiva_vj')}>
                <span className="inline-flex items-center gap-1">
                  Bilanzsumme Aktiva (Vorjahr)
                  {sortKey === 'bilanzsumme_aktiva_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gezeichnetes_kapital')}>
                <span className="inline-flex items-center gap-1">
                  Gezeichnetes Kapital
                  {sortKey === 'gezeichnetes_kapital' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gezeichnetes_kapital_vj')}>
                <span className="inline-flex items-center gap-1">
                  Gezeichnetes Kapital (Vorjahr)
                  {sortKey === 'gezeichnetes_kapital_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kapitalruecklagen')}>
                <span className="inline-flex items-center gap-1">
                  Kapitalrücklagen
                  {sortKey === 'kapitalruecklagen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kapitalruecklagen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Kapitalrücklagen (Vorjahr)
                  {sortKey === 'kapitalruecklagen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gewinnruecklagen')}>
                <span className="inline-flex items-center gap-1">
                  Gewinnrücklagen
                  {sortKey === 'gewinnruecklagen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gewinnruecklagen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Gewinnrücklagen (Vorjahr)
                  {sortKey === 'gewinnruecklagen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('jahresueberschuss_bilanz')}>
                <span className="inline-flex items-center gap-1">
                  Jahresüberschuss / Jahresfehlbetrag
                  {sortKey === 'jahresueberschuss_bilanz' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('jahresueberschuss_bilanz_vj')}>
                <span className="inline-flex items-center gap-1">
                  Jahresüberschuss / Jahresfehlbetrag (Vorjahr)
                  {sortKey === 'jahresueberschuss_bilanz_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('eigenkapital_gesamt')}>
                <span className="inline-flex items-center gap-1">
                  Eigenkapital gesamt
                  {sortKey === 'eigenkapital_gesamt' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('eigenkapital_gesamt_vj')}>
                <span className="inline-flex items-center gap-1">
                  Eigenkapital gesamt (Vorjahr)
                  {sortKey === 'eigenkapital_gesamt_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rueckstellungen')}>
                <span className="inline-flex items-center gap-1">
                  Rückstellungen
                  {sortKey === 'rueckstellungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rueckstellungen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Rückstellungen (Vorjahr)
                  {sortKey === 'rueckstellungen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('verbindlichkeiten_kreditinstitute')}>
                <span className="inline-flex items-center gap-1">
                  Verbindlichkeiten gegenüber Kreditinstituten
                  {sortKey === 'verbindlichkeiten_kreditinstitute' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('verbindlichkeiten_kreditinstitute_vj')}>
                <span className="inline-flex items-center gap-1">
                  Verbindlichkeiten gegenüber Kreditinstituten (Vorjahr)
                  {sortKey === 'verbindlichkeiten_kreditinstitute_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('verbindlichkeiten_llg')}>
                <span className="inline-flex items-center gap-1">
                  Verbindlichkeiten aus Lieferungen und Leistungen
                  {sortKey === 'verbindlichkeiten_llg' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('verbindlichkeiten_llg_vj')}>
                <span className="inline-flex items-center gap-1">
                  Verbindlichkeiten aus Lieferungen und Leistungen (Vorjahr)
                  {sortKey === 'verbindlichkeiten_llg_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstige_verbindlichkeiten')}>
                <span className="inline-flex items-center gap-1">
                  Sonstige Verbindlichkeiten
                  {sortKey === 'sonstige_verbindlichkeiten' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstige_verbindlichkeiten_vj')}>
                <span className="inline-flex items-center gap-1">
                  Sonstige Verbindlichkeiten (Vorjahr)
                  {sortKey === 'sonstige_verbindlichkeiten_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('fremdkapital_gesamt')}>
                <span className="inline-flex items-center gap-1">
                  Fremdkapital gesamt
                  {sortKey === 'fremdkapital_gesamt' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('fremdkapital_gesamt_vj')}>
                <span className="inline-flex items-center gap-1">
                  Fremdkapital gesamt (Vorjahr)
                  {sortKey === 'fremdkapital_gesamt_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rechnungsabgrenzung_passiva')}>
                <span className="inline-flex items-center gap-1">
                  Passive Rechnungsabgrenzungsposten
                  {sortKey === 'rechnungsabgrenzung_passiva' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('rechnungsabgrenzung_passiva_vj')}>
                <span className="inline-flex items-center gap-1">
                  Passive Rechnungsabgrenzungsposten (Vorjahr)
                  {sortKey === 'rechnungsabgrenzung_passiva_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bilanzsumme_passiva')}>
                <span className="inline-flex items-center gap-1">
                  Bilanzsumme Passiva
                  {sortKey === 'bilanzsumme_passiva' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bilanzsumme_passiva_vj')}>
                <span className="inline-flex items-center gap-1">
                  Bilanzsumme Passiva (Vorjahr)
                  {sortKey === 'bilanzsumme_passiva_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bilanz_anmerkungen')}>
                <span className="inline-flex items-center gap-1">
                  Anmerkungen zur Bilanz
                  {sortKey === 'bilanz_anmerkungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getUnternehmensstammdatenDisplayName(record.fields.bilanz_unternehmen)}</span></TableCell>
                <TableCell className="font-medium">{record.fields.geschaeftsjahr ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.bilanzstichtag)}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.waehrung?.label ?? '—'}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.einheit?.label ?? '—'}</span></TableCell>
                <TableCell>{record.fields.immaterielle_vermoegensgegenstaende ?? '—'}</TableCell>
                <TableCell>{record.fields.immaterielle_vermoegensgegenstaende_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.sachanlagen ?? '—'}</TableCell>
                <TableCell>{record.fields.sachanlagen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.finanzanlagen ?? '—'}</TableCell>
                <TableCell>{record.fields.finanzanlagen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.anlagevermoegen_gesamt ?? '—'}</TableCell>
                <TableCell>{record.fields.anlagevermoegen_gesamt_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.vorraethe ?? '—'}</TableCell>
                <TableCell>{record.fields.vorraethe_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.forderungen_llg ?? '—'}</TableCell>
                <TableCell>{record.fields.forderungen_llg_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.sonstige_forderungen ?? '—'}</TableCell>
                <TableCell>{record.fields.sonstige_forderungen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.kassenbestand ?? '—'}</TableCell>
                <TableCell>{record.fields.kassenbestand_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.umlaufvermoegen_gesamt ?? '—'}</TableCell>
                <TableCell>{record.fields.umlaufvermoegen_gesamt_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.rechnungsabgrenzung_aktiva ?? '—'}</TableCell>
                <TableCell>{record.fields.rechnungsabgrenzung_aktiva_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.bilanzsumme_aktiva ?? '—'}</TableCell>
                <TableCell>{record.fields.bilanzsumme_aktiva_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.gezeichnetes_kapital ?? '—'}</TableCell>
                <TableCell>{record.fields.gezeichnetes_kapital_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.kapitalruecklagen ?? '—'}</TableCell>
                <TableCell>{record.fields.kapitalruecklagen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.gewinnruecklagen ?? '—'}</TableCell>
                <TableCell>{record.fields.gewinnruecklagen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.jahresueberschuss_bilanz ?? '—'}</TableCell>
                <TableCell>{record.fields.jahresueberschuss_bilanz_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.eigenkapital_gesamt ?? '—'}</TableCell>
                <TableCell>{record.fields.eigenkapital_gesamt_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.rueckstellungen ?? '—'}</TableCell>
                <TableCell>{record.fields.rueckstellungen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.verbindlichkeiten_kreditinstitute ?? '—'}</TableCell>
                <TableCell>{record.fields.verbindlichkeiten_kreditinstitute_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.verbindlichkeiten_llg ?? '—'}</TableCell>
                <TableCell>{record.fields.verbindlichkeiten_llg_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.sonstige_verbindlichkeiten ?? '—'}</TableCell>
                <TableCell>{record.fields.sonstige_verbindlichkeiten_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.fremdkapital_gesamt ?? '—'}</TableCell>
                <TableCell>{record.fields.fremdkapital_gesamt_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.rechnungsabgrenzung_passiva ?? '—'}</TableCell>
                <TableCell>{record.fields.rechnungsabgrenzung_passiva_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.bilanzsumme_passiva ?? '—'}</TableCell>
                <TableCell>{record.fields.bilanzsumme_passiva_vj ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.bilanz_anmerkungen ?? '—'}</span></TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => setEditingRecord(record)}>
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(record)}>
                      <IconTrash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={53} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Bilanz. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <BilanzDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        unternehmensstammdatenList={unternehmensstammdatenList}
        enablePhotoScan={AI_PHOTO_SCAN['Bilanz']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Bilanz']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Bilanz löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <BilanzViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        unternehmensstammdatenList={unternehmensstammdatenList}
      />
    </PageShell>
  );
}