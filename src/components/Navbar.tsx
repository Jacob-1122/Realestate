import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, Map } from 'lucide-react';

export function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo/Brand */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-xl font-bold text-gray-900 dark:text-white hover:text-primary transition-colors"
          >
            <span className="text-2xl">🏘️</span>
            <span className="hidden sm:inline">Section 8 Analyzer</span>
            <span className="sm:hidden">S8 Analyzer</span>
          </button>

          {/* Navigation Links */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => navigate('/')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all ${
                isActive('/')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Home</span>
            </button>

            <button
              onClick={() => navigate('/search')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all ${
                isActive('/search')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">ZIP Lookup</span>
              <span className="sm:hidden">Lookup</span>
            </button>

            <button
              onClick={() => navigate('/heatmap')}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all ${
                isActive('/heatmap')
                  ? 'bg-primary text-white'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Heat Map</span>
              <span className="sm:hidden">Map</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

