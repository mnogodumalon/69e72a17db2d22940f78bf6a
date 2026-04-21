import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Unternehmensstammdaten, Bilanz, GewinnUndVerlustrechnung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl, extractRecordId } from '@/services/livingAppsService';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { IntentWizardShell } from '@/components/IntentWizardShell';
import { EntitySelectStep } from '@/components/EntitySelectStep';
import { UnternehmensstammdatenDialog } from '@/components/dialogs/UnternehmensstammdatenDialog';
import { BilanzDialog } from '@/components/dialogs/BilanzDialog';
import { GewinnUndVerlustrechnungDialog } from '@/components/dialogs/GewinnUndVerlustrechnungDialog';
import { Button } from '@/components/ui/button';
import {
  IconBuilding,
  IconChartBar,
  IconTrendingUp,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconArrowRight,
  IconScale,
} from '@tabler/icons-react';

function fmt(n: number | undefined | null): string {
  if (n == null) return '–';
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(1) + ' Mio.';
  if (abs >= 1_000) return (n / 1_000).toFixed(0) + ' T';
  return n.toFixed(0);
}

const WIZARD_STEPS = [
  { label: 'Unternehmen' },
  { label: 'Bilanz' },
  { label: 'GuV' },
  { label: 'Zusammenfassung' },
];

