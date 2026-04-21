import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichBilanz, enrichGewinnUndVerlustrechnung, enrichKennzahlenanalyse } from '@/lib/enrich';
import type { EnrichedBilanz, EnrichedGewinnUndVerlustrechnung, EnrichedKennzahlenanalyse } from '@/types/enriched';
import type { Unternehmensstammdaten } from '@/types/app';
import { LivingAppsService, extractRecordId } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UnternehmensstammdatenDialog } from '@/components/dialogs/UnternehmensstammdatenDialog';
import { BilanzDialog } from '@/components/dialogs/BilanzDialog';
import { GewinnUndVerlustrechnungDialog } from '@/components/dialogs/GewinnUndVerlustrechnungDialog';
import { KennzahlenanalyseDialog } from '@/components/dialogs/KennzahlenanalyseDialog';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { APP_IDS } from '@/types/app';
import { createRecordUrl } from '@/services/livingAppsService';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconBuilding, IconPlus, IconPencil, IconTrash,
  IconChartBar, IconTrendingUp, IconTrendingDown,
  IconCoin, IconScale, IconDroplets, IconShield,
  IconSearch, IconX, IconChevronRight
} from '@tabler/icons-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const APPGROUP_ID = '69e72a17db2d22940f78bf6a';
const REPAIR_ENDPOINT = '/claude/build/repair';

// --- Helpers ---
function fmt(n: number | undefined | null, suffix = ''): string {
  if (n == null) return '–';
  const abs = Math.abs(n);
  let s: string;
  if (abs >= 1_000_000) s = (n / 1_000_000).toFixed(1) + ' Mio.';
  else if (abs >= 1_000) s = (n / 1_000).toFixed(0) + ' T';
  else s = n.toFixed(0);
  return s + (suffix ? ' ' + suffix : '');
}

function pct(n: number | undefined | null): string {
  if (n == null) return '–';
  return n.toFixed(1) + ' %';
}

function delta(current?: number, prev?: number): { pct: number; positive: boolean } | null {
  if (current == null || prev == null || prev === 0) return null;
  const d = ((current - prev) / Math.abs(prev)) * 100;
  return { pct: d, positive: d >= 0 };
}

const BONITAET_COLOR: Record<string, string> = {
  sehr_gut: 'bg-emerald-500/15 text-emerald-700',
  gut: 'bg-green-500/15 text-green-700',
  befriedigend: 'bg-yellow-500/15 text-yellow-700',
  ausreichend: 'bg-orange-500/15 text-orange-700',
  mangelhaft: 'bg-red-400/15 text-red-600',
  kritisch: 'bg-red-600/15 text-red-800',
};

