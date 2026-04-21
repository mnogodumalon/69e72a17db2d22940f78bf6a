import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Unternehmensstammdaten, Bilanz, GewinnUndVerlustrechnung, Kennzahlenanalyse } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { UnternehmensstammdatenDialog } from '@/components/dialogs/UnternehmensstammdatenDialog';
import { KennzahlenanalyseDialog } from '@/components/dialogs/KennzahlenanalyseDialog';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { Button } from '@/components/ui/button';
import {
  IconBuilding,
  IconArrowRight,
  IconArrowLeft,
  IconPlus,
  IconPencil,
  IconAlertCircle,
  IconChartBar,
  IconCalendar,
  IconCoin,
} from '@tabler/icons-react';

// ─── Bonitäts-Farben ───────────────────────────────────────────────────────
const BONITAET_COLOR: Record<string, string> = {
  sehr_gut: 'bg-emerald-500/15 text-emerald-700 border-emerald-300',
  gut: 'bg-green-500/15 text-green-700 border-green-300',
  befriedigend: 'bg-yellow-500/15 text-yellow-700 border-yellow-300',
  ausreichend: 'bg-orange-500/15 text-orange-700 border-orange-300',
  mangelhaft: 'bg-red-400/15 text-red-600 border-red-300',
  kritisch: 'bg-red-600/15 text-red-800 border-red-400',
};

// ─── Zahlen-Formatter ──────────────────────────────────────────────────────
function fmt(n: number | undefined | null): string {
  if (n == null) return '–';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' Mio.';
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + ' T';
  return n.toFixed(0);
}

function pct(n: number | undefined | null): string {
  if (n == null) return '–';
  return n.toFixed(1) + ' %';
}

// ─── Wizard-Schritte ──────────────────────────────────────────────────────
const STEPS = [
  { label: 'Unternehmen' },
  { label: 'Finanzdaten' },
  { label: 'Kennzahlen' },
  { label: 'Ergebnis' },
];

// ─── Hilfsfunktion: Unternehmen-ID aus applookup-URL ──────────────────────
function getUnternehmenId(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return extractRecordId(url);
  } catch {
    return null;
  }
}

