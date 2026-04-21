import { useState, useEffect } from 'react';
import { LivingAppsService, extractRecordId, createRecordUrl } from '@/services/livingAppsService';
import type { Kennzahlenanalyse, Bilanz, GewinnUndVerlustrechnung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { IconPencil, IconTrash, IconPlus, IconSearch, IconArrowsUpDown, IconArrowUp, IconArrowDown } from '@tabler/icons-react';
import { KennzahlenanalyseDialog } from '@/components/dialogs/KennzahlenanalyseDialog';
import { KennzahlenanalyseViewDialog } from '@/components/dialogs/KennzahlenanalyseViewDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { PageShell } from '@/components/PageShell';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

export default function KennzahlenanalysePage() {
  const [records, setRecords] = useState<Kennzahlenanalyse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Kennzahlenanalyse | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kennzahlenanalyse | null>(null);
  const [viewingRecord, setViewingRecord] = useState<Kennzahlenanalyse | null>(null);
  const [sortKey, setSortKey] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [bilanzList, setBilanzList] = useState<Bilanz[]>([]);
  const [gewinn__und_verlustrechnungList, setGewinnUndVerlustrechnungList] = useState<GewinnUndVerlustrechnung[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [mainData, bilanzData, gewinn__und_verlustrechnungData] = await Promise.all([
        LivingAppsService.getKennzahlenanalyse(),
        LivingAppsService.getBilanz(),
        LivingAppsService.getGewinnUndVerlustrechnung(),
      ]);
      setRecords(mainData);
      setBilanzList(bilanzData);
      setGewinnUndVerlustrechnungList(gewinn__und_verlustrechnungData);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(fields: Kennzahlenanalyse['fields']) {
    await LivingAppsService.createKennzahlenanalyseEntry(fields);
    await loadData();
    setDialogOpen(false);
  }

  async function handleUpdate(fields: Kennzahlenanalyse['fields']) {
    if (!editingRecord) return;
    await LivingAppsService.updateKennzahlenanalyseEntry(editingRecord.record_id, fields);
    await loadData();
    setEditingRecord(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await LivingAppsService.deleteKennzahlenanalyseEntry(deleteTarget.record_id);
    setRecords(prev => prev.filter(r => r.record_id !== deleteTarget.record_id));
    setDeleteTarget(null);
  }

  function getBilanzDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return bilanzList.find(r => r.record_id === id)?.fields.geschaeftsjahr ?? '—';
  }

  function getGewinnUndVerlustrechnungDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return gewinn__und_verlustrechnungList.find(r => r.record_id === id)?.fields.guv_geschaeftsjahr ?? '—';
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
      title="Kennzahlenanalyse"
      subtitle={`${records.length} Kennzahlenanalyse im System`}
      action={
        <Button onClick={() => setDialogOpen(true)} className="shrink-0 rounded-full shadow-sm">
          <IconPlus className="h-4 w-4 mr-2" /> Hinzufügen
        </Button>
      }
    >
      <div className="relative w-full max-w-sm">
        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Kennzahlenanalyse suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="rounded-[27px] bg-card shadow-lg overflow-hidden">
        <Table className="[&_tbody_td]:px-6 [&_tbody_td]:py-2 [&_tbody_td]:text-base [&_tbody_td]:font-medium [&_tbody_tr:first-child_td]:pt-6 [&_tbody_tr:last-child_td]:pb-10">
          <TableHeader className="bg-secondary">
            <TableRow className="border-b border-input">
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kz_bilanz')}>
                <span className="inline-flex items-center gap-1">
                  Zugehörige Bilanz
                  {sortKey === 'kz_bilanz' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kz_guv')}>
                <span className="inline-flex items-center gap-1">
                  Zugehörige Gewinn- und Verlustrechnung
                  {sortKey === 'kz_guv' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('eigenkapitalquote')}>
                <span className="inline-flex items-center gap-1">
                  Eigenkapitalquote (%)
                  {sortKey === 'eigenkapitalquote' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('fremdkapitalquote')}>
                <span className="inline-flex items-center gap-1">
                  Fremdkapitalquote (%)
                  {sortKey === 'fremdkapitalquote' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('verschuldungsgrad')}>
                <span className="inline-flex items-center gap-1">
                  Verschuldungsgrad (FK/EK)
                  {sortKey === 'verschuldungsgrad' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anlagendeckungsgrad_1')}>
                <span className="inline-flex items-center gap-1">
                  Anlagendeckungsgrad I (%)
                  {sortKey === 'anlagendeckungsgrad_1' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('anlagendeckungsgrad_2')}>
                <span className="inline-flex items-center gap-1">
                  Anlagendeckungsgrad II (%)
                  {sortKey === 'anlagendeckungsgrad_2' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('liquiditaet_1')}>
                <span className="inline-flex items-center gap-1">
                  Liquidität 1. Grades (%)
                  {sortKey === 'liquiditaet_1' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('liquiditaet_2')}>
                <span className="inline-flex items-center gap-1">
                  Liquidität 2. Grades (%)
                  {sortKey === 'liquiditaet_2' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('liquiditaet_3')}>
                <span className="inline-flex items-center gap-1">
                  Liquidität 3. Grades (%)
                  {sortKey === 'liquiditaet_3' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('working_capital')}>
                <span className="inline-flex items-center gap-1">
                  Working Capital
                  {sortKey === 'working_capital' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('eigenkapitalrendite')}>
                <span className="inline-flex items-center gap-1">
                  Eigenkapitalrendite (%)
                  {sortKey === 'eigenkapitalrendite' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gesamtkapitalrendite')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtkapitalrendite (%)
                  {sortKey === 'gesamtkapitalrendite' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('umsatzrendite')}>
                <span className="inline-flex items-center gap-1">
                  Umsatzrendite (%)
                  {sortKey === 'umsatzrendite' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ebit_marge')}>
                <span className="inline-flex items-center gap-1">
                  EBIT-Marge (%)
                  {sortKey === 'ebit_marge' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('ebitda_marge')}>
                <span className="inline-flex items-center gap-1">
                  EBITDA-Marge (%)
                  {sortKey === 'ebitda_marge' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kapitalumschlag')}>
                <span className="inline-flex items-center gap-1">
                  Kapitalumschlag
                  {sortKey === 'kapitalumschlag' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('debitorenlaufzeit')}>
                <span className="inline-flex items-center gap-1">
                  Debitorenlaufzeit (Tage)
                  {sortKey === 'debitorenlaufzeit' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('kreditorenlaufzeit')}>
                <span className="inline-flex items-center gap-1">
                  Kreditorenlaufzeit (Tage)
                  {sortKey === 'kreditorenlaufzeit' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('lagerdauer')}>
                <span className="inline-flex items-center gap-1">
                  Lagerdauer (Tage)
                  {sortKey === 'lagerdauer' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('cashflow_operativ')}>
                <span className="inline-flex items-center gap-1">
                  Operativer Cashflow
                  {sortKey === 'cashflow_operativ' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('bonitaetsbewertung')}>
                <span className="inline-flex items-center gap-1">
                  Bonitätsbewertung
                  {sortKey === 'bonitaetsbewertung' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('staerken')}>
                <span className="inline-flex items-center gap-1">
                  Stärken
                  {sortKey === 'staerken' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('schwaechen')}>
                <span className="inline-flex items-center gap-1">
                  Schwächen
                  {sortKey === 'schwaechen' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('gesamtkommentar')}>
                <span className="inline-flex items-center gap-1">
                  Gesamtkommentar / Fazit
                  {sortKey === 'gesamtkommentar' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('analyst_vorname')}>
                <span className="inline-flex items-center gap-1">
                  Vorname Analyst
                  {sortKey === 'analyst_vorname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('analyst_nachname')}>
                <span className="inline-flex items-center gap-1">
                  Nachname Analyst
                  {sortKey === 'analyst_nachname' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6 cursor-pointer select-none hover:text-foreground transition-colors" onClick={() => toggleSort('analysedatum')}>
                <span className="inline-flex items-center gap-1">
                  Analysedatum
                  {sortKey === 'analysedatum' ? (sortDir === 'asc' ? <IconArrowUp size={14} /> : <IconArrowDown size={14} />) : <IconArrowsUpDown size={14} className="opacity-30" />}
                </span>
              </TableHead>
              <TableHead className="w-24 uppercase text-xs font-semibold text-secondary-foreground tracking-wider px-6">Aktionen</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortRecords(filtered).map(record => (
              <TableRow key={record.record_id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={(e) => { if ((e.target as HTMLElement).closest('button, [role="checkbox"]')) return; setViewingRecord(record); }}>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getBilanzDisplayName(record.fields.kz_bilanz)}</span></TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{getGewinnUndVerlustrechnungDisplayName(record.fields.kz_guv)}</span></TableCell>
                <TableCell>{record.fields.eigenkapitalquote ?? '—'}</TableCell>
                <TableCell>{record.fields.fremdkapitalquote ?? '—'}</TableCell>
                <TableCell>{record.fields.verschuldungsgrad ?? '—'}</TableCell>
                <TableCell>{record.fields.anlagendeckungsgrad_1 ?? '—'}</TableCell>
                <TableCell>{record.fields.anlagendeckungsgrad_2 ?? '—'}</TableCell>
                <TableCell>{record.fields.liquiditaet_1 ?? '—'}</TableCell>
                <TableCell>{record.fields.liquiditaet_2 ?? '—'}</TableCell>
                <TableCell>{record.fields.liquiditaet_3 ?? '—'}</TableCell>
                <TableCell>{record.fields.working_capital ?? '—'}</TableCell>
                <TableCell>{record.fields.eigenkapitalrendite ?? '—'}</TableCell>
                <TableCell>{record.fields.gesamtkapitalrendite ?? '—'}</TableCell>
                <TableCell>{record.fields.umsatzrendite ?? '—'}</TableCell>
                <TableCell>{record.fields.ebit_marge ?? '—'}</TableCell>
                <TableCell>{record.fields.ebitda_marge ?? '—'}</TableCell>
                <TableCell>{record.fields.kapitalumschlag ?? '—'}</TableCell>
                <TableCell>{record.fields.debitorenlaufzeit ?? '—'}</TableCell>
                <TableCell>{record.fields.kreditorenlaufzeit ?? '—'}</TableCell>
                <TableCell>{record.fields.lagerdauer ?? '—'}</TableCell>
                <TableCell>{record.fields.cashflow_operativ ?? '—'}</TableCell>
                <TableCell><span className="inline-flex items-center bg-secondary border border-[#bfdbfe] text-[#2563eb] rounded-[10px] px-2 py-1 text-sm font-medium">{record.fields.bonitaetsbewertung?.label ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.staerken ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.schwaechen ?? '—'}</span></TableCell>
                <TableCell className="max-w-xs"><span className="truncate block">{record.fields.gesamtkommentar ?? '—'}</span></TableCell>
                <TableCell className="font-medium">{record.fields.analyst_vorname ?? '—'}</TableCell>
                <TableCell>{record.fields.analyst_nachname ?? '—'}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(record.fields.analysedatum)}</TableCell>
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
                <TableCell colSpan={29} className="text-center py-16 text-muted-foreground">
                  {search ? 'Keine Ergebnisse gefunden.' : 'Noch keine Kennzahlenanalyse. Jetzt hinzufügen!'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <KennzahlenanalyseDialog
        open={dialogOpen || !!editingRecord}
        onClose={() => { setDialogOpen(false); setEditingRecord(null); }}
        onSubmit={editingRecord ? handleUpdate : handleCreate}
        defaultValues={editingRecord?.fields}
        bilanzList={bilanzList}
        gewinn__und_verlustrechnungList={gewinn__und_verlustrechnungList}
        enablePhotoScan={AI_PHOTO_SCAN['Kennzahlenanalyse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlenanalyse']}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Kennzahlenanalyse löschen"
        description="Soll dieser Eintrag wirklich gelöscht werden? Diese Aktion kann nicht rückgängig gemacht werden."
      />

      <KennzahlenanalyseViewDialog
        open={!!viewingRecord}
        onClose={() => setViewingRecord(null)}
        record={viewingRecord}
        onEdit={(r) => { setViewingRecord(null); setEditingRecord(r); }}
        bilanzList={bilanzList}
        gewinn__und_verlustrechnungList={gewinn__und_verlustrechnungList}
      />
    </PageShell>
  );
}