export default function JahresabschlussErfassenPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Data state
  const [unternehmen, setUnternehmen] = useState<Unternehmensstammdaten[]>([]);
  const [bilanzen, setBilanzen] = useState<Bilanz[]>([]);
  const [guvs, setGuvs] = useState<GewinnUndVerlustrechnung[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedUnternehmenId, setSelectedUnternehmenId] = useState<string | null>(null);
  const [selectedBilanzId, setSelectedBilanzId] = useState<string | null>(null);
  const [selectedGuvId, setSelectedGuvId] = useState<string | null>(null);

  // Dialog state
  const [unternehmenDialogOpen, setUnternehmenDialogOpen] = useState(false);
  const [bilanzDialogOpen, setBilanzDialogOpen] = useState(false);
  const [guvDialogOpen, setGuvDialogOpen] = useState(false);

  // Success state
  const [bilanzSuccess, setBilanzSuccess] = useState(false);
  const [guvSuccess, setGuvSuccess] = useState(false);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [uResp, bResp, gResp] = await Promise.all([
        LivingAppsService.getUnternehmensstammdaten(),
        LivingAppsService.getBilanz(),
        LivingAppsService.getGewinnUndVerlustrechnung(),
      ]);
      setUnternehmen(uResp);
      setBilanzen(bResp);
      setGuvs(gResp);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  // Deep-link: read unternehmenId from URL and jump to step 2
  useEffect(() => {
    const urlUnternehmenId = searchParams.get('unternehmenId');
    if (urlUnternehmenId && !selectedUnternehmenId) {
      setSelectedUnternehmenId(urlUnternehmenId);
      setCurrentStep(2);
    }
    const urlStep = parseInt(searchParams.get('step') ?? '', 10);
    if (urlStep >= 1 && urlStep <= 4) {
      setCurrentStep(urlStep);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync URL params when step or unternehmen changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (currentStep > 1) {
      params.set('step', String(currentStep));
    } else {
      params.delete('step');
    }
    if (selectedUnternehmenId) {
      params.set('unternehmenId', selectedUnternehmenId);
    } else {
      params.delete('unternehmenId');
    }
    setSearchParams(params, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, selectedUnternehmenId]);

  const selectedUnternehmen = unternehmen.find(u => u.record_id === selectedUnternehmenId) ?? null;
  const selectedBilanz = bilanzen.find(b => b.record_id === selectedBilanzId) ?? null;
  const selectedGuv = guvs.find(g => g.record_id === selectedGuvId) ?? null;

  // Filter bilanzen and guvs for selected company
  const unternehmensUrl = selectedUnternehmenId
    ? createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, selectedUnternehmenId)
    : null;

  const unternehmensbilanzen = bilanzen.filter(b => {
    const id = extractRecordId(b.fields.bilanz_unternehmen);
    return id === selectedUnternehmenId;
  });

  const unternehmensGuvs = guvs.filter(g => {
    const id = extractRecordId(g.fields.guv_unternehmen);
    return id === selectedUnternehmenId;
  });

  // Step 1: Select company
  function handleUnternehmenSelect(id: string) {
    setSelectedUnternehmenId(id);
    setSelectedBilanzId(null);
    setSelectedGuvId(null);
    setBilanzSuccess(false);
    setGuvSuccess(false);
    setCurrentStep(2);
  }

  // Step 2: Bilanz selected or created
  function handleBilanzSelect(id: string) {
    setSelectedBilanzId(id);
    setBilanzSuccess(true);
  }

  // Step 3: GuV selected or created
  function handleGuvSelect(id: string) {
    setSelectedGuvId(id);
    setGuvSuccess(true);
  }

  function handleReset() {
    setSelectedUnternehmenId(null);
    setSelectedBilanzId(null);
    setSelectedGuvId(null);
    setBilanzSuccess(false);
    setGuvSuccess(false);
    setCurrentStep(1);
  }

  return (
    <IntentWizardShell
      title="Jahresabschluss erfassen"
      subtitle="Bilanz und GuV vollständig in einem geführten Workflow erfassen"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={setCurrentStep}
      loading={loading}
      error={error}
      onRetry={fetchAll}
    >
      {/* ---- SCHRITT 1: Unternehmen wählen ---- */}
      {currentStep === 1 && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Unternehmen wählen</h2>
            <p className="text-sm text-muted-foreground">
              Wähle das Unternehmen, für das du einen Jahresabschluss erfassen möchtest.
            </p>
          </div>
          <EntitySelectStep
            items={unternehmen.map(u => ({
              id: u.record_id,
              title: u.fields.unternehmensname ?? '(Kein Name)',
              subtitle: [u.fields.rechtsform?.label, u.fields.branche?.label]
                .filter(Boolean)
                .join(' · '),
              icon: <IconBuilding size={18} className="text-primary" />,
            }))}
            onSelect={handleUnternehmenSelect}
            searchPlaceholder="Unternehmen suchen..."
            emptyIcon={<IconBuilding size={32} />}
            emptyText="Noch keine Unternehmen vorhanden."
            createLabel="Neues Unternehmen anlegen"
            onCreateNew={() => setUnternehmenDialogOpen(true)}
            createDialog={
              <UnternehmensstammdatenDialog
                open={unternehmenDialogOpen}
                onClose={() => setUnternehmenDialogOpen(false)}
                onSubmit={async (fields: Unternehmensstammdaten['fields']) => {
                  await LivingAppsService.createUnternehmensstammdatenEntry(fields);
                  await fetchAll();
                  setUnternehmenDialogOpen(false);
                }}
                enablePhotoScan={AI_PHOTO_SCAN['Unternehmensstammdaten']}
                enablePhotoLocation={AI_PHOTO_LOCATION['Unternehmensstammdaten']}
              />
            }
          />
        </div>
      )}

      {/* ---- SCHRITT 2: Bilanz erfassen ---- */}
      {currentStep === 2 && selectedUnternehmen && (
        <div className="space-y-5">
          {/* Context header */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <IconBuilding size={20} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Ausgewähltes Unternehmen</p>
              <p className="font-semibold truncate">
                {selectedUnternehmen.fields.unternehmensname ?? '(Kein Name)'}
              </p>
              {(selectedUnternehmen.fields.rechtsform || selectedUnternehmen.fields.branche) && (
                <p className="text-xs text-muted-foreground truncate">
                  {[
                    selectedUnternehmen.fields.rechtsform?.label,
                    selectedUnternehmen.fields.branche?.label,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => setCurrentStep(1)}
            >
              Ändern
            </Button>
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Bilanz erfassen</h2>
            <p className="text-sm text-muted-foreground">
              Erfasse die Bilanz für dieses Unternehmen oder wähle eine vorhandene aus.
            </p>
          </div>

          {/* Existing bilanzen */}
          {unternehmensbilanzen.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Vorhandene Bilanzen ({unternehmensbilanzen.length})
              </p>
              <div className="space-y-2">
                {unternehmensbilanzen.map(b => (
                  <button
                    key={b.record_id}
                    onClick={() => handleBilanzSelect(b.record_id)}
                    className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                      selectedBilanzId === b.record_id
                        ? 'border-primary bg-primary/5'
                        : 'bg-card hover:bg-accent hover:border-primary/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <IconScale size={18} className="text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        Geschäftsjahr {b.fields.geschaeftsjahr ?? '–'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Bilanzsumme: {fmt(b.fields.bilanzsumme_aktiva)} {b.fields.waehrung?.label ?? ''}
                        {b.fields.einheit ? ` · ${b.fields.einheit.label}` : ''}
                      </p>
                    </div>
                    {selectedBilanzId === b.record_id && (
                      <IconCheck size={16} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Success state */}
          {bilanzSuccess && selectedBilanz && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <IconCheck size={16} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-800">Bilanz erfasst</p>
                <p className="text-xs text-green-700 truncate">
                  Geschäftsjahr {selectedBilanz.fields.geschaeftsjahr ?? '–'} ·{' '}
                  Bilanzsumme: {fmt(selectedBilanz.fields.bilanzsumme_aktiva)}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setBilanzDialogOpen(true)}
              className="flex-1 gap-2"
              variant={bilanzSuccess ? 'outline' : 'default'}
            >
              <IconPlus size={16} />
              {unternehmensbilanzen.length > 0 ? 'Neue Bilanz erfassen' : 'Bilanz erfassen'}
            </Button>
            {bilanzSuccess && (
              <Button onClick={() => setCurrentStep(3)} className="flex-1 gap-2">
                Weiter zur GuV
                <IconArrowRight size={16} />
              </Button>
            )}
            {!bilanzSuccess && selectedBilanzId && (
              <Button onClick={() => { setBilanzSuccess(true); setCurrentStep(3); }} className="flex-1 gap-2">
                Auswahl bestätigen & weiter
                <IconArrowRight size={16} />
              </Button>
            )}
          </div>

          <BilanzDialog
            open={bilanzDialogOpen}
            onClose={() => setBilanzDialogOpen(false)}
            onSubmit={async (fields: Bilanz['fields']) => {
              await LivingAppsService.createBilanzEntry(fields);
              await fetchAll();
              // Find new bilanz after reload — find newest for this company
              setBilanzDialogOpen(false);
              setBilanzSuccess(true);
              // After fetchAll the bilanzen list will update; pick the most recent
              const fresh = await LivingAppsService.getBilanz();
              setBilanzen(fresh);
              const forThisCompany = fresh.filter(b => {
                const id = extractRecordId(b.fields.bilanz_unternehmen);
                return id === selectedUnternehmenId;
              });
              if (forThisCompany.length > 0) {
                // Pick the last added (highest createdat)
                const newest = forThisCompany.sort((a, b) =>
                  new Date(b.createdat).getTime() - new Date(a.createdat).getTime()
                )[0];
                setSelectedBilanzId(newest.record_id);
              }
            }}
            defaultValues={
              unternehmensUrl
                ? { bilanz_unternehmen: unternehmensUrl }
                : undefined
            }
            unternehmensstammdatenList={unternehmen}
            enablePhotoScan={AI_PHOTO_SCAN['Bilanz']}
            enablePhotoLocation={AI_PHOTO_LOCATION['Bilanz']}
          />
        </div>
      )}

      {/* ---- SCHRITT 3: GuV erfassen ---- */}
      {currentStep === 3 && selectedUnternehmen && (
        <div className="space-y-5">
          {/* Context header */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border flex-1 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <IconBuilding size={20} className="text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Unternehmen</p>
                <p className="font-semibold text-sm truncate">
                  {selectedUnternehmen.fields.unternehmensname ?? '(Kein Name)'}
                </p>
              </div>
            </div>
            {selectedBilanz && (
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50 border flex-1 overflow-hidden">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <IconScale size={18} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Bilanz</p>
                  <p className="font-semibold text-sm truncate">
                    GJ {selectedBilanz.fields.geschaeftsjahr ?? '–'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Bilanzsumme: {fmt(selectedBilanz.fields.bilanzsumme_aktiva)}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Gewinn- und Verlustrechnung erfassen</h2>
            <p className="text-sm text-muted-foreground">
              Erfasse die GuV für dieses Unternehmen oder wähle eine vorhandene aus.
            </p>
          </div>

          {/* Existing GUVs */}
          {unternehmensGuvs.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">
                Vorhandene GuVs ({unternehmensGuvs.length})
              </p>
              <div className="space-y-2">
                {unternehmensGuvs.map(g => (
                  <button
                    key={g.record_id}
                    onClick={() => handleGuvSelect(g.record_id)}
                    className={`w-full text-left flex items-center gap-3 p-4 rounded-xl border transition-colors overflow-hidden ${
                      selectedGuvId === g.record_id
                        ? 'border-primary bg-primary/5'
                        : 'bg-card hover:bg-accent hover:border-primary/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <IconTrendingUp size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        Geschäftsjahr {g.fields.guv_geschaeftsjahr ?? '–'}
                      </p>
                      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>Umsatz: {fmt(g.fields.umsatzerloese)}</span>
                        <span>EBIT: {fmt(g.fields.ebit)}</span>
                        <span>Jahresüberschuss: {fmt(g.fields.jahresueberschuss_guv)}</span>
                      </div>
                    </div>
                    {selectedGuvId === g.record_id && (
                      <IconCheck size={16} className="text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Success state */}
          {guvSuccess && selectedGuv && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <IconCheck size={16} className="text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-green-800">GuV erfasst</p>
                <p className="text-xs text-green-700 truncate">
                  Geschäftsjahr {selectedGuv.fields.guv_geschaeftsjahr ?? '–'} ·{' '}
                  Umsatz: {fmt(selectedGuv.fields.umsatzerloese)} ·{' '}
                  EBIT: {fmt(selectedGuv.fields.ebit)}
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setGuvDialogOpen(true)}
              className="flex-1 gap-2"
              variant={guvSuccess ? 'outline' : 'default'}
            >
              <IconPlus size={16} />
              {unternehmensGuvs.length > 0 ? 'Neue GuV erfassen' : 'GuV erfassen'}
            </Button>
            {guvSuccess && (
              <Button onClick={() => setCurrentStep(4)} className="flex-1 gap-2">
                Zur Zusammenfassung
                <IconArrowRight size={16} />
              </Button>
            )}
            {!guvSuccess && selectedGuvId && (
              <Button onClick={() => { setGuvSuccess(true); setCurrentStep(4); }} className="flex-1 gap-2">
                Auswahl bestätigen & weiter
                <IconArrowRight size={16} />
              </Button>
            )}
          </div>

          <GewinnUndVerlustrechnungDialog
            open={guvDialogOpen}
            onClose={() => setGuvDialogOpen(false)}
            onSubmit={async (fields: GewinnUndVerlustrechnung['fields']) => {
              await LivingAppsService.createGewinnUndVerlustrechnungEntry(fields);
              setGuvDialogOpen(false);
              setGuvSuccess(true);
              const fresh = await LivingAppsService.getGewinnUndVerlustrechnung();
              setGuvs(fresh);
              const forThisCompany = fresh.filter(g => {
                const id = extractRecordId(g.fields.guv_unternehmen);
                return id === selectedUnternehmenId;
              });
              if (forThisCompany.length > 0) {
                const newest = forThisCompany.sort((a, b) =>
                  new Date(b.createdat).getTime() - new Date(a.createdat).getTime()
                )[0];
                setSelectedGuvId(newest.record_id);
              }
            }}
            defaultValues={
              unternehmensUrl
                ? { guv_unternehmen: unternehmensUrl }
                : undefined
            }
            unternehmensstammdatenList={unternehmen}
            enablePhotoScan={AI_PHOTO_SCAN['GewinnUndVerlustrechnung']}
            enablePhotoLocation={AI_PHOTO_LOCATION['GewinnUndVerlustrechnung']}
          />
        </div>
      )}

      {/* ---- SCHRITT 4: Zusammenfassung ---- */}
      {currentStep === 4 && selectedUnternehmen && (
        <div className="space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Zusammenfassung</h2>
            <p className="text-sm text-muted-foreground">
              Der Jahresabschluss wurde vollständig erfasst.
            </p>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Company */}
            <div className="p-5 rounded-xl border bg-card overflow-hidden space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <IconBuilding size={16} className="text-primary" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Unternehmen
                </span>
              </div>
              <div>
                <p className="font-semibold truncate">
                  {selectedUnternehmen.fields.unternehmensname ?? '–'}
                </p>
                {selectedUnternehmen.fields.rechtsform && (
                  <p className="text-sm text-muted-foreground">
                    {selectedUnternehmen.fields.rechtsform.label}
                  </p>
                )}
                {selectedUnternehmen.fields.branche && (
                  <p className="text-xs text-muted-foreground truncate">
                    {selectedUnternehmen.fields.branche.label}
                  </p>
                )}
              </div>
            </div>

            {/* Bilanz */}
            <div className="p-5 rounded-xl border bg-card overflow-hidden space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <IconScale size={16} className="text-blue-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Bilanz
                </span>
              </div>
              {selectedBilanz ? (
                <div className="space-y-1">
                  <p className="font-semibold">
                    GJ {selectedBilanz.fields.geschaeftsjahr ?? '–'}
                  </p>
                  <div className="space-y-0.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">Bilanzsumme</span>
                      <span className="font-medium shrink-0">
                        {fmt(selectedBilanz.fields.bilanzsumme_aktiva)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">Eigenkapital</span>
                      <span className="font-medium shrink-0">
                        {fmt(selectedBilanz.fields.eigenkapital_gesamt)}
                      </span>
                    </div>
                    {selectedBilanz.fields.waehrung && (
                      <p className="text-xs text-muted-foreground">
                        {selectedBilanz.fields.waehrung.label}
                        {selectedBilanz.fields.einheit
                          ? ` · ${selectedBilanz.fields.einheit.label}`
                          : ''}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Keine Bilanz ausgewählt</p>
              )}
            </div>

            {/* GuV */}
            <div className="p-5 rounded-xl border bg-card overflow-hidden space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                  <IconTrendingUp size={16} className="text-emerald-600" />
                </div>
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  GuV
                </span>
              </div>
              {selectedGuv ? (
                <div className="space-y-1">
                  <p className="font-semibold">
                    GJ {selectedGuv.fields.guv_geschaeftsjahr ?? '–'}
                  </p>
                  <div className="space-y-0.5 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">Umsatzerlöse</span>
                      <span className="font-medium shrink-0">
                        {fmt(selectedGuv.fields.umsatzerloese)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">EBIT</span>
                      <span className="font-medium shrink-0">
                        {fmt(selectedGuv.fields.ebit)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground truncate">Jahresüberschuss</span>
                      <span className="font-medium shrink-0">
                        {fmt(selectedGuv.fields.jahresueberschuss_guv)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Keine GuV ausgewählt</p>
              )}
            </div>
          </div>

          {/* Success banner */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <IconCheck size={20} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Jahresabschluss vollständig erfasst</p>
              <p className="text-sm text-green-700">
                Bilanz und GuV wurden erfolgreich gespeichert und sind jetzt für die Analyse verfügbar.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`#/intents/unternehmen-analysieren?unternehmenId=${selectedUnternehmenId}`}
              className="flex-1"
            >
              <Button className="w-full gap-2">
                <IconChartBar size={16} />
                Zur Bonitätsanalyse
              </Button>
            </a>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={handleReset}
            >
              <IconRefresh size={16} />
              Neuen Jahresabschluss erfassen
            </Button>
          </div>
        </div>
      )}
    </IntentWizardShell>
  );
}