// ─── Kennzahlen-Karte ─────────────────────────────────────────────────────
interface KzCardProps {
  label: string;
  value: string;
}
function KzCard({ label, value }: KzCardProps) {
  return (
    <div className="bg-secondary rounded-xl p-3 overflow-hidden">
      <p className="text-xs text-muted-foreground truncate">{label}</p>
      <p className="text-base font-semibold text-foreground mt-0.5">{value}</p>
    </div>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────
export default function UnternehmenAnalysierenPage() {
  const [searchParams] = useSearchParams();

  // ── Datenzustand ───────────────────────────────────────────────────────
  const [unternehmensstammdaten, setUnternehmensstammdaten] = useState<Unternehmensstammdaten[]>([]);
  const [bilanz, setBilanz] = useState<Bilanz[]>([]);
  const [gewinnUndVerlustrechnung, setGewinnUndVerlustrechnung] = useState<GewinnUndVerlustrechnung[]>([]);
  const [kennzahlenanalyse, setKennzahlenanalyse] = useState<Kennzahlenanalyse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [u, b, g, k] = await Promise.all([
        LivingAppsService.getUnternehmensstammdaten(),
        LivingAppsService.getBilanz(),
        LivingAppsService.getGewinnUndVerlustrechnung(),
        LivingAppsService.getKennzahlenanalyse(),
      ]);
      setUnternehmensstammdaten(u);
      setBilanz(b);
      setGewinnUndVerlustrechnung(g);
      setKennzahlenanalyse(k);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  // ── Wizard-Schritt (1-basiert) ──────────────────────────────────────────
  const urlStep = parseInt(searchParams.get('step') ?? '', 10);
  const initialStep = urlStep >= 1 && urlStep <= 4 ? urlStep : 1;
  const [step, setStep] = useState(initialStep);

  // ── Ausgewähltes Unternehmen ────────────────────────────────────────────
  const urlUnternehmenId = searchParams.get('unternehmenId') ?? undefined;
  const [selectedUnternehmenId, setSelectedUnternehmenId] = useState<string | undefined>(urlUnternehmenId);

  // ── Dialoge ────────────────────────────────────────────────────────────
  const [unternehmenDialogOpen, setUnternehmenDialogOpen] = useState(false);
  const [kzDialogOpen, setKzDialogOpen] = useState(false);
  const [editKz, setEditKz] = useState<Kennzahlenanalyse | null>(null);

  // ── Deep-Link: wenn unternehmenId im URL → Schritt 2 ──────────────────
  useEffect(() => {
    if (urlUnternehmenId && unternehmensstammdaten.length > 0) {
      const exists = unternehmensstammdaten.find(u => u.record_id === urlUnternehmenId);
      if (exists) {
        setSelectedUnternehmenId(urlUnternehmenId);
        if (step === 1) setStep(2);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlUnternehmenId, unternehmensstammdaten.length]);

  // ── Gefilterte Daten für das ausgewählte Unternehmen ──────────────────
  const unternehmensbilanzen = useMemo<Bilanz[]>(() => {
    if (!selectedUnternehmenId) return [];
    return bilanz.filter(b => getUnternehmenId(b.fields.bilanz_unternehmen) === selectedUnternehmenId);
  }, [bilanz, selectedUnternehmenId]);

  const unternehmensGuvs = useMemo<GewinnUndVerlustrechnung[]>(() => {
    if (!selectedUnternehmenId) return [];
    return gewinnUndVerlustrechnung.filter(g => getUnternehmenId(g.fields.guv_unternehmen) === selectedUnternehmenId);
  }, [gewinnUndVerlustrechnung, selectedUnternehmenId]);

  const bilanzIds = useMemo(() => new Set(unternehmensbilanzen.map(b => b.record_id)), [unternehmensbilanzen]);

  const unternehmensKzs = useMemo<Kennzahlenanalyse[]>(() => {
    return kennzahlenanalyse.filter(kz => {
      const bilanzId = getUnternehmenId(kz.fields.kz_bilanz);
      return bilanzId != null && bilanzIds.has(bilanzId);
    });
  }, [kennzahlenanalyse, bilanzIds]);

  // Neueste Bilanz und GuV für Dialog-Defaults
  const newestBilanz = useMemo<Bilanz | undefined>(() => {
    if (unternehmensbilanzen.length === 0) return undefined;
    return [...unternehmensbilanzen].sort((a, b) =>
      (b.fields.geschaeftsjahr ?? '').localeCompare(a.fields.geschaeftsjahr ?? '')
    )[0];
  }, [unternehmensbilanzen]);

  const newestGuv = useMemo<GewinnUndVerlustrechnung | undefined>(() => {
    if (unternehmensGuvs.length === 0) return undefined;
    return [...unternehmensGuvs].sort((a, b) =>
      (b.fields.guv_geschaeftsjahr ?? '').localeCompare(a.fields.guv_geschaeftsjahr ?? '')
    )[0];
  }, [unternehmensGuvs]);

  // Neueste KZ-Analyse (nach Analysedatum)
  const newestKz = useMemo<Kennzahlenanalyse | undefined>(() => {
    if (unternehmensKzs.length === 0) return undefined;
    return [...unternehmensKzs].sort((a, b) =>
      (b.fields.analysedatum ?? '').localeCompare(a.fields.analysedatum ?? '')
    )[0];
  }, [unternehmensKzs]);

  const selectedUnternehmen = useMemo<Unternehmensstammdaten | undefined>(
    () => unternehmensstammdaten.find(u => u.record_id === selectedUnternehmenId),
    [unternehmensstammdaten, selectedUnternehmenId]
  );

  // KZ-Dialog Defaults
  const kzDialogDefaultValues = useMemo((): Kennzahlenanalyse['fields'] | undefined => {
    if (editKz) return editKz.fields;
    const defaults: Kennzahlenanalyse['fields'] = {};
    if (newestBilanz) {
      defaults.kz_bilanz = createRecordUrl(APP_IDS.BILANZ, newestBilanz.record_id);
    }
    if (newestGuv) {
      defaults.kz_guv = createRecordUrl(APP_IDS.GEWINN_UND_VERLUSTRECHNUNG, newestGuv.record_id);
    }
    return Object.keys(defaults).length > 0 ? defaults : undefined;
  }, [editKz, newestBilanz, newestGuv]);

  // ─── Handler ─────────────────────────────────────────────────────────────
  function handleSelectUnternehmen(id: string) {
    setSelectedUnternehmenId(id);
    setStep(2);
  }

  async function handleCreateUnternehmen(fields: Unternehmensstammdaten['fields']) {
    const resp = await LivingAppsService.createUnternehmensstammdatenEntry(fields);
    await fetchAll();
    // Auto-select newly created
    const newId = Object.keys(resp)[0];
    if (newId) {
      setSelectedUnternehmenId(newId);
      setStep(2);
    }
    setUnternehmenDialogOpen(false);
  }

  async function handleCreateKz(fields: Kennzahlenanalyse['fields']) {
    if (editKz) {
      await LivingAppsService.updateKennzahlenanalyseEntry(editKz.record_id, fields);
    } else {
      await LivingAppsService.createKennzahlenanalyseEntry(fields);
    }
    await fetchAll();
    setEditKz(null);
    setKzDialogOpen(false);
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <IntentWizardShell
      title="Unternehmen analysieren"
      subtitle="Vollständige Bonitäts- und Kennzahlenanalyse in vier Schritten"
      steps={STEPS}
      currentStep={step}
      onStepChange={setStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ── SCHRITT 1: Unternehmen wählen ─────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <EntitySelectStep
            items={unternehmensstammdaten.map(u => ({
              id: u.record_id,
              title: u.fields.unternehmensname ?? '(Kein Name)',
              subtitle: [u.fields.rechtsform?.label, u.fields.ort].filter(Boolean).join(' · '),
              icon: <IconBuilding size={20} className="text-primary" />,
            }))}
            onSelect={handleSelectUnternehmen}
            searchPlaceholder="Unternehmen suchen..."
            emptyIcon={<IconBuilding size={32} />}
            emptyText="Noch kein Unternehmen vorhanden."
            createLabel="Neu anlegen"
            onCreateNew={() => setUnternehmenDialogOpen(true)}
            createDialog={
              <UnternehmensstammdatenDialog
                open={unternehmenDialogOpen}
                onClose={() => setUnternehmenDialogOpen(false)}
                onSubmit={handleCreateUnternehmen}
                enablePhotoScan={AI_PHOTO_SCAN['Unternehmensstammdaten']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmensstammdaten']}
              />
            }
          />
        </div>
      )}

      {/* ── SCHRITT 2: Finanzdaten-Überblick ─────────────────────────────── */}
      {step === 2 && selectedUnternehmen && (
        <div className="space-y-6">
          {/* Unternehmen-Header */}
          <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconBuilding size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{selectedUnternehmen.fields.unternehmensname}</p>
              <p className="text-sm text-muted-foreground truncate">
                {[selectedUnternehmen.fields.rechtsform?.label, selectedUnternehmen.fields.ort].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>

          {/* Bilanzen */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <IconCoin size={16} className="text-primary shrink-0" />
              Bilanzen
            </h3>
            {unternehmensbilanzen.length === 0 ? (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-dashed bg-card">
                <IconAlertCircle size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Keine Bilanz vorhanden.</p>
                  <a
                    href={`#/intents/jahresabschluss-erfassen?unternehmenId=${selectedUnternehmenId}`}
                    className="text-sm text-primary hover:underline mt-1 inline-block"
                  >
                    Bilanz erfassen →
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...unternehmensbilanzen]
                  .sort((a, b) => (b.fields.geschaeftsjahr ?? '').localeCompare(a.fields.geschaeftsjahr ?? ''))
                  .map(b => (
                    <div key={b.record_id} className="bg-card border rounded-xl p-4 overflow-hidden">
                      <div className="flex items-center gap-2 mb-3">
                        <IconCalendar size={14} className="text-muted-foreground shrink-0" />
                        <span className="font-semibold text-sm truncate">
                          {b.fields.geschaeftsjahr ?? '–'}
                        </span>
                        {b.fields.einheit && (
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">{b.fields.einheit.label}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Bilanzsumme</p>
                          <p className="font-medium">{fmt(b.fields.bilanzsumme_aktiva)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Eigenkapital</p>
                          <p className="font-medium">{fmt(b.fields.eigenkapital_gesamt)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Fremdkapital</p>
                          <p className="font-medium">{fmt(b.fields.fremdkapital_gesamt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* GuV */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <IconChartBar size={16} className="text-primary shrink-0" />
              Gewinn- und Verlustrechnungen
            </h3>
            {unternehmensGuvs.length === 0 ? (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-dashed bg-card">
                <IconAlertCircle size={18} className="text-muted-foreground shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Keine GuV vorhanden.</p>
                  <a
                    href={`#/intents/jahresabschluss-erfassen?unternehmenId=${selectedUnternehmenId}`}
                    className="text-sm text-primary hover:underline mt-1 inline-block"
                  >
                    GuV erfassen →
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[...unternehmensGuvs]
                  .sort((a, b) => (b.fields.guv_geschaeftsjahr ?? '').localeCompare(a.fields.guv_geschaeftsjahr ?? ''))
                  .map(g => (
                    <div key={g.record_id} className="bg-card border rounded-xl p-4 overflow-hidden">
                      <div className="flex items-center gap-2 mb-3">
                        <IconCalendar size={14} className="text-muted-foreground shrink-0" />
                        <span className="font-semibold text-sm truncate">
                          {g.fields.guv_geschaeftsjahr ?? '–'}
                        </span>
                        {g.fields.guv_einheit && (
                          <span className="text-xs text-muted-foreground ml-auto shrink-0">{g.fields.guv_einheit.label}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-muted-foreground">Umsatzerlöse</p>
                          <p className="font-medium">{fmt(g.fields.umsatzerloese)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">EBIT</p>
                          <p className="font-medium">{fmt(g.fields.ebit)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Jahresüberschuss</p>
                          <p className="font-medium">{fmt(g.fields.jahresueberschuss_guv)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button onClick={() => setStep(3)} className="gap-2 flex-1 sm:flex-none">
              Zur Kennzahlenanalyse
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── SCHRITT 3: Kennzahlenanalyse ─────────────────────────────────── */}
      {step === 3 && selectedUnternehmen && (
        <div className="space-y-6">
          {/* Unternehmen-Header */}
          <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconBuilding size={20} className="text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">{selectedUnternehmen.fields.unternehmensname}</p>
              <p className="text-sm text-muted-foreground truncate">
                {[selectedUnternehmen.fields.rechtsform?.label, selectedUnternehmen.fields.ort].filter(Boolean).join(' · ')}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => { setEditKz(null); setKzDialogOpen(true); }}
              className="shrink-0 gap-1.5"
            >
              <IconPlus size={15} />
              Neue Analyse
            </Button>
          </div>

          {/* KZ-Analyse-Liste */}
          {unternehmensKzs.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <IconChartBar size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Noch keine Kennzahlenanalyse vorhanden.
              </p>
              <Button
                onClick={() => { setEditKz(null); setKzDialogOpen(true); }}
                className="gap-2"
              >
                <IconPlus size={16} />
                Analyse erstellen
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {[...unternehmensKzs]
                .sort((a, b) => (b.fields.analysedatum ?? '').localeCompare(a.fields.analysedatum ?? ''))
                .map(kz => {
                  const bonitaetKey = kz.fields.bonitaetsbewertung?.key ?? '';
                  const bonitaetLabel = kz.fields.bonitaetsbewertung?.label ?? '–';
                  const colorClass = BONITAET_COLOR[bonitaetKey] ?? 'bg-muted text-muted-foreground border-border';
                  return (
                    <div key={kz.record_id} className="bg-card border rounded-xl p-4 overflow-hidden">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            {kz.fields.bonitaetsbewertung && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${colorClass}`}>
                                {bonitaetLabel}
                              </span>
                            )}
                            {kz.fields.analysedatum && (
                              <span className="text-xs text-muted-foreground">
                                {kz.fields.analysedatum}
                              </span>
                            )}
                          </div>
                          {(kz.fields.analyst_vorname || kz.fields.analyst_nachname) && (
                            <p className="text-xs text-muted-foreground truncate">
                              Analyst: {[kz.fields.analyst_vorname, kz.fields.analyst_nachname].filter(Boolean).join(' ')}
                            </p>
                          )}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3 text-xs">
                            <div>
                              <p className="text-muted-foreground">EK-Quote</p>
                              <p className="font-medium">{pct(kz.fields.eigenkapitalquote)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">EBIT-Marge</p>
                              <p className="font-medium">{pct(kz.fields.ebit_marge)}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Verschuldungsgrad</p>
                              <p className="font-medium">{pct(kz.fields.verschuldungsgrad)}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setEditKz(kz); setKzDialogOpen(true); }}
                          className="shrink-0 gap-1.5"
                        >
                          <IconPencil size={14} />
                          Bearbeiten
                        </Button>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* KZ-Dialog */}
          <KennzahlenanalyseDialog
            open={kzDialogOpen}
            onClose={() => { setKzDialogOpen(false); setEditKz(null); }}
            onSubmit={handleCreateKz}
            defaultValues={kzDialogDefaultValues}
            bilanzList={bilanz}
            gewinn__und_verlustrechnungList={gewinnUndVerlustrechnung}
            enablePhotoScan={AI_PHOTO_SCAN['Kennzahlenanalyse']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlenanalyse']}
          />

          {/* Navigation */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button
              onClick={() => setStep(4)}
              disabled={unternehmensKzs.length === 0}
              className="gap-2 flex-1 sm:flex-none"
            >
              Ergebnis ansehen
              <IconArrowRight size={16} />
            </Button>
          </div>
        </div>
      )}

      {/* ── SCHRITT 4: Analyse-Ergebnis ───────────────────────────────────── */}
      {step === 4 && selectedUnternehmen && (
        <div className="space-y-6">
          {newestKz ? (
            <>
              {/* Bonitätsbewertung prominent */}
              {newestKz.fields.bonitaetsbewertung && (() => {
                const key = newestKz.fields.bonitaetsbewertung.key;
                const label = newestKz.fields.bonitaetsbewertung.label;
                const colorClass = BONITAET_COLOR[key] ?? 'bg-muted text-muted-foreground border-border';
                return (
                  <div className={`rounded-2xl border-2 p-6 text-center overflow-hidden ${colorClass}`}>
                    <p className="text-xs font-medium uppercase tracking-widest mb-2 opacity-70">
                      Bonitätsbewertung
                    </p>
                    <p className="text-3xl font-bold">{label}</p>
                    <div className="mt-3 flex justify-center items-center gap-4 text-sm flex-wrap">
                      {(newestKz.fields.analyst_vorname || newestKz.fields.analyst_nachname) && (
                        <span>
                          Analyst: {[newestKz.fields.analyst_vorname, newestKz.fields.analyst_nachname].filter(Boolean).join(' ')}
                        </span>
                      )}
                      {newestKz.fields.analysedatum && (
                        <span>{newestKz.fields.analysedatum}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Unternehmen-Kontext */}
              <div className="flex items-center gap-3 p-4 bg-secondary rounded-xl overflow-hidden">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <IconBuilding size={18} className="text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedUnternehmen.fields.unternehmensname}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {[selectedUnternehmen.fields.rechtsform?.label, selectedUnternehmen.fields.ort].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              {/* Kennzahlen-Grid */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Kennzahlen im Überblick</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <KzCard label="Eigenkapitalquote" value={pct(newestKz.fields.eigenkapitalquote)} />
                  <KzCard label="Fremdkapitalquote" value={pct(newestKz.fields.fremdkapitalquote)} />
                  <KzCard label="Verschuldungsgrad" value={pct(newestKz.fields.verschuldungsgrad)} />
                  <KzCard label="Liquidität I" value={pct(newestKz.fields.liquiditaet_1)} />
                  <KzCard label="Liquidität II" value={pct(newestKz.fields.liquiditaet_2)} />
                  <KzCard label="Liquidität III" value={pct(newestKz.fields.liquiditaet_3)} />
                  <KzCard label="Eigenkapitalrendite" value={pct(newestKz.fields.eigenkapitalrendite)} />
                  <KzCard label="Gesamtkapitalrendite" value={pct(newestKz.fields.gesamtkapitalrendite)} />
                  <KzCard label="Umsatzrendite" value={pct(newestKz.fields.umsatzrendite)} />
                  <KzCard label="EBIT-Marge" value={pct(newestKz.fields.ebit_marge)} />
                  <KzCard label="EBITDA-Marge" value={pct(newestKz.fields.ebitda_marge)} />
                  <KzCard label="Kapitalumschlag" value={newestKz.fields.kapitalumschlag != null ? newestKz.fields.kapitalumschlag.toFixed(2) : '–'} />
                  <KzCard label="Debitorenlaufzeit (Tage)" value={fmt(newestKz.fields.debitorenlaufzeit)} />
                  <KzCard label="Kreditorenlaufzeit (Tage)" value={fmt(newestKz.fields.kreditorenlaufzeit)} />
                  <KzCard label="Lagerdauer (Tage)" value={fmt(newestKz.fields.lagerdauer)} />
                  <KzCard label="Cashflow operativ" value={fmt(newestKz.fields.cashflow_operativ)} />
                </div>
              </div>

              {/* Stärken */}
              {newestKz.fields.staerken && (
                <div className="rounded-xl border border-green-300 bg-green-500/10 p-4 overflow-hidden">
                  <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2">Stärken</p>
                  <p className="text-sm text-green-800 whitespace-pre-line">{newestKz.fields.staerken}</p>
                </div>
              )}

              {/* Schwächen */}
              {newestKz.fields.schwaechen && (
                <div className="rounded-xl border border-red-300 bg-red-400/10 p-4 overflow-hidden">
                  <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2">Schwächen</p>
                  <p className="text-sm text-red-800 whitespace-pre-line">{newestKz.fields.schwaechen}</p>
                </div>
              )}

              {/* Gesamtkommentar */}
              {newestKz.fields.gesamtkommentar && (
                <div className="rounded-xl border border-border bg-secondary p-4 overflow-hidden">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Gesamtkommentar</p>
                  <p className="text-sm text-foreground whitespace-pre-line">{newestKz.fields.gesamtkommentar}</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-16">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <IconChartBar size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                Keine Kennzahlenanalyse vorhanden. Bitte zuerst eine Analyse erstellen.
              </p>
            </div>
          )}

          {/* Aktionen */}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" onClick={() => setStep(3)} className="gap-2">
              <IconArrowLeft size={16} />
              Zurück
            </Button>
            <Button
              variant="outline"
              onClick={() => { setEditKz(null); setKzDialogOpen(true); setStep(3); }}
              className="gap-2"
            >
              <IconPlus size={16} />
              Neue Analyse
            </Button>
            <a
              href={`#/intents/jahresabschluss-erfassen?unternehmenId=${selectedUnternehmenId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-border bg-card text-sm font-medium hover:bg-accent transition-colors"
            >
              <IconCoin size={16} />
              Jahresabschluss erfassen
            </a>
          </div>

          {/* KZ-Dialog auch auf Schritt 4 (für "Neue Analyse") */}
          <KennzahlenanalyseDialog
            open={kzDialogOpen}
            onClose={() => { setKzDialogOpen(false); setEditKz(null); }}
            onSubmit={handleCreateKz}
            defaultValues={kzDialogDefaultValues}
            bilanzList={bilanz}
            gewinn__und_verlustrechnungList={gewinnUndVerlustrechnung}
            enablePhotoScan={AI_PHOTO_SCAN['Kennzahlenanalyse']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Kennzahlenanalyse']}
          />
        </div>
      )}
    </IntentWizardShell>
  );
}
