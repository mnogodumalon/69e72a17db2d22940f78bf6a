import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { GewinnUndVerlustrechnung, Unternehmensstammdaten } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { GewinnUndVerlustrechnungDialog } from '@/components/dialogs/GewinnUndVerlustrechnungDialog';
import { GewinnUndVerlustrechnungViewDialog } from '@/components/dialogs/GewinnUndVerlustrechnungViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';

export default function GewinnUndVerlustrechnungPage() {
  const [records, setRecords] = useState<GewinnUndVerlustrechnung[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<GewinnUndVerlustrechnung | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GewinnUndVerlustrechnung | null>(null);
  const [viewingRecord, setViewingRecord] = useState<GewinnUndVerlustrechnung | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [unternehmensstammdatenList, setUnternehmensstammdatenList] = useState<Unternehmensstammdaten[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, unternehmensstammdatenData] = await Promise.all([
        LivingAppsService.getGewinnUndVerlustrechnung(),
        LivingAppsService.getUnternehmensstammdaten(),
      ]);
      setRecords(mainData);
      setUnternehmensstammdatenList(unternehmensstammdatenData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: GewinnUndVerlustrechnung['fields']) {
    await LivingAppsService.createGewinnUndVerlustrechnungEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: GewinnUndVerlustrechnung['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateGewinnUndVerlustrechnungEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteGewinnUndVerlustrechnungEntry(deleteTarget.record_id);
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
      title="Gewinn- und Verlustrechnung"
      subtitle={`${records.length} Gewinn- und Verlustrechnung im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Gewinn- und Verlustrechnung suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ebit_vj')}>
                <span className="inline-flex items-center gap-1">
                  EBIT (Vorjahr)
                  {sortKey === 'ebit_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('guv_unternehmen')}>
                <span className="inline-flex items-center gap-1">
                  Unternehmen
                  {sortKey === 'guv_unternehmen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('guv_geschaeftsjahr')}>
                <span className="inline-flex items-center gap-1">
                  Geschäftsjahr
                  {sortKey === 'guv_geschaeftsjahr' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('guv_waehrung')}>
                <span className="inline-flex items-center gap-1">
                  Währung
                  {sortKey === 'guv_waehrung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('guv_einheit')}>
                <span className="inline-flex items-center gap-1">
                  Einheit der Beträge
                  {sortKey === 'guv_einheit' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatzerloese')}>
                <span className="inline-flex items-center gap-1">
                  Umsatzerlöse
                  {sortKey === 'umsatzerloese' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatzerloese_vj')}>
                <span className="inline-flex items-center gap-1">
                  Umsatzerlöse (Vorjahr)
                  {sortKey === 'umsatzerloese_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bestandsveraenderungen')}>
                <span className="inline-flex items-center gap-1">
                  Bestandsveränderungen
                  {sortKey === 'bestandsveraenderungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bestandsveraenderungen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Bestandsveränderungen (Vorjahr)
                  {sortKey === 'bestandsveraenderungen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstige_betriebliche_ertraege')}>
                <span className="inline-flex items-center gap-1">
                  Sonstige betriebliche Erträge
                  {sortKey === 'sonstige_betriebliche_ertraege' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstige_betriebliche_ertraege_vj')}>
                <span className="inline-flex items-center gap-1">
                  Sonstige betriebliche Erträge (Vorjahr)
                  {sortKey === 'sonstige_betriebliche_ertraege_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gesamtleistung')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtleistung
                  {sortKey === 'gesamtleistung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gesamtleistung_vj')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtleistung (Vorjahr)
                  {sortKey === 'gesamtleistung_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('materialaufwand')}>
                <span className="inline-flex items-center gap-1">
                  Materialaufwand
                  {sortKey === 'materialaufwand' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('materialaufwand_vj')}>
                <span className="inline-flex items-center gap-1">
                  Materialaufwand (Vorjahr)
                  {sortKey === 'materialaufwand_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('personalaufwand')}>
                <span className="inline-flex items-center gap-1">
                  Personalaufwand
                  {sortKey === 'personalaufwand' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('personalaufwand_vj')}>
                <span className="inline-flex items-center gap-1">
                  Personalaufwand (Vorjahr)
                  {sortKey === 'personalaufwand_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('abschreibungen')}>
                <span className="inline-flex items-center gap-1">
                  Abschreibungen
                  {sortKey === 'abschreibungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('abschreibungen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Abschreibungen (Vorjahr)
                  {sortKey === 'abschreibungen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstige_betriebliche_aufwendungen')}>
                <span className="inline-flex items-center gap-1">
                  Sonstige betriebliche Aufwendungen
                  {sortKey === 'sonstige_betriebliche_aufwendungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('sonstige_betriebliche_aufwendungen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Sonstige betriebliche Aufwendungen (Vorjahr)
                  {sortKey === 'sonstige_betriebliche_aufwendungen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ebitda')}>
                <span className="inline-flex items-center gap-1">
                  EBITDA
                  {sortKey === 'ebitda' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ebitda_vj')}>
                <span className="inline-flex items-center gap-1">
                  EBITDA (Vorjahr)
                  {sortKey === 'ebitda_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ebit')}>
                <span className="inline-flex items-center gap-1">
                  EBIT (Betriebsergebnis)
                  {sortKey === 'ebit' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('zinsertraege')}>
                <span className="inline-flex items-center gap-1">
                  Zinserträge
                  {sortKey === 'zinsertraege' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('zinsertraege_vj')}>
                <span className="inline-flex items-center gap-1">
                  Zinserträge (Vorjahr)
                  {sortKey === 'zinsertraege_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('zinsaufwendungen')}>
                <span className="inline-flex items-center gap-1">
                  Zinsaufwendungen
                  {sortKey === 'zinsaufwendungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('zinsaufwendungen_vj')}>
                <span className="inline-flex items-center gap-1">
                  Zinsaufwendungen (Vorjahr)
                  {sortKey === 'zinsaufwendungen_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ebt')}>
                <span className="inline-flex items-center gap-1">
                  EBT (Ergebnis vor Steuern)
                  {sortKey === 'ebt' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ebt_vj')}>
                <span className="inline-flex items-center gap-1">
                  EBT (Vorjahr)
                  {sortKey === 'ebt_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('steuern')}>
                <span className="inline-flex items-center gap-1">
                  Steuern vom Einkommen und Ertrag
                  {sortKey === 'steuern' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('steuern_vj')}>
                <span className="inline-flex items-center gap-1">
                  Steuern vom Einkommen und Ertrag (Vorjahr)
                  {sortKey === 'steuern_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('jahresueberschuss_guv')}>
                <span className="inline-flex items-center gap-1">
                  Jahresüberschuss / Jahresfehlbetrag
                  {sortKey === 'jahresueberschuss_guv' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('jahresueberschuss_guv_vj')}>
                <span className="inline-flex items-center gap-1">
                  Jahresüberschuss / Jahresfehlbetrag (Vorjahr)
                  {sortKey === 'jahresueberschuss_guv_vj' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('guv_anmerkungen')}>
                <span className="inline-flex items-center gap-1">
                  Anmerkungen zur GuV
                  {sortKey === 'guv_anmerkungen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell>{record.fields.ebit_vj ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getUnternehmensstammdatenDisplayName(record.fields.guv_unternehmen)}</span></TableCell>
                <TableCell className="font-medium">{record.fields.guv_geschaeftsjahr ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.guv_waehrung?.label ?? '—'}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.guv_einheit?.label ?? '—'}</span></TableCell>
                <TableCell>{record.fields.umsatzerloese ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatzerloese_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.bestandsveraenderungen ?? '—'}</TableCell>
                <TableCell>{record.fields.bestandsveraenderungen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.sonstige_betriebliche_ertraege ?? '—'}</TableCell>
                <TableCell>{record.fields.sonstige_betriebliche_ertraege_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.gesamtleistung ?? '—'}</TableCell>
                <TableCell>{record.fields.gesamtleistung_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.materialaufwand ?? '—'}</TableCell>
                <TableCell>{record.fields.materialaufwand_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.personalaufwand ?? '—'}</TableCell>
                <TableCell>{record.fields.personalaufwand_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.abschreibungen ?? '—'}</TableCell>
                <TableCell>{record.fields.abschreibungen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.sonstige_betriebliche_aufwendungen ?? '—'}</TableCell>
                <TableCell>{record.fields.sonstige_betriebliche_aufwendungen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.ebitda ?? '—'}</TableCell>
                <TableCell>{record.fields.ebitda_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.ebit ?? '—'}</TableCell>
                <TableCell>{record.fields.zinsertraege ?? '—'}</TableCell>
                <TableCell>{record.fields.zinsertraege_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.zinsaufwendungen ?? '—'}</TableCell>
                <TableCell>{record.fields.zinsaufwendungen_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.ebt ?? '—'}</TableCell>
                <TableCell>{record.fields.ebt_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.steuern ?? '—'}</TableCell>
                <TableCell>{record.fields.steuern_vj ?? '—'}</TableCell>
                <TableCell>{record.fields.jahresueberschuss_guv ?? '—'}</TableCell>
                <TableCell>{record.fields.jahresueberschuss_guv_vj ?? '—'}</TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.guv_anmerkungen ?? '—'}</span></TableCell>
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
                <TableCell colSpan={36} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Gewinn- und Verlustrechnung. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <GewinnUndVerlustrechnungDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        unternehmensstammdatenList={unternehmensstammdatenList}
        enablePhotoScan={AI_PHOTO_SCAN['GewinnUndVerlustrechnung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['GewinnUndVerlustrechnung']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Gewinn- und Verlustrechnung löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <GewinnUndVerlustrechnungViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        unternehmensstammdatenList={unternehmensstammdatenList}
      />
    </PageShell>
  );
}