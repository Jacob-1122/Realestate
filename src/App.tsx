import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { SearchPage } from './pages/SearchPage';
import { MetroAreaAnalysisPage } from './pages/MetroAreaAnalysisPage';
import { lazy, Suspense } from 'react';

// Lazy load heat map page
const HeatMapPage = lazy(() => import('./pages/HeatMapPage'));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/metro-analysis" element={<MetroAreaAnalysisPage />} />
        <Route 
          path="/heatmap" 
          element={
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
                  <p className="text-lg text-gray-700 dark:text-gray-300">Loading Heat Map...</p>
                </div>
              </div>
            }>
              <HeatMapPage />
            </Suspense>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
