import { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { routes } from './routes';
import App from './App';

// Fallback component for lazy loading
const Fallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

export function AppRouter() {
  return (
    <Router>
      <Suspense fallback={<Fallback />}>
        <Routes>
          {/* Public routes */}
          {routes
            .filter(route => route.public)
            .map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={route.element}
              />
            ))}
          
          {/* Main app with protected routes */}
          <Route path="/*" element={<App />} />
          
          {/* Catch all other routes and redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
