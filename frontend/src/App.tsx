import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/Dashboard';
import Plants from './pages/Plants';
import PlantDetail from './pages/PlantDetail';
import Locations from './pages/Locations';
import Sensors from './pages/Sensors';
import AIDiagnostics from './pages/AIDiagnostics';
import Settings from './pages/Settings';

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state: { hasError: boolean; error: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
          <div className="text-5xl mb-4">🌿</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-red-500 mb-1 font-mono">{this.state.error?.message}</p>
          <p className="text-xs text-gray-400 mb-6">Use the navigation to go to another page, or reload.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Keyed by pathname so the boundary resets automatically when you navigate away.
function RouteErrorBoundary({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return <ErrorBoundary key={pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <Layout>
      <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plants" element={<Plants />} />
          <Route path="/plants/:id" element={<PlantDetail />} />
          <Route path="/locations" element={<Locations />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/ai" element={<AIDiagnostics />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </RouteErrorBoundary>
    </Layout>
  );
}
