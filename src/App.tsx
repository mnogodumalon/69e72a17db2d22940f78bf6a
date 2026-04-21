import { HashRouter, Routes, Route } from 'react-router-dom';
import { ActionsProvider } from '@/context/ActionsContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ErrorBusProvider } from '@/components/ErrorBus';
import { Layout } from '@/components/Layout';
import DashboardOverview from '@/pages/DashboardOverview';
import { WorkflowPlaceholders } from '@/components/WorkflowPlaceholders';
import AdminPage from '@/pages/AdminPage';
import UnternehmensstammdatenPage from '@/pages/UnternehmensstammdatenPage';
import BilanzPage from '@/pages/BilanzPage';
import GewinnUndVerlustrechnungPage from '@/pages/GewinnUndVerlustrechnungPage';
import KennzahlenanalysePage from '@/pages/KennzahlenanalysePage';
// <custom:imports>
// </custom:imports>

export default function App() {
  return (
    <ErrorBoundary>
      <ErrorBusProvider>
        <HashRouter>
          <ActionsProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<><div className="mb-8"><WorkflowPlaceholders /></div><DashboardOverview /></>} />
                <Route path="unternehmensstammdaten" element={<UnternehmensstammdatenPage />} />
                <Route path="bilanz" element={<BilanzPage />} />
                <Route path="gewinn--und-verlustrechnung" element={<GewinnUndVerlustrechnungPage />} />
                <Route path="kennzahlenanalyse" element={<KennzahlenanalysePage />} />
                <Route path="admin" element={<AdminPage />} />
                {/* <custom:routes> */}
                {/* </custom:routes> */}
              </Route>
            </Routes>
          </ActionsProvider>
        </HashRouter>
      </ErrorBusProvider>
    </ErrorBoundary>
  );
}