// --- Main Component ---
export default function DashboardOverview() {
  const {
    unternehmensstammdaten, bilanz, gewinnUndVerlustrechnung, kennzahlenanalyse,
    unternehmensstammdatenMap, bilanzMap, gewinnUndVerlustrechnungMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedBilanz = enrichBilanz(bilanz, { unternehmensstammdatenMap });
  const enrichedGewinnUndVerlustrechnung = enrichGewinnUndVerlustrechnung(gewinnUndVerlustrechnung, { unternehmensstammdatenMap });
  const enrichedKennzahlenanalyse = enrichKennzahlenanalyse(kennzahlenanalyse, { bilanzMap, gewinnUndVerlustrechnungMap });

  const [selectedUnternehmen, setSelectedUnternehmen] = useState<Unternehmensstammdaten | null>(null);
  const [search, setSearch] = useState('');

  // Dialog states
  const [unternehmenDialog, setUnternehmenDialog] = useState(false);
  const [editUnternehmen, setEditUnternehmen] = useState<Unternehmensstammdaten | null>(null);
  const [deleteUnternehmen, setDeleteUnternehmen] = useState<Unternehmensstammdaten | null>(null);

  const [bilanzDialog, setBilanzDialog] = useState(false);
  const [editBilanz, setEditBilanz] = useState<EnrichedBilanz | null>(null);
  const [deleteBilanz, setDeleteBilanz] = useState<EnrichedBilanz | null>(null);

  const [guvDialog, setGuvDialog] = useState(false);
  const [editGuv, setEditGuv] = useState<EnrichedGewinnUndVerlustrechnung | null>(null);
  const [deleteGuv, setDeleteGuv] = useState<EnrichedGewinnUndVerlustrechnung | null>(null);

  const [kzDialog, setKzDialog] = useState(false);
  const [editKz, setEditKz] = useState<EnrichedKennzahlenanalyse | null>(null);
  const [deleteKz, setDeleteKz] = useState<EnrichedKennzahlenanalyse | null>(null);

  // Filtered list
  const filteredUnternehmen = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return unternehmensstammdaten;
    return unternehmensstammdaten.filter(u =>
      (u.fields.unternehmensname ?? '').toLowerCase().includes(q) ||
      (u.fields.branche?.label ?? '').toLowerCase().includes(q) ||
      (u.fields.ort ?? '').toLowerCase().includes(q)
    );
  }, [unternehmensstammdaten, search]);

  // Data for selected company
  const companyBilanz = useMemo(() => {
    if (!selectedUnternehmen) return [];
    return enrichedBilanz.filter(b =>
      extractRecordId(b.fields.bilanz_unternehmen) === selectedUnternehmen.record_id
    ).sort((a, b) => (b.fields.geschaeftsjahr ?? '').localeCompare(a.fields.geschaeftsjahr ?? ''));
  }, [enrichedBilanz, selectedUnternehmen]);

  const companyGuv = useMemo(() => {
    if (!selectedUnternehmen) return [];
    return enrichedGewinnUndVerlustrechnung.filter(g =>
      extractRecordId(g.fields.guv_unternehmen) === selectedUnternehmen.record_id
    ).sort((a, b) => (b.fields.guv_geschaeftsjahr ?? '').localeCompare(a.fields.guv_geschaeftsjahr ?? ''));
  }, [enrichedGewinnUndVerlustrechnung, selectedUnternehmen]);

  const companyKz = useMemo(() => {
    if (!selectedUnternehmen) return [];
    const bilanzIds = new Set(companyBilanz.map(b => b.record_id));
    const guvIds = new Set(companyGuv.map(g => g.record_id));
    return enrichedKennzahlenanalyse.filter(k =>
      bilanzIds.has(extractRecordId(k.fields.kz_bilanz) ?? '') ||
      guvIds.has(extractRecordId(k.fields.kz_guv) ?? '')
    );
  }, [enrichedKennzahlenanalyse, companyBilanz, companyGuv, selectedUnternehmen]);

  // Latest figures
  const latestBilanz = companyBilanz[0];
  const latestGuv = companyGuv[0];
  const latestKz = companyKz[0];

  // Chart data: Umsatz-Entwicklung
  const chartData = useMemo(() => {
    return companyGuv.slice().reverse().map(g => ({
      jahr: g.fields.guv_geschaeftsjahr ?? '?',
      umsatz: g.fields.umsatzerloese ?? 0,
      ebit: g.fields.ebit ?? 0,
      jahresueberschuss: g.fields.jahresueberschuss_guv ?? 0,
    }));
  }, [companyGuv]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const handleDeleteUnternehmen = async () => {
    if (!deleteUnternehmen) return;
    await LivingAppsService.deleteUnternehmensstammdatenEntry(deleteUnternehmen.record_id);
    if (selectedUnternehmen?.record_id === deleteUnternehmen.record_id) setSelectedUnternehmen(null);
    setDeleteUnternehmen(null);
    fetchAll();
  };

  const handleDeleteBilanz = async () => {
    if (!deleteBilanz) return;
    await LivingAppsService.deleteBilanzEntry(deleteBilanz.record_id);
    setDeleteBilanz(null);
    fetchAll();
  };

  const handleDeleteGuv = async () => {
    if (!deleteGuv) return;
    await LivingAppsService.deleteGewinnUndVerlustrechnungEntry(deleteGuv.record_id);
    setDeleteGuv(null);
    fetchAll();
  };

  const handleDeleteKz = async () => {
    if (!deleteKz) return;
    await LivingAppsService.deleteKennzahlenanalyseEntry(deleteKz.record_id);
    setDeleteKz(null);
    fetchAll();
  };

  return (
    <div className="flex flex-col gap-4">
    {/* Workflow-Navigation */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <a href="#/intents/jahresabschluss-erfassen" className="group flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <IconScale size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">Jahresabschluss erfassen</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Bilanz und GuV für ein Unternehmen in einem geführten Workflow erfassen</p>
        </div>
        <IconChevronRight size={18} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
      </a>
      <a href="#/intents/unternehmen-analysieren" className="group flex items-center gap-4 bg-card border border-border border-l-4 border-l-primary rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <IconShield size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">Unternehmen analysieren</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">Vollständige Bonitäts- und Kennzahlenanalyse durchführen und bewerten</p>
        </div>
        <IconChevronRight size={18} className="text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
      </a>
    </div>
    <div className="flex flex-col lg:flex-row gap-4 min-h-0" style={{ height: 'calc(100vh - 144px)' }}>
      {/* LEFT PANEL: Company list */}
      <div className="lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <IconBuilding size={16} className="text-primary shrink-0" />
            Unternehmen
            <span className="text-xs font-normal text-muted-foreground">({filteredUnternehmen.length})</span>
          </h2>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2 shrink-0"
            onClick={() => { setEditUnternehmen(null); setUnternehmenDialog(true); }}
          >
            <IconPlus size={13} className="mr-1" />Neu
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full h-8 pl-8 pr-8 text-sm bg-muted/50 border border-border rounded-lg outline-none focus:ring-1 focus:ring-primary"
            placeholder="Suchen..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch('')}>
              <IconX size={13} />
            </button>
          )}
        </div>

        {/* Company cards */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {filteredUnternehmen.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground gap-2">
              <IconBuilding size={32} stroke={1.5} />
              <p className="text-sm">{search ? 'Keine Treffer' : 'Noch keine Unternehmen'}</p>
            </div>
          )}
          {filteredUnternehmen.map(u => {
            const isSelected = selectedUnternehmen?.record_id === u.record_id;
            const kzForU = enrichedKennzahlenanalyse.find(k => {
              const bId = extractRecordId(k.fields.kz_bilanz);
              return enrichedBilanz.some(b => b.record_id === bId && extractRecordId(b.fields.bilanz_unternehmen) === u.record_id);
            });
            const bonitaet = kzForU?.fields.bonitaetsbewertung;
            return (
              <button
                key={u.record_id}
                onClick={() => setSelectedUnternehmen(isSelected ? null : u)}
                className={`w-full text-left rounded-xl p-3 border transition-all group ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                    : 'bg-card border-border hover:border-primary/40 hover:bg-accent/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium text-sm truncate ${isSelected ? 'text-primary-foreground' : 'text-foreground'}`}>
                      {u.fields.unternehmensname ?? '(Ohne Name)'}
                    </p>
                    <p className={`text-xs truncate mt-0.5 ${isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {u.fields.rechtsform?.label ?? ''}{u.fields.branche ? ` · ${u.fields.branche.label}` : ''}
                    </p>
                    {u.fields.ort && (
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground/70'}`}>
                        {u.fields.ort}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {bonitaet && (
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : BONITAET_COLOR[bonitaet.key] ?? 'bg-muted text-muted-foreground'}`}>
                        {bonitaet.label}
                      </span>
                    )}
                    <div className="flex items-center gap-1 mt-1">
                      <button
                        className={`p-1 rounded opacity-70 hover:opacity-100 transition-opacity ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={e => { e.stopPropagation(); setEditUnternehmen(u); setUnternehmenDialog(true); }}
                        title="Bearbeiten"
                      >
                        <IconPencil size={12} />
                      </button>
                      <button
                        className={`p-1 rounded opacity-70 hover:opacity-100 transition-opacity ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground hover:text-red-500'}`}
                        onClick={e => { e.stopPropagation(); setDeleteUnternehmen(u); }}
                        title="Löschen"
                      >
                        <IconTrash size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT PANEL: Detail view */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {!selectedUnternehmen ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-muted-foreground gap-3">
            <IconChartBar size={48} stroke={1.5} />
            <div>
              <p className="font-medium text-foreground">Unternehmen auswählen</p>
              <p className="text-sm mt-1">Wähle ein Unternehmen aus der Liste, um die Bilanzanalyse zu sehen.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setEditUnternehmen(null); setUnternehmenDialog(true); }}>
              <IconPlus size={14} className="mr-1" />Unternehmen anlegen
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Company header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-foreground truncate">
                  {selectedUnternehmen.fields.unternehmensname ?? '(Ohne Name)'}
                </h1>
                <div className="flex flex-wrap gap-2 mt-1">
                  {selectedUnternehmen.fields.rechtsform && (
                    <Badge variant="secondary" className="text-xs">{selectedUnternehmen.fields.rechtsform.label}</Badge>
                  )}
                  {selectedUnternehmen.fields.branche && (
                    <Badge variant="outline" className="text-xs">{selectedUnternehmen.fields.branche.label}</Badge>
                  )}
                  {selectedUnternehmen.fields.ort && (
                    <span className="text-xs text-muted-foreground">{selectedUnternehmen.fields.ort}</span>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditUnternehmen(selectedUnternehmen); setUnternehmenDialog(true); }}
              >
                <IconPencil size={13} className="mr-1" />Stammdaten
              </Button>
            </div>

            {/* KPI cards */}
            {(latestBilanz || latestGuv || latestKz) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {latestGuv?.fields.umsatzerloese != null && (
                  <KpiCard
                    label="Umsatzerlöse"
                    value={fmt(latestGuv.fields.umsatzerloese)}
                    delta={delta(latestGuv.fields.umsatzerloese, latestGuv.fields.umsatzerloese_vj)}
                    icon={<IconCoin size={16} className="text-primary" />}
                  />
                )}
                {latestGuv?.fields.ebit != null && (
                  <KpiCard
                    label="EBIT"
                    value={fmt(latestGuv.fields.ebit)}
                    delta={delta(latestGuv.fields.ebit, latestGuv.fields.ebit_vj)}
                    icon={<IconChartBar size={16} className="text-primary" />}
                  />
                )}
                {latestBilanz?.fields.eigenkapital_gesamt != null && (
                  <KpiCard
                    label="Eigenkapital"
                    value={fmt(latestBilanz.fields.eigenkapital_gesamt)}
                    delta={delta(latestBilanz.fields.eigenkapital_gesamt, latestBilanz.fields.eigenkapital_gesamt_vj)}
                    icon={<IconScale size={16} className="text-primary" />}
                  />
                )}
                {latestKz?.fields.liquiditaet_2 != null && (
                  <KpiCard
                    label="Liquidität II"
                    value={pct(latestKz.fields.liquiditaet_2)}
                    icon={<IconDroplets size={16} className="text-primary" />}
                  />
                )}
                {latestKz?.fields.eigenkapitalquote != null && (
                  <KpiCard
                    label="EK-Quote"
                    value={pct(latestKz.fields.eigenkapitalquote)}
                    icon={<IconShield size={16} className="text-primary" />}
                  />
                )}
                {latestKz?.fields.ebit_marge != null && (
                  <KpiCard
                    label="EBIT-Marge"
                    value={pct(latestKz.fields.ebit_marge)}
                    icon={<IconTrendingUp size={16} className="text-primary" />}
                  />
                )}
                {latestKz?.fields.eigenkapitalrendite != null && (
                  <KpiCard
                    label="EK-Rendite"
                    value={pct(latestKz.fields.eigenkapitalrendite)}
                    icon={<IconTrendingUp size={16} className="text-primary" />}
                  />
                )}
                {latestKz?.fields.bonitaetsbewertung && (
                  <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Bonität</span>
                    <span className={`text-sm font-semibold px-2 py-0.5 rounded-full w-fit ${BONITAET_COLOR[latestKz.fields.bonitaetsbewertung.key] ?? ''}`}>
                      {latestKz.fields.bonitaetsbewertung.label}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Chart: Umsatz & EBIT */}
            {chartData.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="text-sm font-semibold mb-3">Umsatz & EBIT-Entwicklung</h3>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} barGap={4}>
                    <XAxis dataKey="jahr" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} tickFormatter={v => fmt(v)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number, name: string) => [fmt(v), name === 'umsatz' ? 'Umsatz' : 'EBIT']}
                    />
                    <Bar dataKey="umsatz" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="ebit" radius={[4, 4, 0, 0]} maxBarSize={32}>
                      {chartData.map((entry, i) => (
                        <Cell key={i} fill={entry.ebit >= 0 ? 'var(--color-success, #22c55e)' : '#ef4444'} fillOpacity={0.7} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Two columns: Bilanz + GuV */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Bilanz section */}
              <Section
                title="Bilanzen"
                onAdd={() => { setEditBilanz(null); setBilanzDialog(true); }}
              >
                {companyBilanz.length === 0 ? (
                  <EmptyState label="Noch keine Bilanz" />
                ) : (
                  <div className="space-y-2">
                    {companyBilanz.map(b => (
                      <div key={b.record_id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{b.fields.geschaeftsjahr ?? '?'}</p>
                          <p className="text-xs text-muted-foreground">
                            Stichtag: {b.fields.bilanzstichtag ? formatDate(b.fields.bilanzstichtag) : '–'}
                            {b.fields.bilanzsumme_aktiva != null && ` · Summe: ${fmt(b.fields.bilanzsumme_aktiva)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" onClick={() => { setEditBilanz(b); setBilanzDialog(true); }}>
                            <IconPencil size={13} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-red-500" onClick={() => setDeleteBilanz(b)}>
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>

              {/* GuV section */}
              <Section
                title="GuV"
                onAdd={() => { setEditGuv(null); setGuvDialog(true); }}
              >
                {companyGuv.length === 0 ? (
                  <EmptyState label="Noch keine GuV" />
                ) : (
                  <div className="space-y-2">
                    {companyGuv.map(g => (
                      <div key={g.record_id} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg bg-muted/40 border border-border/50">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{g.fields.guv_geschaeftsjahr ?? '?'}</p>
                          <p className="text-xs text-muted-foreground">
                            Umsatz: {fmt(g.fields.umsatzerloese)}
                            {g.fields.ebit != null && ` · EBIT: ${fmt(g.fields.ebit)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" onClick={() => { setEditGuv(g); setGuvDialog(true); }}>
                            <IconPencil size={13} />
                          </button>
                          <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-red-500" onClick={() => setDeleteGuv(g)}>
                            <IconTrash size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </div>

            {/* Kennzahlenanalyse section */}
            <Section
              title="Kennzahlenanalysen"
              onAdd={() => { setEditKz(null); setKzDialog(true); }}
            >
              {companyKz.length === 0 ? (
                <EmptyState label="Noch keine Kennzahlenanalyse" />
              ) : (
                <div className="space-y-2">
                  {companyKz.map(k => (
                    <div key={k.record_id} className="flex flex-wrap items-start justify-between gap-2 px-3 py-3 rounded-lg bg-muted/40 border border-border/50">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          {k.fields.bonitaetsbewertung && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BONITAET_COLOR[k.fields.bonitaetsbewertung.key] ?? 'bg-muted text-muted-foreground'}`}>
                              {k.fields.bonitaetsbewertung.label}
                            </span>
                          )}
                          {k.fields.analysedatum && (
                            <span className="text-xs text-muted-foreground">{formatDate(k.fields.analysedatum)}</span>
                          )}
                          {(k.fields.analyst_vorname || k.fields.analyst_nachname) && (
                            <span className="text-xs text-muted-foreground">
                              {[k.fields.analyst_vorname, k.fields.analyst_nachname].filter(Boolean).join(' ')}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-x-4 gap-y-0.5">
                          {k.fields.eigenkapitalquote != null && <MiniStat label="EK-Quote" val={pct(k.fields.eigenkapitalquote)} />}
                          {k.fields.fremdkapitalquote != null && <MiniStat label="FK-Quote" val={pct(k.fields.fremdkapitalquote)} />}
                          {k.fields.verschuldungsgrad != null && <MiniStat label="Verschulg." val={k.fields.verschuldungsgrad.toFixed(2)} />}
                          {k.fields.liquiditaet_1 != null && <MiniStat label="Liq. I" val={pct(k.fields.liquiditaet_1)} />}
                          {k.fields.liquiditaet_2 != null && <MiniStat label="Liq. II" val={pct(k.fields.liquiditaet_2)} />}
                          {k.fields.ebit_marge != null && <MiniStat label="EBIT-M." val={pct(k.fields.ebit_marge)} />}
                        </div>
                        {k.fields.gesamtkommentar && (
                          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{k.fields.gesamtkommentar}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground" onClick={() => { setEditKz(k); setKzDialog(true); }}>
                          <IconPencil size={13} />
                        </button>
                        <button className="p-1.5 rounded hover:bg-accent text-muted-foreground hover:text-red-500" onClick={() => setDeleteKz(k)}>
                          <IconTrash size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </div>

      {/* Dialogs */}
      <UnternehmensstammdatenDialog
        open={unternehmenDialog}
        onClose={() => { setUnternehmenDialog(false); setEditUnternehmen(null); }}
        onSubmit={async (fields) => {
          if (editUnternehmen) {
            await LivingAppsService.updateUnternehmensstammdatenEntry(editUnternehmen.record_id, fields);
          } else {
            await LivingAppsService.createUnternehmensstammdatenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editUnternehmen?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Unternehmensstammdaten']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmensstammdaten']}
      />

      <BilanzDialog
        open={bilanzDialog}
        onClose={() => { setBilanzDialog(false); setEditBilanz(null); }}
        onSubmit={async (fields) => {
          if (editBilanz) {
            await LivingAppsService.updateBilanzEntry(editBilanz.record_id, fields);
          } else {
            const prefilledFields = selectedUnternehmen
              ? { ...fields, bilanz_unternehmen: createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, selectedUnternehmen.record_id) }
              : fields;
            await LivingAppsService.createBilanzEntry(prefilledFields);
          }
          fetchAll();
        }}
        defaultValues={editBilanz
          ? editBilanz.fields
          : selectedUnternehmen
            ? { bilanz_unternehmen: createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, selectedUnternehmen.record_id) }
            : undefined}
        unternehmensstammdatenList={unternehmensstammdaten}
        enablePhotoScan={AI_PHOTO_SCAN['Bilanz']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Bilanz']}
      />

      <GewinnUndVerlustrechnungDialog
        open={guvDialog}
        onClose={() => { setGuvDialog(false); setEditGuv(null); }}
        onSubmit={async (fields) => {
          if (editGuv) {
            await LivingAppsService.updateGewinnUndVerlustrechnungEntry(editGuv.record_id, fields);
          } else {
            const prefilledFields = selectedUnternehmen
              ? { ...fields, guv_unternehmen: createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, selectedUnternehmen.record_id) }
              : fields;
            await LivingAppsService.createGewinnUndVerlustrechnungEntry(prefilledFields);
          }
          fetchAll();
        }}
        defaultValues={editGuv
          ? editGuv.fields
          : selectedUnternehmen
            ? { guv_unternehmen: createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, selectedUnternehmen.record_id) }
            : undefined}
        unternehmensstammdatenList={unternehmensstammdaten}
        enablePhotoScan={AI_PHOTO_SCAN['GewinnUndVerlustrechnung']}
        enablePhotoLocation={AI_PHOTO_LOCATION['GewinnUndVerlustrechnung']}
      />

      <KennzahlenanalyseDialog
        open={kzDialog}
        onClose={() => { setKzDialog(false); setEditKz(null); }}
        onSubmit={async (fields) => {
          if (editKz) {
            await LivingAppsService.updateKennzahlenanalyseEntry(editKz.record_id, fields);
          } else {
            await LivingAppsService.createKennzahlenanalyseEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={editKz?.fields}
        bilanzList={bilanz}
        gewinn__und_verlustrechnungList={gewinnUndVerlustrechnung}
        enablePhotoScan={AI_PHOTO_SCAN['Kennzahlenanalyse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlenanalyse']}
      />

      <ConfirmDialog
        open={!!deleteUnternehmen}
        title="Unternehmen löschen"
        description={`„${deleteUnternehmen?.fields.unternehmensname ?? 'Unternehmen'}" wirklich löschen? Alle zugehörigen Daten bleiben erhalten.`}
        onConfirm={handleDeleteUnternehmen}
        onClose={() => setDeleteUnternehmen(null)}
      />
      <ConfirmDialog
        open={!!deleteBilanz}
        title="Bilanz löschen"
        description={`Bilanz „${deleteBilanz?.fields.geschaeftsjahr ?? '?'}" wirklich löschen?`}
        onConfirm={handleDeleteBilanz}
        onClose={() => setDeleteBilanz(null)}
      />
      <ConfirmDialog
        open={!!deleteGuv}
        title="GuV löschen"
        description={`Gewinn- und Verlustrechnung „${deleteGuv?.fields.guv_geschaeftsjahr ?? '?'}" wirklich löschen?`}
        onConfirm={handleDeleteGuv}
        onClose={() => setDeleteGuv(null)}
      />
      <ConfirmDialog
        open={!!deleteKz}
        title="Kennzahlenanalyse löschen"
        description="Diese Kennzahlenanalyse wirklich löschen?"
        onConfirm={handleDeleteKz}
        onClose={() => setDeleteKz(null)}
      />
    </div>
    </div>
  );
}

// --- Sub-components ---

function KpiCard({ label, value, delta: d, icon }: {
  label: string;
  value: string;
  delta?: { pct: number; positive: boolean } | null;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 flex flex-col gap-1 overflow-hidden">
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-muted-foreground truncate">{label}</span>
        {icon && <span className="shrink-0">{icon}</span>}
      </div>
      <span className="text-base font-bold text-foreground truncate">{value}</span>
      {d && (
        <span className={`text-xs flex items-center gap-0.5 ${d.positive ? 'text-emerald-600' : 'text-red-500'}`}>
          {d.positive ? <IconTrendingUp size={11} /> : <IconTrendingDown size={11} />}
          {Math.abs(d.pct).toFixed(1)} % ggü. Vorjahr
        </span>
      )}
    </div>
  );
}

function Section({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <IconChevronRight size={14} className="text-primary" />
          {title}
        </h3>
        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={onAdd}>
          <IconPlus size={13} className="mr-1" />Neu
        </Button>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-muted-foreground text-center py-4">{label}</p>
  );
}

function MiniStat({ label, val }: { label: string; val: string }) {
  return (
    <div className="min-w-0">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <p className="text-xs font-medium truncate">{val}</p>
    </div>
  );
}

// --- Skeleton & Error ---
function DashboardSkeleton() {
  return (
    <div className="flex gap-4">
      <div className="w-72 shrink-0 space-y-3">
        <Skeleton className="h-7 w-36" />
        <Skeleton className="h-8 w-full" />
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <div className="flex-1 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);
    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });
    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });
      if (!resp.ok || !resp.body) { setRepairing(false); setRepairFailed(true); return; }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte laden Sie die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}><IconRefresh size={14} className="mr-1" />Neu laden</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{repairing ? repairStatus : error.message}</p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen.</p>}
    </div>
  );
}
