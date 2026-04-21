import type { Kennzahlenanalyse, Bilanz, GewinnUndVerlustrechnung } from '@/types/app';
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

interface KennzahlenanalyseViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: Kennzahlenanalyse | null;
  onEdit: (record: Kennzahlenanalyse) => void;
  bilanzList: Bilanz[];
  gewinn__und_verlustrechnungList: GewinnUndVerlustrechnung[];
}

export function KennzahlenanalyseViewDialog({ open, onClose, record, onEdit, bilanzList, gewinn__und_verlustrechnungList }: KennzahlenanalyseViewDialogProps) {
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

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kennzahlenanalyse anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zugehörige Bilanz</Label>
            <p className="text-sm">{getBilanzDisplayName(record.fields.kz_bilanz)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zugehörige Gewinn- und Verlustrechnung</Label>
            <p className="text-sm">{getGewinnUndVerlustrechnungDisplayName(record.fields.kz_guv)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigenkapitalquote (%)</Label>
            <p className="text-sm">{record.fields.eigenkapitalquote ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Fremdkapitalquote (%)</Label>
            <p className="text-sm">{record.fields.fremdkapitalquote ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Verschuldungsgrad (FK/EK)</Label>
            <p className="text-sm">{record.fields.verschuldungsgrad ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagendeckungsgrad I (%)</Label>
            <p className="text-sm">{record.fields.anlagendeckungsgrad_1 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anlagendeckungsgrad II (%)</Label>
            <p className="text-sm">{record.fields.anlagendeckungsgrad_2 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Liquidität 1. Grades (%)</Label>
            <p className="text-sm">{record.fields.liquiditaet_1 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Liquidität 2. Grades (%)</Label>
            <p className="text-sm">{record.fields.liquiditaet_2 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Liquidität 3. Grades (%)</Label>
            <p className="text-sm">{record.fields.liquiditaet_3 ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Working Capital</Label>
            <p className="text-sm">{record.fields.working_capital ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Eigenkapitalrendite (%)</Label>
            <p className="text-sm">{record.fields.eigenkapitalrendite ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtkapitalrendite (%)</Label>
            <p className="text-sm">{record.fields.gesamtkapitalrendite ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzrendite (%)</Label>
            <p className="text-sm">{record.fields.umsatzrendite ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EBIT-Marge (%)</Label>
            <p className="text-sm">{record.fields.ebit_marge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EBITDA-Marge (%)</Label>
            <p className="text-sm">{record.fields.ebitda_marge ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kapitalumschlag</Label>
            <p className="text-sm">{record.fields.kapitalumschlag ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Debitorenlaufzeit (Tage)</Label>
            <p className="text-sm">{record.fields.debitorenlaufzeit ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kreditorenlaufzeit (Tage)</Label>
            <p className="text-sm">{record.fields.kreditorenlaufzeit ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Lagerdauer (Tage)</Label>
            <p className="text-sm">{record.fields.lagerdauer ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Operativer Cashflow</Label>
            <p className="text-sm">{record.fields.cashflow_operativ ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bonitätsbewertung</Label>
            <Badge variant="secondary">{record.fields.bonitaetsbewertung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stärken</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.staerken ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Schwächen</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.schwaechen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtkommentar / Fazit</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.gesamtkommentar ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Vorname Analyst</Label>
            <p className="text-sm">{record.fields.analyst_vorname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Nachname Analyst</Label>
            <p className="text-sm">{record.fields.analyst_nachname ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Analysedatum</Label>
            <p className="text-sm">{formatDate(record.fields.analysedatum)}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}