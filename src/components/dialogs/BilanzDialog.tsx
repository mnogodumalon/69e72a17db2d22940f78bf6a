import { useState, useEffect, useRef, useCallback } from 'react';
import type { Bilanz, Unternehmensstammdaten } from '@/types/app';
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

interface BilanzDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: Bilanz['fields']) => Promise<void>;
  defaultValues?: Bilanz['fields'];
  unternehmensstammdatenList: Unternehmensstammdaten[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function BilanzDialog({ open, onClose, onSubmit, defaultValues, unternehmensstammdatenList, enablePhotoScan = true, enablePhotoLocation = true }: BilanzDialogProps) {
  const [fields, setFields] = useState<Partial<Bilanz['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'bilanz');
      await onSubmit(clean as Bilanz['fields']);
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
      contextParts.push(`<available-records field="bilanz_unternehmen" entity="Unternehmensstammdaten">\n${JSON.stringify(unternehmensstammdatenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "bilanz_unternehmen": string | null, // Display name from Unternehmensstammdaten (see <available-records>)\n  "geschaeftsjahr": string | null, // Geschäftsjahr\n  "bilanzstichtag": string | null, // YYYY-MM-DD\n  "waehrung": LookupValue | null, // Währung (select one key: "eur" | "usd" | "chf" | "gbp") mapping: eur=EUR (Euro), usd=USD (US-Dollar), chf=CHF (Schweizer Franken), gbp=GBP (Britisches Pfund)\n  "einheit": LookupValue | null, // Einheit der Beträge (select one key: "euro" | "teur" | "meur") mapping: euro=Euro (volle Beträge), teur=Tausend Euro (TEUR), meur=Millionen Euro (MEUR)\n  "immaterielle_vermoegensgegenstaende": number | null, // Immaterielle Vermögensgegenstände\n  "immaterielle_vermoegensgegenstaende_vj": number | null, // Immaterielle Vermögensgegenstände (Vorjahr)\n  "sachanlagen": number | null, // Sachanlagen\n  "sachanlagen_vj": number | null, // Sachanlagen (Vorjahr)\n  "finanzanlagen": number | null, // Finanzanlagen\n  "finanzanlagen_vj": number | null, // Finanzanlagen (Vorjahr)\n  "anlagevermoegen_gesamt": number | null, // Anlagevermögen gesamt\n  "anlagevermoegen_gesamt_vj": number | null, // Anlagevermögen gesamt (Vorjahr)\n  "vorraethe": number | null, // Vorräte\n  "vorraethe_vj": number | null, // Vorräte (Vorjahr)\n  "forderungen_llg": number | null, // Forderungen aus Lieferungen und Leistungen\n  "forderungen_llg_vj": number | null, // Forderungen aus Lieferungen und Leistungen (Vorjahr)\n  "sonstige_forderungen": number | null, // Sonstige Forderungen und Vermögensgegenstände\n  "sonstige_forderungen_vj": number | null, // Sonstige Forderungen und Vermögensgegenstände (Vorjahr)\n  "kassenbestand": number | null, // Kassenbestand / Bankguthaben\n  "kassenbestand_vj": number | null, // Kassenbestand / Bankguthaben (Vorjahr)\n  "umlaufvermoegen_gesamt": number | null, // Umlaufvermögen gesamt\n  "umlaufvermoegen_gesamt_vj": number | null, // Umlaufvermögen gesamt (Vorjahr)\n  "rechnungsabgrenzung_aktiva": number | null, // Aktive Rechnungsabgrenzungsposten\n  "rechnungsabgrenzung_aktiva_vj": number | null, // Aktive Rechnungsabgrenzungsposten (Vorjahr)\n  "bilanzsumme_aktiva": number | null, // Bilanzsumme Aktiva\n  "bilanzsumme_aktiva_vj": number | null, // Bilanzsumme Aktiva (Vorjahr)\n  "gezeichnetes_kapital": number | null, // Gezeichnetes Kapital\n  "gezeichnetes_kapital_vj": number | null, // Gezeichnetes Kapital (Vorjahr)\n  "kapitalruecklagen": number | null, // Kapitalrücklagen\n  "kapitalruecklagen_vj": number | null, // Kapitalrücklagen (Vorjahr)\n  "gewinnruecklagen": number | null, // Gewinnrücklagen\n  "gewinnruecklagen_vj": number | null, // Gewinnrücklagen (Vorjahr)\n  "jahresueberschuss_bilanz": number | null, // Jahresüberschuss / Jahresfehlbetrag\n  "jahresueberschuss_bilanz_vj": number | null, // Jahresüberschuss / Jahresfehlbetrag (Vorjahr)\n  "eigenkapital_gesamt": number | null, // Eigenkapital gesamt\n  "eigenkapital_gesamt_vj": number | null, // Eigenkapital gesamt (Vorjahr)\n  "rueckstellungen": number | null, // Rückstellungen\n  "rueckstellungen_vj": number | null, // Rückstellungen (Vorjahr)\n  "verbindlichkeiten_kreditinstitute": number | null, // Verbindlichkeiten gegenüber Kreditinstituten\n  "verbindlichkeiten_kreditinstitute_vj": number | null, // Verbindlichkeiten gegenüber Kreditinstituten (Vorjahr)\n  "verbindlichkeiten_llg": number | null, // Verbindlichkeiten aus Lieferungen und Leistungen\n  "verbindlichkeiten_llg_vj": number | null, // Verbindlichkeiten aus Lieferungen und Leistungen (Vorjahr)\n  "sonstige_verbindlichkeiten": number | null, // Sonstige Verbindlichkeiten\n  "sonstige_verbindlichkeiten_vj": number | null, // Sonstige Verbindlichkeiten (Vorjahr)\n  "fremdkapital_gesamt": number | null, // Fremdkapital gesamt\n  "fremdkapital_gesamt_vj": number | null, // Fremdkapital gesamt (Vorjahr)\n  "rechnungsabgrenzung_passiva": number | null, // Passive Rechnungsabgrenzungsposten\n  "rechnungsabgrenzung_passiva_vj": number | null, // Passive Rechnungsabgrenzungsposten (Vorjahr)\n  "bilanzsumme_passiva": number | null, // Bilanzsumme Passiva\n  "bilanzsumme_passiva_vj": number | null, // Bilanzsumme Passiva (Vorjahr)\n  "bilanz_anmerkungen": string | null, // Anmerkungen zur Bilanz\n}`;
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
        const applookupKeys = new Set<string>(["bilanz_unternehmen"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const bilanz_unternehmenName = raw['bilanz_unternehmen'] as string | null;
        if (bilanz_unternehmenName) {
          const bilanz_unternehmenMatch = unternehmensstammdatenList.find(r => matchName(bilanz_unternehmenName!, [String(r.fields.unternehmensname ?? '')]));
          if (bilanz_unternehmenMatch) merged['bilanz_unternehmen'] = createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, bilanz_unternehmenMatch.record_id);
        }
        return merged as Partial<Bilanz['fields']>;
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

  const DIALOG_INTENT = defaultValues ? 'Bilanz bearbeiten' : 'Bilanz hinzufügen';

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
            <Label htmlFor="bilanz_unternehmen">Unternehmen</Label>
            <Select
              value={extractRecordId(fields.bilanz_unternehmen) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, bilanz_unternehmen: v === 'none' ? undefined : createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, v) }))}
            >
              <SelectTrigger id="bilanz_unternehmen"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {unternehmensstammdatenList.map(r => (
                  <SelectItem key={r.record_id} value={r.record_id}>
                    {r.fields.unternehmensname ?? r.record_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="geschaeftsjahr">Geschäftsjahr</Label>
            <Input
              id="geschaeftsjahr"
              value={fields.geschaeftsjahr ?? ''}
              onChange={e => setFields(f => ({ ...f, geschaeftsjahr: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bilanzstichtag">Bilanzstichtag</Label>
            <Input
              id="bilanzstichtag"
              type="date"
              value={fields.bilanzstichtag ?? ''}
              onChange={e => setFields(f => ({ ...f, bilanzstichtag: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="waehrung">Währung</Label>
            <Select
              value={lookupKey(fields.waehrung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, waehrung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="waehrung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="eur">EUR (Euro)</SelectItem>
                <SelectItem value="usd">USD (US-Dollar)</SelectItem>
                <SelectItem value="chf">CHF (Schweizer Franken)</SelectItem>
                <SelectItem value="gbp">GBP (Britisches Pfund)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="einheit">Einheit der Beträge</Label>
            <Select
              value={lookupKey(fields.einheit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, einheit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="einheit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="euro">Euro (volle Beträge)</SelectItem>
                <SelectItem value="teur">Tausend Euro (TEUR)</SelectItem>
                <SelectItem value="meur">Millionen Euro (MEUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="immaterielle_vermoegensgegenstaende">Immaterielle Vermögensgegenstände</Label>
            <Input
              id="immaterielle_vermoegensgegenstaende"
              type="number"
              value={fields.immaterielle_vermoegensgegenstaende ?? ''}
              onChange={e => setFields(f => ({ ...f, immaterielle_vermoegensgegenstaende: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="immaterielle_vermoegensgegenstaende_vj">Immaterielle Vermögensgegenstände (Vorjahr)</Label>
            <Input
              id="immaterielle_vermoegensgegenstaende_vj"
              type="number"
              value={fields.immaterielle_vermoegensgegenstaende_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, immaterielle_vermoegensgegenstaende_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sachanlagen">Sachanlagen</Label>
            <Input
              id="sachanlagen"
              type="number"
              value={fields.sachanlagen ?? ''}
              onChange={e => setFields(f => ({ ...f, sachanlagen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sachanlagen_vj">Sachanlagen (Vorjahr)</Label>
            <Input
              id="sachanlagen_vj"
              type="number"
              value={fields.sachanlagen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, sachanlagen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finanzanlagen">Finanzanlagen</Label>
            <Input
              id="finanzanlagen"
              type="number"
              value={fields.finanzanlagen ?? ''}
              onChange={e => setFields(f => ({ ...f, finanzanlagen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="finanzanlagen_vj">Finanzanlagen (Vorjahr)</Label>
            <Input
              id="finanzanlagen_vj"
              type="number"
              value={fields.finanzanlagen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, finanzanlagen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anlagevermoegen_gesamt">Anlagevermögen gesamt</Label>
            <Input
              id="anlagevermoegen_gesamt"
              type="number"
              value={fields.anlagevermoegen_gesamt ?? ''}
              onChange={e => setFields(f => ({ ...f, anlagevermoegen_gesamt: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anlagevermoegen_gesamt_vj">Anlagevermögen gesamt (Vorjahr)</Label>
            <Input
              id="anlagevermoegen_gesamt_vj"
              type="number"
              value={fields.anlagevermoegen_gesamt_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, anlagevermoegen_gesamt_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vorraethe">Vorräte</Label>
            <Input
              id="vorraethe"
              type="number"
              value={fields.vorraethe ?? ''}
              onChange={e => setFields(f => ({ ...f, vorraethe: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vorraethe_vj">Vorräte (Vorjahr)</Label>
            <Input
              id="vorraethe_vj"
              type="number"
              value={fields.vorraethe_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, vorraethe_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forderungen_llg">Forderungen aus Lieferungen und Leistungen</Label>
            <Input
              id="forderungen_llg"
              type="number"
              value={fields.forderungen_llg ?? ''}
              onChange={e => setFields(f => ({ ...f, forderungen_llg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="forderungen_llg_vj">Forderungen aus Lieferungen und Leistungen (Vorjahr)</Label>
            <Input
              id="forderungen_llg_vj"
              type="number"
              value={fields.forderungen_llg_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, forderungen_llg_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonstige_forderungen">Sonstige Forderungen und Vermögensgegenstände</Label>
            <Input
              id="sonstige_forderungen"
              type="number"
              value={fields.sonstige_forderungen ?? ''}
              onChange={e => setFields(f => ({ ...f, sonstige_forderungen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonstige_forderungen_vj">Sonstige Forderungen und Vermögensgegenstände (Vorjahr)</Label>
            <Input
              id="sonstige_forderungen_vj"
              type="number"
              value={fields.sonstige_forderungen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, sonstige_forderungen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kassenbestand">Kassenbestand / Bankguthaben</Label>
            <Input
              id="kassenbestand"
              type="number"
              value={fields.kassenbestand ?? ''}
              onChange={e => setFields(f => ({ ...f, kassenbestand: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kassenbestand_vj">Kassenbestand / Bankguthaben (Vorjahr)</Label>
            <Input
              id="kassenbestand_vj"
              type="number"
              value={fields.kassenbestand_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, kassenbestand_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umlaufvermoegen_gesamt">Umlaufvermögen gesamt</Label>
            <Input
              id="umlaufvermoegen_gesamt"
              type="number"
              value={fields.umlaufvermoegen_gesamt ?? ''}
              onChange={e => setFields(f => ({ ...f, umlaufvermoegen_gesamt: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umlaufvermoegen_gesamt_vj">Umlaufvermögen gesamt (Vorjahr)</Label>
            <Input
              id="umlaufvermoegen_gesamt_vj"
              type="number"
              value={fields.umlaufvermoegen_gesamt_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, umlaufvermoegen_gesamt_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rechnungsabgrenzung_aktiva">Aktive Rechnungsabgrenzungsposten</Label>
            <Input
              id="rechnungsabgrenzung_aktiva"
              type="number"
              value={fields.rechnungsabgrenzung_aktiva ?? ''}
              onChange={e => setFields(f => ({ ...f, rechnungsabgrenzung_aktiva: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rechnungsabgrenzung_aktiva_vj">Aktive Rechnungsabgrenzungsposten (Vorjahr)</Label>
            <Input
              id="rechnungsabgrenzung_aktiva_vj"
              type="number"
              value={fields.rechnungsabgrenzung_aktiva_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, rechnungsabgrenzung_aktiva_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bilanzsumme_aktiva">Bilanzsumme Aktiva</Label>
            <Input
              id="bilanzsumme_aktiva"
              type="number"
              value={fields.bilanzsumme_aktiva ?? ''}
              onChange={e => setFields(f => ({ ...f, bilanzsumme_aktiva: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bilanzsumme_aktiva_vj">Bilanzsumme Aktiva (Vorjahr)</Label>
            <Input
              id="bilanzsumme_aktiva_vj"
              type="number"
              value={fields.bilanzsumme_aktiva_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, bilanzsumme_aktiva_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gezeichnetes_kapital">Gezeichnetes Kapital</Label>
            <Input
              id="gezeichnetes_kapital"
              type="number"
              value={fields.gezeichnetes_kapital ?? ''}
              onChange={e => setFields(f => ({ ...f, gezeichnetes_kapital: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gezeichnetes_kapital_vj">Gezeichnetes Kapital (Vorjahr)</Label>
            <Input
              id="gezeichnetes_kapital_vj"
              type="number"
              value={fields.gezeichnetes_kapital_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, gezeichnetes_kapital_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kapitalruecklagen">Kapitalrücklagen</Label>
            <Input
              id="kapitalruecklagen"
              type="number"
              value={fields.kapitalruecklagen ?? ''}
              onChange={e => setFields(f => ({ ...f, kapitalruecklagen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="kapitalruecklagen_vj">Kapitalrücklagen (Vorjahr)</Label>
            <Input
              id="kapitalruecklagen_vj"
              type="number"
              value={fields.kapitalruecklagen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, kapitalruecklagen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gewinnruecklagen">Gewinnrücklagen</Label>
            <Input
              id="gewinnruecklagen"
              type="number"
              value={fields.gewinnruecklagen ?? ''}
              onChange={e => setFields(f => ({ ...f, gewinnruecklagen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gewinnruecklagen_vj">Gewinnrücklagen (Vorjahr)</Label>
            <Input
              id="gewinnruecklagen_vj"
              type="number"
              value={fields.gewinnruecklagen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, gewinnruecklagen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jahresueberschuss_bilanz">Jahresüberschuss / Jahresfehlbetrag</Label>
            <Input
              id="jahresueberschuss_bilanz"
              type="number"
              value={fields.jahresueberschuss_bilanz ?? ''}
              onChange={e => setFields(f => ({ ...f, jahresueberschuss_bilanz: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jahresueberschuss_bilanz_vj">Jahresüberschuss / Jahresfehlbetrag (Vorjahr)</Label>
            <Input
              id="jahresueberschuss_bilanz_vj"
              type="number"
              value={fields.jahresueberschuss_bilanz_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, jahresueberschuss_bilanz_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigenkapital_gesamt">Eigenkapital gesamt</Label>
            <Input
              id="eigenkapital_gesamt"
              type="number"
              value={fields.eigenkapital_gesamt ?? ''}
              onChange={e => setFields(f => ({ ...f, eigenkapital_gesamt: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="eigenkapital_gesamt_vj">Eigenkapital gesamt (Vorjahr)</Label>
            <Input
              id="eigenkapital_gesamt_vj"
              type="number"
              value={fields.eigenkapital_gesamt_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, eigenkapital_gesamt_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rueckstellungen">Rückstellungen</Label>
            <Input
              id="rueckstellungen"
              type="number"
              value={fields.rueckstellungen ?? ''}
              onChange={e => setFields(f => ({ ...f, rueckstellungen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rueckstellungen_vj">Rückstellungen (Vorjahr)</Label>
            <Input
              id="rueckstellungen_vj"
              type="number"
              value={fields.rueckstellungen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, rueckstellungen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verbindlichkeiten_kreditinstitute">Verbindlichkeiten gegenüber Kreditinstituten</Label>
            <Input
              id="verbindlichkeiten_kreditinstitute"
              type="number"
              value={fields.verbindlichkeiten_kreditinstitute ?? ''}
              onChange={e => setFields(f => ({ ...f, verbindlichkeiten_kreditinstitute: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verbindlichkeiten_kreditinstitute_vj">Verbindlichkeiten gegenüber Kreditinstituten (Vorjahr)</Label>
            <Input
              id="verbindlichkeiten_kreditinstitute_vj"
              type="number"
              value={fields.verbindlichkeiten_kreditinstitute_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, verbindlichkeiten_kreditinstitute_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verbindlichkeiten_llg">Verbindlichkeiten aus Lieferungen und Leistungen</Label>
            <Input
              id="verbindlichkeiten_llg"
              type="number"
              value={fields.verbindlichkeiten_llg ?? ''}
              onChange={e => setFields(f => ({ ...f, verbindlichkeiten_llg: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="verbindlichkeiten_llg_vj">Verbindlichkeiten aus Lieferungen und Leistungen (Vorjahr)</Label>
            <Input
              id="verbindlichkeiten_llg_vj"
              type="number"
              value={fields.verbindlichkeiten_llg_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, verbindlichkeiten_llg_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonstige_verbindlichkeiten">Sonstige Verbindlichkeiten</Label>
            <Input
              id="sonstige_verbindlichkeiten"
              type="number"
              value={fields.sonstige_verbindlichkeiten ?? ''}
              onChange={e => setFields(f => ({ ...f, sonstige_verbindlichkeiten: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonstige_verbindlichkeiten_vj">Sonstige Verbindlichkeiten (Vorjahr)</Label>
            <Input
              id="sonstige_verbindlichkeiten_vj"
              type="number"
              value={fields.sonstige_verbindlichkeiten_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, sonstige_verbindlichkeiten_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fremdkapital_gesamt">Fremdkapital gesamt</Label>
            <Input
              id="fremdkapital_gesamt"
              type="number"
              value={fields.fremdkapital_gesamt ?? ''}
              onChange={e => setFields(f => ({ ...f, fremdkapital_gesamt: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fremdkapital_gesamt_vj">Fremdkapital gesamt (Vorjahr)</Label>
            <Input
              id="fremdkapital_gesamt_vj"
              type="number"
              value={fields.fremdkapital_gesamt_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, fremdkapital_gesamt_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rechnungsabgrenzung_passiva">Passive Rechnungsabgrenzungsposten</Label>
            <Input
              id="rechnungsabgrenzung_passiva"
              type="number"
              value={fields.rechnungsabgrenzung_passiva ?? ''}
              onChange={e => setFields(f => ({ ...f, rechnungsabgrenzung_passiva: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rechnungsabgrenzung_passiva_vj">Passive Rechnungsabgrenzungsposten (Vorjahr)</Label>
            <Input
              id="rechnungsabgrenzung_passiva_vj"
              type="number"
              value={fields.rechnungsabgrenzung_passiva_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, rechnungsabgrenzung_passiva_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bilanzsumme_passiva">Bilanzsumme Passiva</Label>
            <Input
              id="bilanzsumme_passiva"
              type="number"
              value={fields.bilanzsumme_passiva ?? ''}
              onChange={e => setFields(f => ({ ...f, bilanzsumme_passiva: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bilanzsumme_passiva_vj">Bilanzsumme Passiva (Vorjahr)</Label>
            <Input
              id="bilanzsumme_passiva_vj"
              type="number"
              value={fields.bilanzsumme_passiva_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, bilanzsumme_passiva_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bilanz_anmerkungen">Anmerkungen zur Bilanz</Label>
            <Textarea
              id="bilanz_anmerkungen"
              value={fields.bilanz_anmerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, bilanz_anmerkungen: e.target.value }))}
              rows={3}
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