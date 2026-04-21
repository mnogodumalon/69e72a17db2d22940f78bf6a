import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Unternehmensstammdaten, Bilanz, GewinnUndVerlustrechnung, Kennzahlenanalyse } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';

export function useDashboardData() {
  const [unternehmensstammdaten, setUnternehmensstammdaten] = useState<Unternehmensstammdaten[]>([]);
  const [bilanz, setBilanz] = useState<Bilanz[]>([]);
  const [gewinnUndVerlustrechnung, setGewinnUndVerlustrechnung] = useState<GewinnUndVerlustrechnung[]>([]);
  const [kennzahlenanalyse, setKennzahlenanalyse] = useState<Kennzahlenanalyse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [unternehmensstammdatenData, bilanzData, gewinnUndVerlustrechnungData, kennzahlenanalyseData] = await Promise.all([
        LivingAppsService.getUnternehmensstammdaten(),
        LivingAppsService.getBilanz(),
        LivingAppsService.getGewinnUndVerlustrechnung(),
        LivingAppsService.getKennzahlenanalyse(),
      ]);
      setUnternehmensstammdaten(unternehmensstammdatenData);
      setBilanz(bilanzData);
      setGewinnUndVerlustrechnung(gewinnUndVerlustrechnungData);
      setKennzahlenanalyse(kennzahlenanalyseData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Fehler beim Laden der Daten'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Silent background refresh (no loading state change → no flicker)
  useEffect(() => {
    async function silentRefresh() {
      try {
        const [unternehmensstammdatenData, bilanzData, gewinnUndVerlustrechnungData, kennzahlenanalyseData] = await Promise.all([
          LivingAppsService.getUnternehmensstammdaten(),
          LivingAppsService.getBilanz(),
          LivingAppsService.getGewinnUndVerlustrechnung(),
          LivingAppsService.getKennzahlenanalyse(),
        ]);
        setUnternehmensstammdaten(unternehmensstammdatenData);
        setBilanz(bilanzData);
        setGewinnUndVerlustrechnung(gewinnUndVerlustrechnungData);
        setKennzahlenanalyse(kennzahlenanalyseData);
      } catch {
        // silently ignore — stale data is better than no data
      }
    }
    function handleRefresh() { void silentRefresh(); }
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, []);

  const unternehmensstammdatenMap = useMemo(() => {
    const m = new Map<string, Unternehmensstammdaten>();
    unternehmensstammdaten.forEach(r => m.set(r.record_id, r));
    return m;
  }, [unternehmensstammdaten]);

  const bilanzMap = useMemo(() => {
    const m = new Map<string, Bilanz>();
    bilanz.forEach(r => m.set(r.record_id, r));
    return m;
  }, [bilanz]);

  const gewinnUndVerlustrechnungMap = useMemo(() => {
    const m = new Map<string, GewinnUndVerlustrechnung>();
    gewinnUndVerlustrechnung.forEach(r => m.set(r.record_id, r));
    return m;
  }, [gewinnUndVerlustrechnung]);

  return { unternehmensstammdaten, setUnternehmensstammdaten, bilanz, setBilanz, gewinnUndVerlustrechnung, setGewinnUndVerlustrechnung, kennzahlenanalyse, setKennzahlenanalyse, loading, error, fetchAll, unternehmensstammdatenMap, bilanzMap, gewinnUndVerlustrechnungMap };
}