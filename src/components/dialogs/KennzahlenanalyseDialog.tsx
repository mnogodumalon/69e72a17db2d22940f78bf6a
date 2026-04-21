import { useState, useEffect, useRef, useCallback } from 'react';
import type { Kennzahlenanalyse, Bilanz, GewinnUndVerlustrechnung } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId, createRecordUrl, cleanFieldsForApi, getUserProfile } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { IconArrowBigDownLinesFilled, IconCamera, IconCircleCheck, IconClipboard, IconFileText, IconLoader2, IconPhotoPlus, IconSparkles, IconUpload, IconX } from '@tabler/icons-react';
import { fileToDataUri, extractFromInput, extractPhotoMeta, reverseGeocode } from '@/lib/ai';
import { lookupKey } from '@/lib/formatters';

interface KennzahlenanalyseDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Kennzahlenanalyse['fields']) => Promise<void>;
  defaultValues?: Kennzahlenanalyse['fields'];
  bilanzList: Bilanz[];
  gewinn__und_verlustrechnungList: GewinnUndVerlustrechnung[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function KennzahlenanalyseDialog({ open, onClose, onSubmit, defaultValues, bilanzList, gewinn__und_verlustrechnungList, enablePhotoScan = true, enablePhotoLocation = true }: KennzahlenanalyseDialogProps) {
  const [fields, setFields] = useState<Partial<Kennzahlenanalyse['fields']>>({});
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [usePersonalInfo, setUsePersonalInfo] = useState(() => {
    try { return localStorage.getItem('ai-use-personal-info') === 'true'; } catch { return false; }
  });
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [aiText, setAiText] = useState('');

  useEffect(() => {
    if (open) {
      setFields(defaultValues ?? {});
      setPreview(null);
      setScanSuccess(false);
      setAiText('');
    }
  }, [open, defaultValues]);
  useEffect(() => {
    try { localStorage.setItem('ai-use-personal-info', String(usePersonalInfo)); } catch {}
  }, [usePersonalInfo]);
  async function handleShowProfileInfo() {
    if (showProfileInfo) { setShowProfileInfo(false); return; }
    setProfileLoading(true);
    try {
      const p = await getUserProfile();
      setProfileData(p);
    } catch {
      setProfileData(null);
    } finally {
      setProfileLoading(false);
      setShowProfileInfo(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const clean = cleanFieldsForApi({ ...fields }, 'kennzahlenanalyse');
      await onSubmit(clean as Kennzahlenanalyse['fields']);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAiExtract(file?: File) {
    if (!file && !aiText.trim()) return;
    setScanning(true);
    setScanSuccess(false);
    try {
      let uri: string | undefined;
      let gps: { latitude: number; longitude: number } | null = null;
      let geoAddr = '';
      const parts: string[] = [];
      if (file) {
        const [dataUri, meta] = await Promise.all([fileToDataUri(file), extractPhotoMeta(file)]);
        uri = dataUri;
        if (file.type.startsWith('image/')) setPreview(uri);
        gps = enablePhotoLocation ? meta?.gps ?? null : null;
        if (gps) {
          geoAddr = await reverseGeocode(gps.latitude, gps.longitude);
          parts.push(`Location coordinates: ${gps.latitude}, ${gps.longitude}`);
          if (geoAddr) parts.push(`Reverse-geocoded address: ${geoAddr}`);
        }
        if (meta?.dateTime) {
          parts.push(`Date taken: ${meta.dateTime.replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')}`);
        }
      }
      const contextParts: string[] = [];
      if (parts.length) {
        contextParts.push(`<photo-metadata>\nThe following metadata was extracted from the photo\'s EXIF data:\n${parts.join('\n')}\n</photo-metadata>`);
      }
      contextParts.push(`<available-records field="kz_bilanz" entity="Bilanz">\n${JSON.stringify(bilanzList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      contextParts.push(`<available-records field="kz_guv" entity="Gewinn- und Verlustrechnung">\n${JSON.stringify(gewinn__und_verlustrechnungList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "kz_bilanz": string | null, // Display name from Bilanz (see <available-records>)\n  "kz_guv": string | null, // Display name from Gewinn- und Verlustrechnung (see <available-records>)\n  "eigenkapitalquote": number | null, // Eigenkapitalquote (%)\n  "fremdkapitalquote": number | null, // Fremdkapitalquote (%)\n  "verschuldungsgrad": number | null, // Verschuldungsgrad (FK/EK)\n  "anlagendeckungsgrad_1": number | null, // Anlagendeckungsgrad I (%)\n  "anlagendeckungsgrad_2": number | null, // Anlagendeckungsgrad II (%)\n  "liquiditaet_1": number | null, // Liquidität 1. Grades (%)\n  "liquiditaet_2": number | null, // Liquidität 2. Grades (%)\n  "liquiditaet_3": number | null, // Liquidität 3. Grades (%)\n  "working_capital": number | null, // Working Capital\n  "eigenkapitalrendite": number | null, // Eigenkapitalrendite (%)\n  "gesamtkapitalrendite": number | null, // Gesamtkapitalrendite (%)\n  "umsatzrendite": number | null, // Umsatzrendite (%)\n  "ebit_marge": number | null, // EBIT-Marge (%)\n  "ebitda_marge": number | null, // EBITDA-Marge (%)\n  "kapitalumschlag": number | null, // Kapitalumschlag\n  "debitorenlaufzeit": number | null, // Debitorenlaufzeit (Tage)\n  "kreditorenlaufzeit": number | null, // Kreditorenlaufzeit (Tage)\n  "lagerdauer": number | null, // Lagerdauer (Tage)\n  "cashflow_operativ": number | null, // Operativer Cashflow\n  "bonitaetsbewertung": LookupValue | null, // Bonitätsbewertung (select one key: "sehr_gut" | "gut" | "befriedigend" | "ausreichend" | "mangelhaft" | "kritisch") mapping: sehr_gut=Sehr gut, gut=Gut, befriedigend=Befriedigend, ausreichend=Ausreichend, mangelhaft=Mangelhaft, kritisch=Kritisch\n  "staerken": string | null, // Stärken\n  "schwaechen": string | null, // Schwächen\n  "gesamtkommentar": string | null, // Gesamtkommentar / Fazit\n  "analyst_vorname": string | null, // Vorname Analyst\n  "analyst_nachname": string | null, // Nachname Analyst\n  "analysedatum": string | null, // YYYY-MM-DD\n}`;
      const raw = await extractFromInput<Record<string, unknown>>(schema, {
        dataUri: uri,
        userText: aiText.trim() || undefined,
        photoContext,
        intent: DIALOG_INTENT,
      });
      setFields(prev => {
        const merged = { ...prev } as Record<string, unknown>;
        function matchName(name: string, candidates: string[]): boolean {
          const n = name.toLowerCase().trim();
          return candidates.some(c => c.toLowerCase().includes(n) || n.includes(c.toLowerCase()));
        }
        const applookupKeys = new Set<string>(["kz_bilanz", "kz_guv"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const kz_bilanzName = raw['kz_bilanz'] as string | null;
        if (kz_bilanzName) {
          const kz_bilanzMatch = bilanzList.find(r => matchName(kz_bilanzName!, [String(r.fields.geschaeftsjahr ?? '')]));
          if (kz_bilanzMatch) merged['kz_bilanz'] = createRecordUrl(APP_IDS.BILANZ, kz_bilanzMatch.record_id);
        }
        const kz_guvName = raw['kz_guv'] as string | null;
        if (kz_guvName) {
          const kz_guvMatch = gewinn__und_verlustrechnungList.find(r => matchName(kz_guvName!, [String(r.fields.guv_geschaeftsjahr ?? '')]));
          if (kz_guvMatch) merged['kz_guv'] = createRecordUrl(APP_IDS.GEWINN_UND_VERLUSTRECHNUNG, kz_guvMatch.record_id);
        }
        return merged as Partial<Kennzahlenanalyse['fields']>;
      });
      setAiText('');
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 3000);
    } catch (err) {
      console.error('Scan fehlgeschlagen:', err);
      alert(err instanceof Error ? err.message : String(err));
    } finally {
      setScanning(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleAiExtract(f);
    e.target.value = '';
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type.startsWith('image/') || file.type === 'application/pdf')) {
      handleAiExtract(file);
    }
  }, []);

  const DIALOG_INTENT = defaultValues ? 'Kennzahlenanalyse bearbeiten' : 'Kennzahlenanalyse hinzufügen';

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{DIALOG_INTENT}</DialogTitle>
        </DialogHeader>

        {enablePhotoScan && (
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
            <div>
              <div className="flex items-center gap-1.5 font-medium">
                <IconSparkles className="h-4 w-4 text-primary" />
                KI-Assistent
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Versteht Fotos, Dokumente und Text und füllt alles für dich aus</p>
            </div>
            <div className="flex items-start gap-2 pl-0.5">
              <Checkbox
                id="ai-use-personal-info"
                checked={usePersonalInfo}
                onCheckedChange={(v) => setUsePersonalInfo(!!v)}
                className="mt-0.5"
              />
              <span className="text-xs text-muted-foreground leading-snug">
                <Label htmlFor="ai-use-personal-info" className="text-xs font-normal text-muted-foreground cursor-pointer inline">
                  KI-Assistent darf zusätzlich Informationen zu meiner Person verwenden
                </Label>
                {' '}
                <button type="button" onClick={handleShowProfileInfo} className="text-xs text-primary hover:underline whitespace-nowrap">
                  {profileLoading ? 'Lade...' : '(mehr Infos)'}
                </button>
              </span>
            </div>
            {showProfileInfo && (
              <div className="rounded-md border bg-muted/50 p-2 text-xs max-h-40 overflow-y-auto">
                <p className="font-medium mb-1">Folgende Infos über dich können von der KI genutzt werden:</p>
                {profileData ? Object.values(profileData).map((v, i) => (
                  <span key={i}>{i > 0 && ", "}{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
                )) : (
                  <span className="text-muted-foreground">Profil konnte nicht geladen werden</span>
                )}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !scanning && fileInputRef.current?.click()}
              className={`
                relative rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer
                ${scanning
                  ? 'border-primary/40 bg-primary/5'
                  : scanSuccess
                    ? 'border-green-500/40 bg-green-50/50 dark:bg-green-950/20'
                    : dragOver
                      ? 'border-primary bg-primary/10 scale-[1.01]'
                      : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              {scanning ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <IconLoader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">KI analysiert...</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Felder werden automatisch ausgefüllt</p>
                  </div>
                </div>
              ) : scanSuccess ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <IconCircleCheck className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">Felder ausgefüllt!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Prüfe die Werte und passe sie ggf. an</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="h-14 w-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <IconPhotoPlus className="h-7 w-7 text-primary/70" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Foto oder Dokument hierher ziehen oder auswählen</p>
                  </div>
                </div>
              )}

              {preview && !scanning && (
                <div className="absolute top-2 right-2">
                  <div className="relative group">
                    <img src={preview} alt="" className="h-10 w-10 rounded-md object-cover border shadow-sm" />
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setPreview(null); }}
                      className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-muted-foreground/80 text-white flex items-center justify-center"
                    >
                      <IconX className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); cameraInputRef.current?.click(); }}>
                <IconCamera className="h-3.5 w-3.5 mr-1" />Kamera
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <IconUpload className="h-3.5 w-3.5 mr-1" />Foto wählen
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-10 text-xs" disabled={scanning}
                onClick={e => {
                  e.stopPropagation();
                  if (fileInputRef.current) {
                    fileInputRef.current.accept = 'application/pdf,.pdf';
                    fileInputRef.current.click();
                    setTimeout(() => { if (fileInputRef.current) fileInputRef.current.accept = 'image/*,application/pdf'; }, 100);
                  }
                }}>
                <IconFileText className="h-3.5 w-3.5 mr-1" />Dokument
              </Button>
            </div>

            <div className="relative">
              <Textarea
                placeholder="Text eingeben oder einfügen, z.B. Notizen, E-Mails, Beschreibungen..."
                value={aiText}
                onChange={e => {
                  setAiText(e.target.value);
                  const el = e.target;
                  el.style.height = 'auto';
                  el.style.height = Math.min(Math.max(el.scrollHeight, 56), 96) + 'px';
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && aiText.trim() && !scanning) {
                    e.preventDefault();
                    handleAiExtract();
                  }
                }}
                disabled={scanning}
                rows={2}
                className="pr-12 resize-none text-sm overflow-y-auto"
              />
              <button
                type="button"
                className="absolute right-2 top-2 h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                disabled={scanning}
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text) setAiText(prev => prev ? prev + '\n' + text : text);
                  } catch {}
                }}
                title="Paste"
              >
                <IconClipboard className="h-4 w-4" />
              </button>
            </div>
            {aiText.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-9 text-xs"
                disabled={scanning}
                onClick={() => handleAiExtract()}
              >
                <IconSparkles className="h-3.5 w-3.5 mr-1.5" />Analysieren
              </Button>
            )}
            <div className="flex justify-center pt-1">
              <IconArrowBigDownLinesFilled className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="kz_bilanz">Zugehörige Bilanz</Label>
            <Select
              value={extractRecordId(fields.kz_bilanz) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, kz_bilanz: v === 'none' ? undefined : createRecordUrl(APP_IDS.BILANZ, v) }))}
            >
              <SelectTrigger id="kz_bilanz"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {bilanzList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.geschaeftsjahr ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kz_guv">Zugehörige Gewinn- und Verlustrechnung</Label>
            <Select
              value={extractRecordId(fields.kz_guv) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, kz_guv: v === 'none' ? undefined : createRecordUrl(APP_IDS.GEWINN_UND_VERLUSTRECHNUNG, v) }))}
            >
              <SelectTrigger id="kz_guv"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {gewinn__und_verlustrechnungList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.guv_geschaeftsjahr ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigenkapitalquote">Eigenkapitalquote (%)</Label>
            <Input
              id="eigenkapitalquote"
              type="number"
              value={fields.eigenkapitalquote ?? ''}
              onChange={e => setFields(f => ({ ...f, eigenkapitalquote: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fremdkapitalquote">Fremdkapitalquote (%)</Label>
            <Input
              id="fremdkapitalquote"
              type="number"
              value={fields.fremdkapitalquote ?? ''}
              onChange={e => setFields(f => ({ ...f, fremdkapitalquote: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verschuldungsgrad">Verschuldungsgrad (FK/EK)</Label>
            <Input
              id="verschuldungsgrad"
              type="number"
              value={fields.verschuldungsgrad ?? ''}
              onChange={e => setFields(f => ({ ...f, verschuldungsgrad: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anlagendeckungsgrad_1">Anlagendeckungsgrad I (%)</Label>
            <Input
              id="anlagendeckungsgrad_1"
              type="number"
              value={fields.anlagendeckungsgrad_1 ?? ''}
              onChange={e => setFields(f => ({ ...f, anlagendeckungsgrad_1: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anlagendeckungsgrad_2">Anlagendeckungsgrad II (%)</Label>
            <Input
              id="anlagendeckungsgrad_2"
              type="number"
              value={fields.anlagendeckungsgrad_2 ?? ''}
              onChange={e => setFields(f => ({ ...f, anlagendeckungsgrad_2: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liquiditaet_1">Liquidität 1. Grades (%)</Label>
            <Input
              id="liquiditaet_1"
              type="number"
              value={fields.liquiditaet_1 ?? ''}
              onChange={e => setFields(f => ({ ...f, liquiditaet_1: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liquiditaet_2">Liquidität 2. Grades (%)</Label>
            <Input
              id="liquiditaet_2"
              type="number"
              value={fields.liquiditaet_2 ?? ''}
              onChange={e => setFields(f => ({ ...f, liquiditaet_2: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="liquiditaet_3">Liquidität 3. Grades (%)</Label>
            <Input
              id="liquiditaet_3"
              type="number"
              value={fields.liquiditaet_3 ?? ''}
              onChange={e => setFields(f => ({ ...f, liquiditaet_3: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="working_capital">Working Capital</Label>
            <Input
              id="working_capital"
              type="number"
              value={fields.working_capital ?? ''}
              onChange={e => setFields(f => ({ ...f, working_capital: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigenkapitalrendite">Eigenkapitalrendite (%)</Label>
            <Input
              id="eigenkapitalrendite"
              type="number"
              value={fields.eigenkapitalrendite ?? ''}
              onChange={e => setFields(f => ({ ...f, eigenkapitalrendite: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtkapitalrendite">Gesamtkapitalrendite (%)</Label>
            <Input
              id="gesamtkapitalrendite"
              type="number"
              value={fields.gesamtkapitalrendite ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtkapitalrendite: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umsatzrendite">Umsatzrendite (%)</Label>
            <Input
              id="umsatzrendite"
              type="number"
              value={fields.umsatzrendite ?? ''}
              onChange={e => setFields(f => ({ ...f, umsatzrendite: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ebit_marge">EBIT-Marge (%)</Label>
            <Input
              id="ebit_marge"
              type="number"
              value={fields.ebit_marge ?? ''}
              onChange={e => setFields(f => ({ ...f, ebit_marge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ebitda_marge">EBITDA-Marge (%)</Label>
            <Input
              id="ebitda_marge"
              type="number"
              value={fields.ebitda_marge ?? ''}
              onChange={e => setFields(f => ({ ...f, ebitda_marge: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kapitalumschlag">Kapitalumschlag</Label>
            <Input
              id="kapitalumschlag"
              type="number"
              value={fields.kapitalumschlag ?? ''}
              onChange={e => setFields(f => ({ ...f, kapitalumschlag: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="debitorenlaufzeit">Debitorenlaufzeit (Tage)</Label>
            <Input
              id="debitorenlaufzeit"
              type="number"
              value={fields.debitorenlaufzeit ?? ''}
              onChange={e => setFields(f => ({ ...f, debitorenlaufzeit: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kreditorenlaufzeit">Kreditorenlaufzeit (Tage)</Label>
            <Input
              id="kreditorenlaufzeit"
              type="number"
              value={fields.kreditorenlaufzeit ?? ''}
              onChange={e => setFields(f => ({ ...f, kreditorenlaufzeit: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lagerdauer">Lagerdauer (Tage)</Label>
            <Input
              id="lagerdauer"
              type="number"
              value={fields.lagerdauer ?? ''}
              onChange={e => setFields(f => ({ ...f, lagerdauer: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cashflow_operativ">Operativer Cashflow</Label>
            <Input
              id="cashflow_operativ"
              type="number"
              value={fields.cashflow_operativ ?? ''}
              onChange={e => setFields(f => ({ ...f, cashflow_operativ: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bonitaetsbewertung">Bonitätsbewertung</Label>
            <Select
              value={lookupKey(fields.bonitaetsbewertung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, bonitaetsbewertung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="bonitaetsbewertung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="sehr_gut">Sehr gut</SelectItem>
                <SelectItem value="gut">Gut</SelectItem>
                <SelectItem value="befriedigend">Befriedigend</SelectItem>
                <SelectItem value="ausreichend">Ausreichend</SelectItem>
                <SelectItem value="mangelhaft">Mangelhaft</SelectItem>
                <SelectItem value="kritisch">Kritisch</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="staerken">Stärken</Label>
            <Textarea
              id="staerken"
              value={fields.staerken ?? ''}
              onChange={e => setFields(f => ({ ...f, staerken: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schwaechen">Schwächen</Label>
            <Textarea
              id="schwaechen"
              value={fields.schwaechen ?? ''}
              onChange={e => setFields(f => ({ ...f, schwaechen: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtkommentar">Gesamtkommentar / Fazit</Label>
            <Textarea
              id="gesamtkommentar"
              value={fields.gesamtkommentar ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtkommentar: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="analyst_vorname">Vorname Analyst</Label>
            <Input
              id="analyst_vorname"
              value={fields.analyst_vorname ?? ''}
              onChange={e => setFields(f => ({ ...f, analyst_vorname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="analyst_nachname">Nachname Analyst</Label>
            <Input
              id="analyst_nachname"
              value={fields.analyst_nachname ?? ''}
              onChange={e => setFields(f => ({ ...f, analyst_nachname: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="analysedatum">Analysedatum</Label>
            <Input
              id="analysedatum"
              type="date"
              value={fields.analysedatum ?? ''}
              onChange={e => setFields(f => ({ ...f, analysedatum: e.target.value }))}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Abbrechen</Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Speichern...' : defaultValues ? 'Speichern' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}