import type { GewinnUndVerlustrechnung, Unternehmensstammdaten } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { IconPencil } from '@tabler/icons-react';

interface GewinnUndVerlustrechnungViewDialogProps {
  open: boolean;
  onClose: () => void;
  record: GewinnUndVerlustrechnung | null;
  onEdit: (record: GewinnUndVerlustrechnung) => void;
  unternehmensstammdatenList: Unternehmensstammdaten[];
}

export function GewinnUndVerlustrechnungViewDialog({ open, onClose, record, onEdit, unternehmensstammdatenList }: GewinnUndVerlustrechnungViewDialogProps) {
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
          <DialogTitle>Gewinn- und Verlustrechnung anzeigen</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button size="sm" onClick={() => { onClose(); onEdit(record); }}>
            <IconPencil className="h-3.5 w-3.5 mr-1.5" />
            Bearbeiten
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EBIT (Vorjahr)</Label>
            <p className="text-sm">{record.fields.ebit_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Unternehmen</Label>
            <p className="text-sm">{getUnternehmensstammdatenDisplayName(record.fields.guv_unternehmen)}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Geschäftsjahr</Label>
            <p className="text-sm">{record.fields.guv_geschaeftsjahr ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Währung</Label>
            <Badge variant="secondary">{record.fields.guv_waehrung?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Einheit der Beträge</Label>
            <Badge variant="secondary">{record.fields.guv_einheit?.label ?? '—'}</Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzerlöse</Label>
            <p className="text-sm">{record.fields.umsatzerloese ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Umsatzerlöse (Vorjahr)</Label>
            <p className="text-sm">{record.fields.umsatzerloese_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestandsveränderungen</Label>
            <p className="text-sm">{record.fields.bestandsveraenderungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bestandsveränderungen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.bestandsveraenderungen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige betriebliche Erträge</Label>
            <p className="text-sm">{record.fields.sonstige_betriebliche_ertraege ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige betriebliche Erträge (Vorjahr)</Label>
            <p className="text-sm">{record.fields.sonstige_betriebliche_ertraege_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtleistung</Label>
            <p className="text-sm">{record.fields.gesamtleistung ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Gesamtleistung (Vorjahr)</Label>
            <p className="text-sm">{record.fields.gesamtleistung_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Materialaufwand</Label>
            <p className="text-sm">{record.fields.materialaufwand ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Materialaufwand (Vorjahr)</Label>
            <p className="text-sm">{record.fields.materialaufwand_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Personalaufwand</Label>
            <p className="text-sm">{record.fields.personalaufwand ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Personalaufwand (Vorjahr)</Label>
            <p className="text-sm">{record.fields.personalaufwand_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abschreibungen</Label>
            <p className="text-sm">{record.fields.abschreibungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Abschreibungen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.abschreibungen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige betriebliche Aufwendungen</Label>
            <p className="text-sm">{record.fields.sonstige_betriebliche_aufwendungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sonstige betriebliche Aufwendungen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.sonstige_betriebliche_aufwendungen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EBITDA</Label>
            <p className="text-sm">{record.fields.ebitda ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EBITDA (Vorjahr)</Label>
            <p className="text-sm">{record.fields.ebitda_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EBIT (Betriebsergebnis)</Label>
            <p className="text-sm">{record.fields.ebit ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zinserträge</Label>
            <p className="text-sm">{record.fields.zinsertraege ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zinserträge (Vorjahr)</Label>
            <p className="text-sm">{record.fields.zinsertraege_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zinsaufwendungen</Label>
            <p className="text-sm">{record.fields.zinsaufwendungen ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Zinsaufwendungen (Vorjahr)</Label>
            <p className="text-sm">{record.fields.zinsaufwendungen_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EBT (Ergebnis vor Steuern)</Label>
            <p className="text-sm">{record.fields.ebt ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">EBT (Vorjahr)</Label>
            <p className="text-sm">{record.fields.ebt_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Steuern vom Einkommen und Ertrag</Label>
            <p className="text-sm">{record.fields.steuern ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Steuern vom Einkommen und Ertrag (Vorjahr)</Label>
            <p className="text-sm">{record.fields.steuern_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Jahresüberschuss / Jahresfehlbetrag</Label>
            <p className="text-sm">{record.fields.jahresueberschuss_guv ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Jahresüberschuss / Jahresfehlbetrag (Vorjahr)</Label>
            <p className="text-sm">{record.fields.jahresueberschuss_guv_vj ?? '—'}</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Anmerkungen zur GuV</Label>
            <p className="text-sm whitespace-pre-wrap">{record.fields.guv_anmerkungen ?? '—'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}