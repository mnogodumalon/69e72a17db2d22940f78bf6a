import type { Bilanz, Unternehmensstammdaten } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

function formatDate(d?: string) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd.MM.yyyy', { locale: de }); } catch { return d; }
}

interface BilanzViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Bilanz | null;
  onEdit: (record: Bilanz) => void;
  unternehmensstammdatenList: Unternehmensstammdaten[];
}

export function BilanzViewDialog({ open, onClose, record, onEdit, unternehmensstammdatenList }: BilanzViewDialogProps) {
  function getUnternehmensstammdatenDisplayName(url?: unknown) {
    if (!url) return '—';
    const id = extractRecordId(url);
    return unternehmensstammdatenList.find(r => r.record_id === id)?.fields.unternehmensname ?? '—';
  }

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bilanz anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmen</Label>
            <p className="text-sm">{getUnternehmensstammdatenDisplayName(record.fields.bilanz_unternehmen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geschäftsjahr</Label>
            <p className="text-sm">{record.fields.geschaeftsjahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bilanzstichtag</Label>
            <p className="text-sm">{formatDate(record.fields.bilanzstichtag)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Währung</Label>
            <Badge variant="secondary">{record.fields.waehrung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einheit der Beträge</Label>
            <Badge variant="secondary">{record.fields.einheit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Immaterielle Vermögensgegenstände</Label>
            <p className="text-sm">{record.fields.immaterielle_vermoegensgegenstaende ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Immaterielle Vermögensgegenstände (Vorjahr)</Label>
            <p className="text-sm">{record.fields.immaterielle_vermoegensgegenstaende_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sachanlagen</Label>
            <p className="text-sm">{record.fields.sachanlagen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sachanlagen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.sachanlagen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Finanzanlagen</Label>
            <p className="text-sm">{record.fields.finanzanlagen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Finanzanlagen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.finanzanlagen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagevermögen gesamt</Label>
            <p className="text-sm">{record.fields.anlagevermoegen_gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagevermögen gesamt (Vorjahr)</Label>
            <p className="text-sm">{record.fields.anlagevermoegen_gesamt_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorräte</Label>
            <p className="text-sm">{record.fields.vorraethe ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorräte (Vorjahr)</Label>
            <p className="text-sm">{record.fields.vorraethe_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Forderungen aus Lieferungen und Leistungen</Label>
            <p className="text-sm">{record.fields.forderungen_llg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Forderungen aus Lieferungen und Leistungen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.forderungen_llg_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige Forderungen und Vermögensgegenstände</Label>
            <p className="text-sm">{record.fields.sonstige_forderungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige Forderungen und Vermögensgegenstände (Vorjahr)</Label>
            <p className="text-sm">{record.fields.sonstige_forderungen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kassenbestand / Bankguthaben</Label>
            <p className="text-sm">{record.fields.kassenbestand ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kassenbestand / Bankguthaben (Vorjahr)</Label>
            <p className="text-sm">{record.fields.kassenbestand_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umlaufvermögen gesamt</Label>
            <p className="text-sm">{record.fields.umlaufvermoegen_gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umlaufvermögen gesamt (Vorjahr)</Label>
            <p className="text-sm">{record.fields.umlaufvermoegen_gesamt_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktive Rechnungsabgrenzungsposten</Label>
            <p className="text-sm">{record.fields.rechnungsabgrenzung_aktiva ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Aktive Rechnungsabgrenzungsposten (Vorjahr)</Label>
            <p className="text-sm">{record.fields.rechnungsabgrenzung_aktiva_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bilanzsumme Aktiva</Label>
            <p className="text-sm">{record.fields.bilanzsumme_aktiva ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bilanzsumme Aktiva (Vorjahr)</Label>
            <p className="text-sm">{record.fields.bilanzsumme_aktiva_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gezeichnetes Kapital</Label>
            <p className="text-sm">{record.fields.gezeichnetes_kapital ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gezeichnetes Kapital (Vorjahr)</Label>
            <p className="text-sm">{record.fields.gezeichnetes_kapital_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kapitalrücklagen</Label>
            <p className="text-sm">{record.fields.kapitalruecklagen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kapitalrücklagen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.kapitalruecklagen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gewinnrücklagen</Label>
            <p className="text-sm">{record.fields.gewinnruecklagen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gewinnrücklagen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.gewinnruecklagen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Jahresüberschuss / Jahresfehlbetrag</Label>
            <p className="text-sm">{record.fields.jahresueberschuss_bilanz ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Jahresüberschuss / Jahresfehlbetrag (Vorjahr)</Label>
            <p className="text-sm">{record.fields.jahresueberschuss_bilanz_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigenkapital gesamt</Label>
            <p className="text-sm">{record.fields.eigenkapital_gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigenkapital gesamt (Vorjahr)</Label>
            <p className="text-sm">{record.fields.eigenkapital_gesamt_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rückstellungen</Label>
            <p className="text-sm">{record.fields.rueckstellungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Rückstellungen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.rueckstellungen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbindlichkeiten gegenüber Kreditinstituten</Label>
            <p className="text-sm">{record.fields.verbindlichkeiten_kreditinstitute ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbindlichkeiten gegenüber Kreditinstituten (Vorjahr)</Label>
            <p className="text-sm">{record.fields.verbindlichkeiten_kreditinstitute_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbindlichkeiten aus Lieferungen und Leistungen</Label>
            <p className="text-sm">{record.fields.verbindlichkeiten_llg ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verbindlichkeiten aus Lieferungen und Leistungen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.verbindlichkeiten_llg_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige Verbindlichkeiten</Label>
            <p className="text-sm">{record.fields.sonstige_verbindlichkeiten ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige Verbindlichkeiten (Vorjahr)</Label>
            <p className="text-sm">{record.fields.sonstige_verbindlichkeiten_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fremdkapital gesamt</Label>
            <p className="text-sm">{record.fields.fremdkapital_gesamt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fremdkapital gesamt (Vorjahr)</Label>
            <p className="text-sm">{record.fields.fremdkapital_gesamt_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Passive Rechnungsabgrenzungsposten</Label>
            <p className="text-sm">{record.fields.rechnungsabgrenzung_passiva ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Passive Rechnungsabgrenzungsposten (Vorjahr)</Label>
            <p className="text-sm">{record.fields.rechnungsabgrenzung_passiva_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bilanzsumme Passiva</Label>
            <p className="text-sm">{record.fields.bilanzsumme_passiva ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bilanzsumme Passiva (Vorjahr)</Label>
            <p className="text-sm">{record.fields.bilanzsumme_passiva_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anmerkungen zur Bilanz</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.bilanz_anmerkungen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}