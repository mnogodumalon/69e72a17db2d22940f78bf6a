import { useState, useEffect, useRef, useCallback } from 'react';
import type { GewinnUndVerlustrechnung, Unternehmensstammdaten } from '@/types/app';
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

interface GewinnUndVerlustrechnungDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: GewinnUndVerlustrechnung['fields']) => Promise<void>;
  defaultValues?: GewinnUndVerlustrechnung['fields'];
  unternehmensstammdatenList: Unternehmensstammdaten[];
  enablePhotoScan?: boolean;
  enablePhotoLocation?: boolean;
}

export function GewinnUndVerlustrechnungDialog({ open, onClose, onSubmit, defaultValues, unternehmensstammdatenList, enablePhotoScan = true, enablePhotoLocation = true }: GewinnUndVerlustrechnungDialogProps) {
  const [fields, setFields] = useState<Partial<GewinnUndVerlustrechnung['fields']>>({});
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
      const clean = cleanFieldsForApi({ ...fields }, 'gewinn__und_verlustrechnung');
      await onSubmit(clean as GewinnUndVerlustrechnung['fields']);
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
      contextParts.push(`<available-records field="guv_unternehmen" entity="Unternehmensstammdaten">\n${JSON.stringify(unternehmensstammdatenList.map(r => ({ record_id: r.record_id, ...r.fields })), null, 2)}\n</available-records>`);
      if (usePersonalInfo) {
        try {
          const profile = await getUserProfile();
          contextParts.push(`<user-profile>\nThe following is the logged-in user\'s personal information. Use this to pre-fill relevant fields like name, email, address, company etc. when appropriate:\n${JSON.stringify(profile, null, 2)}\n</user-profile>`);
        } catch (err) {
          console.warn('Failed to fetch user profile:', err);
        }
      }
      const photoContext = contextParts.length ? contextParts.join('\n') : undefined;
      const schema = `{\n  "ebit_vj": number | null, // EBIT (Vorjahr)\n  "guv_unternehmen": string | null, // Display name from Unternehmensstammdaten (see <available-records>)\n  "guv_geschaeftsjahr": string | null, // Geschäftsjahr\n  "guv_waehrung": LookupValue | null, // Währung (select one key: "eur" | "usd" | "chf" | "gbp") mapping: eur=EUR (Euro), usd=USD (US-Dollar), chf=CHF (Schweizer Franken), gbp=GBP (Britisches Pfund)\n  "guv_einheit": LookupValue | null, // Einheit der Beträge (select one key: "euro" | "teur" | "meur") mapping: euro=Euro (volle Beträge), teur=Tausend Euro (TEUR), meur=Millionen Euro (MEUR)\n  "umsatzerloese": number | null, // Umsatzerlöse\n  "umsatzerloese_vj": number | null, // Umsatzerlöse (Vorjahr)\n  "bestandsveraenderungen": number | null, // Bestandsveränderungen\n  "bestandsveraenderungen_vj": number | null, // Bestandsveränderungen (Vorjahr)\n  "sonstige_betriebliche_ertraege": number | null, // Sonstige betriebliche Erträge\n  "sonstige_betriebliche_ertraege_vj": number | null, // Sonstige betriebliche Erträge (Vorjahr)\n  "gesamtleistung": number | null, // Gesamtleistung\n  "gesamtleistung_vj": number | null, // Gesamtleistung (Vorjahr)\n  "materialaufwand": number | null, // Materialaufwand\n  "materialaufwand_vj": number | null, // Materialaufwand (Vorjahr)\n  "personalaufwand": number | null, // Personalaufwand\n  "personalaufwand_vj": number | null, // Personalaufwand (Vorjahr)\n  "abschreibungen": number | null, // Abschreibungen\n  "abschreibungen_vj": number | null, // Abschreibungen (Vorjahr)\n  "sonstige_betriebliche_aufwendungen": number | null, // Sonstige betriebliche Aufwendungen\n  "sonstige_betriebliche_aufwendungen_vj": number | null, // Sonstige betriebliche Aufwendungen (Vorjahr)\n  "ebitda": number | null, // EBITDA\n  "ebitda_vj": number | null, // EBITDA (Vorjahr)\n  "ebit": number | null, // EBIT (Betriebsergebnis)\n  "zinsertraege": number | null, // Zinserträge\n  "zinsertraege_vj": number | null, // Zinserträge (Vorjahr)\n  "zinsaufwendungen": number | null, // Zinsaufwendungen\n  "zinsaufwendungen_vj": number | null, // Zinsaufwendungen (Vorjahr)\n  "ebt": number | null, // EBT (Ergebnis vor Steuern)\n  "ebt_vj": number | null, // EBT (Vorjahr)\n  "steuern": number | null, // Steuern vom Einkommen und Ertrag\n  "steuern_vj": number | null, // Steuern vom Einkommen und Ertrag (Vorjahr)\n  "jahresueberschuss_guv": number | null, // Jahresüberschuss / Jahresfehlbetrag\n  "jahresueberschuss_guv_vj": number | null, // Jahresüberschuss / Jahresfehlbetrag (Vorjahr)\n  "guv_anmerkungen": string | null, // Anmerkungen zur GuV\n}`;
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
        const applookupKeys = new Set<string>(["guv_unternehmen"]);
        for (const [k, v] of Object.entries(raw)) {
          if (applookupKeys.has(k)) continue;
          if (v != null) merged[k] = v;
        }
        const guv_unternehmenName = raw['guv_unternehmen'] as string | null;
        if (guv_unternehmenName) {
          const guv_unternehmenMatch = unternehmensstammdatenList.find(r => matchName(guv_unternehmenName!, [String(r.fields.unternehmensname ?? '')]));
          if (guv_unternehmenMatch) merged['guv_unternehmen'] = createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, guv_unternehmenMatch.record_id);
        }
        return merged as Partial<GewinnUndVerlustrechnung['fields']>;
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

  const DIALOG_INTENT = defaultValues ? 'Gewinn- und Verlustrechnung bearbeiten' : 'Gewinn- und Verlustrechnung hinzufügen';

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
            <Label htmlFor="ebit_vj">EBIT (Vorjahr)</Label>
            <Input
              id="ebit_vj"
              type="number"
              value={fields.ebit_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, ebit_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guv_unternehmen">Unternehmen</Label>
            <Select
              value={extractRecordId(fields.guv_unternehmen) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, guv_unternehmen: v === 'none' ? undefined : createRecordUrl(APP_IDS.UNTERNEHMENSSTAMMDATEN, v) }))}
            >
              <SelectTrigger id="guv_unternehmen"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="guv_geschaeftsjahr">Geschäftsjahr</Label>
            <Input
              id="guv_geschaeftsjahr"
              value={fields.guv_geschaeftsjahr ?? ''}
              onChange={e => setFields(f => ({ ...f, guv_geschaeftsjahr: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guv_waehrung">Währung</Label>
            <Select
              value={lookupKey(fields.guv_waehrung) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, guv_waehrung: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="guv_waehrung"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
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
            <Label htmlFor="guv_einheit">Einheit der Beträge</Label>
            <Select
              value={lookupKey(fields.guv_einheit) ?? 'none'}
              onValueChange={v => setFields(f => ({ ...f, guv_einheit: v === 'none' ? undefined : v as any }))}
            >
              <SelectTrigger id="guv_einheit"><SelectValue placeholder="Auswählen..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="euro">Euro (volle Beträge)</SelectItem>
                <SelectItem value="teur">Tausend Euro (TEUR)</SelectItem>
                <SelectItem value="meur">Millionen Euro (MEUR)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="umsatzerloese">Umsatzerlöse</Label>
            <Input
              id="umsatzerloese"
              type="number"
              value={fields.umsatzerloese ?? ''}
              onChange={e => setFields(f => ({ ...f, umsatzerloese: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="umsatzerloese_vj">Umsatzerlöse (Vorjahr)</Label>
            <Input
              id="umsatzerloese_vj"
              type="number"
              value={fields.umsatzerloese_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, umsatzerloese_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bestandsveraenderungen">Bestandsveränderungen</Label>
            <Input
              id="bestandsveraenderungen"
              type="number"
              value={fields.bestandsveraenderungen ?? ''}
              onChange={e => setFields(f => ({ ...f, bestandsveraenderungen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bestandsveraenderungen_vj">Bestandsveränderungen (Vorjahr)</Label>
            <Input
              id="bestandsveraenderungen_vj"
              type="number"
              value={fields.bestandsveraenderungen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, bestandsveraenderungen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonstige_betriebliche_ertraege">Sonstige betriebliche Erträge</Label>
            <Input
              id="sonstige_betriebliche_ertraege"
              type="number"
              value={fields.sonstige_betriebliche_ertraege ?? ''}
              onChange={e => setFields(f => ({ ...f, sonstige_betriebliche_ertraege: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonstige_betriebliche_ertraege_vj">Sonstige betriebliche Erträge (Vorjahr)</Label>
            <Input
              id="sonstige_betriebliche_ertraege_vj"
              type="number"
              value={fields.sonstige_betriebliche_ertraege_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, sonstige_betriebliche_ertraege_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtleistung">Gesamtleistung</Label>
            <Input
              id="gesamtleistung"
              type="number"
              value={fields.gesamtleistung ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtleistung: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gesamtleistung_vj">Gesamtleistung (Vorjahr)</Label>
            <Input
              id="gesamtleistung_vj"
              type="number"
              value={fields.gesamtleistung_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, gesamtleistung_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="materialaufwand">Materialaufwand</Label>
            <Input
              id="materialaufwand"
              type="number"
              value={fields.materialaufwand ?? ''}
              onChange={e => setFields(f => ({ ...f, materialaufwand: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="materialaufwand_vj">Materialaufwand (Vorjahr)</Label>
            <Input
              id="materialaufwand_vj"
              type="number"
              value={fields.materialaufwand_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, materialaufwand_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personalaufwand">Personalaufwand</Label>
            <Input
              id="personalaufwand"
              type="number"
              value={fields.personalaufwand ?? ''}
              onChange={e => setFields(f => ({ ...f, personalaufwand: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="personalaufwand_vj">Personalaufwand (Vorjahr)</Label>
            <Input
              id="personalaufwand_vj"
              type="number"
              value={fields.personalaufwand_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, personalaufwand_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abschreibungen">Abschreibungen</Label>
            <Input
              id="abschreibungen"
              type="number"
              value={fields.abschreibungen ?? ''}
              onChange={e => setFields(f => ({ ...f, abschreibungen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abschreibungen_vj">Abschreibungen (Vorjahr)</Label>
            <Input
              id="abschreibungen_vj"
              type="number"
              value={fields.abschreibungen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, abschreibungen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonstige_betriebliche_aufwendungen">Sonstige betriebliche Aufwendungen</Label>
            <Input
              id="sonstige_betriebliche_aufwendungen"
              type="number"
              value={fields.sonstige_betriebliche_aufwendungen ?? ''}
              onChange={e => setFields(f => ({ ...f, sonstige_betriebliche_aufwendungen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sonstige_betriebliche_aufwendungen_vj">Sonstige betriebliche Aufwendungen (Vorjahr)</Label>
            <Input
              id="sonstige_betriebliche_aufwendungen_vj"
              type="number"
              value={fields.sonstige_betriebliche_aufwendungen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, sonstige_betriebliche_aufwendungen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ebitda">EBITDA</Label>
            <Input
              id="ebitda"
              type="number"
              value={fields.ebitda ?? ''}
              onChange={e => setFields(f => ({ ...f, ebitda: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ebitda_vj">EBITDA (Vorjahr)</Label>
            <Input
              id="ebitda_vj"
              type="number"
              value={fields.ebitda_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, ebitda_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ebit">EBIT (Betriebsergebnis)</Label>
            <Input
              id="ebit"
              type="number"
              value={fields.ebit ?? ''}
              onChange={e => setFields(f => ({ ...f, ebit: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zinsertraege">Zinserträge</Label>
            <Input
              id="zinsertraege"
              type="number"
              value={fields.zinsertraege ?? ''}
              onChange={e => setFields(f => ({ ...f, zinsertraege: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zinsertraege_vj">Zinserträge (Vorjahr)</Label>
            <Input
              id="zinsertraege_vj"
              type="number"
              value={fields.zinsertraege_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, zinsertraege_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zinsaufwendungen">Zinsaufwendungen</Label>
            <Input
              id="zinsaufwendungen"
              type="number"
              value={fields.zinsaufwendungen ?? ''}
              onChange={e => setFields(f => ({ ...f, zinsaufwendungen: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zinsaufwendungen_vj">Zinsaufwendungen (Vorjahr)</Label>
            <Input
              id="zinsaufwendungen_vj"
              type="number"
              value={fields.zinsaufwendungen_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, zinsaufwendungen_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ebt">EBT (Ergebnis vor Steuern)</Label>
            <Input
              id="ebt"
              type="number"
              value={fields.ebt ?? ''}
              onChange={e => setFields(f => ({ ...f, ebt: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ebt_vj">EBT (Vorjahr)</Label>
            <Input
              id="ebt_vj"
              type="number"
              value={fields.ebt_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, ebt_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="steuern">Steuern vom Einkommen und Ertrag</Label>
            <Input
              id="steuern"
              type="number"
              value={fields.steuern ?? ''}
              onChange={e => setFields(f => ({ ...f, steuern: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="steuern_vj">Steuern vom Einkommen und Ertrag (Vorjahr)</Label>
            <Input
              id="steuern_vj"
              type="number"
              value={fields.steuern_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, steuern_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jahresueberschuss_guv">Jahresüberschuss / Jahresfehlbetrag</Label>
            <Input
              id="jahresueberschuss_guv"
              type="number"
              value={fields.jahresueberschuss_guv ?? ''}
              onChange={e => setFields(f => ({ ...f, jahresueberschuss_guv: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="jahresueberschuss_guv_vj">Jahresüberschuss / Jahresfehlbetrag (Vorjahr)</Label>
            <Input
              id="jahresueberschuss_guv_vj"
              type="number"
              value={fields.jahresueberschuss_guv_vj ?? ''}
              onChange={e => setFields(f => ({ ...f, jahresueberschuss_guv_vj: e.target.value ? Number(e.target.value) : undefined }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guv_anmerkungen">Anmerkungen zur GuV</Label>
            <Textarea
              id="guv_anmerkungen"
              value={fields.guv_anmerkungen ?? ''}
              onChange={e => setFields(f => ({ ...f, guv_anmerkungen: e.target.value }))}
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